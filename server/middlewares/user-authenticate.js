
// wrap in function to limit namespace scope
(function() {
  'use strict';
  // node native modules
  const fs = require('fs');
  const path = require('path');
  const crypto = require('crypto');

  const credentials = JSON.parse(fs.readFileSync('./credentials.json', 'utf8'));

  // other imports
  const sessionExpireAfterSec = credentials.sessionExpireAfterSec || 86400;
  const sessionExpireAfterMs = 1000 * sessionExpireAfterSec;

  // HTML fragments for login page
  const loginHtmlTop = fs.readFileSync('./server/fragments/login-top.html', 'utf8');
  const loginHtmlBottom = fs.readFileSync('./server/fragments/login-bottom.html', 'utf8');
  const blockedCookieFragment = fs.readFileSync('./server/fragments/blocked-cookies.html', 'utf8');
  const logoutHtmlTop = fs.readFileSync('./server/fragments/logout-top.html', 'utf8');
  const logoutHtmlBottom = fs.readFileSync('./server/fragments/logout-bottom.html', 'utf8');

  var nodeEnv = process.env.NODE_ENV || 'development';

  //
  // Load credentials, user database from file, check users exist
  //
  const userArray = credentials.loginUsers;
  if ((!Array.isArray(userArray)) || (userArray.length < 1)) {
    throw new Error('No users found in password file');
  }

  //
  // Custom log file (Option: setup to fail2ban to block IP addresses)
  //
  const authLogFilename = path.join(__dirname, '../../logs/auth.log');
  const customLog = function (req, errString) {
    //
    // build log text string
    //
    let now = new Date();
    let logEntry = now.toISOString();
    if ('_remoteAddress' in req) {
      logEntry += ' ' + req._remoteAddress;
    } else {
      logEntry += ' NOADDRESS';
    }
    logEntry += ' ' + errString;
    //
    // Append string to file
    //
    if (nodeEnv === 'production') {
      fs.writeFile(
        authLogFilename,
        logEntry + '\n',
        {
          encoding: 'utf8',
          mode: 0o644,
          flag: 'a'
        },
        function(err) {
          if (err) {
            // in case disk full, kill server
            throw new Error('Error writing auth.log');
          }
        }
      );
    } else {
      console.log(logEntry);
    }
  };

  // print at server start
  if (nodeEnv === 'production') {
    console.log('Auth users: ' + userArray.length + ' Auth log: ' + authLogFilename);
  } else {
    console.log('Auth users: ' + userArray.length + ' Auth log: (console)');
  }

  //
  // Setup authentication variables inside session
  //
  const _initSession = function(req) {
    if (req.session) {
      if (!(req.session.sessionAuth)) {
        req.session.sessionAuth = {};
        req.session.sessionAuth.authorized = false;
      }
    }
  };

  //
  // Check session authorized flag and return true/false
  //
  const _checkIfAuthorized = function(req) {
    // console.log('req.session.sessionAuth ' + JSON.stringify(req.session.sessionAuth, null, 2));

    // ****************
    // ****************
    // if ((nodeEnv === 'development') && (process.env.BYPASSLOGIN)) {
    //   return true;
    // }
    // ****************
    // ****************

    let authorized = false;
    let timeNowSeconds = Math.floor(Date.now() / 1000);
    if ((req.session) && (req.session.sessionAuth)) {
      if (req.session.sessionAuth.authorized) {
        if (req.session.sessionAuth.sessionExpireTimeSec) {
          if (timeNowSeconds < req.session.sessionAuth.sessionExpireTimeSec) {
            authorized = true;
          }
        }
      }
    }
    // authorized = true = authorized.
    return authorized;
  };

  //
  // Mark the session as not authorized
  //
  const _removeAuthorizationFromSession = function(req) {
    if (req.session) {
      _initSession(req);
      if (req.session.sessionAuth) {
        delete req.session.sessionAuth.sessionExpireTimeSec;
        delete req.session.sessionAuth.user;
        delete req.session.sessionAuth.name;
        delete req.session.sessionAuth.userid;
        delete req.session.sessionAuth.scopes;
        delete req.session.sessionAuth.previousFailTimeSec;
        req.session.sessionAuth.authorized = false;
      }
    }
  };
  //
  // Remove temporary login data from session.
  //
  const _removeLoginNonceFromSession = function(req) {
    if (req.session) {
      _initSession(req);
      if (req.session.sessionAuth) {
        delete req.session.sessionAuth.loginNonce;
        delete req.session.sessionAuth.loginExpireTimeSec;
      }
    }
  };

  // ----------------------------------------
  // If not authorized, redirect to login
  // ----------------------------------------
  const authorizeOrLogin = function(req, res, next) {
    if (_checkIfAuthorized(req)) {
      next();
    } else {
      res.redirect('/login');
    }
  };
  // ----------------------
  // Route: GET /blocked
  // ----------------------
  const blockedCookies = function(req, res, next) {
    res.send(blockedCookieFragment);
  };

  // ---------------------------------------------
  // If not authorized, return 401 Unauthorized
  // ---------------------------------------------
  const authorizeOrFail = function(req, res, next) {
    if (_checkIfAuthorized(req)) {
      next();
    } else {
      res.status(403).send('403 Forbidden');
    }
  };

  const generateRandomNonce = function(nonceLength) {
    if ((typeof nonceLength !== 'number') || (nonceLength < 3)) {
      throw new Error('generateRandonNonce() length too short');
    }
    let intNonceLength = parseInt(nonceLength);
    let nonce = '';
    let charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i=0; i<intNonceLength; i++) {
      nonce += charSet.charAt(parseInt(Math.random() * charSet.length));
    }
    return nonce;
  };

  const sanatizeString = function(inString) {
    let sanitizedString = '';
    const allowedChars =
      'abcdefghijklmnoqprstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    if ((typeof inString === 'string') && (inString.length > 0)) {
      for (let i=0; i<inString.length; i++) {
        let allowedCharIndex = allowedChars.indexOf(inString[i]);
        if (allowedCharIndex > -1) {
          sanitizedString += allowedChars[allowedCharIndex];
        }
      }
    }
    return sanitizedString;
  };

  //
  // Timing safe compare, from express-basic-auth
  //
  const safeCompare = function(userInput, secret) {
    const userInputLength = Buffer.byteLength(userInput);
    const secretLength = Buffer.byteLength(secret);
    const userInputBuffer = Buffer.alloc(userInputLength, 0, 'utf8');
    userInputBuffer.write(userInput);
    const secretBuffer = Buffer.alloc(userInputLength, 0, 'utf8');
    secretBuffer.write(secret);
    return !!(crypto.timingSafeEqual(userInputBuffer, secretBuffer)) &
      userInputLength === secretLength;
  };
  //
  // -------------------------------------
  // Route: POST /login-authorize
  // -------------------------------------
  const loginAuthorize = function(req, res, next) {
    // console.log('sessionAuth ' + JSON.stringify(req.session.sessionAuth, null, 2));
    // console.log('body ' + JSON.stringify(req.body, null, 2));
    // console.log('query ' + JSON.stringify(req.query));
    // console.log('auth cookies ' + JSON.stringify(req.signedCookies, null, 2));
    //
    // wrap in try to catch errors
    // if (true) {
    try {
      // Check if browser cookies enabled and a session has been establised.
      if ((req.signedCookies) && (req.session) && (req.session.sessionAuth)) {
      // remove previous credentials if there are any
        _removeAuthorizationFromSession(req);
        let timeNowSeconds = Math.floor(Date.now() / 1000);
        // make sure all expected data has been supplied, else bad request error
        if (
          ('query' in req) &&
          ('nonce' in req.query) &&
          (req.query.nonce.length > 1) &&
          ('body' in req) &&
          ('user' in req.body) &&
          (req.body.user.length > 0) &&
          ('password' in req.body) &&
          (req.body.password.length > 0)) {
          //
          // Query user array to find index to matching user.
          //
          let postedUser = sanatizeString(req.body.user);
          let userIndex = -1;
          for (let i=0; i<userArray.length; i++) {
            if (userArray[i].user === postedUser) {
              userIndex = i;
            }
          } // next i
          if (userIndex < 0) {
            // username not found, login fail
            customLog(req, 'Bad login user id unknown');
            _removeLoginNonceFromSession(req);
            req.session.sessionAuth.previousFailTimeSec = timeNowSeconds;
            return res.redirect('/login');
          }

          if ((!(req.session.sessionAuth.loginNonce)) ||
            (!(safeCompare(req.query.nonce, req.session.sessionAuth.loginNonce)))) {
            customLog(req, 'Bad login nonce invalid');
            _removeLoginNonceFromSession(req);
            // failTime used to append error message of past login fail attempt
            req.session.sessionAuth.previousFailTimeSec = timeNowSeconds;
            return res.redirect('/login');
          }

          if ((!(req.session.sessionAuth.loginExpireTimeSec)) ||
            (timeNowSeconds >= req.session.sessionAuth.loginExpireTimeSec)) {
            customLog(req, 'Bad login time limit exceeded');
            _removeLoginNonceFromSession(req);
            // failTime used to append error message of past login fail attempt
            req.session.sessionAuth.previousFailTimeSec = timeNowSeconds;
            return res.redirect('/login');
          }

          //
          // Add salt to provided password and generate hash, check match.
          //
          let hash = crypto.createHash('sha256');
          let hashedPassword = hash.update('' + req.body.password +
            userArray[userIndex].salt).digest('hex');
          if (safeCompare(hashedPassword, userArray[userIndex].hash)) {
            // ------------------------
            // Authorize the user
            // ------------------------
            _initSession(req);
            req.session.sessionAuth.authorized = true;
            req.session.sessionAuth.user = userArray[userIndex].user;
            req.session.sessionAuth.name = userArray[userIndex].name;
            req.session.sessionAuth.userid = userArray[userIndex].userid;
            req.session.sessionAuth.scopes = userArray[userIndex].scopes;
            req.session.sessionAuth.sessionExpireTimeSec = timeNowSeconds + sessionExpireAfterSec;
            _removeLoginNonceFromSession(req);
            //
            // add to log file
            //
            customLog(req, 'Login ' + req.session.sessionAuth.user);
            // -------------------------------------------------
            // Redirect to landing page after successful login
            // -------------------------------------------------
            res.redirect('/irc/webclient.html');
          } else {
            // Else, login fail by content
            customLog(req, 'Bad login password mismatch');
            _removeLoginNonceFromSession(req);
            // failTime used to append error message of past login fail attempt
            req.session.sessionAuth.previousFailTimeSec = timeNowSeconds;
            return res.redirect('/login');
          }
        } else {
          // Else, login fail due to data format presented, Status 400 Bad request
          customLog(req, 'Bad login malformed request');
          _removeLoginNonceFromSession(req);
          return res.status(400).send('400 Bad Request');
        }
      } else {
        customLog(req, 'Bad login no session cookie');
        // case of user's cookies are blocked
        return res.redirect('/blocked');
      } // cookie enable check
    } catch (error) {
      customLog(req, 'Bad login try catch error during login');
      console.log('Try catch error during login ' + error);
      let err = new Error('Internal Server Error');
      err.status = 500;
      if (nodeEnv === 'development') {
        err.errors = '' + error;
      }
      next(err);
    }
  };

  const loginFormFragment1 =
    '<div>\n' +
    '<form action="/login-authorize';
  const loginFormFragment2 =
    '" method="post">\n' +
    '<label for="user"><strong>User-id</strong></label>\n' +
    '<input type="text" name="user" required><br>\n' +
    '<label for="password"><strong>Password</strong></label>\n' +
    '<input type="password" name="password" required>\n' +
    '<div>I consent to use of cookies</div>\n' +
    '<div>\n' +
    '<button class="button" type="submit">Submit Login</button>\n' +
    '</div>\n' +
    '</form>\n';

  const loginWarningFragment =
    '</div>\n' +
    '<div class="warning-div">\n' +
    'Login failed, try again.\n';

  // -------------------------
  // Route: GET /login
  // -------------------------
  const loginPage = function(req, res, next) {
    _initSession(req);
    if (_checkIfAuthorized(req)) {
      return res.redirect('/irc/webclient.html');
    } else {
      let timeNowSeconds = Math.floor(Date.now() / 1000);
      let warningDiv = '';
      if ((req.session.sessionAuth.previousFailTimeSec) &&
        ((req.session.sessionAuth.previousFailTimeSec + 10) > timeNowSeconds)) {
        warningDiv = loginWarningFragment;
      }
      let loginNonce = generateRandomNonce(8);
      req.session.sessionAuth.loginNonce = loginNonce;
      req.session.sessionAuth.loginExpireTimeSec = timeNowSeconds + 60;
      // res.set('Cache-Control', 'no-store');
      return res.send(loginHtmlTop +
        loginFormFragment1 + '?nonce=' +loginNonce + loginFormFragment2 +
        warningDiv + loginHtmlBottom);
    }
  };

  // ---------------------------
  // Route: GET /logout
  // ---------------------------
  const logout = function(req, res, next) {
    // if logged in then add to logfile
    let user;
    if ((req.session) && (req.session.sessionAuth) && (req.session.sessionAuth.authorized)) {
      customLog(req, 'Logout ' + req.session.sessionAuth.user);
      user = req.session.sessionAuth.user;
    }
    if (req.session) {
      let cookieOptions = {
        maxAge: req.session.cookie.originalMaxAge,
        expires: req.session.cookie.expires,
        secure: req.session.cookie.secure,
        httpOnly: req.session.cookie.httpOnly,
        path: req.session.cookie.path
      };
      _removeAuthorizationFromSession(req);
      req.session.destroy(function(err) {
        if (err) {
          console.log('Error destroying session ' + err);
        }
      });
      // this clears cookie contents, but not clear cookie
      res.clearCookie('irc-hybrid-client', cookieOptions);
    }
    let tempHtml = 'Browser was not logged in.';
    if (user) {
      tempHtml = '' + user + ' successfully logged out.\n';
    }
    res.send(logoutHtmlTop + tempHtml + logoutHtmlBottom);
  };

  // -----------------------------
  // Route: GET /userinfo
  // -----------------------------
  const getUserInfo = function (req, res, next) {
    if ((req.session) && (req.session.sessionAuth) &&
      (req.session.sessionAuth.user) &&
      (req.session.sessionAuth.authorized)) {
      // Return user information
      let userInfo = {};
      userInfo.user = req.session.sessionAuth.user;
      userInfo.name = req.session.sessionAuth.name;
      userInfo.userid = req.session.sessionAuth.userid;
      userInfo.scopes = req.session.sessionAuth.scopes;
      res.json(userInfo);
    } else {
      res.status(404).send('404 Not Found');
    }
  };
  // -----------------------
  // Route: GET /login.css
  // -----------------------
  const loginStyleSheet = function(req, res, next) {
    fs.readFile('./server/fragments/login.css', 'utf8', function (err, privacyStr) {
      if (err) {
        next(); // fall through to 404
      } else {
        res.set('Content-Type', 'text/css').send(privacyStr);
      }
    });
  };

  module.exports = {
    loginStyleSheet: loginStyleSheet,
    loginPage: loginPage,
    loginAuthorize: loginAuthorize,
    logout: logout,
    authorizeOrLogin: authorizeOrLogin,
    authorizeOrFail: authorizeOrFail,
    getUserInfo: getUserInfo,
    blockedCookies: blockedCookies
  };
})();
