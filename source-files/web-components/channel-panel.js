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
// ------------------------------------------------------------------------------
'use strict';
window.customElements.define('channel-panel', class extends HTMLElement {
  constructor () {
    super();
    const template = document.getElementById('channelPanelTemplate');
    const templateContent = template.content;
    this.attachShadow({ mode: 'open' })
      .appendChild(templateContent.cloneNode(true));
    this.channelName = '';
    this.maxNickLength = 0;
    this.activityIconInhibitTimer = 0;
    this.channelIndex = null;
    this.initIrcStateIndex = null;

    // Default values
    this.mobileBreakpointPx = 600;
    this.defaultHeightInRows = '17';
    this.channelNamesCharWidth = 20;
  }

  // -----------------------------------------------------
  // Increment channel message counter and make visible
  // -----------------------------------------------------
  _updateChannelCount = () => {
    // This is handled at globally in this source file
    // so that all IRC channels can be summed
    document.dispatchEvent(new CustomEvent('update-channel-count', { bubbles: true }));
  };

  // Increment counter, and show count icon if needed
  _incrementMessageCount = () => {
    let count = parseInt(this.shadowRoot.getElementById('messageCount').textContent);
    count++;
    this.shadowRoot.getElementById('messageCount').textContent = count.toString();
    this.shadowRoot.getElementById('messageCount').removeAttribute('hidden');
    this._updateChannelCount();
  };

  // Clear and hide count icon
  _resetMessageCount = () => {
    const count = 0;
    this.shadowRoot.getElementById('messageCount').textContent = count.toString();
    this.shadowRoot.getElementById('messageCount').setAttribute('hidden', '');
    this._updateChannelCount();
  };

  showPanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDiv').setAttribute('visible', '');
    this.shadowRoot.getElementById('panelCollapsedDiv').setAttribute('visible', '');
    this.shadowRoot.getElementById('hideWithCollapse').removeAttribute('hidden');
  };

  collapsePanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDiv').setAttribute('visible', '');
    this.shadowRoot.getElementById('panelCollapsedDiv').removeAttribute('visible');
    this.shadowRoot.getElementById('hideWithCollapse').setAttribute('hidden', '');
  };

  hidePanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDiv').removeAttribute('visible');
    this.shadowRoot.getElementById('panelCollapsedDiv').removeAttribute('visible');
    this.shadowRoot.getElementById('hideWithCollapse').removeAttribute('hidden');
  };

  _handleCloseButton = () => {
    this.hidePanel();
  };

  _handleCollapseButton = () => {
    if (this.shadowRoot.getElementById('panelCollapsedDiv').hasAttribute('visible')) {
      this.collapsePanel();
    } else {
      this.showPanel();
    }
  };

  _handleRefreshButton = () => {
    if (!window.globals.webState.cacheReloadInProgress) {
      // this forces a global update which will refreesh text area
      document.dispatchEvent(new CustomEvent('update-from-cache', { bubbles: true }));
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

  // -------------------------------
  // Clear message activity ICON by clicking on the main
  // -------------------------------
  _handlePanelClick = () => {
    // resetNotActivityIcon();
    console.log('_handlePanelClick');
  };

  // -----------------------------------------------------------
  // Setup textarea elements as dynamically resizable
  // -----------------------------------------------------------
  //
  // Scale values for <textarea> are calculated in webclient10.js
  // and saved globally in the webState object
  //
  _adjustChannelInputToWidowWidth = () => {
    // pixel width mar1 is reserved space on edges of input area at full screen width
    const mar1 = window.globals.webState.dynamic.commonMargin;
    // pixel width mar2 is reserved space on edges of input area with send button added
    const mar2 = window.globals.webState.dynamic.commonMargin + 5 +
      window.globals.webState.dynamic.sendButtonWidthPx;
    // pixel width mar3 is reserved space on edges of input area with channel nickname list on sides

    // get size of nickname list element
    const nicknameListPixelWidth = window.globals.webState.dynamic.inputAreaSideWidthPx +
      (this.channelNamesCharWidth * window.globals.webState.dynamic.inputAreaCharWidthPx);

    // nickname list + right margin.
    const mar3 = window.globals.webState.dynamic.commonMargin + nicknameListPixelWidth + 6;

    if (window.globals.webState.dynamic.bodyClientWidth > this.mobileBreakpointPx) {
      // channelNamesDisplayEl.setAttribute('cols', channelNamesCharWidth.toString());

      this.shadowRoot.getElementById('panelMessageDisplayId')
        .setAttribute('cols', document.getElementById('displayUtils')
          .calcInputAreaColSize(mar3));
      this.shadowRoot.getElementById('panelNickListId').removeAttribute('hidden');
    } else {
      // option to set name list to full with when above text window
      // channelNamesDisplayEl.setAttribute('cols', calcInputAreaColSize(mar1));

      this.shadowRoot.getElementById('panelMessageDisplayId')
        .setAttribute('cols', document.getElementById('displayUtils')
          .calcInputAreaColSize(mar1));
      if (this.shadowRoot.getElementById('panelDivId').hasAttribute('zoom')) {
        this.shadowRoot.getElementById('panelNickListId').setAttribute('hidden', '');
      } else {
        this.shadowRoot.getElementById('panelNickListId').removeAttribute('hidden');
      }
    }
    this.shadowRoot.getElementById('panelMessageInputId')
      .setAttribute('cols', document.getElementById('displayUtils').calcInputAreaColSize(mar2));
  }; // adjustChannelInputToWidowWidth()

  _handleGlobalWindowResize = () => {
    if (window.globals.webState.dynamic.inputAreaCharWidthPx) {
      this._adjustChannelInputToWidowWidth();
    }
  };

  _handleColorThemeChanged = (event) => {
    if (event.detail.theme === 'light') {
      this.shadowRoot.getElementById('panelDivId')
        .classList.remove('channel-panel-theme-dark');
      this.shadowRoot.getElementById('panelDivId')
        .classList.add('channel-panel-theme-light');
      this.shadowRoot.getElementById('nickCount')
        .classList.remove('global-border-theme-dark');
      this.shadowRoot.getElementById('nickCount')
        .classList.add('global-border-theme-light');
      this.shadowRoot.getElementById('messageCount')
        .classList.remove('global-border-theme-dark');
      this.shadowRoot.getElementById('messageCount')
        .classList.add('global-border-theme-light');
      this.shadowRoot.getElementById('panelNickListId')
        .classList.remove('global-text-theme-dark');
      this.shadowRoot.getElementById('panelNickListId')
        .classList.add('global-text-theme-light');
      this.shadowRoot.getElementById('panelMessageDisplayId')
        .classList.remove('global-text-theme-dark');
      this.shadowRoot.getElementById('panelMessageDisplayId')
        .classList.add('global-text-theme-light');
      this.shadowRoot.getElementById('panelMessageInputId')
        .classList.remove('global-text-theme-dark');
      this.shadowRoot.getElementById('panelMessageInputId')
        .classList.add('global-text-theme-light');
    } else {
      this.shadowRoot.getElementById('panelDivId')
        .classList.remove('channel-panel-theme-light');
      this.shadowRoot.getElementById('panelDivId')
        .classList.add('channel-panel-theme-dark');
      this.shadowRoot.getElementById('nickCount')
        .classList.remove('global-border-theme-light');
      this.shadowRoot.getElementById('nickCount')
        .classList.add('global-border-theme-dark');
      this.shadowRoot.getElementById('messageCount')
        .classList.remove('global-border-theme-light');
      this.shadowRoot.getElementById('messageCount')
        .classList.add('global-border-theme-dark');
      this.shadowRoot.getElementById('panelNickListId')
        .classList.remove('global-text-theme-light');
      this.shadowRoot.getElementById('panelNickListId')
        .classList.add('global-text-theme-dark');
      this.shadowRoot.getElementById('panelMessageDisplayId')
        .classList.remove('global-text-theme-light');
      this.shadowRoot.getElementById('panelMessageDisplayId')
        .classList.add('global-text-theme-dark');
      this.shadowRoot.getElementById('panelMessageInputId')
        .classList.remove('global-text-theme-light');
      this.shadowRoot.getElementById('panelMessageInputId')
        .classList.add('global-text-theme-dark');
    }
  };

  //
  // For each channel, handle changes in the ircState object
  //
  _handleIrcStateChanged = () => {
    console.log('channel-panel Event: irc-state-changed changed element: ' + this.channelName);
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
      this.shadowRoot.getElementById('clearButton').removeEventListener('click', this._handleClearButton);
      this.shadowRoot.getElementById('closePanelButton').removeEventListener('click', this._handleCloseButton);
      this.shadowRoot.getElementById('collapsePanelButton').removeEventListener('click', this._handleCollapseButton);
      this.shadowRoot.getElementById('normalButton').removeEventListener('click', this._handleNormalButton);
      this.shadowRoot.getElementById('panelDivId').removeEventListener('click', this._handlePanelClick);
      this.shadowRoot.getElementById('refreshButton').removeEventListener('click', this._handleRefreshButton);
      this.shadowRoot.getElementById('tallerButton').removeEventListener('click', this._handleTallerButton);
      document.removeEventListener('collapse-all-panels', this._handleCollapseAllPanels);
      document.removeEventListener('color-theme-changed', this._handleColorThemeChanged);
      document.removeEventListener('hide-all-panels', this._handleHideAllPanels);
      document.removeEventListener('irc-state-changed', this._handleIrcStateChanged);
      document.removeEventListener('resize-custom-elements', this._handleGlobalWindowResize);
      document.removeEventListener('show-all-panels', this._handleShowAllPanels);
      /* eslint-enable max-len */

      //
      // 3 - Channel panel removes itself from the DOM
      //
      const parentEl = document.getElementById('channelsContainer');
      const childEl = document.getElementById('channel' + this.channelName.toLowerCase());
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
        if (window.globals.ircState.channelStates[ircStateIndex].joined !==
          window.globals.webState.channelStates[webStateIndex].lastJoined) {
          if ((window.globals.ircState.channelStates[ircStateIndex].joined) &&
            (!window.globals.webState.channelStates[webStateIndex].lastJoined)) {
            if (!window.globals.webState.cacheReloadInProgress) {
              this.shadowRoot.getElementById('panelDivId').setAttribute('opened', '');
            }
            // TODO updateVisibility();
            // NO WAS ALREADY COMMENTED channelTopRightHidableDivEl.removeAttribute('hidden');
          }
          window.globals.webState.channelStates[webStateIndex].lastJoined =
            window.globals.ircState.channelStates[ircStateIndex].joined;
        }
      }
      // state object includes up to date list of nicks in a channel
      // _updateNickList();
      // Update title string to include some data
      // _updateChannelTitle();
      // show/hide disable or enable channel elements depend on state
      // updateVisibility();
    } else {
      // console.log('handleIrcStateChanged: Error no options match');
    }
  }; // _handleIrcStateChanged

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
      this.hidePanel();
    }
  };

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

    this.shadowRoot.getElementById('channelNameDiv').textContent =
      window.globals.ircState.channelStates[this.channelIndex].csName;

    this.shadowRoot.getElementById('channelTopicDiv').textContent =
      document.getElementById('displayUtils')
        .cleanFormatting(window.globals.ircState.channelStates[this.channelIndex].topic);

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

    // Upon creating new channel window, open it unzoomed
    this.shadowRoot.getElementById('panelDivId').setAttribute('opened', '');
    this.shadowRoot.getElementById('panelDivId').removeAttribute('zoom');
    // TODO updateVisibility();

    //
    // Resize on creating channel window
    //
    this._adjustChannelInputToWidowWidth();
    //
    // This is a hack. If adding the channel window
    // causes the vertical scroll to appear,
    // Then the dynamic element side of textarea
    // element will not account for vertical slider width
    // Fix...wait 0.1 sec for scroll bar to appear and
    // dynamically size again.
    //
    setTimeout(this._adjustChannelInputToWidowWidth.bind(this), 100);
  }; // initializePlugin

  // -------------------------------------------
  // add event listeners to connected callback
  // -------------------------------------------
  connectedCallback () {
    this.channelName = this.getAttribute('channelName');

    // -------------------------------------
    // 1 of 2 Listeners on internal elements
    // -------------------------------------
    /* eslint-disable max-len */
    this.shadowRoot.getElementById('clearButton').addEventListener('click', this._handleClearButton);
    this.shadowRoot.getElementById('closePanelButton').addEventListener('click', this._handleCloseButton);
    this.shadowRoot.getElementById('collapsePanelButton').addEventListener('click', this._handleCollapseButton);
    this.shadowRoot.getElementById('normalButton').addEventListener('click', this._handleNormalButton);
    this.shadowRoot.getElementById('panelDivId').addEventListener('click', this._handlePanelClick);
    this.shadowRoot.getElementById('refreshButton').addEventListener('click', this._handleRefreshButton);
    this.shadowRoot.getElementById('tallerButton').addEventListener('click', this._handleTallerButton);

    // -------------------------------------
    // 2 of 2 Listeners on global events
    // -------------------------------------
    document.addEventListener('collapse-all-panels', this._handleCollapseAllPanels);
    document.addEventListener('color-theme-changed', this._handleColorThemeChanged);
    document.addEventListener('hide-all-panels', this._handleHideAllPanels);
    document.addEventListener('irc-state-changed', this._handleIrcStateChanged);
    document.addEventListener('resize-custom-elements', this._handleGlobalWindowResize);
    document.addEventListener('show-all-panels', this._handleShowAllPanels);
    /* eslint-enable max-len */
  };
});
