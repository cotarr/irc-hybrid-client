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
// Optional remote login using custom Oauth 2.0 Server
//
// This file is not required when irc-hybrid-client is used with
// the default configuration of internal user password login.
//
// The file credentials.json should something similar to the following
//   {
//     "enableRemoteLogin": true,
//     "remoteAuthHost": "http://127.0.0.1:3500",
//     "remoteCallbackHost": "http://localhost:3003",
//     "remoteClientId": "irc_client_id",
//     "remoteClientSecret": "irc_client_secret_TO_BE_CHANGED",
//     "remoteScope": "irc_001.irc"
// }
//
// In credentials.json file, user array is not required. --> "loginUsers": []
//
// -----------------------------------------------------------------------------

// wrap in function to limit namespace scope
(function () {
  'use strict';
  // node native modules
  const fs = require('fs');
  const path = require('path');
  const fetch = require('node-fetch');

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
            if (credentials.sessionRollingCookie) {
              req.session.sessionAuth.sessionExpireTimeSec = timeNowSeconds + sessionExpireAfterSec;
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
  //
  // Redirect (302) to authorization server
  // There, user will be presented with login form
  // ---------------------------
  const loginRedirect = function (req, res, next) {
    res.redirect(
      credentials.remoteAuthHost +
      '/dialog/authorize?' +
      'redirect_uri=' + credentials.remoteCallbackHost + '/login/callback' + '&' +
      'response_type=code&' +
      'client_id=' + credentials.remoteClientId + '&' +
      'scope=' + credentials.remoteScope);
  };

  //
  //
  // ----------------------------------------
  // Internal functions for promise chain
  // ----------------------------------------
  //
  // ------------------------------------------------------
  // Validate that required properties exist after
  // exchanging authorization code for new access token
  // ------------------------------------------------------
  const _validateTokenResponse = function (tokenResponse) {
    return new Promise(function (resolve, reject) {
      if (('token_type' in tokenResponse) && (tokenResponse.token_type === 'Bearer') &&
        ('grant_type' in tokenResponse) && (tokenResponse.grant_type === 'authorization_code') &&
        ('expires_in' in tokenResponse) && (parseInt(tokenResponse.expires_in) > 0) &&
        ('access_token' in tokenResponse) && (typeof tokenResponse.access_token === 'string') &&
        (tokenResponse.access_token.length > 0)) {
        resolve(tokenResponse);
      } else {
        const err = new Error('Error parsing authorization_code response');
        console.log(err.message);
        reject(err);
      }
    });
  };

  // ------------------------------------------------------
  // Compare scope of decoded access_token to configured scope
  // for access to the IRC server.
  // Return 403 Forbidden if scope is insufficient
  // ------------------------------------------------------
  const _authorizeTokenScope = function (res, tokenMetaData) {
    return new Promise(function (resolve, reject) {
      if (('active' in tokenMetaData) && (tokenMetaData.active === true) &&
        ('scope' in tokenMetaData) && (Array.isArray(tokenMetaData.scope))) {
        if (tokenMetaData.scope.indexOf(credentials.remoteScope) >= 0) {
          resolve(tokenMetaData);
        } else {
          return res.status(403).send(
            'Forbidden - User access_token insufficient scope. (Expect scope: ' +
            credentials.remoteScope + ')');
        }
      } else {
        const err = new Error('Error parsing introspect response meta-data');
        console.log(err.message);
        reject(err);
      }
    });
  };

  // -------------------------------------------------------------------
  // After all authentication is complete, mark session as authorized.
  // -------------------------------------------------------------------
  const _setSessionAuthorized = function (req, res, tokenMetaData) {
    return new Promise(function (resolve, reject) {
      const timeNowSeconds = Math.floor(Date.now() / 1000);
      _initSession(req);
      req.session.sessionAuth.authorized = true;
      req.session.sessionAuth.user = tokenMetaData.user.username;
      req.session.sessionAuth.name = tokenMetaData.user.name;
      req.session.sessionAuth.userid = tokenMetaData.user.id;
      req.session.sessionAuth.sessionExpireTimeSec = timeNowSeconds + sessionExpireAfterSec;
      //
      // add to log file
      //
      customLog(req, 'Login ' + req.session.sessionAuth.user);
      //
      // Redirect to landing page after successful login
      //
      return res.redirect('/irc/webclient.html');
    });
  };

  // -----------------------------------------------------------------------
  // Submit the user's access_token to the authorization server
  // introspect route to validate token signature.
  // The authorization server will return the user's access_token meta-dat.
  //
  // Returns promise
  // -----------------------------------------------------------------------
  const _introspectAccessToken = function (responseObj, code) {
    // OAuth2 authorization server
    const fetchUrl = credentials.remoteAuthHost + '/oauth/introspect';

    const body = {
      access_token: responseObj.access_token,
      client_id: credentials.remoteClientId,
      client_secret: credentials.remoteClientSecret
    };

    const fetchOptions = {
      method: 'POST',
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(body)
    };

    // Return Promise
    return fetch(fetchUrl, fetchOptions)
      .then((response) => {
        if (response.ok) {
          return response.json();
        } else {
          throw new Error('Fetch status ' + response.status + ' ' +
          fetchOptions.method + ' ' + fetchUrl);
        }
      })
      .then((introspectResponse) => {
        console.log('interspectResponse ', introspectResponse);
        return introspectResponse;
      });
  };

  // ---------------------------------------------------------------
  // Exchange authorization code for a new
  // new access token from Oauth 2.0 authorization server
  //
  // Returns promise
  // ---------------------------------------------------------------
  const _fetchNewAccessToken = function (code) {
    // OAuth2 authorization server
    const fetchUrl = credentials.remoteAuthHost + '/oauth/token';

    const body = {
      code: code,
      redirect_uri: credentials.remoteCallbackHost + '/login/callback',
      client_id: credentials.remoteClientId,
      client_secret: credentials.remoteClientSecret,
      grant_type: 'authorization_code'
    };

    const fetchOptions = {
      method: 'POST',
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(body)
    };

    // Return Promise
    return fetch(fetchUrl, fetchOptions)
      .then((response) => {
        if (response.ok) {
          return response.json();
        } else {
          throw new Error('Fetch status ' + response.status + ' ' +
          fetchOptions.method + ' ' + fetchUrl);
        }
      })
      .then((tokenResponse) => {
        console.log(tokenResponse);
        return tokenResponse;
      });
  };

  // -------------------------------------------------------------------------------
  // Route handler for /login/callback
  //
  // The browser will redirect to here with the Oauth 2.0 authorization code
  // as a query parameter in the url.
  //
  // 1) Perform fetch request to exchange authorizaton code for a new access_token
  // 2) Validate the token request response object
  // 3) Perform fetch request to validate token and obtain user's token meta-data
  // 4) Validate that user's token scope is sufficient to use irc-hybrid-client
  // 5) Redirect to single page application at /irc/webclient.html
  // -------------------------------------------------------------------------------
  const exchangeAuthCode = function (req, res, next) {
    // Calling fetchNewAccessToken returns promise
    _fetchNewAccessToken(req.query.code)
      .then(function (tokenResponse) {
        return _validateTokenResponse(tokenResponse);
      })
      .then(function (tokenResponse) {
        return _introspectAccessToken(tokenResponse);
      })
      .then(function (tokenMetaData) {
        return _authorizeTokenScope(res, tokenMetaData);
      })
      .then(function (tokenMetaData) {
        return _setSessionAuthorized(req, res, tokenMetaData);
      })
      .catch(function (err) {
        return next(err.message || err);
      });
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
      let cookieName = 'irc-hybrid-client';
      if (('instanceNumber' in credentials) && (Number.isInteger(credentials.instanceNumber)) &&
        (credentials.instanceNumber >= 0) && (credentials.instanceNumber < 100)) {
        cookieName = 'irc-hybrid-client-' + credentials.instanceNumber.toString();
      }
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
      res.clearCookie(cookieName, cookieOptions);
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
    exchangeAuthCode: exchangeAuthCode,
    logout: logout,
    authorizeOrLogin: authorizeOrLogin,
    authorizeOrFail: authorizeOrFail,
    getUserInfo: getUserInfo,
    blockedCookies: blockedCookies,
    loginStyleSheet: loginStyleSheet
  };
})();
