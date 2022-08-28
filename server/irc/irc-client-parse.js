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
//              Parse Messages arriving from IRC Server
//
//  The primary purpose of this module is to decode server messages
//  and adjust state variables in response to commands.
//  Typical example would be JOIN, PART, NICK commands that impact
//  a channel nicklist that is stored as a state variable.
//
//        Browser  <--   Web Server (here)  <--   IRC server
//
// -----------------------------------------------------------------------------
(function () {
  'use strict';

  const ircCtcp = require('./irc-client-ctcp');
  const ircCap = require('./irc-client-cap');
  const ircWrite = require('./irc-client-write');
  const ircLog = require('./irc-client-log');
  ircLog.test = 'test';

  const ircMessageCache = require('./irc-client-cache');
  const vars = require('./irc-client-vars');

  const tellBrowserToRequestState = function () {
    global.sendToBrowser('UPDATE\r\n');
  };

  let nickservIdentifyActiveFlag = false;

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
    function _extractMidString (start, end, messageBuffer) {
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
    function _extractFinalString (start, end, messageBuffer) {
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
    function _extractNickname (inText) {
      if (inText) {
        if ((inText.indexOf('!') >= 0) &&
          (inText.indexOf('@') >= 0) &&
          (inText.indexOf('!') < inText.indexOf('@'))) {
          const nick = inText.split('!')[0];
          return nick;
        } else {
          return null;
        }
      } else {
        return null;
      }
    } // _extractNickname()

    function _extractHostname (inText) {
      if (inText) {
        if ((inText.indexOf('!') >= 0) &&
          (inText.indexOf('@') >= 0) &&
          (inText.indexOf('!') < inText.indexOf('@'))) {
          const host = inText.split('!')[1];
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
    const params = [];
    //
    // Parsing variables
    const end = messageBuffer.length - 1;
    let temp = { nextIndex: 0 };

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
    for (let i = 0; i < vars.ircState.channels.length; i++) {
      if (parsedMessage.params[0].toLowerCase() === vars.ircState.channels[i]) {
        // index into vars.ircState.channels[]
        const chanIndex = i;
        const modeList = parsedMessage.params[1];
        if (modeList.length > 0) {
          for (let j = 0; j < modeList.length; j++) {
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
          for (let j = 0; j < modeQueue.length; j++) {
            userQueue.push(parsedMessage.params[j + 2]);
          }
          const strippedNicks = [];
          for (let j = 0; j < vars.ircState.channelStates[chanIndex].names.length; j++) {
            let tempNick = vars.ircState.channelStates[chanIndex].names[j];
            if (modeChars.indexOf(tempNick.charAt(0)) >= 0) {
              tempNick = tempNick.slice(1, tempNick.length);
            }
            strippedNicks.push(tempNick);
          }
          for (let j = 0; j < modeQueue.length; j++) {
            const userIndex = strippedNicks.indexOf(userQueue[j]);
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
  function _exchangeNames (oldNick, newNick) {
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
    for (let ci = 0; ci < vars.ircState.channels.length; ci++) {
      const nickCount = vars.ircState.channelStates[ci].names.length;
      if (nickCount > 0) {
        let matchIndex = -1;
        let opChar = '';
        for (let i = 0; i < nickCount; i++) {
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
  } // _exchangeNames()

  // --------------------------------------------------------------
  // Add a nicname to channel array list
  // If op or voice (@,+) not match, then update the existing name
  // --------------------------------------------------------------
  function _addName (newNick, channel) {
    if (!newNick) return;
    if (newNick.length < 1) return;
    // console.log('Adding ' + newNick + ' to ' + channel);
    const channelIndex = vars.ircState.channels.indexOf(channel.toLowerCase());
    if (channelIndex >= 0) {
      const nickCount = vars.ircState.channelStates[channelIndex].names.length;
      if (nickCount > 0) {
        let matchIndex = -1;
        // let opChar = '';
        let pureNewNick = newNick;
        if (vars.nicknamePrefixChars.indexOf(pureNewNick.charAt(0)) >= 0) {
          pureNewNick = pureNewNick.slice(1, pureNewNick.length);
        }
        for (let i = 0; i < nickCount; i++) {
          let pureNick = vars.ircState.channelStates[channelIndex].names[i];
          if (vars.nicknamePrefixChars.indexOf(pureNick.charAt(0)) >= 0) {
            // opChar = pureNick.charAt(0);
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
  } // _addName()

  // ---------------------------------------------
  // Remove a nicname to channel array list
  // Ignore op or voice (@,+) when removing
  // ---------------------------------------------
  function _removeName (oldNick, channel) {
    // console.log('Removing ' + oldNick + ' from ' + channel);
    const channelIndex = vars.ircState.channels.indexOf(channel.toLowerCase());
    if (channelIndex >= 0) {
      const nickCount = vars.ircState.channelStates[channelIndex].names.length;
      if (nickCount > 0) {
        let matchIndex = -1;
        let pureOldNick = oldNick;
        if (vars.nicknamePrefixChars.indexOf(pureOldNick.charAt(0)) >= 0) {
          pureOldNick = pureOldNick.slice(1, pureOldNick.length);
        }
        for (let i = 0; i < nickCount; i++) {
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
  } // _removeName()

  // -----------------------------------------------------------------
  //
  //  I R C   M E S S A G E   C O M M A N D   P A R S E R
  //
  //  irc-server --> [THIS PARSER] --> web-serve --> web-browser
  //
  // Single message line from IRC server, parsed for command actions
  //
  // Input: Node.js UTF-8 encoded Buffer object
  // -----------------------------------------------------------------
  const _processIrcMessage = function (socket, messageBuffer) {
    //
    // parse message into: prefix, command, and param array
    //
    const parsedMessage = _parseIrcMessage(messageBuffer);
    // console.log('(IRC-->) parsedMessage ' + JSON.stringify(parsedMessage, null, 2));

    //
    // PING and PONG are special cases.
    // To avoid overflow of the message cache, the PING, PONG are sent to raw socket
    // Unless for debug when PING, PONG removed from excludedCommands array
    // which makes PING and PONG visible to browser and inserted into message cache
    //
    // Server-to-client PING command
    //
    if (parsedMessage.command === 'PING') {
      const outBuffer = Buffer.from('PONG ' + parsedMessage.params[0] + '\r\n', 'utf8');
      // 512 btye maximum size from RFC 2812 2.3 Messages
      if (outBuffer.length <= 512) {
        socket.write(outBuffer, 'utf8');
        if (vars.excludedCommands.indexOf('PING') < 0) {
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
        // Show PONG in browser unless server-to-client PONG is filtered
        if (vars.excludedCommands.indexOf('PONG') < 0) {
          global.sendToBrowser(vars.commandMsgPrefix + outBuffer.toString('utf8'));
        }
      } else {
        console.log('Error, send buffer exceeds 512 character limit.');
      }
      return;
    }
    //
    // PONG response handler for client-to-server PING request
    //
    if (parsedMessage.command === 'PONG') {
      // Reset the timeout timer
      // 0 = timer disabled
      vars.clientToServerPingResponseTimer = 0;
      // Compute elapsed time in seconds
      const now = new Date();
      const nowMs = now.getTime();
      if (vars.clientToServerPingTimestampMs > 0) {
        vars.ircState.lastPing =
          ((nowMs - vars.clientToServerPingTimestampMs) / 1000).toFixed(3);
        global.sendToBrowser('LAG=' + vars.ircState.lastPing + '\r\n');
      } else {
        vars.ircState.lastPing = '0.000';
      }
    }
    //
    // Filter...
    //
    // Do not parse or act on commands that are listed in this array
    //
    if (vars.excludedCommands.indexOf(parsedMessage.command) >= 0) return;

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
    switch (parsedMessage.command) {
      case '001':
        // Clean up flags from IRCv3 SASL authentication workflow
        ircCap.closeSaslAuth();

        if (!vars.ircState.ircRegistered) {
          // extract my client info from last argument in 001 message
          const splitparams1 = parsedMessage.params[1].split(' ');
          const parsedNick = splitparams1[splitparams1.length - 1].split('!')[0];
          const parsedUserhost = splitparams1[splitparams1.length - 1].split('!')[1];
          if (parsedNick === vars.ircState.nickName) {
            // case of successful register with nickname, set registered state
            vars.ircState.ircRegistered = true;
            vars.ircState.times.ircConnect = vars.unixTimestamp();
            vars.ircState.count.ircConnect++;
            vars.ircState.ircServerPrefix = parsedMessage.prefix;
            vars.ircState.userHost = parsedUserhost;
            //
            // set user mode
            //
            if (vars.ircState.userMode.length > 0) {
              setTimeout(function () {
                ircWrite.writeSocket(socket, 'MODE ' + vars.ircState.nickName +
                  ' ' + vars.ircState.userMode);
              }, 500);
            }
            //
            // nickserv registration
            //
            if ((vars.nsIdentifyNick.length > 0) && (vars.nsIdentifyCommand.length > 0)) {
              setTimeout(function () {
                const configNick = vars.servers.serverArray[vars.ircState.ircServerIndex].nick;
                if ((vars.ircState.ircConnected) &&
                  (vars.ircState.nickName === configNick) &&
                  (vars.ircState.nickName === vars.nsIdentifyNick)) {
                  // This is a raw server message
                  // Example: "PRIVMSG NickServ :IDENTIFY xxxxxxxx"
                  ircWrite.writeSocket(socket, vars.nsIdentifyCommand);
                }
              }, 1500);
            }
            //
            // Upon reconnect, auto-JOIN previous irc channels
            //
            if ((vars.ircState.ircAutoReconnect) &&
              (vars.ircState.ircConnectOn) &&
              (vars.ircState.count.ircConnect > 0)) {
              setTimeout(function () {
                if ((vars.ircState.ircAutoReconnect) &&
                  (vars.ircState.ircConnectOn) &&
                  (vars.ircState.count.ircConnect > 0)) {
                  if (vars.ircServerReconnectChannelString.length > 0) {
                    ircWrite.writeSocket(socket, 'JOIN ' + vars.ircServerReconnectChannelString);
                    vars.ircServerReconnectChannelString = '';
                  }
                }
              }, 3000);
            }
            //
            // Wait 2 second for async stuff, then ask browser to update connected status
            // THis is duplicate request, some networks miss the first one.
            setTimeout(function () {
              tellBrowserToRequestState();
            }, 2000);
            // tell browser to update itself
            tellBrowserToRequestState();
          } else {
            global.sendToBrowser(
              'webServer: Registration error, unable to parse nick!user@host from message 001\n');
            socket.destroy();
            vars.ircState.ircConnecting = false;
            vars.ircState.ircConnected = false;
            vars.ircState.ircRegistered = false;
            vars.ircState.ircIsAway = false;
            vars.ircState.nickRecoveryActive = false;
            tellBrowserToRequestState();
          }
        } else {
          // case of receive 001 message when already registered
          console.log('Error, received 001 message from server when already registered');
        }
        break;
      // 305 RPL_UNAWAY
      case '305':
        if (parsedMessage.params[0].toLowerCase() === vars.ircState.nickName.toLowerCase()) {
          vars.ircState.ircIsAway = false;
          tellBrowserToRequestState();
        }
        break;
      // 305 RPL_NOWAWAY
      case '306':
        if (parsedMessage.params[0].toLowerCase() === vars.ircState.nickName.toLowerCase()) {
          vars.ircState.ircIsAway = true;
          tellBrowserToRequestState();
        }
        break;
      //
      // 332 RPL_TOPIC
      // TODO RFC2812 conflict, channel is params[0] (no nickname)
      case '332':
        {
          const channelName = parsedMessage.params[1].toLowerCase();
          const index = vars.ircState.channels.indexOf(channelName);
          if (index >= 0) {
            // case of already exist
            if ((parsedMessage.params.length > 2) && (!(parsedMessage.params[2] == null))) {
              // case of new topic provided
              vars.ircState.channelStates[index].topic = parsedMessage.params[2];
            } else {
              // case of channel is empty string, clear previous topic
              vars.ircState.channelStates[index].topic = '';
            }
            tellBrowserToRequestState();
          } else {
            console.log('Error message 332 for non-existent channel');
          }
        }
        break;

      //
      // 353 RPL_NAMREPLY
      // TODO RFC2812 conflict, channel is params[0] (no nickname)
      case '353':
        // type '=' public '@' secret '*' private
        if (parsedMessage.params.length > 2) {
          // const channelType = parsedMessage.params[1];
          const channelName = parsedMessage.params[2].toLowerCase();
          const index = vars.ircState.channels.indexOf(channelName);
          // if names array exist
          if (index >= 0) {
            // this crash with .params[3] value of null, not sure why it was null
            // check for null is a patch over
            if ((parsedMessage.params) && (parsedMessage.params[3]) &&
              (parsedMessage.params[3].length > 0)) {
              const nameArray = parsedMessage.params[3].split(' ');
              if (nameArray.length > 0) {
                for (let i = 0; i < nameArray.length; i++) {
                  _addName(nameArray[i], channelName);
                }
              }
            }
          } else {
            console.log('Error message 353 for non-existent channel');
          }
        } else {
          console.log('Error message 353 missing params');
        }
        break;
      //
      // 366 RPL_ENDOFNAMES
      // TODO RFC2812 conflict, channel is params[0] (no nickname)
      case '366':
        tellBrowserToRequestState();
        break;
      //
      // 432 ERR_ERRONEUSNICKNAME
      case '432':
        //
        // This is seen on DALnet when a desired nickname
        // is locked by nickserv services and requires a
        // release command sent to nickserv.
        //
        // Action: If primary nickname match, try alternate nick
        //         else, disconnect.
        //
        // ircRegistered is used to skip user's /NICK commands after login
        if (!vars.ircState.ircRegistered) {
          const configNick = vars.servers.serverArray[vars.ircState.ircServerIndex].nick;
          const alternateNick = vars.servers.serverArray[vars.ircState.ircServerIndex].altNick;
          if ((!vars.ircState.nickRecoveryActive) &&
            // if enabled...
            (alternateNick.length > 0) &&
            // The in-use nick is parsedMessage.params[1]
            (parsedMessage.params) &&
            (parsedMessage.params[1]) &&
            // nickname requested params[1] is primary nickname
            (parsedMessage.params[1] === configNick) &&
            // and current nickname equals primary nickname
            (vars.ircState.nickName === configNick) &&
            (configNick !== alternateNick)) {
            // continue parser, move this to async
            setTimeout(function () {
              // Special case:
              // vars.ircState.nickName is normally set in
              // response to a NAME server message.
              // In this case, the nickname has not been registered yet.
              // The connect will proceed to message 001 RPL_WELCOME
              // and the server will not send a NICK message response to
              // this NICK message.
              vars.ircState.nickName = alternateNick;
              ircWrite.writeSocket(socket, 'NICK ' + alternateNick);
              // Only change nickname,
              // Do not request auto recovery after 422
              // because it would require user password manually
            }, 500);
          } else {
            // Else disconnect from IRC
            if (socket) {
              socket.destroy();
            }
            // signal browser to show an error
            vars.ircState.count.ircConnectError++;

            vars.ircState.ircServerPrefix = '';
            // Do not reconnect
            vars.ircState.ircConnectOn = false;
            vars.ircState.ircConnecting = false;
            vars.ircState.ircConnected = false;
            vars.ircState.ircRegistered = false;
            vars.ircState.ircIsAway = false;
            vars.ircState.nickRecoveryActive = false;
            vars.ircServerReconnectChannelString = '';
            tellBrowserToRequestState();
          }
        } // ! ircRegistered
        // An error has occurred trying to change nickname while connected.
        // This is most likely a services lock on the nickname
        // Action: abort auto-reconnect, requires user password manually
        if (vars.ircState.ircConnected) {
          _cancelNickRecovery();
          tellBrowserToRequestState();
        }
        break;
      //
      // 433 ERR_NICKNAMEINUSE
      //
      case '433':
        // Connect to IRC has failed, nickname already in use
        //
        // ircRegistered is used to skip user's /NICK commands after login
        if (!vars.ircState.ircRegistered) {
          // Case of alternate nickname is enabled
          const configNick = vars.servers.serverArray[vars.ircState.ircServerIndex].nick;
          const alternateNick = vars.servers.serverArray[vars.ircState.ircServerIndex].altNick;
          if ((!vars.ircState.nickRecoveryActive) &&
            // if enabled...
            (alternateNick.length > 0) &&
            // The in-use nick is parsedMessage.params[1]
            (parsedMessage.params) &&
            (parsedMessage.params[1]) &&
            // nickname requested params[1] is primary nickname
            (parsedMessage.params[1] === configNick) &&
            // and current nickname equals primary nickname
            (vars.ircState.nickName === configNick) &&
            (configNick !== alternateNick)) {
            // continue parser, move this to async
            setTimeout(function () {
              // Special case:
              // vars.ircState.nickName is normally set in
              // response to a NAME server message.
              // In this case, the nickname has not been registered yet.
              // The connect will proceed to message 001 RPL_WELCOME
              // and the server will not send a NICK message response to
              // this NICK message.
              vars.ircState.nickName = alternateNick;
              ircWrite.writeSocket(socket, 'NICK ' + alternateNick);
              _activateNickRecovery();
              tellBrowserToRequestState();
            }, 500);
          } else {
            // Else alternate nickname not enabled, disconnect and wait for user input
            if (socket) {
              socket.destroy();
            }
            // signal browser to show an error
            vars.ircState.count.ircConnectError++;

            vars.ircState.ircServerPrefix = '';
            // Do not reconnect
            vars.ircState.ircConnectOn = false;
            vars.ircState.ircConnecting = false;
            vars.ircState.ircConnected = false;
            vars.ircState.ircRegistered = false;
            vars.ircState.ircIsAway = false;
            vars.ircState.nickRecoveryActive = false;
            vars.ircServerReconnectChannelString = '';
            tellBrowserToRequestState();
          }
        } else {
          // else case of vars.ircState.ircRegistered === true
          //
          // Expect a 1 to 1 match,  /NICK --> 433
          // If out of sync, abort
          if (vars.ircState.nickRecoveryActive) {
            nickRecoveryWhoisResponses++;
            if (nickRecoveryWhoisCounter !== nickRecoveryWhoisResponses) {
              _cancelNickRecovery();
              tellBrowserToRequestState();
            }
          }
        }
        break;
      //
      // 451 ERR_NOTREGISERED
      //
      case '451':
        // Connect to IRC has failed, disconnect to try again
        if (!vars.ircState.ircRegistered) {
          if (socket) {
            socket.destroy();
          }
          // signal browser to show an error
          vars.ircState.count.ircConnectError++;

          vars.ircState.ircServerPrefix = '';
          // Do not reconnect
          vars.ircState.ircConnectOn = false;
          vars.ircState.ircConnecting = false;
          vars.ircState.ircConnected = false;
          vars.ircState.ircRegistered = false;
          vars.ircState.ircIsAway = false;
          vars.ircState.nickRecoveryActive = false;
          tellBrowserToRequestState();
        }
        break;

      // 900-908 CAP SASL numeric responses
      //
      case '900':
      case '903':
        ircCap.numericSuccessHandler(socket, parsedMessage);
        break;
      //
      case '901':
      case '902':
      case '904':
      case '905':
      case '906':
      case '907':
      case '908':
        ircCap.numericErrorHandler(socket, parsedMessage);
        break;
      //
      // AUTHENTICATE - SASL authentication response
      //
      case 'AUTHENTICATE':
        //
        // Handle externally in irc-client-cap.js
        //
        ircCap.parseAuthMessage(socket, parsedMessage);
        break;
      //
      //
      // CAP - IRCv3 Capability negotiation
      //
      case 'CAP':
        //
        // Handle externally in irc-client-cap.js
        //
        ircCap.parseCapMessage(socket, parsedMessage);
        break;
      //
      case 'ERROR':
        // console.log(messageBuffer.toString('utf8'));
        tellBrowserToRequestState();
        if (parsedMessage.params.length > 0) {
          ircLog.writeIrcLog('Received ERROR from irc server: ' + parsedMessage.params[0]);
          if (parsedMessage.params[0].length > 4) {
            let abortFlag = false;
            //
            // These string match may need some adjustment for different type of IRC server.
            //
            if (parsedMessage.params[0].toUpperCase().indexOf('KILL') >= 0) {
              ircLog.writeIrcLog('KILL detected from IRC server');
              abortFlag = true;
            }
            if (parsedMessage.params[0].toUpperCase().indexOf('ACCESS DENIED') >= 0) {
              ircLog.writeIrcLog('Access denied detected from IRC server');
              abortFlag = true;
            }
            if ((parsedMessage.params[0].toUpperCase().indexOf('K-LINE') >= 0) ||
              (parsedMessage.params[0].toUpperCase().indexOf('KLINE') >= 0)) {
              ircLog.writeIrcLog('K-Line detected from IRC server');
              abortFlag = true;
            }
            // ----------------------------------
            // Abort the auto-reconnect if banned
            // ----------------------------------
            if (abortFlag) {
              vars.ircState.ircConnectOn = false;
              vars.ircServerReconnectChannelString = '';
            }
          }
        } else {
          ircLog.writeIrcLog('Received ERROR from irc server');
        }
        break;
      //
      case 'JOIN':
        {
          const channelName = parsedMessage.params[0].toLowerCase();
          const index = vars.ircState.channels.indexOf(channelName);
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
            const chanState = {
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
        {
          const channelName = parsedMessage.params[0].toLowerCase();
          const index = vars.ircState.channels.indexOf(channelName);
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
        if (parsedMessage.params[0] === vars.ircState.nickName) {
          // Case of User mode for IRC client has changed
          // console.log('TODO your user mode on server has been changed changed.');
        } else if (vars.ircState.channels.indexOf(parsedMessage.params[0].toLowerCase() >= 0)) {
          // This is case of a #channel mode has changed.
          parseChannelModeChanges(socket, parsedMessage);
        } else {
          console.log('Error: MODE message not for myself or channel');
        }
        break;

      case 'NICK':
        // Update global state variable with new nickname
        if ((parsedMessage.nick === vars.ircState.nickName) &&
          (parsedMessage.host === vars.ircState.userHost)) {
          vars.ircState.nickName = parsedMessage.params[0];
        }
        // Change nickname in each channel in attendance
        if (vars.ircState.channels.length > 0) {
          const previousNick = parsedMessage.nick;
          const nextNick = parsedMessage.params[0];
          _exchangeNames(previousNick, nextNick);
        }
        // console.log('(IRC-->) NICK parsedMessage ' + JSON.stringify(parsedMessage, null, 2));
        // console.log('vars.ircState.nickName', vars.ircState.nickName);
        if (
          // first two are to skip name changes of other users in same IRC channels
          // The vars.ircState.nickName already updated above at start of this handler
          // This is /NICK (from alternate to primary nickname)
          //
          // If not other user NICK request
          (parsedMessage.nick === vars.servers.serverArray[vars.ircState.ircServerIndex].altNick) &&
          (parsedMessage.host === vars.ircState.userHost)) {
          // and... if nickname recovery active
          if ((vars.servers.serverArray[vars.ircState.ircServerIndex].recoverNick) &&
            (vars.ircState.nickRecoveryActive)) {
            // and ... if identify requested and active
            if ((vars.nsIdentifyNick.length > 0) &&
              (vars.nsIdentifyCommand.length > 0) &&
              (nickservIdentifyActiveFlag)) {
              const configNick = vars.servers.serverArray[vars.ircState.ircServerIndex].nick;
              const alternateNick = vars.servers.serverArray[vars.ircState.ircServerIndex].altNick;
              const previousNick = parsedMessage.nick;
              const nextNick = parsedMessage.params[0];
              // and... if previous, next, primary, alternate nicks in correct variables
              if (
                (previousNick === alternateNick) &&
                (nextNick === configNick) &&
                (vars.ircState.nickName === configNick) &&
                (vars.ircState.nickName === vars.nsIdentifyNick)) {
                setTimeout(function () {
                  // prevent multiple IDENTIFY actions
                  nickservIdentifyActiveFlag = false;
                  // This is a raw server message
                  // Example: "PRIVMSG NickServ :IDENTIFY xxxxxxxx"
                  ircWrite.writeSocket(socket, vars.nsIdentifyCommand);
                }, 500);
              } // if correct nicknames
            }; // if identify active
            // even if auto-identify disabled, cancel nick recovery
            _cancelNickRecovery();
          } // if nick recovery active
        } // not NICK change for other user in channel
        tellBrowserToRequestState();
        break;
      //
      case 'PART':
        {
          const channelName = parsedMessage.params[0].toLowerCase();
          const index = vars.ircState.channels.indexOf(channelName);
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
        if ((parsedMessage.params.length > 1) && (!(parsedMessage.params[1] == null))) {
          // check for CTCP message
          const ctcpDelim = 1;
          if (parsedMessage.params[1].charCodeAt(0) === ctcpDelim) {
            // case of CTCP message
            ircCtcp._parseCtcpMessage(socket, parsedMessage);
          }
        }
        break;
      case 'QUIT':
        //
        // case of QUIT message for other members of an IRC channel
        if (parsedMessage.nick !== vars.ircState.nickname) {
          if (vars.ircState.channels.length > 0) {
            for (let i = 0; i < vars.ircState.channels.length; i++) {
              if (vars.ircState.channelStates[i].joined) {
                _removeName(parsedMessage.nick, vars.ircState.channels[i]);
                tellBrowserToRequestState();
              }
            }
          }
        }
        //
        // Case of nickname auto-recovery of own nickname
        if ((vars.servers.serverArray[vars.ircState.ircServerIndex].recoverNick) &&
          (vars.ircState.nickRecoveryActive)) {
          const configNick = vars.servers.serverArray[vars.ircState.ircServerIndex].nick;
          const alternateNick = vars.servers.serverArray[vars.ircState.ircServerIndex].altNick;
          if (
            // Empty string is disabled
            (alternateNick.length > 0) &&
            (parsedMessage.nick === configNick) &&
            (vars.ircState.nickName === alternateNick) &&
            (configNick !== alternateNick)) {
            nickservIdentifyActiveFlag = true;
            setTimeout(function () {
              nickservIdentifyActiveFlag = false;
            }, 10000);
            setTimeout(function () {
              // _cancelNickRecovery();
              ircWrite.writeSocket(socket, 'NICK ' + configNick);
            }, 500);
          }
        }
        break;
      //
      // TOPIC
      case 'TOPIC':
        {
          const channelName = parsedMessage.params[0].toLowerCase();
          const index = vars.ircState.channels.indexOf(channelName);
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

  // --------------------------------------------------
  // Alternate Nickname and Nickname Auto-recovery
  // --------------------------------------------------

  let nickRecoveryWhoisTimer = 0;
  let nickRecoveryWhoisCounter = 0;
  let nickRecoveryWhoisResponses = 0;

  function _activateNickRecovery () {
    if ((vars.servers.serverArray[vars.ircState.ircServerIndex].recoverNick) &&
      (vars.servers.serverArray[vars.ircState.ircServerIndex].altNick.length > 0)) {
      // first time duration
      nickRecoveryWhoisTimer = 60;
      nickRecoveryWhoisCounter = 0;
      nickRecoveryWhoisResponses = 0;
      vars.ircState.nickRecoveryActive = true;
    }
  }
  function _cancelNickRecovery () {
    nickRecoveryWhoisTimer = 0;
    nickRecoveryWhoisCounter = 0;
    nickRecoveryWhoisResponses = 0;
    vars.ircState.nickRecoveryActive = false;
  }

  // this is called from main module irc-client.js to insert TCP socket object
  function recoverNickTimerTick (socket) {
    if (nickRecoveryWhoisTimer > 0) {
      const configNick = vars.servers.serverArray[vars.ircState.ircServerIndex].nick;
      const alternateNick = vars.servers.serverArray[vars.ircState.ircServerIndex].altNick;
      if (!vars.ircState.ircConnected) {
        _cancelNickRecovery();
        tellBrowserToRequestState();
      }
      if (vars.ircState.nickName === configNick) {
        _cancelNickRecovery();
        tellBrowserToRequestState();
      }
      if (vars.ircState.nickName !== alternateNick) {
        _cancelNickRecovery();
        tellBrowserToRequestState();
      }
      if (nickRecoveryWhoisTimer > 0) {
        nickRecoveryWhoisTimer--;
        if (nickRecoveryWhoisTimer === 0) {
          nickRecoveryWhoisCounter++;
          if (nickRecoveryWhoisCounter < 76) {
            if ((alternateNick.length > 0) &&
              (vars.ircState.nickName === alternateNick) &&
              (vars.servers.serverArray[vars.ircState.ircServerIndex].recoverNick) &&
              (configNick !== alternateNick)) {
              nickRecoveryWhoisTimer = 60;
              // each 1 minute until 20 minutes
              if (nickRecoveryWhoisCounter > 20) nickRecoveryWhoisTimer = 300;
              // 5 minutes until 1 hour
              if (nickRecoveryWhoisCounter > 28) nickRecoveryWhoisTimer = 900;
              // each 15 minutes until 20 + 8 + 48 = 13 hours
              nickservIdentifyActiveFlag = true;
              setTimeout(function () {
                nickservIdentifyActiveFlag = false;
              }, 10000);
              ircWrite.writeSocket(socket, 'NICK ' + configNick);
            }
          } else {
            _cancelNickRecovery();
            tellBrowserToRequestState();
          }
        }
      }
    }
    return null;
  };

  module.exports = {
    _processIrcMessage: _processIrcMessage,
    recoverNickTimerTick: recoverNickTimerTick
  };
})();
