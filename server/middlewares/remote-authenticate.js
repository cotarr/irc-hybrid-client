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
// This properties are not required when irc-hybrid-client is used with
// the default configuration of internal user password login.
//
// The file credentials.json should something similar to the following
//   {
//     "enableRemoteLogin": true,
//     "remoteAuthHost": "http://127.0.0.1:3500",
//     "remoteCallbackHost": "http://localhost:3003",
//     "remoteClientId": "irc_client_id",
//     "remoteClientSecret": "irc_client_secret_TO_BE_CHANGED",
//     "remoteScope": "irc.scope1"
//   }
//
// The remoteScope can be either a single string (above) or an array of stings (below)
//  {
//    "remoteScope": [
//      "irc.scope1",
//      "irc.scope2"
//    ]
//  }
//
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

  const credentials = JSON.parse(fs.readFileSync('./credentials.json', 'utf8'));

  // other imports
  const sessionExpireAfterSec = credentials.sessionExpireAfterSec || 86400;

  // HTML fragments for login page
  const blockedCookieFragment = fs.readFileSync('./server/fragments/blocked-cookies.html', 'utf8');
  const logoutHtmlTop = fs.readFileSync('./server/fragments/logout-top.html', 'utf8');
  const logoutHtmlBottom = fs.readFileSync('./server/fragments/logout-bottom.html', 'utf8');

  const nodeEnv = process.env.NODE_ENV || 'development';
  const nodeDebugLog = process.env.NODE_DEBUG_LOG || 0;

  //
  // At program startup, validate the credentials.json file for required properties.
  //
  if ((!Object.hasOwn(credentials, 'remoteAuthHost')) ||
    (credentials.remoteAuthHost.length < 1)) {
    console.log(
      'Error: Remote login, "remoteAuthHost" is a required property, credentials.json');
    process.exit(1);
  } else if ((!Object.hasOwn(credentials, 'remoteCallbackHost')) ||
    (credentials.remoteCallbackHost.length < 1)) {
    console.log(
      'Error: Remote login, "remoteCallbackHost" is a required property, credentials.json');
    process.exit(1);
  } else if ((!Object.hasOwn(credentials, 'remoteClientId')) ||
    (credentials.remoteClientId.length < 1)) {
    console.log(
      'Error: Remote login, "remoteClientId" is a required property, credentials.json');
    process.exit(1);
  } else if ((!Object.hasOwn(credentials, 'remoteClientSecret')) ||
    (credentials.remoteClientSecret.length < 1)) {
    console.log(
      'Error: Remote login, "remoteClientSecret" is a required property, credentials.json');
    process.exit(1);
  } else if (!Object.hasOwn(credentials, 'remoteScope')) {
    console.log(
      'Error: Remote login, "remoteScope" is a required property, credentials.json');
    process.exit(1);
  } else {
    let scopeExist = false;
    if (Array.isArray(credentials.remoteScope)) {
      if ((credentials.remoteScope.length > 0) &&
        (credentials.remoteScope[0].length > 0)) {
        scopeExist = true;
      }
    } else {
      if ((typeof credentials.remoteScope === 'string') &&
        (credentials.remoteScope.length > 0)) {
        scopeExist = true;
      }
    }
    if (!scopeExist) {
      console.log('Error: Remote login, "remoteScope" is a required property, credentials.json');
      process.exit(1);
    }
  }

  //
  // At program startup, check if native fetch() exists.
  // If the fetch() API is not found, load legacy v2
  // of the node-fetch package.
  //
  // eslint-disable-next-line no-use-before-define
  if ((typeof fetch).toString() !== 'function') {
    const nodeUpgradeMessage =
    '+-----------------------------------------------------------\n' +
    '| During startup, the fetch() API was not detected. For backward\n' +
    '| compatibility, the legacy NPM module "node-fetch" v2 was loaded.\n' +
    '| In version v18.0.0 NodeJs introduced a native fetch() API.\n' +
    '| In the future, NodeJs v18 or greater may be required when\n' +
    '| using the optional remote login. (CHANGELOG v0.2.41)\n' +
    '+-----------------------------------------------------------';
    console.log(nodeUpgradeMessage);
    global.fetch = require('node-fetch');
  }

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
  if ((nodeEnv === 'development') || (nodeDebugLog)) {
    console.log('User Login: (remote) Auth log: (console)');
  } else {
    console.log('User Login: (remote) Auth log: ' + authLogFilename);
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
      (Object.hasOwn(req.session.sessionAuth), 'authorized')) {
      if (req.session.sessionAuth.authorized === true) {
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

  // ----------------------
  // Route: GET /blocked
  // ----------------------
  // TODO blocked cookies not detected in this branch.
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
  // There, the user will be presented with login form
  //
  // Example of part part of redirect (line wrapped):
  // /dialog/authorize?redirect_uri=http://localhost:3003/login/callback&
  //     response_type=code&client_id=irc_client&scope=irc.scope1%20irc.scope2
  // ---------------------------
  const loginRedirect = function (req, res, next) {
    let scopeString = '';
    // Case 1, remoteScope is single string
    if (typeof credentials.remoteScope === 'string') {
      scopeString = credentials.remoteScope;
    }
    // Case 2, remoteScope is array of strings
    if ((Array.isArray(credentials.remoteScope)) && (credentials.remoteScope.length > 0)) {
      for (let i = 0; i < credentials.remoteScope.length; i++) {
        if (i > 0) {
          // Delimit with escaped space characters
          scopeString += ' ' + credentials.remoteScope[i];
        } else {
          scopeString += credentials.remoteScope[i];
        }
      }
    }
    res.redirect(encodeURI(
      credentials.remoteAuthHost +
      '/dialog/authorize?' +
      'redirect_uri=' + credentials.remoteCallbackHost + '/login/callback' + '&' +
      'response_type=code&' +
      'client_id=' + credentials.remoteClientId + '&' +
      'scope=' + scopeString));
  };

  //
  //
  // ----------------------------------------
  // Internal functions for promise chain
  // ----------------------------------------

  // Function will regenerate a new session and cookie
  // Returns Promise resolving to null
  // Throws error if unable to regenerate and rejects promise
  //
  // It is a general security practice to update session upon change in permission.
  //
  const _regenerateSessionCookie = function (req, chain) {
    return new Promise(
      (resolve, reject) => {
        req.session.regenerate(function (err) {
          if (err) {
            reject(err);
          } else {
            // return chain object unmodified
            resolve(chain);
          };
        });
      }
    );
  };

  // ---------------------------------------------------------
  // Validate input for url query parameters
  // and extract Oauth 2.0 authorization code
  //
  // GET /login/callback?code=xxxxxxxx
  //
  // Success: returns promise resolving to authorization code
  // Validation failure: generate response status 400 bad request
  // Otherwise internal server error.
  // ---------------------------------------------------------
  const _extractCallbackAuthCode = function (req, chain) {
    return new Promise(function (resolve, reject) {
      if (Object.hasOwn(req, 'query')) {
        // query input validation
        if ((typeof req.query === 'object') &&
          (Object.keys(req.query).length === 1) &&
          ('code' in req.query) &&
          (typeof req.query.code === 'string') &&
          (req.query.code.length > 0) &&
          (req.query.code.length < 80)) {
          // Extract Oauth 2.0 authorization code
          chain.code = req.query.code;
          // return chain object with result
          resolve(chain);
        } else {
          console.log('Error: _extractCallbackAuthCode() req.query failed input validation');
          const err = new Error('Authorization code validation error');
          err.status = 400;
          reject(err);
        }
      } else {
        const err = new Error('query param not found in req object');
        console.log(err.message);
        reject(err);
      }
    });
  };

  // ------------------------------------------------------
  // Validate that required properties exist after
  // exchanging authorization code for new access token
  // ------------------------------------------------------
  const _validateTokenResponse = function (chain) {
    return new Promise(function (resolve, reject) {
      if ((Object.hasOwn(chain, 'tokenResponse')) &&
        (!(chain.tokenResponse == null)) &&
        (Object.hasOwn(chain.tokenResponse, 'token_type')) &&
        (chain.tokenResponse.token_type === 'Bearer') &&
        (Object.hasOwn(chain.tokenResponse, 'grant_type')) &&
        (chain.tokenResponse.grant_type === 'authorization_code') &&
        (Object.hasOwn(chain.tokenResponse, 'expires_in')) &&
        (parseInt(chain.tokenResponse.expires_in) > 0) &&
        (Object.hasOwn(chain.tokenResponse, 'access_token')) &&
        (typeof chain.tokenResponse.access_token === 'string') &&
        (chain.tokenResponse.access_token.length > 0)) {
        resolve(chain);
      } else {
        const err = new Error('Error parsing authorization_code response');
        console.log(err.message);
        reject(err);
      }
    });
  };

  // ------------------------------------------------------
  // Compare scope of decoded access_token to configured scope
  // to grant the user access to the IRC server.
  // At minimum, one scope from each must match.
  // Return 403 Forbidden if scope is insufficient
  // ------------------------------------------------------
  const _authorizeTokenScope = function (chain) {
    // console.log('chain.tokenMetaData.scope ', chain.tokenMetaData.scope);
    // console.log('credentials.remoteScope ', credentials.remoteScope);
    return new Promise(function (resolve, reject) {
      if ((Object.hasOwn(chain, 'tokenMetaData')) &&
        (!(chain.tokenMetaData == null)) &&
        (Object.hasOwn(chain.tokenMetaData, 'active')) &&
        (chain.tokenMetaData.active === true) &&
        (Object.hasOwn(chain.tokenMetaData, 'scope')) &&
        (Array.isArray(chain.tokenMetaData.scope))) {
        let scopeFound = false;
        // Case 1 remoteScope is type String
        if (typeof credentials.remoteScope === 'string') {
          if (chain.tokenMetaData.scope.indexOf(credentials.remoteScope) >= 0) {
            scopeFound = true;
          }
          // Case 2, remoteScope is Array of Strings
        } else if (Array.isArray(credentials.remoteScope)) {
          credentials.remoteScope.forEach(function (scopeString) {
            if (chain.tokenMetaData.scope.indexOf(scopeString) >= 0) {
              scopeFound = true;
            }
          });
        }
        if (scopeFound) {
          resolve(chain);
        } else {
          console.log('User access token insufficient scope');
          const err = new Error('User access token insufficient scope');
          err.status = 403;
          reject(err);
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
  const _setSessionAuthorized = function (req, chain) {
    return new Promise(function (resolve, reject) {
      const timeNowSeconds = Math.floor(Date.now() / 1000);
      _initSession(req);
      req.session.sessionAuth.authorized = true;
      req.session.sessionAuth.user = chain.tokenMetaData.user.username;
      req.session.sessionAuth.name = chain.tokenMetaData.user.name;
      req.session.sessionAuth.userid = chain.tokenMetaData.user.id;
      req.session.sessionAuth.sessionExpireTimeSec = timeNowSeconds + sessionExpireAfterSec;
      //
      // add to log file
      //
      customLog(req, 'Login ' + req.session.sessionAuth.user);

      resolve(chain);
    });
  };

  // -------------------------------------------------
  // Network fetch functions to authorization server
  // -------------------------------------------------

  // -----------------------------------------------------------------------
  // Submit the user's access_token to the authorization server
  // introspect route to validate token signature.
  // The authorization server will return the user's access_token meta-dat.
  //
  // Returns promise
  // -----------------------------------------------------------------------
  const _introspectAccessToken = function (chain) {
    // OAuth2 authorization server
    const fetchUrl = credentials.remoteAuthHost + '/oauth/introspect';

    const fetchController = new AbortController();

    const body = {
      access_token: chain.tokenResponse.access_token,
      client_id: credentials.remoteClientId,
      client_secret: credentials.remoteClientSecret
    };

    const fetchOptions = {
      method: 'POST',
      redirect: 'error',
      signal: fetchController.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(body)
    };

    chain.introspectFetchTimerId = setTimeout(() => fetchController.abort(), 5000);

    // Return Promise
    return fetch(fetchUrl, fetchOptions)
      .then((response) => {
        if (response.status === 200) {
          return response.json();
        } else {
          throw new Error('Fetch status ' + response.status + ' ' +
          fetchOptions.method + ' ' + fetchUrl);
        }
      })
      .then((introspectResponse) => {
        // console.log('introspectResponse ', introspectResponse);
        if (chain.introspectFetchTimerId) clearTimeout(chain.introspectFetchTimerId);
        chain.tokenMetaData = introspectResponse;
        return chain;
      });
  };

  // ---------------------------------------------------------------
  // Exchange authorization code for a new
  // new access token from Oauth 2.0 authorization server
  //
  // Returns promise
  // ---------------------------------------------------------------
  const _fetchNewAccessToken = function (chain) {
    // OAuth2 authorization server
    const fetchUrl = credentials.remoteAuthHost + '/oauth/token';

    const fetchController = new AbortController();

    const body = {
      code: chain.code,
      redirect_uri: credentials.remoteCallbackHost + '/login/callback',
      client_id: credentials.remoteClientId,
      client_secret: credentials.remoteClientSecret,
      grant_type: 'authorization_code'
    };

    const fetchOptions = {
      method: 'POST',
      redirect: 'error',
      signal: fetchController.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(body)
    };

    chain.tokenFetchTimerId = setTimeout(() => fetchController.abort(), 5000);

    // Return Promise
    return fetch(fetchUrl, fetchOptions)
      .then((response) => {
        if (response.status === 200) {
          return response.json();
        } else {
          throw new Error('Fetch status ' + response.status + ' ' +
          fetchOptions.method + ' ' + fetchUrl);
        }
      })
      .then((tokenResponse) => {
        // console.log(tokenResponse);
        if (chain.tokenFetchTimerId) clearTimeout(chain.tokenFetchTimerId);
        chain.tokenResponse = tokenResponse;
        return chain;
      });
  };

  // -------------------------------------------------------------------------------
  // Route handler for GET /login/callback
  //
  // The browser will redirect to here with the Oauth 2.0 authorization code
  // as a query parameter in the url. (Example: /login/callback?code=xxxxxxx)
  //
  // 1) Regenerate a new session and cookie (security)
  // 2) Input validation on GET /login/callback, then extract authorization code
  // 3) Perform fetch request to exchange authorization code for a new access_token
  // 4) Validate the token request response object required parameters
  // 5) Perform fetch request to validate token and obtain user's token meta-data
  // 6) Validate that user's token scope is sufficient to use irc-hybrid-client
  // 7) Redirect to single page application at /irc/webclient.html
  // -------------------------------------------------------------------------------
  const exchangeAuthCode = function (req, res, next) {
    const chainObj = Object.create(null);
    // Calling _regenerateSessionCookie returns promise
    _regenerateSessionCookie(req, chainObj)
      .then((chain) => _extractCallbackAuthCode(req, chain))
      .then((chain) => _fetchNewAccessToken(chain))
      .then((chain) => _validateTokenResponse(chain))
      .then((chain) => _introspectAccessToken(chain))
      .then((chain) => _authorizeTokenScope(chain))
      .then((chain) => _setSessionAuthorized(req, chain))
      .then((chain) => {
        // Success...
        return res.redirect('/irc/webclient.html');
      })
      .catch((err) => {
        // Failure...
        if (chainObj.introspectFetchTimerId) clearTimeout(chainObj.introspectFetchTimerId);
        if (chainObj.tokenFetchTimerId) clearTimeout(chainObj.tokenFetchTimerId);
        return next(err);
      });
  };

  // ---------------------------
  // Route: GET /logout
  // ---------------------------
  const logout = function (req, res, next) {
    // if logged in then add to logfile
    let user;
    if ((Object.hasOwn(req, 'session')) &&
      (Object.hasOwn(req.session, 'sessionAuth')) &&
      (req.session.sessionAuth.authorized)) {
      customLog(req, 'Logout ' + req.session.sessionAuth.user);
      user = req.session.sessionAuth.user;
    }
    if (Object.hasOwn(req, 'session')) {
      let cookieName = 'irc-hybrid-client';
      if ((Object.hasOwn(credentials, 'instanceNumber')) &&
        (Number.isInteger(credentials.instanceNumber)) &&
        (credentials.instanceNumber >= 0) && (credentials.instanceNumber < 65536)) {
        cookieName = 'irc-hybrid-client-' + credentials.instanceNumber.toString();
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
      tempHtml =
        'Logout successful for user ' + user +
        ' on the web server at ' +
        credentials.remoteCallbackHost + '.' +
        '<br><br>' +
        'You may still be logged in to the authorization server at ' +
        credentials.remoteAuthHost + '. ' +
        'You may remove your authoriztion server login by visiting the link at: ' +
        '<a href="' + credentials.remoteAuthHost + '/logout">' +
        credentials.remoteAuthHost + '/logout</a>. ' +
        '<a href="' + credentials.remoteAuthHost + '/logout"><button>Auth Logout</button></a>';
    }
    res.send(logoutHtmlTop + tempHtml + logoutHtmlBottom);
  };

  // -----------------------------
  // Route: GET /userinfo
  // -----------------------------
  const getUserInfo = function (req, res, next) {
    if ((Object.hasOwn(req, 'session')) &&
      (Object.hasOwn(req.session, 'sessionAuth')) &&
      (Object.hasOwn(req.session.sessionAuth, 'user')) &&
      (Object.hasOwn(req.session.sessionAuth, 'authorized')) &&
      (req.session.sessionAuth.authorized === true)) {
      // Return user information
      const userInfo = Object.create(null);
      userInfo.user = req.session.sessionAuth.user;
      userInfo.name = req.session.sessionAuth.name;
      userInfo.userid = req.session.sessionAuth.userid;
      res.json(userInfo);
    } else {
      res.status(404).send('404 Not Found');
    }
  };
  // -----------------------
  // Route: GET /login.css
  // -----------------------
  const loginStyleSheet = function (req, res, next) {
    fs.readFile('./server/fragments/login.css', 'utf8', function (err, styleSheetStr) {
      if (err) {
        next(); // fall through to 404
      } else {
        res.set('Content-Type', 'text/css').send(styleSheetStr);
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
