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

  // size in lines of text
  const cacheSize = 100;
  var cacheInPointer = 0;
  var cacheArray = [];
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
    let outArray = [];
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
    info = {};
    info.sizeCache = cacheSize;
    info.sizeArray = cacheArray.length;
    info.inPointer = cacheInPointer;
    info.usedLines = lines;
    info.sizeInBytes = size;
    return info;
  };

  module.exports = {
    eraseCache: eraseCache,
    addMessage: addMessage,
    allMessages: allMessages,
    cacheInfo: cacheInfo
  };
})();
