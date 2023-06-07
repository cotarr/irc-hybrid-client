// MIT License
//
// Copyright (c) 2021 Dave Bolenbaugh
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
// -----------------------------------------------------------------------------
//
// User authentication and route authorization functions
//
// -----------------------------------------------------------------------------
//
// Option 1 of 2 - configuration using credentials.json
//
// "enableRemoteLogin": false,
// "loginUsers": [
//   {
//     "userid": 1,
//     "user": "user1",
//     "name": "My Name",
//     "hash": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
//   }
// ],
//
// ------------------------------------------------
// Option 2 of 2 - Configuration with UNIX environment variables

// OAUTH2_ENABLE_REMOTE_LOGIN=false
// LOGIN_USER_USERID=1
// LOGIN_USER_USER=user1
// LOGIN_USER_NAME="My Name"
// LOGIN_USER_HASH="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
//
// -----------------------------------------------------------------------------
'use strict';

// node native modules
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import config, { nodeEnv, loginUsers as userArray } from '../config/index.mjs';

// Custom case for use with ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// HTML fragments for login page
const loginHtmlTop = fs.readFileSync('./server/fragments/login-top.html', 'utf8');
const loginHtmlBottom = fs.readFileSync('./server/fragments/login-bottom.html', 'utf8');
const blockedCookieFragment = fs.readFileSync('./server/fragments/blocked-cookies.html', 'utf8');
const logoutHtmlTop = fs.readFileSync('./server/fragments/logout-top.html', 'utf8');
const logoutHtmlBottom = fs.readFileSync('./server/fragments/logout-bottom.html', 'utf8');

const nodeDebugLog = process.env.NODE_DEBUG_LOG || 0;

//
// Custom log file (Option: setup to fail2ban to block IP addresses)
//
const authLogFilename = path.join(__dirname, '../../logs/auth.log');
const customLog = function (req, errString) {
  //
  // build log text string
  //
  const now = new Date();
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
  if ((nodeEnv === 'development') || (nodeDebugLog)) {
    console.log(logEntry);
  } else {
    fs.writeFile(
      authLogFilename,
      logEntry + '\n',
      {
        encoding: 'utf8',
        mode: 0o600,
        flag: 'a'
      },
      function (err) {
        if (err) {
          // in case disk full, kill server
          throw new Error('Error writing auth.log');
        }
      }
    );
  }
};

// print at server start
if (!config.oauth2.enableRemoteLogin) {
  if ((nodeEnv === 'development') || (nodeDebugLog)) {
    console.log('Auth users: ' + userArray.length + ' Auth log: (console)');
  } else {
    console.log('Auth users: ' + userArray.length + ' Auth log: ' + authLogFilename);
  }
}
//
// Setup authentication variables inside session
//
const _initSession = function (req) {
  if (Object.hasOwn(req, 'session')) {
    if (!Object.hasOwn(req.session, 'sessionAuth')) {
      req.session.sessionAuth = Object.create(null);
      req.session.sessionAuth.authorized = false;
    }
  }
};

