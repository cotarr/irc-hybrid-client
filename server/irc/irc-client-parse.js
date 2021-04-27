(function() {
  const ircCtcp = require('./irc-client-ctcp');
  const ircWrite = require('./irc-client-write');
  const ircLog = require('./irc-client-log');

  var ircMessageCache = require('./irc-client-cache');
  var vars = require('./irc-client-vars');

  tellBrowserToRequestState = function() {
    global.sendToBrowser('UPDATE\r\n');
  };

  // ----------------------------------------------------------------
  // Internal function to parse one line of message from IRC server
  //
  // Input: Accepts a node.js UTF-8 encoded Buffer object
  //
  // Returns: jason object with prefix, command and params array
  // ----------------------------------------------------------------
  const _parseIrcMessage = function (messageBuffer) {
    // ----------------------------
    //  Internal functions
    // ----------------------------
    //
    // 1) Check if colon string
    //
    //   :prefix command param1 param2 .... :lastParam
    //  ===                                ===
    //
    function _isColonString (start, messageBuffer) {
      // ASCII 58 is colon character
      if (messageBuffer.readUInt8(start) === 58) {
        return {
          isColonStr: true,
          nextIndex: start + 1
        };
      } else {
        return {
          isColonStr: false,
          nextIndex: start
        };
      }
    } // _isColonString()
    //
    // 2) Command or param string, but not last param
    //
    // :prefix command param1 param2 .... :lastParam
    //         ======= ====== ======
    //
    function _extractMidString(start, end, messageBuffer) {
      let i = start;
      let outString = '';
      // ASCII 20 is space character
      while ((i <= end) && (messageBuffer.readUInt8(i) !== 32)) {
        i++;
      }
      if (i > start) {
        outString = messageBuffer.slice(start, i).toString('utf8');
      }
      if (outString.length === 0) outString = null;
      return {
        data: outString,
        nextIndex: i + 1
      };
    }; // _extractMidString()

    // 3) Last param string (start with :)
    //
    // :prefix command param1 param2 .... :lastParam
    //                                     =========
    //
    function _extractFinalString(start, end, messageBuffer) {
      let i = start;
      let outString = '';
      while (i <= end) {
        i++;
      }
      if (i > start) {
        outString = messageBuffer.slice(start, i).toString('utf8');
      }
      if (outString.length === 0) outString = null;
      return {
        data: outString,
        nextIndex: i + 1
      };
    }; // _extractFinalString()

    // nick!user@host.domain
    // nick!user@nn:nn:nn:nn: (ipv6)
    function _extractNickname(inText) {
      if (inText) {
        if ((inText.indexOf('!') >= 0 ) &&
          (inText.indexOf('@') >= 0) &&
          (inText.indexOf('!') < inText.indexOf('@'))) {
          let nick = inText.split('!')[0];
          return nick;
        } else {
          return null;
        }
      } else {
        return null;
      }
    } // _extractNickname()

    function _extractHostname(inText) {
      if (inText) {
        if ((inText.indexOf('!') >= 0 ) &&
          (inText.indexOf('@') >= 0) &&
          (inText.indexOf('!') < inText.indexOf('@'))) {
          let host = inText.split('!')[1];
          return host;
        } else {
          return null;
        }
      } else {
        return null;
      }
    } // _extractHostname()

    // ---------------------------------------------------------
    //                   Decode the line
    // --------------------------------------------------------
    // This accepts a Buffer as input with UTF8 encoded characters
    // Converts internal data to type string for processing
    //
    // Format:  [:prefix] command param1 [param2] .... [:lastParam]
    // --------------------------------------------------------
    //
    //  Line composed of 3 parts, prefix, command, params
    //
    let prefix = null;
    let command = null;
    let extNick = null;
    let extHost = null;
    let params = [];
    //
    // Parsing variables
    let end = messageBuffer.length - 1;
    let temp = {nextIndex: 0};

    // 1) Check if prefix exist, if exit parse value, return nextIndex
    temp = _isColonString(temp.nextIndex, messageBuffer);
    if (temp.isColonStr) {
      temp = _extractMidString(temp.nextIndex, end, messageBuffer);
      prefix = temp.data;
      extNick = _extractNickname(temp.data);
      extHost = _extractHostname(temp.data);
    }

    // 2) extract command string
    temp = _extractMidString(temp.nextIndex, end, messageBuffer);
    command = temp.data;

    // 3) Extract optional params, in loop, until all params extracted.
    let done = false;
    while (!done) {
      if (temp.nextIndex > end) {
        done = true;
      } else {
        temp = _isColonString(temp.nextIndex, messageBuffer);
        if (temp.isColonStr) {
          // case of colon string, this is last param
          temp = _extractFinalString(temp.nextIndex, end, messageBuffer);
          params.push(temp.data);
          done = true;
        } else {
          // else not colon string, must be middle param string
          temp = _extractMidString(temp.nextIndex, end, messageBuffer);
          if ((temp.data) && (temp.data.length > 0)) {
            params.push(temp.data);
          } else {
            // zero length must be done
            done = true;
          }
        }
      }
    }
    // console.log(prefix, command, JSON.stringify(params));
    return {
      prefix: prefix,
      nick: extNick,
      host: extHost,
      command: command,
      params: params
    };
  }; // _parseIrcMessage


  // -----------------------------------------
  // #Channel MODE changes to Op/Voice status
  //
  // Parse mode command from server
  // Search for matching users in the channel
  // Update the +@ in front of their name
  // -----------------------------------------
  const parseChannelModeChanges = function (socket, parsedMessage) {
    // console.log('parseChannelModeChanges ' + JSON.stringify(parsedMessage, null, 2));
    //
    // Example, up to 3 modes per RFC2812
    // "params": [
    //   "#channelname",
    //   "+oo-v",
    //   "nick1",
    //   "nick2",
    //   "user3"
    // ]
    //
    const selectorChars = '+-';
    const userModeChars = vars.channelUserModeChars; // 'qaohv'
    const modeChars = vars.nicknamePrefixChars; // '~&@%+'
    const modeQueue = [];
    const userQueue = [];
    let selector = '';
    if (vars.ircState.channels.length === 0) return;
    for (let i=0; i<vars.ircState.channels.length; i++) {
      if (parsedMessage.params[0].toLowerCase() === vars.ircState.channels[i]) {
        // index into vars.ircState.channels[]
        let chanIndex = i;
        let modeList = parsedMessage.params[1];
        if (modeList.length > 0) {
          for (let j=0; j<modeList.length; j++) {
            if (selectorChars.indexOf(modeList.charAt(j)) >= 0) {
              // selector is "+" or "-"
              selector = modeList.charAt(j);
            }
            if (userModeChars.indexOf(modeList.charAt(j)) >= 0) {
              modeQueue.push(selector + modeList.charAt(j));
            }
          }
        } // params[1].length
        if ((modeQueue.length > 0) && (modeQueue.length + 2 === parsedMessage.params.length)) {
          for (let j=0; j<modeQueue.length; j++) {
            userQueue.push(parsedMessage.params[j+2]);
          }
          let strippedNicks = [];
          for (let j=0; j<vars.ircState.channelStates[chanIndex].names.length; j++) {
            let tempNick = vars.ircState.channelStates[chanIndex].names[j];
            if (modeChars.indexOf(tempNick.charAt(0)) >= 0) {
              tempNick = tempNick.slice(1, tempNick.length);
            }
            strippedNicks.push(tempNick);
          }
          for (let j=0; j<modeQueue.length; j++) {
            let userIndex = strippedNicks.indexOf(userQueue[j]);
            let tempNick = strippedNicks[userIndex];
            if (modeQueue[j] === '+v') tempNick = '+' + tempNick;
            if (modeQueue[j] === '+h') tempNick = '%' + tempNick;
            if (modeQueue[j] === '+o') tempNick = '@' + tempNick;
            if (modeQueue[j] === '+a') tempNick = '&' + tempNick;
            if (modeQueue[j] === '+q') tempNick = '~' + tempNick;
            vars.ircState.channelStates[chanIndex].names[userIndex] = tempNick;
          }
          tellBrowserToRequestState();
        }
      }
    } // next i
  }; // parseChannelModeChanges()

  // -------------------------------------------
  // cycle through all channels and replace
  // the new nickname, preserving op character
  // -------------------------------------------
  function _exchangeNames(oldNick, newNick) {
    if (!newNick) return;
    if (newNick.length < 1) return;
    if (!oldNick) return;
    if (oldNick.length < 1) return;
    if (vars.ircState.channels.length === 0) return;

    // There should be no operator characters, but check and strip them if they are there
    let pureOldNick = oldNick;
    if (vars.nicknamePrefixChars.indexOf(pureOldNick.charAt(0)) >= 0) {
      pureOldNick = pureOldNick.slice(1, pureOldNick.length);
    }
    let pureNewNick = newNick;
    if (vars.nicknamePrefixChars.indexOf(pureNewNick.charAt(0)) >= 0) {
      pureNewNick = pureNewNick.slice(1, pureNewNick.length);
    }
    // ci = channel index into channels array
    for (let ci=0; ci<vars.ircState.channels.length; ci++) {
      let nickCount = vars.ircState.channelStates[ci].names.length;
      if (nickCount > 0) {
        let matchIndex = -1;
        let opChar = '';
        for (let i=0; i<nickCount; i++) {
          let pureNick = vars.ircState.channelStates[ci].names[i];
          let tempOpChar = '';
          if (vars.nicknamePrefixChars.indexOf(pureNick.charAt(0)) >= 0) {
            tempOpChar = pureNick.charAt(0);
            pureNick = pureNick.slice(1, pureNick.length);
          }
          if (pureOldNick === pureNick) {
            matchIndex = i;
            opChar = tempOpChar;
          }
        } // next i
        if (matchIndex >= 0) {
          vars.ircState.channelStates[ci].names[matchIndex] = opChar + newNick;
        }
      }
    } // next ci
    return;
  } // _exchangeNames()

  // --------------------------------------------------------------
  // Add a nicname to channel array list
  // If op or voice (@,+) not match, then update the existing name
  // --------------------------------------------------------------
  function _addName(newNick, channel) {
    if (!newNick) return;
    if (newNick.length < 1) return;
    // console.log('Adding ' + newNick + ' to ' + channel);
    let channelIndex = vars.ircState.channels.indexOf(channel.toLowerCase());
    if (channelIndex >= 0) {
      let nickCount = vars.ircState.channelStates[channelIndex].names.length;
      if (nickCount > 0) {
        let matchIndex = -1;
        let opChar = '';
        let pureNewNick = newNick;
        if (vars.nicknamePrefixChars.indexOf(pureNewNick.charAt(0)) >= 0) {
          pureNewNick = pureNewNick.slice(1, pureNewNick.length);
        }
        for (let i=0; i<nickCount; i++) {
          let pureNick = vars.ircState.channelStates[channelIndex].names[i];
          if (vars.nicknamePrefixChars.indexOf(pureNick.charAt(0)) >= 0) {
            opChar = pureNick.charAt(0);
            pureNick = pureNick.slice(1, pureNick.length);
          }
          if (pureNewNick === pureNick) matchIndex = i;
        }
        if (matchIndex >= 0) {
          // case of name exist, if @ or + prefix not match replace entire string
          if (vars.ircState.channelStates[channelIndex].names[matchIndex] !== newNick) {
            vars.ircState.channelStates[channelIndex].names[matchIndex] = newNick;
          }
        } else {
          // case of nick not in list, add it
          vars.ircState.channelStates[channelIndex].names.push(newNick);
        }
      } else {
        // case of empty list, add as first nick name
        vars.ircState.channelStates[channelIndex].names.push(newNick);
      }
    }
    return;
  } // _addName()

  // ---------------------------------------------
  // Remove a nicname to channel array list
  // Ignore op or voice (@,+) when removing
  // ---------------------------------------------
  function _removeName(oldNick, channel) {
    // console.log('Removing ' + oldNick + ' from ' + channel);
    let channelIndex = vars.ircState.channels.indexOf(channel.toLowerCase());
    if (channelIndex >= 0) {
      let nickCount = vars.ircState.channelStates[channelIndex].names.length;
      if (nickCount > 0) {
        let matchIndex = -1;
        let pureOldNick = oldNick;
        if (vars.nicknamePrefixChars.indexOf(pureOldNick.charAt(0)) >= 0) {
          pureOldNick = pureOldNick.slice(1, pureOldNick.length);
        }
        for (let i=0; i<nickCount; i++) {
          let pureNick = vars.ircState.channelStates[channelIndex].names[i];
          if (vars.nicknamePrefixChars.indexOf(pureNick.charAt(0)) >= 0) {
            pureNick = pureNick.slice(1, pureNick.length);
          }
          // console.log('pureOldNick pureNick' + pureOldNick + ' ' + pureNick);
          if (pureOldNick === pureNick) matchIndex = i;
        }
        if (matchIndex >= 0) {
          vars.ircState.channelStates[channelIndex].names.splice(matchIndex, 1);
        }
      }
    }
    return;
  } // _removeName()

  //-----------------------------------------------------------------
  //
  //  I R C   M E S S A G E   C O M M A N D   P A R S E R
  //
  //  irc-server --> [THIS PARSER] --> web-serve --> web-browser
  //
  // Single message line from IRC server, parsed for command actions
  //
  // Input: Node.js UTF-8 encoded Buffer object
  //-----------------------------------------------------------------
  const _processIrcMessage = function (socket, messageBuffer) {
    //
    // parse message into: prefix, command, and param array
    //
    let parsedMessage = _parseIrcMessage(messageBuffer);
    // console.log('(IRC-->) parsedMessage ' + JSON.stringify(parsedMessage, null, 2));

    // Do not process excluded commands on this list
    let excludedCommands = [];
    // excludedCommands.push('PING');
    // excludedCommands.push('PONG');

    // PING is special case
    if (parsedMessage.command === 'PING') {
      let outBuffer = Buffer.from('PONG ' + parsedMessage.params[0] + '\r\n', 'utf8');
      // 512 btye maximum size from RFC 2812 2.3 Messages
      if (outBuffer.length <= 512) {
        socket.write(outBuffer, 'utf8');
        if (excludedCommands.indexOf('PING') <0) {
          ircMessageCache.addMessage(Buffer.concat([
            Buffer.from(vars.timestamp() + ' '),
            messageBuffer
          ]));
          global.sendToBrowser(Buffer.concat([
            Buffer.from(vars.timestamp() + ' '),
            messageBuffer,
            Buffer.from('\r\n')
          ]));
        }
        if (excludedCommands.indexOf('PONG') < 0) {
          global.sendToBrowser(vars.commandMsgPrefix + outBuffer.toString('utf8'));
        }
      } else {
        console.log('Error, send buffer exceeds 512 character limit.');
      }
      return;
    }
    //
    // Filter...
    //
    // Do not parse or act on commands that are listed in this array
    //
    if (excludedCommands.indexOf(parsedMessage.command) >= 0) return;

    //
    // For display in browser, and cache for browser refresh
    //
    ircMessageCache.addMessage(Buffer.concat([
      Buffer.from(vars.timestamp() + ' '),
      messageBuffer
    ]));
    global.sendToBrowser(Buffer.concat([
      Buffer.from(vars.timestamp() + ' '),
      messageBuffer,
      Buffer.from('\r\n')
    ]));
    //
    // Send to log file (send message as utf8 Buffer)
    //
    ircLog.writeIrcLog(messageBuffer);

    // -------------------------------------------------
    // Individual ommands from IRC server are parsed here
    // -------------------------------------------------
    switch(parsedMessage.command) {
      case '001':
        // case of successful register with nickname, set registered state
        vars.ircState.ircRegistered = true;
        vars.ircState.times.ircConnect = vars.timestamp();
        vars.ircState.count.ircConnect++;

        // extract my client info from last argument in 001 message
        let splitparams1 = parsedMessage.params[1].split(' ');
        let parsedNick = splitparams1[splitparams1.length - 1].split('!')[0];
        let parsedUserhost = splitparams1[splitparams1.length - 1].split('!')[1];
        if (parsedNick === vars.ircState.nickName) {
          // console.log(parsedUserhost);
          vars.ircState.userHost = parsedUserhost;
          tellBrowserToRequestState();
          //
          // nickserv registration
          //
          if ((vars.nsIdentifyNick.length > 0) && (vars.nsIdentifyCommand.length > 0)) {
            setTimeout(function() {
              if ((vars.ircState.ircConnected) &&
                (vars.ircState.nickName === vars.nsIdentifyNick)) {
                ircWrite.writeSocket(socket, vars.nsIdentifyCommand);
              }
            }.bind(this), 1500);
          }
        } else {
          global.sendToBrowser(
            'webServer: Registration error, unable to parse nick!user@host from message 001\n');
          socket.destroy();
          vars.ircState.ircConnecting = false;
          vars.ircState.ircConnected = false;
          vars.ircState.ircRegistered = false;
          vars.ircState.ircIsAway = false;
          tellBrowserToRequestState();
        }
        break;
      // 305 RPL_UNAWAY
      case '305':
        if (true) {
          if (parsedMessage.params[0].toLowerCase() === vars.ircState.nickName.toLowerCase()) {
            vars.ircState.ircIsAway = false;
            tellBrowserToRequestState();
          }
        }
        break;
      // 305 RPL_NOWAWAY
      case '306':
        if (true) {
          if (parsedMessage.params[0].toLowerCase() === vars.ircState.nickName.toLowerCase()) {
            vars.ircState.ircIsAway = true;
            tellBrowserToRequestState();
          }
        }
        break;
      //
      // 332 RPL_TOPIC
      // TODO RFC2812 conflict, channel is params[0] (no nickname)
      case '332':
        if (true) {
          let channelName = parsedMessage.params[1].toLowerCase();
          let index = vars.ircState.channels.indexOf(channelName);
          if (index >= 0) {
            // case of already exist
            vars.ircState.channelStates[index].topic = parsedMessage.params[2];
            tellBrowserToRequestState();
          } else {
            console.log('Error message 332 for non-existant channel');
          }
        }
        break;

      //
      // 353 RPL_NAMREPLY
      // TODO RFC2812 conflict, channel is params[0] (no nickname)
      case '353':
        if (true) {
          // type '=' public '@' secret '*' private
          if (parsedMessage.params.length > 2) {
            let channelType = parsedMessage.params[1];
            let channelName = parsedMessage.params[2].toLowerCase();
            let index = vars.ircState.channels.indexOf(channelName);
            // if names array exist
            if (index >= 0) {
              if (parsedMessage.params[3].length > 0) {
                let nameArray = parsedMessage.params[3].split(' ');
                if (nameArray.length > 0) {
                  for (let i=0; i<nameArray.length; i++) {
                    _addName(nameArray[i], channelName);
                  }
                }
              }
            } else {
              console.log('Error message 353 for non-existant channel');
            }
          } else {
            console.log('Error message 353 missing params');
          }
        }
        break;
      //
      // 366 RPL_ENDOFNAMES
      // TODO RFC2812 conflict, channel is params[0] (no nickname)
      case '366':
        if (true) {
          tellBrowserToRequestState();
        }
        break;
      //
      // 433 ERR_NICKNAMEINUSE
      //
      case '433':
        if (true) {
          // Connect to IRC has failed, nickname already in use, disconnect to try again
          if (!vars.ircState.ircRegistered) {
            if (socket) {
              socket.destroy();
              vars.ircState.ircConnecting = false;
              vars.ircState.ircConnected = false;
              vars.ircState.ircRegistered = false;
              vars.ircState.ircIsAway = false;
              tellBrowserToRequestState();
            }
          }
        }
        break;
      //
      // 451 ERR_NOTREGISERED
      //
      case '451':
        if (true) {
          // Connect to IRC has failed, disconnect to try again
          if (!vars.ircState.ircRegistered) {
            if (socket) {
              socket.destroy();
              vars.ircState.ircConnecting = false;
              vars.ircState.ircConnected = false;
              vars.ircState.ircRegistered = false;
              vars.ircState.ircIsAway = false;
              tellBrowserToRequestState();
            }
          }
        }
        break;
      //
      case 'ERROR':
        console.log(messageBuffer.toString('utf8'));
        tellBrowserToRequestState();
        break;
      //
      case 'JOIN':
        if (true) {
          let channelName = parsedMessage.params[0].toLowerCase();
          let index = vars.ircState.channels.indexOf(channelName);
          if (index >= 0) {
            // case of already exist
            if (parsedMessage.nick === vars.ircState.nickName) {
              vars.ircState.channelStates[index].topic = '';
              vars.ircState.channelStates[index].names = [];
              vars.ircState.channelStates[index].joined = true;
              vars.ircState.channelStates[index].kicked = false;
              tellBrowserToRequestState();
            } else {
              // case of different user for user list
              _addName(parsedMessage.nick, parsedMessage.params[0]);
              tellBrowserToRequestState();
            }
          } else {
            // case of new channel
            let chanState = {
              name: channelName,
              topic: '',
              names: [],
              joined: true,
              kicked: false
            };
            vars.ircState.channels.push(channelName);
            vars.ircState.channelStates.push(chanState);
            tellBrowserToRequestState();
          }
        }
        break;
      //
      case 'KICK':
        if (true) {
          let channelName = parsedMessage.params[0].toLowerCase();
          let index = vars.ircState.channels.indexOf(channelName);
          if (parsedMessage.params[1] === vars.ircState.nickName) {
            // case of me, I was kicked
            vars.ircState.channelStates[index].topic = '';
            vars.ircState.channelStates[index].names = [];
            vars.ircState.channelStates[index].joined = false;
            vars.ircState.channelStates[index].kicked = true;
            tellBrowserToRequestState();
          } else {
            // case of someone else was kicked
            _removeName(parsedMessage.params[1], parsedMessage.params[0]);
            tellBrowserToRequestState();
          }
        }
        break;
      //
      case 'MODE':
        if (true) {
          if (parsedMessage.params[0] === vars.ircState.nickName) {
            // Case of User mode for IRC client has changed
            // console.log('TODO your user mode on server has been changed changed.');
          } else if (vars.ircState.channels.indexOf(parsedMessage.params[0].toLowerCase() >= 0)) {
            // This is case of a #channel mode has changed.
            parseChannelModeChanges(socket, parsedMessage);
          } else {
            console.log('Error: MODE message not for myself or channel');
          }
        }
        break;

      case 'NICK':
        if (true) {
          if ((parsedMessage.nick === vars.ircState.nickName) &&
            (parsedMessage.host === vars.ircState.userHost)) {
            vars.ircState.nickName = parsedMessage.params[0];
          }
          if (vars.ircState.channels.length > 0) {
            let previousNick = parsedMessage.nick;
            let nextNick = parsedMessage.params[0];
            _exchangeNames(previousNick, nextNick);
          }
          tellBrowserToRequestState();
        }
        break;
      //
      case 'PART':
        if (true) {
          let channelName = parsedMessage.params[0].toLowerCase();
          let index = vars.ircState.channels.indexOf(channelName);
          if (index >= 0) {
            if (parsedMessage.nick === vars.ircState.nickName) {
              // case of me, I have parted the channel
              vars.ircState.channelStates[index].topic = '';
              vars.ircState.channelStates[index].names = [];
              vars.ircState.channelStates[index].joined = false;
              vars.ircState.channelStates[index].kicked = false;
              tellBrowserToRequestState();
            } else {
              // case of other user
              _removeName(parsedMessage.nick, parsedMessage.params[0]);
              tellBrowserToRequestState();
            }
          } else {
            console.log('Error message PART for non-existant channel');
          }
        }
        break;
      case 'PRIVMSG':
        if (true) {
          // check for CTCP message
          const ctcpDelim = 1;
          if (parsedMessage.params[1].charCodeAt(0) === ctcpDelim) {
            // case of CTCP message
            ircCtcp._parseCtcpMessage(socket, parsedMessage);
          }
        }
        break;
      case 'QUIT':
        if (true) {
          if (parsedMessage.nick !== vars.ircState.nickname) {
            // case of it is not me who QUIT
            if (vars.ircState.channels.length > 0) {
              for (let i = 0; i<vars.ircState.channels.length; i++) {
                if (vars.ircState.channelStates[i].joined) {
                  _removeName(parsedMessage.nick, vars.ircState.channels[i]);
                  tellBrowserToRequestState();
                }
              }
            }
          }
        }
        break;
      //
      // TOPIC
      case 'TOPIC':
        if (true) {
          let channelName = parsedMessage.params[0].toLowerCase();
          let index = vars.ircState.channels.indexOf(channelName);
          if (index >= 0) {
            // case of already exist
            vars.ircState.channelStates[index].topic = parsedMessage.params[1];
            tellBrowserToRequestState();
          } else {
            console.log('Error message TOPIC for non-existant channel');
          }
        }
        break;
      //
      default:
    }
  }; // _processIrcMessage

  module.exports = {
    _processIrcMessage: _processIrcMessage
  };
})();
