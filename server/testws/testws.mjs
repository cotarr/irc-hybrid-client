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
import express from 'express';

export const testWsRouter = express.Router();

// Custom case for use with ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testFolder = path.join(__dirname, 'html/');

const testWebsocketHtml = fs.readFileSync(testFolder + 'test-websocket.html', 'utf8');

// it is necessary to insert csrfToken to be accepted by the /irc/wsauth route.
testWsRouter.get('/test-websocket.html', function (req, res, next) {
  if (req.session && Object.hasOwn(req.session, 'csrfToken')) {
    res.send(testWebsocketHtml.replace('{{csrfToken}}', req.session.csrfToken));
  } else {
    res.send(testWebsocketHtml.replace('{{csrfToken}}', ''));
  }
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
