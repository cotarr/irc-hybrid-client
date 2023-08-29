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

'use strict';
window.customElements.define('pm-panel', class extends HTMLElement {
  constructor () {
    super();
    const template = document.getElementById('pmPanelTemplate');
    const templateContent = template.content;
    this.attachShadow({ mode: 'open' })
      .appendChild(templateContent.cloneNode(true));
    this.privmsgName = '';
    this.privmsgCsName = '';
    this.ircConnectedLast = false;
    this.defaultHeightInRows = 10;
    this.activityIconInhibitTimer = 0;
  }

  // --------------------------------------------
  // Send text as private message to other user
  //     (internal function)
  // --------------------------------------------
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

  showPanel = () => {
    document.getElementById('managePmPanels')
      .setLastPmPanel(this.privmsgName.toLocaleLowerCase(), 'opened');
    this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible', '');
    this.shadowRoot.getElementById('panelCollapsedDivId').setAttribute('visible', '');
    this.shadowRoot.getElementById('bottomCollapseDivId').setAttribute('hidden', '');
    this._updateVisibility();
    document.dispatchEvent(new CustomEvent('cancel-zoom'));
  };

  collapsePanel = () => {
    document.getElementById('managePmPanels')
      .setLastPmPanel(this.privmsgName.toLocaleLowerCase(), 'collapsed');
    this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible', '');
    this.shadowRoot.getElementById('panelCollapsedDivId').removeAttribute('visible');
    this.shadowRoot.getElementById('bottomCollapseDivId').setAttribute('hidden', '');
    this._updateVisibility();
  };

  hidePanel = () => {
    document.getElementById('managePmPanels')
      .setLastPmPanel(this.privmsgName.toLocaleLowerCase(), 'closed');
    this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible');
    this.shadowRoot.getElementById('panelCollapsedDivId').removeAttribute('visible');
  };

  _updateVisibility = () => {
    const beepCheckBoxEl = this.shadowRoot.getElementById('beepCheckBoxId');
    if (this.shadowRoot.getElementById('panelDivId').hasAttribute('beep3-enabled')) {
      beepCheckBoxEl.checked = true;
    } else {
      beepCheckBoxEl.checked = false;
    }
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

  _handleBottomCollapseButton = () => {
    const bottomCollapseDivEl = this.shadowRoot.getElementById('bottomCollapseDivId');
    if (bottomCollapseDivEl.hasAttribute('hidden')) {
      bottomCollapseDivEl.removeAttribute('hidden');
    } else {
      bottomCollapseDivEl.setAttribute('hidden', '');
    }
  };

  _handleTallerButton = () => {
    const newRows = parseInt(this.shadowRoot.getElementById('panelMessageDisplayId')
      .getAttribute('rows')) + 10;
    this.shadowRoot.getElementById('panelMessageDisplayId').setAttribute('rows', newRows);
    this.shadowRoot.getElementById('panelMessageInputId').setAttribute('rows', '3');
  };

  _handleNormalButton = () => {
    this.shadowRoot.getElementById('panelMessageDisplayId')
      .setAttribute('rows', this.defaultHeightInRows);
    this.shadowRoot.getElementById('panelMessageInputId').setAttribute('rows', '1');
  };

  // -----------------------
  // Detect paste event,
  // Check clipboard, if multi-line, make multi-line send button visible
  // -----------------------
  _handlePrivmsgInputAreaElPaste = (event) => {
    if (this._splitMultiLinePaste(event.clipboardData.getData('text')).length > 1) {
      // Make multi-line clilpboard past notice visible and show button
      this.shadowRoot.getElementById('multiLineSendSpanId').textContent = 'Clipboard (' +
        this._splitMultiLinePaste(event.clipboardData.getData('text')).length + ' lines)';
      this.shadowRoot.getElementById('multiLineActionDivId').removeAttribute('hidden');
      this.shadowRoot.getElementById('panelMessageInputId').setAttribute('rows', '3');
    };
  }; // handleprivMsgInputAreaElPaste()

  // -------------
  // Event handler for clipboard
  // multi-line paste, Send button
  // -------------
  _handleMultiLineSendButtonClick = (event) => {
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

  // -------------
  // send button
  // -------------
  _handlePrivMsgSendButtonElClick = (event) => {
    const panelMessageInputEl = this.shadowRoot.getElementById('panelMessageInputId');
    this._sendPrivMessageToUser(this.privmsgCsName, panelMessageInputEl);
    panelMessageInputEl.focus();
    // TODO this.resetPrivMsgCount();
    this.activityIconInhibitTimer = document.getElementById('globVars')
      .constants('activityIconInhibitTimerValue');
    this.shadowRoot.getElementById('multiLineActionDivId').setAttribute('hidden', '');
  };

  // ---------------
  // Enter pressed
  // ---------------
  _handlePrivmsgInputAreaElInput = (event) => {
    const panelMessageInputEl = this.shadowRoot.getElementById('panelMessageInputId');
    if (((event.inputType === 'insertText') && (event.data === null)) ||
      (event.inputType === 'insertLineBreak')) {
      // Remove EOL characters at cursor location
      document.getElementById('displayUtils')
        .stripOneCrLfFromElement(panelMessageInputEl);
      this._sendPrivMessageToUser(this.privmsgCsName, panelMessageInputEl);
      // TODO resetPrivMsgCount();
      this.activityIconInhibitTimer = document.getElementById('globVars')
        .constants('activityIconInhibitTimerValue');
    }
  };

  // -------------------------------
  // Clear message activity ICON by clicking on the main
  // -------------------------------
  _handlePanelClick = () => {
    // this._resetMessageCount();
    console.log('panel click TODO');
  };

  // displayPmMessage = (parsedMessage) => {
  //   try {
  //     this.displayPmMessage2();
  //   } catch (error) {
  //     console.error(error);
  //   }
  // };

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
        panelMessageDisplayEl.scrollTop = panelMessageDisplayEl.scrollHeight;
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
            // (!document.querySelector('body').hasAttribute('zoomId'))) {
            console.log('Outgoing message, not cache reload, not zoom calling showPanel()');
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
            (!document.querySelector('body').hasAttribute('zoomId'))) {
            console.log('Incoming message, not cache reload, not zoom calling showPanel()');
            this.showPanel();
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

          // if ((document.activeElement !== privMsgInputAreaEl) &&
          // (document.activeElement !== privMsgSendButtonEl) &&
          // (!window.globals.webState.cacheReloadInProgress) &&
          // (activityIconInhibitTimer === 0)) {
          //   incrementPrivMsgCount();
          // }
        }
      }
    } // if PRIVMSG
  }; // displayPmMessage

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

  // -------------------------
  // Beep On Message checkbox handler
  // -------------------------
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

  // -----------------------
  // Cancel all beep sounds
  // -----------------------
  _handleCancelBeepSounds = (event) => {
    this.shadowRoot.getElementById('panelDivId').removeAttribute('beep3-enabled');
    this._updateVisibility();
  };

  // ----------------------------------------------------------------------
  // Internal function to release channel resources if channel is removed
  // ----------------------------------------------------------------------
  _removeSelfFromDOM = () => {
    // Don't do this more than once (stacked events)
    if (!this.privmsgCsName) return;
    delete this.privmsgCsName;
    this.removeAttribute('privmsg-cs-name');
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
    document.removeEventListener('hide-all-panels', this._handleShowAllPanels);
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
    console.log('irc-state-changed ircConnected', window.globals.ircState.ircConnected);
    // if (window.globals.ircState.ircConnected) {
    //   // this._removeSelfFromDOM();
    // }
    if (window.globals.ircState.ircConnected !== this.ircConnectedLast) {
      this.ircConnectedLast = window.globals.ircState.ircConnected;
      // Handle case of IRC disconnect
      if (!window.globals.ircState.ircConnected) {
        this._removeSelfFromDOM();
      }
    }
  };

  //
  // Add cache reload message to private message window
  //
  // Example:  14:33:02 -----Cache Reload-----
  //
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

    panelMessageDisplayEl.value += markerString;
    // move scroll bar so text is scrolled all the way up
    panelMessageDisplayEl.scrollTop = panelMessageDisplayEl.scrollHeight;
  };

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
   * Called once per second as task scheduler, called from js/_afterLoad.js
   */
  // timerTickHandler = () => {
  // };

  // ------------------
  // Main entry point
  // ------------------
  initializePlugin = (parsedMessage) => {
    const managePmPanelsEl = document.getElementById('managePmPanels');
    // if PM panel already exist abort
    if (window.globals.webState.activePrivateMessageNicks
      .indexOf(this.privmsgName.toLowerCase()) >= 0) {
      throw new Error('_createPrivateMessageEl: PP panel already exist');
    }

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

    // PM windows are created when a new message is detected
    // this add's the initial message to the window.
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
      console.log('initialize, not cache reload, calling showPanel()');
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

  // add event listeners to connected callback
  // -------------------------------------------
  connectedCallback () {
    // -------------------------------------
    // 1 of 2 Listeners on internal elements
    // -------------------------------------

    /* eslint-disable max-len */
    this.shadowRoot.getElementById('beepCheckBoxId').addEventListener('click', this._handlePrivMsgBeep1CBInputElClick);
    this.shadowRoot.getElementById('bottomCollapseButtonId').addEventListener('click', this._handleBottomCollapseButton);
    this.shadowRoot.getElementById('closePanelButtonId').addEventListener('click', this._handleCloseButton);
    this.shadowRoot.getElementById('collapsePanelButtonId').addEventListener('click', this._handleCollapseButton);
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
