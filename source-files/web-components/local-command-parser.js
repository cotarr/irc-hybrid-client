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
// ------------------------------------------------------------------------------
//
//    Parse outgoing user input to detect and handle IRC user commands
//
// ------------------------------------------------------------------------------
// This is the command input parser to interpret and execute IRC text commands.
// If commands are detected (such as /JOIN), then the proper command
// is sent to the remote server for processing.
//
// Public Methods
//      textCommandParser(inputObj)
//
// ------------------------------------------------------------------------------
'use strict';
window.customElements.define('local-command-parser', class extends HTMLElement {
  autoCompleteCommandList = [
    '/ADMIN',
    '/AWAY',
    '/CTCP',
    '/DEOP',
    '/DEVOICE',
    '/JOIN',
    '/LIST',
    '/ME',
    '/MODE',
    '/MOTD',
    '/MSG',
    '/NICK',
    '/NOP',
    '/NOTICE',
    '/OP',
    '/PART',
    '/QUERY',
    '/QUIT',
    '/QUOTE',
    '/TOPIC',
    '/VERSION',
    '/VOICE',
    '/WHO',
    '/WHOIS'
  ];

  autoCompleteRawCommandList = [
    'ADMIN',
    'AWAY',
    'CAP',
    'CONNECT',
    'DIE',
    'DISCONNECT',
    'ERROR',
    'GLINE',
    'HELP',
    'INFO',
    'INVITE',
    'ISON',
    'JOIN',
    'KICK',
    'KILL',
    'KLINE',
    'LINKS',
    'LIST',
    'LUSERS',
    // 'METADATA',
    'MODE',
    'MOTD',
    'NAMES',
    'NICK',
    // 'NJOIN',
    'NOTICE',
    'OPER',
    'PART',
    'PASS',
    'PING',
    'PONG',
    'PRIVMSG',
    'QUIT',
    'REHASH',
    'RESTART',
    // 'SERVER',
    // 'SERVICE',
    'SERVLIST',
    'SQUERY',
    'SQUIT',
    'STATS',
    // 'SVSNICK',
    'SUMMON',
    'TIME',
    'TOPIC',
    'TRACE',
    'USER',
    'USERHOST',
    'USERS',
    'VERSION',
    'WALLOPS',
    // 'WEBIRC',
    'WHO',
    'WHOIS',
    'WHOWAS'
  ];

  // --------------------------------------------------------
  // inputObj = {
  //   inputString: '/'+command [arguments...]
  //   originType: ('channel', 'private', 'generic')
  //   originName: (target channel or target private message nickname)
  // }
  //
  // returnObj = {
  //   error: false,
  //   message: null, (for or string if error)
  //   ircMessage: '<command> [<argument1>] [<augument2] ... [:Some output string value]'
  // }
  //
  // --------------------------------------------------------

  /**
   * This is the command input parser to interpret and
   * execute IRC text commands, such as /JOIN
   * @param {Object} inputObj - User keyboard input with meta-data
   */
  textCommandParser = (inputObj) => {
    const channelPrefixChars =
      document.getElementById('globVars').constants('channelPrefixChars');
    /**
     * Internal function to open server window
     */
    const _showIrcServerPanel = () => {
      document.getElementById('ircServerPanel').showPanel();
      document.dispatchEvent(new CustomEvent('cancel-zoom'));
    };

    // Internal function, detect whitespace character
    const _isWS = (inChar) => {
      if (inChar.charAt(0) === ' ') return true;
      if (inChar.charCodeAt(0) === 9) return true;
      return false;
    };
    const _isEOL = (inChar) => {
      if (inChar.charAt(0) === '\n') return true;
      if (inChar.charAt(0) === '\r') return true;
      return false;
    };

    let inStr = inputObj.inputString;

    // If tailing CR-LF, remove them
    if ((inStr.length > 0) && (_isEOL(inStr.charAt(inStr.length - 1)))) {
      inStr = inStr.slice(0, inStr.length - 1);
    }
    if ((inStr.length > 0) && (_isEOL(inStr.charAt(inStr.length - 1)))) {
      inStr = inStr.slice(0, inStr.length - 1);
    }

    const inStrLen = inStr.length;

    // Example decoded line
    //
    // "input string": "/test one two three four five six seven eight",
    //
    // parsedCommand {
    //   "command": "test",
    //   "params": [
    //     null,
    //     "one",
    //     "two",
    //     "three",
    //     "four",
    //     "five"
    //   ],
    //   "restOf": [
    //     "one two three four five six seven eight",
    //     "two three four five six seven eight",
    //     "three four five six seven eight",
    //     "four five six seven eight",
    //     "five six seven eight",
    //     "six seven eight"
    //   ]
    // }
    //
    const parsedCommand = {
      command: '',
      params: [],
      restOf: []
    };

    if (inStr.length < 2) {
      return {
        error: true,
        message: 'Error no command not found',
        ircMessage: null
      };
    }

    if (inStr.charAt(0) !== '/') {
      return {
        error: true,
        message: 'Error missing / before command',
        ircMessage: null
      };
    }
    if (_isWS(inStr.charAt(1))) {
      return {
        error: true,
        message: 'Error space after slash',
        ircMessage: null
      };
    }

    // character index, start after slash /
    let idx = 1;

    // ----------------
    // C O M M A N D
    // ----------------
    // parse command chars until whitespace or end of string
    while ((!_isWS(inStr.charAt(idx))) && (idx < inStrLen)) {
      parsedCommand.command += inStr.charAt(idx);
      idx++;
    }
    // advance past and ignore whitespace chars until non-whitespace or end of string
    while ((_isWS(inStr.charAt(idx))) && (idx < inStrLen)) {
      idx++;
    }
    // case of command only, no tailing parameter date
    parsedCommand.command = parsedCommand.command.toUpperCase();

    // no array data pushed
    // else... more data to parse
    if (inStr.slice(idx, inStrLen).length > 0) {
      parsedCommand.params.push(null);
      parsedCommand.restOf.push(inStr.slice(idx, inStrLen));

      // ------------------------------------
      // No Param, but all is ending string
      // ------------------------------------
      // parse param chars until whitespace or end of string
      let chars1 = '';
      while ((!_isWS(inStr.charAt(idx))) && (idx < inStrLen)) {
        chars1 += inStr.charAt(idx);
        idx++;
      }
      // advance past and ignore whitespace chars until non-whitespace or end of string
      while ((_isWS(inStr.charAt(idx))) && (idx < inStrLen)) {
        idx++;
      }
      // if more to parse remaining
      if (inStr.slice(idx, inStrLen).length > 0) {
        parsedCommand.params.push(chars1);
        parsedCommand.restOf.push(inStr.slice(idx, inStrLen));
        // ------------------------------------
        // One parameter plus optional ending string
        // ------------------------------------
        // parse command chars until whitespace or end of string
        let chars2 = '';
        while ((!_isWS(inStr.charAt(idx))) && (idx < inStrLen)) {
          chars2 += inStr.charAt(idx);
          idx++;
        }
        // advance past and ignore whitespace chars until non-whitespace or end of string
        while ((_isWS(inStr.charAt(idx))) && (idx < inStrLen)) {
          idx++;
        }
        // if more to parse remaining
        if (inStr.slice(idx, inStrLen).length > 0) {
          parsedCommand.params.push(chars2);
          parsedCommand.restOf.push(inStr.slice(idx, inStrLen));
          // ------------------------------------
          // Two parameter plus optional ending string
          // ------------------------------------
          // parse command chars until whitespace or end of string
          let chars3 = '';
          while ((!_isWS(inStr.charAt(idx))) && (idx < inStrLen)) {
            chars3 += inStr.charAt(idx);
            idx++;
          }
          // advance past and ignore whitespace chars until non-whitespace or end of string
          while ((_isWS(inStr.charAt(idx))) && (idx < inStrLen)) {
            idx++;
          }
          // if more to parse remaining
          if (inStr.slice(idx, inStrLen).length > 0) {
            parsedCommand.params.push(chars3);
            parsedCommand.restOf.push(inStr.slice(idx, inStrLen));
            // ------------------------------------
            // Three parameter plus optional ending string
            // ------------------------------------
            // parse command chars until whitespace or end of string
            let chars4 = '';
            while ((!_isWS(inStr.charAt(idx))) && (idx < inStrLen)) {
              chars4 += inStr.charAt(idx);
              idx++;
            }
            // advance past and ignore whitespace chars until non-whitespace or end of string
            while ((_isWS(inStr.charAt(idx))) && (idx < inStrLen)) {
              idx++;
            }
            // if more to parse remaining
            if (inStr.slice(idx, inStrLen).length > 0) {
              parsedCommand.params.push(chars4);
              parsedCommand.restOf.push(inStr.slice(idx, inStrLen));
              // ------------------------------------
              // Four parameter plus optional ending string
              // ------------------------------------
              // parse command chars until whitespace or end of string
              let chars5 = '';
              while ((!_isWS(inStr.charAt(idx))) && (idx < inStrLen)) {
                chars5 += inStr.charAt(idx);
                idx++;
              }
              // advance past and ignore whitespace chars until non-whitespace or end of string
              while ((_isWS(inStr.charAt(idx))) && (idx < inStrLen)) {
                idx++;
              }
              // if more to parse remaining
              if (inStr.slice(idx, inStrLen).length > 0) {
                parsedCommand.params.push(chars5);
                parsedCommand.restOf.push(inStr.slice(idx, inStrLen));
                //
                // TBD if deepend needed go another cycle here
                //
              } // after 4 parameters + optional string
            } // after 3 param + optional string
          } // after 2 param + optional string
        } // after 1 param + optional string
      } // after no param + optional string
    } // after command

    // -----------------------------------------------------------
    // Internal function to handle commands such as /VOICE
    //
    // modevalue: '+' or '-'
    // chanUserMode: letter, such as "v" and "o"
    // ircCommand: irc text command such ans "VOICE" and "OP"
    //
    // Success return example:
    //
    // {
    //   error: false,
    //   message: '',
    //   ircMessage: '/MODE #channel +vvv nick1 nick2 nick3'
    // }
    //
    // Error return example:
    //
    // {
    //   error: true,
    //   message: 'Expect: /VOICE <nick1> ... [nick5]',
    //   ircMessage: null
    // }
    //
    // -----------------------------------------------------------
    const _parseChannelModes = (modeValue, chanUserMode, ircCommand, parsedCommand, inputObj) => {
      if (inputObj.originType !== 'channel') {
        return {
          error: true,
          message: '' + ircCommand + ' must be used in channel widnow',
          ircMessage: null
        };
      } else if (parsedCommand.params.length > 0) {
        const nameArray = [];
        if (parsedCommand.params.length === 1) {
          nameArray.push(parsedCommand.restOf[0]);
        } else {
          for (let i = 1; i < parsedCommand.params.length; i++) {
            nameArray.push(parsedCommand.params[i]);
          }
          nameArray.push(parsedCommand.restOf[parsedCommand.restOf.length - 1]);
        }
        if (nameArray.length > 5) {
          return {
            error: true,
            message: '' + ircCommand + ' command maximum of 5 names exceeded',
            ircMessage: null
          };
        } else if (channelPrefixChars.indexOf(nameArray[0].charAt(0)) >= 0) {
          return {
            error: true,
            message: '' + ircCommand + ' command does not accept the channel name.',
            ircMessage: null
          };
        } else {
          const returnObj = {
            error: false,
            message: '',
            ircMessage: null
          };
          returnObj.ircMessage = 'MODE ';
          returnObj.ircMessage += inputObj.originName + ' ' + modeValue;
          for (let i = 0; i < nameArray.length; i++) {
            returnObj.ircMessage += chanUserMode;
          }
          for (let i = 0; i < nameArray.length; i++) {
            returnObj.ircMessage += ' ' + nameArray[i];
          }
          return returnObj;
        }
      } else {
        return {
          error: true,
          message: 'Expect: /' + ircCommand + ' <nick1> ... [nick5]',
          ircMessage: null
        };
      }
    }; // _parseChannelModes()

    // console.log('Remain: >' + inStr.slice(idx, inStrLen) + '<');
    // console.log('textCommandParser inputObj:' + JSON.stringify(inputObj, null, 2));
    // console.log('parsedCommand ' + JSON.stringify(parsedCommand, null, 2));

    // default message
    let ircMessage = null;

    switch (parsedCommand.command) {
      //
      case 'ADMIN':
        _showIrcServerPanel();
        ircMessage = 'ADMIN';
        if (parsedCommand.restOf.length === 1) {
          ircMessage = 'ADMIN ' + parsedCommand.restOf[0];
        }
        break;
      //
      case 'AWAY':
        _showIrcServerPanel();
        ircMessage = 'AWAY';
        if (parsedCommand.restOf.length > 0) {
          ircMessage = 'AWAY :' + parsedCommand.restOf[0];
        }
        break;
      //
      case 'CTCP':
        {
          const ctcpDelim = 1;
          if (parsedCommand.params.length !== 2) {
            return {
              error: true,
              message: 'Expect: /CTCP <nickname> <ctcp_command>',
              ircMessage: null
            };
          }
          ircMessage = 'PRIVMSG ' + parsedCommand.params[1] + ' :' +
            String.fromCharCode(ctcpDelim) + parsedCommand.restOf[1].toUpperCase() +
            String.fromCharCode(ctcpDelim);
        }
        break;
      //
      case 'DEOP':
        {
          const ro = _parseChannelModes('-', 'o', 'DEOP', parsedCommand, inputObj);
          if (ro.error) {
            return ro;
          } else {
            ircMessage = ro.ircMessage;
          }
        }
        break;
      //
      case 'DEVOICE':
        {
          const ro = _parseChannelModes('-', 'v', 'DEVOICE', parsedCommand, inputObj);
          if (ro.error) {
            return ro;
          } else {
            ircMessage = ro.ircMessage;
          }
        }
        break;
      //
      case 'JOIN':
        if (parsedCommand.params.length < 1) {
          return {
            error: true,
            message: 'Expect: /JOIN <#channel>',
            ircMessage: null
          };
        }
        if (parsedCommand.params.length === 1) {
          ircMessage = 'JOIN ' + parsedCommand.restOf[0];
          // After the server adds the channel to the ircState.channels array,
          // The channel panel will be created automatically in manageChannelsPanel.
          // This array is to identify the IRC server as freshly created
          // as opposed to one that already exists during a browser page reload.
          document.getElementById('manageChannelsPanel')
            .ircChannelsPendingJoin.push(parsedCommand.restOf[0].toLowerCase());
        }
        if (parsedCommand.params.length === 2) {
          ircMessage = 'JOIN ' + parsedCommand.params[1] + ' ' + parsedCommand.restOf[1];
          document.getElementById('manageChannelsPanel')
            .ircChannelsPendingJoin.push(parsedCommand.params[1].toLowerCase());
        }
        break;
      //
      case 'LIST':
        _showIrcServerPanel();
        if (parsedCommand.params.length === 0) {
          ircMessage = 'LIST';
        } else {
          ircMessage = 'LIST ' + parsedCommand.restOf[0];
        }
        break;
      //
      case 'ME':
        {
          if (parsedCommand.params.length < 1) {
            return {
              error: true,
              message: 'Expect: /ME <action-message>',
              ircMessage: null
            };
          }
          const ctcpDelim = 1;
          if (inputObj.originType === 'channel') {
            ircMessage = 'PRIVMSG ' + inputObj.originName + ' :' + String.fromCharCode(ctcpDelim) +
              'ACTION ' + parsedCommand.restOf[0] + String.fromCharCode(ctcpDelim);
          }
          if (inputObj.originType === 'private') {
            ircMessage = 'PRIVMSG ' + inputObj.originName + ' :' + String.fromCharCode(ctcpDelim) +
              'ACTION ' + parsedCommand.restOf[0] + String.fromCharCode(ctcpDelim);
          }
        }
        break;
      //
      case 'MODE':
        // Default to user mode if not in channel
        if ((parsedCommand.restOf.length === 0) &&
          (inputObj.originType !== 'channel')) {
          // console.log('case 1');
          _showIrcServerPanel();
          ircMessage = 'MODE ' + window.globals.ircState.nickName;
        // case of own nickname is 1 of 1 parameters, fetch current user mode
        } else if ((parsedCommand.restOf.length === 1) &&
          (parsedCommand.restOf[0].toLowerCase() ===
            window.globals.ircState.nickName.toLowerCase())) {
          // console.log('case 2');
          _showIrcServerPanel();
          ircMessage = 'MODE ' + window.globals.ircState.nickName;
        // case of own nickname and new mode are parameters 1 and 2
        } else if ((parsedCommand.restOf.length === 2) &&
          (parsedCommand.params[1].toLowerCase() ===
            window.globals.ircState.nickName.toLowerCase()) &&
          (parsedCommand.restOf[1].length > 0)) {
          // console.log('case 3');
          _showIrcServerPanel();
          ircMessage = 'MODE ' + window.globals.ircState.nickName + ' ' + parsedCommand.restOf[1];
        // Default to channel mode if in channel
        } else if ((parsedCommand.restOf.length === 0) &&
          (inputObj.originType === 'channel')) {
          // console.log('case 4');
          ircMessage = 'MODE ' + inputObj.originName;
        //  case of only 1 parameter that starts with channel first character
        } else if ((parsedCommand.restOf.length === 1) &&
          (window.globals.ircState.channels.indexOf(parsedCommand.restOf[0].toLowerCase()) >= 0)) {
          // console.log('case 5');
          ircMessage = 'MODE ' + parsedCommand.restOf[0];
        //  case of in channel window and first param starts with + or - or b
        } else if ((parsedCommand.restOf.length > 0) &&
          (inputObj.originType === 'channel') &&
          ((parsedCommand.restOf[0].charAt(0) === '+') ||
          (parsedCommand.restOf[0].charAt(0) === '-') ||
          (parsedCommand.restOf[0].charAt(0) === 'b'))) {
          // console.log('case 6');
          ircMessage = 'MODE ' + inputObj.originName + ' ' + parsedCommand.restOf[0];
        //  case of only 1 parameter that starts with channel first character
        } else if ((parsedCommand.restOf.length > 1) &&
          (window.globals.ircState.channels.indexOf(parsedCommand.params[1].toLowerCase()) >= 0)) {
          // console.log('case 7');
          ircMessage = 'MODE ' + parsedCommand.params[1] + ' ' + parsedCommand.restOf[1];
        } else {
          return {
            error: true,
            message: 'Expect: /MODE <nickname> [user-mode] or /MODE <#channel> <channel-mode>',
            ircMessage: null
          };
        }
        break;
      //
      case 'MOTD':
        _showIrcServerPanel();
        ircMessage = 'MOTD';
        if (parsedCommand.restOf.length === 1) {
          ircMessage = 'MOTD ' + parsedCommand.restOf[0];
        }
        break;
      //
      case 'MSG':
        if ((parsedCommand.params.length > 1) &&
          (channelPrefixChars.indexOf(parsedCommand.params[1].charAt(0)) < 0)) {
          ircMessage = 'PRIVMSG ' + parsedCommand.params[1] + ' :' + parsedCommand.restOf[1];
        } else {
          return {
            error: true,
            message: 'Expect: /MSG <nickname> <message-text>',
            ircMessage: null
          };
        }
        break;
      //
      case 'NICK':
        if (parsedCommand.params.length < 1) {
          return {
            error: true,
            message: 'Expect: /NICK <new-nickname>',
            ircMessage: null
          };
        }
        _showIrcServerPanel();
        ircMessage = 'NICK ' + parsedCommand.restOf[0];
        break;
      //
      // No-Operation (invalid command)
      case 'NOP':
      // This is used to observe parsedCommand without command execution
        console.log('textCommandParser inputObj:' + JSON.stringify(inputObj, null, 2));
        console.log('parsedCommand ' + JSON.stringify(parsedCommand, null, 2));
        return {
          error: false,
          message: null,
          ircMessage: null
        };
        // break;
      //
      case 'NOTICE':
        // Note: this will send to either channel or user
        if ((parsedCommand.params.length > 1) && (parsedCommand.restOf[1].length > 0)) {
          ircMessage = 'NOTICE ' + parsedCommand.params[1] + ' :' + parsedCommand.restOf[1];
        } else {
          return {
            error: true,
            message: 'Expect: /NOTICE <nickname> <message-text>',
            ircMessage: null
          };
        }
        break;
      //
      case 'OP':
        {
          const ro = _parseChannelModes('+', 'o', 'OP', parsedCommand, inputObj);
          if (ro.error) {
            return ro;
          } else {
            ircMessage = ro.ircMessage;
          }
        }
        break;
      //
      case 'PART':
        if (parsedCommand.params.length < 1) {
          if (inputObj.originType === 'channel') {
            ircMessage = 'PART ' + inputObj.originName;
          } else {
            return {
              error: true,
              message: 'Expect: /PART #channel [Optional message]',
              ircMessage: null
            };
          }
        } else {
          if (parsedCommand.params.length === 1) {
            // specify channel without message
            ircMessage = 'PART ' + parsedCommand.restOf[0];
          } else {
            // specify channel and PART message
            ircMessage = 'PART ' + parsedCommand.params[1] + ' :' + parsedCommand.restOf[1];
          }
        }
        break;
      //
      case 'QUERY':
        if ((parsedCommand.params.length > 1) &&
          (channelPrefixChars.indexOf(parsedCommand.params[1].charAt(0)) < 0)) {
          ircMessage = 'PRIVMSG ' + parsedCommand.params[1] + ' :' + parsedCommand.restOf[1];
        } else {
          return {
            error: true,
            message: 'Expect: /QUERY <nickname> <message-text>',
            ircMessage: null
          };
        }
        break;
      //
      case 'QUIT':
        ircMessage = 'QUIT';
        if (parsedCommand.restOf.length > 0) {
          ircMessage = 'QUIT :' + parsedCommand.restOf[0];
        }
        break;
      //
      case 'QUOTE':
        if (parsedCommand.restOf.length > 0) {
          _showIrcServerPanel();
          ircMessage = parsedCommand.restOf[0];
        } else {
          return {
            error: true,
            message: 'Expect: /QUOTE RAWCOMMAND [arguments]',
            ircMessage: null
          };
        }
        break;
      //
      case 'TOPIC':
        if ((parsedCommand.params.length > 1) &&
          (window.globals.ircState.channels.indexOf(parsedCommand.params[1].toLowerCase()) >= 0)) {
          if (parsedCommand.restOf[1] === '-delete') {
            ircMessage = 'TOPIC ' + parsedCommand.params[1] + ' :';
          } else {
            ircMessage = 'TOPIC ' + parsedCommand.params[1] + ' :' + parsedCommand.restOf[1];
          }
        } else if ((parsedCommand.params.length > 0) &&
          (channelPrefixChars.indexOf(parsedCommand.restOf[0].charAt(0)) < 0) &&
          (inputObj.originType === 'channel')) {
          if (parsedCommand.restOf[0] === '-delete') {
            ircMessage = 'TOPIC ' + inputObj.originName + ' :';
          } else {
            ircMessage = 'TOPIC ' + inputObj.originName + ' :' + parsedCommand.restOf[0];
          }
        } else {
          return {
            error: true,
            message: 'Expect: /TOPIC <#channel> <New-channel-topic-message>',
            ircMessage: null
          };
        }
        break;
      case 'VERSION':
        _showIrcServerPanel();
        ircMessage = 'VERSION';
        if (parsedCommand.restOf.length === 1) {
          ircMessage = 'VERSION ' + parsedCommand.restOf[0];
        }
        break;
      case 'VOICE':
        {
          const ro = _parseChannelModes('+', 'v', 'VOICE', parsedCommand, inputObj);
          if (ro.error) {
            return ro;
          } else {
            ircMessage = ro.ircMessage;
          }
        }
        break;
      case 'WHO':
        if (parsedCommand.params.length === 0) {
          _showIrcServerPanel();
          ircMessage = 'WHO';
        } else {
          _showIrcServerPanel();
          ircMessage = 'WHO ' + parsedCommand.restOf[0];
        }
        break;
      case 'WHOIS':
        if (parsedCommand.params.length < 1) {
          return {
            error: true,
            message: 'Expect: /WHOIS <nickname>',
            ircMessage: null
          };
        }
        _showIrcServerPanel();
        ircMessage = 'WHOIS ' + parsedCommand.restOf[0];
        break;
      //
      default:
    }

    // parsing complete. Upon success, ircMessage will contain IRC command
    // If so, send it to IRC server.
    if (ircMessage) {
      return {
        error: false,
        message: null,
        ircMessage: ircMessage
      };
    }

    return {
      error: true,
      message: 'Command "/' + parsedCommand.command +
        '" unknown command.',
      ircMessage: null
    };
  }; // textCommandParser()

  /**
   * Called once per second as task scheduler, called from js/_afterLoad.js
   */
  // timerTickHandler = () => {
  //   console.log('tick');
  // };

  // initializePlugin = () => {
  //   console.log('initializePlugin');
  // };

  connectedCallback () {
    /**
     * Detect Hotkey from keypress and call web component to show/hide panels
     */
    window.addEventListener('keydown', (e) => {
      if (!window.globals.webState.webConnected) return;
      // console.log('code', e.code);
      if ((e.altKey) &&
        (!e.ctrlKey) &&
        (!e.shiftKey)) {
        if (window.globals.ircState.ircConnected) {
          //
          // Hot keys enabled when connected to IRC server
          //
          if (e.code === 'KeyB') {
            // Alt-B, show panels as collapsed bars
            document.dispatchEvent(new CustomEvent('collapse-all-panels'));
            document.dispatchEvent(new CustomEvent('cancel-zoom'));
          }
          if (e.code === 'KeyC') document.getElementById('manageChannelsPanel').handleHotKey();
          if (e.code === 'KeyN') {
            document.getElementById('manageChannelsPanel').handleHotKeyNextChannel();
          }
          if (e.code === 'KeyP') document.getElementById('managePmPanels').handleHotKey();
        }
        //
        // Hot keys available both connected and disconnected from IRC server
        if (e.code === 'KeyH') document.getElementById('helpPanel').handleHotKey();
        if (e.code === 'KeyI') document.getElementById('ircControlsPanel').handleHotKey();
        if (e.code === 'KeyL') document.getElementById('serverListPanel').handleHotKey();
        if (e.code === 'KeyS') document.getElementById('ircServerPanel').handleHotKey();
        if (e.code === 'KeyX') {
          document.dispatchEvent(new CustomEvent('hide-all-panels'));
        }
      }
    });
  }
});
