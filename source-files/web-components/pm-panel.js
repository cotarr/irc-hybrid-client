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
  }

  showPanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible', '');
    this.shadowRoot.getElementById('panelCollapsedDivId').setAttribute('visible', '');
    this.shadowRoot.getElementById('hideWithCollapseId').removeAttribute('hidden');
    this.shadowRoot.getElementById('bottomCollapseDivId').setAttribute('hidden', '');
    this._updateVisibility();
  };

  collapsePanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible', '');
    this.shadowRoot.getElementById('panelCollapsedDivId').removeAttribute('visible');
    this.shadowRoot.getElementById('hideWithCollapseId').setAttribute('hidden', '');
    this.shadowRoot.getElementById('bottomCollapseDivId').setAttribute('hidden', '');
    this._updateVisibility();
  };

  hidePanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible');
    this.shadowRoot.getElementById('panelCollapsedDivId').removeAttribute('visible');
    this.shadowRoot.getElementById('hideWithCollapseId').removeAttribute('hidden');
  };

  _updateVisibility = () => {

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

  // -------------------------------
  // Clear message activity ICON by clicking on the main
  // -------------------------------
  _handlePanelClick = () => {
    // this._resetMessageCount();
    console.log('panel click TODO');
  };

  displayPmMessage = (parsedMessage) => {
    console.log('pmPanel parsedMessage:', JSON.stringify(parsedMessage, null, 2));
  }; // displayChannelMessage

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

  // ----------------------------------------------------------------------
  // Internal function to release channel resources if channel is removed
  // ----------------------------------------------------------------------
  _removeSelfFromDOM = () => {
    //
    // 1 - Remove channel name from list of channel active in browser
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
    this.shadowRoot.getElementById('bottomCollapseButtonId').removeEventListener('click', this._handleBottomCollapseButton);
    this.shadowRoot.getElementById('panelDivId').removeEventListener('click', this._handlePanelClick);
    this.shadowRoot.getElementById('closePanelButtonId').removeEventListener('click', this._handleCloseButton);
    this.shadowRoot.getElementById('collapsePanelButtonId').removeEventListener('click', this._handleCollapseButton);

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

  _handleEraseBeforeReload = () => {
    this._removeSelfFromDOM();
  };

  /**
   * For each channel, handle changes in the ircState object
   */
  _handleIrcStateChanged = () => {
    if (!window.globals.ircState.ircConnected) {
      this._removeSelfFromDOM();
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
    this._updateVisibility();

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
    this.shadowRoot.getElementById('bottomCollapseButtonId').addEventListener('click', this._handleBottomCollapseButton);
    this.shadowRoot.getElementById('panelDivId').addEventListener('click', this._handlePanelClick);
    this.shadowRoot.getElementById('closePanelButtonId').addEventListener('click', this._handleCloseButton);
    this.shadowRoot.getElementById('collapsePanelButtonId').removeEventListener('click', this._handleCollapseButton);

    // -------------------------------------
    // 2 of 2 Listeners on global events
    // -------------------------------------
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
