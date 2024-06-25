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
'use strict';

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createStream } from 'rotating-file-stream';

import config from '../config/index.mjs';

const nodeEnv = process.env.NODE_ENV || 'development';
const nodeDebugLog = process.env.NODE_DEBUG_LOG || 0;

// Custom case for use with ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logFolder = path.join(__dirname, '../../logs');

export const accessLogFilename = path.join(__dirname, '../../logs/access.log');
export const ircLogFilename = path.join(__dirname, '../../logs/irc.log');

// logRotationInterval type string, example: '5m', '12h', '7d'
export const logRotationInterval = config.server.logRotateInterval || '';
// logRotationSize type string, example '1K', '10M'
export const logRotationSize = config.server.logRotateSize || '';

const accessLogOnlyErrors = config.server.accessLogOnlyErrors || false;

//
// If the logs/ folder does not exist, create it, abort on error
//
if ((nodeEnv === 'production') && (!nodeDebugLog)) {
  try {
    if (!fs.existsSync(logFolder)) {
      console.log('Log folder not found, creating folder: ' + logFolder);
      fs.mkdirSync(logFolder);
      fs.chmodSync(logFolder, 0o700);
    }
  } catch (err) {
    console.log('Unable to create log folder');
    console.error(err);
    process.exit(1);
  }
}

// Format and options apply to the 'morgan' npm package, implemented in web-server.js
export const accessLogFormat =
  ':date[iso] :remote-addr :status :method :http-version :req[host]:url';

export const accessLogOptions = {};
// for start up message
let logStream = '(console)';
let accessLogStream = null;
if ((nodeEnv !== 'development') && (!nodeDebugLog)) {
  // for start up message
  logStream = accessLogFilename;
  // Function to write log entries to file as option property
  if (((logRotationInterval) && (logRotationInterval.length > 1)) ||
    ((logRotationSize) && (logRotationSize.length > 1))) {
    const rotateOptions = {
      encoding: 'utf8',
      mode: 0o600,
      rotate: 5
    };
    logStream += ' (Rotate';
    // Rotation by time interval
    if ((logRotationInterval) && (logRotationInterval.length > 1)) {
      rotateOptions.interval = logRotationInterval;
      logStream += ' interval:' + logRotationInterval;
    }
    // Rotation by log file size
    if ((logRotationSize) && (logRotationSize.length > 1)) {
      rotateOptions.size = logRotationSize;
      logStream += ' size:' + logRotationSize;
    }
    logStream += ')';
    accessLogStream = createStream(accessLogFilename, rotateOptions);
    accessLogOptions.stream = accessLogStream;
  } else {
    // Else, log filename rotation disabled, use native fs module
    accessLogStream = fs.createWriteStream(accessLogFilename, {
      encoding: 'utf8',
      mode: 0o600,
      flags: 'a'
    });
    accessLogOptions.stream = accessLogStream;
  }
  // HTTP access log filter, used by morgan in web-server.js
  if (accessLogOnlyErrors) {
    logStream += ' (Errors Only)';
    accessLogOptions.skip = function (req, res) {
      return (res.statusCode < 400);
    };
  }
} // if nodeEng === ...

// This shows at server start up to console out
console.log('HTTP Access Log: ' + logStream);

//
// This method is primarily intended to allow
// web-socket connection events to be logged
// in the same access.log has HTTP requests.
// Web socket connections are managed in ws-server.js
//
export const writeAccessLog = function (logString) {
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
    accessLogStream.write(logEntry + '\n');
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
if ((nodeEnv !== 'development') && (!nodeDebugLog)) {
  if (((logRotationInterval) && (logRotationInterval.length > 1)) ||
    ((logRotationSize) && (logRotationSize.length > 1))) {
    const ircRotateOptions = {
      encoding: 'utf8',
      mode: 0o600,
      rotate: 5
    };
    if ((logRotationInterval) && (logRotationInterval.length > 1)) {
      ircRotateOptions.interval = logRotationInterval;
    }
    // Rotation by log file size
    if ((logRotationSize) && (logRotationSize.length > 1)) {
      ircRotateOptions.size = logRotationSize;
    }
    ircLogStream = createStream(ircLogFilename, ircRotateOptions);
  } else {
    ircLogStream = fs.createWriteStream(ircLogFilename, {
      encoding: 'utf8',
      mode: 0o600,
      flags: 'a'
    });
  }
}

export const writeIrcLog = function (inBuffer) {
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

export const setRawMessageLogEnabled = function (flag) {
  if (typeof flag === 'boolean') {
    rawMessageLogEnabled = flag;
  }
};
export const getRawMessageLogEnabled = function () {
  return rawMessageLogEnabled;
};

export default {
  accessLogFormat,
  accessLogOptions,
  writeAccessLog,
  writeIrcLog,
  setRawMessageLogEnabled,
  getRawMessageLogEnabled,
  accessLogFilename,
  ircLogFilename,
  logRotationInterval,
  logRotationSize
};
