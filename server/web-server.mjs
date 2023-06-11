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
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// express packages
import express from 'express';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import logger from 'morgan';
import helmet from 'helmet';
import compression from 'compression';
import { createClient } from 'redis';
import RedisStore from 'connect-redis';
import memorystore from 'memorystore';
import csrf from '@dr.pogodin/csurf';

// Web server configuration
import config from './config/index.mjs';

import userAuthenticate, {
  authorizeOrFail as localAuthorizeOrFail,
  authorizeOrLogin as localAuthorizeOrLogin
} from './middlewares/user-authenticate.mjs';

import remoteAuthenticate, {
  authorizeOrFail as remoteAuthorizeOrFail,
  authorizeOrLogin as remoteAuthorizeOrLogin
} from './middlewares/remote-authenticate.mjs';

import {
  accessLogFormat,
  accessLogOptions
} from './irc/irc-client-log.mjs';

// Irc Client Module
import ircClient from './irc/irc-client.mjs';
import ircServerListValidations from './irc/irc-serverlist-validations.mjs';
import ircServerListEditor from './irc/irc-serverlist-editor.mjs';

const nodeEnv = process.env.NODE_ENV || 'development';

// Custom case for use with ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csrfProtection = csrf({ cookie: false });
const app = express();

let userAuth = null;
let authorizeOrFail = null;
let authorizeOrLogin = null;
if (config.oauth2.enableRemoteLogin) {
  // Remote authorization modules
  userAuth = remoteAuthenticate;
  authorizeOrFail = remoteAuthorizeOrFail;
  authorizeOrLogin = remoteAuthorizeOrLogin;
} else {
  // Local authorization modules
  userAuth = userAuthenticate;
  authorizeOrFail = localAuthorizeOrFail;
  authorizeOrLogin = localAuthorizeOrLogin;
}

