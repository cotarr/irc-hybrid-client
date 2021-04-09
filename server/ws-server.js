'use strict';

const path = require('path');
const ws = require('ws');
const url = require('url');
const fs = require('fs');
const crypto = require('crypto');
const isValidUTF8 = require('utf-8-validate');
const signature = require('cookie-signature');
const cookie = require('cookie');


const credentials = JSON.parse(fs.readFileSync('./credentials.json', 'utf8'));
const cookieSecret = credentials.cookieSecret;
// console.log('cookieSecret ' + cookieSecret);

// --------------------------------------------------------------------
//                     Web socket authorization
//
// App has two separate web servers: 1) express API server, 2) websocket server
// The web socket server does not have access to express (req, res, next) objects,
// and therefore does not have access to express-session authentication status.
// The websocket server must extract cookie from request object
// and validate the cookie manually using handshake values between
// app.js and ws-server.js.
//
// 1) Browser attempts to load IRC web client page
// 2) If cookie invalid, redirect to user login, validate user, then redirect back
// 3) Browser loads web client page webclient.html
// 4) On load javascript webclient.js, browser fetchs POST request to /irc/wsauth
// 5) In app.js, /irc/wsauth POST request, session cookie validated by express-session.
// 5) In app.js, route handler, cookie value obtained from cookieParser in req object
// 6) In app.js, route handler, Cookie value and +10 second expire time saved as global variable
// 7) Upon POST received event, browser attempts to open websocket
// 8) Thd websocket server (bin/www) calls on 'upgrade' handler in ws-server.js
// 9) wsOnUpgrade() calls _authorizeWebSocket
// 10) Check: cookie present
// 11) Validate cookie signature
// 12) Timeing safe compare cookie value against stored global cookie value (from app.js POST route)
// 13) and... global timetamp (10 seconds) is not expired.
// 14) Authorize web socket to upgrade
// 15) On web socket open event, request ircState from web server by calling getIrcState().
// 16) On receipt event getIrcState() POST, set connected state in browser, accept user input.

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

const _authorizeWebSocket = function (request) {
  // Check if header contains cookies
  if (('headers' in request) && ('cookie' in request.headers)) {
    // decode cookies into array of un-escaped strings
    let cookies = cookie.parse(request.headers.cookie);
    // console.log(JSON.stringify(cookies, null, 2));
    // Get cookie with matching name
    let raw = cookies['irc-hybrid-client'];
    // console.log(raw);
    if (raw) {
      // check prefix to verify it has signature
      if (raw.substr(0, 2) === 's:') {
        // console.log(raw.substr(0, 2));
        // Validate signature using cookie-signature module
        let result = signature.unsign(raw.slice(2), cookieSecret);
        // check if signature was valid
        if (result !== false) {
          // console.log('valid cookie  ' + result);
          // console.log('global cookie ' + JSON.stringify(global.webSocketAuth));
          //
          // Check if cookie value matches value from POST /irc/wsauth
          // and that 10 second expiration time is not exceeded.
          //
          let timeNow = parseInt(Date.now() / 1000); // seconds
          if ((safeCompare(result, global.webSocketAuth.cookie)) &&
            (timeNow < global.webSocketAuth.expire)) {
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
  return false;
};

// ----------------------------------------
// Set up a headless websocket server
// ----------------------------------------
const wsServer = new ws.Server({noServer: true});

wsServer.on('connection', function (socket) {
  // console.log('ws-server.js connection');
  socket.on('message', function (message) {
    console.log('ws-server.js message ' + message);
  });
});

global.sendToBrowser = function(message) {
  let out = null;
  if (typeof message === 'string') {
    out = Buffer.from(message);
  }
  if (Buffer.isBuffer(message)) {
    out = message;
  }
  if (!isValidUTF8(out)) {
    out = null;
  }
  if (out) {
    if (Buffer.isBuffer(out)) out = message.toString();
    wsServer.clients.forEach(function (client) {
      client.send(out.toString());
    });
  } else {
    console.log('Error, sendToBrowser() failed UTF8 validtion');
    wsServer.clients.forEach(function (client) {
      client.send('webServer: sendToBrowser() failed UTF8 validation\n');
    });
  }
};

global.getWebsocketCount = function() {
  if ((wsServer) && (wsServer.clients)) {
    let count = 0;
    wsServer.clients.forEach(function() {
      count++;
    });
    return count;
  } else {
    return 0;
  }
};

setInterval(function() {
  global.sendToBrowser('HEARTBEAT\n');
}, 10000);

const wsOnUpgrade = function (request, socket, head) {
  let now = new Date();
  let timeString = now.toISOString() + ' ';
  const pathname = url.parse(request.url).pathname;
  if (pathname === '/irc/ws') {
    if (_authorizeWebSocket(request)) {
      console.log(timeString + request.connection.remoteAddress +
        ' websocket-connect ' + request.url);
      wsServer.handleUpgrade(request, socket, head, function (socket) {
        wsServer.emit('connection', socket, request);
      });
    } else {
      console.log(timeString + request.connection.remoteAddress +
        ' websocket-auth-fail ' + request.url);
      socket.destroy();
    }
  } else {
    console.log(timeString + request.connection.remoteAddress +
        ' websocket-path-not-found ' + request.url);
    socket.destroy();
  }
};

module.exports = {
  wsServer: wsServer,
  wsOnUpgrade: wsOnUpgrade
};
