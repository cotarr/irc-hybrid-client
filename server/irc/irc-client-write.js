(function() {
  // ----------------------------------------------------
  // Write data to IRC server socket (Internal function)
  // Includes check of socket status
  //
  // Expect Buffer or utf8 encoded string.
  //
  // Send utf8 string to browser
  // Send Buffer encoded utf8 to IRC server socket
  // ----------------------------------------------------
  const isValidUTF8 = require('utf-8-validate');
  var vars = require('./irc-client-vars');

  writeSocket = function (socket, message) {
    if (message.length === 0) return;
    if ((socket) && (socket.writable)) {
      //
      // First, filter passwords, then send to browser and write log file
      // The filter only applies to log file and browser.
      // Messages to IRC server are not filtered.
      //
      let filterWords = [
        'OPER',
        'PASS',
        'NICKSERV',
        'NS',
        'CHANSERV',
        'CS'
      ];
      let filterCommand = message.toString().split(' ')[0].toUpperCase();
      let filtered = message.toString();
      if (filterWords.indexOf(filterCommand) >= 0) {
        if (!vars.ircState.ircTLSEnabled) {
          console.log('WARNING: possible password without TLC encryption to IRC server');
        }
        filtered = filterCommand + ' ***********';
      }
      if (message.split(' ')[0].toUpperCase() === 'JOIN') {
        if ((message.split(' ').length > 2) && (message.split(' ')[2].length > 0)) {
          filtered = 'JOIN ' + message.split(' ')[1] + ' ********';
        }
      }

      // Looking for: 'PRIVMSG NickServ :IDENTIFY <passowrd>'
      if (message.split(' ')[0].toUpperCase() === 'PRIVMSG') {
        if ((message.split(' ').length > 3) &&
          (message.split(' ')[1].toLowerCase() === 'nickserv') &&
          (message.split(' ')[2].toUpperCase() === ':IDENTIFY')) {
          filtered = 'PRIVMSG ' +
            message.split(' ')[1] + ' ' + message.split(' ')[2] + ' ********';
        }
      }
      global.sendToBrowser(vars.commandMsgPrefix + filtered + '\n');

      //
      // Second validate the string before writing to IRC server socket
      //
      let out = null;
      if (typeof message === 'string') {
        out = Buffer.from(message + '\r\n', 'utf8');
      }
      if (Buffer.isBuffer(message)) {
        out = Buffer.concat([out, Buffer.from('\r\n', 'utf8')]);
      }
      if (!isValidUTF8(out)) {
        out = null;
        console.log('_writeSocket() failed UTF-8 validation');
      }
      // RFC 2812 does not allow zero character
      if (out.includes(0)) {
        out = null;
        console.log('_writeSocket() failed zero byte validation');
      }
      // 512 btye maximum size from RFC 2812 Section 2.3 Messages
      // It is assumed here this means 8 bit types not multi-byte characters
      if (out.length > 512) {
        out = null;
        console.log('_writeSocket() send buffer exceeds 512 character limit.');
      }
      //
      // Third, send into socket to IRC server
      //
      if (out) {
        socket.write(Buffer.concat([out, Buffer.from('\r\n', 'utf8')]));
      }
    } else {
      // TODO should this disconnect?
      console.log('_writeSocket() server socket not writable');
    }
  }; // _writeSocket

  module.exports = {
    writeSocket: writeSocket
  };
})();
