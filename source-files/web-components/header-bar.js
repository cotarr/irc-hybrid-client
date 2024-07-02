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
//    Header Bar at top of web page.
//
// ------------------------------------------------------------------------------
// This web component contains a header bar at the top of the page.
//   * Dynamically generate status icons, some clickable
//   * Status icon tool-tip messages
//   * Button to activate main navigation dropdown menu
//   * Clickable connection status, click to connect/disconnect
//   * Button to enable media play if disabled in browser
//   * Initialization code and global event listeners
//
// Public methods
//   giveNavMenuHamburgerIconFocus()
//   setHeaderBarIcons(options)
//   updateMenuOpenState(menuOpenState)
//
// Public Properties
//   beepicon (boolean)
//   channelicon (boolean)
//   noticeicon (boolean)
//   privmsgicon (boolean)
//   servericon (boolean)
//   wallopsicon (boolean)
//   zoomicon (boolean)
//
// Public attributes
//   beepicon (if attribute exists)
//   channelicon (if attribute exists)
//   noticeicon (if attribute exists)
//   privmsgicon (if attribute exists)
//   servericon (if attribute exists)
//   wallopsicon (if attribute exists)
//   zoomicon (if attribute exists)
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
    this.privmsgicon = false;
    this.collapseAllToggle = 0;
    this.collapseAllTimeout = 0;
  }

  //
  // For icons that are not available in the ircState and webState objects
  // Several getter and setter functions have been defined.,
  //
  static get observedAttributes () {
    return [
      'beepicon',
      'channelicon',
      'noticeicon',
      'privmsgicon',
      'servericon',
      'wallopsicon',
      'zoomicon'
    ];
  }

  get beepicon () {
    return this.hasAttribute('beepicon');
  }

  set beepicon (val) {
    if (val) {
      this.setAttribute('beepicon', '');
    } else {
      this.removeAttribute('beepicon');
    }
  }

  get channelicon () {
    return this.hasAttribute('channelicon');
  }

  set channelicon (val) {
    if (val) {
      this.setAttribute('channelicon', '');
    } else {
      this.removeAttribute('channelicon');
    }
  }

  get noticeicon () {
    return this.hasAttribute('noticeicon');
  }

  set noticeicon (val) {
    if (val) {
      this.setAttribute('noticeicon', '');
    } else {
      this.removeAttribute('noticeicon');
    }
  }

  get privmsgicon () {
    return this.hasAttribute('privmsgicon');
  }

  set privmsgicon (val) {
    if (val) {
      this.setAttribute('privmsgicon', '');
    } else {
      this.removeAttribute('privmsgicon');
    }
  }

  get servericon () {
    return this.hasAttribute('servericon');
  }

  set servericon (val) {
    if (val) {
      this.setAttribute('servericon', '');
    } else {
      this.removeAttribute('servericon');
    }
  }

  get wallopsicon () {
    return this.hasAttribute('wallopsicon');
  }

  set wallopsicon (val) {
    if (val) {
      this.setAttribute('wallopsicon', '');
    } else {
      this.removeAttribute('wallopsicon');
    }
  }

  get zoomicon () {
    return this.hasAttribute('zoomicon');
  }

  set zoomicon (val) {
    if (val) {
      this.setAttribute('zoomicon', '');
    } else {
      this.removeAttribute('zoomicon');
    }
  }

  attributeChangedCallback (name, oldValue, newValue) {
    this.updateStatusIcons();
  }

  /**
    * Set colors and visibility of status icons in the top header bar
    * @param {Object} options - Key/value pairs for each status icon
    */
  setHeaderBarIcons = (options) => {
    // console.log(JSON.stringify(options, null, 2));
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
    if (Object.hasOwn(options, 'serverUnread')) {
      if (options.serverUnread) {
        noIcons = false;
        this.shadowRoot.getElementById('serverUnreadExistIconId').removeAttribute('hidden');
      } else {
        this.shadowRoot.getElementById('serverUnreadExistIconId').setAttribute('hidden', '');
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
    if (Object.hasOwn(options, 'wallopsUnread')) {
      if (options.wallopsUnread) {
        noIcons = false;
        this.shadowRoot.getElementById('wallopsUnreadExistIconId').removeAttribute('hidden');
      } else {
        this.shadowRoot.getElementById('wallopsUnreadExistIconId').setAttribute('hidden', '');
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
      if (window.globals.webState.dynamic.panelPxWidth > 500) {
        this.shadowRoot.getElementById('titleDivId').removeAttribute('hidden');
      } else {
        this.shadowRoot.getElementById('titleDivId').setAttribute('hidden', '');
      }
    } else {
      this.shadowRoot.getElementById('titleDivId').removeAttribute('noIcons', '');
      this.shadowRoot.getElementById('titleDivId').setAttribute('hidden', '');
    }
    // Hide view collapssed button if not connected.
    if ((window.globals.ircState.ircConnected) && (window.globals.webState.webConnected)) {
      this.shadowRoot.getElementById('collapseAllButtonId').removeAttribute('hidden');
    } else {
      this.shadowRoot.getElementById('collapseAllButtonId').setAttribute('hidden', '');
    }
  };

  /**
   * Add "title" attribute for mouse hover tool-tip to each status icon.
   * Values are based on global ircState object.
   */
  _setFixedElementTitles = () => {
    this.shadowRoot.getElementById('hamburgerIconId')
      .updateHamburgerInfo('closed');
    this.shadowRoot.getElementById('hamburgerIconId')
      .updateHamburgerTitle('Navigation Dropdown Menu');
    this.shadowRoot.getElementById('waitConnectIconId').title =
      'Waiting to auto-reconnect to IRC server';
    this.shadowRoot.getElementById('ircIsAwayIconId').title =
      'Cancel IRC away (/AWAY)';
    this.shadowRoot.getElementById('panelZoomIconId').title =
      'Un-zoom panels';
    this.shadowRoot.getElementById('serverUnreadExistIconId').title =
      'Unread IRC server message, click to view panel';
    this.shadowRoot.getElementById('channelUnreadExistIconId').title =
      'Unread IRC channel message, click to view panel';
    this.shadowRoot.getElementById('privMsgUnreadExistIconId').title =
      'Unread Private Message (PM), click to view panel';
    this.shadowRoot.getElementById('noticeUnreadExistIconId').title =
      'Unread IRC Notice, click to view panel';
    this.shadowRoot.getElementById('wallopsUnreadExistIconId').title =
      'Unread IRC Wallops, click to view panel';
    this.shadowRoot.getElementById('nickRecovIconId').title =
      'Waiting to recover main nickname';
    this.shadowRoot.getElementById('enableAudioButtonId').title =
      'Browser had disabled media playback. Click to enable beep sounds';
    this.shadowRoot.getElementById('collapseAllButtonId').title =
      'Toggle: Collapse active panels to bar, Hide all panels';
  }; // _setFixedElementTitles()

  /**
   * Add "title" attribute for mouse hover tool-tip to each status icon.
   * Values are based on global ircState object
   */
  _updateDynamicElementTitles = () => {
    const webConnectIconEl = this.shadowRoot.getElementById('webConnectIconId');
    if (webConnectIconEl.hasAttribute('connected')) {
      webConnectIconEl.title =
        'Web server connected. Click to place web page in Standby (Remote IRC stays active)';
    } else {
      webConnectIconEl.title =
        'Web server is not connected. Click to re-connect web page to remote IRC client';
    }
    const ircConnectIconEl = this.shadowRoot.getElementById('ircConnectIconId');
    if (ircConnectIconEl.hasAttribute('connected')) {
      ircConnectIconEl.title =
        'IRC network connected. Click to disconnect IRC server from remote IRC client (/QUIT)';
    } else if (ircConnectIconEl.hasAttribute('unavailable')) {
      ircConnectIconEl.title =
        'IRC connect button is disabled because web server is not connected.';
    } else {
      ircConnectIconEl.title =
        'IRC network is not connected. Click to connect to the currently selected IRC server';
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
      serverUnread: false,
      channelUnread: false,
      privMsgUnread: false,
      noticeUnread: false,
      wallopsUnread: false,
      nickRecovery: false,
      enableAudio: false
    };
    // Set according to getter and setter values
    if (this.hasAttribute('beepicon')) state.enableAudio = true;
    if (this.hasAttribute('channelicon')) state.channelUnread = true;
    if (this.hasAttribute('noticeicon')) state.noticeUnread = true;
    if (this.hasAttribute('privmsgicon')) state.privMsgUnread = true;
    if (this.hasAttribute('servericon')) state.serverUnread = true;
    if (this.hasAttribute('wallopsicon')) state.wallopsUnread = true;
    if (this.hasAttribute('zoomicon')) state.zoom = true;
    // Set icons based on ircState and webState
    if (window.globals.webState.webConnected) {
      state.webConnect = 'connected';
      if (window.globals.ircState.ircConnected) {
        if (window.globals.ircState.ircRegistered) {
          state.ircConnect = 'connected';
        } else {
          state.ircConnect = 'connecting';
        } // ircRegistered
        if (window.globals.ircState.ircIsAway) {
          state.away = true;
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
      } // ircConnected
    } else {
      // Web not connected
      if (window.globals.webState.webConnecting) {
        state.webConnect = 'connecting';
      }
      state.ircConnect = 'unavailable';
    }
    // Mute IRC message related status icons when not connected
    // except state.wait (used in reconnect) and state.enableAudio
    if ((!window.globals.webState.webConnected) || (!window.globals.ircState.ircConnected)) {
      state.away = false;
      state.zoom = false;
      state.serverUnread = false;
      state.channelUnread = false;
      state.privMsgUnread = false;
      state.noticeUnread = false;
      state.wallopsUnread = false;
      state.nickRecovery = false;
    }

    if (window.globals.ircState.ircConnected) {
      if (window.globals.ircState.nickRecoveryActive) {
        state.nickRecovery = true;
      } else {
        state.nickRecovery = false;
      }
    }

    this.setHeaderBarIcons(state);
    this._updateDynamicElementTitles();
  };

  /**
   * Called once per second as task scheduler, called from js/_afterLoad.js
   */
  timerTickHandler = () => {
    if (this.collapseAllTimeout > 0) {
      this.collapseAllTimeout--;
      if (this.collapseAllTimeout === 0) {
        // Timer expired, next button click will use collapse all
        this.collapseAllToggle = 0;
      }
    }
  };

  /**
   * Initialize header-bar functionality, called by "js/_afterLoad.js"
   */
  initializePlugin = () => {
    this.updateStatusIcons();
    this._setFixedElementTitles();
    this._updateDynamicElementTitles();
    setInterval(() => {
      const serverIconEl = this.shadowRoot.getElementById('serverUnreadExistIconId');
      const wallopsIconEl = this.shadowRoot.getElementById('wallopsUnreadExistIconId');
      const noticeIconEl = this.shadowRoot.getElementById('noticeUnreadExistIconId');
      const privMsgIconEl = this.shadowRoot.getElementById('privMsgUnreadExistIconId');
      const channelIconEl = this.shadowRoot.getElementById('channelUnreadExistIconId');
      const audioIconEl = this.shadowRoot.getElementById('enableAudioButtonId');
      if (serverIconEl.hasAttribute('flash')) {
        serverIconEl.removeAttribute('flash');
        wallopsIconEl.removeAttribute('flash');
        noticeIconEl.removeAttribute('flash');
        privMsgIconEl.removeAttribute('flash');
        channelIconEl.removeAttribute('flash');
        audioIconEl.removeAttribute('flash');
      } else {
        serverIconEl.setAttribute('flash', '');
        wallopsIconEl.setAttribute('flash', '');
        noticeIconEl.setAttribute('flash', '');
        privMsgIconEl.setAttribute('flash', '');
        channelIconEl.setAttribute('flash', '');
        audioIconEl.setAttribute('flash', '');
      }
    }, 500);
  };

  /**
   * Update HamburgerIcon Nav Menu icon attributes
   * @param {String} menuOpenState - Navigation dropdown state 'open' or 'closed'
   */
  updateMenuOpenState = (menuOpenState) => {
    this.shadowRoot.getElementById('hamburgerIconId').updateHamburgerInfo(menuOpenState);
  };

  /**
   * Find Nav menu hamburger icon and give it focus
   */
  giveNavMenuHamburgerIconFocus = () => {
    this.shadowRoot.getElementById('hamburgerIconId').giveNavMenuHamburgerIconFocus();
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
      document.getElementById('beepSounds').userInitiatedAudioPlay();
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
      document.dispatchEvent(new CustomEvent('cancel-zoom'));
    });

    this.shadowRoot.getElementById('serverUnreadExistIconId').addEventListener('click', () => {
      document.getElementById('ircServerPanel').showPanel();
    });
    this.shadowRoot.getElementById('channelUnreadExistIconId').addEventListener('click', () => {
      document.getElementById('manageChannelsPanel').handleHeaderBarActivityIconClick();
    });
    this.shadowRoot.getElementById('privMsgUnreadExistIconId').addEventListener('click', () => {
      document.getElementById('managePmPanels').handleHeaderBarActivityIconClick();
    });
    this.shadowRoot.getElementById('noticeUnreadExistIconId').addEventListener('click', () => {
      document.getElementById('noticePanel').showPanel();
    });
    this.shadowRoot.getElementById('wallopsUnreadExistIconId').addEventListener('click', () => {
      document.getElementById('wallopsPanel').showPanel();
    });

    this.shadowRoot.getElementById('collapseAllButtonId').addEventListener('click', () => {
      // allow toggle between collapse all panels, and hide all panels for 3 seconds
      // then revert to collapse all panels on future click as default.
      this.collapseAllTimeout = 3;
      document.dispatchEvent(new CustomEvent('cancel-zoom'));
      if (this.collapseAllToggle === 0) {
        this.collapseAllToggle = 1;
        document.dispatchEvent(new CustomEvent('collapse-all-panels'));
      } else {
        this.collapseAllToggle = 0;
        document.dispatchEvent(new CustomEvent('hide-all-panels'));
      }
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
      const serverUnreadExistIconEl = this.shadowRoot.getElementById('serverUnreadExistIconId');
      const channelUnreadExistIconEl = this.shadowRoot.getElementById('channelUnreadExistIconId');
      const privMsgUnreadExistIconEl = this.shadowRoot.getElementById('privMsgUnreadExistIconId');
      const noticeUnreadExistIconEl = this.shadowRoot.getElementById('noticeUnreadExistIconId');
      const wallopsUnreadExistIconEl = this.shadowRoot.getElementById('wallopsUnreadExistIconId');
      const nickRecovIconEl = this.shadowRoot.getElementById('nickRecovIconId');
      if (event.detail.theme === 'light') {
        hamburgerIconEl.setColorTheme('light');
        headerBarDivEl.classList.remove('header-bar-theme-dark');
        headerBarDivEl.classList.add('header-bar-theme-light');
        serverUnreadExistIconEl.classList.remove('irc-server-panel-theme-dark');
        serverUnreadExistIconEl.classList.add('irc-server-panel-theme-light');
        channelUnreadExistIconEl.classList.remove('channel-panel-theme-dark');
        channelUnreadExistIconEl.classList.add('channel-panel-theme-light');
        privMsgUnreadExistIconEl.classList.remove('pm-panel-theme-dark');
        privMsgUnreadExistIconEl.classList.add('pm-panel-theme-light');
        noticeUnreadExistIconEl.classList.remove('notice-panel-theme-dark');
        noticeUnreadExistIconEl.classList.add('notice-panel-theme-light');
        wallopsUnreadExistIconEl.classList.remove('wallops-panel-theme-dark');
        wallopsUnreadExistIconEl.classList.add('wallops-panel-theme-light');
        nickRecovIconEl.classList.remove('hbar-recovery-theme-dark');
        nickRecovIconEl.classList.add('hbar-recovery-theme-light');
      } else {
        hamburgerIconEl.setColorTheme('dark');
        headerBarDivEl.classList.remove('header-bar-theme-light');
        headerBarDivEl.classList.add('header-bar-theme-dark');
        serverUnreadExistIconEl.classList.remove('irc-server-panel-theme-light');
        serverUnreadExistIconEl.classList.add('irc-server-panel-theme-dark');
        privMsgUnreadExistIconEl.classList.remove('pm-panel-theme-light');
        privMsgUnreadExistIconEl.classList.add('pm-panel-theme-dark');
        noticeUnreadExistIconEl.classList.remove('notice-panel-theme-light');
        noticeUnreadExistIconEl.classList.add('notice-panel-theme-dark');
        wallopsUnreadExistIconEl.classList.remove('wallops-panel-theme-light');
        wallopsUnreadExistIconEl.classList.add('wallops-panel-theme-dark');
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
      if ((window.globals.webState.dynamic.panelPxWidth > 500) &&
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
        this.setAttribute('channelicon', '');
      } else {
        this.removeAttribute('channelicon');
      }
    });

    document.addEventListener('update-privmsg-count', (event) => {
      let totalCount = 0;
      const privmsgElements = document.getElementById('pmContainerId');
      const privmsgEls = Array.from(privmsgElements.children);
      privmsgEls.forEach((pmEl) => {
        totalCount += pmEl.unreadMessageCount;
      });
      if (totalCount > 0) {
        this.setAttribute('privmsgicon', '');
      } else {
        this.removeAttribute('privmsgicon');
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
