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
// --------------------------------------------------------------------------------
//
// --------------------------------------------------------------------------------
'use strict';
window.customElements.define('irc-server-panel', class extends HTMLElement {
  constructor () {
    super();
    const template = document.getElementById('ircServerPanelTemplate');
    const templateContent = template.content;
    this.attachShadow({ mode: 'open' })
      .appendChild(templateContent.cloneNode(true));
  }

  /**
   * Make panel visible
   */
  showPanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible', '');
  };

  /**
   * This panel does not collapse, instead close it.
   */
  collapsePanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible');
  };

  /**
   * Hide panel
   */
  hidePanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible');
  };

  // -------------------------------------------------------------------------
  // Internal function to detect IRC slash commands
  // by parsing input on server window user input textarea.
  // -------------------------------------------------------------------------
  _parseInputForIRCCommands = (textAreaEl) => {
    const errorPanelEl = document.getElementById('errorPanel');
    const displayUtilsEl = document.getElementById('displayUtils');
    const text = displayUtilsEl.stripTrailingCrLf(textAreaEl.value);
    if (displayUtilsEl.detectMultiLineString(text)) {
      textAreaEl.value = '';
      errorPanelEl.showError('Multi-line input is not supported.');
    } else {
      if (text.length > 0) {
        const commandAction = document.getElementById('localCommandParser').textCommandParser(
          {
            inputString: text,
            originType: 'generic',
            originName: null
          }
        );
        // clear input element
        textAreaEl.value = '';
        if (commandAction.error) {
          errorPanelEl.showError(commandAction.message);
          return;
        } else {
          if ((commandAction.ircMessage) && (commandAction.ircMessage.length > 0)) {
            document.getElementById('ircControlsPanel')
              .sendIrcServerMessage(commandAction.ircMessage);
          }
          return;
        }
      }
    }
    textAreaEl.value = '';
  };

  // ---------------------------------------
  // textarea before input event handler
  //
  // Auto complete function
  //
  // Keys:  desktop: tab,  mobile phone: space-space
  // Channel name selected by tab-tab or space-space-space
  // ---------------------------------------
  _autoCompleteServInputElement = (snippet) => {
    const serverInputAreaEl = this.shadowRoot.getElementById('panelMessageInputId');
    const localCommandParserEl = document.getElementById('localCommandParser');
    let last = '';
    const trailingSpaceKey = 32;
    // parse last space character delimitered string
    // console.log('snippet ' + snippet);
    //
    // Check snippet in list of IRC text commands
    let matchedCommand = '';
    if (localCommandParserEl.autoCompleteCommandList.length > 0) {
      for (let i = 0; i < localCommandParserEl.autoCompleteCommandList.length; i++) {
        if (localCommandParserEl.autoCompleteCommandList[i].indexOf(snippet.toUpperCase()) === 0) {
          matchedCommand = localCommandParserEl.autoCompleteCommandList[i];
        }
      }
    }
    // Check snippet in list of IRC text commands
    let matchedRawCommand = '';
    if (localCommandParserEl.autoCompleteRawCommandList.length > 0) {
      for (let i = 0; i < localCommandParserEl.autoCompleteRawCommandList.length; i++) {
        if (localCommandParserEl.autoCompleteRawCommandList[i]
          .indexOf(snippet.toUpperCase()) === 0) {
          matchedRawCommand = localCommandParserEl.autoCompleteRawCommandList[i];
        }
      }
    }
    // If valid irc command and if beginning of line where snippet = input.value
    if ((matchedCommand.length > 0) && (serverInputAreaEl.value === snippet)) {
      // #1 check if IRC text command?
      serverInputAreaEl.value =
        serverInputAreaEl.value.slice(0, serverInputAreaEl.value.length - snippet.length);
      serverInputAreaEl.value += matchedCommand;
      serverInputAreaEl.value += String.fromCharCode(trailingSpaceKey);
      last = matchedCommand;
    } else if ((matchedRawCommand.length > 0) &&
      (serverInputAreaEl.value.slice(0, 7).toUpperCase() === '/QUOTE ')) {
      // #2 Line starts with /QUOTE and rest is a valid raw irc command
      serverInputAreaEl.value =
        serverInputAreaEl.value.slice(0, serverInputAreaEl.value.length - snippet.length);
      serverInputAreaEl.value += matchedRawCommand;
      serverInputAreaEl.value += String.fromCharCode(trailingSpaceKey);
      last = matchedRawCommand;
    } else if (window.globals.ircState.nickName.toLowerCase()
      .indexOf(snippet.toLowerCase()) === 0) {
      // #3 check if my nickname
      // This also matches empty snipped, defaulting to nickname
      serverInputAreaEl.value =
        serverInputAreaEl.value.slice(0, serverInputAreaEl.value.length - snippet.length);
      serverInputAreaEl.value += window.globals.ircState.nickName;
      serverInputAreaEl.value += String.fromCharCode(trailingSpaceKey);
      last = window.globals.ircState.nickName;
      // #5 channel name replace space
    } else {
      // #7 not match other, abort, add trailing space
      serverInputAreaEl.value += String.fromCharCode(trailingSpaceKey);
    }
    return last;
  }; // _autoCompleteServInputElement()

  lastServAutoCompleteMatch = '';
  _serverAutoComplete = (e) => {
    const serverInputAreaEl = this.shadowRoot.getElementById('panelMessageInputId');
    const autoCompleteTabKey = 9;
    const autoCompleteSpaceKey = 32;
    const trailingSpaceKey = 32;
    if (!e.keyCode) return;

    if ((e.keyCode) && (e.keyCode === autoCompleteTabKey)) {
      if (serverInputAreaEl.value.length < 2) {
        e.preventDefault();
        return;
      }
      let snippet = '';
      const snippetArray = serverInputAreaEl.value.split(' ');
      if (snippetArray.length > 0) {
        snippet = snippetArray[snippetArray.length - 1];
      }
      if (snippet.length > 0) {
        if ((e.keyCode === autoCompleteTabKey) && (snippet.length > 0)) {
          this._autoCompleteServInputElement(snippet);
        }
      } else {
        if (serverInputAreaEl.value.toUpperCase() === '/QUIT ') {
          // scase of autocomplete /QUIT shows version
          serverInputAreaEl.value += window.globals.ircState.progName +
            ' ' + window.globals.ircState.progVersion;
        } else {
          // following space character, default to nickname
          serverInputAreaEl.value += window.globals.ircState.nickName;
        }
        serverInputAreaEl.value += String.fromCharCode(trailingSpaceKey);
      }
      e.preventDefault();
    } // case of tab key
    //
    // Case of space key to autocomplete on space-space
    if ((e.keyCode) && (e.keyCode === autoCompleteSpaceKey)) {
      if (serverInputAreaEl.value.length > 0) {
        // if previous characters is space (and this key is space too)
        if (serverInputAreaEl.value.charCodeAt(serverInputAreaEl.value.length - 1) ===
        autoCompleteSpaceKey) {
          if ((serverInputAreaEl.value.length > 1) &&
            (serverInputAreaEl.value.charCodeAt(serverInputAreaEl.value.length - 2) ===
            autoCompleteSpaceKey)) {
            //
            // auto complete from:  space-space-space
            //
            // Remove one of the space characters
            serverInputAreaEl.value =
              serverInputAreaEl.value.slice(0, serverInputAreaEl.value.length - 1);

            if (serverInputAreaEl.value.toUpperCase() === '/QUIT ') {
              // scase of autocomplete /QUIT shows version
              serverInputAreaEl.value +=
                window.globals.ircState.progName + ' ' + window.globals.ircState.progVersion;
            } else {
              // following space character, default to nickname
              serverInputAreaEl.value += window.globals.ircState.nickName;
            }
            serverInputAreaEl.value += String.fromCharCode(trailingSpaceKey);
            e.preventDefault();
          } else {
            //
            // auto complete from:  space-space-space
            //
            // remove trailing space to get snippet from split()
            serverInputAreaEl.value =
              serverInputAreaEl.value.slice(0, serverInputAreaEl.value.length - 1);
            let snippet = '';
            const snippetArray = serverInputAreaEl.value.split(' ');
            if (snippetArray.length > 0) {
              snippet = snippetArray[snippetArray.length - 1];
            }
            if (snippet.length > 0) {
              const matchStr = this._autoCompleteServInputElement(snippet);
              if (this.lastServAutoCompleteMatch !== matchStr) {
                this.lastServAutoCompleteMatch = matchStr;
                e.preventDefault();
              }
              // serverInputAreaEl.value += String.fromCharCode(autoCompleteSpaceKey);
            } else {
              // else, put it back again, snippet was zero length
              serverInputAreaEl.value += String.fromCharCode(autoCompleteSpaceKey);
            }
          }
        }
      } else {
        // do nothing, allow space to be appended
      }
    } // case of tab key
  };

  // -------------------------------------------------------------
  // Server Message filter
  //
  // Messages with specific handlers, such as channel messages
  // Are handled directly by the parser.
  //
  // This filter is to avoid duplication of messages
  // in the server window for case of alternate display
  //
  // This does not filter from View-Raw display
  //
  // Format: simple Array of strings
  // -------------------------------------------------------------
  ircMessageCommandDisplayFilter = [
    '331', // Topic
    '332', // Topic
    '333', // Topic
    '353', // Names
    '366', // End Names
    'JOIN',
    'KICK',
    'MODE',
    'cachedNICK'.toUpperCase(),
    'NICK',
    'NOTICE',
    'PART',
    'PING',
    'PONG',
    'PRIVMSG',
    'cachedQUIT'.toUpperCase(),
    'QUIT',
    'TOPIC',
    'WALLOPS'
  ];

  //
  // This is primarily intended to show non-IRC messages from server
  //
  displayPlainServerMessage = (message) => {
    const panelMessageDisplayEl = this.shadowRoot.getElementById('panelMessageDisplayId');
    panelMessageDisplayEl.value += message + '\n';
    // scroll to view new text
    panelMessageDisplayEl.scrollTop = panelMessageDisplayEl.scrollHeight;
  };

  // ---------------------------------------------------------------------------
  //
  // Messages from the IRC server are parsed for commands in another module.
  // If raw server message is selected, that is performed in another module.
  // Non-server messages, i.e. channel PRIVMSG are filtered in another module.
  //
  // Else, this is where filtered server message are formatted for display
  // ---------------------------------------------------------------------------

  // -------------------------------------------
  // This is called to apply message formatting
  // to IRC server message for display
  // -------------------------------------------
  displayFormattedServerMessage = (parsedMessage, message) => {
    const displayUtilsEl = document.getElementById('displayUtils');
    const displayMessage = (msg) => {
      const panelMessageDisplayEl = this.shadowRoot.getElementById('panelMessageDisplayId');
      panelMessageDisplayEl.value += msg + '\n';
      // scroll to view new text
      panelMessageDisplayEl.scrollTop = panelMessageDisplayEl.scrollHeight;
    };

    // This will skip prefix, command, and param[0], printing the rest
    // If title provided, it will replace timestamp
    const _showAfterParamZero = (parsedMessage, title) => {
      let msgString = '';
      if (parsedMessage.params.length > 1) {
        for (let i = 1; i < parsedMessage.params.length; i++) {
          msgString += ' ' + parsedMessage.params[i];
        }
      } else {
        console.log('Error _showAfterParamZero() no parsed field');
      }
      let outMessage = parsedMessage.timestamp + msgString;
      if (title) {
        outMessage = title + msgString;
      }
      displayMessage(
        displayUtilsEl.cleanFormatting(
          displayUtilsEl.cleanCtcpDelimiter(outMessage)));
    };

    // -------------------------------------------------
    // In first text field of message
    // Exchange Unix seconds with HH:MM:SS time format
    // -------------------------------------------------
    const _substituteHmsTime = (inMessage) => {
      const timeString = inMessage.split(' ')[0];
      const restOfMessage = inMessage.slice(timeString.length + 1, inMessage.length);
      const hmsString = displayUtilsEl.timestampToHMS(timeString);
      return hmsString + ' ' + restOfMessage;
    };

    //
    // Skip filtered messages
    //
    // This is to avoid message duplicates when response is
    //    shown from individual command processing
    if (this.ircMessageCommandDisplayFilter.indexOf(parsedMessage.command.toUpperCase()) >= 0) {
      return;
    } // if (filtered)

    if (this.shadowRoot.getElementById('panelDivId').getAttribute('lastDate') !==
      parsedMessage.datestamp) {
      this.shadowRoot.getElementById('panelDivId').setAttribute('lastDate',
        parsedMessage.datestamp);
      this.shadowRoot.getElementById('panelMessageDisplayId').value +=
        '\n=== ' + parsedMessage.datestamp + ' ===\n\n';
    }

    if (!window.globals.webState.cacheReloadInProgress) {
      if ((!('zoomPanelId' in window.globals.webState)) ||
        (window.globals.webState.zoomPanelId.length < 1)) {
        this.showPanel();
      }
    }

    switch (parsedMessage.command) {
      //
      // Server First connect messages
      //
      case '001':
      case '002':
      case '003':
      case '004':
        _showAfterParamZero(parsedMessage, null);
        break;
      case '005':
        break;
      case '250':
      case '251':
      case '252':
      case '254':
      case '255':
      case '265':
        _showAfterParamZero(parsedMessage, null);
        break;

      // Admin
      case '256':
      case '257':
      case '258':
      case '259':
        _showAfterParamZero(parsedMessage, null);
        break;
      //
      // Who response
      //
      case '315':
        displayMessage('WHO --End--');
        break;
      case '352':
        _showAfterParamZero(parsedMessage, 'WHO');
        break;

      //
      // Whois response
      //
      case '275':
      case '307':
      case '311':
      case '312':
      case '313':
      case '317':
      case '319':
      case '330':
      case '338':
      case '378':
      case '379':
      case '671':
        _showAfterParamZero(parsedMessage, 'WHOIS');
        break;
      // AWAY message
      case '301':
        if (parsedMessage.params.length !== 3) {
          // unexpected parse, just display verbatum from server
          _showAfterParamZero(parsedMessage, 'WHOIS');
        } else {
          // else, show: WHOIS <nick> is away: <away message>
          const outMessage = 'WHOIS ' +
            parsedMessage.params[1] +
            ' is away: ' +
            parsedMessage.params[2];
          displayMessage(
            displayUtilsEl.cleanFormatting(
              displayUtilsEl.cleanCtcpDelimiter(outMessage)));
        }
        break;
      case '318':
        displayMessage('WHOIS --End--');
        break;

      //
      // LIST
      //
      case '322': // irc server motd
        if (parsedMessage.params.length === 4) {
          let outMessage = 'LIST ' +
            parsedMessage.params[1] + ' ' +
            parsedMessage.params[2];
          if (parsedMessage.params[3]) {
            outMessage += ' ' + parsedMessage.params[3];
          };
          displayMessage(
            displayUtilsEl.cleanFormatting(
              displayUtilsEl.cleanCtcpDelimiter(outMessage)));
        } else {
          console.log('Error Msg 322 not have 4 parsed parameters');
        }
        break;
      case '321': // Start LIST
        // displayMessage('LIST --Start--');
        break;
      case '323': // End LIST
        displayMessage('LIST --End--');
        break;
      //
      // VERSION TODO
      //
      // case '351':
      //   _showAfterParamZero(parsedMessage, null);
      //   break;
      //
      // MOTD
      //
      case '372': // irc server motd
        _showAfterParamZero(parsedMessage, null);
        break;
      case '375': // Start MOTD
      case '376': // End MOTD
        break;

      //
      // IRCv3 CAP SASL authentication success messages
      //
      case '900':
      case '903':
        _showAfterParamZero(parsedMessage, null);
        break;

      case 'MODE':
        displayMessage(
          displayUtilsEl.cleanFormatting(
            displayUtilsEl.cleanCtcpDelimiter(
              parsedMessage.timestamp + ' ' +
              'MODE ' +
              parsedMessage.params[0] + ' ' +
              parsedMessage.params[1])));
        break;
      case 'cachedNICK':
        // Own nickname changes will be cached as channel = default
        if (parsedMessage.params[0] === 'default') {
          displayMessage(
            displayUtilsEl.cleanFormatting(
              displayUtilsEl.cleanCtcpDelimiter(
                parsedMessage.timestamp + ' ' +
                parsedMessage.nick + ' is now known as ' +
                parsedMessage.params[1])));
        }
        break;
      case 'NICK':
        // Only display own nickname changes in server window
        if (window.globals.ircState.nickName.toLowerCase() === parsedMessage.nick.toLowerCase()) {
          displayMessage(
            displayUtilsEl.cleanFormatting(
              displayUtilsEl.cleanCtcpDelimiter(
                parsedMessage.timestamp + ' ' +
                parsedMessage.nick + ' is now known as ' +
                parsedMessage.params[0])));
        }
        break;
      case 'NOTICE':
        displayMessage(
          displayUtilsEl.cleanFormatting(
            displayUtilsEl.cleanCtcpDelimiter(
              parsedMessage.timestamp + ' ' +
              'NOTICE ' +
              parsedMessage.params[0] + ' ' +
              parsedMessage.params[1])));

        break;
      // none match, use default
      default:
        // this is catch-all, if no formatted case, then display here
        displayMessage(
          displayUtilsEl.cleanFormatting(
            displayUtilsEl.cleanCtcpDelimiter(
              _substituteHmsTime(message))));
    } // switch
    //
    // If closed, open the server window to display the server message
    //
    if (!window.globals.webState.cacheReloadInProgress) {
      //
      // Do not open and display server window for these commands.
      //
      // 'NICK' (users changing nickname in channel is opening the server window
      //
      const inhibitCommandList = [
        'NICK',
        'PRIVMSG'
      ];
      if (('command' in parsedMessage) &&
        (typeof parsedMessage.command === 'string') &&
        (parsedMessage.command.length > 0)) {
        if (inhibitCommandList.indexOf(parsedMessage.command.toUpperCase()) < 0) {
          // Not in inhibit list, go ahead and open server window, else leave closed
          this.showPanel();
        }
      } else {
        this.showPanel();
      }
    }
  }; // displayFormattedServerMessage()

  // //
  // // Add cache reload message to server window
  // //
  // // Example:  14:33:02 -----Cache Reload-----
  // //
  // document.addEventListener('cache-reload-done', (event) => {
  //   //
  //   // If server display in raw mode, but not HEX mode, then after reloading cache
  //   // sort the lines by the timestamp in the cached message.
  //   // this is because multiple different cache buffers and combined
  //   // when viewing the raw server messages.
  //   //
  //   if ((webState.viewRawMessages) && (!webState.showRawInHex)) {
  //     const tempRawMessages =
  //       document.getElementById('rawMessageDisplay').value.split('\n');
  //     if (tempRawMessages.length > 1) {
  //       const tempTimestampArray = [];
  //       const tempSortIndexArray = [];
  //       const lineCount = tempRawMessages.length;
  //       for (let i = 0; i < lineCount; i++) {
  //         // @time=2022-09-04T19:56:01.900Z :nickname!user@host JOIN :#myChannel
  //         tempTimestampArray.push(new Date(
  //           tempRawMessages[i].split(' ')[0].split('=')[1]
  //         ));
  //         tempSortIndexArray.push(i);
  //       }
  //       let tempIndex = 0;
  //       for (let i = 0; i < lineCount; i++) {
  //         for (let j = 0; j < lineCount - 1; j++) {
  //           if (tempTimestampArray[tempSortIndexArray[j]] >
  //             tempTimestampArray[tempSortIndexArray[j + 1]]) {
  //             tempIndex = tempSortIndexArray[j];
  //             tempSortIndexArray[j] = tempSortIndexArray[j + 1];
  //             tempSortIndexArray[j + 1] = tempIndex;
  //           }
  //         } // next j
  //       } // next i
  //       document.getElementById('rawMessageDisplay').value = '';
  //       for (let i = 0; i < lineCount; i++) {
  //         document.getElementById('rawMessageDisplay').value +=
  //           tempRawMessages[tempSortIndexArray[i]] + '\n';
  //       }
  //     }
  //   } // if webState.viewRawMessages

  //   let markerString = '';
  //   let timestampString = '';
  //   if (('detail' in event) && ('timestamp' in event.detail)) {
  //     timestampString = unixTimestampToHMS(event.detail.timestamp);
  //   }
  //   if (timestampString) {
  //     markerString += timestampString;
  //   }
  //   markerString += ' ' + cacheReloadString + '\n';

  //   if (document.getElementById('rawMessageDisplay').value !== '') {
  //     document.getElementById('rawMessageDisplay').value += markerString;
  //     document.getElementById('rawMessageDisplay').scrollTop =
  //       document.getElementById('rawMessageDisplay').scrollHeight;
  //   }
  // });

  // document.addEventListener('cache-reload-error', (event) => {
  //   let errorString = '\n';
  //   let timestampString = '';
  //   if (('detail' in event) && ('timestamp' in event.detail)) {
  //     timestampString = unixTimestampToHMS(event.detail.timestamp);
  //   }
  //   if (timestampString) {
  //     errorString += timestampString;
  //   }
  //   errorString += ' ' + cacheErrorString + '\n\n';
  //   document.getElementById('rawMessageDisplay').value = errorString;
  // });

  // -----------------------------------
  // Update elapsed time display
  // and connect counter
  // called 1/second by timer tick
  // -----------------------------------
  updateElapsedTimeDisplay = () => {
    const toTimeString = (seconds) => {
      let remainSec = seconds;
      let day = 0;
      let hour = 0;
      let min = 0;
      let sec = 0;
      day = parseInt(remainSec / 86400);
      remainSec -= day * 86400;
      hour = parseInt(remainSec / 3600);
      remainSec -= hour * 3600;
      min = parseInt(remainSec / 60);
      sec = remainSec - (min * 60);
      return day.toString().padStart(3, ' ') + ' D ' +
        hour.toString().padStart(2, '0') + ':' +
        min.toString().padStart(2, '0') + ':' +
        sec.toString().padStart(2, '0');
    };
    let timeStr = '';
    const now = Math.floor(Date.now() / 1000);
    if (window.globals.webState.webConnected) {
      timeStr += 'Web Connected: ' +
        toTimeString(now - window.globals.webState.times.webConnect) +
        ' (' + window.globals.webState.count.webConnect.toString() + ')\n';
    } else {
      timeStr += 'Web Connected: N/A\n';
    }
    if (window.globals.ircState.ircConnected) {
      timeStr += 'IRC Connected: ' +
        toTimeString(now - window.globals.ircState.times.ircConnect) +
        ' (' + window.globals.ircState.count.ircConnect.toString() + ')\n';
    } else {
      timeStr += 'IRC Connected: N/A\n';
    }
    if (window.globals.webState.webConnected) {
      timeStr += 'Backend Start: ' +
        toTimeString(now - window.globals.ircState.times.programRun) + '\n';
    } else {
      timeStr += 'Backend Start: N/A\n';
    }
    if ((window.globals.ircState.ircConnected) && (window.globals.webState.lag.min < 9998)) {
      timeStr += 'IRC Lag: ' + window.globals.webState.lag.last.toFixed(3) +
        ' Min: ' + window.globals.webState.lag.min.toFixed(3) +
        ' Max: ' + window.globals.webState.lag.max.toFixed(3);
    } else {
      timeStr += 'IRC Lag: (Waiting next ping)';
    }
    if (!window.globals.ircState.ircConnected) {
      window.globals.webState.lag = {
        last: 0,
        min: 9999,
        max: 0
      };
    }
    this.shadowRoot.getElementById('elapsedTimeDiv').textContent = timeStr;
  };

  /**
   * Called once per second as task scheduler, called from js/_afterLoad.js
   */
  timerTickHandler = () => {
    this.updateElapsedTimeDisplay();
  };

  initializePlugin () {
    // do first to prevent page jitter
    this.updateElapsedTimeDisplay();
  }

  connectedCallback () {
    // -------------------------------------
    // 1 of 2 Listeners on internal elements
    // -------------------------------------

    this.shadowRoot.getElementById('closePanelButtonId').addEventListener('click', () => {
      this.hidePanel();
    });

    this.shadowRoot.getElementById('clearButtonId').addEventListener('click', () => {
      this.shadowRoot.getElementById('panelMessageDisplayId').value =
        '\nPanel cleared, this did not clear the message cache\n\n';
    });

    this.shadowRoot.getElementById('forceDisconnectButtonId').addEventListener('click', () => {
      document.getElementById('ircControlsPanel').forceDisconnectHandler()
        .catch((err) => {
          console.log(err);
          let message = err.message || err.toString() || 'Error occurred calling /irc/connect';
          // show only 1 line
          message = message.split('\n')[0];
          document.getElementById('errorPanel').showError(message);
        });
    });

    // -----------------------------------------------
    // Send IRC server textarea send button pressed
    // -----------------------------------------------
    this.shadowRoot.getElementById('sendButtonId').addEventListener('click', () => {
      this._parseInputForIRCCommands(document.getElementById('panelMessageInputId'));
      document.getElementById('panelMessageInputId').focus();
    });
    // ---------------------------------------
    // Send IRC server textarea Enter pressed
    // ---------------------------------------
    this.shadowRoot.getElementById('panelMessageInputId')
      .addEventListener('input', (event) => {
        if (((event.inputType === 'insertText') && (event.data === null)) ||
          (event.inputType === 'insertLineBreak')) {
          // Remove EOL characters at cursor location
          document.getElementById('displayUtils')
            .stripOneCrLfFromElement(this.shadowRoot.getElementById('panelMessageInputId'));
          this._parseInputForIRCCommands(this.shadowRoot.getElementById('panelMessageInputId'));
        }
      });

    // Auto complete, keypress detector
    this.shadowRoot.getElementById('panelMessageInputId')
      .addEventListener('keydown', this._serverAutoComplete, false);
    // -------------------------------------
    // 2 of 2 Listeners on global events
    // -------------------------------------

    /**
     * Event to collapse all panels. This panel does not collapse so it is hidden
     * @listens document:collapse-all-panels
     * @property {string|string[]} event.detail.except - No action if listed as exception
    */
    document.addEventListener('collapse-all-panels', (event) => {
      if ((event.detail) && (event.detail.except)) {
        if (typeof event.detail.except === 'string') {
          // this.id assigned in html/_index.html
          if (event.detail.except !== this.id) {
            this.collapsePanel();
          }
        } else if (Array.isArray(event.detail.except)) {
          if (event.detail.except.indexOf(this.id) < 0) {
            this.collapsePanel();
          }
        }
      } else {
        this.collapsePanel();
      }
    });

    /**
     * Global event listener on document object to implement changes to color theme
     * @listens document:color-theme-changed
     * @param {object} event.detail.theme - Color theme values 'light' or 'dark'
     */
    document.addEventListener('color-theme-changed', (event) => {
      const panelDivEl = this.shadowRoot.getElementById('panelDivId');
      const panelMessageDisplayEl = this.shadowRoot.getElementById('panelMessageDisplayId');
      const panelMessageInputEl = this.shadowRoot.getElementById('panelMessageInputId');
      const elapsedTimeOuterDivEl = this.shadowRoot.getElementById('elapsedTimeOuterDivId');
      if (event.detail.theme === 'light') {
        panelDivEl.classList.remove('irc-server-panel-theme-dark');
        panelDivEl.classList.add('irc-server-panel-theme-light');
        panelMessageDisplayEl.classList.remove('global-text-theme-dark');
        panelMessageDisplayEl.classList.add('global-text-theme-light');
        panelMessageInputEl.classList.remove('global-text-theme-dark');
        panelMessageInputEl.classList.add('global-text-theme-light');
        elapsedTimeOuterDivEl.classList.remove('global-text-theme-dark');
        elapsedTimeOuterDivEl.classList.add('global-text-theme-light');
      } else {
        panelDivEl.classList.remove('irc-server-panel-theme-light');
        panelDivEl.classList.add('irc-server-panel-theme-dark');
        panelMessageDisplayEl.classList.remove('global-text-theme-light');
        panelMessageDisplayEl.classList.add('global-text-theme-dark');
        panelMessageInputEl.classList.remove('global-text-theme-light');
        panelMessageInputEl.classList.add('global-text-theme-dark');
        elapsedTimeOuterDivEl.classList.remove('global-text-theme-light');
        elapsedTimeOuterDivEl.classList.add('global-text-theme-dark');
      }
    });

    /**
     * Global event listener on document object to detect state change of remote IRC server
     * Detect addition of new IRC channels and create channel panel.
     * Data source: ircState object
     * @listens document:irc-state-changed
     */
    document.addEventListener('irc-state-changed', () => {
      if (window.globals.ircState.ircConnected !== this.ircConnectedLast) {
        this.ircConnectedLast = window.globals.ircState.ircConnected;
        if (window.globals.ircState.ircConnected) {
          const now = Math.floor(Date.now() / 1000);
          const uptime = now - window.globals.ircState.times.ircConnect;
          // if connected to IRC server less than 5 seconds, show MOTD message
          if (uptime < 5) {
            this.showPanel();
          }
        }
        if (!window.globals.ircState.ircConnected) {
          this.hidePanel();
        }
      }
      this.shadowRoot.getElementById('programVersionDiv').textContent =
        ' version-' + window.globals.ircState.progVersion;
    });

    /**
     * Hide panel (not visible) unless listed as exception.
     * @listens document:hide-all-panels
     * @property {string|string[]} event.detail.except - No action if listed as exception
     */
    document.addEventListener('hide-all-panels', (event) => {
      if ((event.detail) && (event.detail.except)) {
        if (typeof event.detail.except === 'string') {
          // this.id assigned in html/_index.html
          if (event.detail.except !== this.id) {
            this.hidePanel();
          }
        } else if (Array.isArray(event.detail.except)) {
          if (event.detail.except.indexOf(this.id) < 0) {
            this.hidePanel();
          }
        }
      } else {
        this.hidePanel();
      }
    });

    /**
     * Change size of textArea elements to fit page
     * @listens document:resize-custom-elements
     */
    document.addEventListener('resize-custom-elements', () => {
      if (window.globals.webState.dynamic.inputAreaCharWidthPx) {
        const calcInputAreaColSize = document.getElementById('displayUtils').calcInputAreaColSize;
        // pixel width mar1 is reserved space on edges of input area at full screen width
        const mar1 = window.globals.webState.dynamic.commonMargin;
        const mar2 = window.globals.webState.dynamic.commonMargin + 5 +
          window.globals.webState.dynamic.sendButtonWidthPx;
        // set width of input area elements
        this.shadowRoot.getElementById('panelMessageDisplayId')
          .setAttribute('cols', calcInputAreaColSize(mar1));
        this.shadowRoot.getElementById('panelMessageInputId')
          .setAttribute('cols', document.getElementById('displayUtils').calcInputAreaColSize(mar2));
      }
    });

    /**
     * Make panel visible unless listed as exception.
     * @listens document:show-all-panels
     * @param {string|string[]} event.detail.except - No action if listed as exception
     */
    document.addEventListener('show-all-panels', (event) => {
      if ((event.detail) && (event.detail.except)) {
        if (typeof event.detail.except === 'string') {
          // this.id assigned in html/_index.html
          if (event.detail.except !== this.id) {
            this.showPanel();
          }
        } else if (Array.isArray(event.detail.except)) {
          if (event.detail.except.indexOf(this.id) < 0) {
            this.showPanel();
          }
        }
      } else {
        this.showPanel();
      }
    });
  } // connectedCallback()
});
