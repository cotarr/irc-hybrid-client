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
  setHeaderBarIcons = (options) => {
    const webConnectIconEl = this.shadowRoot.getElementById('webConnectIconId');
    const ircConnectIconEl = this.shadowRoot.getElementById('ircConnectIconId');
    let noIcons = true;
    if ((Object.hasOwn(options, 'hideNavMenu')) && (options.hideNavMenu)) {
      this.shadowRoot.getElementById('navDropdownButtonId').setAttribute('hidden', '');
    } else {
      this.shadowRoot.getElementById('navDropdownButtonId').removeAttribute('hidden');
    };

    if (Object.hasOwn(options, 'webConnect')) {
      // Use 'disconnected' to clear attributes
      webConnectIconEl.removeAttribute('connected');
      webConnectIconEl.removeAttribute('connecting');
      webConnectIconEl.removeAttribute('unavailable');
      if (options.webConnect === 'connected') webConnectIconEl.setAttribute('connected', '');
      if (options.webConnect === 'connecting') webConnectIconEl.setAttribute('connecting', '');
      if (options.webConnect === 'unavailable') webConnectIconEl.setAttribute('unavailable', '');
    }
    if (Object.hasOwn(options, 'ircConnect')) {
      // Use 'disconnected' to clear attributes
      ircConnectIconEl.removeAttribute('connected');
      ircConnectIconEl.removeAttribute('connecting');
      ircConnectIconEl.removeAttribute('unavailable');
      if (options.ircConnect === 'connected') ircConnectIconEl.setAttribute('connected', '');
      if (options.ircConnect === 'connecting') ircConnectIconEl.setAttribute('connecting', '');
      if (options.ircConnect === 'unavailable') ircConnectIconEl.setAttribute('unavailable', '');
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
    if (Object.hasOwn(options, 'zoom')) {
      if (options.zoom) {
        noIcons = false;
        this.shadowRoot.getElementById('panelZoomIconId').removeAttribute('hidden');
      } else {
        this.shadowRoot.getElementById('panelZoomIconId').setAttribute('hidden', '');
      }
    }
    if (Object.hasOwn(options, 'channelUnread')) {
      if (options.channelUnread) {
        noIcons = false;
        this.shadowRoot.getElementById('channelUnreadExistIconId').removeAttribute('hidden');
      } else {
        this.shadowRoot.getElementById('channelUnreadExistIconId').setAttribute('hidden', '');
      }
    }
    if (Object.hasOwn(options, 'privMsgUnread')) {
      if (options.privMsgUnread) {
        noIcons = false;
        this.shadowRoot.getElementById('privMsgUnreadExistIconId').removeAttribute('hidden');
      } else {
        this.shadowRoot.getElementById('privMsgUnreadExistIconId').setAttribute('hidden', '');
      }
    }
    if (Object.hasOwn(options, 'noticeUnread')) {
      if (options.noticeUnread) {
        noIcons = false;
        this.shadowRoot.getElementById('noticeUnreadExistIconId').removeAttribute('hidden');
      } else {
        this.shadowRoot.getElementById('noticeUnreadExistIconId').setAttribute('hidden', '');
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
        this.shadowRoot.getElementById('enableAudioButtonId').removeAttribute('hidden');
      } else {
        this.shadowRoot.getElementById('enableAudioButtonId').setAttribute('hidden', '');
      }
    }
    if (noIcons) {
      this.shadowRoot.getElementById('titleDivId').setAttribute('noIcons', '');
      // Pixel with occurs 2 places on this page.
      if (window.globals.webState.dynamic.bodyClientWidth > 500) {
        this.shadowRoot.getElementById('titleDivId').removeAttribute('hidden');
      } else {
        this.shadowRoot.getElementById('titleDivId').setAttribute('hidden', '');
      }
    } else {
      this.shadowRoot.getElementById('titleDivId').removeAttribute('noIcons', '');
      this.shadowRoot.getElementById('titleDivId').setAttribute('hidden', '');
    }
  };

  /**
   * Add "title" attribute for mouse hover tool-tip to each status icon.
   * Values are based on global ircState object.
   */
  _setFixedElementTitles = () => {
    this.shadowRoot.getElementById('hamburgerIconId').title =
      'Navigation Dropdown Menu';
    this.shadowRoot.getElementById('waitConnectIconId').title =
      'Waiting to auto-reconnect to IRC server';
    this.shadowRoot.getElementById('ircIsAwayIconId').title =
      'Cancel IRC away (/AWAY)';
    this.shadowRoot.getElementById('panelZoomIconId').title =
      'Un-zoom panels';
    this.shadowRoot.getElementById('channelUnreadExistIconId').title =
      'Unread IRC channel message';
    this.shadowRoot.getElementById('privMsgUnreadExistIconId').title =
      'Unread Private Message (PM)';
    this.shadowRoot.getElementById('noticeUnreadExistIconId').title =
      'Unread IRC Notice (Click to view)';
    this.shadowRoot.getElementById('nickRecovIconId').title =
      'Waiting to recover main nickname';
    this.shadowRoot.getElementById('enableAudioButtonId').title =
      'Browser had disabled media playback. Click to enable beep sounds';
  }; // _setFixedElementTitles()

  /**
   * Add "title" attribute for mouse hover tool-tip to each status icon.
   * Values are based on global ircState object
   */
  _updateDynamicElementTitles = () => {
    const webConnectIconEl = this.shadowRoot.getElementById('webConnectIconId');
    if (webConnectIconEl.hasAttribute('connected')) {
      webConnectIconEl.title = 'Disconnect web browser from remote IRC client';
    } else {
      webConnectIconEl.title = 'Re-connect web browser to remote IRC client';
    }
    const ircConnectIconEl = this.shadowRoot.getElementById('ircConnectIconId');
    if (ircConnectIconEl.hasAttribute('connected')) {
      ircConnectIconEl.title = 'Disconnect IRC server from remote IRC client (/QUIT)';
    } else {
      ircConnectIconEl.title = 'Connect to the currently selected IRC server';
    }
    const titleDivEl = this.shadowRoot.getElementById('titleDivId');
    if (window.globals.ircState.ircConnected) {
      titleDivEl.textContent =
        // 'irc-hybrid-client ' +
        window.globals.ircState.ircServerName + ' (' +
        window.globals.ircState.nickName + ')';
    } else {
      titleDivEl.textContent = 'irc-hybrid-client';
    }
  }; //  _updateDynamicElementTitles()

  updateStatusIcons = () => {
    const state = {
      hideNavMenu: false,
      webConnect: 'disconnected',
      ircConnect: 'unavailable',
      wait: false,
      away: false,
      zoom: false,
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
        } else {
          state.ircConnect = 'disconnected';
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
      state.hideNavMenu = true;
      if (window.globals.webState.webConnecting) {
        state.webConnect = 'connecting';
      }
      state.ircConnect = 'unavailable';
    }
    this.setHeaderBarIcons(state);
    this._updateDynamicElementTitles();
  };

  /**
   * Initialize header-bar functionality, called by "js/_afterLoad.js"
   */
  initializePlugin = () => {
    this.updateStatusIcons();
    this._setFixedElementTitles();
    this._updateDynamicElementTitles();
  };

  /**
   * Create event listeners for static elements. Called when element is attached to the DOM.
   */
  connectedCallback () {
    // -------------------------------------
    // 1 of 2 Listeners on internal elements
    // -------------------------------------

    this.shadowRoot.getElementById('navDropdownButtonId').addEventListener('click', (event) => {
      event.stopPropagation();
      document.getElementById('navMenu').toggleDropdownMenu();
    });
    this.shadowRoot.getElementById('enableAudioButtonId').addEventListener('click', () => {
      console.log('clicked enableAudioButton');
    });
    this.shadowRoot.getElementById('webConnectIconId').addEventListener('click', () => {
      document.getElementById('websocketPanel').webConnectHeaderBarIconHandler();
    });
    this.shadowRoot.getElementById('ircConnectIconId').addEventListener('click', () => {
      document.getElementById('ircControlsPanel').webConnectHeaderBarIconHandler();
    });
    this.shadowRoot.getElementById('ircIsAwayIconId').addEventListener('click', () => {
      document.getElementById('ircControlsPanel').awayButtonHeaderBarIconHandler();
    });
    this.shadowRoot.getElementById('panelZoomIconId').addEventListener('click', () => {
      console.log('clicked panelZoomIcon');
    });
    this.shadowRoot.getElementById('channelUnreadExistIconId').addEventListener('click', () => {
      console.log('clicked channelUnreadExistIcon');
    });
    this.shadowRoot.getElementById('privMsgUnreadExistIconId').addEventListener('click', () => {
      console.log('clicked privMsgUnreadExistIcon');
    });
    this.shadowRoot.getElementById('noticeUnreadExistIconId').addEventListener('click', () => {
      console.log('clicked noticeUnreadExistIcon');
    });

    // -------------------------------------
    // 2 of 2 Listeners on global events
    // -------------------------------------

    /**
     * Global event listener on document object to implement changes to color theme
     * @listens document:color-theme-changed
     * @param {object} event.detail.theme - Color theme values 'light' or 'dark'
     */
    document.addEventListener('color-theme-changed', (event) => {
      const hamburgerIconEl = this.shadowRoot.getElementById('hamburgerIconId');
      const headerBarDivEl = this.shadowRoot.getElementById('headerBarDivId');
      const channelUnreadExistIconEl = this.shadowRoot.getElementById('channelUnreadExistIconId');
      const privMsgUnreadExistIconEl = this.shadowRoot.getElementById('privMsgUnreadExistIconId');
      const noticeUnreadExistIconEl = this.shadowRoot.getElementById('noticeUnreadExistIconId');
      const nickRecovIconEl = this.shadowRoot.getElementById('nickRecovIconId');
      if (event.detail.theme === 'light') {
        hamburgerIconEl.setColorTheme('light');
        headerBarDivEl.classList.remove('header-bar-theme-dark');
        headerBarDivEl.classList.add('header-bar-theme-light');
        channelUnreadExistIconEl.classList.remove('channel-panel-theme-dark');
        channelUnreadExistIconEl.classList.add('channel-panel-theme-light');
        privMsgUnreadExistIconEl.classList.remove('pm-panel-theme-dark');
        privMsgUnreadExistIconEl.classList.add('pm-panel-theme-light');
        noticeUnreadExistIconEl.classList.remove('notice-panel-theme-dark');
        noticeUnreadExistIconEl.classList.add('notice-panel-theme-light');
        nickRecovIconEl.classList.remove('hbar-recovery-theme-dark');
        nickRecovIconEl.classList.add('hbar-recovery-theme-light');
      } else {
        hamburgerIconEl.setColorTheme('dark');
        headerBarDivEl.classList.remove('header-bar-theme-light');
        headerBarDivEl.classList.add('header-bar-theme-dark');
        channelUnreadExistIconEl.classList.remove('channel-panel-theme-light');
        channelUnreadExistIconEl.classList.add('channel-panel-theme-dark');
        privMsgUnreadExistIconEl.classList.remove('pm-panel-theme-light');
        privMsgUnreadExistIconEl.classList.add('pm-panel-theme-dark');
        noticeUnreadExistIconEl.classList.remove('notice-panel-theme-light');
        noticeUnreadExistIconEl.classList.add('notice-panel-theme-dark');
        nickRecovIconEl.classList.remove('hbar-recovery-theme-light');
        nickRecovIconEl.classList.add('hbar-recovery-theme-dark');
      }
    });

    /**
     * Global event listener on document object to detect state change of remote IRC server
     * Status icon visibility and color are updated depending on IRC state.
     * Data source: window.globals.ircState object
     * @listens document:irc-state-changed
     */
    document.addEventListener('irc-state-changed', () => {
      this.updateStatusIcons();
    }); // 'irc-state-changed

    /**
     * Global event listener on document object to customize page layout when browser size changes.
     * Header bar title is visible/hidden depending on page width
     * Data source: window.globals.webState object
     * @listens resize-custom-elements
     */
    document.addEventListener('resize-custom-elements', () => {
      const titleDivEl = this.shadowRoot.getElementById('titleDivId');
      // Pixel with occurs 2 places on this page.
      if ((window.globals.webState.dynamic.bodyClientWidth > 500) &&
      (titleDivEl.hasAttribute('noIcons'))) {
        titleDivEl.removeAttribute('hidden');
      } else {
        titleDivEl.setAttribute('hidden', '');
      }
    });

    document.addEventListener('update-channel-count', (event) => {
      let totalCount = 0;
      const channelsElements = document.getElementById('channelsContainerId');
      const channelEls = Array.from(channelsElements.children);
      channelEls.forEach((chanEl) => {
        totalCount += chanEl.unreadMessageCount;
      });
      if (totalCount > 0) {
        this.shadowRoot.getElementById('channelUnreadExistIconId').removeAttribute('hidden');
      } else {
        this.shadowRoot.getElementById('channelUnreadExistIconId').setAttribute('hidden', '');
      }
    });

    /**
     * Global event listener on document object to detect state change websocket connection.
     * Status icon visibility and color are updated depending on IRC state.
     * Data source: window.globals.webState object
     * @listens web-connect-change
     */
    document.addEventListener('web-connect-changed', () => {
      this.updateStatusIcons();
    }); // web-connect-changed
  }; // connectedCallback()
});
