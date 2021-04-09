
(function() {
  const fs = require('fs');
  const path = require('path');
  const ircLogFilename = path.join(__dirname, '../../logs/irc.log');

  const writeIrcLog = function (logString) {
    //
    // build log text string
    //
    let now = new Date();
    let logEntry = now.toISOString();
    logEntry += ' ' + logString;
    //
    // Append string to file
    //
    // if (nodeEnv === 'production') {
    if (true) {
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
    } else {
      // console.log(logEntry);
    }
  };
  module.exports = {
    writeIrcLog: writeIrcLog
  };
})();
