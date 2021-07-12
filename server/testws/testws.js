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

  const path = require('path');
  const express = require('express');
  const router = express.Router();

  const testFolder = path.join(__dirname, 'html/');

  router.get('/test-websocket.html', function (req, res, next) {
    res.sendFile(testFolder + 'test-websocket.html', function (err) {
      if (err) {
        next(err);
      }
    });
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
