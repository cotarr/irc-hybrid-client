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
//           ExpressJs Web Server
//
// -----------------------------------------------------------------------------

'use strict';

// native node packages
const http = require('http');
const path = require('path');
const fs = require('fs');

// express packages
const express = require('express');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const logger = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: false });
const app = express();

// Irc Client Module
const ircClient = require('./irc/irc-client');
const ircServerListValidations = require('./irc/irc-serverlist-validations');
const ircServerListEditor = require('./irc/irc-serverlist-editor');

// TLS certificate filenames
// Web username, password credentials
const credentials = JSON.parse(fs.readFileSync('./credentials.json', 'utf8'));
if (credentials.configVersion === 1) {
  console.log('\nPassword hash requires regeneration due to upgrade of hash function to bcrypt.\n');
  process.exit(1);
}
if ((!('configVersion' in credentials)) || (credentials.configVersion !== 2)) {
  console.log('Error, credentials.js wrong configVersion');
  process.exit(1);
}

//
// Load optional DRAFT middle for remote authorization
// See middlewares/remote-authentication.js
//
let userAuth = null;
if (credentials.enableRemoteLogin) {
  // Session and User login routes
  userAuth = require('./middlewares/remote-authenticate');
} else {
  // Session and User login routes
  userAuth = require('./middlewares/user-authenticate');
}

// Also set cookieName in ws-authorize.js, user-authenticate and remote-authenticate.js
let cookieName = 'irc-hybrid-client';
if (('instanceNumber' in credentials) && (Number.isInteger(credentials.instanceNumber)) &&
  (credentials.instanceNumber >= 0) && (credentials.instanceNumber < 65536)) {
  cookieName = 'irc-hybrid-client-' + credentials.instanceNumber.toString();
}

// For session cookie
const cookieSecret = credentials.cookieSecret;
if (cookieSecret.length < 8) {
  throw new Error('Error, cookie secret required');
}
// console.log('cookieSecret ' + cookieSecret);

// default 24 hour = 86400 sec 86400000 milliseconds
const sessionExpireAfterSec = credentials.sessionExpireAfterSec || 86400;
const sessionExpireAfterMs = 1000 * sessionExpireAfterSec;
// console.log('sessionExpireAfterMs ' + sessionExpireAfterMs);

const nodeEnv = process.env.NODE_ENV || 'development';
const nodeDebugLog = process.env.NODE_DEBUG_LOG || 0;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// cookieParser is not required for express-session
// cookieParser used for user-authenticate.js cookie enabled in browser
// cookieParser used for ws-server /irc/wsauth route cookie match
app.use(cookieParser(cookieSecret));

// Generic console log to debug various nodejs req object properties
// const logStuff = function (req, res, next) {
//   // console.log('req.headers' + JSON.stringify(req.headers, null, 2));
//   // console.log('req.rawHeaders ' + req.rawHeaders);
//   // console.log('req.body' + JSON.stringify(req.body, null, 2));
//   // console.log('cookie ' + req.headers.cookie);
//   // console.log('signedCookies ' + JSON.stringify(req.signedCookies));
//   next();
// };
// app.use(logStuff);

if (nodeEnv === 'production') {
  app.use(compression());
}

//
// HTTP access log
//
const accessLogFilename = path.join(__dirname, '../logs/access.log');
const accessLogOnlyErrors = credentials.accessLogOnlyErrors || false;
if ((nodeEnv === 'development') || (nodeDebugLog)) {
  console.log('Access log: (console)');
  app.use(logger(':date[iso] :remote-addr :status :method :http-version :req[host]:url', {
  }));
} else {
  console.log('Access log: ' + accessLogFilename + ' (Errors only)');
  app.use(logger(':date[iso] :remote-addr :status :method :http-version :req[host]:url', {
    stream: fs.createWriteStream(accessLogFilename, {
      encoding: 'utf8',
      mode: 0o600,
      flags: 'a'
    }),
    // Log only errors, comment out this next part to see all traffic
    skip: function (req, res) {
      return ((res.statusCode < 400) && (accessLogOnlyErrors));
    }
  }));
}

