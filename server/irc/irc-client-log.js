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
//            Log functions
//
// -----------------------------------------------------------------------------

(function () {
  'use strict';

  const path = require('path');
  const fs = require('fs');
  const rotatingFileStream = require('rotating-file-stream');

  const credentials = JSON.parse(fs.readFileSync('./credentials.json', 'utf8'));

  const nodeEnv = process.env.NODE_ENV || 'development';
  const nodeDebugLog = process.env.NODE_DEBUG_LOG || 0;

  const logFolder = path.join(__dirname, '../../logs');
  const accessLogFilename = path.join(__dirname, '../../logs/access.log');
  const ircLogFilename = path.join(__dirname, '../../logs/irc.log');

  const accessLogOnlyErrors = credentials.accessLogOnlyErrors || false;
  // logRotationInterval type string, example: '5m', '12h', '7d'
  const logRotationInterval = credentials.logRotationInterval || '';

  //
  // If the logs/ folder does not exist, create it, abort on error
  //
  if ((nodeEnv === 'production') && (!nodeDebugLog)) {
    try {
      if (!fs.existsSync(logFolder)) {
        console.log('Log folder not found, creating folder...');
        fs.mkdirSync(logFolder);
        fs.chmodSync(logFolder, 0o700);
      }
    } catch (err) {
      console.log('Unable to create log folder');
      console.error(err);
      process.exit(1);
    }
  }

  const logConfig = {};

  // Format and options apply to the 'morgan' npm package, implemented in web-server.js
  logConfig.format = ':date[iso] :remote-addr :status :method :http-version :req[host]:url';
  logConfig.options = {};
  // for start up message
  let logStream = '(console)';
  if ((nodeEnv !== 'development') && (!nodeDebugLog)) {
    // for start up message
    logStream = accessLogFilename;
    // Function to write log entries to file as option property
    if (logRotationInterval.length > 1) {
      // Function to write log entries to file as option property
      logConfig.options.stream = rotatingFileStream.createStream(accessLogFilename, {
        encoding: 'utf8',
        mode: 0o644,
        interval: logRotationInterval,
        rotate: 5,
        initialRotation: false
      });
      logStream += ' (Rotate: ' + logRotationInterval + ')';
    } else {
      // Else, log filename rotation disabled, use native fs module
      logConfig.options.stream = fs.createWriteStream(accessLogFilename, {
        encoding: 'utf8',
        mode: 0o644,
        flags: 'a'
      });
    }
    // HTTP access log filter, used by morgan in web-server.js
    if (accessLogOnlyErrors) {
      logStream += ' (Errors Only)';
      logConfig.options.skip = function (req, res) {
        return (res.statusCode < 400);
      };
    }
  }
  // This shows at server start up to console out
  console.log('HTTP Access Log: ' + logStream);
  //
  // This method is primarily intended to allow
  // web-socket connection events to be logged
  // in the same access.log has HTTP requests.
  // Web socket connections are managed in ws-server.js
  //
  const writeAccessLog = function (logString) {
    //
    // build log text string
    //
    const now = new Date();
    let logEntry = now.toISOString();
    logEntry += ' ' + logString;
    //
    // Append string to file
    //
    if ((nodeEnv === 'development') || (nodeDebugLog)) {
      console.log(logEntry);
    } else {
      logConfig.options.stream.write(logEntry + '\n');
    }
  };

  //
  // The raw message log includes text messages sent from
  // the IRC server to the IRC client (web server).
  // For context, some outgoing messages and user requests
  // are also logged.
  //
  let rawMessageLogEnabled = false;

  let ircLogStream = null;
  if (logRotationInterval.length > 1) {
    ircLogStream = rotatingFileStream.createStream(ircLogFilename, {
      encoding: 'utf8',
      mode: 0o644,
      interval: logRotationInterval,
      rotate: 5,
      initialRotation: false
    });
  } else {
    ircLogStream = fs.createWriteStream(ircLogFilename, {
      encoding: 'utf8',
      mode: 0o644,
      flags: 'a'
    });
  }

  const writeIrcLog = function (inBuffer) {
    //
    // build log text string
    //
    const now = new Date();
    let logEntry = now.toISOString();
    // convert buffer to utf8 string
    logEntry += ' ' + inBuffer.toString('utf8');
    //
    // Append string to file
    //
    if ((nodeEnv === 'development') || (nodeDebugLog)) {
      console.log(logEntry);
    } else {
      if ((ircLogStream) && (rawMessageLogEnabled)) {
        ircLogStream.write(logEntry + '\n');
      };
    }
  };

  const setRawMessageLogEnabled = function (flag) {
    if (typeof flag === 'boolean') {
      rawMessageLogEnabled = flag;
    }
  };
  const getRawMessageLogEnabled = function () {
    return rawMessageLogEnabled;
  };
  module.exports = {
    logConfig: logConfig,
    writeAccessLog: writeAccessLog,
    writeIrcLog: writeIrcLog,
    setRawMessageLogEnabled: setRawMessageLogEnabled,
    getRawMessageLogEnabled: getRawMessageLogEnabled,
    accessLogFilename: accessLogFilename,
    ircLogFilename: ircLogFilename,
    logRotationInterval: logRotationInterval
  };
})();
