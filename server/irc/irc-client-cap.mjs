// MIT License
//
// Copyright (c) 2022 Dave Bolenbaugh
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
//            CAP message parser
//
// -----------------------------------------------------------------------------
'use strict';

import { writeSocket } from './irc-client-write.mjs';
import ircLog from './irc-client-log.mjs';
import vars from './irc-client-vars.mjs';

// saslState - Workflow step identifier
//
// 0 - Not using SASL, no CAP commands are sent to IRC server
// 10 - CAP LS 302  - Query to see if sasl=PLAIN is supported
// 20 - CAL REQ sasl - Tequest sasl capabilities
// 30 - AUTHENTICATE PLAIN - set mechanism to PLAIN
// 40 - AUTHENTICATE <base64-credentials> - SASL credential sent
// 50 - Received 900 - User login success
// 60 - Received 903 - SASL authentication complete
// 100 - Recieved 001, normal start of IRC with sasl auth completed.
// 999 = CAP or SASL error exists
let saslState = 0;

// flag to avoid duplication
let capEndSent = false;

// Array holds list of CAP values
let capArray = [];
// Flag: true = SASL AUTHENTICATE mechanism=PLAIN supported.
let saslPlain = false;
// let saslExternal = false; // This is for future TLS cert hash Auth

/**
 * Internal function to limit transmission of CAP END to only 1 time per connection
 * @param {Object} socket - TCP socket to IRC server, used to send messages to IRC server
 */
function _sendCapEndOneTimeOnly (socket) {
  if (!capEndSent) {
    capEndSent = true;
    writeSocket(socket, 'CAP END');
  }
}

/**
 * Parse responses to CAP LS
 * Store capabilities in capArray[]
 * Parse relevant CAP LS values and set flags if found
 *
 * sasl:PLAIN (set flag saslPlain)
 *
 * Note, LS response may be multiple lines if line length exceeded.
 * This function is called repetitively for each LS response
 * until last/only response, then returns { done: true}
 *
 * @param {Object} parsedMessage - Object containing parsed IRC server message.
 * @returns {Object} - Used to identify multi-line messages, end of parsing and errors
 */
function _parseCapValues (parsedMessage) {
  // Case of first message of multi-line response
  if ((parsedMessage.params.length === 4) &&
    (parsedMessage.params[0] === '*') &&
    (parsedMessage.params[1] === 'LS') &&
    (parsedMessage.params[2] === '*')) {
    const tempArray = parsedMessage.params[3].split(' ');
    tempArray.forEach(function (capValue) {
      capArray.push(capValue);
    });
    return { done: false, error: false };
  // Case of single message or last of multi-line response
  } else if ((parsedMessage.params.length === 3) &&
    (parsedMessage.params[0] === '*') &&
    (parsedMessage.params[1] === 'LS') &&
    (parsedMessage.params[2] !== '*')) {
    const tempArray = parsedMessage.params[2].split(' ');
    tempArray.forEach(function (capValue) {
      capArray.push(capValue);
    });
    // check if one of the values contains 'sasl'
    let capIndex = -1;
    if (capArray.length > 0) {
      for (let i = 0; i < capArray.length; i++) {
        if (capArray[i].indexOf('sasl') === 0) {
          capIndex = i;
        }
      }
    }
    if (capIndex >= 0) {
      // parsing: 'sasl=EXTERNAL,PLAIN'
      const tempParts = capArray[capIndex].split('=');
      if (tempParts.length === 2) {
        // parsing 'EXTERNAL,PLAIN'
        const tempValues = tempParts[1].split(',');
        tempValues.forEach(function (value) {
          if (value === 'PLAIN') saslPlain = true;
          // if (value === 'EXTERNAL') saslExternal = true;
        });
      }
    }
    return { done: true, error: false };
  } else {
    return { error: true };
  }
}

/**
 * Function to check if SASL is required, if required, enable SASL curing connect
 * This is called after a new TCP socket is connected, before sending NICK and USER
 *
 * @param {Object} socket - TCP socket to IRC server, used to send messages to IRC server
 */
const initCapNegotiation = function (socket) {
  saslState = 0;
  capEndSent = false;
  capArray = [];
  // Zero length string in either ircSaslUsername or ircSaslPassword will disable CAP / SASL
  if ((vars.ircSaslUsername.length > 0) && (vars.ircSaslPassword.length > 0)) {
    saslState = 10;
    // Request IRC server disclose it's IRCv3 capabilities
    writeSocket(socket, 'CAP LS 302');

    ircLog.writeIrcLog(
      'SASL credentials found, checking to see if IRC server supports SASL authentication.');
  }
};

/**
 * Function to parse IRC server "CAP" messages set flags as needed.
 *
 * @param {Object} socket - TCP socket to IRC server, used to send messages to IRC server
 * @param {Object} parsedMessage - Object containing parsed IRC server message.
 */
