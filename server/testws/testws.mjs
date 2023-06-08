// --------------------------------------------------------------------
// This module is a simple web server for 3 files used for testing
// of websocket connecting authorization.
//
//    test-websocket.html
//    test-websocket.js
//    test-websocket.css
//
// --------------------------------------------------------------------
'use strict';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csrf from '@dr.pogodin/csurf';
import express from 'express';

const csrfProtection = csrf({ cookie: false });
export const testWsRouter = express.Router();

// Custom case for use with ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testFolder = path.join(__dirname, 'html/');

const testWebsocketHtml = fs.readFileSync(testFolder + 'test-websocket.html', 'utf8');

// it is necessary to insert csrfToken to be accepted by the /irc/wsauth route.
testWsRouter.get('/test-websocket.html', csrfProtection, function (req, res, next) {
  res.send(testWebsocketHtml.replace('{{csrfToken}}', req.csrfToken()));
});

testWsRouter.get('/test-websocket.js', function (req, res, next) {
  res.sendFile(testFolder + 'test-websocket.js', function (err) {
    if (err) {
      next(err);
    }
  });
});

testWsRouter.get('/test-websocket.css', function (req, res, next) {
  res.sendFile(testFolder + 'test-websocket.css', function (err) {
    if (err) {
      next(err);
    }
  });
});