// ------------------------------
// Content Security Policy (CSP)
// ------------------------------
// -- Helmet CSP defaults v5.0.1 --
//
// default-src 'self';
// base-uri 'self';
// block-all-mixed-content;
// font-src 'self' https: data:;
// form-action 'self';
// frame-ancestors 'self';
// img-src 'self' data:;object-src 'none';
// script-src 'self';
// script-src-attr 'none';
// style-src 'self' https: 'unsafe-inline';
// upgrade-insecure-requests
// ------------------------------
const contentSecurityPolicy = {
  // No fallback to helmet default CSP
  useDefaults: false,
  // Custom CSP
  directives: {
    defaultSrc: ["'none'"],
    baseUri: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'"],
    mediaSrc: ["'self'"],
    frameAncestors: ["'none'"],
    imgSrc: ["'self'"]
  },
  // Option to disable CSP while showing errors in console log.
  reportOnly: false
};
// When using internal user login a <form> submission is required for password entry
if (credentials.enableRemoteLogin) {
  contentSecurityPolicy.directives.formAction = ["'none'"];
} else {
  contentSecurityPolicy.directives.formAction = ["'self'"];
}
// API calls require "connect-src 'self'"
// IOS Safari also needs "wss:" in connect-src to connect websocket
// Chrome and Firefox seem to require only: "connect-source 'self'"
if (credentials.tls) {
  contentSecurityPolicy.directives.connectSrc = ["'self'", 'wss:'];
} else {
  contentSecurityPolicy.directives.connectSrc = ["'self'", 'ws:'];
}
// ----------------------------------------
// HTTP Security Headers
// ----------------------------------------
// -- Helmet Default headers Helmet v5.0.1 --
//
// Cross-Origin-Embedder-Policy: require-corp
// Cross-Origin-Opener-Policy: same-origin
// Cross-Origin-Resource-Policy: same-origin
// Origin-Agent-Cluster: ?1
// Referrer-Policy: no-referrer
// Strict-Transport-Security: max-age=15552000; includeSubDomains
// X-Content-Type-Options: nosniff
// X-DNS-Prefetch-Control: off
// X-Download-Options: noopen
// X-Frame-Options: SAMEORIGIN
// X-Permitted-Cross-Domain-Policies: none
// X-XSS-Protection: 0
// X-Powered-By: ( Removed by helmet)
// ----------------------------------------

// ----------------------------------------
app.use(helmet({
  frameguard: { action: 'deny' },
  hidePoweredBy: false,
  referrerPolicy: { policy: 'no-referrer' },
  contentSecurityPolicy: contentSecurityPolicy
}));

// ------------------------------------------------
// test error, check for stack dump on production
// ------------------------------------------------
// app.get('/error', function(req, res, next) {
//   throw new Error('Test error');
//   next();
// });

//
//   /status    Is the server alive?
//
app.get('/status', (req, res) => res.json({ status: 'ok' }));

//
// security.txt security notification contact
//
// Required Format (see https://securitytxt.org/)
// Contact: mailto:security@example.com
// Expires: Fri, 1 Apr 2022 08:30 -0500
const securityContact = credentials.securityContact;
const securityExpires = credentials.securityExpires;
if (securityContact.length > 0) {
  app.get('/.well-known/security.txt', function (req, res) {
    res.set('Content-Type', 'text/plain');
    res.send(
      '# Website security contact \r\n' +
      'Contact: ' + securityContact + '\r\n' +
      'Expires: ' + securityExpires + '\r\n'
    );
  });
}

//
// Robot exclusion policy (robots.txt)
//
app.get('/robots.txt', function (req, res) {
  res.set('Content-Type', 'text/plain');
  res.send(
    'User-agent: *\n' +
    'Disallow: /\n');
});

// Return status 204 Empty Response for icon
app.get('/favicon.ico', function (req, res, next) {
  res.status(204).send(null);
});

//
// express-session configuration object
//
const sessionOptions = {
  name: cookieName, // name also in ws-authorize.js
  proxy: false,
  rolling: credentials.sessionRollingCookie || false,
  resave: false,
  saveUninitialized: false,
  secret: cookieSecret,
  cookie: {
    path: '/',
    maxAge: sessionExpireAfterMs,
    secure: (credentials.tls), // When TLS enabled, require secure cookies
    httpOnly: true,
    sameSite: 'Lax'
  }
};

