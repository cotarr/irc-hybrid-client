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
//    Parse input from remote IRC server to detect and handle IRC server commands
//
// ------------------------------------------------------------------------------
// This function will accept one line of text from IRC server
// First it will check for "HEARTBEAT" and "UPDATE" requests
// else will parse message string into prefix, command, and arguments
// then parse the command and relevant actions accordingly.
//
//    IRC server ---> backend --> Browser (parse here)
//
// Public Methods
//    parseBufferMessage(message)
//
'use strict';
window.customElements.define('remote-command-parser', class extends HTMLElement {
  // ------------------------------------------------------------------
  // Internal function to parse one line of message from IRC server
  // Returns jason object with prefix, command and params array
  //
  // Input: UTF-8 string as input (one message from IRC server)
  // Return: Structured JSON object
  // ------------------------------------------------------------------
  _parseIrcMessage = (message) => {
    // ------------------------
    // internal functions
    // ------------------------
    //
    // 1) timestamp
    //
    // timestamp :prefix command param1 param2 .... :lastParam
    // =========
    //
    const _extractTimeString = (start, end, messageString) => {
      let i = start;
      let timeString = '';
      while ((messageString.charAt(i) !== ' ') && (i <= end)) {
        timeString += messageString.charAt(i);
        i++;
      }
      const outStringHMS = document.getElementById('displayUtils').timestampToHMS(timeString);
      const outStringYMD = document.getElementById('displayUtils').timestampToYMD(timeString);
      return {
        dataHMS: outStringHMS,
        dataYMD: outStringYMD,
        nextIndex: i + 1
      };
    };
    //
    // 2) Check if colon string
    //
    // timestamp :prefix command param1 param2 .... :lastParam
    //          ===                                ===
    //
    const _isColonString = (start, messageString) => {
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
    };
    //
    // 3) Command or param string, but not last param
    //
    // timestamp :prefix command param1 param2 .... :lastParam
    //                   ======= ====== ======
    //
    const _extractMidString = (start, end, messageString) => {
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
    };
    // 4) Last param string (start with :)
    //
    // timestamp :prefix command param1 param2 .... :lastParam
    //                                               =========
    //
    const _extractFinalString = (start, end, messageString) => {
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
    };
    //
    // Extract nickname
    //
    // nick!user@host.domain
    // nick!user@nn:nn:nn:nn: (ipv6)
    const _extractNickname = (inText) => {
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
    };
    //
    // Extract hostname
    //
    const _extractHostname = (inText) => {
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
    };
    // ---------------------------------------------------------
    //                   Decode the line
    // --------------------------------------------------------
    // This accepts a Buffer as input with UTF8 characters
    //
    // Format:  [:prefix] command param1 [param2] .... [:lastParam]
    // --------------------------------------------------------
    //
    //  Line composed of 3 parts, prefix, command, params
    //
    let timestamp = null;
    let datestamp = null;
    let prefix = null;
    let extNick = null;
    let extHost = null;
    let command = null;
    const params = [];
    //
    // Parsing variables
    const messageString = message.toString();
    const end = messageString.length - 1;
    let temp = { nextIndex: 0 };

    // 1) Extract timestamp
    temp = _extractTimeString(temp.nextIndex, end, messageString);
    timestamp = temp.dataHMS;
    datestamp = temp.dataYMD;

    // 2) Check if prefix exist, if exit parse value, return nextIndex
    temp = _isColonString(temp.nextIndex, messageString);
    if (temp.isColonStr) {
      temp = _extractMidString(temp.nextIndex, end, messageString);
      prefix = temp.data;
      extNick = _extractNickname(temp.data);
      extHost = _extractHostname(temp.data);
    }

    // 3) extract command string
    temp = _extractMidString(temp.nextIndex, end, messageString);
    command = temp.data;

    // 4) Extract optional params, in loop, until all params extracted.
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
      timestamp: timestamp,
      datestamp: datestamp,
      prefix: prefix,
      nick: extNick,
      host: extHost,
      command: command,
      params: params
    };
  }; // _parseIrcMessage()

  // -------------------------------------------------------------
  //
  //      M A I N   C O M M A N D   P A R S E R
  //
  //    IRC server ---> backend --> Browser (parse here)
  //
  // This function will accept one line of text from IRC server
  // First it will check for "HEARTBEAT" and "UPDATE" requests
  // else will parse message string into prefix, command, and arguments
  // then parse the command and relevant actions accordingly.
  // -------------------------------------------------------------

  /**
   * Parse IRC message and build parsedMessageObject
   * Check for match on IRC command handlers, if found call handler function
   * @param {string} message - RFC 2812 formatted IRC server message
   */
  parseBufferMessage = (message) => {
    const errorPanelEl = document.getElementById('errorPanel');
    const displayUtilsEl = document.getElementById('displayUtils');
    const ircServerPanelEl = document.getElementById('ircServerPanel');
    if (message === 'HEARTBEAT') {
      // 1) Check if websocket heartbeat
      // console.log('heartbeat');
      document.getElementById('websocketPanel').onHeartbeatReceived();
    } else if (message === 'UPDATE') {
      // 2) Else check if backend requests browser to
      //       poll the state API and update
      // console.log('update');
      // calling this updates state itself
      document.getElementById('ircControlsPanel').getIrcState()
        .catch((err) => {
          console.log(err);
          let message = err.message || err.toString() || 'Error occurred calling /irc/connect';
          // show only 1 line
          message = message.split('\n')[0];
          errorPanelEl.showError(message);
        });
    } else if (message === 'CACHERESET') {
      // 3) Else check if cache has been erased on the web server
      // This may occur when changing from one IRC network to another
      // or requested manually in the server window.
      // In response to this event various child window textarea will clear themselves.
      document.dispatchEvent(new CustomEvent('erase-before-reload'));
    } else if (message === 'CACHEPULL') {
      // 4) Else check if cache has been modified on the web server
      // This may occur when erasing partial contents of the cache
      // In response to this event the cache will be reloaded in all browsers
      document.dispatchEvent(new CustomEvent('update-from-cache'));
    } else if (message === 'DEBUGPONG') {
      // 5) This is a debug function to measure websocket ping time.
      if ((window.globals.startTimeMsTest3) &&
        (typeof window.globals.startTimeMsTest3 === 'number')) {
        const pong2 = Date.now() - window.globals.startTimeMsTest3;
        document.getElementById('debugPanel')
          .appendDebugResult('Websocket response: ' + pong2.toString() + ' ms\n');
        console.log('Websocket response: ' + pong2.toString() + ' ms');
      }
    } else if ((message.startsWith('LAG=')) && (message.length === 9)) {
      // 5) IRC server lag measurement for display
      // Example message: 'LAG=1.234'
      const pingStr = message.split('=')[1];
      let pingFloat = null;
      try {
        pingFloat = parseFloat(pingStr);
      } catch (err) {
        pingFloat = null;
      };
      if ((pingFloat) && (typeof pingFloat === 'number')) {
        window.globals.webState.lag.last = pingFloat;
        if (pingFloat < window.globals.webState.lag.min) {
          window.globals.webState.lag.min = pingFloat;
        }
        if (pingFloat > window.globals.webState.lag.max) {
          window.globals.webState.lag.max = pingFloat;
        }
      }
    } else {
      // 6) Else, this is IRC message to be parsed for IRC browser user.

      // Internal function
      const _showNotExpiredError = (errStr) => {
        // current UNIX time in seconds
        const timeNow = new Date();
        const timeNowSeconds = parseInt(timeNow / 1000);
        const timeMessageSeconds = document.getElementById('displayUtils')
          .timestampToUnixSeconds(message.split(' ')[0]);
        // subtract timestamp from (possibly cached) server messages
        // and show error only if condition not expired
        if (timeNowSeconds - timeMessageSeconds <
          // TODO does this pull seconds?
          errorPanelEl.errorExpireSeconds) {
          errorPanelEl.showError(errStr);
        }
      };

      // Copies of outgoing message are echoed back by the web server prefixed by '--> '.
      // These return messages should not be parsed as IRC commands, abort...
      if (message.split(' ')[0] === '-->') {
        return;
      }

      // Misc server messages prefixed with 'Webserver: ' should not be exposed to parser
      if (message.split(' ')[0] === 'webServer:') {
        return;
      }
      // Misc server messages prefixed with 'Webserver: ' should not be exposed to parser
      if (message.split(' ')[0] === 'webError:') {
        if (message.length > 10) errorPanelEl.showError(message.slice(10));
        return;
      }

      //
      // Main Parser
      //
      // parse message into: prefix, command, and param array
      //
      const parsedMessage = this._parseIrcMessage(message);
      // ---------------------------
      // Show parsed message for debug
      // ---------------------------
      // console.log('parsedMessage' + JSON.stringify(parsedMessage, null, 2));
      document.getElementById('showRaw').displayParsedServerMessage(parsedMessage);

      //
      // Send message to IRC server panel for display of formatted IRC messages
      ircServerPanelEl.displayFormattedServerMessage(parsedMessage, message);
      //
      // Check if server is responding with error code
      //
      if ((parseInt(parsedMessage.command) >= 400) &&
        (parseInt(parsedMessage.command) < 500)) {
        // TODO temporarily remove timestamp with slice, can use better parse.
        _showNotExpiredError(message.slice(12, message.length));
      }

      // Decoding complete, Parse commands
      //
      switch (parsedMessage.command) {
        case 'ERROR':
          // console.log(message.toString());
          // This is to popup error before registration, Bad server Password error
          if ((!window.globals.ircState.ircRegistered) && (parsedMessage.params.length === 1)) {
            if (!window.globals.webState.cacheReloadInProgress) {
              document.getElementById('errorPanel').showError('ERROR ' + parsedMessage.params[0]);
            }
          }
          break;
        case 'KICK':
          document.getElementById('manageChannelsPanel').displayChannelMessage(parsedMessage);
          break;
        case 'JOIN':
          document.getElementById('manageChannelsPanel').displayChannelMessage(parsedMessage);
          break;
        case 'MODE':
          if (parsedMessage.params[0] === window.globals.ircState.nickName) {
            // Case of me, my MODE has changed
            ircServerPanelEl.displayFormattedServerMessage(parsedMessage, message);
          } else if (document.getElementById('globVars').constants('channelPrefixChars')
            .indexOf(parsedMessage.params[0].charAt(0)) >= 0) {
            // Case of channel name
            document.getElementById('manageChannelsPanel').displayChannelMessage(parsedMessage);
          } else {
            console.log('Error message MODE to unknown recipient');
          }
          break;
        case 'cachedNICK':
          document.getElementById('manageChannelsPanel').displayChannelMessage(parsedMessage);
          ircServerPanelEl.displayFormattedServerMessage(parsedMessage, message);
          break;
        case 'NICK':
          document.getElementById('manageChannelsPanel').displayChannelMessage(parsedMessage);
          ircServerPanelEl.displayFormattedServerMessage(parsedMessage, message);
          break;
        case 'PART':
          document.getElementById('manageChannelsPanel')
            .displayChannelMessage(parsedMessage);
          break;
        case 'NOTICE':
          // NOTICE is special case because it can be sent to an IRC channel,
          // a nickname, a CTCP message or received as a server message.
          // Therefore, irc-server-panel filters NOTICE and hides it.
          // This is to show the edge case of a server message
          // without an origin nickname
          if ((!parsedMessage.nick) || (parsedMessage.nick.length === 0)) {
            ircServerPanelEl.displayPlainServerMessage(
              displayUtilsEl.cleanFormatting(
                displayUtilsEl.cleanCtcpDelimiter(
                  parsedMessage.timestamp + ' ' +
                  parsedMessage.prefix + ' ' +
                  parsedMessage.params[1])));
          } else {
            const ctcpDelim = 1;
            if (parsedMessage.params[1] === null) parsedMessage.params[1] = '';
            if (parsedMessage.params[1].charCodeAt(0) === ctcpDelim) {
              // case of CTCP message
              document.getElementById('ctcpParser').parseCtcpMessage(parsedMessage, message);
            } else {
              // case of server, user, and channel notices.
              // Each will abort message not for them
              document.getElementById('noticePanel').displayNoticeMessage(parsedMessage);
              document.getElementById('manageChannelsPanel')
                .displayChannelNoticeMessage(parsedMessage);
            }
          }
          break;
        case 'PRIVMSG':
          {
            // first check for CTCP message
            const ctcpDelim = 1;
            if (parsedMessage.params[1].charCodeAt(0) === ctcpDelim) {
              // case of CTCP message
              document.getElementById('ctcpParser').parseCtcpMessage(parsedMessage, message);
            } else {
              // else not a CTCP message
              const chanPrefixIndex = document.getElementById('globVars')
                .constants('channelPrefixChars').indexOf(parsedMessage.params[0].charAt(0));
              const channelIndex =
                window.globals.ircState.channels.indexOf(parsedMessage.params[0].toLowerCase());
              if (channelIndex >= 0) {
                // Case of channel name found in list of active channel
                document.getElementById('manageChannelsPanel').displayChannelMessage(parsedMessage);
              } else if (chanPrefixIndex >= 0) {
                // Case of the first character designates recipient is channel name
                // but that is no matching active channel,
                // Therefore, message is in cache buffer, but channel no longer exist
                // so show the message in the server window.
                ircServerPanelEl.displayFormattedServerMessage(parsedMessage, message);
              } else {
                // else case of private message, show in private message window.
                document.getElementById('managePmPanels').displayPrivateMessage(parsedMessage);
              }
            }
          }
          break;
        //
        // QUIT, cachedQUIT
        //
        // QUIT messages do not include a channel name.
        //
        // Example: "nick!user@host QUIT :Reason for quitting"
        //
        // It is up to the IRC client to identify all channels where
        // the QUIT nick is present.This is done by maintaining
        // a list of IRC channels in ircState.channels[]
        // and for each channel the IRC client also maintains
        // a list of members in ircState.channelStates[].names[]
        // QUIT activities are display if the member was present in the list.
        //
        // In the case where the web browser reloads content from the cache,
        // the member list may be out of date, and the nicknames may or may not
        // still be present in the channel. Therefore the channel name must be stored.
        //
        // When QUIT messages are added to the cache, the name is changed
        // to cachedQUIT and the channel name is added.
        //
        // Example:  "nick!user@host cachedQUIT #channel :Reason for quitting"
        //
        // There is duplication with one cachedQUIT message for each
        // channel where the nick was present.
        //
        // So when reloading from cache, the channel is selected by the value in the
        // cacheQUIT message in the cache buffer rather than the current channel membership list.
        //
        case 'cachedQUIT':
        case 'QUIT':
          document.getElementById('manageChannelsPanel').displayChannelMessage(parsedMessage);
          break;
        case 'TOPIC':
          if (document.getElementById('globVars').constants('channelPrefixChars')
            .indexOf(parsedMessage.params[0].charAt(0)) >= 0) {
            // Case of channel name
            document.getElementById('manageChannelsPanel').displayChannelMessage(parsedMessage);
          } else {
            console.log('Error message TOPIC to unknown channel');
          }
          break;
        case 'WALLOPS':
          document.getElementById('wallopsPanel').displayWallopsMessage(parsedMessage);
          break;
        //
        default:
      }
    }
  }; // parseBufferMessage()

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