//
// Check session authorized flag and return true/false
//
const _checkIfAuthorized = function (req) {
  // console.log('req.session.sessionAuth ' + JSON.stringify(req.session.sessionAuth, null, 2));

  // ****************
  // ****************
  // if ((nodeEnv === 'development') && (process.env.BYPASSLOGIN)) {
  //   return true;
  // }
  // ****************
  // ****************

  let authorized = false;
  const timeNowSeconds = Math.floor(Date.now() / 1000);
  if ((Object.hasOwn(req, 'session')) &&
    (Object.hasOwn(req.session, 'sessionAuth')) &&
    (Object.hasOwn(req.session.sessionAuth, 'authorized'))) {
    if (req.session.sessionAuth.authorized === true) {
      if (req.session.sessionAuth.sessionExpireTimeSec) {
        if (timeNowSeconds < req.session.sessionAuth.sessionExpireTimeSec) {
          authorized = true;
          if (config.session.rollingCookie) {
            req.session.sessionAuth.sessionExpireTimeSec = timeNowSeconds + config.session.ttl;
          }
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
const _removeAuthorizationFromSession = function (req) {
  if (Object.hasOwn(req, 'session')) {
    _initSession(req);
    if (Object.hasOwn(req.session, 'sessionAuth')) {
      delete req.session.sessionAuth.sessionExpireTimeSec;
      delete req.session.sessionAuth.user;
      delete req.session.sessionAuth.name;
      delete req.session.sessionAuth.userid;
      delete req.session.sessionAuth.previousFailTimeSec;
      req.session.sessionAuth.authorized = false;
    }
  }
};
//
// Remove temporary login data from session.
//
const _removeLoginNonceFromSession = function (req) {
  if (Object.hasOwn(req, 'session')) {
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
export const authorizeOrLogin = function (req, res, next) {
  if (_checkIfAuthorized(req)) {
    next();
  } else {
    res.redirect('/login');
  }
};
// ----------------------
// Route: GET /blocked
// ----------------------
export const blockedCookies = function (req, res, next) {
  res.send(blockedCookieFragment);
};

// ---------------------------------------------
// If not authorized, return 401 Unauthorized
// ---------------------------------------------
export const authorizeOrFail = function (req, res, next) {
  if (_checkIfAuthorized(req)) {
    next();
  } else {
    res.status(403).send('403 Forbidden');
  }
};

const generateRandomNonce = function (nonceLength) {
  if ((typeof nonceLength !== 'number') || (nonceLength < 3)) {
    throw new Error('generateRandonNonce() length too short');
  }
  const intNonceLength = parseInt(nonceLength);
  let nonce = '';
  const charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < intNonceLength; i++) {
    nonce += charSet.charAt(parseInt(Math.random() * charSet.length));
  }
  return nonce;
};

const sanitizeStringInput = function (inString) {
  let sanitizedString = '';
  const allowedChars =
    'abcdefghijklmnoqprstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  if ((typeof inString === 'string') && (inString.length > 0)) {
    for (let i = 0; i < inString.length; i++) {
      const allowedCharIndex = allowedChars.indexOf(inString[i]);
      if (allowedCharIndex > -1) {
        sanitizedString += allowedChars[allowedCharIndex];
      }
    }
  }
  return sanitizedString;
};

//
// Timing safe compare (From github.com/LionC/express-basic-auth)
//
const safeCompare = function (userInput, secret) {
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
export const loginAuthorize = function (req, res, next) {
  // console.log('sessionAuth ' + JSON.stringify(req.session.sessionAuth, null, 2));
  // console.log('body ' + JSON.stringify(req.body, null, 2));
  // console.log('query ' + JSON.stringify(req.query));
  // console.log('auth cookies ' + JSON.stringify(req.signedCookies, null, 2));
  //
  // It is a general security practice to update session upon change in permission.
  // Copy existing session properties to new session
  const csrfSecret = req.session.csrfSecret;
  let sessionAuth = null;
  if ((Object.hasOwn(req.session, 'sessionAuth')) &&
    (typeof req.session.sessionAuth === 'object')) {
    // deep copy object so obsolete session does not have reference for garbage collection
    sessionAuth = JSON.parse(JSON.stringify(req.session.sessionAuth));
  }
  // new replacement session valid within scope of callback function
  req.session.regenerate(function (err) {
    if (err) {
      return next(err);
    } else {
      // restore session porperties from previous session
      req.session.csrfSecret = csrfSecret;
      req.session.sessionAuth = sessionAuth;
      // wrap in try to catch errors
      try {
        // Check if browser cookies enabled and a session has been established.
        if ((Object.hasOwn(req, 'signedCookies')) &&
          (Object.hasOwn(req, 'session')) &&
          (Object.hasOwn(req.session, 'sessionAuth'))) {
          // remove previous credentials if there are any
          _removeAuthorizationFromSession(req);
          const timeNowSeconds = Math.floor(Date.now() / 1000);
          // make sure all expected data has been supplied, else bad request error
          let inputNonce = '';
          let inputUser = '';
          let inputPassword = '';
          if ((Object.hasOwn(req, 'query')) &&
            (Object.hasOwn(req.query, 'nonce')) &&
            (typeof req.query.nonce === 'string')) {
            inputNonce = req.query.nonce.toString('utf8');
          }
          if ((Object.hasOwn(req, 'body')) &&
            (Object.hasOwn(req.body, 'user')) &&
            (typeof req.body.user === 'string')) {
            inputUser = req.body.user.toString('utf8');
          }
          if ((Object.hasOwn(req, 'body')) &&
            (Object.hasOwn(req.body, 'password')) &&
            (typeof req.body.password === 'string')) {
            inputPassword = req.body.password.toString('utf8');
          }
          // Unicode characters can be up to 4 bytes, bcrypt has maximum input 72 characters.
          const uint8PasswordArray = new TextEncoder('utf8').encode(inputPassword);
          if ((inputNonce.length > 1) &&
            (inputNonce.length <= 16) &&
            (inputUser.length > 0) &&
            (inputUser.length <= 16) &&
            // 72 bytes, not unicode characters
            (uint8PasswordArray.length <= 72) &&
            (inputPassword.length > 0)) {
            //
            // Query user array to find index to matching user.
            //
            const postedUser = sanitizeStringInput(inputUser);
            let userIndex = -1;
            for (let i = 0; i < userArray.length; i++) {
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

            if ((!Object.hasOwn(req.session, 'sessionAuth')) ||
              (!Object.hasOwn(req.session.sessionAuth, 'loginNonce')) ||
              (!(safeCompare(inputNonce, req.session.sessionAuth.loginNonce)))) {
              customLog(req, 'Bad login nonce invalid');
              _removeLoginNonceFromSession(req);
              // failTime used to append error message of past login fail attempt
              req.session.sessionAuth.previousFailTimeSec = timeNowSeconds;
              return res.redirect('/login');
            }

            if ((!Object.hasOwn(req.session, 'sessionAuth')) ||
              (!Object.hasOwn(req.session.sessionAuth, 'loginExpireTimeSec')) ||
              (timeNowSeconds >= req.session.sessionAuth.loginExpireTimeSec)) {
              customLog(req, 'Bad login time limit exceeded');
              _removeLoginNonceFromSession(req);
              // failTime used to append error message of past login fail attempt
              req.session.sessionAuth.previousFailTimeSec = timeNowSeconds;
              return res.redirect('/login');
            }

            //
            // Check bcrypt salted hash to see if it matches
            //
            if (bcrypt.compareSync(inputPassword, userArray[userIndex].hash)) {
              // ------------------------
              // Authorize the user
              // ------------------------
              _initSession(req);
              req.session.sessionAuth.authorized = true;
              req.session.sessionAuth.user = userArray[userIndex].user;
              req.session.sessionAuth.name = userArray[userIndex].name;
              req.session.sessionAuth.userid = userArray[userIndex].userid;
              // req.session.sessionAuth.scopes = userArray[userIndex].scopes;
              req.session.sessionAuth.sessionExpireTimeSec =
                timeNowSeconds + config.session.ttl;
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
        const err = new Error('Internal Server Error');
        err.status = 500;
        if (nodeEnv === 'development') {
          err.errors = '' + error;
        }
        next(err);
      }
    } // !err
  }); // regenerate session
}; // loginAuthorize()

const loginFormFragment1 =
  '<div>\n' +
  '<form action="/login-authorize';
const loginFormFragment2 =
  '" method="post">\n' +
  '<input type="hidden" name="_csrf" value="';
const loginFormFragment3 =
  '"></input>\n' +
  '<label for="user"><strong>User-id</strong></label>\n' +
  '<input type="text" name="user" autocomplete="username" required><br>\n' +
  '<label for="password"><strong>Password</strong></label>\n' +
  '<input type="password" name="password" autocomplete="current-password" required>\n' +
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
export const loginPage = function (req, res, next) {
  _initSession(req);
  if (_checkIfAuthorized(req)) {
    return res.redirect('/irc/webclient.html');
  } else {
    const timeNowSeconds = Math.floor(Date.now() / 1000);
    let warningDiv = '';
    if ((req.session.sessionAuth.previousFailTimeSec) &&
      ((req.session.sessionAuth.previousFailTimeSec + 10) > timeNowSeconds)) {
      warningDiv = loginWarningFragment;
    }
    const loginNonce = generateRandomNonce(8);
    req.session.sessionAuth.loginNonce = loginNonce;
    req.session.sessionAuth.loginExpireTimeSec = timeNowSeconds + 60;
    // The csrfToken is added to req object in web-server.js using csurf middleware.
    // res.set('Cache-Control', 'no-store');
    return res.send(loginHtmlTop +
      loginFormFragment1 +
      '?nonce=' + loginNonce +
      loginFormFragment2 +
      req.csrfToken() +
      loginFormFragment3 +
      warningDiv + loginHtmlBottom);
  }
};

// ---------------------------
// Route: GET /logout
// ---------------------------
export const logout = function (req, res, next) {
  // if logged in then add to logfile
  let user;
  if ((Object.hasOwn(req, 'session')) &&
    (Object.hasOwn(req.session, 'sessionAuth')) &&
    (Object.hasOwn(req.session.sessionAuth, 'authorized')) &&
    (req.session.sessionAuth.authorized === true)) {
    customLog(req, 'Logout ' + req.session.sessionAuth.user);
    user = req.session.sessionAuth.user;
  }
  if (Object.hasOwn(req, 'session')) {
    let cookieName = 'irc-hybrid-client';
    if ((Object.hasOwn(config.server, 'instanceNumber')) &&
      (Number.isInteger(config.server.instanceNumber)) &&
      (config.server.instanceNumber >= 0) && (config.server.instanceNumber < 65536)) {
      cookieName = 'irc-hybrid-client-' + config.server.instanceNumber.toString();
    }
    let cookieOptions = null;
    if (Object.hasOwn(req.session, 'cookie')) {
      cookieOptions = {
        maxAge: req.session.cookie.originalMaxAge,
        expires: req.session.cookie.expires,
        secure: req.session.cookie.secure,
        httpOnly: req.session.cookie.httpOnly,
        path: req.session.cookie.path
      };
    }
    _removeAuthorizationFromSession(req);
    req.session.destroy(function (err) {
      if (err) {
        console.log('Error destroying session ' + err);
      }
    });
    // this clears cookie contents, but not clear cookie
    if (cookieOptions != null) {
      res.clearCookie(cookieName, cookieOptions);
    }
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
export const getUserInfo = function (req, res, next) {
  if ((Object.hasOwn(req, 'session')) &&
    (Object.hasOwn(req.session, 'sessionAuth')) &&
    (Object.hasOwn(req.session.sessionAuth, 'user')) &&
    (Object.hasOwn(req.session.sessionAuth, 'authorized')) &&
    (req.session.sessionAuth.authorized === true)) {
    // Return user information
    const userInfo = {};
    userInfo.user = req.session.sessionAuth.user;
    userInfo.name = req.session.sessionAuth.name;
    userInfo.userid = req.session.sessionAuth.userid;
    // userInfo.scopes = req.session.sessionAuth.scopes;
    res.json(userInfo);
  } else {
    res.status(404).send('404 Not Found');
  }
};
// -----------------------
// Route: GET /login.css
// -----------------------
export const loginStyleSheet = function (req, res, next) {
  fs.readFile('./server/fragments/login.css', 'utf8', function (err, privacyStr) {
    if (err) {
      next(); // fall through to 404
    } else {
      res.set('Content-Type', 'text/css').send(privacyStr);
    }
  });
};

export default {
  authorizeOrLogin,
  blockedCookies,
  authorizeOrFail,
  loginAuthorize,
  loginPage,
  logout,
  getUserInfo,
  loginStyleSheet
};
