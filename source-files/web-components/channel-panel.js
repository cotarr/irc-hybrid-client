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
// This web component is a UI for a dynamically inserted IRC channel panel.
//
//   * TBD description
//
// Global Event listeners
//   cache-reload-done
//   cache-reload-error
//   cancel-beep-sounds
//   collapse-all-panels
//   color-theme-changed
//   erase-before-reload
//   hide-all-panels
//   irc-state-changed
//   resize-custom-elements
//   show-all-panels
//
// Dispatched Events
//   debounced-update-from-cache
//   hide-all-panels
//   update-channel-count
//   update-from-cache
//
// Example channel message (event.detail)
//   "parsedMessage": {
//     "timestamp": "10:23:34",
//     "datestamp": "2023-08-18",
//     "prefix": "myNick!~myUser@127.0.0.1",
//     "nick": "myNick",
//     "host": "~myUser@127.0.0.1",
//     "command": "PRIVMSG",
//     "params": [
//       "#myChannel",
//       "This is a channel message"
//     ]
//   }
// ------------------------------------------------------------------------------
// TODO: Multi-line paste send not work in offline debug

'use strict';
window.customElements.define('channel-panel', class extends HTMLElement {
  constructor () {
    super();
    const template = document.getElementById('channelPanelTemplate');
    const templateContent = template.content;
    this.attachShadow({ mode: 'open' })
      .appendChild(templateContent.cloneNode(true));
    this.channelName = '';
    this.channelCsName = '';
    this.maxNickLength = 0;
    this.activityIconInhibitTimer = 0;
    this.channelIndex = null;
    this.initIrcStateIndex = null;
    this.unreadMessageCount = 0;

    // Default values
    this.mobileBreakpointPx = 600;
    this.defaultHeightInRows = '14';
    this.channelNamesCharWidth = 20;
  }

  // ------------------------------------------
  // Send text to channel (internal function)
  // Intercept IRC text command if detected
  // ------------------------------------------
  _sendTextToChannel = (channelIndex, textAreaEl) => {
    const text = document.getElementById('displayUtils').stripTrailingCrLf(textAreaEl.value);
    if (document.getElementById('displayUtils').detectMultiLineString(text)) {
      textAreaEl.value = '';
      document.getElementById('errorPanel').showError('Multi-line input is not supported.');
    } else {
      if (text.length > 0) {
        // Check slash character to see if it is an IRC command
        if (text.charAt(0) === '/') {
          // yes, it is command
          const commandAction = document.getElementById('localCommandParser').textCommandParser(
            {
              inputString: text,
              originType: 'channel',
              originName: window.globals.ircState.channelStates[channelIndex].name
            }
          );
          // clear input element
          textAreaEl.value = '';
          if (commandAction.error) {
            document.getElementById('errorPanel').showError(commandAction.message);
            return;
          } else {
            if ((commandAction.ircMessage) && (commandAction.ircMessage.length > 0)) {
              document.getElementById('ircControlsPanel')
                .sendIrcServerMessage(commandAction.ircMessage);
            }
            return;
          }
        }

        // Else not slash / command, assume is input intended to send to channel.
        //
        // Check if marked away, if so cancel away, 1 second delay
        //
        if ((window.globals.ircState.ircConnected) && (window.globals.ircState.ircIsAway)) {
          setTimeout(() => {
            // check again after timer, abort if not away
            if ((window.globals.ircState.ircConnected) && (window.globals.ircState.ircIsAway)) {
              // cancel away state, IRC server response will be parsed in backend

              document.getElementById('ircControlsPanel').sendIrcServerMessage('AWAY');
            }
          }, 1000);
        }
        //
        // Send message to channel
        //
        const message = 'PRIVMSG ' +
        window.globals.ircState.channelStates[channelIndex].name + ' :' + text;
        document.getElementById('ircControlsPanel').sendIrcServerMessage(message);
        textAreaEl.value = '';
      }
    }
    textAreaEl.value = '';
  }; // _sendTextToChannel

  /**
   * Convert multi-line string to array of strings
   * End of line characters LF or CR+LF are removed.
   * @param {string} multiLineContent
   * @returns {string[]} returns array of strings
   */
  _splitMultiLinePaste = (multiLineContent) => {
    if (typeof multiLineContent !== 'string') return [];
    if (multiLineContent.length === 0) return [];
    const outArray = [];
    // Split each line from clipboard content into array strings using '\n' (LF)
    const inArray = multiLineContent.split('\n');
    if (inArray.length > 0) {
      // loop through each string
      for (let i = 0; i < inArray.length; i++) {
        let nextLine = inArray[i];
        if (nextLine.length > 0) {
          // If this is a MS Windows string, it may end in '\r\n' (CR+LF)
          // The \n is already removed by the previous .split('\n')
          // In the case of a Windows format string, the '\r' CR may remain.
          //
          // Does string end in '\r' (CR)
          if (nextLine.charCodeAt(nextLine.length - 1) === 13) {
            // Case of windows string format, remove the CR
            nextLine = nextLine.slice(0, nextLine.length - 1);
          }
          if (nextLine.length > 0) outArray.push(nextLine);
        }
      }
    }
    return outArray;
  }; // _splitMultiLinePaste

  // -----------------------------------------------------
  // Increment channel message counter and make visible
  // -----------------------------------------------------
  _incrementMessageCount = () => {
    this.unreadMessageCount++;
    this.shadowRoot.getElementById('messageCountIconId')
      .textContent = this.unreadMessageCount.toString();
    this.shadowRoot.getElementById('messageCountIconId')
      .removeAttribute('hidden');
    document.dispatchEvent(new CustomEvent('update-channel-count',
      {
        detail: {
          channel: this.channelName,
          unreadMessageCount: this.unreadMessageCount
        }
      }
    ));
  };

  // Clear and hide count icon
  _resetMessageCount = () => {
    this.unreadMessageCount = 0;
    this.shadowRoot.getElementById('messageCountIconId')
      .textContent = this.unreadMessageCount.toString();
    this.shadowRoot.getElementById('messageCountIconId')
      .setAttribute('hidden', '');
    document.dispatchEvent(new CustomEvent('update-channel-count',
      {
        detail: {
          channel: this.channelName,
          unreadMessageCount: this.unreadMessageCount
        }
      }
    ));
  };

  showPanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible', '');
    this.shadowRoot.getElementById('panelCollapsedDivId').setAttribute('visible', '');
    this.shadowRoot.getElementById('hideWithCollapseId').removeAttribute('hidden');
    this.shadowRoot.getElementById('bottomCollapseDivId').setAttribute('hidden', '');
    this.handleCancelZoomEvent();
    // scroll to top
    const panelMessageDisplayEl = this.shadowRoot.getElementById('panelMessageDisplayId');
    panelMessageDisplayEl.scrollTop = panelMessageDisplayEl.scrollHeight;
  };

  collapsePanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible', '');
    this.shadowRoot.getElementById('panelCollapsedDivId').removeAttribute('visible');
    this.shadowRoot.getElementById('hideWithCollapseId').setAttribute('hidden', '');
    this.shadowRoot.getElementById('bottomCollapseDivId').setAttribute('hidden', '');
    // when collapsing panel channel, if zoomed, cancel the zoom
    this.handleCancelZoomEvent();
  };

  hidePanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible');
    this.shadowRoot.getElementById('panelCollapsedDivId').removeAttribute('visible');
    this.shadowRoot.getElementById('hideWithCollapseId').removeAttribute('hidden');
    // when closing channel, if zoomed, cancel the zoom
    this.handleCancelZoomEvent();
  };

  _handleCloseButton = () => {
    this.hidePanel();
  };

  _handleCollapseButton = () => {
    if (this.shadowRoot.getElementById('panelCollapsedDivId').hasAttribute('visible')) {
      this.collapsePanel();
    } else {
      this.showPanel();
    }
  };

  _handleClearButton = () => {
    this.shadowRoot.getElementById('panelMessageDisplayId').value = '';
    // needed to display date on first message
    this.shadowRoot.getElementById('panelDivId')
      .setAttribute('lastDate', '0000-00-00');
    this.shadowRoot.getElementById('panelNickListId')
      .setAttribute('rows', this.defaultHeightInRows);
    this.shadowRoot.getElementById('panelMessageDisplayId')
      .setAttribute('rows', this.defaultHeightInRows);
    this.shadowRoot.getElementById('panelMessageInputId')
      .setAttribute('rows', '1');
  };

  _handleTallerButton = () => {
    const newRows = parseInt(this.shadowRoot.getElementById('panelMessageDisplayId')
      .getAttribute('rows')) + 10;
    this.shadowRoot.getElementById('panelNickListId').setAttribute('rows', newRows);
    this.shadowRoot.getElementById('panelMessageDisplayId').setAttribute('rows', newRows);
    this.shadowRoot.getElementById('panelMessageInputId').setAttribute('rows', '3');
  };

  _handleNormalButton = () => {
    this.shadowRoot.getElementById('panelNickListId')
      .setAttribute('rows', this.defaultHeightInRows);
    this.shadowRoot.getElementById('panelMessageDisplayId')
      .setAttribute('rows', this.defaultHeightInRows);
    this.shadowRoot.getElementById('panelMessageInputId').setAttribute('rows', '1');
  };

  // -------------------------
  // Join button handler
  // -------------------------
  handleChannelJoinButtonElClick = (event) => {
    const message = 'JOIN ' + this.channelCsName;
    document.getElementById('ircControlsPanel').sendIrcServerMessage(message);
  };

  // -------------------------
  // Part button handler
  // -------------------------
  handleChannelPartButtonElClick = (event) => {
    const message = 'PART ' + this.channelName + ' :' + window.globals.ircState.progName +
     ' ' + window.globals.ircState.progVersion;
    document.getElementById('ircControlsPanel').sendIrcServerMessage(message);
  };

  // -------------------------
  // Prune button handler
  // -------------------------
  handleChannelPruneButtonElClick = (event) => {
    // Fetch API to remove channel from backend server
    const index = window.globals.ircState.channels.indexOf(this.channelName.toLowerCase());
    if (index >= 0) {
      // if not joined, this is quietly ignored without error
      if (!window.globals.ircState.channelStates[index].joined) {
        // If the channel is successfully removed from server
        // The server will response with a state change
        // The irc-state-change event handler
        // will detect the channel has been removed
        // It will remove it's window from the DOM
        document.getElementById('ircControlsPanel').pruneIrcChannel(this.channelName)
          .catch((err) => {
            console.log(err);
            let message = err.message || err.toString() || 'Error occurred calling /irc/connect';
            // show only 1 line
            message = message.split('\n')[0];
            document.getElementById('errorPanel').showError(message);
          });
      } // not joined
    } // index > 0
  }; // handleChannelPruneButtonElClick

  _handleRefreshButton = () => {
    if (!window.globals.webState.cacheReloadInProgress) {
      // this forces a global update which will refresh text area
      document.dispatchEvent(new CustomEvent('update-from-cache'));
    }
  };

  // -----------------------
  // Detect paste event,
  // Check clipboard, if multi-line, make multi-line send button visible
  // -----------------------
  handleChannelInputAreaElPaste = (event) => {
    if (this._splitMultiLinePaste(event.clipboardData.getData('text')).length > 1) {
      // Screen size changes when input area is taller, cancel zoom
      this.handleCancelZoomEvent();
      // Make multi-line clipboard past notice visible and show button
      this.shadowRoot.getElementById('multiLineSendSpanId').textContent = 'Clipboard (' +
      this._splitMultiLinePaste(event.clipboardData.getData('text')).length + ' lines)';
      this.shadowRoot.getElementById('multiLineActionDivId').removeAttribute('hidden');
      this.shadowRoot.getElementById('panelMessageInputId').setAttribute('rows', '3');
    };
  }; // handleChannelInputAreaElPaste()

  // -------------
  // Event handler for clipboard
  // multi-line paste, Send button
  // -------------
  handleMultiLineSendButtonClick = (event) => {
    const multiLineArray = this._splitMultiLinePaste(
      this.shadowRoot.getElementById('panelMessageInputId').value);
    if (multiLineArray.length > 100) {
      this.shadowRoot.getElementById('multiLineActionDivId').setAttribute('hidden', '');
      this.shadowRoot.getElementById('panelMessageInputId').value = '';
      document.getElementById('errorPanel')
        .showError('Maximum multi-line clipboard paste 100 Lin`es');
    } else {
      // initialize state flags
      const lastIrcConnect = window.globals.ircState.times.ircConnect;
      const lastWebConnect = window.globals.webState.times.webConnect;
      let abortedFlag = false;
      // Avoid flood detect with delay timer, milliseconds per line sent
      const delayIntervalMs = 2000;
      let delayMs = 0;
      if (multiLineArray.length > 0) {
        // Show each line in inputArea while waiting for timer
        this.shadowRoot.getElementById('panelMessageInputId').setAttribute('rows', '1');
        this.shadowRoot.getElementById('panelMessageInputId').value = multiLineArray[0];
        // Loop through lines creating a timer for each line
        for (let i = 0; i < multiLineArray.length; i++) {
          delayMs += delayIntervalMs;
          setTimeout(() => {
            let okToSend = false;
            if (
              // First, are we connected to IRC server?
              (window.globals.ircState.ircConnected) &&
              // And, not re-connected IRC
              (lastIrcConnect === window.globals.ircState.times.ircConnect) &&
              // And, not re-connected Webserver
              (lastWebConnect === window.globals.webState.times.webConnect) &&
              // And, not aborted
              (!abortedFlag)) {
              okToSend = true;
            }
            if (okToSend) {
              const index = window.globals.ircState.channels
                .indexOf(this.channelName.toLowerCase());
              if (index >= 0) {
                // Is client still JOIN to the IRC channel?
                if (!window.globals.ircState.channelStates[index].joined) okToSend = false;
                // and channel window not hidden with [-] button
              }
              if (!this.shadowRoot.getElementById('panelDivId')
                .hasAttribute('visible')) okToSend = false;
              if (!this.shadowRoot.getElementById('panelCollapsedDivId')
                .hasAttribute('visible')) okToSend = false;
            }
            // TODO okToSend = false in isolated panel debug after rewrite
            if (!okToSend) {
              // once not ok, don't try again
              abortedFlag = true;
            } else {
              // Send message to IRC channel
              const message = 'PRIVMSG ' +
                window.globals.ircState.channelStates[this.channelIndex].name +
                ' :' + multiLineArray[i];
              document.getElementById('ircControlsPanel').sendIrcServerMessage(message);
              if (i !== multiLineArray.length - 1) {
                // Show each line in inputArea while waiting for timer
                this.shadowRoot.getElementById('panelMessageInputId').value = multiLineArray[i + 1];
              } else {
                this.shadowRoot.getElementById('panelMessageInputId').value = '';
              }
            } // send to channel
          }, delayMs); // timer
        } // next i
        // timers created, now hide button
        this.shadowRoot.getElementById('multiLineActionDivId').setAttribute('hidden', '');
      } else {
        // case of single line paste, hide div without action
        this.shadowRoot.getElementById('multiLineActionDivId').setAttribute('hidden', '');
      }
    } // case of less than max allowed lines
  }; // handleMultiLineSendButtonClick()

  // -------------
  // send button
  // -------------
  handleChannelSendButtonElClick = (event) => {
    this._sendTextToChannel(this.channelIndex,
      this.shadowRoot.getElementById('panelMessageInputId'));
    this.shadowRoot.getElementById('panelMessageInputId').focus();
    this._resetMessageCount();
    this.activityIconInhibitTimer = document.getElementById('globVars')
      .constants('activityIconInhibitTimerValue');
    // clear multi-line paste notice if present
    this.shadowRoot.getElementById('multiLineActionDivId').setAttribute('hidden', '');
  };

  // ---------------
  // Enter pressed
  // ---------------
  handleChannelInputAreaElInput = (event) => {
    if (((event.inputType === 'insertText') && (event.data === null)) ||
      (event.inputType === 'insertLineBreak')) {
      // Remove EOL characters at cursor location
      document.getElementById('displayUtils')
        .stripOneCrLfFromElement(this.shadowRoot.getElementById('panelMessageInputId'));
      this._sendTextToChannel(this.channelIndex,
        this.shadowRoot.getElementById('panelMessageInputId'));
      this._resetMessageCount();
      this.activityIconInhibitTimer = document.getElementById('globVars')
        .constants('activityIconInhibitTimerValue');
      // hide notice for multi-line clipboard paste
      this.shadowRoot.getElementById('multiLineActionDivId').setAttribute('hidden', '');
    }
  };

  handleBottomCollapseButton = () => {
    this.handleCancelZoomEvent();
    const bottomCollapseDivEl = this.shadowRoot.getElementById('bottomCollapseDivId');
    if (bottomCollapseDivEl.hasAttribute('hidden')) {
      bottomCollapseDivEl.removeAttribute('hidden');
    } else {
      bottomCollapseDivEl.setAttribute('hidden', '');
    }
  };

  updateVisibility = () => {
    const panelDivEl = this.shadowRoot.getElementById('panelDivId');
    const beep1CheckBoxEl = this.shadowRoot.getElementById('beep1CheckBoxId');
    const beep2CheckBoxEl = this.shadowRoot.getElementById('beep2CheckBoxId');
    const beep3CheckBoxEl = this.shadowRoot.getElementById('beep3CheckBoxId');
    const briefCheckboxEl = this.shadowRoot.getElementById('briefCheckboxId');
    const autocompleteCheckboxEl = this.shadowRoot.getElementById('autocompleteCheckboxId');
    const autoCompleteTitleEl = this.shadowRoot.getElementById('autoCompleteTitle');

    if (panelDivEl.hasAttribute('beep1-enabled')) {
      beep1CheckBoxEl.checked = true;
    } else {
      beep1CheckBoxEl.checked = false;
    }
    if (panelDivEl.hasAttribute('beep2-enabled')) {
      beep2CheckBoxEl.checked = true;
    } else {
      beep2CheckBoxEl.checked = false;
    }
    if (panelDivEl.hasAttribute('beep3-enabled')) {
      beep3CheckBoxEl.checked = true;
    } else {
      beep3CheckBoxEl.checked = false;
    }

    if (panelDivEl.hasAttribute('brief-enabled')) {
      briefCheckboxEl.checked = true;
      autoCompleteTitleEl.textContent = 'Auto-complete (tab, space-space)';
    } else {
      briefCheckboxEl.checked = false;
      autoCompleteTitleEl.textContent = 'Auto-complete (tab)';
    }
    if (panelDivEl.hasAttribute('auto-comp-enabled')) {
      autocompleteCheckboxEl.checked = true;
    } else {
      autocompleteCheckboxEl.checked = false;
    }
  };

  // -------------------------
  // Zoom button handler
  // -------------------------
  handleChannelZoomButtonElClick = (event) => {
    const bodyEl = document.querySelector('body');
    const headerBarEl = document.getElementById('headerBar');
    const zoomButtonEl = this.shadowRoot.getElementById('zoomButtonId');
    const bottomCollapseDivEl = this.shadowRoot.getElementById('bottomCollapseDivId');
    if ((bodyEl.hasAttribute('zoomId')) &&
      (bodyEl.getAttribute('zoomId') === 'channel:' + this.channelName.toLowerCase())) {
      // Turn off channel zoom
      bodyEl.removeAttribute('zoomId');
      headerBarEl.setHeaderBarIcons({ zoom: false });
      zoomButtonEl.textContent = 'Zoom';
      zoomButtonEl.classList.remove('channel-panel-zoomed');
      // reset screen size back to default
      bottomCollapseDivEl.setAttribute('hidden', '');
      this._handleNormalButton();
      this._handleGlobalWindowResize();
    } else {
      bodyEl.setAttribute('zoomId', 'channel:' + this.channelName.toLowerCase());
      headerBarEl.setHeaderBarIcons({ zoom: true });
      zoomButtonEl.textContent = 'UnZoom';
      zoomButtonEl.classList.add('channel-panel-zoomed');
      document.dispatchEvent(new CustomEvent('hide-all-panels', {
        detail: {
          except: ['channel:' + this.channelName.toLowerCase()]
        }
      }));
      // Hide stuff below the input bar.
      bottomCollapseDivEl.setAttribute('hidden', '');
      // This sets size for zoomed page
      this._handleGlobalWindowResize();
    }
  };

  handleCancelZoomEvent = () => {
    const bodyEl = document.querySelector('body');
    const headerBarEl = document.getElementById('headerBar');
    const zoomButtonEl = this.shadowRoot.getElementById('zoomButtonId');
    const bottomCollapseDivEl = this.shadowRoot.getElementById('bottomCollapseDivId');
    if ((bodyEl.hasAttribute('zoomId')) &&
      (bodyEl.getAttribute('zoomId') === 'channel:' + this.channelName.toLowerCase())) {
      // Turn off channel zoom
      bodyEl.removeAttribute('zoomId');
      headerBarEl.setHeaderBarIcons({ zoom: false });
      zoomButtonEl.textContent = 'Zoom';
      zoomButtonEl.classList.remove('channel-panel-zoomed');
      // reset screen size back to default
      bottomCollapseDivEl.setAttribute('hidden', '');
      this._handleNormalButton();
      this._handleGlobalWindowResize();
    }
  };

  // --------------------------------------------------
  // Function to update window.localStorage with IRC
  //       channel beep enabled checkbox state.
  // Called when checkbox is clicked to enable/disable
  // --------------------------------------------------
  updateLocalStorageBeepEnable = () => {
    // new object for channel beep enable status
    const now = Math.floor(Date.now() / 1000);
    const beepEnableObj = {
      timestamp: now,
      channel: this.channelName.toLowerCase(),
      beep1: this.shadowRoot.getElementById('panelDivId').hasAttribute('beep1-enabled'),
      beep2: this.shadowRoot.getElementById('panelDivId').hasAttribute('beep2-enabled'),
      beep3: this.shadowRoot.getElementById('panelDivId').hasAttribute('beep3-enabled')
    };

    // Get array of previous IRC channel, each with status object
    let beepChannelIndex = -1;
    let beepEnableChanArray = null;
    beepEnableChanArray = JSON.parse(window.localStorage.getItem('beepEnableChanArray'));
    if ((beepEnableChanArray) &&
      (Array.isArray(beepEnableChanArray))) {
      if (beepEnableChanArray.length > 0) {
        for (let i = 0; i < beepEnableChanArray.length; i++) {
          if (beepEnableChanArray[i].channel === this.channelName.toLowerCase()) {
            beepChannelIndex = i;
          }
        }
      }
    } else {
      // Array did not exist, create it
      beepEnableChanArray = [];
    }
    if (beepChannelIndex >= 0) {
      // update previous element
      beepEnableChanArray[beepChannelIndex] = beepEnableObj;
    } else {
      // create new element
      beepEnableChanArray.push(beepEnableObj);
    }
    window.localStorage.setItem('beepEnableChanArray', JSON.stringify(beepEnableChanArray));
  }; // updateLocalStorageBeepEnable()

  // ---------------------------------------------------
  // For this channel, load web browser local storage
  // beep enable state.
  // ---------------------------------------------------
  loadBeepEnable = () => {
    let beepChannelIndex = -1;
    let beepEnableChanArray = null;
    beepEnableChanArray = JSON.parse(window.localStorage.getItem('beepEnableChanArray'));
    if ((beepEnableChanArray) &&
      (Array.isArray(beepEnableChanArray))) {
      if (beepEnableChanArray.length > 0) {
        for (let i = 0; i < beepEnableChanArray.length; i++) {
          if (beepEnableChanArray[i].channel === this.channelName.toLowerCase()) {
            beepChannelIndex = i;
          }
        }
      }
    }
    if (beepChannelIndex >= 0) {
      if (beepEnableChanArray[beepChannelIndex].beep1) {
        this.shadowRoot.getElementById('panelDivId').setAttribute('beep1-enabled', '');
      }
      if (beepEnableChanArray[beepChannelIndex].beep2) {
        this.shadowRoot.getElementById('panelDivId').setAttribute('beep2-enabled', '');
      }
      if (beepEnableChanArray[beepChannelIndex].beep3) {
        this.shadowRoot.getElementById('panelDivId').setAttribute('beep3-enabled', '');
      }
    }
    this.updateVisibility();
  };

  // -------------------------
  // Beep On Message checkbox handler
  // -------------------------
  handleChannelBeep1CBInputElClick = (event) => {
    const panelDivEl = this.shadowRoot.getElementById('panelDivId');
    if (panelDivEl.hasAttribute('beep1-enabled')) {
      panelDivEl.removeAttribute('beep1-enabled');
    } else {
      panelDivEl.setAttribute('beep1-enabled', '');
      document.getElementById('beepSounds').playBeep1Sound();
    }
    this.updateLocalStorageBeepEnable();
    this.updateVisibility();
  };

  // -------------------------
  // Beep On Join checkbox handler
  // -------------------------
  handleChannelBeep2CBInputElClick = (event) => {
    const panelDivEl = this.shadowRoot.getElementById('panelDivId');
    if (panelDivEl.hasAttribute('beep2-enabled')) {
      panelDivEl.removeAttribute('beep2-enabled');
    } else {
      panelDivEl.setAttribute('beep2-enabled', '');
      document.getElementById('beepSounds').playBeep1Sound();
    }
    this.updateLocalStorageBeepEnable();
    this.updateVisibility();
  };

  // -------------------------
  // Beep On match my nickname checkbox handler
  // -------------------------
  handleChannelBeep3CBInputElClick = (event) => {
    const panelDivEl = this.shadowRoot.getElementById('panelDivId');
    if (panelDivEl.hasAttribute('beep3-enabled')) {
      panelDivEl.removeAttribute('beep3-enabled');
    } else {
      panelDivEl.setAttribute('beep3-enabled', '');
      document.getElementById('beepSounds').playBeep1Sound();
    }
    this.updateLocalStorageBeepEnable();
    this.updateVisibility();
  };

  // -----------------------
  // Cancel all beep sounds
  // -----------------------
  handleCancelBeepSounds = (event) => {
    const panelDivEl = this.shadowRoot.getElementById('panelDivId');
    panelDivEl.removeAttribute('beep1-enabled');
    panelDivEl.removeAttribute('beep2-enabled');
    panelDivEl.removeAttribute('beep3-enabled');
  };

  // -------------------------
  // Text Format checkbox handler
  // -------------------------
  handleBriefCheckboxClick = (event) => {
    const panelDivEl = this.shadowRoot.getElementById('panelDivId');
    if (panelDivEl.hasAttribute('brief-enabled')) {
      panelDivEl.removeAttribute('brief-enabled');
    } else {
      panelDivEl.setAttribute('brief-enabled', '');
    }
    this.updateVisibility();

    // this forces a global update which will refresh text area
    document.dispatchEvent(new CustomEvent('update-from-cache', { bubbles: true }));
  };

  // -------------------------
  // AutoComplete checkbox handler
  // -------------------------
  handleAutoCompleteCheckboxClick = (event) => {
    const panelDivEl = this.shadowRoot.getElementById('panelDivId');
    if (panelDivEl.hasAttribute('auto-comp-enabled')) {
      panelDivEl.removeAttribute('auto-comp-enabled');
    } else {
      panelDivEl.setAttribute('auto-comp-enabled', '');
    }
    this.updateVisibility();
  };

  // ---------------------------------------
  // textarea before input event handler
  //
  // Auto complete function
  //
  // Keys:  desktop: tab,  mobile phone: space-space
  // Channel name selected by tab-tab or space-space-space
  // ---------------------------------------
  _autoCompleteInputElement = (snippet) => {
    let last = '';
    const trailingSpaceKey = 32;
    const panelMessageInputEl = this.shadowRoot.getElementById('panelMessageInputId');
    const autoCompleteCommandList =
      document.getElementById('localCommandParser').autoCompleteCommandList;
    const autoCompleteRawCommandList =
      document.getElementById('localCommandParser').autoCompleteRawCommandList;
    const nicknamePrefixChars = document.getElementById('globVars')
      .constants('nicknamePrefixChars');
    // parse last space character delimitered string
    // console.log('snippet ' + snippet);
    //
    // Check snippet in list of IRC text commands
    let matchedCommand = '';
    if (autoCompleteCommandList.length > 0) {
      for (let i = 0; i < autoCompleteCommandList.length; i++) {
        if (autoCompleteCommandList[i].indexOf(snippet.toUpperCase()) === 0) {
          matchedCommand = autoCompleteCommandList[i];
        }
      }
    }
    // Check snippet in list of IRC text commands
    let matchedRawCommand = '';
    if (autoCompleteRawCommandList.length > 0) {
      for (let i = 0; i < autoCompleteRawCommandList.length; i++) {
        if (autoCompleteRawCommandList[i].indexOf(snippet.toUpperCase()) === 0) {
          matchedRawCommand = autoCompleteRawCommandList[i];
        }
      }
    }
    // If valid irc command and if beginning of line where snippet = input.value
    if ((matchedCommand.length > 0) && (panelMessageInputEl.value === snippet)) {
      // #1 check if IRC text command?
      panelMessageInputEl.value =
        panelMessageInputEl.value.slice(0, panelMessageInputEl.value.length - snippet.length);
      panelMessageInputEl.value += matchedCommand;
      panelMessageInputEl.value += String.fromCharCode(trailingSpaceKey);
      last = matchedCommand;
    } else if ((matchedRawCommand.length > 0) &&
      (panelMessageInputEl.value.slice(0, 7).toUpperCase() === '/QUOTE ')) {
      // #2 Line starts with /QUOTE and rest is a valid raw irc command
      panelMessageInputEl.value =
        panelMessageInputEl.value.slice(0, panelMessageInputEl.value.length - snippet.length);
      panelMessageInputEl.value += matchedRawCommand;
      panelMessageInputEl.value += String.fromCharCode(trailingSpaceKey);
      last = matchedRawCommand;
    } else if (this.channelName.toLowerCase().indexOf(snippet.toLowerCase()) === 0) {
      // #3 Check if # for channel name
      // This also matches empty snipped, defaulting to channel name
      panelMessageInputEl.value =
        panelMessageInputEl.value.slice(0, panelMessageInputEl.value.length - snippet.length);
      // Use case sensitive name
      panelMessageInputEl.value += this.channelCsName;
      panelMessageInputEl.value += String.fromCharCode(trailingSpaceKey);
      last = this.channelCsName;
    } else if (window.globals.ircState.nickName.toLowerCase()
      .indexOf(snippet.toLowerCase()) === 0) {
      // #4 check if my nickname
      panelMessageInputEl.value =
        panelMessageInputEl.value.slice(0, panelMessageInputEl.value.length - snippet.length);
      panelMessageInputEl.value += window.globals.ircState.nickName;
      panelMessageInputEl.value += String.fromCharCode(trailingSpaceKey);
      last = window.globals.ircState.nickName;
      // #5 channel name replace space
    } else {
      // #6 check channel nickname list
      let completeNick = '';
      const chanIndex = window.globals.ircState.channels.indexOf(this.channelName.toLowerCase());
      if (chanIndex >= 0) {
        if (window.globals.ircState.channelStates[chanIndex].names.length > 0) {
          for (let i = 0; i < window.globals.ircState.channelStates[chanIndex].names.length; i++) {
            let matchNick = window.globals.ircState.channelStates[chanIndex].names[i];
            // if nick starts with op character, remove first character
            if (nicknamePrefixChars.indexOf(matchNick.charAt(0)) >= 0) {
              matchNick = matchNick.slice(1, matchNick.length);
            }
            if (matchNick.toLowerCase().indexOf(snippet.toLowerCase()) === 0) {
              completeNick = matchNick;
            }
          }
        }
      }
      if (completeNick.length > 0) {
        panelMessageInputEl.value =
          panelMessageInputEl.value.slice(0, panelMessageInputEl.value.length - snippet.length);
        panelMessageInputEl.value += completeNick;
        panelMessageInputEl.value += String.fromCharCode(trailingSpaceKey);
        last = completeNick;
      } else {
        // #7 not match other, abort, add trailing space
        panelMessageInputEl.value += String.fromCharCode(trailingSpaceKey);
      }
    }
    return last;
  };

  lastAutoCompleteMatch = '';
  channelAutoComplete = (e) => {
    const autoCompleteTabKey = 9;
    const autoCompleteSpaceKey = 32;
    const trailingSpaceKey = 32;
    const panelMessageInputEl = this.shadowRoot.getElementById('panelMessageInputId');
    if (this.shadowRoot.getElementById('autocompleteCheckboxId').hasAttribute('disabled')) return;
    if (!this.shadowRoot.getElementById('panelDivId').hasAttribute('auto-comp-enabled')) return;
    if (!e.keyCode) return;
    if ((e.keyCode) && (e.keyCode === autoCompleteTabKey)) {
      if (panelMessageInputEl.value.length < 2) {
        e.preventDefault();
        return;
      }
      let snippet = '';
      const snippetArray = panelMessageInputEl.value.split(' ');
      if (snippetArray.length > 0) {
        snippet = snippetArray[snippetArray.length - 1];
      }
      if (snippet.length > 0) {
        if ((e.keyCode === autoCompleteTabKey) && (snippet.length > 0)) {
          this._autoCompleteInputElement(snippet);
        }
      } else {
        if (panelMessageInputEl.value.toUpperCase() ===
          '/PART ' + this.channelName.toUpperCase() + ' ') {
          // First auto-completes /PART
          // Second auto-completes channel name
          // Third auto-completes program version
          panelMessageInputEl.value += window.globals.ircState.progName + ' ' +
            window.globals.ircState.progVersion;
        } else if (panelMessageInputEl.value.toUpperCase() === '/QUIT ') {
          // First auto-completes /QUIT
          // Second auto-completes program version
          panelMessageInputEl.value += window.globals.ircState.progName + ' ' +
            window.globals.ircState.progVersion;
        } else {
          // Tab auto-completes channel name
          panelMessageInputEl.value += this.channelCsName;
        }
        panelMessageInputEl.value += String.fromCharCode(trailingSpaceKey);
      }
      e.preventDefault();
    } // case of tab key
    //
    // Case of space key to autocomplete on space-space
    // Auto-complete with space is only active with format: brief
    if ((e.keyCode) && (e.keyCode === autoCompleteSpaceKey) &&
      (this.shadowRoot.getElementById('panelDivId').hasAttribute('brief-enabled'))) {
      if (panelMessageInputEl.value.length > 0) {
        // if previous characters is space (and this key is space too)
        if (panelMessageInputEl.value.charCodeAt(panelMessageInputEl.value.length - 1) ===
        autoCompleteSpaceKey) {
          if ((panelMessageInputEl.value.length > 1) &&
            (panelMessageInputEl.value.charCodeAt(panelMessageInputEl.value.length - 2) ===
            autoCompleteSpaceKey)) {
            //
            // auto complete from:  space-space-space
            //
            // Remove one of the space characters
            panelMessageInputEl.value =
              panelMessageInputEl.value.slice(0, panelMessageInputEl.value.length - 1);
            if (panelMessageInputEl.value.toUpperCase() ===
              '/PART ' + this.channelName.toUpperCase() + ' ') {
            // First auto-completes /PART
            // Second auto-completes channel name
            // Third auto-completes program version
              panelMessageInputEl.value += window.globals.ircState.progName + ' ' +
                window.globals.ircState.progVersion;
            } else if (panelMessageInputEl.value.toUpperCase() === '/QUIT ') {
            // First auto-completes /QUIT
            // Second auto-completes program version
              panelMessageInputEl.value += window.globals.ircState.progName + ' ' +
                window.globals.ircState.progVersion;
            } else {
              // space auto-completes channel name
              panelMessageInputEl.value += this.channelCsName;
            }
            panelMessageInputEl.value += String.fromCharCode(trailingSpaceKey);
            e.preventDefault();
          } else {
            //
            // auto complete from:  space-space-space
            //
            // remove trailing space to get snippet from split()
            panelMessageInputEl.value =
              panelMessageInputEl.value.slice(0, panelMessageInputEl.value.length - 1);
            let snippet = '';
            const snippetArray = panelMessageInputEl.value.split(' ');
            if (snippetArray.length > 0) {
              snippet = snippetArray[snippetArray.length - 1];
            }
            if (snippet.length > 0) {
              const matchStr = this._autoCompleteInputElement(snippet);
              if (this.lastAutoCompleteMatch !== matchStr) {
                this.lastAutoCompleteMatch = matchStr;
                e.preventDefault();
              }
              // panelMessageInputEl.value += String.fromCharCode(autoCompleteSpaceKey);
            } else {
              // else, put it back again, snippet was zero length
              panelMessageInputEl.value += String.fromCharCode(autoCompleteSpaceKey);
            }
          }
        }
      } else {
        // do nothing, allow space to be appended
      }
    } // case of tab key
  };

  // ----------------
  // Nickname list
  // ----------------
  _updateNickList = () => {
    const panelNickListEl = this.shadowRoot.getElementById('panelNickListId');
    const index = window.globals.ircState.channels.indexOf(this.channelName.toLowerCase());
    if (index >= 0) {
      this.maxNickLength = 0;
      if (window.globals.ircState.channelStates[index].names.length > 0) {
        panelNickListEl.value = '';
        const opList = [];
        const otherList = [];
        for (let i = 0; i < window.globals.ircState.channelStates[index].names.length; i++) {
          if (window.globals.ircState.channelStates[index].names[i].charAt(0) === '@') {
            opList.push(window.globals.ircState.channelStates[index].names[i]);
          } else {
            otherList.push(window.globals.ircState.channelStates[index].names[i]);
          }
        }
        const sortedOpList = opList.sort();
        const sortedOtherList = otherList.sort();
        if (sortedOpList.length > 0) {
          for (let i = 0; i < sortedOpList.length; i++) {
            panelNickListEl.value += sortedOpList[i] + '\n';
            if (this.maxNickLength < sortedOpList[i].length) {
              this.maxNickLength = sortedOpList[i].length;
            }
          }
        }
        if (sortedOtherList.length > 0) {
          for (let i = 0; i < sortedOtherList.length; i++) {
            panelNickListEl.value += sortedOtherList[i] + '\n';
            if (this.maxNickLength < sortedOtherList[i].length) {
              this.maxNickLength = sortedOtherList[i].length;
            }
          }
        }
      }
    }
  }; // _updateNickList()

  //
  // Append user count to the end of the channel name string in title area
  //
  _updateChannelTitle = () => {
    const titleStr = this.channelCsName;
    let nickCount = 0;
    const index = window.globals.ircState.channels.indexOf(this.channelName.toLowerCase());
    if (index >= 0) {
      if (window.globals.ircState.channelStates[index].kicked) {
        this.shadowRoot.getElementById('beenKickedIconId').removeAttribute('hidden');
      } else {
        this.shadowRoot.getElementById('beenKickedIconId').setAttribute('hidden', '');
        nickCount = window.globals.ircState.channelStates[index].names.length;
      }
      // Update channel name with case sensitive name
      this.shadowRoot.getElementById('channelNameDivId').textContent = this.channelCsName;
    }
    this.shadowRoot.getElementById('channelNameDivId').textContent = titleStr;
    this.shadowRoot.getElementById('nickCountIconId').textContent = nickCount.toString();
  };
  // do one upon channel creation

  _isNickInChannel = (nickString, channelString) => {
    const nicknamePrefixChars = document.getElementById('globVars')
      .constants('nicknamePrefixChars');
    if ((!nickString) || (nickString.length === 0)) return false;
    if (window.globals.ircState.channels.length === 0) return false;
    let channelIndex = -1;
    for (let i = 0; i < window.globals.ircState.channels.length; i++) {
      if (channelString.toLowerCase() ===
        window.globals.ircState.channels[i].toLowerCase()) channelIndex = i;
    }
    if (channelIndex < 0) return false;
    if (window.globals.ircState.channelStates[channelIndex].names.length === 0) return false;
    // if check nickname starts with an op character, remove it
    let pureNick = nickString.toLowerCase();
    if (nicknamePrefixChars.indexOf(pureNick.charAt(0)) >= 0) {
      pureNick = pureNick.slice(1, pureNick.length);
    }
    let present = false;
    for (let i = 0; i < window.globals.ircState.channelStates[channelIndex].names.length; i++) {
      let checkNick = window.globals.ircState.channelStates[channelIndex].names[i].toLowerCase();
      // if channel nickname start with an OP character remove it
      if (nicknamePrefixChars.indexOf(checkNick.charAt(0)) >= 0) {
        checkNick = checkNick.slice(1, checkNick.length);
      }
      if (checkNick === pureNick) present = true;
    }
    return present;
  }; // _nickInChannel()

  // -------------------------------
  // Clear message activity ICON by clicking on the main
  // -------------------------------
  _handlePanelClick = () => {
    this._resetMessageCount();
  };

  displayChannelMessage = (parsedMessage) => {
    const panelDivEl = this.shadowRoot.getElementById('panelDivId');
    const panelMessageDisplayEl = this.shadowRoot.getElementById('panelMessageDisplayId');
    const nickChannelSpacer = document.getElementById('globVars').constants('nickChannelSpacer');
    // console.log('Channel parsedMessage: ' + JSON.stringify(parsedMessage, null, 2));

    const _addText = (timestamp, nick, text) => {
      //
      let out = '';
      if (panelDivEl.hasAttribute('brief-enabled')) {
        out = timestamp + ' ';
        if (nick === '*') {
          out += nick + nickChannelSpacer;
        } else {
          out += nick + nickChannelSpacer + '\n';
        }
        out += document.getElementById('displayUtils').cleanFormatting(text) + '\n\n';
      } else {
        out = timestamp + ' ' +
        nick.padStart(this.maxNickLength, ' ') + nickChannelSpacer +
        document.getElementById('displayUtils').cleanFormatting(text) + '\n';
      }
      // append text to textarea
      panelMessageDisplayEl.value += out;
      // move scroll bar so text is scrolled all the way up
      // Performing this during cache reload will generate browser violation for forced reflow.
      if (!window.globals.webState.cacheReloadInProgress) {
        panelMessageDisplayEl.scrollTop = panelMessageDisplayEl.scrollHeight;
      }
    }; // _addText()

    // With each message, if date has changed, print the new date value
    if (parsedMessage.params[0].toLowerCase() === this.channelName.toLowerCase()) {
      if (panelDivEl.getAttribute('lastDate') !== parsedMessage.datestamp) {
        panelDivEl.setAttribute('lastDate', parsedMessage.datestamp);
        panelMessageDisplayEl.value +=
          '\n=== ' + parsedMessage.datestamp + ' ===\n\n';
      }
    }

    switch (parsedMessage.command) {
      //
      // TODO cases for channel closed or other error
      //
      case 'KICK':
        if (parsedMessage.params[0].toLowerCase() === this.channelName.toLowerCase()) {
          let reason = ' ';
          if (parsedMessage.params[2]) reason = parsedMessage.params[2];
          if (panelDivEl.hasAttribute('brief-enabled')) {
            _addText(parsedMessage.timestamp,
              '*',
              parsedMessage.nick + ' has kicked ' + parsedMessage.params[1]);
          } else {
            _addText(parsedMessage.timestamp,
              '*',
              parsedMessage.nick + ' has kicked ' + parsedMessage.params[1] +
              ' (' + reason + ')');
          }
        }
        break;
      case 'JOIN':
        if (parsedMessage.params[0].toLowerCase() === this.channelName.toLowerCase()) {
          if (panelDivEl.hasAttribute('brief-enabled')) {
            _addText(parsedMessage.timestamp,
              '*',
              parsedMessage.nick + ' has joined');
          } else {
            _addText(parsedMessage.timestamp,
              '*',
              parsedMessage.nick + ' (' + parsedMessage.host + ') has joined');
          }
          if (panelDivEl.hasAttribute('beep2-enabled') &&
            (!window.globals.webState.cacheReloadInProgress)) {
            document.getElementById('beepSounds').playBeep1Sound();
          }
          // If channel panel is closed, open it up when a new person joins
          if ((!window.globals.webState.cacheReloadInProgress) &&
            (!document.querySelector('body').hasAttribute('zoomId'))) {
            this.showPanel();
          }
          this.updateVisibility();
        }
        break;
      case 'MODE':
        if (parsedMessage.params[0].toLowerCase() === this.channelName.toLowerCase()) {
          // this could be more elegant than stringify.
          if (parsedMessage.nick) {
            // case of mode by user
            _addText(parsedMessage.timestamp,
              '*',
              'Mode ' + JSON.stringify(parsedMessage.params) + ' by ' + parsedMessage.nick);
          } else {
            // case of mode by netsplit
            _addText(parsedMessage.timestamp,
              '*',
              'Mode ' + JSON.stringify(parsedMessage.params) + ' by ' + parsedMessage.prefix);
          }
        }
        break;
      case 'cachedNICK':
        // ------------
        // Is previous nick or new nick in ANY active channel?
        // -----------
        if (this.channelName.toLowerCase() === parsedMessage.params[0].toLowerCase()) {
          _addText(parsedMessage.timestamp,
            '*',
            parsedMessage.nick + ' is now known as ' + parsedMessage.params[1]);
        }
        break;
      case 'NICK':
        {
          // ------------
          // Is previous nick or new nick in ANY active channel?
          // -----------
          let present = false;
          // previous nick
          if (this._isNickInChannel(parsedMessage.nick, this.channelName.toLowerCase())) {
            present = true;
          }
          // new nick
          if (this._isNickInChannel(parsedMessage.params[0], this.channelName.toLowerCase())) {
            present = true;
          }
          if (present) {
            _addText(parsedMessage.timestamp,
              '*',
              parsedMessage.nick + ' is now known as ' + parsedMessage.params[0]);
          }
        }
        break;
      case 'NOTICE':
        if (parsedMessage.params[0].toLowerCase() === this.channelName.toLowerCase()) {
          _addText(parsedMessage.timestamp,
            '*',
            'Notice(' +
            parsedMessage.nick + ' to ' + parsedMessage.params[0] + ') ' + parsedMessage.params[1]);

          // Upon channel notice, make section visible.
          // If channel panel is closed, open it up when a new person joins
          if ((!window.globals.webState.cacheReloadInProgress) &&
            (!document.querySelector('body').hasAttribute('zoomId'))) {
            this.showPanel();
          }
          this.updateVisibility();

          // Message activity Icon
          // If focus not channel panel then display incoming message activity icon
          if ((document.activeElement !==
            document.getElementById('channel:' + this.channelName.toLowerCase())) &&
            (!window.globals.webState.cacheReloadInProgress) &&
            (this.activityIconInhibitTimer === 0)) {
            this._incrementMessageCount();
          }
        }
        break;

      case 'PART':
        if (parsedMessage.params[0].toLowerCase() === this.channelName.toLowerCase()) {
          let reason = ' ';
          if (parsedMessage.params[1]) reason = parsedMessage.params[1];
          if (panelDivEl.hasAttribute('brief-enabled')) {
            _addText(parsedMessage.timestamp,
              '*',
              parsedMessage.nick + ' has left');
          } else {
            _addText(parsedMessage.timestamp,
              '*',
              parsedMessage.nick + ' (' + parsedMessage.host + ') has left ' +
              '(' + reason + ')');
          }
        }
        break;
      case 'PRIVMSG':
        if (parsedMessage.params[0].toLowerCase() === this.channelName.toLowerCase()) {
          _addText(parsedMessage.timestamp,
            parsedMessage.nick,
            parsedMessage.params[1]);
          if (panelDivEl.hasAttribute('beep1-enabled') &&
            (!window.globals.webState.cacheReloadInProgress)) {
            document.getElementById('beepSounds').playBeep1Sound();
          }
          if (panelDivEl.hasAttribute('beep3-enabled')) {
            const checkLine = parsedMessage.params[1].toLowerCase();
            if ((checkLine.indexOf(window.globals.ircState.nickName.toLowerCase()) >= 0) &&
              (!window.globals.webState.cacheReloadInProgress)) {
              setTimeout(document.getElementById('beepSounds').playBeep2Sound, 250);
            }
          }
          // If channel panel is closed, open it up receiving new message
          if ((!window.globals.webState.cacheReloadInProgress) &&
            (!document.querySelector('body').hasAttribute('zoomId'))) {
            this.showPanel();
          }

          // Message activity Icon
          // If focus not channel panel then display incoming message activity icon
          if ((document.activeElement !==
            document.getElementById('channel:' + this.channelName.toLowerCase())) &&
            (!window.globals.webState.cacheReloadInProgress) &&
            (this.activityIconInhibitTimer === 0)) {
            this._incrementMessageCount();
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
        // Example:  "nick!user@host cachedQUIT #channel :Reason for quitting"
        if (parsedMessage.params[0].toLowerCase() === this.channelName.toLowerCase()) {
          let reason = ' ';
          if (parsedMessage.params[1]) reason = parsedMessage.params[1];
          if (panelDivEl.hasAttribute('brief-enabled')) {
            _addText(parsedMessage.timestamp,
              '*',
              parsedMessage.nick + ' has quit');
          } else {
            _addText(parsedMessage.timestamp,
              '*',
              parsedMessage.nick + ' (' + parsedMessage.host + ') has quit ' +
              '(' + reason + ')');
          }
        }
        break;
      case 'QUIT':
        // Example: "nick!user@host QUIT :Reason for quitting"
        if (this._isNickInChannel(parsedMessage.nick, this.channelName.toLowerCase())) {
          let reason = ' ';
          if (parsedMessage.params[0]) reason = parsedMessage.params[0];
          if (panelDivEl.hasAttribute('brief-enabled')) {
            _addText(parsedMessage.timestamp,
              '*',
              parsedMessage.nick + ' has quit');
          } else {
            _addText(parsedMessage.timestamp,
              '*',
              parsedMessage.nick + ' (' + parsedMessage.host + ') has quit ' +
              '(' + reason + ')');
          }
        }
        break;
      case 'TOPIC':
        if (parsedMessage.params[0].toLowerCase() === this.channelName.toLowerCase()) {
          const newTopic = parsedMessage.params[1];
          if (newTopic == null) {
            _addText(parsedMessage.timestamp,
              '*',
              'Topic for ' + parsedMessage.params[0] + ' has been unset by "' +
              parsedMessage.nick);
          } else {
            _addText(parsedMessage.timestamp,
              '*',
              'Topic for ' + parsedMessage.params[0] + ' changed to "' +
              newTopic + '" by ' + parsedMessage.nick);
          }
        }
        break;
      default:
    } // switch (parsedMessage.command)
  }; // handleChannelMessage

  handleEraseBeforeReload = (event) => {
    // console.log('Event erase-before-reload');
    this.shadowRoot.getElementById('panelMessageDisplayId').value = '';
    this.shadowRoot.getElementById('panelMessageInputId').value = '';
    // needed to update date on first line printed
    this.shadowRoot.getElementById('panelDivId').setAttribute('lastDate', '0000-00-00');
    // Local count in channel window (to match global activity icon visibility)
    // TODO this.resetMessageCount();
  }; // handleEraseBeforeReload

  //
  // Add cache reload message to channel window
  //
  // Example:  14:33:02 -----Cache Reload-----
  //
  handleCacheReloadDone = (event) => {
    let markerString = '';
    let timestampString = '';
    if (('detail' in event) && ('timestamp' in event.detail)) {
      timestampString = document.getElementById('displayUtils')
        .unixTimestampToHMS(event.detail.timestamp);
    }
    if (timestampString) {
      markerString += timestampString;
    }
    markerString += ' ' + document.getElementById('globVars').constants('cacheReloadString') + '\n';
    if (this.shadowRoot.getElementById('panelDivId').hasAttribute('brief-enabled')) {
      markerString += '\n';
    }
    this.shadowRoot.getElementById('panelMessageDisplayId').value += markerString;

    // move scroll bar so text is scrolled all the way up
    this.shadowRoot.getElementById('panelMessageDisplayId').scrollTop =
      this.shadowRoot.getElementById('panelMessageDisplayId').scrollHeight;
  }; // handleCacheReloadDone()

  handleCacheReloadError = (event) => {
    let errorString = '\n';
    let timestampString = '';
    if (('detail' in event) && ('timestamp' in event.detail)) {
      timestampString = document.getElementById('displayUtils')
        .unixTimestampToHMS(event.detail.timestamp);
    }
    if (timestampString) {
      errorString += timestampString;
    }
    errorString += ' ' + document.getElementById('globVars').constants('cacheErrorString') + '\n\n';
    this.shadowRoot.getElementById('panelMessageDisplayId').value = errorString;
  };

  // -----------------------------------------------------------
  // Setup textarea elements as dynamically resizable
  // -----------------------------------------------------------
  //
  // Scale values for <textarea> are calculated in webclient10.js
  // and saved globally in the webState object
  //
  _adjustTextareaWidthDynamically = () => {
    const panelNickListEl = this.shadowRoot.getElementById('panelNickListId');
    const panelMessageDisplayEl = this.shadowRoot.getElementById('panelMessageDisplayId');
    // pixel width mar1 is reserved space on edges of input area at full screen width
    const mar1 = window.globals.webState.dynamic.commonMarginRightPx;
    // pixel width mar2 is reserved space on edges of
    // input area with send button and collapse button added
    const mar2 = window.globals.webState.dynamic.commonMarginRightPx + 5 +
      window.globals.webState.dynamic.sendButtonWidthPx +
      window.globals.webState.dynamic.collapseButtonWidthPx;
    // pixel width mar3 is reserved space on edges of input area with channel nickname list on sides

    // get size of nickname list element
    const nicknameListPixelWidth = window.globals.webState.dynamic.textAreaPaddingPxWidth +
      (this.channelNamesCharWidth * window.globals.webState.dynamic.testAreaColumnPxWidth);

    // nickname list + right margin.
    const mar3 = window.globals.webState.dynamic.commonMarginRightPx + nicknameListPixelWidth + 6;

    if (window.globals.webState.dynamic.panelPxWidth > this.mobileBreakpointPx) {
      panelMessageDisplayEl.setAttribute('cols', document.getElementById('displayUtils')
        .calcInputAreaColSize(mar3));
      panelNickListEl.removeAttribute('hidden');
    } else {
      panelMessageDisplayEl.setAttribute('cols', document.getElementById('displayUtils')
        .calcInputAreaColSize(mar1));
      if (this.shadowRoot.getElementById('panelDivId').hasAttribute('zoom')) {
        panelNickListEl.setAttribute('hidden', '');
      } else {
        panelNickListEl.removeAttribute('hidden');
      }
    }
    this.shadowRoot.getElementById('panelMessageInputId')
      .setAttribute('cols', document.getElementById('displayUtils').calcInputAreaColSize(mar2));
  }; // _adjustTextareaWidthDynamically()

  _adjustTextareaHeightDynamically = () => {
    const bodyEl = document.querySelector('body');
    if ((bodyEl.hasAttribute('zoomId')) &&
      (bodyEl.getAttribute('zoomId') === 'channel:' + this.channelName.toLowerCase())) {
      const panelNickListEl = this.shadowRoot.getElementById('panelNickListId');
      const panelMessageDisplayEl = this.shadowRoot.getElementById('panelMessageDisplayId');

      // ------------------------------------------
      // Adjustable....
      // Decrease to make channel panel taller
      // ------------------------------------------
      const marginPxHeight = 135;

      // If page measurements have already been done
      if ((window.globals.webState.dynamic.textAreaRowPxHeight) &&
        (typeof window.globals.webState.dynamic.textAreaRowPxHeight === 'number') &&
        (window.globals.webState.dynamic.textAreaRowPxHeight > 1) &&
        (window.globals.webState.dynamic.textareaPaddingPxHeight) &&
        (typeof window.globals.webState.dynamic.textareaPaddingPxHeight === 'number') &&
        (window.globals.webState.dynamic.textareaPaddingPxHeight > 1)) {
        // Then resize vertically
        //
        // calculate rows of textarea element
        //
        let rows = (window.globals.webState.dynamic.panelPxHeight -
            window.globals.webState.dynamic.textareaPaddingPxHeight -
            marginPxHeight);
        rows = parseInt(rows / window.globals.webState.dynamic.textAreaRowPxHeight);

        if (window.globals.webState.dynamic.panelPxWidth > this.mobileBreakpointPx) {
          panelNickListEl.removeAttribute('hidden');
        } else {
          panelNickListEl.setAttribute('hidden', '');
        }
        panelMessageDisplayEl.setAttribute('rows', rows);
        panelNickListEl.setAttribute('rows', rows);
      }
    } // is zoomed
  }; // _adjustTextareaHeightDynamically()

  _handleGlobalWindowResize = () => {
    if (window.globals.webState.dynamic.testAreaColumnPxWidth) {
      this._adjustTextareaWidthDynamically();
      this._adjustTextareaHeightDynamically();
    }
  };

  /**
     * Global event listener on document object to implement changes to color theme
     * @listens document:color-theme-changed
     * @param {object} event.detail.theme - Color theme values 'light' or 'dark'
     */
  _handleColorThemeChanged = (event) => {
    const panelDivEl = this.shadowRoot.getElementById('panelDivId');
    const nickCountIconEl = this.shadowRoot.getElementById('nickCountIconId');
    const messageCountIconIdEl = this.shadowRoot.getElementById('messageCountIconId');
    if (event.detail.theme === 'light') {
      panelDivEl.classList.remove('channel-panel-theme-dark');
      panelDivEl.classList.add('channel-panel-theme-light');
      nickCountIconEl.classList.remove('global-border-theme-dark');
      nickCountIconEl.classList.add('global-border-theme-light');
      messageCountIconIdEl.classList.remove('global-border-theme-dark');
      messageCountIconIdEl.classList.add('global-border-theme-light');
    } else {
      panelDivEl.classList.remove('channel-panel-theme-light');
      panelDivEl.classList.add('channel-panel-theme-dark');
      nickCountIconEl.classList.remove('global-border-theme-light');
      nickCountIconEl.classList.add('global-border-theme-dark');
      messageCountIconIdEl.classList.remove('global-border-theme-light');
      messageCountIconIdEl.classList.add('global-border-theme-dark');
    }
    let newTextTheme = 'global-text-theme-dark';
    let oldTextTheme = 'global-text-theme-light';
    if (document.querySelector('body').getAttribute('theme') === 'light') {
      newTextTheme = 'global-text-theme-light';
      oldTextTheme = 'global-text-theme-dark';
    }
    const textareaEls = Array.from(this.shadowRoot.querySelectorAll('textarea'));
    textareaEls.forEach((el) => {
      el.classList.remove(oldTextTheme);
      el.classList.add(newTextTheme);
    });
  };

  /**
   * For each channel, handle changes in the ircState object
   */
  _handleIrcStateChanged = () => {
    // console.log('channel-panel Event: irc-state-changed changed element: ' + this.channelName);
    // console.log('connected ', window.globals.ircState.ircConnected);
    // console.log('name: ', this.channelName);
    // console.log(JSON.stringify(window.globals.ircState.channels));
    // console.log(JSON.stringify(window.globals.ircState.channelStates, null, 2));
    // console.log(JSON.stringify(window.globals.webState.channels));
    // console.log(JSON.stringify(window.globals.webState.channelStates, null, 2));
    //
    // ----------------------------------------------------------------------
    // Internal function to release channel resources if channel is removed
    // ----------------------------------------------------------------------
    const _removeSelfFromDOM = () => {
      //
      // 1 - Remove channel name from list of channel active in browser
      //
      const webStateChannelIndex =
        window.globals.webState.channels.indexOf(this.channelName.toLowerCase());
      if (webStateChannelIndex >= 0) {
        window.globals.webState.channels.splice(webStateChannelIndex, 1);
        window.globals.webState.channelStates.splice(webStateChannelIndex, 1);
      }

      //
      // 2 - Remove eventListeners
      //
      /* eslint-disable max-len */
      this.shadowRoot.getElementById('autocompleteCheckboxId').removeEventListener('click', this.handleAutoCompleteCheckboxClick);
      this.shadowRoot.getElementById('beep1CheckBoxId').removeEventListener('click', this.handleChannelBeep1CBInputElClick);
      this.shadowRoot.getElementById('beep2CheckBoxId').removeEventListener('click', this.handleChannelBeep2CBInputElClick);
      this.shadowRoot.getElementById('beep3CheckBoxId').removeEventListener('click', this.handleChannelBeep3CBInputElClick);
      this.shadowRoot.getElementById('bottomCollapseButtonId').removeEventListener('click', this.handleBottomCollapseButton);
      this.shadowRoot.getElementById('briefCheckboxId').removeEventListener('click', this.handleBriefCheckboxClick);
      this.shadowRoot.getElementById('clearButtonId').removeEventListener('click', this._handleClearButton);
      this.shadowRoot.getElementById('closePanelButtonId').removeEventListener('click', this._handleCloseButton);
      this.shadowRoot.getElementById('collapsePanelButtonId').removeEventListener('click', this._handleCollapseButton);
      this.shadowRoot.getElementById('joinButtonId').removeEventListener('click', this.handleChannelJoinButtonElClick);
      this.shadowRoot.getElementById('multiLineSendButtonId').removeEventListener('click', this.handleMultiLineSendButtonClick);
      this.shadowRoot.getElementById('normalButtonId').removeEventListener('click', this._handleNormalButton);
      this.shadowRoot.getElementById('panelDivId').removeEventListener('click', this._handlePanelClick);
      this.shadowRoot.getElementById('panelMessageInputId').removeEventListener('keydown', this.channelAutoComplete, false);
      this.shadowRoot.getElementById('panelMessageInputId').removeEventListener('paste', this.handleChannelInputAreaElPaste);
      this.shadowRoot.getElementById('partButtonId').removeEventListener('click', this.handleChannelPartButtonElClick);
      this.shadowRoot.getElementById('pruneButtonId').removeEventListener('click', this.handleChannelPruneButtonElClick);
      this.shadowRoot.getElementById('panelMessageInputId').removeEventListener('input', this.handleChannelInputAreaElInput);
      this.shadowRoot.getElementById('refreshButtonId').removeEventListener('click', this._handleRefreshButton);
      this.shadowRoot.getElementById('sendButtonId').removeEventListener('click', this.handleChannelSendButtonElClick);
      this.shadowRoot.getElementById('tallerButtonId').removeEventListener('click', this._handleTallerButton);
      this.shadowRoot.getElementById('zoomButtonId').removeEventListener('click', this.handleChannelZoomButtonElClick);

      document.removeEventListener('cache-reload-done', this.handleCacheReloadDone);
      document.removeEventListener('cache-reload-error', this.handleCacheReloadError);
      document.removeEventListener('cancel-beep-sounds', this.handleCancelBeepSounds);
      document.removeEventListener('cancel-zoom', this.handleCancelZoomEvent);
      document.removeEventListener('collapse-all-panels', this._handleCollapseAllPanels);
      document.removeEventListener('color-theme-changed', this._handleColorThemeChanged);
      document.removeEventListener('erase-before-reload', this.handleEraseBeforeReload);
      document.removeEventListener('hide-all-panels', this._handleHideAllPanels);
      document.removeEventListener('irc-state-changed', this._handleIrcStateChanged);
      document.removeEventListener('resize-custom-elements', this._handleGlobalWindowResize);
      document.removeEventListener('show-all-panels', this._handleShowAllPanels);
      /* eslint-enable max-len */

      //
      // 3 - Channel panel removes itself from the DOM
      //
      const parentEl = document.getElementById('channelsContainerId');
      const childEl = document.getElementById('channel:' + this.channelName.toLowerCase());
      if (parentEl.contains(childEl)) {
        // remove the channel element from DOM
        parentEl.removeChild(childEl);
      }
    }; // _removeSelfFromDOM()
    const ircStateIndex = window.globals.ircState.channels.indexOf(this.channelName.toLowerCase());
    const webStateIndex = window.globals.webState.channels.indexOf(this.channelName.toLowerCase());

    if ((window.globals.ircState.ircConnected) && (ircStateIndex < 0) && (webStateIndex >= 0)) {
      // console.log('pruned removing from DOM');
      //
      // Case of channel has been pruned from the IRC client with [Prune] button
      _removeSelfFromDOM();
    } else if ((!window.globals.ircState.ircConnected)) {
      // console.log('disconnected removing from DOM');
      //
      // Case of disconnect from IRC, any channel windows are no longer valid
      // This function is executing due to active irc-state-changed event
      // within the channel window scope. Therefore... remove it.
      _removeSelfFromDOM();
    } else if (window.globals.ircState.ircConnected) {
      // console.log('connected, no DOM changes');
      //
      // If channel was previously joined, then parted, then re-joined
      // Check for joined change to true and show channel if hidden
      //
      if ((ircStateIndex >= 0) && (webStateIndex >= 0)) {
        // Alternate Join, Prune,  verses Part buttons
        if (window.globals.ircState.channelStates[ircStateIndex].joined) {
          this.shadowRoot.getElementById('joinButtonId').setAttribute('hidden', '');
          this.shadowRoot.getElementById('pruneButtonId').setAttribute('hidden', '');
          this.shadowRoot.getElementById('partButtonId').removeAttribute('hidden');
        } else {
          this.shadowRoot.getElementById('joinButtonId').removeAttribute('hidden');
          this.shadowRoot.getElementById('pruneButtonId').removeAttribute('hidden');
          this.shadowRoot.getElementById('partButtonId').setAttribute('hidden', '');
        };

        if (window.globals.ircState.channelStates[ircStateIndex].joined !==
          window.globals.webState.channelStates[webStateIndex].lastJoined) {
          if ((window.globals.ircState.channelStates[ircStateIndex].joined) &&
            (!window.globals.webState.channelStates[webStateIndex].lastJoined)) {
            if (!window.globals.webState.cacheReloadInProgress) {
              this.showPanel();
            }
            // TODO updateVisibility();
            // NO WAS ALREADY COMMENTED channelTopRightHidableDivEl.removeAttribute('hidden');
          }
          window.globals.webState.channelStates[webStateIndex].lastJoined =
            window.globals.ircState.channelStates[ircStateIndex].joined;
        }
      }
      // state object includes up to date list of nicks in a channel
      this._updateNickList();
      // Update title string to include some data
      this._updateChannelTitle();
      // show/hide disable or enable channel elements depend on state
      this.updateVisibility();
    } else {
      // console.log('handleIrcStateChanged: Error no options match');
    }
  }; // _handleIrcStateChanged

  /**
   * Event to collapse all panels. This panel does not collapse so it is hidden
   * @listens document:collapse-all-panels
   * @param {string|string[]} event.detail.except - No action if listed as exception
  */
  _handleCollapseAllPanels = (event) => {
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
  };

  /**
   * Hide panel (not visible)unless listed as exception.
   * @listens document:hide-all-panels
   * @param {string|string[]} event.detail.except - No action if listed as exception
   */
  _handleHideAllPanels = (event) => {
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
  };

  /**
   * Make panel visible unless listed as exception.
   * @listens document:show-all-panels
   * @param {string|string[]} event.detail.except - No action if listed as exception
   */
  _handleShowAllPanels = (event) => {
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
  };

  /**
   * Called once per second as task scheduler, called from js/_afterLoad.js
   */
  timerTickHandler = () => {
    if (this.activityIconInhibitTimer > 0) this.activityIconInhibitTimer--;
  };

  // ------------------
  // Main entry point
  // ------------------
  initializePlugin = () => {
    // if channel already exist abort
    if (window.globals.webState.channels.indexOf(this.channelName.toLowerCase()) >= 0) {
      throw new Error('createChannelEl: channel already exist');
    }

    // Add to local browser list of open channels
    window.globals.webState.channels.push(this.channelName.toLowerCase());

    // Initialize local state (note upon page refresh, channel joined may be false)
    this.initIrcStateIndex =
      window.globals.ircState.channels.indexOf(this.channelName.toLowerCase());

    window.globals.webState.channelStates.push(
      {
        lastJoined: window.globals.ircState.channelStates[this.initIrcStateIndex].joined
      }
    );

    this.channelIndex = window.globals.ircState.channels.indexOf(this.channelName.toLowerCase());

    this.shadowRoot.getElementById('panelDivId').setAttribute('lastDate', '0000-00-00');

    // Set Channel Name
    this.shadowRoot.getElementById('channelNameDivId').textContent = this.channelCsName;

    this.shadowRoot.getElementById('channelTopicDivId').textContent =
      document.getElementById('displayUtils')
        .cleanFormatting(window.globals.ircState.channelStates[this.channelIndex].topic);

    // Load beep sound configuration from local storage
    this.loadBeepEnable();

    // enable brief mode on narrow screens
    if (window.globals.webState.dynamic.panelPxWidth < this.mobileBreakpointPx) {
      this.shadowRoot.getElementById('panelDivId').setAttribute('brief-enabled', '');
      this.shadowRoot.getElementById('briefCheckboxId').checked = true;
    } else {
      this.shadowRoot.getElementById('panelDivId').removeAttribute('brief-enabled');
      this.shadowRoot.getElementById('briefCheckboxId').checked = false;
    }

    // Is browser capable of auto-complete?
    // Check if beforeInput event is supported in this browser (part of InputEvent)
    if ((window.InputEvent) && (typeof InputEvent.prototype.getTargetRanges === 'function')) {
      this.shadowRoot.getElementById('panelDivId').setAttribute('auto-comp-enabled', '');
    } else {
      this.shadowRoot.getElementById('panelDivId').setAttribute('auto-comp-enabled', '');
      this.shadowRoot.getElementById('autocompleteCheckboxId').setAttribute('disabled', '');
    }

    // populate it initially on creating the element
    this._updateNickList();

    this._updateChannelTitle();

    // TODO need when in html template?
    this.shadowRoot.getElementById('panelNickListId').setAttribute('cols',
      this.channelNamesCharWidth.toString());
    this.shadowRoot.getElementById('panelNickListId')
      .setAttribute('rows', this.defaultHeightInRows);

    this.shadowRoot.getElementById('panelMessageDisplayId')
      .setAttribute('rows', this.defaultHeightInRows);

    // inhibit timer to prevent display of activity icon
    this.activityIconInhibitTimer = 0;

    // The following cache reload request is to bring the
    // IRC channel textarea in sync with server.
    // When first joining an IRC channel, the IRC server
    // or NickServ/ChanServ may force some PRIVMSG or
    // channel NOTICE that could be received by the remote client
    // before the browser has created the new channel window.
    // Also, there may be old messages it the message cache
    // that were restored after a server restart.
    //
    // this forces a global update which will refresh text area
    // If other windows are opening concurrently,
    // this event will debounce them over 1 second delay.
    document.dispatchEvent(
      new CustomEvent('debounced-update-from-cache', { bubbles: true }));

    // Upon creation of new channel element panel, set the color theme
    this._handleColorThemeChanged(
      {
        detail: {
          theme: document.querySelector('body').getAttribute('theme')
        }
      }
    );

    this.updateVisibility();

    // Resize on creating channel window
    //
    this._adjustTextareaWidthDynamically();
    //
    // This is a hack. If adding the channel window
    // causes the vertical scroll to appear,
    // Then the dynamic element side of textarea
    // element will not account for vertical slider width
    // Fix...wait 0.1 sec for scroll bar to appear and
    // dynamically size again.
    //
    setTimeout(this._adjustTextareaWidthDynamically.bind(this), 100);
  }; // initializePlugin

  // -------------------------------------------
  // add event listeners to connected callback
  // -------------------------------------------
  connectedCallback () {
    // -------------------------------------
    // 1 of 2 Listeners on internal elements
    // -------------------------------------
    /* eslint-disable max-len */
    this.shadowRoot.getElementById('autocompleteCheckboxId').addEventListener('click', this.handleAutoCompleteCheckboxClick);
    this.shadowRoot.getElementById('beep1CheckBoxId').addEventListener('click', this.handleChannelBeep1CBInputElClick);
    this.shadowRoot.getElementById('beep2CheckBoxId').addEventListener('click', this.handleChannelBeep2CBInputElClick);
    this.shadowRoot.getElementById('beep3CheckBoxId').addEventListener('click', this.handleChannelBeep3CBInputElClick);
    this.shadowRoot.getElementById('bottomCollapseButtonId').addEventListener('click', this.handleBottomCollapseButton);
    this.shadowRoot.getElementById('briefCheckboxId').addEventListener('click', this.handleBriefCheckboxClick);
    this.shadowRoot.getElementById('clearButtonId').addEventListener('click', this._handleClearButton);
    this.shadowRoot.getElementById('collapsePanelButtonId').addEventListener('click', this._handleCollapseButton);
    this.shadowRoot.getElementById('closePanelButtonId').addEventListener('click', this._handleCloseButton);
    this.shadowRoot.getElementById('joinButtonId').addEventListener('click', this.handleChannelJoinButtonElClick);
    this.shadowRoot.getElementById('multiLineSendButtonId').addEventListener('click', this.handleMultiLineSendButtonClick);
    this.shadowRoot.getElementById('normalButtonId').addEventListener('click', this._handleNormalButton);
    this.shadowRoot.getElementById('panelDivId').addEventListener('click', this._handlePanelClick);
    this.shadowRoot.getElementById('panelMessageInputId').addEventListener('input', this.handleChannelInputAreaElInput);
    this.shadowRoot.getElementById('panelMessageInputId').addEventListener('keydown', this.channelAutoComplete, false);
    this.shadowRoot.getElementById('panelMessageInputId').addEventListener('paste', this.handleChannelInputAreaElPaste);
    this.shadowRoot.getElementById('partButtonId').addEventListener('click', this.handleChannelPartButtonElClick);
    this.shadowRoot.getElementById('pruneButtonId').addEventListener('click', this.handleChannelPruneButtonElClick);
    this.shadowRoot.getElementById('refreshButtonId').addEventListener('click', this._handleRefreshButton);
    this.shadowRoot.getElementById('sendButtonId').addEventListener('click', this.handleChannelSendButtonElClick);
    this.shadowRoot.getElementById('tallerButtonId').addEventListener('click', this._handleTallerButton);
    this.shadowRoot.getElementById('zoomButtonId').addEventListener('click', this.handleChannelZoomButtonElClick);

    // -------------------------------------
    // 2 of 2 Listeners on global events
    // -------------------------------------
    document.addEventListener('cache-reload-done', this.handleCacheReloadDone);
    document.addEventListener('cache-reload-error', this.handleCacheReloadError);
    document.addEventListener('cancel-beep-sounds', this.handleCancelBeepSounds);
    document.addEventListener('cancel-zoom', this.handleCancelZoomEvent);
    document.addEventListener('collapse-all-panels', this._handleCollapseAllPanels);
    document.addEventListener('color-theme-changed', this._handleColorThemeChanged);
    document.addEventListener('erase-before-reload', this.handleEraseBeforeReload);
    document.addEventListener('hide-all-panels', this._handleHideAllPanels);
    document.addEventListener('irc-state-changed', this._handleIrcStateChanged);
    document.addEventListener('resize-custom-elements', this._handleGlobalWindowResize);
    document.addEventListener('show-all-panels', this._handleShowAllPanels);
    /* eslint-enable max-len */
  };
});
