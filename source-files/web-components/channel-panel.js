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
//     This web component is an IRC channel panel.
//
// ------------------------------------------------------------------------------
// Each IRC channel panel is dynamically created and inserted
// into the DOM by parent element manage-channels-panel.
// When no longer needed, this component will self destroy itself.
//
// This panel opens differently.
// The panel is set to visible in the HTML template
// When the event cache-reload-done fires, if the
// time since page load is less than 5 seconds, collapses the panel
//
// Global Event listeners
//   cache-reload-done
//   cache-reload-error
//   cancel-beep-sounds
//   cancel-zoom
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
//   cancel-zoom
//   hide-all-panels
//   update-channel-count
//   update-from-cache
//
// Public Methods:
//   showPanel()
//   showAndScrollPanel()
//   collapsePanel()
//   hidePanel()
//   displayChannelMessage(parsedMessage)
//
// Example channel message (parsedMessage)
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
//   Panel visibility
//
// Issue:
//   The remote web server manages channel membership.
//   Upon successful JOIN command with remote IRC server, the #channelName
//   is added to the ircState.channels array by the backend server and UPDATE sent to browsers.
//   The web browser receives a getIrcState() response, detects the new array element
//   and creates a new channel-panel web component dynamically.
//   The issue is: there is no way to distinguish the difference between:
//     1) User creates new channel
//     2) Auto-reconnect IRC network
//     3) Auto-reconnect websocket
//     4) User refreshes web page.
//
//   To address this, when one of three events occur:...
//      - local-command-parser detects a "/JOIN #channel"
//      - manage-channels-panel user input channel name and press [Join] button
//      - manage-channels-panel user clicks channel preset button
//   When one of these occurs, the parsed channel name is added to ircChannelsPendingJoin array
//   located in the manage-channels-panel web component.
//   When a new channel appears in webState.channels[] array, the
//   ircChannelsPendingJoin array can be used to see if this is a newly joined
//   channel
//
// Panel creation
//   No channel-panel elements exist at page load, so hide/unhide is not relevant
//   The channel-panel elements are inserted into the DOM dynamically by manage-channel-panel.
//   When inserted, the HTML Template channel-panel hidden by default
//   and the initializePlugin() function is called from manage-channels-panel.
//
// Panel removal from DOM,
//   When the remote web server removes an IRC channel from the
//   ircState.channel[] array, each separate channel-panel
//   with detect the removal and remove event listeners and
//   remove itself from the DOM automatically after the array changes.
//   The user's request to prune a channel is an API call to the web server.
//   There are no user local actions to remove channel panels.
//
//   Controlling visibility can occur in several ways
//
//   Case 1 of 5 User Creates new IRC channel
//
//   The initializePlugin() function is called by manage-channels-panel.
//   In the is case the channel name is present in the array of pending joins.
//   The full panel is made visible.
//
//   Case 2 of 5 Auto-reconnect of the IRC network on the backend web server
//
//   The initializePlugin() function is called by manage-channels-panel.
//   The channel name is not present in the array, so the
//   channel-panel is made visible in collapsed mode.
//
//   Case 3 of 5 Auto-reconnect websocket
//
//   In the case of a web-socket disconnect, the all panels are temporarily
//   hidden, but not destroyed. Therefore, initializePlugin is not called.
//   Instead, a message cache reload occurs, and an event cache-reload-done is fired.
//   In response to this, a flag used to detect websocket disconnect
//   The cache-reload-done handler will make the channel panel visible in collapsed mode.
//
//   Case 4 of 5 User refreshes web page.
//
//   When a user reload the page and IRC is already connected and channels
//   are already JOINed, a cache reload is needed.
//   When the cache-reload-done event handler runs, it checks the
//   time since the page was connected to the webserver
//   If less than 5 seconds, the page is made visible in collapsed mode.
//
//   Case 5 of 5  IRC incoming PRIVMSG channel message events Events:
//
//   Condition: any panel not "zoom", not cache reload
//    New user JOIN channel, then show channel-panel, scroll to bottom
//    New NOTICE message to channel,then show channel-panel, scroll to bottom
//    New PRIVMSG message to channel, then show channel-panel, scroll to bottom
//    This also opens panel with other messages like JOIN
//
//    Hotkey Alt-B will show all channel panels in collapsed mode (as bar)
//    Hotkey Alt-C will show all channel panels in collapsed mode
//    Hotkey Alt-N (Next) will cycle through all channels in sequence
//
// Scroll: channel panel scrolls to bottom of viewport when showPanel() is called.
//
// ------------------------------------------------------------------------------

