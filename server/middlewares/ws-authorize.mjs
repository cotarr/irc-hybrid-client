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
//                     Websocket authorization
//
// -----------------------------------------------------------------------------
// App has two separate web servers: 1) express API server, 2) websocket server
// The websocket server does not have access to express (req, res, next) objects,
// and therefore does not have access to express-session authentication status.
// The websocket server must extract cookie from request object
// and validate the cookie manually using handshake values between
// web-server.js and ws-server.js.
//
// 1) Browser attempts to load IRC web client page
// 2) If cookie invalid, redirect to user login, validate user, then redirect back
// 3) Browser loads web client page webclient.html
// 4) On load javascript webclient.js, browser fetchs POST request to /irc/wsauth
// 5) In web-server.js, /irc/wsauth POST request, session cookie validated by express-session.
// 5) In web-server.js, route handler, cookie value obtained from cookieParser in req object
// 6) In web-server.js, route handler, Cookie value and +10 second expiry saved as global
// 7) Upon POST received event, browser attempts to open websocket
// 8) Thd websocket server (bin/www) calls on 'upgrade' handler in ws-server.js
// 9) wsOnUpgrade() calls _authorizeWebSocket
// 10) Check: cookie present
// 11) Validate cookie signature
// 12) Safe compare cookie value to stored global cookie value (from web-server.js POST route)
// 13) and... global timetamp (10 seconds) is not expired.
// 14) Authorize websocket to upgrade
// 15) On websocket open event, request ircState from web server by calling getIrcState().
// 16) On receipt event getIrcState() POST, set connected state in browser, accept user input.
// ---------------------------------------------------------------------------------------------
'use strict';

const fs = require('fs');
const crypto = require('crypto');
const signature = require('cookie-signature');
const cookie = require('cookie');

const credentials = JSON.parse(fs.readFileSync('./credentials.json', 'utf8'));
const cookieSecret = credentials.cookieSecret;
// console.log('cookieSecret ' + cookieSecret);

const ircLog = require('../irc/irc-client-log');

// const nodeEnv = process.env.NODE_ENV || 'development';

// Also set cookieName in web-server.js
let cookieName = 'irc-hybrid-client';
if ((Object.hasOwn(credentials, 'instanceNumber')) &&
  (Number.isInteger(credentials.instanceNumber)) &&
  (credentials.instanceNumber >= 0) && (credentials.instanceNumber < 65536)) {
  cookieName = 'irc-hybrid-client-' + credentials.instanceNumber.toString();
}

//
// Custom log file (Option: setup to fail2ban to block IP addresses)
//
const customLog = function (request, logString) {
  //
  // build log text string
  //
  let logEntry = '';
  if (('connection' in request) && ('remoteAddress' in request.connection)) {
    logEntry += request.connection.remoteAddress;
  } else {
    logEntry += 'NOADDRESS';
  }
  logEntry += ' ' + logString;
  if ('url' in request) {
    logEntry += ' ' + request.url;
  }
  //
  // Append string to file
  //
  ircLog.writeAccessLog(logEntry);
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

// ------------------------------------------------------
// Function to validate cookie within node request object.
//
// Return true if authorized, otherwise return false
// ------------------------------------------------------
const authorizeWebSocket = function (request) {
  // Check if header contains cookies
  // Odd, "headers" appears to be a prototype method, not an object property
  if ((request.headers) &&
    (Object.hasOwn(request.headers, 'cookie'))) {
    // decode cookies into array of un-escaped strings
    const cookies = cookie.parse(request.headers.cookie);
    // console.log(JSON.stringify(cookies, null, 2));
    // Get cookie with matching name
    const raw = cookies[cookieName];
    // console.log(raw);
    if (raw) {
      // check prefix to verify it has signature
      if ((raw.length > 2) && (raw.substring(0, 2) === 's:')) {
        // console.log(raw.substring(0, 2));
        // Validate signature using cookie-signature module
        const result = signature.unsign(raw.slice(2), cookieSecret);
        // check if signature was valid
        if (result !== false) {
          // console.log('valid cookie  ' + result);
          // console.log('global cookie ' + JSON.stringify(global.webSocketAuth));
          //
          // Check if cookie value matches value from POST /irc/wsauth
          // and that 10 second expiration time is not exceeded.
          //
          const timeNow = parseInt(Date.now() / 1000); // seconds
          if ((Object.hasOwn(global, 'webSocketAuth')) &&
            (Object.hasOwn(global.webSocketAuth, 'cookie')) &&
            (safeCompare(result, global.webSocketAuth.cookie)) &&
            (timeNow < global.webSocketAuth.expire)) {
            // Finished checking cookie, delete it
            delete global.webSocketAuth;
            // console.log('websocket verified by cookie auth');
            return true;
          } else {
            console.log('_authorizeWebSocket time expired or cookie hash not match');
            return false;
          }
        } else {
          console.log('_authorizeWebSocket cookie signature invalid.');
          return false;
        }
      } else {
        console.log('_authorizeWebSocket cookie unsigned');
        return false;
      }
    } else {
      console.log('_authorizeWebSocket named cookie not found');
      return false;
    }
  } else {
    // case of no cookies
    console.log('_authorizeWebSocket no cookies found');
    return false;
  }
  // In case of code error return false (unreachable return)
  // eslint-disable-next-line no-unreachable
  return false;
};

module.exports = {
  authorizeWebSocket: authorizeWebSocket,
  customLog: customLog
};
