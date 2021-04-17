
(function() {
  const fs = require('fs');
  const path = require('path');

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
    } else {
      //console.log(logEntry);
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
    setRawMessageLogEnabled: setRawMessageLogEnabled
  };
})();
