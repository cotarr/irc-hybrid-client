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
//              Handle transmission of message toward IRC server
//
// -----------------------------------------------------------------------------
//
//  Some limited password filtering is included to keep credentials
//  from the log file. Not all possible passwords are included
//  in the filter.
//
// -----------------------------------------------------------------------------
'use strict';

// ----------------------------------------------------
// Write data to IRC server socket (Internal function)
// Includes check of socket status
//
// Expect Buffer or utf8 encoded string.
//
// Send utf8 string to browser
// Send Buffer encoded utf8 to IRC server socket
// ----------------------------------------------------
import isValidUTF8 from 'utf-8-validate';
import vars from './irc-client-vars.mjs';
import ircLog from './irc-client-log.mjs';

export const writeSocket = function (socket, message) {
  if (message.length === 0) return;
  if ((socket) && (socket.writable)) {
    //
    // First, filter passwords, then send to browser and write log file
    // The filter only applies to log file and browser.
    // Messages to IRC server are not filtered.
    //
    const filterWords = [
      'OPER',
      'PASS',
      'AUTHENTICATE',
      'NICKSERV',
      'NS',
      'CHANSERV',
      'CS'
    ];
    const filterCommand = message.toString().split(' ')[0].toUpperCase();
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
    // echo the outgoing IRC server message to the browser
    global.sendToBrowser(vars.commandMsgPrefix + filtered + '\n');

    // echo the outgoing IRC message to the log
    ircLog.writeIrcLog(vars.commandMsgPrefix + filtered);

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
      console.log('writeSocket() failed UTF-8 validation');
    }
    // RFC 2812 does not allow zero character
    if (out.includes(0)) {
      out = null;
      console.log('writeSocket() failed zero byte validation');
    }
    // 512 btye maximum size from RFC 2812 Section 2.3 Messages
    // It is assumed here this means 8 bit types not multi-byte characters
    if (out.length > 512) {
      out = null;
      console.log('writeSocket() send buffer exceeds 512 character limit.');
    }
    //
    // Third, send into socket to IRC server
    //
    if (out) {
      socket.write(Buffer.concat([out, Buffer.from('\r\n', 'utf8')]));
    }
  } else {
    // TODO should this disconnect?
    console.log('writeSocket() server socket not writable');
  }
}; // writeSocket
