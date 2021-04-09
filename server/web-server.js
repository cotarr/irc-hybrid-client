'use strict';

// native node packages
const http = require('http');
const https = require('https');
const path = require('path');
const fs=require('fs');

// express packages
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MemoryStore = require('memorystore')(session);
const logger = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const app = express();

// Session and User login routes
const userAuth = require('./middlewares/user-authenticate');
const authorizeOrLogin = userAuth.authorizeOrLogin;
const authorizeOrFail = userAuth.authorizeOrFail;

// Irc Client Module
const ircClient = require('./irc/irc-client');

const credentials = JSON.parse(fs.readFileSync('./credentials.json', 'utf8'));

// credentials
const cookieSecret = credentials.cookieSecret;
if (cookieSecret.length < 8) {
  throw new Error('Error, cookie secret required');
}
// console.log('cookieSecret ' + cookieSecret);

// default 24 hour = 86400 sec 86400000 milliseconds
const sessionExpireAfterSec = credentials.sessionExpireAfterSec || 86400;
const sessionExpireAfterMs = 1000 * sessionExpireAfterSec;
// console.log('sessionExpireAfterMs ' + sessionExpireAfterMs);

var nodeEnv = process.env.NODE_ENV || 'development';

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
// cookieParser is not required for express-session
// cookieParser used for user-authenticate.js cookie enabled in browser
// cookieParser used for ws-server /irc/wsauth route cookie match
app.use(cookieParser(cookieSecret));

// Generic console log if various nodejs req object properties
const logStuff = function(req, res, next) {
  // console.log('req.headers' + JSON.stringify(req.headers, null, 2));
  // console.log('req.rawHeaders ' + req.rawHeaders);
  // console.log('req.body' + JSON.stringify(req.body, null, 2));
  // console.log('isVhostMatch ' + checkVhost.isVhostMatch(req));
  // console.log('notVhostMatch ' + checkVhost.notVhostMatch(req));
  // console.log('cookie ' + req.headers.cookie);
  // console.log('signedCookies ' + JSON.stringify(req.signedCookies));
  next();
};
// app.use(logStuff);

if (nodeEnv === 'production') {
  app.use(compression());
}

//
// HTTP access log
//
const accessLogFilename = path.join(__dirname, '../logs/access.log');
if (nodeEnv === 'development') {
  console.log('Access log: (console)');
  app.use(logger(':date[iso] :remote-addr :status :method :http-version :req[host]:url', {
  }));
} else {
  console.log('Access log: ' + accessLogFilename);
  app.use(logger(':date[iso] :remote-addr :status :method :http-version :req[host]:url', {
    stream: fs.createWriteStream(accessLogFilename, {
      encoding: 'utf8',
      mode: 0o644,
      flags: 'a'
    }),
    skip: function (req, res) {
      return (res.statusCode < 400);
    }
  }));
}

//
// clean headers
//

app.use(helmet({
  hidePoweredBy: false
}));
app.use(helmet.referrerPolicy({policy: 'no-referrer'}));

// ------------------------------------------------
// test error, check for stack dump on production
// ------------------------------------------------
// app.get('/error', function(req, res, next) {
//   throw new Error('Test error');
//   next();
// });

//
// /status, Is the server alive?
//
app.get('/status', (req, res) => res.json({status: 'ok'}));

// ----------------------------------------
// CSP Content Security Policy
// ----------------------------------------
/* eslint-disable quotes */
app.use(helmet.contentSecurityPolicy({
  directives:
    {
      defaultSrc: ["'none'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'"]
    }
}));
/* eslint-enable quotes */

