(function() {
  // size in lines of text
  const cacheSize = 100;
  var cacheInPointer = 0;
  var cacheArray = [];
  for (let i=0; i< cacheSize; i++) {
    cacheArray.push(null);
  }

  const eraseCache = function() {
    // console.log('Cache Erased');
    cacheInPointer = 0;
    cacheArray = [];
    for (let i=0; i< cacheSize; i++) {
      cacheArray.push(null);
    }
  };

  const addMessage = function(message) {
    if (Buffer.isBuffer(message)) {
      cacheArray[cacheInPointer] = Buffer.from(message);
    } else if (typeof message === 'string') {
      cacheArray[cacheInPointer] = Buffer.from(message, 'utf8');
    }
    cacheInPointer++;
    if (cacheInPointer >= cacheSize) cacheInPointer = 0;
  };

  const allMessages = function() {
    outArray = [];
    let cacheOutPointer = cacheInPointer;
    for (let i=0; i<cacheSize; i++) {
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

  const cacheInfo = function() {
    let size = 0;
    let lines = 0;
    if (cacheArray.length > 0) {
      for (let i=0; i<cacheArray.length; i++) {
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
