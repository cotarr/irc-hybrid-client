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
window.customElements.define('manage-pm-panels', class extends HTMLElement {
  constructor () {
    super();
    const template = document.getElementById('managePmPanelsTemplate');
    const templateContent = template.content;
    this.attachShadow({ mode: 'open' })
      .appendChild(templateContent.cloneNode(true));
  }

  showPanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible', '');
    this.shadowRoot.getElementById('panelCollapsedDivId').setAttribute('visible', '');
    this.updateVisibility();
  };

  collapsePanel = () => {
    if (this.shadowRoot.getElementById('panelVisibilityDivId').hasAttribute('visible')) {
      this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible', '');
      this.shadowRoot.getElementById('panelCollapsedDivId').removeAttribute('visible');
      this.updateVisibility();
    }
  };

  hidePanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible');
    this.shadowRoot.getElementById('panelCollapsedDivId').removeAttribute('visible');
  };

  updateVisibility = () => {

  };

  /**
   * Instantiate new channel panel and insert into the DOM
   * @param {string} newChannelName - Name of new IRC #channel
   */
  _createPmElement = (pmNick, parsedMessage) => {
    if (window.globals.webState.activePrivateMessageNicks
      .indexOf(pmNick.toLowerCase()) < 0) {
      const pmContainerEl = document.getElementById('pmContainerId');
      const newPmPanelEl = document.createElement('pm-panel');
      // as ID, prifix "privmsg:" (Lower Case)
      newPmPanelEl.id = 'privmsg:' + pmNick.toLowerCase();
      // as property (Lower Case)
      newPmPanelEl.privmsgName = pmNick.toLowerCase();
      // as property (Case sensitive)
      newPmPanelEl.privmsgCsName = pmNick;
      // as attribute (Lower Case))
      newPmPanelEl.setAttribute('privmsg-name', pmNick.toLowerCase());
      // as attribute (Case sensitive)
      newPmPanelEl.setAttribute('privmsg-cs-name', pmNick);
      if (pmContainerEl.firstChild) {
        pmContainerEl.insertBefore(
          newPmPanelEl, pmContainerEl.firstChild);
      } else {
        pmContainerEl.appendChild(newPmPanelEl);
      }
      newPmPanelEl.initializePlugin();
    } else {
      throw new Error('Attempt to create channel that already exists');
    }
  }; // _createChannelElement

  //
  // -----------------------------------------------------------------------
  // Private Mesage windows are created dynamically and inserted into the DOM
  // Fire this event to send channel message to listener in channel window
  //
  // :nick!~user@host.domain PRIVMSG nickname :This is private text message.
  //
  // parsedMessage {
  //   "timestamp": "14:42:43",
  //   "datestamp": "2023-08-27",
  //   "prefix": "fromNick!~user@192.168.1.100",
  //   "nick": "fromNick",
  //   "host": "~user@192.168.1.100",
  //   "command": "PRIVMSG",
  //   "params": [
  //     "toNick",
  //     "This is the private message text"
  //   ]
  // }
  //
  // -----------------------------------------------------------------------
  displayPrivateMessage = (parsedMessage) => {
    // console.log('parsedMessage', JSON.stringify(parsedMessage, null, 2));
    if (!Object.hasOwn(parsedMessage, 'params')) return;
    // Determine if message is ingoing or outgoing
    // assume it is incoming
    let pmName = parsedMessage.nick;
    // then if outgoing reverse it
    if (pmName.toLowerCase() === window.globals.ircState.nickName.toLowerCase()) {
      pmName = parsedMessage.params[0];
    }
    //
    // check if a private message section exists, if not create it
    //
    if (window.globals.webState.activePrivateMessageNicks.indexOf(pmName.toLowerCase()) < 0) {
      this._createPmElement(pmName, parsedMessage);
    } else {
      //
      // Else, PM panel already exists, send message to the panel
      //
      const pmPanelElements =
        Array.from(document.getElementById('pmContainerId').children);
      pmPanelElements.forEach((el) => {
        if (Object.hasOwn(el, 'privmsgName')) {
          // Iterate each existing PM panel, if match, send message to window
          if (el.privmsgCsName.toLowerCase() === pmName.toLowerCase()) {
            el.displayPmMessage(parsedMessage);
          }
        }
      });
    }
  };

  // --------------------------------
  // Send private message
  // --------------------------------
  _buildPrivateMessageText = () => {
    const panelMessageInputEl = this.shadowRoot.getElementById('panelMessageInputId');
    const pmNickNameInputEl = this.shadowRoot.getElementById('pmNickNameInputId');
    const displayUtilsEl = document.getElementById('displayUtils');
    const ircControlsPanelEl = document.getElementById('ircControlsPanel');
    const errorPanelEl = document.getElementById('errorPanel');
    const localCommandParserEl = document.getElementById('localCommandParser');
    if (panelMessageInputEl.value.length === 0) return;
    const text = displayUtilsEl.stripTrailingCrLf(panelMessageInputEl.value);
    if (displayUtilsEl.detectMultiLineString(text)) {
      errorPanelEl.showError('Multi-line input is not supported.');
      panelMessageInputEl.value = '';
    } else {
      if (text.length === 0) {
        // remove cr/lf if present, then do nothing
        panelMessageInputEl.value = '';
      } else {
        // Check slash character to see if it is an IRC command
        if (text.charAt(0) === '/') {
          // yes, it is command
          const commandAction = localCommandParserEl.textCommandParser(
            {
              inputString: text,
              originType: 'generic',
              originName: null
            }
          );
          // clear input element
          panelMessageInputEl.value = '';
          if (commandAction.error) {
            errorPanelEl.showError(commandAction.message);
          } else {
            if ((commandAction.ircMessage) && (commandAction.ircMessage.length > 0)) {
              ircControlsPanelEl.sendIrcServerMessage(commandAction.ircMessage);
            }
          }
        } else {
          // console.log('else not command');
          // Else not slash / command, assume is input intended to send to private message.
          if (pmNickNameInputEl.value.length === 0) return;
          if (pmNickNameInputEl.value.split('\n').length !== 1) {
            errorPanelEl.showPanel('Multi-line input not allowed in nick name field');
            return;
          }
          const targetNickname = pmNickNameInputEl.value;
          const message = 'PRIVMSG ' + targetNickname + ' :' + text;
          ircControlsPanelEl.sendIrcServerMessage(message);
          panelMessageInputEl.value = '';
        }
      }
    }
  }; // _buildPrivateMessageText ()

  // ---------------------------------------------------
  // Load Private Message beep enable from local storage
  // ---------------------------------------------------
  loadBeepEnable = () => {
    // Default disabled
    this.shadowRoot.getElementById('openPmWithBeepCheckBoxId').checked = false;
    this.shadowRoot.getElementById('panelDivId').removeAttribute('beep-enabled');

    let beepEnableObj = null;
    beepEnableObj = JSON.parse(window.localStorage.getItem('privMsgBeep'));
    if ((beepEnableObj) &&
      (typeof beepEnableObj === 'object')) {
      if (beepEnableObj.beep) {
        this.shadowRoot.getElementById('openPmWithBeepCheckBoxId').checked = true;
        this.shadowRoot.getElementById('panelDivId').setAttribute('beep-enabled', '');
      } else {
        this.shadowRoot.getElementById('openPmWithBeepCheckBoxId').checked = false;
        this.shadowRoot.getElementById('panelDivId').removeAttribute('beep-enabled');
      }
    }
  };

  /**
   * Called once per second as task scheduler, called from js/_afterLoad.js
   */
  // timerTickHandler = () => {
  // };

  // ------------------
  // Main entry point
  // ------------------
  initializePlugin = () => {
    this.loadBeepEnable();
  };

  // add event listeners to connected callback
  // -------------------------------------------
  connectedCallback () {
    // -------------------------------------
    // 1 of 2 Listeners on internal elements
    // -------------------------------------

    this.shadowRoot.getElementById('closePanelButtonId').addEventListener('click', () => {
      this.hidePanel();
    });

    this.shadowRoot.getElementById('collapsePanelButtonId').addEventListener('click', () => {
      if (this.shadowRoot.getElementById('panelCollapsedDivId').hasAttribute('visible')) {
        this.collapsePanel();
      } else {
        this.showPanel();
      }
    });

    this.shadowRoot.getElementById('panelMessageInputId').addEventListener('input', (event) => {
      const displayUtilsEl = document.getElementById('displayUtils');
      if ((event.inputType === 'insertText') && (event.data === null)) {
        // Remove EOL characters at cursor location
        displayUtilsEl.stripOneCrLfFromElement(
          this.shadowRoot.getElementById('panelMessageInputId'));
        this._buildPrivateMessageText();
      }
      if (event.inputType === 'insertLineBreak') {
        // Remove EOL characters at cursor location
        displayUtilsEl.stripOneCrLfFromElement(
          this.shadowRoot.getElementById('panelMessageInputId'));
        this._buildPrivateMessageText();
      }
    });
    this.shadowRoot.getElementById('sendButtonId').addEventListener('click', () => {
      this._buildPrivateMessageText();
    });

    // ---------------------------------------
    // Event handler for open with line-beep checkbox
    // ---------------------------------------
    this.shadowRoot.getElementById('openPmWithBeepCheckBoxId')
      .addEventListener('click', (event) => {
        const now = Math.floor(Date.now() / 1000);
        if (this.shadowRoot.getElementById('openPmWithBeepCheckBoxId').checked) {
          this.shadowRoot.getElementById('panelDivId').setAttribute('beep-enabled', '');
          window.localStorage.setItem('privMsgBeep', JSON.stringify(
            {
              timestamp: now,
              beep: true
            }
          ));
          document.getElementById('beepSounds').playBeep3Sound();
        } else {
          this.shadowRoot.getElementById('panelDivId').removeAttribute('beep-enabled');
          window.localStorage.setItem('privMsgBeep', JSON.stringify(
            {
              timestamp: now,
              beep: false
            }
          ));
        }
      }); // checkbox openPmWithBeepCheckBoxId

    // -------------------------
    // Erase button handler
    // -------------------------
    this.shadowRoot.getElementById('eraseButtonId').addEventListener('click', () => {
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
    }); // panel erase button

    // -------------------------
    // Whois button handler
    // -------------------------
    this.shadowRoot.getElementById('whoisButtonId').addEventListener('click', () => {
      if (this.shadowRoot.getElementById('pmNickNameInputId').value.length > 0) {
        if (this.shadowRoot.getElementById('pmNickNameInputId').value.split('\n').length === 1) {
          const message = 'WHOIS ' + this.shadowRoot.getElementById('pmNickNameInputId').value;
          document.getElementById('ircControlsPanel').sendIrcServerMessage(message);
          // open up server messages to show
          document.getElementById('ircServerPanel').showPanel();
        } else {
          document.getElementById('errorPanel').showError('Multi-line input not allowed');
        }
      } else {
        document.getElementById('errorPanel').showError('Input required');
      }
    });

    // -------------------------------------
    // 2 of 2 Listeners on global events
    // -------------------------------------

    /**
     * Event to collapse all panels. This panel does not collapse so it is hidden
     * @listens document:collapse-all-panels
     * @param {string|string[]} event.detail.except - No action if listed as exception
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
        this.hidePanel();
      }
    });

    /**
     * Global event listener on document object to implement changes to color theme
     * @listens document:color-theme-changed
     * @param {object} event.detail.theme - Color theme values 'light' or 'dark'
     */
    document.addEventListener('color-theme-changed', (event) => {
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
    });

    /**
     * Global event listener on document object used during cache reload
     * Action: erase all internal date prior to cache reload
     */
    document.addEventListener('erase-before-reload', () => {
      // this.shadowRoot.getElementById('newChannelNameInputId').value = '';

      // this.shadowRoot.getElementById('channelUnreadCountIconId').textContent = '0';
      // this.shadowRoot.getElementById('channelUnreadCountIconId').setAttribute('hidden', '');
    });

    /**
     * Hide panel (not visible)unless listed as exception.
     * @listens document:hide-all-panels
     * @param {string|string[]} event.detail.except - No action if listed as exception
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
      if (window.globals.webState.dynamic.testAreaColumnPxWidth) {
        const calcInputAreaColSize = document.getElementById('displayUtils').calcInputAreaColSize;
        // pixel width mar1 is reserved space on edges of input area at full screen width
        const margin = window.globals.webState.dynamic.commonMarginRightPx + 5 +
          window.globals.webState.dynamic.sendButtonWidthPx;
        // set width of input area elements
        this.shadowRoot.getElementById('panelMessageInputId')
          .setAttribute('cols', calcInputAreaColSize(margin));
      }
    });

    /**
     * Global event listener on document object to detect state change of remote IRC server
     * Detect addition of new IRC channels and create channel panel.
     * Data source: ircState object
     * @listens document:irc-state-changed
     */
    // document.addEventListener('irc-state-changed', () => {
    // };
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
