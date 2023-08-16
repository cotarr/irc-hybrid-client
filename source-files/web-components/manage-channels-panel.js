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
// This web component is a UI panel to manage IRC channels
//
//   * Detect when new IRC channels are JOINed and create new channel panel.
//   *    by instantiating instance of channel-panel.
//   * Status icon tool-tip messages
//   * Button to activate main navigation dropdown menu
//   * Clickable connection status, click to connect/disconnect
//   * Button to enable media play if disabled in browser
//   * Initialization code and global event listeners
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
    /* @type {number} previous value used to detect changes */
    this.lastJoinedChannelCount = -1;
    /* @type {number} previous value used to detect changes */
    this.lastChannelListCount = -1;
    /* @type {number} previous value used to detect changes */
    this.lastIrcServerIndex = -1;
  }

  showPanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDiv').setAttribute('visible', '');
    this.shadowRoot.getElementById('panelCollapsedDiv').setAttribute('visible', '');
  };

  collapsePanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDiv').setAttribute('visible', '');
    this.shadowRoot.getElementById('panelCollapsedDiv').removeAttribute('visible');
  };

  hidePanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDiv').removeAttribute('visible');
    this.shadowRoot.getElementById('panelCollapsedDiv').removeAttribute('visible');
  };

  /**
   * Send /JOIN message to IRC server in response to user input
   */
  _joinNewChannel = () => {
    const newChannel = this.shadowRoot.getElementById('newChannelNameInputId').value;
    this.shadowRoot.getElementById('newChannelNameInputId').value = '';
    if ((newChannel.length > 1) &&
      (document.getElementById('globVars').constants('channelPrefixChars')
        .indexOf(newChannel.charAt(0)) >= 0)) {
      // TODO const message = 'JOIN ' + newChannel;
      // TODO _sendIrcServerMessage(message);
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
      const channelsContainerEl = document.getElementById('channelsContainer');
      const newChannelEl = document.createElement('channel-panel');
      newChannelEl.id = 'channel' + newChannelName.toLowerCase();
      newChannelEl.setAttribute('channelName', newChannelName.toLowerCase());
      if (channelsContainerEl.firstChild) {
        channelsContainerEl.insertBefore(
          newChannelEl, channelsContainerEl.firstChild);
      } else {
        channelsContainerEl.appendChild(newChannelEl);
      }
      newChannelEl.initializePlugin();
    } else {
      throw new Error('Attempt to create channel that already exists');
    }
  }; // _createChannelElement

  // Event handler for button click to open new IRC channel
  // windows and /JOIN the channel named on the button.
  _handleChannelButtonClick = (event) => {
    const channelName = this.shadowRoot.getElementById(event.target.id).textContent;
    if (channelName.length > 0) {
      console.log('channelName ' + channelName);
      // TODO _sendIrcServerMessage('JOIN ' + channelName);
    }
  };

  /**
   * Called once per second as task scheduler, called from js/_afterLoad.js
   */
  timerTickHandler = () => {
    const channelsElements = document.getElementById('channelsContainer');
    const channelEls = Array.from(channelsElements.children);
    channelEls.forEach((chanEl) => {
      chanEl.timerTickHandler();
    });
  };

  // ------------------
  // Main entry point
  // ------------------
  // initializePlugin = () => {
  // }; // initializePlugin()

  // add event listeners to connected callback
  // -------------------------------------------
  connectedCallback () {
    // -------------------------------------
    // 1 of 2 Listeners on internal elements
    // -------------------------------------

    this.shadowRoot.getElementById('closePanelButton').addEventListener('click', () => {
      this.hidePanel();
    });

    this.shadowRoot.getElementById('collapsePanelButton').addEventListener('click', () => {
      if (this.shadowRoot.getElementById('panelCollapsedDiv').hasAttribute('visible')) {
        this.collapsePanel();
      } else {
        this.showPanel();
      }
    });

    this.shadowRoot.getElementById('newChannelButton').addEventListener('click', () => {
      this._joinNewChannel();
    });

    this.shadowRoot.getElementById('newChannelNameInputId')
      .addEventListener('input', (event) => {
        if (((event.inputType === 'insertText') && (event.data === null)) ||
          (event.inputType === 'insertLineBreak')) {
          this._joinNewChannel();
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
      if (event.detail.theme === 'light') {
        this.shadowRoot.getElementById('panelDivId')
          .classList.remove('channel-panel-theme-dark');
        this.shadowRoot.getElementById('panelDivId')
          .classList.add('channel-panel-theme-light');
        this.shadowRoot.getElementById('activeChannelCountDiv')
          .classList.remove('global-border-theme-dark');
        this.shadowRoot.getElementById('activeChannelCountDiv')
          .classList.add('global-border-theme-light');
        this.shadowRoot.getElementById('channelUnreadCountDiv')
          .classList.remove('global-border-theme-dark');
        this.shadowRoot.getElementById('channelUnreadCountDiv')
          .classList.add('global-border-theme-light');
        this.shadowRoot.getElementById('newChannelNameInputId')
          .classList.remove('global-text-theme-dark');
        this.shadowRoot.getElementById('newChannelNameInputId')
          .classList.add('global-text-theme-light');
      } else {
        this.shadowRoot.getElementById('panelDivId')
          .classList.remove('channel-panel-theme-light');
        this.shadowRoot.getElementById('panelDivId')
          .classList.add('channel-panel-theme-dark');
        this.shadowRoot.getElementById('activeChannelCountDiv')
          .classList.remove('global-border-theme-light');
        this.shadowRoot.getElementById('activeChannelCountDiv')
          .classList.add('global-border-theme-dark');
        this.shadowRoot.getElementById('channelUnreadCountDiv')
          .classList.remove('global-border-theme-light');
        this.shadowRoot.getElementById('channelUnreadCountDiv')
          .classList.add('global-border-theme-dark');
        this.shadowRoot.getElementById('newChannelNameInputId')
          .classList.remove('global-text-theme-light');
        this.shadowRoot.getElementById('newChannelNameInputId')
          .classList.add('global-text-theme-dark');
      }
    });

    /**
     * Global event listener on document object used during cache reload
     * Action: erase all internal date prior to cache reload
     */
    document.addEventListener('erase-before-reload', () => {
      this.shadowRoot.getElementById('newChannelNameInputId').value = '';

      this.shadowRoot.getElementById('channelUnreadCountDiv').textContent = '0';
      this.shadowRoot.getElementById('channelUnreadCountDiv').setAttribute('hidden', '');
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
      // console.log('connected ', window.globals.ircState.ircConnected);
      // console.log(JSON.stringify(window.globals.ircState.channels));
      // console.log(JSON.stringify(window.globals.webState.channels));

      // Check list of server's channels and create new if missing.
      if (window.globals.ircState.channels.length > 0) {
        for (let i = 0; i < window.globals.ircState.channels.length; i++) {
          const channelName = window.globals.ircState.channels[i];
          if (window.globals.webState.channels.indexOf(channelName.toLowerCase()) === -1) {
            console.log('Creating new channel ' + channelName);
            this._createChannelElement(channelName);
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

      // Update count of channels in channel menu window
      this.shadowRoot.getElementById('activeChannelCountDiv').textContent =
        joinedChannelCount.toString();

      // In the case of the number of joined channels has changed,
      // remove all channel buttons, then create them,
      // skipping any that are currently open.
      if (needButtonUpdate) {
        console.log('Updating favorite channel buttons');
        // remove old button elements and associated event listeners
        const channelJoinButtonContainerEl =
          this.shadowRoot.getElementById('channelJoinButtonContainer');
        while (channelJoinButtonContainerEl.firstChild) {
          channelJoinButtonContainerEl.firstChild
            .removeEventListener('click', this._handleChannelButtonClick);
          channelJoinButtonContainerEl.removeChild(channelJoinButtonContainerEl.firstChild);
        }
        if (window.globals.ircState.channelList.length > 0) {
          for (let i = 0; i < window.globals.ircState.channelList.length; i++) {
            console.log('channelList[i]', window.globals.ircState.channelList[i]);
            const channelIndex = window.globals.ircState.channels
              .indexOf(window.globals.ircState.channelList[i].toLowerCase());
            if ((channelIndex < 0) ||
              (!window.globals.ircState.channelStates[channelIndex].joined)) {
              console.log('adding ' + window.globals.ircState.channelList[i]);
              const joinButtonEl = document.createElement('button');
              joinButtonEl.textContent = window.globals.ircState.channelList[i];
              joinButtonEl.setAttribute('title', 'Join IRC Channel');
              joinButtonEl.classList.add('mr7');
              joinButtonEl.id = 'joinButton' + i.toString();
              channelJoinButtonContainerEl.appendChild(joinButtonEl);
              joinButtonEl.addEventListener('click', this._handleChannelButtonClick);
            }
          } // next i
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

    // // ---------------------------------------------------------
    // // Update unread message count in channel menu window
    // //
    // // This function will loop through all channel window elements
    // // For each element, build a sum of total un-read messages
    // // Then update the count displayed in the channel menu widow
    // // ---------------------------------------------------------
    // document.addEventListener('update-channel-count', (event) => {
    //   let totalCount = 0;
    //   document.querySelectorAll('.channel-count-class').forEach( (el) => {
    //     totalCount += parseInt(el.textContent);
    //   });
    //   document.getElementById('channelUnreadCountDiv').textContent = totalCount.toString();
    //   if (totalCount > 0) {
    //     // This is local icon at parent window to PM section
    //     document.getElementById('channelUnreadCountDiv').removeAttribute('hidden');
    //     // This is global icon at top of main page
    //     document.getElementById('channelUnreadExistIcon').removeAttribute('hidden');
    //   } else {
    //     // This is local icon at parent window to PM section
    //     document.getElementById('channelUnreadCountDiv').setAttribute('hidden', '');
    //     // This is global icon at top of main page
    //     document.getElementById('channelUnreadExistIcon').setAttribute('hidden', '');
    //   }
    // });
  } // connectedCallback()
});
