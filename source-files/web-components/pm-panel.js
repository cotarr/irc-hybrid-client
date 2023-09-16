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
//    This web component is an IRC channel panel.
//
// ------------------------------------------------------------------------------
//
// Each IRC channel panel is dynamically created and inserted
// into the DOM by parent element manage-channels-panel.
// When no longer needed, this component will self destroy itself.
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
//   cancel-zoom
//   update-privmsg-count
//
// Public Methods
//   showPanel()
//   showAndScrollPanel()
//   collapsePanel()
//   hidePanel()
//   displayPmMessage(parsedMessage)
//
// Example incoming private message (parsedMessage)
// parsedMessage {
//   "timestamp": "14:42:43",
//   "datestamp": "2023-08-27",
//   "prefix": "fromNick!~user@192.168.1.100",
//   "nick": "fromNick",
//   "host": "~user@192.168.1.100",
//   "command": "PRIVMSG",
//   "params": [
//     "toNick",
//     "This is the private channel message text"
//   ]
// }
//
// ------------------------------------------------------------------------------
//
//  Panel visibility
//
// Panel creation
//   No pm-panel elements exit at page load, so hide/unhide is not relevant
//   The pm-panel elements are inserted into the DOM dynamically by manage-pm-panels.
//   When inserted, the HTML Template pm-panel hidden by default
//
//   A new pm-panel element is dynamically create by manage-pm-panels
//   after parsing incoming PRIVMSG commands has detected a new PM nickname.
//   A list of current nicknames is kept in webState.activePrivateMessageNicks[] array.
//   When a pm-panel initializes itself, it add's it's name to activePrivateMessageNicks[] array.
//   A pm-panel is hidden after creation, pending events...
//
// Event: cache-reload-done
//   Upon receiving cache-reload-done, the web connect time is calculated.
//   If the websocket has been connected less than 5 seconds,
//   the event is assumed to be a page reload and collapsePanel()
//   is called to show the pm-panel as a collapsed bar.
//   If the time is greater than 5 seconds, the no changes in visibility occur.
//
// Event; erase-before-reload
//   When an erase-before-reload event occurs, all pm-panel elements
//   will self detect the event, remove internal event listeners, and remove
//   itself from the DOM.
//   Thus... each cache reload removes all PM panels and restores new instances.
//
// Function call to public method displayPmMessage(parsedMessage) will
//   make the panel visible and scroll it to the top of the viewport,
//   unless any other panel is zoom or unless a cache reload is in progress.
//
// Hotkey Alt-B will make all private message panels visible collapsed as bar.
// Hotkey Alt-P will make all private message panels visible collapsed as bar.
//
// Scroll - Upon showPanel() a pm-panel element is scrolled to the top of the viewport.
//
// ------------------------------------------------------------------------------
'use strict';
window.customElements.define('pm-panel', class extends HTMLElement {
  constructor () {
    super();
    const template = document.getElementById('pmPanelTemplate');
    const templateContent = template.content;
    this.attachShadow({ mode: 'open' })
      .appendChild(templateContent.cloneNode(true));
    this.elementExistsInDom = true;
    this.privmsgName = '';
    this.privmsgCsName = '';
    this.defaultHeightInRows = 10;
    this.unreadMessageCount = 0;
    this.activityIconInhibitTimer = 0;
  }

  /**
   * Send text as private message to other user (internal function)
   * Intercept IRC text command if detected
   * @param {string} targetNickname - index into ircState channel array
   * @param {object} textAreaEl - The HTML textarea element for message display
   */
  _sendPrivMessageToUser = (targetNickname, textAreaEl) => {
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
          const commandAction =
            document.getElementById('localCommandParser').textCommandParser(
              {
                inputString: text,
                originType: 'private',
                originName: targetNickname
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

        // Else not slash / command, assume is input intended to send to private message.
        const message = 'PRIVMSG ' + targetNickname + ' :' + text;
        ircControlsPanelEl.sendIrcServerMessage(message);
        textAreaEl.value = '';
      }
    }
    textAreaEl.value = '';
  }; // _sendPrivMessageToUser

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
    document.dispatchEvent(new CustomEvent('update-privmsg-count',
      {
        detail: {
          channel: this.privmsgName.toLowerCase(),
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
    document.dispatchEvent(new CustomEvent('update-privmsg-count',
      {
        detail: {
          channel: this.privmsgName.toLowerCase(),
          unreadMessageCount: this.unreadMessageCount
        }
      }
    ));
  };

  /**
   * Scroll pm textarea to show most recent message (scroll to bottom)
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
   * Make panel visible (both internal and external function)
   */
  showPanel = () => {
    document.getElementById('managePmPanels')
      .setLastPmPanel(this.privmsgName.toLocaleLowerCase(), 'opened');
    this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible', '');
    this.shadowRoot.getElementById('panelCollapsedDivId').setAttribute('visible', '');
    this.shadowRoot.getElementById('bottomCollapseDivId').setAttribute('hidden', '');
    this._updateVisibility();
    document.dispatchEvent(new CustomEvent('cancel-zoom'));
    this._scrollTextAreaToRecent();
    this._scrollToTop();
    this.shadowRoot.getElementById('panelMessageInputId').focus();
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
    document.getElementById('managePmPanels')
      .setLastPmPanel(this.privmsgName.toLocaleLowerCase(), 'collapsed');
    this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible', '');
    this.shadowRoot.getElementById('panelCollapsedDivId').removeAttribute('visible');
    this.shadowRoot.getElementById('bottomCollapseDivId').setAttribute('hidden', '');
    this._updateVisibility();
  };

  /**
   * Hide this panel (both internal and external function)
   */
  hidePanel = () => {
    document.getElementById('managePmPanels')
      .setLastPmPanel(this.privmsgName.toLocaleLowerCase(), 'closed');
    this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible');
    this.shadowRoot.getElementById('panelCollapsedDivId').removeAttribute('visible');
  };

  /**
   * Show, hide, or update panel elements based on state variables
   */
  _updateVisibility = () => {
    const beepCheckBoxEl = this.shadowRoot.getElementById('beepCheckBoxId');
    if (this.shadowRoot.getElementById('panelDivId').hasAttribute('beep3-enabled')) {
      beepCheckBoxEl.checked = true;
    } else {
      beepCheckBoxEl.checked = false;
    }
  };

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
      this.showPanel();
    }
  };

  /**
   * Show or hide additional controls at bottom of panel
   */
  _handleBottomCollapseButton = () => {
    const bottomCollapseDivEl = this.shadowRoot.getElementById('bottomCollapseDivId');
    if (bottomCollapseDivEl.hasAttribute('hidden')) {
      bottomCollapseDivEl.removeAttribute('hidden');
    } else {
      bottomCollapseDivEl.setAttribute('hidden', '');
    }
  };

  /**
   * Button handler to vertically enlarge the textarea element
   */
  _handleTallerButton = () => {
    const newRows = parseInt(this.shadowRoot.getElementById('panelMessageDisplayId')
      .getAttribute('rows')) + 10;
    this.shadowRoot.getElementById('panelMessageDisplayId').setAttribute('rows', newRows);
    this.shadowRoot.getElementById('panelMessageInputId').setAttribute('rows', '3');
  };

  /**
   * Button handler to restore vertical size textarea element to default size
   */
  _handleNormalButton = () => {
    this.shadowRoot.getElementById('panelMessageDisplayId')
      .setAttribute('rows', this.defaultHeightInRows);
    this.shadowRoot.getElementById('panelMessageInputId').setAttribute('rows', '1');
  };

  /**
   * Respond to user clipboard paste of data into the input area.
   * Detects multi-line input and opens hidden multi-line controls
   * @param {object} event - Clipboard data
   */
  _handlePrivmsgInputAreaElPaste = (event) => {
    if (this._splitMultiLinePaste(event.clipboardData.getData('text')).length > 1) {
      // Make multi-line clilpboard past notice visible and show button
      this.shadowRoot.getElementById('multiLineSendSpanId').textContent = 'Clipboard (' +
        this._splitMultiLinePaste(event.clipboardData.getData('text')).length + ' lines)';
      this.shadowRoot.getElementById('multiLineActionDivId').removeAttribute('hidden');
      this.shadowRoot.getElementById('panelMessageInputId').setAttribute('rows', '3');
    };
  }; // handleprivMsgInputAreaElPaste()

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
      errorPanelEl.showError('Maximum multi-line clipboard paste 100 Lines');
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
              // PM name not in active PM list
              if (window.globals.webState.activePrivateMessageNicks
                .indexOf(this.privmsgName.toLowerCase()) < 0) {
                okToSend = false;
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
              // SEnd private message to user
              const message = 'PRIVMSG ' + this.privmsgCsName + ' :' + multiLineArray[i];
              // Send the message
              document.getElementById('ircControlsPanel').sendIrcServerMessage(message);
              if (i !== multiLineArray.length - 1) {
                // Show each line in inputArea while waiting for timer
                panelMessageInputEl.value = multiLineArray[i + 1];
              } else {
                panelMessageInputEl.value = '';
              }
            } // send private message
          }, delayMs); // timer
        } // next i
        multiLineActionDivEl.setAttribute('hidden', '');
      } else {
        // case of not multi-line exceed maximum length
        multiLineActionDivEl.setAttribute('hidden', '');
      }
    } // case of less than max allowed lines
  }; // handleMultiLineSendButtonClick()

  /**
   * Send user input to the IRC server (Send button)
   */
  _handlePrivMsgSendButtonElClick = () => {
    const panelMessageInputEl = this.shadowRoot.getElementById('panelMessageInputId');
    this._sendPrivMessageToUser(this.privmsgCsName, panelMessageInputEl);
    panelMessageInputEl.focus();
    this._resetMessageCount();
    this.activityIconInhibitTimer = document.getElementById('globVars')
      .constants('activityIconInhibitTimerValue');
    this.shadowRoot.getElementById('multiLineActionDivId').setAttribute('hidden', '');
  };

  /**
   * Send user input to the IRC server (Enter pressed)
   * @param {object} event - Data from keyboard Enter key activation
   */
  _handlePrivmsgInputAreaElInput = (event) => {
    const panelMessageInputEl = this.shadowRoot.getElementById('panelMessageInputId');
    if (((event.inputType === 'insertText') && (event.data === null)) ||
      (event.inputType === 'insertLineBreak')) {
      // Remove EOL characters at cursor location
      document.getElementById('displayUtils')
        .stripOneCrLfFromElement(panelMessageInputEl);
      this._sendPrivMessageToUser(this.privmsgCsName, panelMessageInputEl);
      this._resetMessageCount();
      this.activityIconInhibitTimer = document.getElementById('globVars')
        .constants('activityIconInhibitTimerValue');
    }
  };

  _handlePanelClick = () => {
    this._resetMessageCount();
  };

  // Example incoming private message (parsedMessage)
  // parsedMessage {
  //   "timestamp": "14:42:43",
  //   "datestamp": "2023-08-27",
  //   "prefix": "fromNick!~user@192.168.1.100",
  //   "nick": "fromNick",
  //   "host": "~user@192.168.1.100",
  //   "command": "PRIVMSG",
  //   "params": [
  //     "toNick",
  //     "This is the private channel message text"
  //   ]
  // }

  /**
   * Add IRC private message to the textarea element.
   * Input is formatted by the remoteCommandParser module
   * @param {object} parsedMessage - Message meta-data
   */
  displayPmMessage = (parsedMessage) => {
    const panelDivEl = this.shadowRoot.getElementById('panelDivId');
    const panelMessageDisplayEl = this.shadowRoot.getElementById('panelMessageDisplayId');
    const displayUtilsEl = document.getElementById('displayUtils');
    const globVarsEl = document.getElementById('globVars');
    const pmNameSpacer = globVarsEl.constants('pmNameSpacer');

    // console.log('pmPanel parsedMessage:', JSON.stringify(parsedMessage, null, 2));

    const _addText = (text) => {
      // append text to textarea
      panelMessageDisplayEl.value += displayUtilsEl.cleanFormatting(text) + '\n';
      // move scroll bar so text is scrolled all the way up
      if (!window.globals.webState.cacheReloadInProgress) {
        this._scrollTextAreaToRecent();
      }
    };

    // With each message, if date has changed, print the new date value
    // Two places, see above for opening new window with date divider
    if (
      // case of this is outgoing message from me
      (parsedMessage.params[0].toLowerCase() === this.privmsgName.toLowerCase()) ||
      // case of incoming message from others.
      (
        (parsedMessage.params[0].toLowerCase() !== this.privmsgName.toLowerCase()) &&
        (parsedMessage.nick.toLowerCase() === this.privmsgName.toLowerCase())
      )) {
      if (panelDivEl.getAttribute('lastDate') !== parsedMessage.datestamp) {
        panelDivEl.setAttribute('lastDate', parsedMessage.datestamp);
        panelMessageDisplayEl.value +=
          '\n=== ' + parsedMessage.datestamp + ' ===\n\n';
      }
    }

    if (parsedMessage.command === 'PRIVMSG') {
      // there may be multiple windows open with other nicknames
      // This does a nickname match and acts only on message for this intended window.
      if (parsedMessage.nick === window.globals.ircState.nickName) {
        // case of this is outgoing message from me
        if (parsedMessage.params[0].toLowerCase() === this.privmsgName.toLowerCase()) {
          if ('isPmCtcpAction' in parsedMessage) {
            _addText(parsedMessage.timestamp + pmNameSpacer +
            parsedMessage.nick + ' ' + parsedMessage.params[1]);
          } else {
            _addText(parsedMessage.timestamp + ' ' +
            parsedMessage.nick + pmNameSpacer + parsedMessage.params[1]);
          }
          if (panelDivEl.hasAttribute('beep3-enabled') &&
            (!window.globals.webState.cacheReloadInProgress)) {
            document.getElementById('beepSounds').playBeep3Sound();
          }
          // Upon privMsg message, make section visible, unless reload in progress
          if (!window.globals.webState.cacheReloadInProgress) {
            //
            // Outgoing message will open, even if unzoomed.
            //
            document.dispatchEvent(new CustomEvent('cancel-zoom'));
            this.showPanel();
          }
        }
      } else {
        // case of incoming message from others.
        if (parsedMessage.nick.toLowerCase() === this.privmsgName.toLowerCase()) {
          if ('isPmCtcpAction' in parsedMessage) {
            _addText(parsedMessage.timestamp + pmNameSpacer +
            parsedMessage.nick + ' ' + parsedMessage.params[1]);
          } else {
            _addText(parsedMessage.timestamp + ' ' +
            parsedMessage.nick + pmNameSpacer + parsedMessage.params[1]);
          }
          if (panelDivEl.hasAttribute('beep3-enabled') &&
            (!window.globals.webState.cacheReloadInProgress)) {
            document.getElementById('beepSounds').playBeep3Sound();
          }
          // Upon privMsg message, make section visible, unless reload in progress
          if ((!window.globals.webState.cacheReloadInProgress) &&
            (!this.shadowRoot.getElementById('panelVisibilityDivId').hasAttribute('visible')) &&
            (!document.querySelector('body').hasAttribute('zoomId'))) {
            this.showPanel();
            this._updateVisibility();
          }

          if (this.privmsgCsName !== parsedMessage.nick) {
            this.privmsgCsName = parsedMessage.nick;
            this.shadowRoot.getElementById('pmNameDivId').textContent = this.privmsgCsName;
            this.setAttribute('privmsg-cs-name', this.privmsgCsName);
          }
          // Message activity Icon
          // If focus not <inputarea> elment,
          // and focus not message send button
          // and NOT reload from cache in progress (timer not zero)
          // then display incoming message activity icon
          if (((document.activeElement.id !== this.id) ||
            (!this.shadowRoot.getElementById('panelVisibilityDivId').hasAttribute('visible')) ||
            (!this.shadowRoot.getElementById('panelCollapsedDivId').hasAttribute('visible'))) &&
            (!window.globals.webState.cacheReloadInProgress) &&
            (this.activityIconInhibitTimer === 0)) {
            this._incrementMessageCount();
          }
        }
      }
    } // if PRIVMSG
  }; // displayPmMessage

  /**
   * Event listener fired when user resizes browser on desktop.
   */
  _handleResizeCustomElements = () => {
    if (window.globals.webState.dynamic.testAreaColumnPxWidth) {
      const calcInputAreaColSize = document.getElementById('displayUtils').calcInputAreaColSize;
      // pixel width mar1 is reserved space on edges of input area at full screen width
      const mar1 = window.globals.webState.dynamic.commonMarginRightPx;
      const mar2 = window.globals.webState.dynamic.commonMarginRightPx + 5 +
        window.globals.webState.dynamic.sendButtonWidthPx +
        window.globals.webState.dynamic.collapseButtonWidthPx;
      // set width of input area elements
      this.shadowRoot.getElementById('panelMessageDisplayId')
        .setAttribute('cols', calcInputAreaColSize(mar1));
      this.shadowRoot.getElementById('panelMessageInputId')
        .setAttribute('cols', document.getElementById('displayUtils').calcInputAreaColSize(mar2));
    }
  };

  /**
     * Global event listener on document object to implement changes to color theme
     * @listens document:color-theme-changed
     * @param {object} event.detail.theme - Color theme values 'light' or 'dark'
     */
  _handleColorThemeChanged = (event) => {
    const panelDivEl = this.shadowRoot.getElementById('panelDivId');
    if (event.detail.theme === 'light') {
      panelDivEl.classList.remove('pm-panel-theme-dark');
      panelDivEl.classList.add('pm-panel-theme-light');
    } else {
      panelDivEl.classList.remove('pm-panel-theme-light');
      panelDivEl.classList.add('pm-panel-theme-dark');
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
   * Enable or disable audile beep sounds when checkbox is clicked
   */
  _handlePrivMsgBeep1CBInputElClick = (event) => {
    const panelDivEl = this.shadowRoot.getElementById('panelDivId');
    if (panelDivEl.hasAttribute('beep3-enabled')) {
      panelDivEl.removeAttribute('beep3-enabled');
    } else {
      panelDivEl.setAttribute('beep3-enabled', '');
      document.getElementById('beepSounds').playBeep3Sound();
    }
    this._updateVisibility();
  };

  /**
   * Event handler to cancel (remove checkbox check) for audio beeps
   */
  _handleCancelBeepSounds = () => {
    this.shadowRoot.getElementById('panelDivId').removeAttribute('beep3-enabled');
    this._updateVisibility();
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
    // Remove channel name from list of channel active in browser
    //
    // Lower case nicknames
    const webStatePmPanelNameIndex =
      window.globals.webState.activePrivateMessageNicks.indexOf(this.privmsgName.toLowerCase());
    if (webStatePmPanelNameIndex >= 0) {
      window.globals.webState.activePrivateMessageNicks.splice(webStatePmPanelNameIndex, 1);
    }
    // Case sensitive Nicknames
    const webStatePmPanelCsNameIndex =
      window.globals.webState.activePrivateMessageCsNicks.indexOf(this.privmsgCsName);
    if (webStatePmPanelCsNameIndex >= 0) {
      window.globals.webState.activePrivateMessageCsNicks.splice(webStatePmPanelCsNameIndex, 1);
    }
    // Remove self from pull down menu
    document.getElementById('navMenu').handlePmListUpdate();

    //
    // 2 - Remove eventListeners
    //
    /* eslint-disable max-len */
    this.shadowRoot.getElementById('beepCheckBoxId').removeEventListener('click', this._handlePrivMsgBeep1CBInputElClick);
    this.shadowRoot.getElementById('bottomCollapseButtonId').removeEventListener('click', this._handleBottomCollapseButton);
    this.shadowRoot.getElementById('closePanelButtonId').removeEventListener('click', this._handleCloseButton);
    this.shadowRoot.getElementById('collapsePanelButtonId').removeEventListener('click', this._handleCollapseButton);
    this.shadowRoot.getElementById('eraseButtonId').removeEventListener('click', this._handleEraseAllButton);
    this.shadowRoot.getElementById('multiLineSendButtonId').removeEventListener('click', this._handleMultiLineSendButtonClick);
    this.shadowRoot.getElementById('normalButtonId').removeEventListener('click', this._handleNormalButton);
    this.shadowRoot.getElementById('panelDivId').removeEventListener('click', this._handlePanelClick);
    this.shadowRoot.getElementById('panelMessageInputId').removeEventListener('input', this._handlePrivmsgInputAreaElInput);
    this.shadowRoot.getElementById('panelMessageInputId').removeEventListener('paste', this._handlePrivmsgInputAreaElPaste);
    this.shadowRoot.getElementById('sendButtonId').removeEventListener('click', this._handlePrivMsgSendButtonElClick);
    this.shadowRoot.getElementById('tallerButtonId').removeEventListener('click', this._handleTallerButton);

    document.removeEventListener('cache-reload-done', this._handleCacheReloadDone);
    document.removeEventListener('cache-reload-error', this._handelCacheReloadError);
    document.removeEventListener('cancel-beep-sounds', this._handleCancelBeepSounds);
    document.removeEventListener('collapse-all-panels', this._handleCollapseAllPanels);
    document.removeEventListener('color-theme-changed', this._handleColorThemeChanged);
    document.removeEventListener('erase-before-reload', this._handleEraseBeforeReload);
    document.removeEventListener('hide-all-panels', this._handleHideAllPanels);
    document.removeEventListener('irc-state-changed', this._handleIrcStateChanged);
    document.removeEventListener('resize-custom-elements', this._handleResizeCustomElements);
    document.removeEventListener('show-all-panels', this._handleShowAllPanels);
    /* eslint-enable max-len */

    //
    // 3 - Channel panel removes itself from the DOM
    //
    const parentEl = document.getElementById('pmContainerId');
    const childEl = document.getElementById('privmsg:' + this.privmsgName.toLowerCase());
    if (parentEl.contains(childEl)) {
      // remove the channel element from DOM
      parentEl.removeChild(childEl);
    }
  }; // _removeSelfFromDOM()

  /**
   * handle changes in the ircState object
   */
  _handleIrcStateChanged = () => {
    if (!this.elementExistsInDom) {
      throw new Error('Calling irc-state-changed after channel element was destroyed.');
    }

    if (!window.globals.ircState.ircConnected) {
      if (window.globals.webState.activePrivateMessageNicks
        .indexOf(this.privmsgName.toLowerCase()) >= 0) {
        this._removeSelfFromDOM();
      }
    }
  };

  /**
   * Event handler triggered when cache reload from server is done
   * This is used to update textarea to mark end of cached data and start of new
   * @param {object} event.detail.timestamp - unix time in seconds
   */
  _handleCacheReloadDone = (event) => {
    const panelMessageDisplayEl = this.shadowRoot.getElementById('panelMessageDisplayId');
    let markerString = '';
    let timestampString = '';
    if (('detail' in event) && ('timestamp' in event.detail)) {
      timestampString = document.getElementById('displayUtils')
        .unixTimestampToHMS(event.detail.timestamp);
    }
    if (timestampString) {
      markerString += timestampString;
    }
    markerString += ' ' +
      document.getElementById('globVars').constants('cacheReloadString') + '\n';
    //
    // Example:  14:33:02 -----Cache Reload-----
    //
    panelMessageDisplayEl.value += markerString;
    // move scroll bar so text is scrolled all the way up
    this._scrollTextAreaToRecent();
    //
    // This is to open the PM panel on refresh page, or net connect
    //
    const now = Math.floor(Date.now() / 1000);
    const uptime = now - window.globals.webState.times.webConnect;
    if ((uptime < 5) &&
    (!this.shadowRoot.getElementById('panelVisibilityDivId').hasAttribute('visible'))) {
      this.collapsePanel();
    }
  };

  /**
   * Event handler to show error in textarea
   * @param {*} event.detail.timestamp - unix time in seconds
   */
  _handelCacheReloadError = (event) => {
    // Clear temporary array so next asynchronous API cache reload
    // can start with an empty array.
    let errorString = '\n';
    let timestampString = '';
    if (('detail' in event) && ('timestamp' in event.detail)) {
      timestampString = document.getElementById('displayUtils')
        .unixTimestampToHMS(event.detail.timestamp);
    }
    if (timestampString) {
      errorString += timestampString;
    }
    errorString += ' ' +
      document.getElementById('globVar').constants('cacheErrorString') + '\n\n';
    this.shadowRoot.getElementById('panelMessageDisplayId').value = errorString;
  };

  /**
   * Event handler, this event fires before a message cache reload
   * is requested from the server. All private message panels
   * are expected to detect this event and removed themselves from the DOM
   * including deletion of all event listeners
   */
  _handleEraseBeforeReload = () => {
    this._removeSelfFromDOM();
  };

  /**
   * Button handler for API request to erase all private message from teh message cache
   */
  _handleEraseAllButton = () => {
    document.getElementById('ircControlsPanel').eraseIrcCache('PRIVMSG')
      .then(() => {
        // erase successful, reload
        if (!window.globals.webState.cacheReloadInProgress) {
          document.dispatchEvent(new CustomEvent('update-from-cache'));
        }
      })
      .catch((err) => {
        console.log(err);
        let message = err.message || err.toString() || 'Error occurred calling /irc/connect';
        // show only 1 line
        message = message.split('\n')[0];
        document.getElementById('errorPanel').showError(message);
      });
  }; // panel erase button

  /**
   * Add "title" attribute for mouse hover tool-tips.
   */
  _setFixedElementTitles = () => {
    this.shadowRoot.getElementById('messageCountIconId').title =
      'Unread Message Count';
    this.shadowRoot.getElementById('panelMessageInputId').title =
      'Private message input area. IRC commands starting with / are accepted';
    this.shadowRoot.getElementById('sendButtonId').title =
      'Send primate message or IRC command to IRC server';
    this.shadowRoot.getElementById('bottomCollapseButtonId').title =
      'Show more options for this panel';
    this.shadowRoot.getElementById('multiLineSendButtonId').title =
      'Using timer, send multi-line message one line at a time';
    this.shadowRoot.getElementById('tallerButtonId').title =
      'Enlarge PM Text Area Vertically';
    this.shadowRoot.getElementById('normalButtonId').title =
      'Restore PM Area to default size';
    this.shadowRoot.getElementById('eraseButtonId').title =
      'Remove all private messages from remote message cache';
    this.shadowRoot.getElementById('beepCheckBoxId').title =
      'When checked emit audio beep sound for each message';
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
  initializePlugin = (parsedMessage) => {
    const managePmPanelsEl = document.getElementById('managePmPanels');
    // if PM panel already exist abort
    if (window.globals.webState.activePrivateMessageNicks
      .indexOf(this.privmsgName.toLowerCase()) >= 0) {
      throw new Error('_createPrivateMessageEl: PP panel already exist');
    }

    this._setFixedElementTitles();

    // Add to local browser list of open channels
    window.globals.webState.activePrivateMessageNicks.push(this.privmsgName.toLowerCase());
    // Case sensitive name
    window.globals.webState.activePrivateMessageCsNicks.push(this.privmsgCsName);

    // Update pull down menu
    document.getElementById('navMenu').handlePmListUpdate();

    this.shadowRoot.getElementById('pmNameDivId').textContent = this.privmsgCsName;

    // Upon creation of new channel element panel, set the color theme
    this._handleColorThemeChanged(
      {
        detail: {
          theme: document.querySelector('body').getAttribute('theme')
        }
      }
    );

    // ------------------------------------------------------------
    // Add initial date divider message, this is repeated below for
    // for addition incoming PM
    // ------------------------------------------------------------
    const panelDivEl = this.shadowRoot.getElementById('panelDivId');
    if (panelDivEl.getAttribute('lastDate') !== parsedMessage.datestamp) {
      panelDivEl.setAttribute('lastDate', parsedMessage.datestamp);
      this.shadowRoot.getElementById('panelMessageDisplayId').value =
        '\n=== ' + parsedMessage.datestamp + ' ===\n\n';
    }

    // ----------------------------------
    // On creating a new PM chat element
    // initialize the audio line-beep setting
    //
    // Note, reloading from cache destroys and creates
    // new PM elements, and will re-initialize
    // ----------------------------------
    // Check the global setting
    if (document.getElementById('managePmPanels').hasAttribute('beep-enabled')) {
      // case of enabled globally, enable for new/refreshed element
      this.shadowRoot.getElementById('panelDivId').setAttribute('beep3-enabled', '');
      if (!window.globals.webState.cacheReloadInProgress) {
        document.getElementById('beepSounds').playBeep3Sound();
      }
    } else {
      // else disabled globally
      this.shadowRoot.getElementById('panelDivId').removeAttribute('beep3-enabled');
    }

    this._updateVisibility();

    // Example private message (parsedMessage)
    // parsedMessage {
    //   "timestamp": "14:42:43",
    //   "datestamp": "2023-08-27",
    //   "prefix": "fromNick!~user@192.168.1.100",
    //   "nick": "fromNick",
    //   "host": "~user@192.168.1.100",
    //   "command": "PRIVMSG",
    //   "params": [
    //     "toNick",
    //     "This is the private channel message text"
    //   ]
    // }

    /**
     * Add private message to the textarea element.
     * Input is formatted by the remoteCommandParser module
     * @param {object} parsedMessage - Message meta-data
     */
    this.displayPmMessage(parsedMessage);
    if (window.globals.webState.cacheReloadInProgress) {
      if (managePmPanelsEl.listOfOpenedPmPanels.indexOf(
        this.privmsgName.toLowerCase()) >= 0) {
        if (!document.querySelector('body').hasAttribute('zoomId')) {
          this.showPanel();
        } else {
          this.hidePanel();
        }
      } else if (managePmPanelsEl.listOfCollapsedPmPanels.indexOf(
        this.privmsgName.toLowerCase()) >= 0) {
        if (!document.querySelector('body').hasAttribute('zoomId')) {
          this.collapsePanel();
        } else {
          this.hidePanel();
        }
      } else if (managePmPanelsEl.listOfClosedPmPanels.indexOf(
        this.privmsgName.toLowerCase()) >= 0) {
        this.hidePanel();
      } else {
        // console.log('Error, reload from cache, no previous PM state found');
        this.collapsePanel();
      }
    } else {
      // console.log('initialize, not cache reload, calling showPanel()');
      this.showPanel();
    }

    // Resize on creating channel window
    //
    this._handleResizeCustomElements();
    //
    // This is a hack. If adding the channel window
    // causes the vertical scroll to appear,
    // Then the dynamic element side of textarea
    // element will not account for vertical slider width
    // Fix...wait 0.1 sec for scroll bar to appear and
    // dynamically size again.
    //
    setTimeout(this._handleResizeCustomElements, 100);
  };

  /**
   * Called by browser after this component is inserted into the DOM
   */
  connectedCallback () {
    // -------------------------------------
    // 1 of 2 Listeners on internal elements
    // -------------------------------------

    /* eslint-disable max-len */
    this.shadowRoot.getElementById('beepCheckBoxId').addEventListener('click', this._handlePrivMsgBeep1CBInputElClick);
    this.shadowRoot.getElementById('bottomCollapseButtonId').addEventListener('click', this._handleBottomCollapseButton);
    this.shadowRoot.getElementById('closePanelButtonId').addEventListener('click', this._handleCloseButton);
    this.shadowRoot.getElementById('collapsePanelButtonId').addEventListener('click', this._handleCollapseButton);
    this.shadowRoot.getElementById('eraseButtonId').addEventListener('click', this._handleEraseAllButton);
    this.shadowRoot.getElementById('multiLineSendButtonId').addEventListener('click', this._handleMultiLineSendButtonClick);
    this.shadowRoot.getElementById('normalButtonId').addEventListener('click', this._handleNormalButton);
    this.shadowRoot.getElementById('panelDivId').addEventListener('click', this._handlePanelClick);
    this.shadowRoot.getElementById('panelMessageInputId').addEventListener('input', this._handlePrivmsgInputAreaElInput);
    this.shadowRoot.getElementById('panelMessageInputId').addEventListener('paste', this._handlePrivmsgInputAreaElPaste);
    this.shadowRoot.getElementById('sendButtonId').addEventListener('click', this._handlePrivMsgSendButtonElClick);
    this.shadowRoot.getElementById('tallerButtonId').addEventListener('click', this._handleTallerButton);

    // -------------------------------------
    // 2 of 2 Listeners on global events
    // -------------------------------------
    document.addEventListener('cache-reload-done', this._handleCacheReloadDone);
    document.addEventListener('cache-reload-error', this._handelCacheReloadError);
    document.addEventListener('cancel-beep-sounds', this._handleCancelBeepSounds);
    document.addEventListener('collapse-all-panels', this._handleCollapseAllPanels);
    document.addEventListener('color-theme-changed', this._handleColorThemeChanged);
    document.addEventListener('erase-before-reload', this._handleEraseBeforeReload);
    document.addEventListener('hide-all-panels', this._handleHideAllPanels);
    document.addEventListener('irc-state-changed', this._handleIrcStateChanged);
    document.addEventListener('resize-custom-elements', this._handleResizeCustomElements);
    document.addEventListener('show-all-panels', this._handleShowAllPanels);
    /* eslint-enable max-len */
  } // connectedCallback()
});
