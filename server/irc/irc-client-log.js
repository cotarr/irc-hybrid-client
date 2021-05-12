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

(function() {
  'use strict';

  const path = require('path');
  const fs = require('fs');

  const logFolder = path.join(__dirname, '../../logs');

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

  const accessLogFilename = path.join(__dirname, '../../logs/access.log');
  const ircLogFilename = path.join(__dirname, '../../logs/irc.log');

  var nodeEnv = process.env.NODE_ENV || 'development';

  const writeAccessLog = function (logString) {
    //
    // build log text string
    //
    let now = new Date();
    let logEntry = now.toISOString();
    logEntry += ' ' + logString;
    //
    // Append string to file
    //
    if (nodeEnv === 'production') {
      fs.writeFile(
        accessLogFilename,
        logEntry + '\n',
        {
          encoding: 'utf8',
          mode: 0o644,
          flag: 'a'
        },
        function(err) {
          if (err) {
            // in case disk full, kill server
            throw new Error('Error writing ' + accessLogFilename);
          }
        }
      );
    } else {
      console.log(logEntry);
    }
  };

  var rawMessageLogEnabled = false;

  const writeIrcLog = function (inBuffer) {
    //
    // build log text string
    //
    let now = new Date();
    let logEntry = now.toISOString();
    // convert buffer to utf8 string
    logEntry += ' ' + inBuffer.toString('utf8');
    //
    // Append string to file
    //
    if (nodeEnv === 'production') {
      if (rawMessageLogEnabled) {
        fs.writeFile(
          ircLogFilename,
          logEntry + '\n',
          {
            encoding: 'utf8',
            mode: 0o644,
            flag: 'a'
          },
          function(err) {
            if (err) {
              // in case disk full, kill server
              throw new Error('Error writing ' + ircLogFilename);
            }
          }
        );
      };
    } else {
      console.log(logEntry);
    }
  };

  const setRawMessageLogEnabled = function (flag) {
    if (typeof flag === 'boolean') {
      rawMessageLogEnabled = flag;
    }
  };
  module.exports = {
    writeAccessLog: writeAccessLog,
    writeIrcLog: writeIrcLog,
    setRawMessageLogEnabled: setRawMessageLogEnabled,
    accessLogFilename: accessLogFilename,
    ircLogFilename: ircLogFilename
  };
})();