const sessionStore = {};
if (credentials.sessionEnableRedis) {
  // redis database queries
  // list:       KEYS *
  // view:       GET <key>
  // Clear all:  FLUSHALL
  console.log('Using redis for session storage');
  sessionStore.redis = require('redis');
  sessionStore.RedisStore = require('connect-redis')(session);
  const redisClientOptions = {};
  // must match /etc/redis/redis.conf "requirepass <password>"
  if ((credentials.sessionRedisPassword) && (credentials.sessionRedisPassword > 0)) {
    redisClientOptions.password = credentials.sessionRedisPassword;
  }
  sessionStore.redisClient = sessionStore.redis.createClient(redisClientOptions);
  const redisStoreOptions = {
    client: sessionStore.redisClient,
    prefix: credentials.sessionRedisPrefix || 'irc:'
    // redis uses Cookie ttl from session cookie
  };
  sessionOptions.store = new sessionStore.RedisStore(redisStoreOptions);
} else {
  console.log('Using memorystore for session storage');
  sessionStore.MemoryStore = require('memorystore')(session);
  sessionOptions.store = new sessionStore.MemoryStore({
    // memorystore in milliseconds
    ttl: sessionExpireAfterMs, // milliseconds
    stale: true, // return expired value before deleting otherwise undefined if false
    checkPeriod: 86400000 // prune every 24 hours
  });
}

// -----------------------------------------------------------------
// express-session
//
// Cookies issued and session store created
// -----------------------------------------------------------------
app.use('/', session(sessionOptions));

// --------------------------------------------
// Rate limit http requests
// 100 http request per 10 seconds per IP address
//
// This was added to quiet github CodeQL
// security warning for missing rate-limiter
// ---------------------------------------------
const rateLimiter = rateLimit({
  windowMs: 10000,
  max: 100,
  statusCode: 429,
  message: 'Too many requests',
  standardHeaders: false,
  legacyHeaders: false
});
if (nodeEnv === 'production') {
  app.use(rateLimiter);
}

// ------------------
// User Login Routes
// ------------------

if (credentials.enableRemoteLogin) {
  //
  // First part is optional remote user password login.
  // DRAFT, in debug, see: middlewares/remote-authenticate.js
  //
  app.get('/login', userAuth.loginRedirect);
  app.get('/login/callback', userAuth.exchangeAuthCode);
  app.get('/login.css', userAuth.loginStyleSheet);
  app.get('/logout', userAuth.logout);
  app.get('/blocked', userAuth.blockedCookies);
} else {
  //
  // This is the normal built in user password login as found
  // in the master branch (the default)
  //
  app.get('/login.css', userAuth.loginStyleSheet);
  app.get('/login', csrfProtection, userAuth.loginPage);
  app.post('/login-authorize', csrfProtection, userAuth.loginAuthorize);
  app.get('/logout', userAuth.logout);
  app.get('/blocked', userAuth.blockedCookies);
}

//
// To Terminate remote server
//
// Method: POST
// Route:  /terminate
//
// Input: confirmation message
//
//  req.body {
//    "terminate": "YES"
//  }
//
app.post('/terminate', userAuth.authorizeOrFail, csrfProtection, function (req, res, next) {
  let inputVerifyString = '';
  if (('terminate' in req.body) && (typeof req.body.terminate === 'string')) {
    inputVerifyString = req.body.terminate;
  }
  if (inputVerifyString === 'YES') {
    const now = new Date();
    let dieMessage = now.toISOString() + ' Terminate request ';
    try {
      dieMessage += ' user=' + req.session.sessionAuth.user;
    } catch (err) {
      // ignore
    }
    try {
      dieMessage += ' at ' + req._remoteAddress;
    } catch (err) {
      // ignore
    }
    console.log(dieMessage);
    setTimeout(function () {
      process.exit(1);
    }, 1000);
    res.json({ error: false, message: 'Terminate received' });
  } else if (inputVerifyString === 'NO') {
    res.json({ error: true, message: 'Terminate Ignored. Not {terminate: YES}' });
  } else {
    const error = new Error('Bad Reqeust');
    error.status = 400;
    next(error);
  }
});

// Route used to verify cookie not expired before reconnecting
app.get('/secure', userAuth.authorizeOrFail, (req, res) => res.json({ secure: 'ok' }));

