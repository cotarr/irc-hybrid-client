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
//              Parse Messages from client sent toward IRC server
//
//  The primary purpose of this module is to echo a copy of messages
//  back to the browser, so the user can see their own submissions.
//
// -----------------------------------------------------------------------------
'use strict';

import ircMessageCache from './irc-client-cache.mjs';
import vars from './irc-client-vars.mjs';

// const nodeEnv = process.env.NODE_ENV || 'development';

// const tellBrowserToRequestState = function() {
//   global.sendToBrowser('UPDATE\r\n');
// };

// -----------------------------------------------------------------
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
// -----------------------------------------------------------------
export const parseBrowserMessageForCommand = function (message) {
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
      {
        const index = vars.ircState.channels.indexOf(outboundArg1.toLowerCase());
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
          // console.log('JOIN clearing nicklist');
          vars.ircState.channelStates[index].names = [];
        }
      }
      break;
    case 'NAMES':
      {
        const index = vars.ircState.channels.indexOf(outboundArg1.toLowerCase());
        // Clear names list, a new one will arrive after join
        if (index >= 0) {
          vars.ircState.channelStates[index].names = [];
        }
      }
      break;
    //
    case 'NOTICE':
      {
        //
        // case of channel notice
        //
        const index = vars.ircState.channels.indexOf(outboundArg1.toLowerCase());
        if ((index >= 0) && (vars.ircState.channelStates[index].joined)) {
          const fromMessage = vars.timestamp() + ' ' +
          ':' + vars.ircState.nickName + '!*@* ' + message;
          ircMessageCache.addMessage(fromMessage);
          global.sendToBrowser(fromMessage + '\r\n');
          return { error: false };
        }
        //
        // case of private notice
        //
        const firstChar = outboundArg1.charAt(0);
        if (vars.channelPrefixChars.indexOf(firstChar) < 0) {
          const fromMessage = vars.timestamp() + ' ' +
            ':' + vars.ircState.nickName + '!*@* ' + message;
          ircMessageCache.addMessage(fromMessage);
          global.sendToBrowser(fromMessage + '\r\n');
          return { error: false };
        }
      }
      return {
        error: true,
        message: 'Error parsing NOTICE message before send to IRC server.'
      };
      // break;
    //
    case 'PRIVMSG':
      {
        //
        // case of channel message
        //
        const index = vars.ircState.channels.indexOf(outboundArg1.toLowerCase());
        if ((index >= 0) && (vars.ircState.channelStates[index].joined)) {
          const fromMessage = vars.timestamp() + ' ' +
          ':' + vars.ircState.nickName + '!*@* ' + message;
          ircMessageCache.addMessage(fromMessage);
          global.sendToBrowser(fromMessage + '\r\n');
          return { error: false };
        }
        //
        // case of private message
        //
        const firstChar = outboundArg1.charAt(0);
        if (vars.channelPrefixChars.indexOf(firstChar) < 0) {
          const fromMessage = vars.timestamp() + ' ' +
            ':' + vars.ircState.nickName + '!*@* ' + message;
          ircMessageCache.addMessage(fromMessage);
          global.sendToBrowser(fromMessage + '\r\n');
          return { error: false };
        }
      }
      return {
        error: true,
        message: 'Error parsing PRIVMSG message before send to IRC server.'
      };
      // break;
    case 'QUIT':
      vars.ircState.ircConnectOn = false;
      vars.ircServerReconnectTimerSeconds = 0;
      vars.ircServerReconnectChannelString = '';
      vars.ircServerReconnectAwayString = '';
      break;
    //
    default:
  }

  // by default messages are valid
  return { error: false };
}; // parseBrowserMessageForCommand
