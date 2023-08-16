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
// This web component contains a header bar at the top of the page.
//   * Dynamically generate status icons, some clickable
//   * Status icon tool-tip messages
//   * Button to activate main navigation dropdown menu
//   * Clickable connection status, click to connect/disconnect
//   * Button to enable media play if disabled in browser
//   * Initialization code and global event listeners
//
// ------------------------------------------------------------------------------
'use strict';
customElements.define('header-bar', class extends HTMLElement {
  constructor () {
    super();
    const template = document.getElementById('headerBarTemplate');
    const templateContent = template.content;
    this.attachShadow({ mode: 'open' })
      .appendChild(templateContent.cloneNode(true));
  }

  /**
    * Set colors and visibility of status icons in the top header bar
    * @param {Object} options - Key/value pairs for each status icon
    */
  _icons = (options) => {
    let noIcons = true;
    if (Object.hasOwn(options, 'webConnect')) {
      const webConnectEl = this.shadowRoot.getElementById('webConnectIconId');
      // Use 'disconnected' to clear attributes
      webConnectEl.removeAttribute('connected');
      webConnectEl.removeAttribute('connecting');
      webConnectEl.removeAttribute('unavailable');
      if (options.webConnect === 'connected') webConnectEl.setAttribute('connected', '');
      if (options.webConnect === 'connecting') webConnectEl.setAttribute('connecting', '');
      if (options.webConnect === 'unavailable') webConnectEl.setAttribute('unavailable', '');
    }
    if (Object.hasOwn(options, 'ircConnect')) {
      const ircConnectEl = this.shadowRoot.getElementById('ircConnectIconId');
      // Use 'disconnected' to clear attributes
      ircConnectEl.removeAttribute('connected');
      ircConnectEl.removeAttribute('connecting');
      ircConnectEl.removeAttribute('unavailable');
      if (options.ircConnect === 'connected') ircConnectEl.setAttribute('connected', '');
      if (options.ircConnect === 'connecting') ircConnectEl.setAttribute('connecting', '');
      if (options.ircConnect === 'unavailable') ircConnectEl.setAttribute('unavailable', '');
    }
    if (Object.hasOwn(options, 'wait')) {
      if (options.wait) {
        noIcons = false;
        this.shadowRoot.getElementById('waitConnectIconId').removeAttribute('hidden');
      } else {
        this.shadowRoot.getElementById('waitConnectIconId').setAttribute('hidden', '');
      }
    }
    if (Object.hasOwn(options, 'away')) {
      if (options.away) {
        noIcons = false;
        this.shadowRoot.getElementById('ircIsAwayIconId').removeAttribute('hidden');
      } else {
        this.shadowRoot.getElementById('ircIsAwayIconId').setAttribute('hidden', '');
      }
    }
    if (Object.hasOwn(options, 'channelUnread')) {
      if (options.channelUnread) {
        noIcons = false;
        this.shadowRoot.getElementById('channelUnreadExistIcon').removeAttribute('hidden');
      } else {
        this.shadowRoot.getElementById('channelUnreadExistIcon').setAttribute('hidden', '');
      }
    }
    if (Object.hasOwn(options, 'privMsgUnread')) {
      if (options.privMsgUnread) {
        noIcons = false;
        this.shadowRoot.getElementById('privMsgUnreadExistIcon').removeAttribute('hidden');
      } else {
        this.shadowRoot.getElementById('privMsgUnreadExistIcon').setAttribute('hidden', '');
      }
    }
    if (Object.hasOwn(options, 'noticeUnread')) {
      if (options.noticeUnread) {
        noIcons = false;
        this.shadowRoot.getElementById('noticeUnreadExistIcon').removeAttribute('hidden');
      } else {
        this.shadowRoot.getElementById('noticeUnreadExistIcon').setAttribute('hidden', '');
      }
    }
    if (Object.hasOwn(options, 'nickRecovery')) {
      if (options.nickRecovery) {
        noIcons = false;
        this.shadowRoot.getElementById('nickRecovIconId').removeAttribute('hidden');
      } else {
        this.shadowRoot.getElementById('nickRecovIconId').setAttribute('hidden', '');
      }
    }
    if (Object.hasOwn(options, 'enableAudio')) {
      if (options.enableAudio) {
        noIcons = false;
        this.shadowRoot.getElementById('enableAudioButton').removeAttribute('hidden');
      } else {
        this.shadowRoot.getElementById('enableAudioButton').setAttribute('hidden', '');
      }
    }
    if (noIcons) {
      this.shadowRoot.getElementById('titleDiv').setAttribute('noIcons', '');
      // Pixel with occurs 2 places on this page.
      if (window.globals.webState.dynamic.bodyClientWidth > 500) {
        this.shadowRoot.getElementById('titleDiv').removeAttribute('hidden');
      } else {
        this.shadowRoot.getElementById('titleDiv').setAttribute('hidden', '');
      }
    } else {
      this.shadowRoot.getElementById('titleDiv').removeAttribute('noIcons', '');
      this.shadowRoot.getElementById('titleDiv').setAttribute('hidden', '');
    }
  };

  /**
   * Add "title" attribute for mouse hover tool-tip to each status icon.
   * Values are based on global ircState object.
   */
  _setFixedElementTutles = () => {
    this.shadowRoot.getElementById('hamburgerIcon').title =
      'Navigation Dropdown Menu';
    this.shadowRoot.getElementById('waitConnectIconId').title =
      'Waiting to auto-reconnect to IRC server';
    this.shadowRoot.getElementById('ircIsAwayIconId').title =
      'Cancel IRC away (/AWAY)';
    this.shadowRoot.getElementById('channelUnreadExistIcon').title =
      'Unread IRC channel message';
    this.shadowRoot.getElementById('privMsgUnreadExistIcon').title =
      'Unread Private Message (PM)';
    this.shadowRoot.getElementById('noticeUnreadExistIcon').title =
      'Unread IRC Notice (Click to view)';
    this.shadowRoot.getElementById('nickRecovIconId').title =
      'Waiting to recover main nickname';
    this.shadowRoot.getElementById('enableAudioButton').title =
      'Browser had disabled media playback. Click to enable beep sounds';
  }; // _setFixedElementTutles()

  /**
   * Add "title" attribute for mouse hover tool-tip to each status icon.
   * Values are based on global ircState object
   */
  _updateDynamicElementTitles = () => {
    const webConnectEl = this.shadowRoot.getElementById('webConnectIconId');
    if (webConnectEl.hasAttribute('connected')) {
      webConnectEl.title = 'Disconnect web browser from remote IRC client';
    } else {
      webConnectEl.title = 'Re-connect web browser to remote IRC client';
    }
    const ircConnectEl = this.shadowRoot.getElementById('ircConnectIconId');
    if (ircConnectEl.hasAttribute('connected')) {
      ircConnectEl.title = 'Disconnect IRC server from remote IRC client (/QUIT)';
    } else {
      ircConnectEl.title = 'Connect to the currently selected IRC server';
    }
  }; //  _updateDynamicElementTitles()

  /**
   * Initialize header-bar functionality, called by "js/_afterLoad.js"
   */
  initializePlugin = () => {
    this._icons({
      webConnect: 'disconnected',
      ircConnect: 'unavailable',
      wait: false,
      away: false,
      channelUnread: false,
      privMsgUnread: false,
      noticeUnread: false,
      nickRecovery: false,
      enableAudio: false
    });
    this._setFixedElementTutles();
    this._updateDynamicElementTitles();
  };

  /**
   * Create event listeners for static elements. Called when element is attached to the DOM.
   */
  connectedCallback () {
    // -------------------------------------
    // 1 of 2 Listeners on internal elements
    // -------------------------------------

    this.shadowRoot.getElementById('channelUnreadExistIcon').addEventListener('click', () => {
      console.log('clicked channelUnreadExistIcon');
    });
    this.shadowRoot.getElementById('enableAudioButton').addEventListener('click', () => {
      console.log('clicked enableAudioButton');
    });
    this.shadowRoot.getElementById('ircConnectIconId').addEventListener('click', () => {
      console.log('clicked ircConnectIconId');
    });
    this.shadowRoot.getElementById('ircIsAwayIconId').addEventListener('click', () => {
      console.log('clicked ircIsAwayIconId');
    });
    this.shadowRoot.getElementById('navDropdownButton').addEventListener('click', (event) => {
      event.stopPropagation();
      document.getElementById('navMenu').toggleDropdownMenu();
    });
    this.shadowRoot.getElementById('noticeUnreadExistIcon').addEventListener('click', () => {
      console.log('clicked noticeUnreadExistIcon');
    });
    this.shadowRoot.getElementById('privMsgUnreadExistIcon').addEventListener('click', () => {
      console.log('clicked privMsgUnreadExistIcon');
    });
    this.shadowRoot.getElementById('webConnectIconId').addEventListener('click', () => {
      console.log('clicked webConnectIconId');
    });

    // -------------------------------------
    // 2 of 2 Listeners on global events
    // -------------------------------------

    /**
     * Global event listener on document object to implement changes to color theme
     * @param {object} event.detail.theme - Color theme values 'light' or 'dark'
     */
    document.addEventListener('color-theme-changed', (event) => {
      if (event.detail.theme === 'light') {
        this.shadowRoot.getElementById('hamburgerIcon').setColorTheme('light');
        this.shadowRoot.getElementById('headerBarDivId')
          .classList.remove('header-bar-theme-dark');
        this.shadowRoot.getElementById('channelUnreadExistIcon')
          .classList.remove('channel-panel-theme-dark');
        this.shadowRoot.getElementById('privMsgUnreadExistIcon')
          .classList.remove('pm-panel-theme-dark');
        this.shadowRoot.getElementById('noticeUnreadExistIcon')
          .classList.remove('notice-panel-theme-dark');
        this.shadowRoot.getElementById('nickRecovIconId')
          .classList.remove('hbar-recovery-theme-dark');

        this.shadowRoot.getElementById('headerBarDivId')
          .classList.add('header-bar-theme-light');
        this.shadowRoot.getElementById('channelUnreadExistIcon')
          .classList.add('channel-panel-theme-light');
        this.shadowRoot.getElementById('privMsgUnreadExistIcon')
          .classList.add('pm-panel-theme-light');
        this.shadowRoot.getElementById('noticeUnreadExistIcon')
          .classList.add('notice-panel-theme-light');
        this.shadowRoot.getElementById('nickRecovIconId')
          .classList.add('hbar-recovery-theme-light');
      } else {
        this.shadowRoot.getElementById('hamburgerIcon').setColorTheme('dark');
        this.shadowRoot.getElementById('headerBarDivId')
          .classList.remove('header-bar-theme-light');
        this.shadowRoot.getElementById('channelUnreadExistIcon')
          .classList.remove('channel-panel-theme-light');
        this.shadowRoot.getElementById('privMsgUnreadExistIcon')
          .classList.remove('pm-panel-theme-light');
        this.shadowRoot.getElementById('noticeUnreadExistIcon')
          .classList.remove('notice-panel-theme-light');
        this.shadowRoot.getElementById('nickRecovIconId')
          .classList.remove('hbar-recovery-theme-light');

        this.shadowRoot.getElementById('headerBarDivId')
          .classList.add('header-bar-theme-dark');
        this.shadowRoot.getElementById('channelUnreadExistIcon')
          .classList.add('channel-panel-theme-dark');
        this.shadowRoot.getElementById('privMsgUnreadExistIcon')
          .classList.add('pm-panel-theme-dark');
        this.shadowRoot.getElementById('noticeUnreadExistIcon')
          .classList.add('notice-panel-theme-dark');
        this.shadowRoot.getElementById('nickRecovIconId')
          .classList.add('hbar-recovery-theme-dark');
      }
    });

    /**
     * Global event listener on document object to detect state change of remote IRC server
     * Status icon visibility and color are updated depending on IRC state.
     * Data source: ircState object
     */
    document.addEventListener('irc-state-changed', () => {
      const state = {
        webConnect: 'disconnected',
        ircConnect: 'disconnected',
        wait: false,
        away: false,
        channelUnread: false,
        privMsgUnread: false,
        noticeUnread: false,
        nickRecovery: false,
        enableAudio: false
      };
      if (window.globals.webState.webConnected) {
        state.webConnect = 'connected';
        if (window.globals.ircState.ircConnected) {
          if (window.globals.ircState.ircRegistered) {
            state.ircConnect = 'connected';
            if (window.globals.ircState.ircIsAway) {
              state.away = true;
            }
          } else {
            state.ircConnect = 'connecting';
          }
        } else {
          // IRC server disconnected
          if ((window.globals.webState.ircConnecting) || (window.globals.ircState.ircConnecting)) {
            state.ircConnect = 'connecting';
          }
          if ((window.globals.ircState.ircAutoReconnect) &&
            (window.globals.ircState.ircConnectOn) &&
            (!window.globals.ircState.ircConnected) &&
            (!window.globals.ircState.ircConnecting)) {
            state.wait = true;
          }
        }
      } else {
        // Web not connected
        if (window.globals.webState.webConnecting) {
          state.webConnect = 'connecting';
        }
        state.ircConnect = 'unavailable';
      }
      this._icons(state);
      this._updateDynamicElementTitles();
    }); // 'irc-state-changed

    /**
     * Global event listener on document object to customize page layout when browser size changes.
     * Header bar title is visible/hidden depending on page width
     * Data source: webState object
     */
    document.addEventListener('resize-custom-elements', () => {
      // Pixel with occurs 2 places on this page.
      if ((window.globals.webState.dynamic.bodyClientWidth > 500) &&
      (this.shadowRoot.getElementById('titleDiv').hasAttribute('noIcons'))) {
        this.shadowRoot.getElementById('titleDiv').removeAttribute('hidden');
      } else {
        this.shadowRoot.getElementById('titleDiv').setAttribute('hidden', '');
      }
    });
  }; // connectedCallback()
});
