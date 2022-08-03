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
//       IRC Server Message Cache, used to refresh web client contents
//
// This contains an array of NodeJs Buffer objects having UTF-8 encoded contents
//
// -----------------------------------------------------------------------------
//
// Note: This is only intended to provide screen refresh during periods of
// mobile phone screen lock. The size is limited. It is not intended to
// be a long term off-line cache or logger.
//
// -----------------------------------------------------------------------------
(function () {
  'use strict';

  const path = require('path');
  const fs = require('fs');

  const credentials = JSON.parse(fs.readFileSync('./credentials.json', 'utf8'));

  // size in lines of text
  const cacheSize = 100;
  let cacheInPointer = 0;
  let cacheArray = [];
  for (let i = 0; i < cacheSize; i++) {
    cacheArray.push(null);
  }

  const eraseCache = function () {
    // console.log('Cache Erased');
    cacheInPointer = 0;
    cacheArray = [];
    for (let i = 0; i < cacheSize; i++) {
      cacheArray.push(null);
    }
  };

  const addMessage = function (message) {
    if (Buffer.isBuffer(message)) {
      cacheArray[cacheInPointer] = Buffer.from(message);
    } else if (typeof message === 'string') {
      cacheArray[cacheInPointer] = Buffer.from(message, 'utf8');
    }
    cacheInPointer++;
    if (cacheInPointer >= cacheSize) cacheInPointer = 0;
  };

  const allMessages = function () {
    const outArray = [];
    let cacheOutPointer = cacheInPointer;
    for (let i = 0; i < cacheSize; i++) {
      if ((cacheArray[cacheOutPointer]) && (cacheArray[cacheOutPointer].length > 0)) {
        // Option 1 to send array of utf8 encoded Buffer objects
        outArray.push(cacheArray[cacheOutPointer]);
        // Option 2 to send array of utf8 strings
        // outArray.push(cacheArray[cacheOutPointer].toString('utf8'));
      }
      cacheOutPointer++;
      if (cacheOutPointer >= cacheSize) cacheOutPointer = 0;
    }
    return outArray;
  };

  const cacheInfo = function () {
    let size = 0;
    let lines = 0;
    if (cacheArray.length > 0) {
      for (let i = 0; i < cacheArray.length; i++) {
        if ((cacheArray[i]) && (cacheArray[i].length > 0)) {
          lines++;
          size += cacheArray[i].length;
        }
      }
    }
    const info = {};
    info.sizeCache = cacheSize;
    info.sizeArray = cacheArray.length;
    info.inPointer = cacheInPointer;
    info.usedLines = lines;
    info.sizeInBytes = size;
    return info;
  };

  // ---------------------------------------------------------
  // Optional Code Section
  //
  // Enabled by credentials.persistIrcMessageCache === true
  //
  // In this section of the code, functionality has been added
  // to automatically save and restore the IRC message cache
  // across web server restarts.
  //
  // File format
  //
  // {
  //   "timestamp":1659402194,
  //   "hasBeenUsed": false,
  //   "cacheInPointer": 44,
  //   "cacheArray": [
  //     "UTF-8 String",
  //     "UTF-8 String",
  //        ...
  //     "UTF-8 String",
  //     null,
  //     null,
  //        ...
  //     null
  //   ]
  // }
  // ---------------------------------------------------------

  // Note: The log folder is created automatically with
  // write permission in the alternate module server/irc/irc-client-log.js
  const cacheFilename = path.join(__dirname, '../../logs/savedMessageCache.json');
  // Cache file must be used within 5 minutes.
  const cacheReloadWindowSeconds = 300;

  // ----------------------------
  // Part 1 - Save on Shutdown
  // ----------------------------

  //
  // terminalSignalHandler is called after receiving Unix SIGINT or SIGTERM
  // Cache data is converted from Array of Buffer to
  // an Array of type utf8 String and saved as JSON encoded Object to a file.
  // After file I/O is complete, callback exits program with status 0
  //
  const terminateSignalHandler = function (signal) {
    const now = new Date();
    // timestamp in seconds
    const timestamp = parseInt(now.getTime() / 1000);

    const stringArray = [];
    for (let i = 0; i < cacheSize; i++) {
      if (cacheArray[i] == null) {
        stringArray.push(null);
      } else {
        stringArray.push(cacheArray[i].toString('utf8'));
      }
    }
    const encodedCache = JSON.stringify(
      {
        timestamp: timestamp,
        hasBeenUsed: false,
        cacheInPointer: cacheInPointer,
        cacheArray: stringArray
      }
    );
    // Asynchronous File I/O
    fs.writeFile(
      cacheFilename,
      encodedCache,
      {
        encoding: 'utf8',
        mode: 0o600,
        flag: 'w'
      },
      function (err) {
        if (err) {
          console.log('\nReceived ' + signal + ' ' + now.toISOString());
          console.log('Error writing message cache. Server exit(1)');
          console.error(err);
          process.exit(1);
        } else {
          console.log('\nReceived ' + signal + ' ' + now.toISOString());
          console.log('Message cache written. Server exit(0)');
          process.exit(0);
        }
      }
    );
  }; // terminateSignalHandler()

  //
  // This event handler will listen for Unix operating system SIGINT and SIGTERM signals.
  // Upon receiving SIGINT or SIGTERM initiate function to asynchronously.
  // write the message cache to a file.
  // The program will exit with status 0 if the file is successfully saved.
  //
  let acceptSignalsFlag = true;
  if (credentials.persistIrcMessageCache) {
    process.on('SIGINT', function (signal) {
      if (acceptSignalsFlag) {
        acceptSignalsFlag = false;
        terminateSignalHandler(signal);
      }
    });
    process.on('SIGTERM', function (signal) {
      if (acceptSignalsFlag) {
        acceptSignalsFlag = false;
        terminateSignalHandler(signal);
      }
    });

    // ----------------------------
    // Part 2 - Restore on restart
    // ----------------------------

    //
    // This function runs automatically on program start.
    //
    // If a file containing the previous message cache exists, then
    // it will asynchronously read the file, import the message cache,
    // restore cache pointer, then remove the data from the file.
    // Data is converted from Array of type utf-8 String to Array of type Buffer.
    //
    // For the case where the file does not exist, or has already been loaded,
    // or has an expired timestamp, the message cache will default to
    // an empty array without throwing any errors.
    //

    // The following runs at program load
    (function () {
      const now = new Date();
      // timestamp in seconds
      const timeNow = parseInt(now.getTime() / 1000);
      fs.readFile(
        cacheFilename,
        {
          encoding: 'utf8'
        },
        function (err, data) {
          if (!err) {
            let decoded = null;
            try {
              decoded = JSON.parse(data);
            } catch (error) {
              console.log('Error decoding previous message cache JSON format');
              console.error(error);
              process.exit(1);
            }
            if ((decoded) && (!decoded.hasBeenUsed)) {
              if (timeNow - decoded.timestamp < cacheReloadWindowSeconds) {
                if (
                  ('cacheInPointer' in decoded) &&
                  ('cacheArray' in decoded) &&
                  (!(cacheInPointer == null)) &&
                  (Array.isArray(decoded.cacheArray)) &&
                  (decoded.cacheArray.length === cacheSize)) {
                  cacheInPointer = decoded.cacheInPointer;
                  const tempCacheArray = [];
                  for (let i = 0; i < cacheSize; i++) {
                    if (decoded.cacheArray[i] == null) {
                      tempCacheArray.push(null);
                    } else {
                      // console.log(i, decoded.cacheArray[i]);
                      tempCacheArray.push(Buffer.from(decoded.cacheArray[i], 'utf8'));
                    }
                  }
                  cacheArray = tempCacheArray;
                  console.log('Message cache loaded from file');
                }
              } else {
                console.log('Message cache expired, not reloaded.');
              }
              const encodedCache = JSON.stringify(
                {
                  timestamp: timeNow,
                  hasBeenUsed: true,
                  cacheInPointer: null,
                  cacheArray: null
                }
              );
              fs.writeFile(
                cacheFilename,
                encodedCache,
                {
                  encoding: 'utf8',
                  mode: 0o600,
                  flag: 'w'
                },
                function (err) {
                  if (err) {
                    console.log(err);
                    process.exit(1);
                  }
                }
              );
            }
          }
        }
      );
    })();
  } // if (credentials.persistIrcMessageCache)

  module.exports = {
    eraseCache: eraseCache,
    addMessage: addMessage,
    allMessages: allMessages,
    cacheInfo: cacheInfo
  };
})();