'use strict';
window.customElements.define('channel-panel', class extends HTMLElement {
  constructor () {
    super();
    const template = document.getElementById('channelPanelTemplate');
    const templateContent = template.content;
    this.attachShadow({ mode: 'open' })
      .appendChild(templateContent.cloneNode(true));
    this.elementExistsInDom = true;
    this.channelName = '';
    this.channelCsName = '';
    this.maxNickLength = 0;
    this.activityIconInhibitTimer = 0;
    this.channelIndex = null;
    this.initIrcStateIndex = null;
    this.unreadMessageCount = 0;
    this.lastAutoCompleteMatch = '';
    this.webConnectedLast = true;
    this.webSocketFirstConnect = false;
    this.inhibitDynamicResize = false;

    // sized for iPhone screen
    this.mobileBreakpointPx = 600;
    this.textareaHeightInRows = '15';
    // decrease verticalZoomMarginPixels to make zoomed panel vertically taller
    this.verticalZoomMarginPixels = 137;
    this.channelNamesCharWidth = 20;
  }

  // ------------------------------------------
  // Send text to channel (internal function)
  // Intercept IRC text command if detected
  // ------------------------------------------

  /**
   * Send text to channel (internal function)
   * Intercept IRC text command if detected
   * @param {number} channelIndex - index into ircState channel array
   * @param {object} textAreaEl - The HTML textarea element for message display
   */
  _sendTextToChannel = (channelIndex, textAreaEl) => {
    const displayUtilsEl = document.getElementById('displayUtils');
    const errorPanelEl = document.getElementById('errorPanel');
    const ircControlsPanelEl = document.getElementById('ircControlsPanel');
    const text = displayUtilsEl.stripTrailingCrLf(textAreaEl.value);
    if (displayUtilsEl.detectMultiLineString(text)) {
      textAreaEl.value = '';
      textAreaEl.setAttribute('rows', '1');
      errorPanelEl.showError('Multi-line input is not supported.');
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
            errorPanelEl.showError(commandAction.message);
            return;
          } else {
            if ((commandAction.ircMessage) && (commandAction.ircMessage.length > 0)) {
              ircControlsPanelEl.sendIrcServerMessage(commandAction.ircMessage);
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

              ircControlsPanelEl.sendIrcServerMessage('AWAY');
            }
          }, 1000);
        }
        //
        // Send message to channel
        //
        const message = 'PRIVMSG ' +
        window.globals.ircState.channelStates[channelIndex].name + ' :' + text;
        ircControlsPanelEl.sendIrcServerMessage(message);
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

  /**
   * Increment channel message counter and make visible
   */
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

  /**
   * Increment channel message counter and make visible
   */
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

  /**
   * Scroll channel textarea to show most recent message (scroll to bottom)
   * Conditions: panel must be visible for scroll to execute in browser
   */
  _scrollTextAreaToRecent = () => {
    const panelMessageDisplayEl = this.shadowRoot.getElementById('panelMessageDisplayId');
    panelMessageDisplayEl.scrollTop = panelMessageDisplayEl.scrollHeight;
  };

  /**
   * Scroll web component to align top of panel with top of viewport and set focus
   */
  _scrollToTop = () => {
    this.focus();
    const newVertPos = window.scrollY + this.getBoundingClientRect().top - 50;
    window.scrollTo({ top: newVertPos, behavior: 'smooth' });
  };

  /**
   * Scroll web component to align bottom of panel with bottom of viewport and set focus
   */
  _scrollToBottom = () => {
    this.focus();
    const newVertPos =
      this.getBoundingClientRect().bottom - window.innerHeight + window.scrollY;
    window.scrollTo({ top: newVertPos, behavior: 'smooth' });
  };

  /**
   * Make panel visible (both internal and external function)
   */
  showPanel = () => {
    const panelVisibilityDivEl = this.shadowRoot.getElementById('panelVisibilityDivId');
    const panelCollapsedDivEl = this.shadowRoot.getElementById('panelCollapsedDivId');
    const hideWithCollapseEl = this.shadowRoot.getElementById('hideWithCollapseId');
    const bottomCollapseDivEl = this.shadowRoot.getElementById('bottomCollapseDivId');
    const panelMessageInputEl = this.shadowRoot.getElementById('panelMessageInputId');

    // Switching between collapsed and full panel
    if ((panelVisibilityDivEl.hasAttribute('visible')) &&
      (!panelCollapsedDivEl.hasAttribute('visible'))) {
      panelVisibilityDivEl.setAttribute('visible', '');
      panelCollapsedDivEl.setAttribute('visible', '');
      hideWithCollapseEl.removeAttribute('hidden');
      this.shadowRoot.getElementById('noScrollCheckboxId').checked = false;
      this._scrollTextAreaToRecent();
      this._scrollToTop();
      panelMessageInputEl.focus();
    } else if (!panelVisibilityDivEl.hasAttribute('visible')) {
      // Else switching between hidden and full panel
      panelVisibilityDivEl.setAttribute('visible', '');
      panelCollapsedDivEl.setAttribute('visible', '');
      hideWithCollapseEl.removeAttribute('hidden');
      this.shadowRoot.getElementById('noScrollCheckboxId').checked = false;
      bottomCollapseDivEl.setAttribute('hidden', '');
      this._scrollTextAreaToRecent();
      this._scrollToTop();
      panelMessageInputEl.focus();
    } else {
      // Case of called when visible
    }
    this._handleCancelZoomEvent();
    // Note: showPanel is not called on PRMVMSG when zoomed is active on own panel
    if (document.querySelector('body').hasAttribute('zoomId')) {
      document.dispatchEvent(new CustomEvent('cancel-zoom'));
    }
  };

  /**
   * Intended for use with dropdown menu and unread message icon click.
   * This bypasses logic to inhibit scroll and visibility
   */
  showAndScrollPanel = () => {
    this._resetMessageCount();
    this.showPanel();
    this._scrollTextAreaToRecent();
    this._scrollToTop();
    this.shadowRoot.getElementById('panelMessageInputId').focus();
  };

  /**
   * Collapse panel to bar (both internal and external function)
   */
  collapsePanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible', '');
    this.shadowRoot.getElementById('panelCollapsedDivId').removeAttribute('visible');
    this.shadowRoot.getElementById('hideWithCollapseId').setAttribute('hidden', '');
    // this.shadowRoot.getElementById('bottomCollapseDivId').setAttribute('hidden', '');
    // when collapsing panel channel, if zoomed, cancel the zoom
    this._handleCancelZoomEvent();
  };

  /**
   * Hide this panel (both internal and external function)
   */
  hidePanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible');
    this.shadowRoot.getElementById('panelCollapsedDivId').removeAttribute('visible');
    this.shadowRoot.getElementById('hideWithCollapseId').removeAttribute('hidden');
    // when closing channel, if zoomed, cancel the zoom
    this._handleCancelZoomEvent();
  };

  /**
   * Show, hide, or update panel elements based on state variables
   */
  _updateVisibility = () => {
    const panelDivEl = this.shadowRoot.getElementById('panelDivId');
    const beep1CheckBoxEl = this.shadowRoot.getElementById('beep1CheckBoxId');
    const beep2CheckBoxEl = this.shadowRoot.getElementById('beep2CheckBoxId');
    const beep3CheckBoxEl = this.shadowRoot.getElementById('beep3CheckBoxId');
    const briefCheckboxEl = this.shadowRoot.getElementById('briefCheckboxId');
    const noOpenOnJoinCheckBoxEl =
      this.shadowRoot.getElementById('noOpenOnJoinCheckBoxId');
    const noOpenOnMessageCheckBoxEl =
      this.shadowRoot.getElementById('noOpenOnMessageCheckBoxId');
    const noOpenOnModeCheckBoxEl =
      this.shadowRoot.getElementById('noOpenOnModeCheckBoxId');
    const autocompleteCheckboxEl = this.shadowRoot.getElementById('autocompleteCheckboxId');
    const autoCompleteTitleEl = this.shadowRoot.getElementById('autoCompleteTitle');

    const ircStateIndex = window.globals.ircState.channels.indexOf(this.channelName.toLowerCase());
    const webStateIndex = window.globals.webState.channels.indexOf(this.channelName.toLowerCase());

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
    if (panelDivEl.hasAttribute('no-open-on-join')) {
      noOpenOnJoinCheckBoxEl.checked = true;
    } else {
      noOpenOnJoinCheckBoxEl.checked = false;
    }
    if (panelDivEl.hasAttribute('no-open-on-message')) {
      noOpenOnMessageCheckBoxEl.checked = true;
    } else {
      noOpenOnMessageCheckBoxEl.checked = false;
    }
    if (panelDivEl.hasAttribute('no-open-on-mode')) {
      noOpenOnModeCheckBoxEl.checked = true;
    } else {
      noOpenOnModeCheckBoxEl.checked = false;
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
    }
    // If left channel, show [Not in Channel] icon
    if (window.globals.ircState.channelStates[ircStateIndex].joined) {
      this.shadowRoot.getElementById('notInChannelIconId').setAttribute('hidden', '');
      this.shadowRoot.getElementById('sendButtonId').removeAttribute('disabled');
      this.shadowRoot.getElementById('panelMessageInputId').removeAttribute('disabled');
    } else {
      this.shadowRoot.getElementById('notInChannelIconId').removeAttribute('hidden');
      this.shadowRoot.getElementById('sendButtonId').setAttribute('disabled', '');
      this.shadowRoot.getElementById('panelMessageInputId').setAttribute('disabled', '');
      this.shadowRoot.getElementById('panelNickListId').value = '';
    }
  }; // updateVisibility

  /**
   * Button event handler to hide panel
   */
  _handleCloseButton = () => {
    this.hidePanel();
  };

  /**
   * Button event handler to collapse panel to bar
   */
  _handleCollapseButton = () => {
    if (this.shadowRoot.getElementById('panelCollapsedDivId').hasAttribute('visible')) {
      this.collapsePanel();
    } else {
      // make panel visible
      this.showPanel();
      // If panel previously collapsed, then scroll to bottom of text
      this._scrollTextAreaToRecent();
      // and remove check from inhibit scroll checkbox
      this.shadowRoot.getElementById('noScrollCheckboxId').checked = false;
    }
  };

  /**
   * Button handler to temporarily clear text displayed in textarea element
   * This does not remove messages from message cache, and can be restored
   * by using the refresh button
   */
  _handleClearButton = () => {
    this.shadowRoot.getElementById('panelMessageDisplayId').value = '';
    // needed to display date on first message
    this.shadowRoot.getElementById('panelDivId')
      .setAttribute('lastDate', '0000-00-00');
    this.shadowRoot.getElementById('panelNickListId')
      .setAttribute('rows', this.textareaHeightInRows);
    this.shadowRoot.getElementById('panelMessageDisplayId')
      .setAttribute('rows', this.textareaHeightInRows);
    this.shadowRoot.getElementById('panelMessageInputId')
      .setAttribute('rows', '1');
  };

  /**
   * Button handler to vertically enlarge the textarea element
   */
  _handleTallerButton = () => {
    const newRows = parseInt(this.shadowRoot.getElementById('panelMessageDisplayId')
      .getAttribute('rows')) + 10;
    this.shadowRoot.getElementById('panelNickListId').setAttribute('rows', newRows);
    this.shadowRoot.getElementById('panelMessageDisplayId').setAttribute('rows', newRows);
    this.shadowRoot.getElementById('panelMessageInputId').setAttribute('rows', '3');
  };

  /**
   * Button handler to restore vertical size textarea element to default size
   */
  _handleNormalButton = () => {
    this.shadowRoot.getElementById('panelNickListId')
      .setAttribute('rows', this.textareaHeightInRows);
    this.shadowRoot.getElementById('panelMessageDisplayId')
      .setAttribute('rows', this.textareaHeightInRows);
    this.shadowRoot.getElementById('panelMessageInputId').setAttribute('rows', '1');
  };

  /**
   * Sends /JOIN command to IRC server
   */
  _handleChannelJoinButtonElClick = () => {
    const message = 'JOIN ' + this.channelCsName;
    document.getElementById('ircControlsPanel').sendIrcServerMessage(message);
  };

  /**
   * Sends /PART command to IRC server

   */
  _handleChannelPartButtonElClick = () => {
    const message = 'PART ' + this.channelName + ' :' + window.globals.ircState.progName +
     ' ' + window.globals.ircState.progVersion;
    document.getElementById('ircControlsPanel').sendIrcServerMessage(message);
  };

  /**
   * Performs network API request to remove IRC channel.
   */
  _handleChannelPruneButtonElClick = () => {
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
  }; // _handleChannelPruneButtonElClick

  /**
   * Initiate a full message cache refresh.
   */
  _handleRefreshButton = () => {
    if (!window.globals.webState.cacheReloadInProgress) {
      // this forces a global update which will refresh text area
      document.dispatchEvent(new CustomEvent('update-from-cache'));
    }
  };

  /**
   * Respond to user clipboard paste of data into the input area.
   * Detects multi-line input and opens hidden multi-line controls
   * @param {object} event - Clipboard data
   */
  _handleChannelInputAreaElPaste = (event) => {
    if (this._splitMultiLinePaste(event.clipboardData.getData('text')).length > 1) {
      // Screen size changes when input area is taller, cancel zoom
      this._handleCancelZoomEvent();
      // Make multi-line clipboard past notice visible and show button
      this.shadowRoot.getElementById('multiLineSendSpanId').textContent = 'Clipboard (' +
        this._splitMultiLinePaste(event.clipboardData.getData('text')).length + ' lines)';
      this.shadowRoot.getElementById('multiLineActionDivId').removeAttribute('hidden');
      this.shadowRoot.getElementById('panelMessageInputId').setAttribute('rows', '3');
    };
  }; // _handleChannelInputAreaElPaste()

  /**
   * Initiate timers to send multi-line input one line at a time with delay
   */
  _handleMultiLineSendButtonClick = () => {
    const panelMessageInputEl = this.shadowRoot.getElementById('panelMessageInputId');
    const multiLineActionDivEl = this.shadowRoot.getElementById('multiLineActionDivId');
    const errorPanelEl = document.getElementById('errorPanel');
    const multiLineArray = this._splitMultiLinePaste(panelMessageInputEl.value);
    if (multiLineArray.length > 100) {
      multiLineActionDivEl.setAttribute('hidden', '');
      panelMessageInputEl.value = '';
      errorPanelEl.showError('Maximum multi-line clipboard paste 100 Lin`es');
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
        panelMessageInputEl.setAttribute('rows', '1');
        panelMessageInputEl.value = multiLineArray[0];
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
                if (!window.globals.ircState.channelStates[index].joined) {
                  okToSend = false;
                }
              }
              if (!this.shadowRoot.getElementById('panelVisibilityDivId').hasAttribute('visible')) {
                okToSend = false;
              }
              if (!this.shadowRoot.getElementById('panelCollapsedDivId').hasAttribute('visible')) {
                okToSend = false;
              }
            }
            if (!okToSend) {
              // once not ok, don't try again
              abortedFlag = true;
            } else {
              // Send message to IRC channel
              const message = 'PRIVMSG ' +
                window.globals.ircState.channelStates[this.channelIndex].name +
                ' :' + multiLineArray[i];
              // Send the message
              document.getElementById('ircControlsPanel').sendIrcServerMessage(message);
              if (i !== multiLineArray.length - 1) {
                // Show each line in inputArea while waiting for timer
                panelMessageInputEl.value = multiLineArray[i + 1];
              } else {
                panelMessageInputEl.value = '';
              }
            } // send to channel
          }, delayMs); // timer
        } // next i
        // timers created, now hide button
        multiLineActionDivEl.setAttribute('hidden', '');
      } else {
        // case of single line paste, hide div without action
        multiLineActionDivEl.setAttribute('hidden', '');
      }
    } // case of less than max allowed lines
  }; // _handleMultiLineSendButtonClick()

  /**
   * Send user input to the IRC server (Send button)
   */
  _handleChannelSendButtonElClick = () => {
    const panelMessageInputEl = this.shadowRoot.getElementById('panelMessageInputId');
    this._sendTextToChannel(this.channelIndex,
      panelMessageInputEl);
    panelMessageInputEl.focus();
    this._resetMessageCount();
    this.activityIconInhibitTimer = document.getElementById('globVars')
      .constants('activityIconInhibitTimerValue');
    // clear multi-line paste notice if present
    this.shadowRoot.getElementById('multiLineActionDivId').setAttribute('hidden', '');
  };

  /**
   * Send user input to the IRC server (Enter pressed)
   * @param {object} event - Data from keyboard Enter key activation
   */
  _handleChannelInputAreaElInput = (event) => {
    const panelMessageInputEl = this.shadowRoot.getElementById('panelMessageInputId');
    if (((event.inputType === 'insertText') && (event.data === null)) ||
      (event.inputType === 'insertLineBreak')) {
      // Remove EOL characters at cursor location
      document.getElementById('displayUtils')
        .stripOneCrLfFromElement(panelMessageInputEl);
      this._sendTextToChannel(this.channelIndex, panelMessageInputEl);
      this._resetMessageCount();
      this.activityIconInhibitTimer = document.getElementById('globVars')
        .constants('activityIconInhibitTimerValue');
      // hide notice for multi-line clipboard paste
      this.shadowRoot.getElementById('multiLineActionDivId').setAttribute('hidden', '');
    }
  };

  /**
   * Show or hide additional controls at bottom of panel
   */
  _handleBottomCollapseButton = () => {
    this._handleCancelZoomEvent();
    const bottomCollapseDivEl = this.shadowRoot.getElementById('bottomCollapseDivId');
    if (bottomCollapseDivEl.hasAttribute('hidden')) {
      bottomCollapseDivEl.removeAttribute('hidden');
      this._scrollToTop();
    } else {
      bottomCollapseDivEl.setAttribute('hidden', '');
    }
  };

  // -------------------------
  // Zoom button handler
  // -------------------------
  /**
   * Zoom button handler
   * Expand text area to optimum size (row and col) to fill screen
   * Hide all other windows
   * Inhibit other windows from opening while zoomed
   * Add zoom icon to top status bar
   */
  _handleChannelZoomButtonElClick = () => {
    const bodyEl = document.querySelector('body');
    const headerBarEl = document.getElementById('headerBar');
    const zoomButtonEl = this.shadowRoot.getElementById('zoomButtonId');
    const bottomCollapseDivEl = this.shadowRoot.getElementById('bottomCollapseDivId');
    const channelTopicDivEl = this.shadowRoot.getElementById('channelTopicDivId');
    if ((bodyEl.hasAttribute('zoomId')) &&
      (bodyEl.getAttribute('zoomId') === 'channel:' + this.channelName.toLowerCase())) {
      // re-enable dynamic sscreen resizing
      this.inhibitDynamicResize = false;
      // Turn off channel zoom
      bodyEl.removeAttribute('zoomId');
      headerBarEl.removeAttribute('zoomicon');
      zoomButtonEl.textContent = 'Zoom';
      zoomButtonEl.classList.remove('channel-panel-zoomed');
      // reset screen size back to default
      channelTopicDivEl.removeAttribute('hidden');
      bottomCollapseDivEl.setAttribute('hidden', '');
      this._handleNormalButton();
      this._scrollTextAreaToRecent();
      this._handleResizeCustomElements();
    } else {
      bodyEl.setAttribute('zoomId', 'channel:' + this.channelName.toLowerCase());
      headerBarEl.setAttribute('zoomicon', '');
      zoomButtonEl.textContent = 'UnZoom';
      zoomButtonEl.classList.add('channel-panel-zoomed');
      document.dispatchEvent(new CustomEvent('hide-all-panels', {
        detail: {
          except: ['channel:' + this.channelName.toLowerCase(), 'debugPanel']
        }
      }));
      // hide channel topic
      channelTopicDivEl.setAttribute('hidden', '');
      // Hide stuff below the input bar.
      bottomCollapseDivEl.setAttribute('hidden', '');
      // Uncheck no scroll checkbox
      this.shadowRoot.getElementById('noScrollCheckboxId').checked = false;
      this._scrollTextAreaToRecent();
      // This sets size for zoomed page
      this._handleResizeCustomElements();
    }
  };

  /**
   * Event handler to cancel this panel's zoom mode.
   */
  _handleCancelZoomEvent = () => {
    const bodyEl = document.querySelector('body');
    const headerBarEl = document.getElementById('headerBar');
    const zoomButtonEl = this.shadowRoot.getElementById('zoomButtonId');
    const bottomCollapseDivEl = this.shadowRoot.getElementById('bottomCollapseDivId');
    const channelTopicDivEl = this.shadowRoot.getElementById('channelTopicDivId');
    // re-enable dynamic sscreen resizing
    this.inhibitDynamicResize = false;
    // Un-zoom panel
    if ((bodyEl.hasAttribute('zoomId')) &&
      (bodyEl.getAttribute('zoomId') === 'channel:' + this.channelName.toLowerCase())) {
      // Turn off channel zoom
      bodyEl.removeAttribute('zoomId');
      headerBarEl.removeAttribute('zoomicon');
      zoomButtonEl.textContent = 'Zoom';
      zoomButtonEl.classList.remove('channel-panel-zoomed');
      // reset screen size back to default
      channelTopicDivEl.removeAttribute('hidden');
      bottomCollapseDivEl.setAttribute('hidden', '');
      this._handleNormalButton();
      this._handleResizeCustomElements();
    }
  };

  /**
   * Function to update window.localStorage with IRC
   * channel beep enabled checkbox state.
   * Called when checkbox is clicked to enable/disable
   */
  _updateLocalStorageBeepEnable = () => {
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
  }; // _updateLocalStorageBeepEnable()

  /**
   * For this channel, load web browser local storage beep enable state.
   */
  _loadBeepEnable = () => {
    const panelDivEl = this.shadowRoot.getElementById('panelDivId');
    let beepChannelIndex = -1;
    let beepEnableChanArray = null;
    try {
      beepEnableChanArray = JSON.parse(window.localStorage.getItem('beepEnableChanArray'));
    } catch (error) {
      // ignore error
    }
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
      // Case of specific channel has previous setting from localStorage
      // console.log(JSON.stringify(beepEnableChanArray[beepChannelIndex], null, 2));
      if (beepEnableChanArray[beepChannelIndex].beep1) {
        panelDivEl.setAttribute('beep1-enabled', '');
      }
      if (beepEnableChanArray[beepChannelIndex].beep2) {
        panelDivEl.setAttribute('beep2-enabled', '');
      }
      if (beepEnableChanArray[beepChannelIndex].beep3) {
        panelDivEl.setAttribute('beep3-enabled', '');
      }
    } else {
      // This is a new channel and there is no local storage, use preset from manage-channels-panel
      // console.log('inheriting beep preset from manageChannelsPanel');
      let oneIsEnabled = false;
      const manageChannelsPanelEl = document.getElementById('manageChannelsPanel');
      if (manageChannelsPanelEl.hasAttribute('beep1-enabled')) {
        panelDivEl.setAttribute('beep1-enabled', '');
        oneIsEnabled = true;
      }
      if (manageChannelsPanelEl.hasAttribute('beep2-enabled')) {
        panelDivEl.setAttribute('beep2-enabled', '');
        oneIsEnabled = true;
      }
      if (manageChannelsPanelEl.hasAttribute('beep3-enabled')) {
        panelDivEl.setAttribute('beep3-enabled', '');
        oneIsEnabled = true;
      }
      // Remember for this channel
      if (oneIsEnabled) {
        this._updateLocalStorageBeepEnable();
      }
    }
    this._updateVisibility();
  }; // _loadBeepEnable()

  /**
   * Enable or disable audile beep sounds when checkbox is clicked
   */
  _handleChannelBeep1CBInputElClick = () => {
    const panelDivEl = this.shadowRoot.getElementById('panelDivId');
    if (panelDivEl.hasAttribute('beep1-enabled')) {
      panelDivEl.removeAttribute('beep1-enabled');
    } else {
      panelDivEl.setAttribute('beep1-enabled', '');
      document.getElementById('beepSounds').playBeep1Sound();
    }
    this._updateLocalStorageBeepEnable();
    this._updateVisibility();
  };

  /**
   * Enable or disable audile beep sounds when checkbox is clicked
   */
  _handleChannelBeep2CBInputElClick = (event) => {
    const panelDivEl = this.shadowRoot.getElementById('panelDivId');
    if (panelDivEl.hasAttribute('beep2-enabled')) {
      panelDivEl.removeAttribute('beep2-enabled');
    } else {
      panelDivEl.setAttribute('beep2-enabled', '');
      document.getElementById('beepSounds').playBeep1Sound();
    }
    this._updateLocalStorageBeepEnable();
    this._updateVisibility();
  };

  /**
   * Enable or disable audile beep sounds when checkbox is clicked
   */
  _handleChannelBeep3CBInputElClick = (event) => {
    const panelDivEl = this.shadowRoot.getElementById('panelDivId');
    if (panelDivEl.hasAttribute('beep3-enabled')) {
      panelDivEl.removeAttribute('beep3-enabled');
    } else {
      panelDivEl.setAttribute('beep3-enabled', '');
      document.getElementById('beepSounds').playBeep1Sound();
    }
    this._updateLocalStorageBeepEnable();
    this._updateVisibility();
  };

  /**
   * Event handler to cancel (remove checkbox check) for audio beeps
   */
  _handleCancelBeepSounds = () => {
    const panelDivEl = this.shadowRoot.getElementById('panelDivId');
    panelDivEl.removeAttribute('beep1-enabled');
    panelDivEl.removeAttribute('beep2-enabled');
    panelDivEl.removeAttribute('beep3-enabled');
  };

  /**
   * Function to update window.localStorage with IRC
   * channel inhibit auto-open panel on events.
   * Called when checkbox is clicked to enable/disable
   */
  _updateLocalNoAutoOpen = () => {
    // new object for channel inhibit panel auto-open status
    const now = Math.floor(Date.now() / 1000);
    const channelNoAutoOpenObj = {
      timestamp: now,
      channel: this.channelName.toLowerCase(),
      onJoin: this.shadowRoot.getElementById('panelDivId').hasAttribute('no-open-on-join'),
      onMessage: this.shadowRoot.getElementById('panelDivId').hasAttribute('no-open-on-message'),
      onMode: this.shadowRoot.getElementById('panelDivId').hasAttribute('no-open-on-mode')
    };

    // Get array of previous IRC channel, each with status object
    let noOpenChannelIndex = -1;
    let noOpenChanArray = null;
    noOpenChanArray = JSON.parse(window.localStorage.getItem('channelNoAutoOpenArray'));
    if ((noOpenChanArray) &&
      (Array.isArray(noOpenChanArray))) {
      if (noOpenChanArray.length > 0) {
        for (let i = 0; i < noOpenChanArray.length; i++) {
          if (noOpenChanArray[i].channel === this.channelName.toLowerCase()) {
            noOpenChannelIndex = i;
          }
        }
      }
    } else {
      // Array did not exist, create it
      noOpenChanArray = [];
    }
    if (noOpenChannelIndex >= 0) {
      // update previous element
      noOpenChanArray[noOpenChannelIndex] = channelNoAutoOpenObj;
    } else {
      // create new element
      noOpenChanArray.push(channelNoAutoOpenObj);
    }
    window.localStorage.setItem('channelNoAutoOpenArray', JSON.stringify(noOpenChanArray));
  }; // _updateLocalNoAutoOpen()

  /**
   * For this channel, load web browser local storage auto-open panel on events.
   */
  _loadNoAutoOpen = () => {
    const panelDivEl = this.shadowRoot.getElementById('panelDivId');
    let noOpenChannelIndex = -1;
    let noOpenChannelArray = null;
    try {
      noOpenChannelArray = JSON.parse(window.localStorage.getItem('channelNoAutoOpenArray'));
    } catch (error) {
      // ignore error
    }
    if ((noOpenChannelArray) &&
      (Array.isArray(noOpenChannelArray))) {
      if (noOpenChannelArray.length > 0) {
        for (let i = 0; i < noOpenChannelArray.length; i++) {
          if (noOpenChannelArray[i].channel === this.channelName.toLowerCase()) {
            noOpenChannelIndex = i;
          }
        }
      }
    }
    if (noOpenChannelIndex >= 0) {
      // Case of specific channel has previous setting from localStorage
      // console.log(JSON.stringify(noOpenChannelArray[noOpenChannelIndex], null, 2));
      if (noOpenChannelArray[noOpenChannelIndex].onJoin) {
        panelDivEl.setAttribute('no-open-on-join', '');
      }
      if (noOpenChannelArray[noOpenChannelIndex].onMessage) {
        panelDivEl.setAttribute('no-open-on-message', '');
      }
      if (noOpenChannelArray[noOpenChannelIndex].onMode) {
        panelDivEl.setAttribute('no-open-on-mode', '');
      }
    } else {
      // This is a new channel and there is no local storage, use preset from manage-channels-panel
      // console.log('inheriting inhibit auto-open panel preset from manageChannelsPanel');
      let oneIsEnabled = false;
      const manageChannelsPanelEl = document.getElementById('manageChannelsPanel');
      if (manageChannelsPanelEl.hasAttribute('no-open-on-join')) {
        panelDivEl.setAttribute('no-open-on-join', '');
        oneIsEnabled = true;
      }
      if (manageChannelsPanelEl.hasAttribute('no-open-on-message')) {
        panelDivEl.setAttribute('no-open-on-message', '');
        oneIsEnabled = true;
      }
      if (manageChannelsPanelEl.hasAttribute('no-open-on-mode')) {
        panelDivEl.setAttribute('no-open-on-mode', '');
        oneIsEnabled = true;
      }
      // Remember for this channel
      if (oneIsEnabled) {
        this._updateLocalNoAutoOpen();
      }
    }
    this._updateVisibility();
  }; // _loadNoAutoOpen()

  /**
   * For this channel, inhibit (enabled by default) auto open channel panel on events
   */
  _handleChannelOpenOnJoinCBInputElClick = () => {
    const panelDivEl = this.shadowRoot.getElementById('panelDivId');
    if (panelDivEl.hasAttribute('no-open-on-join')) {
      panelDivEl.removeAttribute('no-open-on-join');
    } else {
      panelDivEl.setAttribute('no-open-on-join', '');
    }
    this._updateLocalNoAutoOpen();
    this._updateVisibility();
  };

  _handleChannelOpenOnMessageCBInputElClick = () => {
    const panelDivEl = this.shadowRoot.getElementById('panelDivId');
    if (panelDivEl.hasAttribute('no-open-on-message')) {
      panelDivEl.removeAttribute('no-open-on-message');
    } else {
      panelDivEl.setAttribute('no-open-on-message', '');
    }
    this._updateLocalNoAutoOpen();
    this._updateVisibility();
  };

  _handleChannelOpenOnModeCBInputElClick = () => {
    const panelDivEl = this.shadowRoot.getElementById('panelDivId');
    if (panelDivEl.hasAttribute('no-open-on-mode')) {
      panelDivEl.removeAttribute('no-open-on-mode');
    } else {
      panelDivEl.setAttribute('no-open-on-mode', '');
    }
    this._updateLocalNoAutoOpen();
    this._updateVisibility();
  };

  /**
   * Event handler to enable/disable narrow screen next mode
   */
  _handleBriefCheckboxClick = () => {
    const panelDivEl = this.shadowRoot.getElementById('panelDivId');
    if (panelDivEl.hasAttribute('brief-enabled')) {
      panelDivEl.removeAttribute('brief-enabled');
    } else {
      panelDivEl.setAttribute('brief-enabled', '');
    }
    this._updateVisibility();

    // this forces a global update which will refresh text area
    document.dispatchEvent(new CustomEvent('update-from-cache'));
  };

  /**
   * Event handler to enable or disable auto-complete
   */
  _handleAutoCompleteCheckboxClick = () => {
    const panelDivEl = this.shadowRoot.getElementById('panelDivId');
    if (panelDivEl.hasAttribute('auto-comp-enabled')) {
      panelDivEl.removeAttribute('auto-comp-enabled');
    } else {
      panelDivEl.setAttribute('auto-comp-enabled', '');
    }
    this._updateVisibility();
  };

  /**
   * Match a text snippet to IRC commands, channel names, or nicknames
   * Internal function called by channelAutoComplete()
   * @param {string} snippet - Partial word (keypress)
   * @returns {string} Matched string
   */
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
  }; // _autoCompleteInputElement()

  /**
   * Keypress event handler used to perform auto-complete while typing.
   * Result: Modified input textarea element.
   * Activation keys:  desktop: tab,  mobile phone: space-space
   * Channel name selected by tab-tab or space-space-space
   * @param {string} e - Keyboard character pressed by user
   */
  _channelAutoComplete = (e) => {
    // Before auto-complete, check for hotkeys
    if ((e.altKey) &&
      (!e.ctrlKey) &&
      (!e.shiftKey)) {
      if (e.code === 'KeyZ') {
        // Channel panel zoom: Alt-Z
        this._handleChannelZoomButtonElClick();
      }
      if (e.code === 'KeyV') {
        // Show/hide bottom of panel Alt-V
        this._handleBottomCollapseButton();
      }
    }
    const autoCompleteSpaceKey = 32;
    const trailingSpaceKey = 32;
    const panelMessageInputEl = this.shadowRoot.getElementById('panelMessageInputId');
    if (this.shadowRoot.getElementById('autocompleteCheckboxId').hasAttribute('disabled')) return;
    if (!this.shadowRoot.getElementById('panelDivId').hasAttribute('auto-comp-enabled')) return;
    if (!e.code) return;
    if ((e.code) && (e.code === 'Tab')) {
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
        if ((e.code === 'Tab') && (snippet.length > 0)) {
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
    if ((e.code) && (e.code === 'Space') &&
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

  /**
   * Update nickname list
   * List is shown in textarea panel for IRC channel nicknames
   * Internal function call in response to irc-state-changed global events
   */
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

  /**
   * Append user count to the end of the channel name string in title area
   */
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

  /**
   * Click event listener to clear message activity ICON by clicking on the main
   */
  _handlePanelClick = () => {
    this._resetMessageCount();
  };

  /**
   * Called by displayChannelMessage() increment unread message counter for channel
   * If panel is hidden, or collapsed, increment message counter to display unread icon
   * If panel is visible, but the panel is not the active element, increment the counter
   */
  _incUnreadWhenOther = () => {
    if (((document.activeElement.id !== this.id) ||
    (!this.shadowRoot.getElementById('panelVisibilityDivId').hasAttribute('visible')) ||
    (!this.shadowRoot.getElementById('panelCollapsedDivId').hasAttribute('visible'))) &&
    (!window.globals.webState.cacheReloadInProgress) &&
    (this.activityIconInhibitTimer === 0)) {
      this._incrementMessageCount();
    }
  };

  /**
   * Called by displayChannelMessage() to make screen visible and scroll into position.
   * If panel is hidden, show panel, scroll to position
   * If collapsed, do nothing, if visible, do nothing
   */
  _displayWhenHidden = () => {
    if ((!window.globals.webState.cacheReloadInProgress) &&
    (!this.shadowRoot.getElementById('panelVisibilityDivId').hasAttribute('visible')) &&
    (!document.querySelector('body').hasAttribute('zoomId'))) {
      this.showPanel();
    }
  };

  // Example channel message (parsedMessage)
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

  /**
   * Add IRC channel message to the channel textarea element.
   * Input is formatted by the remoteCommandParser module
   * Command relevant to the IRC channel are parsed and handled here.
   * Example, when a channel member /QUIT, the proper message is displayed in channel.
   * @param {object} parsedMessage - Message meta-data
   */
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
      if ((!window.globals.webState.cacheReloadInProgress) &&
        (this.shadowRoot.getElementById('noScrollCheckboxId').checked === false)) {
        this._scrollTextAreaToRecent();
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
      // TODO cases for channel closed for other error
      //

      //  Channel mode list RPL_CHANNELMODEIS
      case '324':
        if (('params' in parsedMessage) && (parsedMessage.params.length > 0) &&
        (parsedMessage.params[1].toLowerCase() === this.channelName.toLowerCase())) {
          let modeList = 'Mode ';
          modeList += parsedMessage.params[1];
          if (parsedMessage.params.length > 1) modeList += ' ' + parsedMessage.params[2];
          _addText(parsedMessage.timestamp, '*', modeList);
          // case of mode type in other panel, example: /MODE #channel
          this.showAndScrollPanel();
        }
        break;

      // Channel creation time RPL_CREATIONTIME
      case '329':
        if (('params' in parsedMessage) && (parsedMessage.params.length > 0) &&
        (parsedMessage.params[1].toLowerCase() === this.channelName.toLowerCase())) {
          let created = 'Channel ';
          created += parsedMessage.params[1] + ' created on ';
          if (parsedMessage.params.length > 1) {
            const createdDate = new Date(parseInt(parsedMessage.params[2]) * 1000);
            created += createdDate.toLocaleString();
          }
          _addText(parsedMessage.timestamp, '*', created);
        }
        break;

        // Channel ban list item RPL_BANLIST
      case '367':
        if (('params' in parsedMessage) && (parsedMessage.params.length > 0) &&
        (parsedMessage.params[1].toLowerCase() === this.channelName.toLowerCase())) {
          let banList = '';
          if (parsedMessage.params.length > 1) banList += ' ' + parsedMessage.params[2];
          if (parsedMessage.params.length > 2) banList += ' banned by ' + parsedMessage.params[3];
          if (parsedMessage.params.length > 3) {
            const banDate = new Date(parseInt(parsedMessage.params[4]) * 1000);
            banList += ' on ' + banDate.toLocaleString();
          }
          _addText(parsedMessage.timestamp, '*', banList);
        }
        break;

        // End of channel ban list RPL_ENDOFBANLIST
      case '368':
        if (('params' in parsedMessage) && (parsedMessage.params.length > 0) &&
        (parsedMessage.params[1].toLowerCase() === this.channelName.toLowerCase())) {
          let banList = '';
          if (parsedMessage.params.length > 1) banList += ' ' + parsedMessage.params[2];
          _addText(parsedMessage.timestamp, '*', banList);
        }
        break;

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
          if (panelDivEl.hasAttribute('beep1-enabled') &&
            (!window.globals.webState.cacheReloadInProgress)) {
            document.getElementById('beepSounds').playBeep1Sound();
          }
          this._incUnreadWhenOther();
          this.showAndScrollPanel();
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
          this._incUnreadWhenOther();
          if (!panelDivEl.hasAttribute('no-open-on-join')) {
            this._displayWhenHidden();
          }
        }
        break;
      case 'MODE':
        if (parsedMessage.params[0].toLowerCase() === this.channelName.toLowerCase()) {
          // this could be more elegant than stringify.
          if (parsedMessage.nick) {
            // case of mode by user
            this._incUnreadWhenOther();
            _addText(parsedMessage.timestamp,
              '*',
              'Mode ' + JSON.stringify(parsedMessage.params) + ' by ' + parsedMessage.nick);
            // Case of mode typed in other panel as text command, example: /MODE #channel +tn
            if (!panelDivEl.hasAttribute('no-open-on-mode')) {
              this._displayWhenHidden();
            }
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
          this._incUnreadWhenOther();
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
            this._incUnreadWhenOther();
            _addText(parsedMessage.timestamp,
              '*',
              parsedMessage.nick + ' is now known as ' + parsedMessage.params[0]);
          }
        }
        break;
      case 'NOTICE':
        if (parsedMessage.params[0].toLowerCase() === this.channelName.toLowerCase()) {
          this._incUnreadWhenOther();
          _addText(parsedMessage.timestamp,
            '*',
            'Notice(' +
            parsedMessage.nick + ' to ' + parsedMessage.params[0] + ') ' + parsedMessage.params[1]);
          if (panelDivEl.hasAttribute('beep1-enabled') &&
            (!window.globals.webState.cacheReloadInProgress)) {
            document.getElementById('beepSounds').playBeep1Sound();
          }
          // Upon channel notice, make section visible.
          if (!panelDivEl.hasAttribute('no-open-on-message')) {
            this._displayWhenHidden();
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
          // -----------------------------------
          // Case 5 of 5 - Incoming PRIVMSG
          // -----------------------------------
          // console.log('cache refresh - Websocket auto-reconnect (set visibility 5 of 5)');
          // If channel panel is closed, inc unread counter and open panel on new message
          this._incUnreadWhenOther();
          if (!panelDivEl.hasAttribute('no-open-on-message')) {
            this._displayWhenHidden();
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
          if (panelDivEl.hasAttribute('beep1-enabled') &&
            (!window.globals.webState.cacheReloadInProgress)) {
            document.getElementById('beepSounds').playBeep1Sound();
          }
          this._incUnreadWhenOther();
          if (!panelDivEl.hasAttribute('no-open-on-mode')) {
            this._displayWhenHidden();
          }
        }
        break;
      default:
    } // switch (parsedMessage.command)
  }; // handleChannelMessage

  /**
   * Event handler to clear text area before cache restore is sent by server
   */
  _handleEraseBeforeReload = () => {
    // console.log('Event erase-before-reload');
    this.shadowRoot.getElementById('panelMessageDisplayId').value = '';
    this.shadowRoot.getElementById('panelMessageInputId').value = '';
    // needed to update date on first line printed
    this.shadowRoot.getElementById('panelDivId').setAttribute('lastDate', '0000-00-00');
    // Local count in channel window (to match global activity icon visibility)
  }; // _handleEraseBeforeReload

  //

  /**
   * Event handler triggered when cache reload from server is done
   * This is used to update textarea to mark end of cached data and start of new
   * @param {object} event.detail.timestamp - unix time in seconds
   */
  _handleCacheReloadDone = (event) => {
    // console.log('cache-reload-done fired');
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
    //
    // Example:  14:33:02 -----Cache Reload-----
    //
    this.shadowRoot.getElementById('panelMessageDisplayId').value += markerString;

    // move scroll bar so text is scrolled all the way up
    if ((this.shadowRoot.getElementById('noScrollCheckboxId').checked === false)) {
      this._scrollTextAreaToRecent();
    }
    //
    // This set's channel-panel visibility if needed after cache refresh
    //
    if (this.webSocketFirstConnect) {
      // -----------------------------------
      // Case 3 of 5 - Auto-reconnect websocket
      // -----------------------------------
      // console.log('cache refresh - Websocket auto-reconnect (set visibility 3 of 5)');
      this.webConnectedLast = false;
      this.collapsePanel();
    } else {
      // -----------------------------------
      // Case 4 of 5 - User refreshes web page
      // -----------------------------------
      // console.log('cache refresh - User reload web page (set visibility 4 of 5)');
      const now = Math.floor(Date.now() / 1000);
      const websocketConnectTime = now - window.globals.webState.times.webConnect;
      if ((websocketConnectTime < 5) &&
        (this.shadowRoot.getElementById('panelVisibilityDivId').hasAttribute('visible'))) {
        this.collapsePanel();
      }
    }
  }; // _handleCacheReloadDone()

  /**
   * Set flags for case of browser disconnect web socket from backend web server
   */
  _handleWebConnectChanged = () => {
    // Detect change in websocket connected state
    if (window.globals.webState.webConnected !== this.webConnectedLast) {
      this.webConnectedLast = window.globals.webState.webConnected;
      if (!window.globals.webState.webConnected) {
        // reset to have proper display based on ircConnected state
        this.webSocketFirstConnect = true;
      }
    }
  };

  /**
   * Event handler to show error in textarea
   * @param {*} event.detail.timestamp - unix time in seconds
   */
  _handleCacheReloadError = (event) => {
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
  }; // _handleCacheReloadError()

  /**
   * Dynamically set textarea column and row attributes to fit window size
   */
  _adjustTextareaWidthDynamically = () => {
    if (this.inhibitDynamicResize) return;
    // -------------
    // Horizontal
    // -------------
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
    //
    // Vertical
    //
    const bodyEl = document.querySelector('body');
    if ((bodyEl.hasAttribute('zoomId')) &&
      (bodyEl.getAttribute('zoomId') === 'channel:' + this.channelName.toLowerCase())) {
      // ------------------------------------------------------
      // Zoom mode conflicts with the iPhone popup keyboard
      // As the focus of the input textarea receives focus, the browser fires a resize event.
      // this causes the dynamic resize in a series of recursive
      // resize events, jittering the screen.
      //
      // The solution for now for zoom mode is to perform a dynamic resize
      // one time, then inhibit dynamic zoom until the zoom is cancelled.
      //
      // Most likely this can and will be improved on in the future.
      // ------------------------------------------------------
      // Set flag to inhibit zoom after zoom one time.
      this.inhibitDynamicResize = true;
      const panelNickListEl = this.shadowRoot.getElementById('panelNickListId');
      const panelMessageDisplayEl = this.shadowRoot.getElementById('panelMessageDisplayId');

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
            this.verticalZoomMarginPixels);
        rows = parseInt(rows / window.globals.webState.dynamic.textAreaRowPxHeight);

        if (window.globals.webState.dynamic.panelPxWidth > this.mobileBreakpointPx) {
          panelNickListEl.removeAttribute('hidden');
        } else {
          panelNickListEl.setAttribute('hidden', '');
        }
        panelMessageDisplayEl.setAttribute('rows', rows);
        panelNickListEl.setAttribute('rows', rows);
      }
    }
  }; // _adjustTextareaWidthDynamically()

  /**
   * Event listener fired when user resizes browser on desktop.
   */
  _handleResizeCustomElements = () => {
    if (window.globals.webState.dynamic.testAreaColumnPxWidth) {
      this._adjustTextareaWidthDynamically();
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
   * Remove timers, eventListeners, and remove self from DOM
   */
  _removeSelfFromDOM = () => {
    // Don't do this more than once (stacked events)
    if (!this.elementExistsInDom) {
      throw new Error('Error, Request to remove self from DOM after already removed.');
    }
    this.elementExistsInDom = false;

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
    this.shadowRoot.getElementById('autocompleteCheckboxId').removeEventListener('click', this._handleAutoCompleteCheckboxClick);
    this.shadowRoot.getElementById('beep1CheckBoxId').removeEventListener('click', this._handleChannelBeep1CBInputElClick);
    this.shadowRoot.getElementById('beep2CheckBoxId').removeEventListener('click', this._handleChannelBeep2CBInputElClick);
    this.shadowRoot.getElementById('beep3CheckBoxId').removeEventListener('click', this._handleChannelBeep3CBInputElClick);
    this.shadowRoot.getElementById('noOpenOnJoinCheckBoxId').removeEventListener('click', this._handleChannelOpenOnJoinCBInputElClick);
    this.shadowRoot.getElementById('noOpenOnMessageCheckBoxId').removeEventListener('click', this._handleChannelOpenOnMessageCBInputElClick);
    this.shadowRoot.getElementById('noOpenOnModeCheckBoxId').removeEventListener('click', this._handleChannelOpenOnModeCBInputElClick);
    this.shadowRoot.getElementById('bottomCollapseButtonId').removeEventListener('click', this._handleBottomCollapseButton);
    this.shadowRoot.getElementById('briefCheckboxId').removeEventListener('click', this._handleBriefCheckboxClick);
    this.shadowRoot.getElementById('clearButtonId').removeEventListener('click', this._handleClearButton);
    this.shadowRoot.getElementById('closePanelButtonId').removeEventListener('click', this._handleCloseButton);
    this.shadowRoot.getElementById('collapsePanelButtonId').removeEventListener('click', this._handleCollapseButton);
    this.shadowRoot.getElementById('joinButtonId').removeEventListener('click', this._handleChannelJoinButtonElClick);
    this.shadowRoot.getElementById('multiLineSendButtonId').removeEventListener('click', this._handleMultiLineSendButtonClick);
    this.shadowRoot.getElementById('normalButtonId').removeEventListener('click', this._handleNormalButton);
    this.shadowRoot.getElementById('panelDivId').removeEventListener('click', this._handlePanelClick);
    this.shadowRoot.getElementById('panelMessageInputId').removeEventListener('keydown', this._channelAutoComplete, false);
    this.shadowRoot.getElementById('panelMessageInputId').removeEventListener('paste', this._handleChannelInputAreaElPaste);
    this.shadowRoot.getElementById('partButtonId').removeEventListener('click', this._handleChannelPartButtonElClick);
    this.shadowRoot.getElementById('pruneButtonId').removeEventListener('click', this._handleChannelPruneButtonElClick);
    this.shadowRoot.getElementById('panelMessageInputId').removeEventListener('input', this._handleChannelInputAreaElInput);
    this.shadowRoot.getElementById('refreshButtonId').removeEventListener('click', this._handleRefreshButton);
    this.shadowRoot.getElementById('sendButtonId').removeEventListener('click', this._handleChannelSendButtonElClick);
    this.shadowRoot.getElementById('tallerButtonId').removeEventListener('click', this._handleTallerButton);
    this.shadowRoot.getElementById('zoomButtonId').removeEventListener('click', this._handleChannelZoomButtonElClick);

    document.removeEventListener('cache-reload-done', this._handleCacheReloadDone);
    document.removeEventListener('cache-reload-error', this._handleCacheReloadError);
    document.removeEventListener('cancel-beep-sounds', this._handleCancelBeepSounds);
    document.removeEventListener('cancel-zoom', this._handleCancelZoomEvent);
    document.removeEventListener('collapse-all-panels', this._handleCollapseAllPanels);
    document.removeEventListener('color-theme-changed', this._handleColorThemeChanged);
    document.removeEventListener('erase-before-reload', this._handleEraseBeforeReload);
    document.removeEventListener('hide-all-panels', this._handleHideAllPanels);
    document.removeEventListener('irc-state-changed', this._handleIrcStateChanged);
    document.removeEventListener('resize-custom-elements', this._handleResizeCustomElements);
    document.removeEventListener('show-all-panels', this._handleShowAllPanels);
    document.removeEventListener('web-connect-changed', this._handleWebConnectChanged);
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

    if (!this.elementExistsInDom) {
      throw new Error('Calling irc-state-changed after channel element was destroyed.');
    }

    // For the case where channels may have been pruned, reset index to proper values.
    this.channelIndex = window.globals.ircState.channels.indexOf(this.channelName.toLowerCase());
    const ircStateIndex = window.globals.ircState.channels.indexOf(this.channelName.toLowerCase());
    const webStateIndex = window.globals.webState.channels.indexOf(this.channelName.toLowerCase());

    if ((window.globals.ircState.ircConnected) && (ircStateIndex < 0) && (webStateIndex >= 0)) {
      // console.log('pruned removing from DOM');
      //
      // Case of channel has been pruned from the IRC client with [Prune] button
      this._removeSelfFromDOM();
    } else if ((!window.globals.ircState.ircConnected)) {
      // console.log('disconnected removing from DOM');
      //
      // Case of disconnect from IRC, any channel windows are no longer valid
      // This function is executing due to active irc-state-changed event
      // within the channel window scope. Therefore... remove it.
      this._removeSelfFromDOM();
    } else if (window.globals.ircState.ircConnected) {
      // console.log('connected, no DOM changes');
      // Update channel topic from channel state
      if (window.globals.ircState.channelStates[this.channelIndex].topic == null) {
        this.shadowRoot.getElementById('channelTopicDivId').textContent = '';
      } else {
        this.shadowRoot.getElementById('channelTopicDivId').textContent =
          document.getElementById('displayUtils')
            .cleanFormatting(window.globals.ircState.channelStates[this.channelIndex].topic);
      }
      // state object includes up to date list of nicks in a channel
      this._updateNickList();
      // Update title string to include some data
      this._updateChannelTitle();
      // show/hide disable or enable channel elements depend on state
      this._updateVisibility();
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
   * Add "title" attribute for mouse hover tool-tips.
   */
  _setFixedElementTitles = () => {
    this.shadowRoot.getElementById('beenKickedIconId').title =
      'Your nickname has been kicked from this IRC channel, use Join button to return';
    this.shadowRoot.getElementById('notInChannelIconId').title =
      'Your nickname is not present thin this IRC channel, use Join button to return';
    this.shadowRoot.getElementById('nickCountIconId').title =
      'Count of nicknames present in this channel';
    this.shadowRoot.getElementById('messageCountIconId').title =
      'Count of unread messages for this channel';
    this.shadowRoot.getElementById('joinButtonId').title =
      'Send /JOIN command to IRC server to re-join this channel';
    this.shadowRoot.getElementById('pruneButtonId').title =
      'Delete this panel and remove all related messages from remote message cache';
    this.shadowRoot.getElementById('partButtonId').title =
      'Send /PART command to IRC server to leave this channel. Panel remains visible';
    this.shadowRoot.getElementById('zoomButtonId').title =
      'Block other panels from opening. Expand textarea to fill browser viewport.';
    this.shadowRoot.getElementById('panelMessageInputId').title =
      'Channel message input area. IRC commands starting with / are accepted';
    this.shadowRoot.getElementById('sendButtonId').title =
      'Send channel message or IRC command to IRC server';
    this.shadowRoot.getElementById('bottomCollapseButtonId').title =
      'Show more options for this panel';
    this.shadowRoot.getElementById('multiLineSendButtonId').title =
      'Using timer, send multi-line message one line at a time';
    this.shadowRoot.getElementById('refreshButtonId').title =
      'Refresh from IRC message cache';
    this.shadowRoot.getElementById('clearButtonId').title =
      'Clear Text Area (Does not clear cache)';
    this.shadowRoot.getElementById('tallerButtonId').title =
      'Enlarge Channel Text Area Vertically';
    this.shadowRoot.getElementById('normalButtonId').title =
      'Restore Channel Area to default size';
    this.shadowRoot.getElementById('noScrollCheckboxId').title =
      'To allow scroll back to copy older messages to clipboard. ' +
      'Scroll textarea to new messages is inhibited.';
    this.shadowRoot.getElementById('briefCheckboxId').title =
      'Optimize message format to fit mobile device narrow screen';
    this.shadowRoot.getElementById('autocompleteCheckboxId').title =
      'Enable with trigger (tab) or (space-space) on mobile, ' +
      'disable if space character conflict with input';
    this.shadowRoot.getElementById('beep1CheckBoxId').title =
      'Enable audio beep sound for each incoming message';
    this.shadowRoot.getElementById('beep2CheckBoxId').title =
      'Enable audio beep sound when new nickname joins channel';
    this.shadowRoot.getElementById('beep3CheckBoxId').title =
      'Enable audio beep sound when your own nickname is identified in text';
  };

  /**
   * Called once per second as task scheduler, called from js/_afterLoad.js
   */
  timerTickHandler = () => {
    if (this.activityIconInhibitTimer > 0) this.activityIconInhibitTimer--;
  };

  /**
   * Called from js/_afterLoad.js after all panels are loaded.
   */
  initializePlugin = () => {
    const manageChannelsPanelEl = document.getElementById('manageChannelsPanel');
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

    this._setFixedElementTitles();

    this.shadowRoot.getElementById('panelDivId').setAttribute('lastDate', '0000-00-00');

    // Set Channel Name
    this.shadowRoot.getElementById('channelNameDivId').textContent = this.channelCsName;

    if (window.globals.ircState.channelStates[this.channelIndex].topic == null) {
      this.shadowRoot.getElementById('channelTopicDivId').textContent = '';
    } else {
      this.shadowRoot.getElementById('channelTopicDivId').textContent =
        document.getElementById('displayUtils')
          .cleanFormatting(window.globals.ircState.channelStates[this.channelIndex].topic);
    }

    // Load beep sound configuration from local storage
    this._loadBeepEnable();
    this._loadNoAutoOpen();

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

    // If /PARTed from channel, or kicked, show [Not in Channel] icon
    const ircStateIndex = window.globals.ircState.channels.indexOf(this.channelName.toLowerCase());
    if (window.globals.ircState.channelStates[ircStateIndex].joined) {
      this.shadowRoot.getElementById('notInChannelIconId').setAttribute('hidden', '');
      this.shadowRoot.getElementById('joinButtonId').setAttribute('hidden', '');
      this.shadowRoot.getElementById('pruneButtonId').setAttribute('hidden', '');
      this.shadowRoot.getElementById('partButtonId').removeAttribute('hidden');
    } else {
      this.shadowRoot.getElementById('notInChannelIconId').removeAttribute('hidden');
      this.shadowRoot.getElementById('joinButtonId').removeAttribute('hidden');
      this.shadowRoot.getElementById('pruneButtonId').removeAttribute('hidden');
      this.shadowRoot.getElementById('partButtonId').setAttribute('hidden', '');
    }
    // populate it initially on creating the element
    this._updateNickList();

    this._updateChannelTitle();

    // TODO is this needed when in html template?
    this.shadowRoot.getElementById('panelNickListId').setAttribute('cols',
      this.channelNamesCharWidth.toString());
    this.shadowRoot.getElementById('panelNickListId')
      .setAttribute('rows', this.textareaHeightInRows);

    this.shadowRoot.getElementById('panelMessageDisplayId')
      .setAttribute('rows', this.textareaHeightInRows);

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
      new CustomEvent('debounced-update-from-cache'));

    // Upon creation of new channel element panel, set the color theme
    this._handleColorThemeChanged(
      {
        detail: {
          theme: document.querySelector('body').getAttribute('theme')
        }
      }
    );

    const pendingJoinChannelIndex =
    manageChannelsPanelEl.ircChannelsPendingJoin.indexOf(this.channelName.toLowerCase());
    if (pendingJoinChannelIndex >= 0) {
      manageChannelsPanelEl.ircChannelsPendingJoin.splice(pendingJoinChannelIndex, 1);
      // -----------------------------------
      // Case 1 of 5 - User creates new channel
      // -----------------------------------
      // console.log('init - User create channel (Visibility 1 of 5)');
      this.showPanel();
    } else {
      // -----------------------------------
      // Case 2 of 5 - IRC Auto-reconnect after IRC disconnect
      // -----------------------------------
      // console.log('init = Auto-reconnect IRC (Visibility 2 of 5');
      this.collapsePanel();
    }

    this._updateVisibility();

    // Assume already connected to web socket unless it becomes disconnected
    this.webConnectedLast = true;
    this.webSocketFirstConnect = false;

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
    this.shadowRoot.getElementById('autocompleteCheckboxId').addEventListener('click', this._handleAutoCompleteCheckboxClick);
    this.shadowRoot.getElementById('beep1CheckBoxId').addEventListener('click', this._handleChannelBeep1CBInputElClick);
    this.shadowRoot.getElementById('beep2CheckBoxId').addEventListener('click', this._handleChannelBeep2CBInputElClick);
    this.shadowRoot.getElementById('beep3CheckBoxId').addEventListener('click', this._handleChannelBeep3CBInputElClick);
    this.shadowRoot.getElementById('noOpenOnJoinCheckBoxId').addEventListener('click', this._handleChannelOpenOnJoinCBInputElClick);
    this.shadowRoot.getElementById('noOpenOnMessageCheckBoxId').addEventListener('click', this._handleChannelOpenOnMessageCBInputElClick);
    this.shadowRoot.getElementById('noOpenOnModeCheckBoxId').addEventListener('click', this._handleChannelOpenOnModeCBInputElClick);
    this.shadowRoot.getElementById('bottomCollapseButtonId').addEventListener('click', this._handleBottomCollapseButton);
    this.shadowRoot.getElementById('briefCheckboxId').addEventListener('click', this._handleBriefCheckboxClick);
    this.shadowRoot.getElementById('clearButtonId').addEventListener('click', this._handleClearButton);
    this.shadowRoot.getElementById('collapsePanelButtonId').addEventListener('click', this._handleCollapseButton);
    this.shadowRoot.getElementById('closePanelButtonId').addEventListener('click', this._handleCloseButton);
    this.shadowRoot.getElementById('joinButtonId').addEventListener('click', this._handleChannelJoinButtonElClick);
    this.shadowRoot.getElementById('multiLineSendButtonId').addEventListener('click', this._handleMultiLineSendButtonClick);
    this.shadowRoot.getElementById('normalButtonId').addEventListener('click', this._handleNormalButton);
    this.shadowRoot.getElementById('panelDivId').addEventListener('click', this._handlePanelClick);
    this.shadowRoot.getElementById('panelMessageInputId').addEventListener('input', this._handleChannelInputAreaElInput);
    this.shadowRoot.getElementById('panelMessageInputId').addEventListener('keydown', this._channelAutoComplete, false);
    this.shadowRoot.getElementById('panelMessageInputId').addEventListener('paste', this._handleChannelInputAreaElPaste);
    this.shadowRoot.getElementById('partButtonId').addEventListener('click', this._handleChannelPartButtonElClick);
    this.shadowRoot.getElementById('pruneButtonId').addEventListener('click', this._handleChannelPruneButtonElClick);
    this.shadowRoot.getElementById('refreshButtonId').addEventListener('click', this._handleRefreshButton);
    this.shadowRoot.getElementById('sendButtonId').addEventListener('click', this._handleChannelSendButtonElClick);
    this.shadowRoot.getElementById('tallerButtonId').addEventListener('click', this._handleTallerButton);
    this.shadowRoot.getElementById('zoomButtonId').addEventListener('click', this._handleChannelZoomButtonElClick);

    // -------------------------------------
    // 2 of 2 Listeners on global events
    // -------------------------------------
    document.addEventListener('cache-reload-done', this._handleCacheReloadDone);
    document.addEventListener('cache-reload-error', this._handleCacheReloadError);
    document.addEventListener('cancel-beep-sounds', this._handleCancelBeepSounds);
    document.addEventListener('cancel-zoom', this._handleCancelZoomEvent);
    document.addEventListener('collapse-all-panels', this._handleCollapseAllPanels);
    document.addEventListener('color-theme-changed', this._handleColorThemeChanged);
    document.addEventListener('erase-before-reload', this._handleEraseBeforeReload);
    document.addEventListener('hide-all-panels', this._handleHideAllPanels);
    document.addEventListener('irc-state-changed', this._handleIrcStateChanged);
    document.addEventListener('resize-custom-elements', this._handleResizeCustomElements);
    document.addEventListener('show-all-panels', this._handleShowAllPanels);
    document.addEventListener('web-connect-changed', this._handleWebConnectChanged);
    /* eslint-enable max-len */
  };
});