// -----------------------------------------
//          Websocket Auth
//
// This application includes two separate web servers:
// 1) There is a websocket server that accepts
//    node request object fo upgrade to websocket.
// 2) There is the express.js framework in this module.
//
// The websocket module does not have access
// to the express (req, res, next) objects
// and therefore not express session (req.session).
//
// The approach here relies on the assumption
// that the signed cookie in the /wsauth POST
// is trusted, because express-session verified the signature.
// Therefore, if the decoded cookie value is saved for a few seconds
// it can be used to verify the websocket upgrade request.
//
// There may be some risk in this because the cookie in this
// function originally came from the client browser.
//
// This route and function exchanges cookie value
// and expiration timestamp with the webscket module
// for independant (manual) cookie validation
// for the websocket upgrade request.
//
// Data stored globally, time expiration 10 seconds.
//
// -----------------------------------------
app.post('/irc/wsauth', userAuth.authorizeOrFail, csrfProtection, function (req, res, next) {
  global.webSocketAuth = {
    expire: 0,
    cookie: ''
  };
  // requires cookie-parser
  if ('signedCookies' in req) {
    const cookieValue = req.signedCookies[cookieName];
    // if not empty
    if (cookieValue.length > 8) {
      const timeNow = parseInt(Date.now() / 1000); // seconds
      global.webSocketAuth = {
        expire: timeNow + 10,
        cookie: cookieValue
      };
      return res.json({ error: false });
    }
  }
  const error = new Error('Invalid Auth Request');
  error.status = 400;
  return next(error);
});

// -------------------------------------------------------
// Web socket security test
// Development only.
// Testing web page: /testws/test-websocket.html
//
//   C A U T I O N    N O    A U T H E N T I C A T I O N
//
//               Enable only for testing
// -------------------------------------------------------
// console.log('******** (debug) /testws route enabled without authorization **********');
// if (nodeEnv === 'development') {
//   const testWs = require('./testws/testws');
//   app.use('/testws', testWs);
// }

// ----------------
// User info API
//
// Method: GET
// Route:  /userinfo
//
// ----------------
app.get('/userinfo', userAuth.authorizeOrFail, userAuth.getUserInfo);

// ---------------------------------------
// IRC client API routes served to browser
// ---------------------------------------
app.post('/irc/server', userAuth.authorizeOrFail, csrfProtection, ircClient.serverHandler);
app.post('/irc/connect', userAuth.authorizeOrFail, csrfProtection, ircClient.connectHandler);
app.post('/irc/disconnect', userAuth.authorizeOrFail, csrfProtection, ircClient.disconnectHandler);
app.post('/irc/message', userAuth.authorizeOrFail, csrfProtection, ircClient.messageHandler);
app.get('/irc/getircstate', userAuth.authorizeOrFail, ircClient.getIrcState);
app.get('/irc/cache', userAuth.authorizeOrFail, ircClient.getCache);
app.post('/irc/prune', userAuth.authorizeOrFail, csrfProtection, ircClient.pruneChannel);
app.post('/irc/erase', userAuth.authorizeOrFail, csrfProtection, ircClient.eraseCache);
app.get('/irc/test1', userAuth.authorizeOrFail, ircClient.test1Handler);
app.get('/irc/test2', userAuth.authorizeOrFail, ircClient.test2Handler);

//
// API for Server List Editor
//
if (credentials.disableServerListEditor) {
  app.get('/irc/serverlist', userAuth.authorizeOrFail,
    (req, res) => res.status(405).json({ Error: 'Server List Editor Disabled' }));
  app.post('/irc/serverlist', userAuth.authorizeOrFail, csrfProtection,
    (req, res) => res.status(405).json({ Error: 'Server List Editor Disabled' }));
  app.patch('/irc/serverlist', userAuth.authorizeOrFail, csrfProtection,
    (req, res) => res.status(405).json({ Error: 'Server List Editor Disabled' }));
  app.copy('/irc/serverlist', userAuth.authorizeOrFail, csrfProtection,
    (req, res) => res.status(405).json({ Error: 'Server List Editor Disabled' }));
  app.delete('/irc/serverlist', userAuth.authorizeOrFail, csrfProtection,
    (req, res) => res.status(405).json({ Error: 'Server List Editor Disabled' }));
  app.post('/irc/serverlist/tools', userAuth.authorizeOrFail, csrfProtection,
    (req, res) => res.status(405).json({ Error: 'Server List Editor Disabled' }));
} else {
  app.get('/irc/serverlist',
    userAuth.authorizeOrFail,
    ircServerListValidations.list,
    ircServerListEditor.list);
  app.post('/irc/serverlist',
    userAuth.authorizeOrFail, csrfProtection,
    ircServerListValidations.create,
    ircServerListEditor.create);
  app.patch('/irc/serverlist',
    userAuth.authorizeOrFail, csrfProtection,
    ircServerListValidations.update,
    ircServerListEditor.update);
  app.copy('/irc/serverlist',
    userAuth.authorizeOrFail, csrfProtection,
    ircServerListValidations.copy,
    ircServerListEditor.copy);
  app.delete('/irc/serverlist',
    userAuth.authorizeOrFail, csrfProtection,
    ircServerListValidations.destroy,
    ircServerListEditor.destroy);
  app.post('/irc/serverlist/tools',
    userAuth.authorizeOrFail, csrfProtection,
    ircServerListValidations.tools,
    ircServerListEditor.tools);
}