const parseCapMessage = function (socket, parsedMessage) {
  // console.log('(IRC-->) parsedMessage ', JSON.stringify(parsedMessage, null, 2));
  //
  // Parse CAP LS response
  //
  if ((saslState === 10) &&
    (parsedMessage.params.length > 2) && (parsedMessage.params[1] === 'LS')) {
    const data = _parseCapValues(parsedMessage);
    // console.log('data ', JSON.stringify(data, null, 2));
    if (data.done) {
      // console.log('capArray ', JSON.stringify(capArray, null, 2));
      // console.log('saslPlain:', saslPlain);
      if (saslPlain) {
        saslState = 20;
        writeSocket(socket, 'CAP REQ sasl');
      } else {
        saslState = 999;
        // Send: CAP END
        _sendCapEndOneTimeOnly(socket);
        global.sendToBrowser('webError: SASL authentication not supported by IRC server\n');
        ircLog.writeIrcLog('SASL authentication not supported by IRC server');
      }
    } else if (data.error) {
      // Parsing error in response to CAP LS, for debugging
      saslState = 999;
    } // Else.... Assume multi-line response, wait for next message from IRC server
  //
  // Parse CAP REQ response
  //
  } else if ((saslState === 20) &&
  (parsedMessage.params.length > 2) && (parsedMessage.params[1] === 'ACK')) {
    const ackList = parsedMessage.params[2].split(' ');
    if (ackList.indexOf('sasl' >= 0)) {
      saslState = 30;
      writeSocket(socket, 'AUTHENTICATE PLAIN');
    } else {
      global.sendToBrowser('webError: SASL authentication does not support mechanism PLAIN\n');
      ircLog.writeIrcLog('SASL authentication does not support mechanism PLAIN');
      saslState = 999;
    }
  } else {
    saslState = 999;
    console.log('Received unrecognized CAP response during saslState ' + saslState.toString());
    console.log('(IRC-->) parsedMessage ', JSON.stringify(parsedMessage, null, 2));
  }
};

/**
 * Function to parse IRC server AUTHORIZATION messages and set flags as needed.
 *
 * @param {Object} socket - TCP socket to IRC server, used to send messages to IRC server
 * @param {Object} parsedMessage - Object containing parsed IRC server message.
 */
const parseAuthMessage = function (socket, parsedMessage) {
  // console.log('(IRC-->) parsedMessage ', JSON.stringify(parsedMessage, null, 2));
  if ((saslState === 30) &&
    (parsedMessage.params.length === 1) && (parsedMessage.params[0] === '+')) {
    const authString = Buffer.from(
      vars.ircSaslUsername + String.fromCharCode(0) +
      vars.ircSaslUsername + String.fromCharCode(0) +
      vars.ircSaslPassword).toString('base64');
    saslState = 40;
    writeSocket(socket, 'AUTHENTICATE ' + authString);
    ircLog.writeIrcLog(
      'IRC server supports SASL with mechanism PLAIN, sending SASL credentials.');
  } else {
    console.log('Error parsing SASL AUTHENTICATE PLAIN response');
    saslState = 999;
  }
};

/**
 * Function to 900 and 903 IRC server messages after successful SASL login
 *
 * @param {Object} socket - TCP socket to IRC server, used to send messages to IRC server
 * @param {Object} parsedMessage - Object containing parsed IRC server message.
 */
const numericSuccessHandler = function (socket, parsedMessage) {
  // console.log('(IRC-->) parsedMessage ', JSON.stringify(parsedMessage, null, 2));
  // 900 RPL_LOGGEDIN is sent when the user’s account name is set
  if (parsedMessage.command === '900') {
    if (saslState === 40) saslState = 50;
  }
  // 903 RPL_SASLSUCCESS is sent when the SASL authentication finishes successfully
  if (parsedMessage.command === '903') {
    if (saslState === 50) {
      saslState = 60;
      // Send: CAP END
      _sendCapEndOneTimeOnly(socket);
    }
  }
};
/**
 * Function to 900 and 903 IRC server messages after successful SASL login
 *
 * @param {Object} socket - TCP socket to IRC server, used to send messages to IRC server
 * @param {Object} parsedMessage - Object containing parsed IRC server message.
 */
const numericErrorHandler = function (socket, parsedMessage) {
  // console.log('(IRC-->) parsedMessage ', JSON.stringify(parsedMessage, null, 2));
  // if sasl auth aborted (906)....
  if (parsedMessage.command === 906) {
    // Send: CAP END
    _sendCapEndOneTimeOnly(socket);
  }
  saslState = 999;
  global.sendToBrowser('webError: SASL authentication returned IRC server message ' +
    parsedMessage.command + '\n');
};

const closeSaslAuth = function () {
  // console.log('IRC 001 received with saslState ', saslState.toString());
  // Case of message 001 without CAP LS response, server does not support IRCv3 capabilities.
  // 0 --> SASL and CAP not requested
  if (saslState !== 0) {
    // else detect success/error
    if (saslState === 10) {
      ircLog.writeIrcLog('IRC server did not respond to CAP LS query.');
      global.sendToBrowser('webError: IRC server did not respond to CAP LS query\n');
    }
    if (saslState === 60) {
      saslState = 100;
      ircLog.writeIrcLog('SASL authentication successful.');
    } else {
      global.sendToBrowser('webError: ' +
        'ASL authentication failed, continuing to connect without authentication\n');
      ircLog.writeIrcLog(
        'SASL authentication failed, continuing to connect without authentication');
    }
  }
};

export default {
  initCapNegotiation,
  parseCapMessage,
  parseAuthMessage,
  numericSuccessHandler,
  numericErrorHandler,
  closeSaslAuth
};
