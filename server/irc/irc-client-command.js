(function() {
  // const ircWrite = require('./irc-client-write');
  // const ircLog = require('./irc-client-log');

  var ircMessageCache = require('./irc-client-cache');
  var vars = require('./irc-client-vars');

  // tellBrowserToRequestState = function() {
  //   global.sendToBrowser('UPDATE\r\n');
  // };

  //-----------------------------------------------------------------
  //
  //  B R O W S E R   M E S S A G E   C O M M A N D   P A R S E R
  //
  //
  // Single message line from web browser client parsed for command actions
  //
  // Return:   {
  //               error: true,
  //               message: 'an error occurred'
  //           }
  //
  //  web-broswer --> web server --> [THIS PARSER] --> irc-server
  //-----------------------------------------------------------------
  const parseBrowserMessageForCommand = function (message) {
    // console.log('Browser --> backend message: ' + message);

    let i = 0;
    let end = message.length - 1;
    // parsed sub-strings
    let outboundCommand = '';
    let outboundCommandRest = '';
    let outboundArg1 = '';
    let outboundArg1Rest = '';

    while ((message.charAt(i) !== ' ') && (i <= end)) {
      if ((message.charAt(i) !== '\r') && (message.charAt(i) !== '\n')) {
        outboundCommand += message.charAt(i);
      }
      i++;
    }
    outboundCommand = outboundCommand.toUpperCase();
    while ((message.charAt(i) === ' ') && (i <= end)) {
      i++;
    }
    // Note: outboundCommandRest may start with leading colon ':'
    while (i <= end) {
      if ((message.charAt(i) !== '\r') && (message.charAt(i) !== '\n')) {
        outboundCommandRest += message.charAt(i);
      }
      i++;
    }
    if (outboundCommandRest.length > 0) {
      i = 0;
      end = outboundCommandRest.length - 1;
      while ((outboundCommandRest.charAt(i) !== ' ') && (i <= end)) {
        outboundArg1 += outboundCommandRest.charAt(i);
        i++;
      }
      while ((outboundCommandRest.charAt(i) === ' ') && (i <= end)) {
        i++;
      }
      // Note: outboundArg1Rest may start with leading colon ':'
      while (i <= end) {
        outboundArg1Rest += outboundCommandRest.charAt(i);
        i++;
      }
    }
    // console.log('outboundCommand ' + outboundCommand);
    // console.log('outboundCommandRest ' + outboundCommandRest);
    // console.log('outboundArg1 ' + outboundArg1);
    // console.log('outboundArg1Rest ' + outboundArg1Rest);

    switch (outboundCommand) {
      case 'JOIN':
        if (true) {
          let index = vars.ircState.channels.indexOf(outboundArg1.toLowerCase());
          if ((index >= 0) && (vars.ircState.channelStates[index].joined)) {
            // case of already in this channel
            return {
              error: true,
              message: 'Error, can not join a channel you are already in.'
            };
          }
          if (outboundArg1.length < 2) {
            return {
              error: true,
              message: 'Channel name too short'
            };
          }
          // Clear names list, a new one will arrive after join
          if (index >= 0) {
            console.log('JOIN clearing nicklist');
            vars.ircState.channelStates[index].names = [];
          }
        }
        return {error: false};
        break;
      case 'NAMES':
        if (true) {
          let index = vars.ircState.channels.indexOf(outboundArg1.toLowerCase());
          // Clear names list, a new one will arrive after join
          if (index >= 0) {
            vars.ircState.channelStates[index].names = [];
          }
        }
        return {error: false};
        break;
      //
      case 'NOTICE':
        if (true) {
          //
          // case of channel notice
          //
          let index = vars.ircState.channels.indexOf(outboundArg1.toLowerCase());
          if ((index >= 0) && (vars.ircState.channelStates[index].joined)) {
            let fromMessage = vars.timestamp() + ' ' +
            ':' + vars.ircState.nickName + '!*@* ' + message;
            ircMessageCache.addMessage(fromMessage);
            global.sendToBrowser(fromMessage + '\r\n');
            return {error: false};
          }
        }
        //
        // case of private notice
        //
        if (true) {
          let firstChar = outboundArg1.charAt(0);
          if (vars.channelPrefixChars.indexOf(firstChar) < 0) {
            let fromMessage = vars.timestamp() + ' ' +
              ':' + vars.ircState.nickName + '!*@* ' + message;
            ircMessageCache.addMessage(fromMessage);
            global.sendToBrowser(fromMessage + '\r\n');
            return {error: false};
          }
          return {
            error: true,
            message: 'Error parsing NOTICE message before send to IRC server.'
          };
        }
        break;
      //
      case 'PRIVMSG':
        if (true) {
          //
          // case of channel message
          //
          let index = vars.ircState.channels.indexOf(outboundArg1.toLowerCase());
          if ((index >= 0) && (vars.ircState.channelStates[index].joined)) {
            let fromMessage = vars.timestamp() + ' ' +
            ':' + vars.ircState.nickName + '!*@* ' + message;
            ircMessageCache.addMessage(fromMessage);
            global.sendToBrowser(fromMessage + '\r\n');
            return {error: false};
          }
        }
        //
        // case of private message
        //
        if (true) {
          let firstChar = outboundArg1.charAt(0);
          if (vars.channelPrefixChars.indexOf(firstChar) < 0) {
            let fromMessage = vars.timestamp() + ' ' +
              ':' + vars.ircState.nickName + '!*@* ' + message;
            ircMessageCache.addMessage(fromMessage);
            global.sendToBrowser(fromMessage + '\r\n');
            return {error: false};
          }
          return {
            error: true,
            message: 'Error parsing PRIVMSG message before send to IRC server.'
          };
        }
        break;
      //
      default:
    }

    // by default messages are valid
    return {error: false};
  }; // parseBrowserMessageForCommand

  module.exports = {
    parseBrowserMessageForCommand: parseBrowserMessageForCommand
  };
})();
