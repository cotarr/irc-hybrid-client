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
//    This web component is a UI panel to manage IRC channels
//
// ------------------------------------------------------------------------------
//  Detect when new IRC channels are JOINed and create new channel panel.
//  by instantiating instance of channel-panel.
//
// Global Event listeners
//   cancel-beep-enable
//   collapse-all-panels
//   color-theme-changed
//   erase-before-reload
//   hide-all-panels
//   irc-state-changed
//   show-all-panels
//   update-channel-count
//   web-connect-changed
//
// Dispatched Events
//   cancel-zoom
//
//  Public methods
//    showPanel()
//    collapsePanel()
//    hidePanel()
//    handleHotKey()
//    handleHotKeyNextChannel()
//    handleHeaderBarActivityIconClick()
//    displayChannelMessage(parsedMessage)   Open panel if needed, route messages to channel panels
//    displayChannelNoticeMessage(ParsedMessage)  Notices to channel
//
// ------------------------------------------------------------------------------
//
// Panel Visibility
//    HTML template - hidden by default, flag ircFirstConnect set to false by default
//
// Any getIrcState() response with ircState.ircConnected, check ircFirstConnect flag
//   if (ircFirstConnect === true) and (webState.ircConnected)
//      Check if an IRC auto-reconnect is in progress
//      if not, then then show manage-channels-panel, clear flags
//
// The dropdown menu and hotkey Alt-P will open panel.
//
// Events;
//   ircState.ircConnected true to false:  set flag ircFirstConnect=true
//   webState.webConnected true to false:  set flag ircFirstConnect=true
//
// Scroll:
//   Panel scrolls to bottom on open.
//   Upon becoming visible for first time, a delay timer handles the scroll
//       This is to allow irc-server-panel to display MOTD above the channel connect panel
//       (see comments at showPanel(), and setTimeout() below)
//
// ------------------------------------------------------------------------------
'use strict';
window.customElements.define('manage-channels-panel', class extends HTMLElement {
  constructor () {
    super();
    const template = document.getElementById('manageChannelsPanelTemplate');
    const templateContent = template.content;
    this.attachShadow({ mode: 'open' })
      .appendChild(templateContent.cloneNode(true));
    this.hotKeyCycleIndex = 0;
    this.lastJoinedChannelCount = -1;
    this.lastChannelListCount = -1;
    this.lastIrcServerIndex = -1;
    this.ircConnectedLast = false;
    this.ircFirstConnect = true;
    this.ircReconnectActivatedFlag = false;
    this.ircChannelsPendingJoin = [];
  }

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
    this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible', '');
    this.shadowRoot.getElementById('panelCollapsedDivId').setAttribute('visible', '');
    document.dispatchEvent(new CustomEvent('cancel-zoom'));
    this._scrollToTop();
  };

  /**
   * Collapse panel to bar (both internal and external function)
   */
  collapsePanel = () => {
    if (window.globals.ircState.channels.length === 0) {
      this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible', '');
      this.shadowRoot.getElementById('panelCollapsedDivId').removeAttribute('visible');
    } else {
      this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible');
      this.shadowRoot.getElementById('panelCollapsedDivId').removeAttribute('visible');
    }
  };

  /**
   * Hide this panel (both internal and external function)
   */
  hidePanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible');
    this.shadowRoot.getElementById('panelCollapsedDivId').removeAttribute('visible');
  };

  /**
   * Handle keydown event to show/hide panel, called from local-command-parser.
   */
  handleHotKey = () => {
    if (this.shadowRoot.getElementById('panelVisibilityDivId').hasAttribute('visible')) {
      // Relay function call to child PM panels
      const panelEls = Array.from(document.getElementById('channelsContainerId').children);
      panelEls.forEach((panelEl) => {
        panelEl.hidePanel();
      });
      this.hidePanel();
    } else {
      // Relay function call to child PM panels
      const panelEls = Array.from(document.getElementById('channelsContainerId').children);
      panelEls.forEach((panelEl) => {
        panelEl.collapsePanel();
      });
      this.showPanel();
    }
  };

  /**
   * Handle keydown event to cycle to next IRC channel
   */
  handleHotKeyNextChannel = () => {
    if (!window.globals.ircState.ircConnected) return;
    if (!window.globals.webState.webConnected) return;
    if (window.globals.ircState.channels.length === 0) return;
    // Else multiple channel panels, cycle in sequence
    this.hotKeyCycleIndex += 1;
    if (this.hotKeyCycleIndex >= window.globals.ircState.channels.length) {
      this.hotKeyCycleIndex = 0;
    }
    const channelPanelId =
      'channel:' + window.globals.ircState.channels[this.hotKeyCycleIndex];
    const panelEls = Array.from(document.getElementById('channelsContainerId').children);
    panelEls.forEach((panelEl) => {
      if (panelEl.id.toLowerCase() === channelPanelId) {
        panelEl.showPanel();
        // special case if already open
        panelEl._scrollToTop();
      } else {
        panelEl.hidePanel();
      }
    });
    // hide the manage-channels-panel when viewing cycled channels
    this.hidePanel();
  };

  /**
   * Open one channel panel each time called when UnreadMessageCount is greater than 0
   * This is called from the header bar unread message activity icon click event
   */
  handleHeaderBarActivityIconClick = () => {
    const panelEls = Array.from(document.getElementById('channelsContainerId').children);
    let once = true;
    panelEls.forEach((panelEl) => {
      if ((once) && (panelEl.unreadMessageCount > 0)) {
        once = false;
        panelEl.showAndScrollPanel();
      }
    });
  };

  /**
   * Accept IRC PRIVMSG channel message, parse for creation of new IRC channel,
   * and if needed create channel-panel element and insert to DOM.
   * If channel already exists, forward message to that channel web component.
   * @param {Object} parsedMessage - Object containing IRC message
   */
  displayChannelMessage = (parsedMessage) => {
    if (!('command' in parsedMessage)) {
      console.log('Expected command property not found in manage-channels-panel');
      return;
    }
    // console.log('manageChannelsPanel', JSON.stringify(parsedMessage, null, 2));
    const channelElements =
      Array.from(document.getElementById('channelsContainerId').children);

    // Case of IRC messages relevant to a channel, but channel name is not in message
    const channelNone = [
      'NICK',
      'QUIT'
    ];

    // Case of IRC message with channel name as first params (params[0])
    const channelFirst = [
      'KICK',
      'JOIN',
      'MODE',
      'cachedNICK',
      'NOTICE',
      'PART',
      'PRIVMSG',
      'TOPIC',
      'cachedQUIT'
    ];

    // Case of IRC message with channel name as second params (params[1])
    const channelSecond = [
      '324', // Channel mode list RPL_CHANNELMODEIS
      '329', // Channel creation time RPL_CREATIONTIME
      '367', // Channel ban list item RPL_BANLIST
      '368' // 368 End of channel ban list RPL_ENDOFBANLIST
    ];
    if (channelNone.indexOf(parsedMessage.command) >= 0) {
      //
      // Case of IRC messages relevant to a channel, but channel name is not in message
      //
      channelElements.forEach((el) => {
        el.displayChannelMessage(parsedMessage);
      });
    } else if (channelFirst.indexOf(parsedMessage.command) >= 0) {
      //
      // Case of IRC message with channel name as first params (params[0])
      //
      channelElements.forEach((el) => {
        if (('params' in parsedMessage) && (parsedMessage.params.length > 0) &&
          ('channelName' in el) &&
          (parsedMessage.params[0].toLowerCase() === el.channelName.toLowerCase())) {
          el.displayChannelMessage(parsedMessage);
        }
      });
    } else if (channelSecond.indexOf(parsedMessage.command) >= 0) {
      //
      // Case of IRC message with channel name as second params (params[1])
      //
      channelElements.forEach((el) => {
        if (('params' in parsedMessage) && (parsedMessage.params.length > 1) &&
          ('channelName' in el) &&
          (parsedMessage.params[1].toLowerCase() === el.channelName.toLowerCase())) {
          el.displayChannelMessage(parsedMessage);
        }
      });
    } else {
      console.log('Error, manage-channels-panel can not route unmatched message\n',
        JSON.stringify(parsedMessage, null, 2));
    }
  }; // displayChannelMessage()

  /**
   * Accept IRC NOTICE notice message and forward message to that channel web component.
   * @param {Object} parsedMessage - Object containing IRC message
   */
  displayChannelNoticeMessage = (parsedMessage) => {
    // console.log(JSON.stringify(parsedMessage));

    // Ignore if called with other commands (Left from version v0.2.53)
    if (parsedMessage.command !== 'NOTICE') return;

    // Ignore if called for CTCP message
    const ctcpDelim = 1;
    if (((parsedMessage.params.length === 2) &&
      (parsedMessage.params[1].charCodeAt(0) === ctcpDelim)) ||
      ((parsedMessage.params.length === 3) &&
      (parsedMessage.params[2].charCodeAt(0) === ctcpDelim))) {
      return;
    }

    if ((parsedMessage.params[0] !== window.globals.ircState.nickName) &&
      (window.globals.ircState.channels.indexOf(parsedMessage.params[0].toLowerCase()) >= 0)) {
      // case of notice to #channel
      const channelElements =
        Array.from(document.getElementById('channelsContainerId').children);
      channelElements.forEach((el) => {
        if (('params' in parsedMessage) &&
          ('channelName' in el) &&
          (parsedMessage.params[0].toLowerCase() === el.channelName.toLowerCase())) {
          el.displayChannelMessage(parsedMessage);
        }
      });
    }
  }; // displayChannelNoticeMessage()

  /**
   * Send /JOIN message to IRC server in response to user input
   */
  _joinNewChannel = () => {
    const newChannel = this.shadowRoot.getElementById('newChannelNameInputId').value;
    this.shadowRoot.getElementById('newChannelNameInputId').value = '';
    if ((newChannel.length > 1) &&
      (document.getElementById('globVars').constants('channelPrefixChars')
        .indexOf(newChannel.charAt(0)) >= 0)) {
      const message = 'JOIN ' + newChannel;
      document.getElementById('ircControlsPanel').sendIrcServerMessage(message);
      // After the server adds the channel to the ircState.channels array,
      // The channel panel will be created automatically in manageChannelsPanel.
      // This array is to identify the IRC server as freshly created
      // as opposed to one that already exists during a browser page reload.
      this.ircChannelsPendingJoin.push(newChannel.toLowerCase());
    } else {
      document.getElementById('errorPanel').showError('Invalid Channel Name');
    }
  }; // _joinNewChannel()

  /**
   * Instantiate new channel panel and insert into the DOM
   * @param {string} newChannelName - Name of new IRC #channel
   */
  _createChannelElement = (newChannelName) => {
    if (window.globals.webState.channels.indexOf(newChannelName) < 0) {
      const channelsContainerEl = document.getElementById('channelsContainerId');
      const newChannelEl = document.createElement('channel-panel');
      // as ID, prefix "channel:" (lower Case)
      newChannelEl.id = 'channel:' + newChannelName.toLowerCase();
      // as property (Lower Case)
      newChannelEl.channelName = newChannelName.toLowerCase();
      // as attribute (Case sensitive)
      newChannelEl.channelCsName = newChannelName;
      // as attribute (Lower case)
      newChannelEl.setAttribute('channel-name', newChannelName.toLowerCase());
      // as attribute (Case sensitive)
      newChannelEl.setAttribute('channel-cs-name', newChannelName);
      channelsContainerEl.appendChild(newChannelEl);
      newChannelEl.initializePlugin();
    } else {
      throw new Error('Attempt to create channel that already exists');
    }
  }; // _createChannelElement

  /**
   * Event handler for button click to open new IRC channel
   * Extract the channel name from button textContent
   * Build /JOIN message and send to IRC server.
   * @param {Object} event.target.id - Id of button element
   */
  _handleChannelButtonClick = (event) => {
    const channelName = this.shadowRoot.getElementById(event.target.id).textContent;
    if (channelName.length > 0) {
      // TODO validate name channel prefix chars
      document.getElementById('ircControlsPanel').sendIrcServerMessage('JOIN ' + channelName);
      // After the server adds the channel to the ircState.channels array,
      // The channel panel will be created automatically in manageChannelsPanel.
      // This array is to identify the IRC server as freshly created
      // as opposed to one that already exists during a browser page reload.
      this.ircChannelsPendingJoin.push(channelName.toLowerCase());
    }
  };

  /**
   * Internal function to set checkboxes attribute values
   */
  _updateVisibility = () => {
    const beep1CheckBoxEl = this.shadowRoot.getElementById('beep1CheckBoxId');
    const beep2CheckBoxEl = this.shadowRoot.getElementById('beep2CheckBoxId');
    const beep3CheckBoxEl = this.shadowRoot.getElementById('beep3CheckBoxId');

    if (this.hasAttribute('beep1-enabled')) {
      beep1CheckBoxEl.checked = true;
    } else {
      beep1CheckBoxEl.checked = false;
    }
    if (this.hasAttribute('beep2-enabled')) {
      beep2CheckBoxEl.checked = true;
    } else {
      beep2CheckBoxEl.checked = false;
    }
    if (this.hasAttribute('beep3-enabled')) {
      beep3CheckBoxEl.checked = true;
    } else {
      beep3CheckBoxEl.checked = false;
    }

    const autoOpenOnMessageCheckBoxEl =
      this.shadowRoot.getElementById('autoOpenOnMessageCheckBoxId');
    const autoOpenOnJoinCheckBoxEl =
      this.shadowRoot.getElementById('autoOpenOnJoinCheckBoxId');
    const autoOpenOnModeCheckBoxEl =
      this.shadowRoot.getElementById('autoOpenOnModeCheckBoxId');

    // Enabled = NOT disabled, inverted
    if (this.hasAttribute('disable-open-on-message')) {
      autoOpenOnMessageCheckBoxEl.checked = false;
    } else {
      autoOpenOnMessageCheckBoxEl.checked = true;
    }
    if (this.hasAttribute('disable-open-on-join')) {
      autoOpenOnJoinCheckBoxEl.checked = false;
    } else {
      autoOpenOnJoinCheckBoxEl.checked = true;
    }
    if (this.hasAttribute('disable-open-on-mode')) {
      autoOpenOnModeCheckBoxEl.checked = false;
    } else {
      autoOpenOnModeCheckBoxEl.checked = true;
    }
  };

  /**
   * Function to update window.localStorage with IRC
   * channel beep enabled checkbox state.
   * Called when checkbox is clicked to enable/disable
   */
  _saveBeepEnableToLocalStorage = () => {
    // new object for channel beep enable status
    const now = Math.floor(Date.now() / 1000);
    const defaultChannelBeepsObj = {
      timestamp: now,
      beep1: this.hasAttribute('beep1-enabled'),
      beep2: this.hasAttribute('beep2-enabled'),
      beep3: this.hasAttribute('beep3-enabled')
    };
    window.localStorage.setItem('defaultChannelBeepEnable', JSON.stringify(defaultChannelBeepsObj));
  }; // _saveBeepEnableToLocalStorage()

  /**
   * Load web browser local storage default beep enable state.
   */
  _loadBeepEnableFromLocalStorage = () => {
    let defaultChannelBeepsObj = null;
    try {
      defaultChannelBeepsObj = JSON.parse(window.localStorage.getItem('defaultChannelBeepEnable'));
    } catch (error) {
      // Ignore errors
      // console.log(error);
    }
    if (defaultChannelBeepsObj) {
      if (defaultChannelBeepsObj.beep1) {
        this.setAttribute('beep1-enabled', '');
      } else {
        this.removeAttribute('beep1-enabled');
      }
      if (defaultChannelBeepsObj.beep2) {
        this.setAttribute('beep2-enabled', '');
      } else {
        this.removeAttribute('beep2-enabled');
      }
      if (defaultChannelBeepsObj.beep3) {
        this.setAttribute('beep3-enabled', '');
      } else {
        this.removeAttribute('beep3-enabled');
      }
      this._updateVisibility();
    }
  }; // _loadBeepEnableFromLocalStorage()

  /**
   * Function to update window.localStorage with IRC
   * channel inhibit auto-open panel on events.
   * Called when checkbox is clicked to enable/disable
   */
  _saveAutoOpenToLocalStorage = () => {
    // new object for channel beep enable status
    const now = Math.floor(Date.now() / 1000);
    const defaultChannelAutoOpenObj = {
      timestamp: now,
      disableOnMessage: this.hasAttribute('disable-open-on-message'),
      disableOnJoin: this.hasAttribute('disable-open-on-join'),
      disableOnMode: this.hasAttribute('disable-open-on-mode')
    };
    window.localStorage.setItem('defaultChannelAutoOpenOn',
      JSON.stringify(defaultChannelAutoOpenObj));
  }; // _saveAutoOpenToLocalStorage()

  /**
   * Load web browser default local storage auto-open panel on events.
   */
  _loadAutoOpenFromLocalStorage = () => {
    let defaultChannelAutoOpenObj = null;
    try {
      defaultChannelAutoOpenObj =
        JSON.parse(window.localStorage.getItem('defaultChannelAutoOpenOn'));
    } catch (error) {
      // Ignore errors
      // console.log(error);
    }
    if (defaultChannelAutoOpenObj) {
      if (defaultChannelAutoOpenObj.disableOnMessage) {
        this.setAttribute('disable-open-on-message', '');
      } else {
        this.removeAttribute('disable-open-on-message');
      }
      if (defaultChannelAutoOpenObj.disableOnJoin) {
        this.setAttribute('disable-open-on-join', '');
      } else {
        this.removeAttribute('disable-open-on-join');
      }
      if (defaultChannelAutoOpenObj.disableOnMode) {
        this.setAttribute('disable-open-on-mode', '');
      } else {
        this.removeAttribute('disable-open-on-mode');
      }
    }
    // else ...
    //    No configuration, default is enabled (Not disabled)
    //    The disabled attributes are not added to channel element
    this._updateVisibility();
  }; // _loadAutoOpenFromLocalStorage()

  /**
   * Add "title" attribute for mouse hover tool-tips.
   */
  _setFixedElementTitles = () => {
    this.shadowRoot.getElementById('activeChannelCountIconId').title =
      'Count of the number of active IRC channel panels';
    this.shadowRoot.getElementById('channelUnreadCountIconId').title =
      'Count of the total number unread channel messages';
    this.shadowRoot.getElementById('newChannelNameInputId').title =
      'Channel name input area';
    this.shadowRoot.getElementById('newChannelButtonId').title =
      'Create new IRC channel panel using entered channel name';
    this.shadowRoot.getElementById('beep1CheckBoxId').title =
      'When checked, open new channel panels with audio beep enabled';
    this.shadowRoot.getElementById('beep2CheckBoxId').title =
      'When checked, open new channel panels with audio beep enabled';
    this.shadowRoot.getElementById('beep3CheckBoxId').title =
      'When checked, open new channel panels with audio beep enabled';
    this.shadowRoot.getElementById('autoOpenOnJoinCheckBoxId').title =
      'Enable auto-open of hidden channel panel when new nickname enters';
    this.shadowRoot.getElementById('autoOpenOnModeCheckBoxId').title =
      'Enable auto-open of hidden channel panel for channel mode changes';
    this.shadowRoot.getElementById('autoOpenOnMessageCheckBoxId').title =
      'Enable auto-open of hidden channel panel for channel messages';
  };

  /**
   * Called once per second as task scheduler, called from js/_afterLoad.js
   */
  timerTickHandler = () => {
    const channelsElements = document.getElementById('channelsContainerId');
    const channelEls = Array.from(channelsElements.children);
    channelEls.forEach((chanEl) => {
      chanEl.timerTickHandler();
    });
  };

  // ------------------
  // Main entry point
  // ------------------
  initializePlugin = () => {
    // Load beep sound configuration from local storage
    this._loadBeepEnableFromLocalStorage();
    this._loadAutoOpenFromLocalStorage();
    this._setFixedElementTitles();
  }; // initializePlugin()

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

    this.shadowRoot.getElementById('newChannelButtonId').addEventListener('click', () => {
      this._joinNewChannel();
    });

    this.shadowRoot.getElementById('newChannelNameInputId')
      .addEventListener('input', (event) => {
        if (((event.inputType === 'insertText') && (event.data === null)) ||
          (event.inputType === 'insertLineBreak')) {
          this._joinNewChannel();
        }
      });

    /**
     * Enable or disable audile beep sounds when checkbox is clicked
     */
    this.shadowRoot.getElementById('beep1CheckBoxId').addEventListener('click', () => {
      if (this.hasAttribute('beep1-enabled')) {
        this.removeAttribute('beep1-enabled');
      } else {
        this.setAttribute('beep1-enabled', '');
        document.getElementById('beepSounds').playBeep1Sound();
      }
      this._saveBeepEnableToLocalStorage();
      this._updateVisibility();
    });

    this.shadowRoot.getElementById('beep2CheckBoxId').addEventListener('click', () => {
      if (this.hasAttribute('beep2-enabled')) {
        this.removeAttribute('beep2-enabled');
      } else {
        this.setAttribute('beep2-enabled', '');
        document.getElementById('beepSounds').playBeep2Sound();
      }
      this._saveBeepEnableToLocalStorage();
      this._updateVisibility();
    });

    this.shadowRoot.getElementById('beep3CheckBoxId').addEventListener('click', () => {
      if (this.hasAttribute('beep3-enabled')) {
        this.removeAttribute('beep3-enabled');
      } else {
        this.setAttribute('beep3-enabled', '');
        document.getElementById('beepSounds').playBeep3Sound();
      }
      this._saveBeepEnableToLocalStorage();
      this._updateVisibility();
    });

    /**
     * Toggle auto open channel panel on events
     */
    this.shadowRoot.getElementById('autoOpenOnMessageCheckBoxId').addEventListener('click', () => {
      if (this.hasAttribute('disable-open-on-message')) {
        this.removeAttribute('disable-open-on-message');
      } else {
        this.setAttribute('disable-open-on-message', '');
      }
      this._saveAutoOpenToLocalStorage();
      this._updateVisibility();
    });
    this.shadowRoot.getElementById('autoOpenOnJoinCheckBoxId').addEventListener('click', () => {
      if (this.hasAttribute('disable-open-on-join')) {
        this.removeAttribute('disable-open-on-join');
      } else {
        this.setAttribute('disable-open-on-join', '');
      }
      this._saveAutoOpenToLocalStorage();
      this._updateVisibility();
    });
    this.shadowRoot.getElementById('autoOpenOnModeCheckBoxId').addEventListener('click', () => {
      if (this.hasAttribute('disable-open-on-mode')) {
        this.removeAttribute('disable-open-on-mode');
      } else {
        this.setAttribute('disable-open-on-mode', '');
      }
      this._saveAutoOpenToLocalStorage();
      this._updateVisibility();
    });

    // -------------------------------------
    // 2 of 2 Listeners on global events
    // -------------------------------------

    /**
     * Event handler to cancel (remove checkbox check) for audio beeps
     */
    document.addEventListener('cancel-beep-sounds', () => {
      this.removeAttribute('beep1-enabled');
      this.removeAttribute('beep2-enabled');
      this.removeAttribute('beep3-enabled');
    });

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
      const activeChannelCountIconEl = this.shadowRoot.getElementById('activeChannelCountIconId');
      const channelUnreadCountIconEl = this.shadowRoot.getElementById('channelUnreadCountIconId');
      const newChannelNameInputEl = this.shadowRoot.getElementById('newChannelNameInputId');
      if (event.detail.theme === 'light') {
        panelDivEl.classList.remove('channel-panel-theme-dark');
        panelDivEl.classList.add('channel-panel-theme-light');
        activeChannelCountIconEl.classList.remove('global-border-theme-dark');
        activeChannelCountIconEl.classList.add('global-border-theme-light');
        channelUnreadCountIconEl.classList.remove('global-border-theme-dark');
        channelUnreadCountIconEl.classList.add('global-border-theme-light');
        newChannelNameInputEl.classList.remove('global-text-theme-dark');
        newChannelNameInputEl.classList.add('global-text-theme-light');
      } else {
        panelDivEl.classList.remove('channel-panel-theme-light');
        panelDivEl.classList.add('channel-panel-theme-dark');
        activeChannelCountIconEl.classList.remove('global-border-theme-light');
        activeChannelCountIconEl.classList.add('global-border-theme-dark');
        channelUnreadCountIconEl.classList.remove('global-border-theme-light');
        channelUnreadCountIconEl.classList.add('global-border-theme-dark');
        newChannelNameInputEl.classList.remove('global-text-theme-light');
        newChannelNameInputEl.classList.add('global-text-theme-dark');
      }
    });

    /**
     * Global event listener on document object used during cache reload
     * Action: erase all internal date prior to cache reload
     */
    document.addEventListener('erase-before-reload', () => {
      this.shadowRoot.getElementById('newChannelNameInputId').value = '';

      this.shadowRoot.getElementById('channelUnreadCountIconId').textContent = '0';
      this.shadowRoot.getElementById('channelUnreadCountIconId').setAttribute('hidden', '');
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
     * Global event listener on document object to detect state change of remote IRC server
     * Detect addition of new IRC channels and create channel panel.
     * Data source: ircState object
     * @listens document:irc-state-changed
     */
    document.addEventListener('irc-state-changed', () => {
      // console.log('Event irc-state-changed - global - checking for channel updates');

      // console.log('ircState: ',
      //   window.globals.ircState.ircConnectOn,
      //   window.globals.ircState.ircConnected,
      //   window.globals.ircState.ircConnecting,
      //   window.globals.ircState.ircAutoReconnect,
      //   window.globals.ircState.channels.length,
      //   this.ircReconnectActivatedFlag);

      // console.log(JSON.stringify(window.globals.ircState.channels));
      // console.log(JSON.stringify(window.globals.webState.channels));

      if (window.globals.ircState.ircConnected) {
        if (this.ircFirstConnect) {
          this.ircFirstConnect = false;
          // If  channels exist, leave panel hidden, else...
          if (window.globals.ircState.channels.length === 0) {
            if (this.ircReconnectActivatedFlag) {
              // case of reconnect with previous channels
              this.ircReconnectActivatedFlag = false;
              // As channels create themselves after disconnect,
              // this instruct them to open collapsed, instead of full panel
              setTimeout(() => {
                // TODO optimize time
              }, 5000);
            } else {
              this.showPanel();
              // ----------------------------
              // Special case, using timer (work around)
              //
              // When connecting to IRC server for the first time
              // both the ircServerPanel and the manageChannelsPanel
              // will be visible.
              //
              // The goal is to show some of the IRC server MOTD at the top
              // with the channel JOIN panel at the bottom.
              //
              // The issue is multiple cache reloads trying to scroll the screen.
              //
              // Wait for double cache reload to complete using timer
              // Then calculate vertical offset such that the
              // bottom of the panel will align at the bottom of the viewport.
              // Set timer then scroll so panel is at bottom of page view area.
              //
              // TODO optimize the time value experimentally
              //
              // ------------------------------
              setTimeout(() => {
                this._scrollToTop();
              }, 750);
            } // reconnect flag
          } // no channels
        } // first connect

        // Case of special state, reconnect active
        // Wait icon would be displayed.
        if ((window.globals.ircState.ircAutoReconnect) &&
        (window.globals.ircState.ircConnectOn) &&
        (window.globals.ircState.ircConnected) &&
        (!window.globals.ircState.ircConnecting) &&
        (window.globals.ircState.channels.length > 0)) {
          this.ircReconnectActivatedFlag = true;
        }
      } else {
        // case of IRC not connected.
        this.ircFirstConnect = true;
      } // not connected
      // Case of both connected and not connected
      if ((!window.globals.ircState.ircAutoReconnect) ||
        (!window.globals.ircState.ircConnectOn)) {
        this.ircReconnectActivatedFlag = false;
      }

      //
      // Detect IRC disconnect
      if (window.globals.ircState.ircConnected !== this.ircConnectedLast) {
        this.ircConnectedLast = window.globals.ircState.ircConnected;
        if (!window.globals.ircState.ircConnected) {
          this.hidePanel();
          this.ircChannelsPendingJoin = [];
        }
      }

      // Check list of server's channels and create new if missing.
      if (window.globals.ircState.channels.length > 0) {
        for (let i = 0; i < window.globals.ircState.channels.length; i++) {
          const channelName = window.globals.ircState.channels[i];
          if (window.globals.webState.channels.indexOf(channelName.toLowerCase()) === -1) {
            // get case sensitive channel name
            const channelCsName = window.globals.ircState.channelStates[i].csName;
            // console.log('Creating new channel ' + channelCsName);
            this._createChannelElement(channelCsName);
          }
        };
      }

      // Check if a new channel was added, or old one /PARTed
      // if so re-create channel join buttons from the favorite channel list
      //
      let needButtonUpdate = false;
      let joinedChannelCount = 0;
      if (window.globals.ircState.channels.length > 0) {
        for (let i = 0; i < window.globals.ircState.channels.length; i++) {
          if (window.globals.ircState.channelStates[i].joined) joinedChannelCount++;
        }
      }
      if (joinedChannelCount !== this.lastJoinedChannelCount) {
        this.lastJoinedChannelCount = joinedChannelCount;
        needButtonUpdate = true;
      }
      if (window.globals.ircState.channelList.length !== this.lastChannelListCount) {
        this.lastChannelListCount = window.globals.ircState.channelList.length;
        needButtonUpdate = true;
      }

      if (window.globals.ircState.ircServerIndex !== this.lastIrcServerIndex) {
        this.lastIrcServerIndex = window.globals.ircState.ircServerIndex;
        needButtonUpdate = true;
      }

      if (window.globals.webState.ircServerModified) {
        window.globals.webState.ircServerModified = false;
        needButtonUpdate = true;
      }

      // Update count of channels in channel menu window
      this.shadowRoot.getElementById('activeChannelCountIconId').textContent =
        joinedChannelCount.toString();

      // In the case of the number of joined channels has changed,
      // remove all channel buttons, then create them,
      // skipping any that are currently open.
      if (needButtonUpdate) {
        // console.log('Updating favorite channel buttons');
        // remove old button elements and associated event listeners
        const channelJoinButtonContainerEl =
          this.shadowRoot.getElementById('channelJoinButtonContainerId');
        while (channelJoinButtonContainerEl.firstChild) {
          channelJoinButtonContainerEl.firstChild
            .removeEventListener('click', this._handleChannelButtonClick);
          channelJoinButtonContainerEl.removeChild(channelJoinButtonContainerEl.firstChild);
        }
        if (window.globals.ircState.channelList.length > 0) {
          for (let i = 0; i < window.globals.ircState.channelList.length; i++) {
            // console.log('channelList[i]', window.globals.ircState.channelList[i]);
            const channelIndex = window.globals.ircState.channels
              .indexOf(window.globals.ircState.channelList[i].toLowerCase());
            if ((channelIndex < 0) ||
              (!window.globals.ircState.channelStates[channelIndex].joined)) {
              // console.log('adding ' + window.globals.ircState.channelList[i]);
              const joinButtonEl = document.createElement('button');
              joinButtonEl.textContent = window.globals.ircState.channelList[i];
              joinButtonEl.setAttribute('title', '/JOIN this preset IRC Channel');
              joinButtonEl.classList.add('mr7');
              joinButtonEl.id = 'joinButton' + i.toString();
              channelJoinButtonContainerEl.appendChild(joinButtonEl);
              joinButtonEl.addEventListener('click', this._handleChannelButtonClick);
            }
          } // next i
        } else {
          const noPresetsWarningDivEl = document.createElement('div');
          noPresetsWarningDivEl.textContent = '(No IRC channel presets defined)';
          channelJoinButtonContainerEl.appendChild(noPresetsWarningDivEl);
        }
      } // needButtonUpdate
    }); // irc-state-changed

    /**
     * Global event listener on document object to customize page layout when browser size changes.
     * Header bar title is visible/hidden depending on page width
     * Data source: webState object
     */
    // document.addEventListener('resize-custom-elements', () => {
    // });

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

    // ---------------------------------------------------------
    // Update unread message count in channel menu window
    //
    // This function will loop through all channel window elements
    // For each element, build a sum of total un-read messages
    // Then update the count displayed in the channel menu widow
    // ---------------------------------------------------------
    document.addEventListener('update-channel-count', (event) => {
      let totalCount = 0;
      const channelsElements = document.getElementById('channelsContainerId');
      const channelEls = Array.from(channelsElements.children);
      channelEls.forEach((chanEl) => {
        totalCount += chanEl.unreadMessageCount;
      });
      this.shadowRoot.getElementById('channelUnreadCountIconId')
        .textContent = totalCount.toString();
      if (totalCount > 0) {
        // This is local icon at parent window to PM section
        this.shadowRoot.getElementById('channelUnreadCountIconId').removeAttribute('hidden');
      } else {
        // This is local icon at parent window to PM section
        this.shadowRoot.getElementById('channelUnreadCountIconId').setAttribute('hidden', '');
      }
    });

    /**
     *
     * @listens document:web-connect-changed
     */
    document.addEventListener('web-connect-changed', () => {
      // Detect change in websocket connected state
      if (window.globals.webState.webConnected !== this.webConnectedLast) {
        this.webConnectedLast = window.globals.webState.webConnected;
        if (!window.globals.webState.webConnected) {
          // reset to have proper display based on ircConnected state
          this.ircFirstConnect = true;
          this.ircChannelsPendingJoin = [];
        }
      }
    });
  } // connectedCallback()
});
