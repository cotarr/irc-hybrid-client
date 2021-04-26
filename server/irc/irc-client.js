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
//     Node/Express IRC Client backend for irc-hybrid-client
//
// -----------------------------------------------------------------------------
(function() {
  'use strict';

  const net = require('net');
  const tls = require('tls');
  const fs = require('fs');
  const isValidUTF8 = require('utf-8-validate');
  const ircLog = require('./irc-log');
  const ircMessageCache = require('./irc-message-cache');

  var nodeEnv = process.env.NODE_ENV || 'development';

  const credentials = JSON.parse(fs.readFileSync('./credentials.json', 'utf8'));

  var servers = JSON.parse(fs.readFileSync('./servers.json', 'utf8'));

  // ----------------------------------------------------
  //
  //     Setup IRC Client variables and configuration
  //
  // ----------------------------------------------------

  const channelPrefixChars = '@#+!';
  const channelUserModeChars = 'qaohv';
  const nicknamePrefixChars = '~&@%+';
  // Used to differentiate outgoing verses ingoing messages in display
  const commandMsgPrefix = '--> ';

  var ircState = {};

  ircState.ircConnected = false;
  ircState.ircConnecting = false;
  ircState.ircRegistered = false;
  ircState.ircIsAway = false;


  ircState.ircServerName = servers.serverArray[0].name;
  ircState.ircServerHost = servers.serverArray[0].host;
  ircState.ircServerPort = servers.serverArray[0].port;
  ircState.ircTLSEnabled = servers.serverArray[0].tls;
  var ircServerPassword = servers.serverArray[0].password;
  var nsIdentifyNick = servers.serverArray[0].identifyNick;
  var nsIdentifyCommand = servers.serverArray[0].identifyCommand;
  // index into servers.json file
  ircState.ircServerIndex = 0;
  // List of favorite channels
  ircState.channelList = servers.serverArray[0].channelList;

  ircState.nickName = servers.serverArray[0].nick;
  ircState.userName = servers.serverArray[0].user;
  ircState.realName = servers.serverArray[0].real;
  ircState.userMode = servers.serverArray[0].modes;
  ircState.userHost = '';

  // ircChannels format ['#channel1', '#channel2']
  ircState.channels = [];
  // Channel schema
  //
  // channelStates {
  //   name: '#channel',
  //   topic: 'this is topic',
  //   names: ['visitor1', 'visitor2'],
  //   joined: true,
  //   kicked: false
  // }
  ircState.channelStates = [];

  // get name and version number from npm package.json
  ircState.botVersion = require('../../package.json').version;
  ircState.botName = require('../../package.json').name;

  ircState.times = {programRun: 0, ircConnect: 0};
  ircState.count = {ircConnect: 0};
  ircState.websocketCount = 0;

  ircLog.setRawMessageLogEnabled(servers.serverArray[0].rawMessageLog);

  console.log('Starting ' + ircState.botName + ' ' + ircState.botVersion);
  ircLog.writeIrcLog('-----------------------------------------');
  ircLog.writeIrcLog('Starting ' + ircState.botName + ' ' + ircState.botVersion);

  const timestamp = function() {
    let now = new Date;
    return parseInt(now.valueOf() / 1000).toString();
  };

  // ----------------------------------------------------
  // Write data to IRC server socket (Internal function)
  // Includes check of socket status
  //
  // Expect Buffer or utf8 encoded string.
  //
  // Send utf8 string to browser
  // Send Buffer encoded utf8 to IRC server socket
  // ----------------------------------------------------
  const _writeSocket = function (socket, message) {
    if ((socket) && (socket.writable)) {
      //
      // First, filter passwords, then send to browser and write log file
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
        if (!ircState.ircTLSEnabled) {
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
      global.sendToBrowser(commandMsgPrefix + filtered + '\n');

      //
      // Second validate UTF-8
      //
      let out = null;
      if (typeof message === 'string') {
        out = Buffer.from(message, 'utf8');
      }
      if (Buffer.isBuffer(message)) {
        out = Buffer.from(message);
      }
      if (!isValidUTF8(out)) {
        out = null;
      }

      //
      // Third, send into socket to IRC server
      //
      if (out) {
        // IRC server expects \r\n end of line characters as message delimiter
        let outBuffer = Buffer.concat([out, Buffer.from('\r\n', 'utf8')]);
        // 512 btye maximum size from RFC 2812 2.3 Messages
        if (outBuffer.length <= 512) {
          socket.write(Buffer.concat([out, Buffer.from('\r\n', 'utf8')]));
        } else {
          console.log('Error, send buffer exceeds 512 character limit.');
          global.sendToBrowser('webServer: send buffer exceeds 512 character limit.\n');
        }
      } else {
        console.log('Error, _writeSocket() string failed UTF8 validation.');
        global.sendToBrowser('webServer: _writeSocket() failed UTF8 validation.\n');
      }
    } else {
      // TODO should this disconnect?
      global.sendToBrowser('webServer: IRC Error: server socket not writable\n');
    }
  }; // _writeSocket

  // -------------------------------------------
  //  On Ready Event Handler (Internal function)
  // -------------------------------------------
  const _readyEventHandler = function(socket) {
    global.sendToBrowser('webServer: Ready\n');
    setTimeout(function() {
      // check state, if error occurred this will be false.
      if (ircState.ircConnecting) {
        if ((ircServerPassword) && (ircServerPassword.length > 0)) {
          _writeSocket(socket, 'PASS ' + ircServerPassword);
        }
        _writeSocket(socket, 'NICK ' + ircState.nickName);
        // Note: mode 8 = i not working on ngirc ?
        _writeSocket(socket, 'USER ' + ircState.userName + ' 0 * :' + ircState.realName);
        if (ircState.userMode.length > 0) {
          _writeSocket(socket, 'MODE ' + ircState.nickName + ' ' + ircState.userMode);
        }
        ircState.ircConnecting = false;
        ircState.ircConnected = true;
        global.sendToBrowser('UPDATE\n');
        // Timer for TLS connect delay
      } else {
        // case of error handler reset ircConnecting before timer expired (TLS error probgably)
        ircState.ircConnecting = false;
        ircState.ircConnected = false;
        ircState.ircRegistered = false;
        ircState.ircIsAway = false;
        global.sendToBrowser('UPDATE\n');
      }
      // reset the state variables
      ircState.channels = [];
      ircState.channelStates = [];
    }, 500);
  }; // _readyEventHandler

  //
  // Internal function to parse one line of message from IRC server
  // Returns jason object with prefix, command and params array
  //
  const _parseIrcMessage = function (message) {
    // ----------------------------
    //  Internal functions
    // ----------------------------
    //
    // 1) Check if colon string
    //
    //   :prefix command param1 param2 .... :lastParam
    //  ===                                ===
    //
    function _isColonString (start, messageString) {
      if (messageString.charAt(start) === ':') {
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
    function _extractMidString(start, end, messageString) {
      let i = start;
      let outString = '';
      while ((messageString.charAt(i) !== ' ') && (i <= end)) {
        outString += messageString.charAt(i);
        i++;
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
    function _extractFinalString(start, end, messageString) {
      let i = start;
      let outString = '';
      while (i <= end) {
        outString += messageString.charAt(i);
        i++;
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
    let messageString = message.toString();
    let end = messageString.length - 1;
    let temp = {nextIndex: 0};

    // 1) Check if prefix exist, if exit parse value, return nextIndex
    temp = _isColonString(temp.nextIndex, messageString);
    if (temp.isColonStr) {
      temp = _extractMidString(temp.nextIndex, end, messageString);
      prefix = temp.data;
      extNick = _extractNickname(temp.data);
      extHost = _extractHostname(temp.data);
    }

    // 2) extract command string
    temp = _extractMidString(temp.nextIndex, end, messageString);
    command = temp.data;

    // 3) Extract optional params, in loop, until all params extracted.
    let done = false;
    while (!done) {
      if (temp.nextIndex > end) {
        done = true;
      } else {
        temp = _isColonString(temp.nextIndex, messageString);
        if (temp.isColonStr) {
          // case of colon string, this is last param
          temp = _extractFinalString(temp.nextIndex, end, messageString);
          params.push(temp.data);
          done = true;
        } else {
          // else not colon string, must be middle param string
          temp = _extractMidString(temp.nextIndex, end, messageString);
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
    const userModeChars = channelUserModeChars; // 'qaohv'
    const modeChars = nicknamePrefixChars; // '~&@%+'
    const modeQueue = [];
    const userQueue = [];
    let selector = '';
    if (ircState.channels.length === 0) return;
    for (let i=0; i<ircState.channels.length; i++) {
      if (parsedMessage.params[0].toLowerCase() === ircState.channels[i]) {
        // index into ircState.channels[]
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
          for (let j=0; j<ircState.channelStates[chanIndex].names.length; j++) {
            let tempNick = ircState.channelStates[chanIndex].names[j];
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
            ircState.channelStates[chanIndex].names[userIndex] = tempNick;
          }
          global.sendToBrowser('UPDATE\n');
        }
      }
    } // next i
  }; // parseChannelModeChanges()

  // ----------------------------
  // CTCP flood detections
  // ----------------------------
  const ctcpFloodTimeSec = 5;
  const ctcpMaxFlood = 3;
  var ctcpDownCounterSeconds = 0;
  var ctcpReplyCounter = 0;
  const checkCtcpNotFlood = function() {
    if (ctcpDownCounterSeconds === 0) ctcpDownCounterSeconds = ctcpFloodTimeSec;
    ctcpReplyCounter++;
    if (ctcpReplyCounter > ctcpMaxFlood) return false;
    return true;
  };
  const ctcpTimerTick = function() {
    if (ctcpDownCounterSeconds > 0) {
      ctcpDownCounterSeconds--;
      if (ctcpDownCounterSeconds < 1) {
        ctcpReplyCounter = 0;
      }
    }
  };

  // ----------------------------
  // Handle CTCP requests
  // ----------------------------
  const _parseCtcpMessage = function (socket, parsedMessage) {
    // Internal function
    function _sendCtcpMessage (socket, ircMessage, ctcpReply, ctcpTo) {
      // It is necessary to fake out a message back to self to show the reply
      let ctcpDelim = 1;
      let now = new Date;
      let nowSeconds = parseInt(now.valueOf()/1000);
      let outgoingBackToSelf = nowSeconds.toString() +
        ' :' + ircState.nickName + '!*@* NOTICE ' + ctcpTo + ' ' +
        String.fromCharCode(ctcpDelim) + ctcpReply + String.fromCharCode(ctcpDelim);
      if (checkCtcpNotFlood()) {
        global.sendToBrowser(outgoingBackToSelf + '\r\n');
        ircMessageCache.addMessage(Buffer.from(outgoingBackToSelf));
        _writeSocket(socket, ircMessage);
      }
    }
    const ctcpDelim = 1;
    let ctcpMessage = parsedMessage.params[1];
    let end = ctcpMessage.length - 1;
    if (ctcpMessage.charCodeAt(0) !== 1) {
      console.log('_parseCtcpMessage() missing CTCP start delimiter');
      return;
    }

    let i = 1;
    let ctcpCommand = '';
    let ctcpRest = '';
    while ((ctcpMessage.charAt(i) !== ' ') && (i <= end)) {
      if (ctcpMessage.charCodeAt(i) !== ctcpDelim) {
        ctcpCommand += ctcpMessage.charAt(i);
      }
      i++;
    }
    ctcpCommand = ctcpCommand.toUpperCase();
    // console.log('ctcpCommand ' + ctcpCommand);
    while ((ctcpMessage.charAt(i) === ' ') && (i <= end)) {
      i++;
    }
    while ((ctcpMessage.charCodeAt(i) !== ctcpDelim) && (i <= end)) {
      ctcpRest += ctcpMessage.charAt(i);
      i++;
    }

    // console.log(JSON.stringify(parsedMessage, null, 2));
    // console.log('ctcpCommand: ' + ctcpCommand + ' ctcpRest ' + ctcpRest);

    switch (ctcpCommand) {
      case 'CLIENTINFO':
        if (true) {
          let ctcpReply = 'CLIENTINFO ' +
          'ACTION ' +
          'CLIENTINFO ' +
          'PING ' +
          'TIME ' +
          'VERSION';
          let ircMessage = 'NOTICE ' + parsedMessage.nick + ' :' +
          String.fromCharCode(ctcpDelim) + ctcpReply + String.fromCharCode(ctcpDelim);
          _sendCtcpMessage(socket, ircMessage, ctcpReply, parsedMessage.nick);
        }
        break;

      case 'PING':
        if (true) {
          let d = new Date;
          let ctcpReply = 'PING ' + ctcpRest;
          let ircMessage = 'NOTICE ' + parsedMessage.nick + ' :' +
          String.fromCharCode(ctcpDelim) + ctcpReply + String.fromCharCode(ctcpDelim);
          _sendCtcpMessage(socket, ircMessage, ctcpReply, parsedMessage.nick);
        }
        break;

      case 'TIME':
        if (true) {
          let d = new Date;
          let ctcpReply = 'TIME ' + d.toString().split('(')[0];
          let ircMessage = 'NOTICE ' + parsedMessage.nick + ' :' +
          String.fromCharCode(ctcpDelim) + ctcpReply + String.fromCharCode(ctcpDelim);
          _sendCtcpMessage(socket, ircMessage, ctcpReply, parsedMessage.nick);
        }
        break;
      //
      case 'VERSION':
        if (true) {
          let ctcpReply = 'VERSION ' + ircState.botName + '-' + ircState.botVersion;
          let ircMessage = 'NOTICE ' + parsedMessage.nick + ' :' +
          String.fromCharCode(ctcpDelim) + ctcpReply + String.fromCharCode(ctcpDelim);
          _sendCtcpMessage(socket, ircMessage, ctcpReply, parsedMessage.nick);
        }
        break;
      default:
    }
  }; // _parseCtcpMessage()

  //-----------------------------------------------------------------
  //
  //  I R C   M E S S A G E   C O M M A N D   P A R S E R
  //
  //  irc-server --> [THIS PARSER] --> web-serve --> web-browser
  //
  // Single message line from IRC server, parsed for command actions
  //-----------------------------------------------------------------
  const _parseBufferMessage = function (socket, message) {
    //
    // parse message into: prefix, command, and param array
    //
    let parsedMessage = _parseIrcMessage(message);
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
            Buffer.from(timestamp() + ' '),
            message
          ]));
          global.sendToBrowser(Buffer.concat([
            Buffer.from(timestamp() + ' '),
            message,
            Buffer.from('\r\n')
          ]));
        }
        if (excludedCommands.indexOf('PONG') < 0) {
          global.sendToBrowser(commandMsgPrefix + outBuffer.toString('utf8'));
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
      Buffer.from(timestamp() + ' '),
      message
    ]));
    global.sendToBrowser(Buffer.concat([
      Buffer.from(timestamp() + ' '),
      message,
      Buffer.from('\r\n')
    ]));
    //
    // Send to log file (send message as utf8 Buffer)
    //
    ircLog.writeIrcLog(message);

    // cycle through all channels and replace
    // the new nickname, preserving op character
    function _exchangeNames(oldNick, newNick) {
      if (!newNick) return;
      if (newNick.length < 1) return;
      if (!oldNick) return;
      if (oldNick.length < 1) return;
      if (ircState.channels.length === 0) return;

      // There should be no operator characters, but check and strip them if they are there
      let pureOldNick = oldNick;
      if (nicknamePrefixChars.indexOf(pureOldNick.charAt(0)) >= 0) {
        pureOldNick = pureOldNick.slice(1, pureOldNick.length);
      }
      let pureNewNick = newNick;
      if (nicknamePrefixChars.indexOf(pureNewNick.charAt(0)) >= 0) {
        pureNewNick = pureNewNick.slice(1, pureNewNick.length);
      }
      // ci = channel index into channels array
      for (let ci=0; ci<ircState.channels.length; ci++) {
        let nickCount = ircState.channelStates[ci].names.length;
        if (nickCount > 0) {
          let matchIndex = -1;
          let opChar = '';
          for (let i=0; i<nickCount; i++) {
            let pureNick = ircState.channelStates[ci].names[i];
            let tempOpChar = '';
            if (nicknamePrefixChars.indexOf(pureNick.charAt(0)) >= 0) {
              tempOpChar = pureNick.charAt(0);
              pureNick = pureNick.slice(1, pureNick.length);
            }
            if (pureOldNick === pureNick) {
              matchIndex = i;
              opChar = tempOpChar;
            }
          } // next i
          if (matchIndex >= 0) {
            ircState.channelStates[ci].names[matchIndex] = opChar + newNick;
          }
        }
      } // next ci
      return;
    } // _exchangeNames()

    // Add a nicname to channel array list
    // If op or voice (@,+) not match, then update the existing name
    function _addName(newNick, channel) {
      if (!newNick) return;
      if (newNick.length < 1) return;
      // console.log('Adding ' + newNick + ' to ' + channel);
      let channelIndex = ircState.channels.indexOf(channel.toLowerCase());
      if (channelIndex >= 0) {
        let nickCount = ircState.channelStates[channelIndex].names.length;
        if (nickCount > 0) {
          let matchIndex = -1;
          let opChar = '';
          let pureNewNick = newNick;
          if (nicknamePrefixChars.indexOf(pureNewNick.charAt(0)) >= 0) {
            pureNewNick = pureNewNick.slice(1, pureNewNick.length);
          }
          for (let i=0; i<nickCount; i++) {
            let pureNick = ircState.channelStates[channelIndex].names[i];
            if (nicknamePrefixChars.indexOf(pureNick.charAt(0)) >= 0) {
              opChar = pureNick.charAt(0);
              pureNick = pureNick.slice(1, pureNick.length);
            }
            if (pureNewNick === pureNick) matchIndex = i;
          }
          if (matchIndex >= 0) {
            // case of name exist, if @ or + prefix not match replace entire string
            if (ircState.channelStates[channelIndex].names[matchIndex] !== newNick) {
              ircState.channelStates[channelIndex].names[matchIndex] = newNick;
            }
          } else {
            // case of nick not in list, add it
            ircState.channelStates[channelIndex].names.push(newNick);
          }
        } else {
          // case of empty list, add as first nick name
          ircState.channelStates[channelIndex].names.push(newNick);
        }
      }
      return;
    } // _addName()

    // Remove a nicname to channel array list
    // Ignore op or voice (@,+) when removing
    function _removeName(oldNick, channel) {
      // console.log('Removing ' + oldNick + ' from ' + channel);
      let channelIndex = ircState.channels.indexOf(channel.toLowerCase());
      if (channelIndex >= 0) {
        let nickCount = ircState.channelStates[channelIndex].names.length;
        if (nickCount > 0) {
          let matchIndex = -1;
          let pureOldNick = oldNick;
          if (nicknamePrefixChars.indexOf(pureOldNick.charAt(0)) >= 0) {
            pureOldNick = pureOldNick.slice(1, pureOldNick.length);
          }
          for (let i=0; i<nickCount; i++) {
            let pureNick = ircState.channelStates[channelIndex].names[i];
            if (nicknamePrefixChars.indexOf(pureNick.charAt(0)) >= 0) {
              pureNick = pureNick.slice(1, pureNick.length);
            }
            // console.log('pureOldNick pureNick' + pureOldNick + ' ' + pureNick);
            if (pureOldNick === pureNick) matchIndex = i;
          }
          if (matchIndex >= 0) {
            ircState.channelStates[channelIndex].names.splice(matchIndex, 1);
          }
        }
      }
      return;
    } // _removeName()

    //
    // Decoding complete, Parse commands
    //
    switch(parsedMessage.command) {
      case '001':
        // case of successful register with nickname, set registered state
        ircState.ircRegistered = true;
        ircState.times.ircConnect = timestamp();
        ircState.count.ircConnect++;

        // extract my client info from last argument in 001 message
        let splitparams1 = parsedMessage.params[1].split(' ');
        let parsedNick = splitparams1[splitparams1.length - 1].split('!')[0];
        let parsedUserhost = splitparams1[splitparams1.length - 1].split('!')[1];
        if (parsedNick === ircState.nickName) {
          // console.log(parsedUserhost);
          ircState.userHost = parsedUserhost;
          global.sendToBrowser('UPDATE\n');
          //
          // nickserv registration
          //
          if ((nsIdentifyNick.length > 0) && (nsIdentifyCommand.length > 0)) {
            setTimeout(function() {
              if ((ircState.ircConnected) &&
                (ircState.nickName === nsIdentifyNick)) {
                _writeSocket(socket, nsIdentifyCommand);
              }
            }.bind(this), 1500);
          }
        } else {
          global.sendToBrowser(
            'webServer: Registration error, unable to parse nick!user@host from message 001\n');
          socket.destroy();
          ircState.ircConnecting = false;
          ircState.ircConnected = false;
          ircState.ircRegistered = false;
          ircState.ircIsAway = false;
          global.sendToBrowser('UPDATE\n');
        }
        break;
      // 305 RPL_UNAWAY
      case '305':
        if (true) {
          if (parsedMessage.params[0].toLowerCase() === ircState.nickName.toLowerCase()) {
            ircState.ircIsAway = false;
            global.sendToBrowser('UPDATE\n');
          }
        }
        break;
      // 305 RPL_NOWAWAY
      case '306':
        if (true) {
          if (parsedMessage.params[0].toLowerCase() === ircState.nickName.toLowerCase()) {
            ircState.ircIsAway = true;
            global.sendToBrowser('UPDATE\n');
          }
        }
        break;
      //
      // 332 RPL_TOPIC
      // TODO RFC2812 conflict, channel is params[0] (no nickname)
      case '332':
        if (true) {
          let channelName = parsedMessage.params[1].toLowerCase();
          let index = ircState.channels.indexOf(channelName);
          if (index >= 0) {
            // case of already exist
            ircState.channelStates[index].topic = parsedMessage.params[2];
            global.sendToBrowser('UPDATE\n');
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
            let index = ircState.channels.indexOf(channelName);
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
          global.sendToBrowser('UPDATE\n');
        }
        break;
      //
      // 433 ERR_NICKNAMEINUSE
      //
      case '433':
        if (true) {
          // Connect to IRC has failed, nickname already in use, disconnect to try again
          if (!ircState.ircRegistered) {
            if (socket) {
              socket.destroy();
              ircState.ircConnecting = false;
              ircState.ircConnected = false;
              ircState.ircRegistered = false;
              ircState.ircIsAway = false;
              global.sendToBrowser('UPDATE\n');
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
          if (!ircState.ircRegistered) {
            if (socket) {
              socket.destroy();
              ircState.ircConnecting = false;
              ircState.ircConnected = false;
              ircState.ircRegistered = false;
              ircState.ircIsAway = false;
              global.sendToBrowser('UPDATE\n');
            }
          }
        }
        break;
      //
      case 'ERROR':
        console.log(message.toString('utf8'));
        global.sendToBrowser('UPDATE\n');
        break;
      //
      case 'JOIN':
        if (true) {
          let channelName = parsedMessage.params[0].toLowerCase();
          let index = ircState.channels.indexOf(channelName);
          if (index >= 0) {
            // case of already exist
            if (parsedMessage.nick === ircState.nickName) {
              ircState.channelStates[index].topic = '';
              ircState.channelStates[index].names = [];
              ircState.channelStates[index].joined = true;
              ircState.channelStates[index].kicked = false;
              global.sendToBrowser('UPDATE\n');
            } else {
              // case of different user for user list
              _addName(parsedMessage.nick, parsedMessage.params[0]);
              global.sendToBrowser('UPDATE\n');
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
            ircState.channels.push(channelName);
            ircState.channelStates.push(chanState);
            global.sendToBrowser('UPDATE\n');
          }
        }
        break;
      //
      case 'KICK':
        if (true) {
          let channelName = parsedMessage.params[0].toLowerCase();
          let index = ircState.channels.indexOf(channelName);
          if (parsedMessage.params[1] === ircState.nickName) {
            // case of me, I was kicked
            ircState.channelStates[index].topic = '';
            ircState.channelStates[index].names = [];
            ircState.channelStates[index].joined = false;
            ircState.channelStates[index].kicked = true;
            global.sendToBrowser('UPDATE\n');
          } else {
            // case of someone else was kicked
            _removeName(parsedMessage.params[1], parsedMessage.params[0]);
            global.sendToBrowser('UPDATE\n');
          }
        }
        break;
      //
      case 'MODE':
        if (true) {
          if (parsedMessage.params[0] === ircState.nickName) {
            // Case of User mode for IRC client has changed
            // console.log('TODO your user mode on server has been changed changed.');
          } else if (ircState.channels.indexOf(parsedMessage.params[0].toLowerCase() >= 0)) {
            // This is case of a #channel mode has changed.
            parseChannelModeChanges(socket, parsedMessage);
          } else {
            console.log('Error: MODE message not for myself or channel');
          }
        }
        break;

      case 'NICK':
        if (true) {
          if ((parsedMessage.nick === ircState.nickName) &&
            (parsedMessage.host === ircState.userHost)) {
            ircState.nickName = parsedMessage.params[0];
          }
          if (ircState.channels.length > 0) {
            let previousNick = parsedMessage.nick;
            let nextNick = parsedMessage.params[0];
            _exchangeNames(previousNick, nextNick);
          }
          global.sendToBrowser('UPDATE\n');
        }
        break;
      //
      case 'PART':
        if (true) {
          let channelName = parsedMessage.params[0].toLowerCase();
          let index = ircState.channels.indexOf(channelName);
          if (index >= 0) {
            if (parsedMessage.nick === ircState.nickName) {
              // case of me, I have parted the channel
              ircState.channelStates[index].topic = '';
              ircState.channelStates[index].names = [];
              ircState.channelStates[index].joined = false;
              ircState.channelStates[index].kicked = false;
              global.sendToBrowser('UPDATE\n');
            } else {
              // case of other user
              _removeName(parsedMessage.nick, parsedMessage.params[0]);
              global.sendToBrowser('UPDATE\n');
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
            _parseCtcpMessage(socket, parsedMessage);
          }
        }
        break;
      case 'QUIT':
        if (true) {
          if (parsedMessage.nick !== ircState.nickname) {
            // case of it is not me who QUIT
            if (ircState.channels.length > 0) {
              for (let i = 0; i<ircState.channels.length; i++) {
                if (ircState.channelStates[i].joined) {
                  _removeName(parsedMessage.nick, ircState.channels[i]);
                  global.sendToBrowser('UPDATE\n');
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
          let index = ircState.channels.indexOf(channelName);
          if (index >= 0) {
            // case of already exist
            ircState.channelStates[index].topic = parsedMessage.params[1];
            global.sendToBrowser('UPDATE\n');
          } else {
            console.log('Error message TOPIC for non-existant channel');
          }
        }
        break;
      //
      default:
    }
  }; // _parseBufferMessage

  // -------------------------------------------------------------------------
  // Process Buffer object from socket stream
  //
  // Combine previous message fragment with incoming Buffer of UTF-8 characters
  // Split stream into messages using CR-LF 0x10 0x13 as message delimiter
  // Pass each message to message parse function as type Buffer
  // If left over characters not terminated in CR-LF, save as next fragment
  // -------------------------------------------------------------------------
  var previousBufferFragment = Buffer.from('');
  const parseStreamBuffer = function (socket, inBuffer) {
    if (!inBuffer) return;
    if (!Buffer.isBuffer(inBuffer)) return;
    let data = Buffer.concat([previousBufferFragment, inBuffer]);
    previousBufferFragment = Buffer.from('');
    let len = data.length;
    if (len === 0) return;
    let index = 0;
    let count = 0;
    for (let i=0; i<len; i++) {
      // this is a 8 bit integer
      let charCode = data.readUInt8(i);
      if ((charCode !== 10) && (charCode !== 13)) {
        // valid message character
        count = count + 1;
      } else {
        // case of CR or LF as message separator
        if (count > 0) {
          let message = data.slice(index, index + count);
          // 512 btye maximum size from RFC 2812 2.3 Messages
          if ((Buffer.isBuffer(message)) && (message.length <= 512)) {
            _parseBufferMessage(socket, message);
          } else {
            console.log('Error, extracted message not type Buffer with length <= 512 btyes');
          }
        }
        index = i + 1;
        count = 0;
      }
    }
    if (count > 0) {
      previousBufferFragment = data.slice(index, index + count);
    }
  }; // parseStreamBuffer


  // -----------------------------------------------------------------------------
  //   On Data Event handler
  // -----------------------------------------------------------------------------
  // UTF8 data coming in over web socket can break input lines
  // such that message block may not end in a CR-LF or LF.
  // Therefore it is necessary to parse stream character by character,
  // remove the CR, split by LF, but if the message data block
  // does not end in a LF, then wait for next data and merge old and new message.
  // -----------------------------------------------------------------------------

  // left over string characters from previous message block
  var lastLineFromStream = '';
  const _dataEventHandler = function(socket, data) {
    parseStreamBuffer(socket, data);
  }; // _dataEventHandler

  // -----------------------------------------------------
  //
  //          R O U T E   H A N D L E R S
  //
  //        connectHandler is main function
  //
  // -----------------------------------------------------
  //  Includes all socket event listeners
  // -----------------------------------------------------

  //----------------------------------------
  // Cycle server from available server list
  //
  // Route: /server
  //----------------------------------------
  const serverHandler = function(req, res, next) {
    if ((!('serverArray' in servers)) || (servers.serverArray.length < 1)) {
      return res.json({
        error: true,
        message: 'Server list empty.'
      });
    }
    if (servers.serverArray.length === 1) {
      return res.json({
        error: true,
        message: 'Only 1 server, can not cycle.'
      });
    }
    ircState.ircServerIndex++;
    if (ircState.ircServerIndex >= servers.serverArray.length) {
      ircState.ircServerIndex = 0;
    }
    ircState.ircServerName = servers.serverArray[ircState.ircServerIndex].name;
    ircState.ircServerHost = servers.serverArray[ircState.ircServerIndex].host;
    ircState.ircServerPort = servers.serverArray[ircState.ircServerIndex].port;
    ircState.ircTLSEnabled = servers.serverArray[ircState.ircServerIndex].tls;
    ircServerPassword = servers.serverArray[ircState.ircServerIndex].password;
    nsIdentifyNick = servers.serverArray[ircState.ircServerIndex].identifyNick;
    nsIdentifyCommand = servers.serverArray[ircState.ircServerIndex].identifyCommand;
    ircState.channelList = servers.serverArray[ircState.ircServerIndex].channelList;

    ircState.nickName = servers.serverArray[ircState.ircServerIndex].nick;
    ircState.userName = servers.serverArray[ircState.ircServerIndex].user;
    ircState.realName = servers.serverArray[ircState.ircServerIndex].real;
    ircState.userMode = servers.serverArray[ircState.ircServerIndex].modes;
    ircState.userHost = '';

    ircLog.setRawMessageLogEnabled(servers.serverArray[ircState.ircServerIndex].rawMessageLog);

    global.sendToBrowser('UPDATE\n');

    return res.json({
      error: false,
      message: null,
      index: ircState.ircServerIndex,
      name: ircState.ircServerName
    });
  };

  // placeholder
  var ircSocket = null;
  // -----------------------------------------------------
  // API connect request handler (Called by browser)
  //
  // Route: /connect
  // -----------------------------------------------------
  const connectHandler = function(req, res, next) {
    // console.log('connect handler called');
    // Abort if already connected.
    if ((ircState.ircConnected) || (ircState.ircConnecting)) {
      return res.json({
        error: true,
        message: 'Error: already connected to IRC server.'
      });
    }


    // TODO add size validation, character allowlist
    ircState.nickName = req.body.nickName;
    ircState.userName = req.body.userName;
    ircState.realName = req.body.realName;
    ircState.userMode = req.body.userMode;

    // channels here on connect, browser on disconnect
    ircState.channels = [];
    ircState.channelStates = [];
    ircState.ircConnected = false;
    ircState.ircConnecting = true;
    ircState.ircRegistered = false;
    ircState.ircIsAway = false;

    let connectMessage = 'webServer: Opening socket to ' + ircState.ircServerName + ' ' +
      ircState.ircServerHost + ':' + ircState.ircServerPort;
    if (ircState.ircTLSEnabled) {
      connectMessage += ' (TLS)';
    }
    global.sendToBrowser('UPDATE\n' + connectMessage + '\n');

    if (ircState.ircTLSEnabled) {
      ircSocket = new tls.TLSSocket();
    } else {
      ircSocket = new net.Socket();
    }

    // ----------------------------------------------------------------
    // THis function will be replaced at the time of connect request
    // so that any connect errors can be returned to web browser via
    // the response object.
    // This will deep the node response object within scope of the
    // customErrorResponse function.
    // I will be restored to his generic version after connect.
    // ----------------------------------------------------------------
    const genericErrorResponse = function(err) {
      // dummy function to be replaced
      global.sendToBrowser('webServer: IRC Server socket error occurred.\n');
      if (!ircSocket.writable) {
        ircState.ircConnecting = false;
        ircState.ircConnected = false;
        ircState.ircRegistered = false;
        ircState.ircIsAway = false;
        global.sendToBrowser('UPDATE\nwebServer: Socket not writable, connected flags reset\n');
      }
    };

    // ---------------------------------------------------
    // This error function is only used during connecting
    // ---------------------------------------------------
    const connectingErrorResponse = function(err) {
      // Response to POST request
      ircState.ircConnecting = false;
      ircState.ircConnected = false;
      ircState.ircRegistered = false;
      ircState.ircIsAway = false;
      // Send some over over websocket too
      let errMsg = 'UPDATE\nwebServer: Error opening TCP socket to ' +
        ircState.ircServerName + ' ' +
        ircState.ircServerHost + ':' + ircState.ircServerPort;
      if (err) {
        errMsg += 'webServer: ' + err.toString();
      }
      global.sendToBrowser(errMsg + '\n');
      res.json({
        error: true,
        message: 'Error occurred attempting to open IRC server TCP socket'
      });
    };

    // ---------------------------------------
    // variable to hold transient error handler
    // ---------------------------------------
    var customErrorResponse = connectingErrorResponse;

    // --------------------------
    //   On Error   (IRC client socket)
    // --------------------------
    ircSocket.on('error', function(err) {
      console.log('IRC Server socket error occurred.');
      console.log(err);

      // This does not return if res.json(...)
      customErrorResponse(err);
    });

    // --------------------------------------------------
    //   On Connect   (IRC client socket connected)
    // --------------------------------------------------
    ircSocket.on('connect', function() {
      // console.log('Event: connect');
      global.sendToBrowser('webServer: Connected\n');
      // replace connect error handler
      customErrorResponse = genericErrorResponse;
    });

    // -----------
    //  On Ready
    // -----------
    ircSocket.on('ready', function() {
      // console.log('Event: ready');
      _readyEventHandler(ircSocket);
    }); // ircSocket.on('ready'

    // -----------
    // ON Data
    // -----------
    ircSocket.on('data', function(data) {
      _dataEventHandler(ircSocket, data);
    });

    // -------------------------------------------
    //   On Close    (IRC client socket closed)
    // -------------------------------------------
    ircSocket.on('close', function(hadError) {
      console.log('Event: close, hadError=' + hadError + ' destroyed=' + ircSocket.destroyed);
      ircState.ircConnecting = false;
      ircState.ircConnected = false;
      ircState.ircRegistered = false;
      ircState.ircIsAway = false;
      global.sendToBrowser('UPDATE\nwebServer: Socket to IRC server closed, hadError: ' +
        hadError.toString() + '\n');
    });

    // ----------------------------------
    // All even listeners are created
    // Go ahead can connect the socket.
    // ----------------------------------
    ircSocket.connect(ircState.ircServerPort, ircState.ircServerHost, function() {
      let now = new Date();
      let timeString = now.toISOString() + ' ';
      // console.log(timeString + 'Connected to IRC server ' + ircState.ircServerName + ' ' +
      //   ircState.ircServerHost + ':'+ ircState.ircServerPort);
      ircLog.writeIrcLog('Connected to IRC server ' + ircState.ircServerName + ' ' +
        ircState.ircServerHost + ':'+ ircState.ircServerPort);
      res.json({error: false});
    });
  }; // connectHandler()

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
          let index = ircState.channels.indexOf(outboundArg1.toLowerCase());
          if ((index >= 0) && (ircState.channelStates[index].joined)) {
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
            ircState.channelStates[index].names = [];
          }
        }
        return {error: false};
        break;
      case 'NAMES':
        if (true) {
          let index = ircState.channels.indexOf(outboundArg1.toLowerCase());
          // Clear names list, a new one will arrive after join
          if (index >= 0) {
            ircState.channelStates[index].names = [];
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
          let index = ircState.channels.indexOf(outboundArg1.toLowerCase());
          if ((index >= 0) && (ircState.channelStates[index].joined)) {
            let fromMessage = timestamp() + ' ' +
            ':' + ircState.nickName + '!*@* ' + message;
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
          if (channelPrefixChars.indexOf(firstChar) < 0) {
            let fromMessage = timestamp() + ' ' +
              ':' + ircState.nickName + '!*@* ' + message;
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
          let index = ircState.channels.indexOf(outboundArg1.toLowerCase());
          if ((index >= 0) && (ircState.channelStates[index].joined)) {
            let fromMessage = timestamp() + ' ' +
            ':' + ircState.nickName + '!*@* ' + message;
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
          if (channelPrefixChars.indexOf(firstChar) < 0) {
            let fromMessage = timestamp() + ' ' +
              ':' + ircState.nickName + '!*@* ' + message;
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

  // ------------------------------------------------------
  // Node/Express (req, res, next) routes
  // ------------------------------------------------------

  // ------------------------------------------------------
  // IRC commands from browser for send to IRC server
  //
  // Route:  /message
  //
  // ------------------------------------------------------
  const messageHandler = function(req, res, next) {
    // console.log(req.body);
    let message = req.body.message;
    if (message.length > 0) {
      if (message.length <= 512) {
        // And parse for commands that change state or
        // that require dummy server messages for cached display.
        let parseResult = parseBrowserMessageForCommand(message);
        if (parseResult.error) {
          console.log(parseResult.message);
          res.json({error: true, message: parseResult.message});
        } else {
          // Send browser message on to web server
          _writeSocket(ircSocket, message);
          res.json({error: false});
        }
      } else {
        res.json({error: true, message: 'Message exceeds 512 character maximum length'});
      }
    } else {
      res.json({error: true, message: 'Empty message'});
    }
  }; // messageHandler

  // ------------------------------------
  //  API handler for forced disconnect
  //
  //  Route: /disconnect
  // ------------------------------------
  const disconnectHandler = function(req, res, next) {
    // console.log('disconnect handler called');
    global.sendToBrowser('webServer: Forcibly closing IRC server TCP socket\n');
    if (ircSocket) {
      ircSocket.destroy();
      ircState.ircConnecting = false;
      ircState.ircConnected = false;
      ircState.ircRegistered = false;
      ircState.ircIsAway = false;
      global.sendToBrowser('UPDATE\n');
      res.json({error: false});
    } else {
      res.json({error: true, message: 'Error Can not destry socket before it is created.'});
    }
  };

  // ---------------------------------------------------
  // Get status of Browser to web server connection
  //
  // Route: /getircstate
  // ---------------------------------------------------
  const getIrcState = function(req, res, next) {
    ircState.websocketCount = global.getWebsocketCount();
    res.json(ircState);
  };

  // -----------------------------------------------
  // Request backend to return all of cache to browser
  //
  // Route: /cache
  // -----------------------------------------------
  const getCache = function(req, res, next) {
    let outArray = ircMessageCache.allMessages();
    res.json(outArray);
  };

  // -----------------------------------------------
  // Request backend erase cache
  //
  // Route: /erase
  // -----------------------------------------------
  const eraseCache = function(req, res, next) {
    // console.log(JSON.stringify(req.body));
    if (('erase' in req.body) && (req.body.erase === 'YES')) {
      ircMessageCache.eraseCache();
      res.json({error: false});
    } else {
      let error = new Error('Bad Reqeust');
      error.status = 400;
      next(error);
    }
  };

  const test1Handler = function(req, res, next) {
    console.log('test1 handler called');
    // -------- test code here -----------------
    // -----------------------------------------
    res.json({
      error: false,
      comment: 'Debug message cache',
      data: ircMessageCache.cacheInfo()
    });
  };

  const test2Handler = function(req, res, next) {
    console.log('test2 handler called');
    // -------- test code here -----------------
    // -----------------------------------------
    res.json({
      error: false,
      comment: 'node.js memory',
      data: process.memoryUsage()
    });
  };

  // Program run timestamp
  ircState.times.programRun = timestamp();

  //
  // 1 second utility timer
  //
  setInterval(function() {
    ctcpTimerTick();
  }.bind(this), 1000);

  module.exports = {
    serverHandler: serverHandler,
    connectHandler: connectHandler,
    messageHandler: messageHandler,
    disconnectHandler: disconnectHandler,
    getIrcState: getIrcState,
    getCache: getCache,
    eraseCache: eraseCache,
    test1Handler: test1Handler,
    test2Handler: test2Handler
  };
}());
