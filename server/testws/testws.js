// --------------------------------------------------------------------
// This module is a simple web server for 3 files used for testing
// of websocket connectino authorization.
//
//    test-websocket.html
//    test-websocket.js
//    test-websocket.css
//
// --------------------------------------------------------------------
(function () {
  'use strict';

  const fs = require('fs');
  const path = require('path');
  const csrf = require('csurf');
  const csrfProtection = csrf({ cookie: false });
  const express = require('express');
  const router = express.Router();

  const testFolder = path.join(__dirname, 'html/');

  const testWebsocketHtml = fs.readFileSync(testFolder + 'test-websocket.html', 'utf8');

  // it is necessary to insert csrfToken to be accepted by the /irc/wsauth route.
  router.get('/test-websocket.html', csrfProtection, function (req, res, next) {
    res.send(testWebsocketHtml.replace('{{csrfToken}}', req.csrfToken()));
  });

  router.get('/test-websocket.js', function (req, res, next) {
    res.sendFile(testFolder + 'test-websocket.js', function (err) {
      if (err) {
        next(err);
      }
    });
  });

  router.get('/test-websocket.css', function (req, res, next) {
    res.sendFile(testFolder + 'test-websocket.css', function (err) {
      if (err) {
        next(err);
      }
    });
  });

  module.exports = router;
})();
