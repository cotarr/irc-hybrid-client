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
// ------------------------------------------------------------------------------
'use strict';
window.customElements.define('ctcp-parser', class extends HTMLElement {
  // ---------------------------------------------
  // CTCP message parser
  //
  // Note: CTCP replies to other users are handled
  // in the backend web server. This parser is
  // for user interactive CTCP requests,
  // primarily ACTION from /ME commands.
  //
  // The "message" argument is used to show
  // entire raw message as a fall back
  // ---------------------------------------------
  parseCtcpMessage = (parsedMessage, message) => {
    // console.log('parseCtcpMessage ' + JSON.stringify(parsedMessage, null, 2));
    const channelPrefixChars =
      document.getElementById('globVars').constants('channelPrefixChars');
    const ctcpDelim = 1;
    const ctcpMessage = parsedMessage.params[1];
    const end = ctcpMessage.length - 1;
    if (ctcpMessage.charCodeAt(0) !== 1) {
      console.log('parseCtcpMessage() missing CTCP start delimiter');
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
    while ((ctcpMessage.charAt(i) === ' ') && (i <= end)) {
      i++;
    }
    while ((ctcpMessage.charCodeAt(i) !== ctcpDelim) && (i <= end)) {
      ctcpRest += ctcpMessage.charAt(i);
      i++;
    }
    // console.log('ctcpCommand ' + ctcpCommand + ' ctcpRest ' + ctcpRest);
    //
    //   ACTION
    //
    if (ctcpCommand === 'ACTION') {
      const index = window.globals.ircState.channels.indexOf(parsedMessage.params[0].toLowerCase());
      if (index >= 0) {
        parsedMessage.params[1] = parsedMessage.nick + ' ' + ctcpRest;
        parsedMessage.nick = '*';
        document.getElementById('manageChannelsPanel').displayChannelMessage(parsedMessage);
      } else if (channelPrefixChars.indexOf(parsedMessage.params[0].charAt(0)) >= 0) {
        // Case of the first character designates recipient is channel name
        // but that is no matching active channel,
        // Therefore, message is in cache buffer, but channel no longer exist
        // so show the message in the server window.
        document.getElementById('ircServerPanel')
          .displayFormattedServerMessage(parsedMessage, message);
      } else {
        // TODO action sent as regular PM for now
        parsedMessage.params[1] = ctcpRest;
        parsedMessage.isPmCtcpAction = true;
        this.displayPrivateMessage(parsedMessage);
      }
    } else {
      if (parsedMessage.nick === window.globals.ircState.nickName) {
        // case of match my nickname
        if (parsedMessage.command.toUpperCase() === 'PRIVMSG') {
          // case of outgoing CTCP request from me to other client
          document.getElementById('noticePanel').displayCtcpNoticeMessage(
            parsedMessage.timestamp + ' ' +
            'CTCP 1 Request to ' + parsedMessage.params[0] + ': ' +
            ctcpCommand + ' ' + ctcpRest);
        } else {
          // case of echo my CTCP reply to other client
          //
          // Outgoing CTCP reply has been parsed into
          // individual array elements (words).
          // This will (unparse) them back to a string
          //
          let replyContents = '';
          if (parsedMessage.params.length > 2) {
            for (let i = 2; i < parsedMessage.params.length; i++) {
              if (parsedMessage.params[i].charCodeAt(0) !== ctcpDelim) {
                replyContents += document.getElementById('displayUtils')
                  .cleanCtcpDelimiter(parsedMessage.params[i]);
                if (i !== parsedMessage.params.length) {
                  replyContents += ' ';
                }
              }
            }
          }
          document.getElementById('noticePanel').displayCtcpNoticeMessage(
            parsedMessage.timestamp + ' ' +
            'CTCP 2 Reply to ' + parsedMessage.params[0] + ': ' +
            ctcpCommand + ' ' + replyContents);
        }
      } else {
        // case of ctcp message/reply for other remote IRC client
        if (parsedMessage.command.toUpperCase() === 'PRIVMSG') {
          // case of remote client request to me for CTCP response
          document.getElementById('noticePanel').displayCtcpNoticeMessage(
            parsedMessage.timestamp + ' ' +
            'CTCP 3 Request from ' + parsedMessage.nick + ': ' +
            ctcpCommand + ' ' + ctcpRest);
        } else {
          // case of showing remote response to my CTCP request
          document.getElementById('noticePanel').displayCtcpNoticeMessage(
            parsedMessage.timestamp + ' ' +
            'CTCP 4 Reply from ' +
            parsedMessage.nick + ': ' +
            ctcpCommand + ' ' + ctcpRest);
        }
      }
      // updateDivVisibility();
    }
  }; //

  /**
   * Called once per second as task scheduler, called from js/_afterLoad.js
   */
  // timerTickHandler = () => {
  //   console.log('tick');
  // };

  // initializePlugin = () => {
  //   console.log('initializePlugin');
  // };

  // connectedCallback() {
  // }
});
