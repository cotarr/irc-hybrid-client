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
'use strict';

const ircWrite = require('./irc-client-write');
// const ircLog = require('./irc-client-log');

const ircMessageCache = require('./irc-client-cache');
const vars = require('./irc-client-vars');

// const tellBrowserToRequestState = function() {
//   global.sendToBrowser('UPDATE\r\n');
// };

// ----------------------------
// CTCP flood detections
// ----------------------------
const ctcpFloodTimeSec = 5;
const ctcpMaxFlood = 3;
let ctcpDownCounterSeconds = 0;
let ctcpReplyCounter = 0;
const checkCtcpNotFlood = function () {
  if (ctcpDownCounterSeconds === 0) ctcpDownCounterSeconds = ctcpFloodTimeSec;
  ctcpReplyCounter++;
  if (ctcpReplyCounter > ctcpMaxFlood) return false;
  return true;
};
const ctcpTimerTick = function () {
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
    const ctcpDelim = 1;
    const outgoingBackToSelf = vars.timestamp() +
      ' :' + vars.ircState.nickName + '!*@* NOTICE ' + ctcpTo + ' ' +
      String.fromCharCode(ctcpDelim) + ctcpReply + String.fromCharCode(ctcpDelim);
    if (checkCtcpNotFlood()) {
      global.sendToBrowser(outgoingBackToSelf + '\r\n');
      ircMessageCache.addMessage(Buffer.from(outgoingBackToSelf));
      ircWrite.writeSocket(socket, ircMessage);
    }
  }
  const ctcpDelim = 1;
  const ctcpMessage = parsedMessage.params[1];
  const end = ctcpMessage.length - 1;
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
      {
        const ctcpReply = 'CLIENTINFO ' +
        'ACTION ' +
        'CLIENTINFO ' +
        'PING ' +
        'TIME ' +
        'VERSION';
        const ircMessage = 'NOTICE ' + parsedMessage.nick + ' :' +
        String.fromCharCode(ctcpDelim) + ctcpReply + String.fromCharCode(ctcpDelim);
        _sendCtcpMessage(socket, ircMessage, ctcpReply, parsedMessage.nick);
      }
      break;

    case 'PING':
      {
        const ctcpReply = 'PING ' + ctcpRest;
        const ircMessage = 'NOTICE ' + parsedMessage.nick + ' :' +
        String.fromCharCode(ctcpDelim) + ctcpReply + String.fromCharCode(ctcpDelim);
        _sendCtcpMessage(socket, ircMessage, ctcpReply, parsedMessage.nick);
      }
      break;

    case 'TIME':
      {
        const d = new Date();

        // This returns Fri Jun 11 2021 12:50:57 GMT+0000
        // let ctcpReply = 'TIME ' + d.toString().split('(')[0];
        //
        // ---------------------
        //
        // This alternately constructs an RFC5322 Section 3.3 date/time string
        //
        // CAUTION: JavaScript toLocaleString() is implementation dependant
        // This was written using Debian 10
        //
        // CTCP reply: "TIME Fri, 11 Jun 2021 10:20:35 UTC"
        //
        const ctcpReply = 'TIME ' +
          // "Mon, "
          d.toLocaleDateString(vars.ctcpTimeLocale[0], {
            timeZone: vars.ctcpTimeLocale[1],
            weekday: 'short'
          }) + ', ' +
          // "11 "
          d.toLocaleDateString(vars.ctcpTimeLocale[0], {
            timeZone: vars.ctcpTimeLocale[1],
            day: '2-digit'
          }) + ' ' +
          // "Jun "
          d.toLocaleDateString(vars.ctcpTimeLocale[0], {
            timeZone: vars.ctcpTimeLocale[1],
            month: 'short'
          }) + ' ' +
          // "2021 "
          d.toLocaleDateString(vars.ctcpTimeLocale[0], {
            timeZone: vars.ctcpTimeLocale[1],
            year: 'numeric'
          }) + ' ' +
          // '14:33:22 UTC'
          d.toLocaleTimeString(vars.ctcpTimeLocale[0], {
            timeZone: vars.ctcpTimeLocale[1],
            hour12: false,
            timeZoneName: 'short'
          });
        const ircMessage = 'NOTICE ' + parsedMessage.nick + ' :' +
        String.fromCharCode(ctcpDelim) + ctcpReply + String.fromCharCode(ctcpDelim);
        _sendCtcpMessage(socket, ircMessage, ctcpReply, parsedMessage.nick);
      }
      break;
    //
    case 'VERSION':
      {
        const ctcpReply = 'VERSION ' + vars.ircState.progName + '-' + vars.ircState.progVersion;
        const ircMessage = 'NOTICE ' + parsedMessage.nick + ' :' +
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
setInterval(function () {
  ctcpTimerTick();
}, 1000);

module.exports = {
  _parseCtcpMessage: _parseCtcpMessage
};
