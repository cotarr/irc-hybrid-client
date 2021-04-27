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
//            CTCP message parser
//
// Receives CTCP requrests from IRC server and sends automated response
// from the client.
//
// -----------------------------------------------------------------------------
(function() {
  'use strict';

  const ircWrite = require('./irc-client-write');
  // const ircLog = require('./irc-client-log');

  var ircMessageCache = require('./irc-client-cache');
  var vars = require('./irc-client-vars');

  // const tellBrowserToRequestState = function() {
  //   global.sendToBrowser('UPDATE\r\n');
  // };

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
        ' :' + vars.ircState.nickName + '!*@* NOTICE ' + ctcpTo + ' ' +
        String.fromCharCode(ctcpDelim) + ctcpReply + String.fromCharCode(ctcpDelim);
      if (checkCtcpNotFlood()) {
        global.sendToBrowser(outgoingBackToSelf + '\r\n');
        ircMessageCache.addMessage(Buffer.from(outgoingBackToSelf));
        ircWrite.writeSocket(socket, ircMessage);
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
          let ctcpReply = 'VERSION ' + vars.ircState.botName + '-' + vars.ircState.botVersion;
          let ircMessage = 'NOTICE ' + parsedMessage.nick + ' :' +
          String.fromCharCode(ctcpDelim) + ctcpReply + String.fromCharCode(ctcpDelim);
          _sendCtcpMessage(socket, ircMessage, ctcpReply, parsedMessage.nick);
        }
        break;
      default:
    }
  }; // _parseCtcpMessage()

  //
  // 1 second utility timer
  //
  setInterval(function() {
    ctcpTimerTick();
  }.bind(this), 1000);

  module.exports = {
    _parseCtcpMessage: _parseCtcpMessage
  };
})();
