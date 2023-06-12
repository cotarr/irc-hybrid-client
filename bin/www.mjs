#!/usr/bin/env node

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
//        NodeJs socket server for web server and websocket server
//
// -----------------------------------------------------------------------------
'use strict';
// ------------------------------------------------------------------------
// Two servers available on same port (express web server, websocket server)

import { app } from '../server/web-server.mjs';
import { wsOnUpgrade } from '../server/ws-server.mjs';
// ------------------------------------------------------------------------

// node server modules
import http from 'http';
import https from 'https';
import fs from 'fs';

import config from '../server/config/index.mjs';

const nodeEnv = process.env.NODE_ENV || 'development';

let server = null;

console.log('Environment: NODE_ENV=' + nodeEnv);
if (config.server.tls) {
  console.log('Starting "https" server (TLS encrypted)');
  const options = {
    key: fs.readFileSync(config.server.serverTlsKey),
    cert: fs.readFileSync(config.server.serverTlsCert),
    minVersion: 'TLSv1.2',
    handshakeTimeout: 5000
  };
  server = https.createServer(options, app);
} else {
  console.log('Starting "http" server (non-encrypted)');
  server = http.createServer(app);
}

const port = config.server.port;

// See TLS/SSL handshakeTimeout above
//
// Timeout to receive entire client request
server.requestTimeout = 5000;

// Socket idle timeout
server.timeout = 5000;

// Time for additional requests
server.keepAliveTimeout = 5000;

server.listen(port);

server.on('listening', function () {
  const address = server.address();
  console.log('Web server listening interface: "' + address.address + '" port: ' + address.port +
    ' family: ' + address.family);
  const timestamp = new Date();
  console.log('Timestamp: ' + timestamp.toISOString());
  // intended for use in logrotate, or in restart bash script
  try {
    const pidFilename = config.server.pidFilename;
    if ((pidFilename) && (pidFilename.length > 0)) {
      fs.writeFileSync(pidFilename, '' + process.pid + '\n');
    }
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
});

// web socket upgrade handler
server.on('upgrade', wsOnUpgrade);

server.on('error', function (error) {
  if (error.syscall !== 'listen') {
    throw error;
  }
  if (error.code === 'EACCES') {
    console.log('Port requires elevated privileges');
    process.exit(1);
  }
  if (error.code === 'EADDRINUSE') {
    console.log('Address or port in use');
    process.exit(1);
  }
  throw error;
});
