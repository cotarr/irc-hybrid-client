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
// Optional remote login using custom Oauth 2.0
//
// -----------------------------------------------------------------------------

// wrap in function to limit namespace scope
(function () {
  'use strict';
  // node native modules
  const fs = require('fs');
  const path = require('path');

  const credentials = JSON.parse(fs.readFileSync('./credentials.json', 'utf8'));

  // other imports
  const sessionExpireAfterSec = credentials.sessionExpireAfterSec || 86400;

  // HTML fragments for login page
  const blockedCookieFragment = fs.readFileSync('./server/fragments/blocked-cookies.html', 'utf8');
  const logoutHtmlTop = fs.readFileSync('./server/fragments/logout-top.html', 'utf8');
  const logoutHtmlBottom = fs.readFileSync('./server/fragments/logout-bottom.html', 'utf8');

  const nodeEnv = process.env.NODE_ENV || 'development';

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
    if (nodeEnv === 'production') {
      fs.writeFile(
        authLogFilename,
        logEntry + '\n',
        {
          encoding: 'utf8',
          mode: 0o644,
          flag: 'a'
        },
        function (err) {
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
    console.log('User Login: (remote) Auth log: ' + authLogFilename);
  } else {
    console.log('User Login: (remote) Auth log: (console)');
  }

  //
  // Setup authentication variables inside session
  //
  const _initSession = function (req) {
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
  const _removeAuthorizationFromSession = function (req) {
    if (req.session) {
      _initSession(req);
      if (req.session.sessionAuth) {
        delete req.session.sessionAuth.sessionExpireTimeSec;
        delete req.session.sessionAuth.user;
        delete req.session.sessionAuth.name;
        delete req.session.sessionAuth.userid;
        // delete req.session.sessionAuth.scopes;
        delete req.session.sessionAuth.previousFailTimeSec;
        req.session.sessionAuth.authorized = false;
      }
    }
  };

  // ----------------------
  // Route: GET /blocked
  // ----------------------
  const blockedCookies = function (req, res, next) {
    res.send(blockedCookieFragment);
  };

  // ----------------------------------------
  // If not authorized, redirect to login
  // ----------------------------------------
  const authorizeOrLogin = function (req, res, next) {
    if (_checkIfAuthorized(req)) {
      next();
    } else {
      res.redirect('/login');
    }
  };

  // ---------------------------------------------
  // If not authorized, return 401 Unauthorized
  // ---------------------------------------------
  const authorizeOrFail = function (req, res, next) {
    if (_checkIfAuthorized(req)) {
      next();
    } else {
      res.status(403).send('403 Forbidden');
    }
  };

  // ---------------------------
  // Route: GET /login route
  // ---------------------------
  const loginRedirect = function (req, res, next) {
    const timeNowSeconds = Math.floor(Date.now() / 1000);
    // ------------------------
    // Authorize the user
    // ------------------------
    _initSession(req);
    req.session.sessionAuth.authorized = true;
    req.session.sessionAuth.user = 'user1';
    req.session.sessionAuth.name = 'user1';
    req.session.sessionAuth.userid = 'user1';
    req.session.sessionAuth.sessionExpireTimeSec = timeNowSeconds + sessionExpireAfterSec;
    // add to log file
    //
    customLog(req, 'Login ' + req.session.sessionAuth.user);
    // -------------------------------------------------
    // Redirect to landing page after successful login
    // -------------------------------------------------
    res.redirect('/irc/webclient.html');
  };

  // ---------------------------
  // Route: GET /logout
  // ---------------------------
  const logout = function (req, res, next) {
    // if logged in then add to logfile
    let user;
    if ((req.session) && (req.session.sessionAuth) && (req.session.sessionAuth.authorized)) {
      customLog(req, 'Logout ' + req.session.sessionAuth.user);
      user = req.session.sessionAuth.user;
    }
    if (req.session) {
      const cookieOptions = {
        maxAge: req.session.cookie.originalMaxAge,
        expires: req.session.cookie.expires,
        secure: req.session.cookie.secure,
        httpOnly: req.session.cookie.httpOnly,
        path: req.session.cookie.path
      };
      _removeAuthorizationFromSession(req);
      req.session.destroy(function (err) {
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
  const loginStyleSheet = function (req, res, next) {
    fs.readFile('./server/fragments/login.css', 'utf8', function (err, privacyStr) {
      if (err) {
        next(); // fall through to 404
      } else {
        res.set('Content-Type', 'text/css').send(privacyStr);
      }
    });
  };

  module.exports = {
    loginRedirect: loginRedirect,
    logout: logout,
    authorizeOrLogin: authorizeOrLogin,
    authorizeOrFail: authorizeOrFail,
    getUserInfo: getUserInfo,
    blockedCookies: blockedCookies,
    loginStyleSheet: loginStyleSheet
  };
})();
