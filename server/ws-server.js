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
//                   Websocket Server
//
// -----------------------------------------------------------------------------

'use strict';

const ws = require('ws');
const isValidUTF8 = require('utf-8-validate');

const authorizeWebSocket = require('./middlewares/ws-authorize').authorizeWebSocket;
const customLog = require('./middlewares/ws-authorize').customLog;

const nodeEnv = process.env.NODE_ENV || 'development';
const nodeDebugLog = process.env.NODE_DEBUG_LOG || 0;

// ----------------------------------------
// Set up a headless websocket server
// ----------------------------------------
const wsServer = new ws.Server({ noServer: true });

// -------------------------------------------------
// Message handler (browser --> web server)
//
// In this application, the websocket use is limited
// to messages from web server to browser. The return
// direction is not used at this time.
// This listener will catch return messages, but
// the messages from browser to web server will be
// ignored and discarded without action.
// -------------------------------------------------
wsServer.on('connection', function (socket) {
  // console.log('ws-server.js connection');
  socket.on('message', function (message) {
    // All messages ignored.
    console.log('ws-server.js: Unexpected websocket message: ' + message);
  });
});

// ----------------------------------------
// Send message (web server --> browser)
//
// This is the primary function used to
// send messages from the web server to the
// browser. It is global in scope.
// ---------------------------------------
global.sendToBrowser = function (message) {
  if (message.length === 0) return;
  let out = null;
  if (typeof message === 'string') {
    out = Buffer.from(message, 'utf8');
  }
  if (Buffer.isBuffer(message)) {
    out = message;
  }
  if (!isValidUTF8(out)) {
    out = null;
    console.log('sendToBrowser() failed UTF-8 validtion');
  }
  // zero not allowed as avalid character
  if (out.includes(0)) {
    out = null;
    console.log('sendToBrowser() failed zero byte validation');
  }
  if (out) {
    wsServer.clients.forEach(function (client) {
      client.send(out.toString('utf8'));
    });
  }
};

global.getWebsocketCount = function () {
  if ((wsServer) && (wsServer.clients)) {
    let count = 0;
    wsServer.clients.forEach(function () {
      count++;
    });
    return count;
  } else {
    return 0;
  }
};

// ------------------------------------------------
// Monitored by browser to detect socket disconnect
// ------------------------------------------------
setInterval(function () {
  global.sendToBrowser('HEARTBEAT\n');
}, 10000);

// ----------------------------------------
// HTTP --> WebSocket Upgrade Handler
//
// 1) Validate route
// 2) Validate cookie on upgrade request
// 3) Connect the webscket
// ----------------------------------------
const wsOnUpgrade = function (request, socket, head) {
  let upgradePath = '';
  if (('url' in request) && (typeof request.url === 'string')) {
    upgradePath = request.url;
  }
  if (upgradePath === '/irc/ws') {
    if (authorizeWebSocket(request)) {
      if ((nodeEnv === 'development') || (nodeDebugLog)) {
        customLog(request, 'websocket-connection');
      }
      wsServer.handleUpgrade(request, socket, head, function (socket) {
        wsServer.emit('connection', socket, request);
      });
    } else {
      customLog(request, 'websocket-auth-fail');
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
    }
  } else {
    customLog(request, 'websocket-path-not-found');
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();
  }
};

module.exports = {
  wsServer: wsServer,
  wsOnUpgrade: wsOnUpgrade
};