// -------------------------------
// If unauthorized, redirect to /login for main html file /irc/webclient.html.
// Else, past this point, all other static files return 403 if unauthorized
// -------------------------------
// Read contents of main web page for /irc/webclient.html and
// substitute CSRF token into meta tag for csurf middleware
// -------------------------------
app.get('/irc/webclient.html',
  userAuth.authorizeOrLogin,
  csrfProtection,
  function (req, res, next) {
    let filename = './secure-minify/webclient.html';
    if (nodeEnv === 'development') filename = './secure/webclient.html';
    fs.readFile(filename, 'utf8', function (err, data) {
      if (err) {
        next(err);
      } else {
        res.send(data.replace('{{csrfToken}}', req.csrfToken()));
      }
    });
  }
);
app.get('/irc/serverlist.html',
  userAuth.authorizeOrLogin,
  csrfProtection,
  function (req, res, next) {
    let filename = './secure-minify/serverlist.html';
    if (nodeEnv === 'development') filename = './secure/serverlist.html';
    fs.readFile(filename, 'utf8', function (err, data) {
      if (err) {
        next(err);
      } else {
        res.send(data.replace('{{csrfToken}}', req.csrfToken()));
      }
    });
  }
);

// -------------------------------
// Web server for static files
// -------------------------------

// If not production, serve HTML file from development folders
let secureDir = path.join(__dirname, '../secure');

// Else, if production, server the minified, bundled version
if (nodeEnv === 'production') secureDir = path.join(__dirname, '../secure-minify');

console.log('Serving files from: ' + secureDir);
app.use('/irc', userAuth.authorizeOrFail, express.static(secureDir));

// ---------------------------------
//    E R R O R   H A N D L E R S
// ---------------------------------

//
// catch 404 and forward to error handler
//
app.use(function (req, res, next) {
  const responseObject = {};
  responseObject.error = {
    status: 404,
    message: http.STATUS_CODES[404]
  };
  if (nodeEnv === 'development') {
    // console.log(JSON.stringify(req.url));
    responseObject.error.error = req.method + ' ' + req.url;
  }
  if (('accept' in req.headers) && (req.headers.accept.toLowerCase() === 'application/json')) {
    return res.status(404).json(responseObject);
  }
  // simple custom handler
  let htmlString =
    '<!DOCTYPE html><html lang="en">' +
    '<head><meta charset="utf-8"><title>Error</title></head>' +
    '<body><pre>' + responseObject.error.message + '\n';
  if (nodeEnv === 'development') {
    htmlString += responseObject.error.error + '\n';
  }
  htmlString += '</pre></body></html>';
  return res.status(responseObject.error.status).send(htmlString);

  // Else: default node express error handler generate HTML
  // next();
});

//
// Custom error handler
//
app.use(function (err, req, res, next) {
  if (nodeEnv === 'development') {
    // console.log(err);
  }
  // per Node docs, if response in progress, must be returned to default error handler
  if (res.headersSent) {
    return next(err);
  }

  if (typeof err === 'string') {
    err = {
      message: err.toString()
    };
  };
  const responseObject = {};
  responseObject.error = {};
  responseObject.error.status = err.status || 500;
  responseObject.error.message =
    http.STATUS_CODES[responseObject.error.status] || 'Internal Server Error';
  if (nodeEnv === 'development') {
    responseObject.error.error = err.message.toString() || '';
    responseObject.error.stack = err.stack || '';
  }
  if (('accept' in req.headers) && (req.headers.accept.toLowerCase() === 'application/json')) {
    return res.status(responseObject.error.status).json(responseObject);
  }
  let htmlString =
    '<!DOCTYPE html><html lang="en">' +
    '<head><meta charset="utf-8"><title>Error</title></head>' +
    '<body><pre>' + responseObject.error.message + '\n';
  if (nodeEnv === 'development') {
    htmlString += responseObject.error.error + '\n' + responseObject.error.stack;
  }
  htmlString += '</pre></body></html>';
  return res.status(responseObject.error.status).send(htmlString);

  // Else not application/json, let default node express error handler generate HTML
  // next(err);
});

module.exports = app;