// Also set cookieName in ws-authorize.js, user-authenticate and remote-authenticate.js
let cookieName = 'irc-hybrid-client';
if ((Object.hasOwn(config.server, 'instanceNumber')) &&
  (Number.isInteger(config.server.instanceNumber)) &&
  (config.server.instanceNumber >= 0) && (config.server.instanceNumber < 65536)) {
  cookieName = 'irc-hybrid-client-' + config.server.instanceNumber.toString();
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// cookieParser is not required for express-session
// cookieParser used for user-authenticate.js cookie enabled in browser
// cookieParser used for ws-server /irc/wsauth route cookie match
app.use(cookieParser(config.session.secret));

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

// ------------------
// HTTP access log
// ------------------
app.use(logger(accessLogFormat, accessLogOptions));

// ------------------------------
// Content Security Policy (CSP)
// ------------------------------
// -- Helmet CSP defaults v7.0.0 --
//
// default-src 'self';
// base-uri 'self';
// font-src 'self' https: data:;
// form-action 'self';
// frame-ancestors 'self';
// img-src 'self' data:;
// object-src 'none';
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
if (config.oauth2.enableRemoteLogin) {
  contentSecurityPolicy.directives.formAction = ["'none'"];
} else {
  contentSecurityPolicy.directives.formAction = ["'self'"];
}
// API calls require "connect-src 'self'"
// IOS Safari also needs "wss:" in connect-src to connect websocket
// Chrome and Firefox seem to require only: "connect-source 'self'"
if (config.server.tls) {
  contentSecurityPolicy.directives.connectSrc = ["'self'", 'wss:'];
} else {
  contentSecurityPolicy.directives.connectSrc = ["'self'", 'ws:'];
}
// ----------------------------------------
// HTTP Security Headers
// ----------------------------------------
// -- Helmet Default headers v7.0.0 --
//
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
  xFrameOptions: { action: 'deny' },
  xPoweredBy: false,
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
// Generate in bash: date --date='1 year' --rfc-email
const securityContact = config.site.securityContact;
const securityExpires = config.site.securityExpires;
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

//
// Return status 204 Empty Response for icon
//
app.get('/favicon.ico', function (req, res, next) {
  res.status(204).send(null);
});

//
// express-session configuration object
//
const sessionOptions = {
  name: cookieName, // name also in ws-authorize.js
  proxy: false,
  rolling: config.session.rollingCookie,
  resave: false,
  saveUninitialized: false,
  secret: config.session.secret,
  cookie: {
    path: '/',
    maxAge: config.session.maxAge,
    secure: (config.server.tls), // When TLS enabled, require secure cookies
    httpOnly: true,
    sameSite: 'Lax'
  }
};

if (config.session.enableRedis) {
  // redis database queries
  // list:       KEYS *
  // view:       GET <key>
  // Clear all:  FLUSHALL
  console.log('Using redis for session storage');
  const redisClientOptions = {};
  // must match /etc/redis/redis.conf "requirepass <password>"
  if ((config.session.redisPassword) && (config.session.redisPassword.length > 0)) {
    redisClientOptions.password = config.session.redisPassword;
  }
  const redisClient = createClient(redisClientOptions);
  redisClient.connect()
    .catch((err) => {
      console.log('redis-server error: ', err.toString());
      // fatal error
      process.exit(1);
    });
  const redisStoreOptions = {
    client: redisClient,
    prefix: config.session.redisPrefix || 'irc:'
    // redis uses Cookie ttl from session cookie
  };
  sessionOptions.store = new RedisStore(redisStoreOptions);
} else {
  console.log('Using memorystore for session storage');
  const memoryStoreOptions = {
    // store ttl in milliseconds
    ttl: config.session.maxAge, // milliseconds
    stale: true, // return expired value before deleting otherwise undefined if false
    checkPeriod: 86400000 // prune every 24 hours
  };
  const MemoryStore = memorystore(session);
  sessionOptions.store = new MemoryStore(memoryStoreOptions);
}

// -----------------------------------------------------------------
// express-session
//
// Cookies issued and session store created
// -----------------------------------------------------------------
app.use(session(sessionOptions));

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

if (config.oauth2.enableRemoteLogin) {
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
app.post('/terminate', authorizeOrFail, csrfProtection, function (req, res, next) {
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
app.get('/secure', authorizeOrFail, (req, res) => res.json({ secure: 'ok' }));

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
// But the risk is low, because an IRC user is unique.
// Only a single IRC user will have a valid login to
// the backend web server. It is not a multi-user web server.
//
// This route and function exchanges cookie value
// and expiration timestamp with the websocket module
// for independent (manual) cookie validation
// for the websocket upgrade request.
//
// Data stored globally, time expiration 10 seconds.
//
// -----------------------------------------
app.post('/irc/wsauth', authorizeOrFail, csrfProtection, function (req, res, next) {
  delete global.webSocketAuth;
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
//   // Dynamic import of ES Module, used only for debugging
//   const module1 = await import('./testws/testws.mjs');
//   app.use('/testws', module1.testWsRouter);
// }

// ----------------
// User info API
//
// Method: GET
// Route:  /userinfo
//
// ----------------
app.get('/userinfo', authorizeOrFail, userAuth.getUserInfo);

// ---------------------------------------
// IRC client API routes served to browser
// ---------------------------------------
app.post('/irc/server', authorizeOrFail, csrfProtection, ircClient.serverHandler);
app.post('/irc/connect', authorizeOrFail, csrfProtection, ircClient.connectHandler);
app.post('/irc/disconnect', authorizeOrFail, csrfProtection, ircClient.disconnectHandler);
app.post('/irc/message', authorizeOrFail, csrfProtection, ircClient.messageHandler);
app.get('/irc/getircstate', authorizeOrFail, ircClient.getIrcState);
app.get('/irc/cache', authorizeOrFail, ircClient.getCache);
app.post('/irc/prune', authorizeOrFail, csrfProtection, ircClient.pruneChannel);
app.post('/irc/erase', authorizeOrFail, csrfProtection, ircClient.eraseCache);
app.get('/irc/test1', authorizeOrFail, ircClient.test1Handler);
app.get('/irc/test2', authorizeOrFail, ircClient.test2Handler);

// //
// // API for Server List Editor
// //
if (config.irc.disableServerListEditor) {
  app.get('/irc/serverlist', authorizeOrFail,
    (req, res) => res.status(405).json({ Error: 'Server List Editor Disabled' }));
  app.post('/irc/serverlist', authorizeOrFail, csrfProtection,
    (req, res) => res.status(405).json({ Error: 'Server List Editor Disabled' }));
  app.patch('/irc/serverlist', authorizeOrFail, csrfProtection,
    (req, res) => res.status(405).json({ Error: 'Server List Editor Disabled' }));
  app.copy('/irc/serverlist', authorizeOrFail, csrfProtection,
    (req, res) => res.status(405).json({ Error: 'Server List Editor Disabled' }));
  app.delete('/irc/serverlist', authorizeOrFail, csrfProtection,
    (req, res) => res.status(405).json({ Error: 'Server List Editor Disabled' }));
  app.post('/irc/serverlist/tools', authorizeOrFail, csrfProtection,
    (req, res) => res.status(405).json({ Error: 'Server List Editor Disabled' }));
} else {
  app.get('/irc/serverlist',
    authorizeOrFail,
    ircServerListValidations.list,
    ircServerListEditor.list);
  app.post('/irc/serverlist',
    authorizeOrFail, csrfProtection,
    ircServerListValidations.create,
    ircServerListEditor.create);
  app.patch('/irc/serverlist',
    authorizeOrFail, csrfProtection,
    ircServerListValidations.update,
    ircServerListEditor.update);
  app.copy('/irc/serverlist',
    authorizeOrFail, csrfProtection,
    ircServerListValidations.copy,
    ircServerListEditor.copy);
  app.delete('/irc/serverlist',
    authorizeOrFail, csrfProtection,
    ircServerListValidations.destroy,
    ircServerListEditor.destroy);
  app.post('/irc/serverlist/tools',
    authorizeOrFail, csrfProtection,
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
  authorizeOrLogin,
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
  authorizeOrLogin,
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
app.use('/irc', authorizeOrFail, express.static(secureDir));

//
// Optionally server /docs folder to /irc/docs
//

if (config.irc.serveHtmlHelpDocs) {
  const docsDir = path.join(__dirname, '../docs');
  app.use('/irc/docs', authorizeOrFail, express.static(docsDir));
}

// ---------------------------------
//    E R R O R   H A N D L E R S
// ---------------------------------
//
// catch 404 Not Found
//
app.use(function (req, res, next) {
  const err = new Error(http.STATUS_CODES[404]);
  err.status = 404;
  return res.set('Content-Type', 'text/plain').status(err.status).send(err.message);
});
//
// Custom error handler
//
app.use(function (err, req, res, next) {
  // per Node docs, if response in progress, must be returned to default error handler
  if (res.headersSent) return next(err);
  const status = err.status || 500;
  let message = status.toString() + ' ' + (http.STATUS_CODES[status] || 'Error');
  if (err.message) message += ', ' + (err.message.split('\n')[0]);
  if (nodeEnv === 'production') {
    console.log(message);
    return res.set('Content-Type', 'text/plain').status(status).send(message);
  } else {
    console.log(message);
    // console.log(err);
    return res.set('Content-Type', 'text/plain').status(status).send(message + '\n' + err.stack);
  }
});
export { app };