//
// security.txt security notification contact
//
// Required Format (see https://securitytxt.org/)
// Contact: mailto:security@example.com
// Expires: Fri, 1 Apr 2022 08:30 -0500
const securityContact = credentials.securityContact;
const securityExpires = credentials.securityExpires;
if (securityContact.length > 0) {
  app.get('/.well-known/security.txt', function(req, res) {
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
app.get('/robots.txt', function(req, res) {
  res.set('Content-Type', 'text/plain');
  res.send(
    'User-agent: *\n' +
    'Disallow: /\n');
});

//
// express-session configuration object
//
let sessionOptions = {
  secret: cookieSecret,
  name: 'irc-hybrid-client', // name also in ws-server.js
  store: new MemoryStore({
    ttl: sessionExpireAfterMs, // milliseconds
    stale: true, // return expired value before deleting otherwise undefined if false
    checkPeriod: 864000000 // prune every 24 hours
  }),
  cookie: {
    path: '/',
    maxAge: sessionExpireAfterMs,
    secure: (nodeEnv !== 'development') // production --> true, TLS required
  },
  proxy: false,
  resave: false, // set to false because memorystore has touch method
  saveUninitialized: false
};

// -----------------------------------------------------------------
// express-session
//
// Cookies issued and session store created
// -----------------------------------------------------------------
app.use('/', session(sessionOptions));

// ------------------
// User Login Routes
// ------------------
app.get('/login.css', userAuth.loginStyleSheet);
app.get('/login', userAuth.loginPage);
app.post('/login-authorize', userAuth.loginAuthorize);
app.get('/logout', userAuth.logout);
app.get('/blocked', userAuth.blockedCookies);

// -----------------------------------------
//          Websocket Auth
//
// This app has as in effect two separate web servers.
// There is a websocket server that accepts
// node request object fo upgrade to websocket.
// There is the express.js framework in this module.
// The websocket module does not have access
// to the express (req, res, next) objects
// and therefore not express session (req.session).
// This route and function exchanges cookie value
// and expiration timestamp with the webscket module
// for independant (manual) cookie validation
// for the websocket upgrade request.
//
// Data stored globally, time expiration 10 seconds.
//
// -----------------------------------------
app.post('/irc/wsauth', function(req, res, next) {
  global.webSocketAuth = {
    expire: 0,
    cookie: ''
  };
  // requires cookie-parser
  if ('signedCookies' in req) {
    let cookieValue = req.signedCookies['irc-hybrid-client'];
    // if not empty
    if (cookieValue.length > 8) {
      let timeNow = parseInt(Date.now() / 1000); // seconds
      global.webSocketAuth = {
        expire: timeNow + 10,
        cookie: cookieValue
      };
      return res.json({error: false});
    }
  }
  let error = new Error('Invalid Auth Request');
  error.status = 400;
  return next(error);
});

// ----------------
// User info API
// ----------------
app.get('/userinfo', authorizeOrFail, userAuth.getUserInfo);

// ---------------------------------------
// IRC client API routes served to browser
// ---------------------------------------
app.post('/irc/connect', authorizeOrFail, ircClient.connectHandler);
app.post('/irc/disconnect', authorizeOrFail, ircClient.disconnectHandler);
app.post('/irc/message', authorizeOrFail, ircClient.messageHandler);
app.get('/irc/getircstate', authorizeOrFail, ircClient.getIrcState);
app.get('/irc/cache', authorizeOrFail, ircClient.getCache);
app.post('/irc/erase', authorizeOrFail, ircClient.eraseCache);

app.get('/irc/test1', authorizeOrFail, ircClient.test1Handler);
app.get('/irc/test2', authorizeOrFail, ircClient.test2Handler);

// -------------------------------
// Web server for static files
// -------------------------------
let secureDir = path.join(__dirname, '../secure');
app.use('/irc', authorizeOrLogin, express.static(secureDir));

// ---------------------------------
//    E R R O R   H A N D L E R S
// ---------------------------------

//
// catch 404 and forward to error handler
//
app.use(function(req, res, next) {
  let responseObject = {};
  responseObject.error = {
    status: 404,
    message: http.STATUS_CODES[404]
  };
  if (nodeEnv === 'development') {
    // console.log(JSON.stringify(req.url));
    responseObject.error.error = req.method + ' ' + req.url;
  }
  if (('accept' in req.headers) && (req.headers['accept'].toLowerCase() === 'application/json')) {
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
  next();
});

//
// Custom error handler
//
app.use(function(err, req, res, next) {
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
  let responseObject = {};
  responseObject.error = {};
  responseObject.error.status = err.status || 500;
  responseObject.error.message =
    http.STATUS_CODES[responseObject.error.status] || 'Internal Server Error';
  if (nodeEnv === 'development') {
    responseObject.error.error = err.message.toString() || '';
    responseObject.error.stack = err.stack || '';
  }
  if (('accept' in req.headers) && (req.headers['accept'].toLowerCase() === 'application/json')) {
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
  next(err);
});

module.exports = app;
