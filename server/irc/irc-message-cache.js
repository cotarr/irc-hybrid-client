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
    cacheArray[cacheInPointer] = message.toString();
    cacheInPointer++;
    if (cacheInPointer >= cacheSize) cacheInPointer = 0;
  };

  const allMessages = function() {
    outArray = [];
    let cacheOutPointer = cacheInPointer;
    for (let i=0; i<cacheSize; i++) {
      if ((cacheArray[cacheOutPointer]) && (cacheArray[cacheOutPointer].length > 0)) {
        outArray.push(cacheArray[cacheOutPointer]);
      }
      cacheOutPointer++;
      if (cacheOutPointer >= cacheSize) cacheOutPointer = 0;
    }
    return outArray;
  };

  module.exports = {
    eraseCache: eraseCache,
    addMessage: addMessage,
    allMessages: allMessages
  };
})();
