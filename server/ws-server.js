

'use strict';

const path = require('path');
const ws = require('ws');
const url = require('url');
const isValidUTF8 = require('utf-8-validate');

const authorizeWebSocket = require('./middlewares/ws-authorize').authorizeWebSocket;
const customLog = require('./middlewares/ws-authorize').customLog;

// ----------------------------------------
// Set up a headless websocket server
// ----------------------------------------
const wsServer = new ws.Server({noServer: true});

// -------------------------------------------------
// Message handler (browser --> web server)
//
// In this sapplication, the websocket use is limited
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

// ------------------------------------------------
// Monitored by browser to detect socket disconnect
// ------------------------------------------------
setInterval(function() {
  global.sendToBrowser('HEARTBEAT\n');
}, 10000);

// ----------------------------------------
// HTTP --> WebSocket Upgrade Handler
//
// 1) validate route
// 2) validate cookie on upgrade request
// 3) Connect the webscket
// ----------------------------------------
const wsOnUpgrade = function (request, socket, head) {
  let now = new Date();
  let timeString = now.toISOString() + ' ';
  const pathname = url.parse(request.url).pathname;
  if (pathname === '/irc/ws') {
    if (authorizeWebSocket(request)) {
      customLog(request, 'websocket-connection');
      wsServer.handleUpgrade(request, socket, head, function (socket) {
        wsServer.emit('connection', socket, request);
      });
    } else {
      customLog(request, 'websocket-auth-fail');
      socket.destroy();
    }
  } else {
    customLog(request, 'websocket-path-not-found');
    socket.destroy();
  }
};

module.exports = {
  wsServer: wsServer,
  wsOnUpgrade: wsOnUpgrade
};
