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
// This web component is a UI panel to display IRC Wallops messages
//
// ------------------------------------------------------------------------------
'use strict';
window.customElements.define('wallops-panel', class extends HTMLElement {
  constructor () {
    super();
    const template = document.getElementById('wallopsPanelTemplate');
    const templateContent = template.content;
    this.attachShadow({ mode: 'open' })
      .appendChild(templateContent.cloneNode(true));
  }

  showPanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible', '');
    // scroll to top
    const panelMessageDisplayEl = this.shadowRoot.getElementById('panelMessageDisplayId');
    panelMessageDisplayEl.scrollTop = panelMessageDisplayEl.scrollHeight;
  };

  // this panel does not collapse, so close it.
  collapsePanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible');
  };

  hidePanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible');
  };

  // -----------------------------------------------------
  // Wallops messages
  // -----------------------------------------------------
  // Wallops (+w) messages are displayed here
  // Note: notice window controls are in another module
  // -----------------------------------------------------
  displayWallopsMessage = (parsedMessage) => {
    const panelDivEl = this.shadowRoot.getElementById('panelDivId');
    const panelMessageDisplayEl = this.shadowRoot.getElementById('panelMessageDisplayId');
    const _addText = (text) => {
      panelMessageDisplayEl.value +=
        document.getElementById('displayUtils').cleanFormatting(text) + '\n';
      if (!window.globals.webState.cacheReloadInProgress) {
        panelMessageDisplayEl.scrollTop = panelMessageDisplayEl.scrollHeight;
      }
    };

    if (!window.globals.webState.cacheReloadInProgress) {
      if ((!('zoomPanelId' in window.globals.webState)) ||
        (window.globals.webState.zoomPanelId.length < 1)) {
        this.showPanel();
      }
    }

    if (panelDivEl.getAttribute('lastDate') !== parsedMessage.datestamp) {
      panelDivEl.setAttribute('lastDate', parsedMessage.datestamp);
      panelMessageDisplayEl.value +=
        '\n=== ' + parsedMessage.datestamp + ' ===\n\n';
    }
    if (('command' in parsedMessage) && (parsedMessage.command === 'WALLOPS')) {
      if (parsedMessage.nick) {
        _addText(parsedMessage.timestamp + ' ' +
          parsedMessage.nick +
          document.getElementById('globVars').constants('nickChannelSpacer') +
          parsedMessage.params[0]);
      } else {
        _addText(parsedMessage.timestamp + ' ' +
          parsedMessage.prefix +
          document.getElementById('globVars').constants('nickChannelSpacer') +
          parsedMessage.params[0]);
      }
    }
  }; // displayWallopsMessage

  // ------------------
  // Main entry point
  // ------------------
  initializePlugin = () => {
    // console.log('wallops-panel initializePlugin');
    // this.shadowRoot.getElementById('panelMessageDisplayId').value =
    //   '12:01:26 MyNickname | This is an example NOTICE message\n';
  };

  // add event listeners to connected callback
  // -------------------------------------------
  connectedCallback () {
    // -------------------------------------
    // 1 of 2 Listeners on internal elements
    // -------------------------------------

    // -------------------------------------
    // Panel Close Button
    // -------------------------------------
    this.shadowRoot.getElementById('closePanelButtonId').addEventListener('click', () => {
      this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible');
    });

    // -------------------------
    // Erase button handler
    // -------------------------
    this.shadowRoot.getElementById('eraseButtonId').addEventListener('click', () => {
      document.getElementById('ircControlsPanel').eraseIrcCache('WALLOPS')
        .catch((err) => {
          console.log(err);
          let message = err.message || err.toString() || 'Error occurred calling /irc/connect';
          // show only 1 line
          message = message.split('\n')[0];
          document.getElementById('errorPanel').showError(message);
        });
    }); // panel erase button

    // -------------------------
    // Taller button handler
    // -------------------------
    this.shadowRoot.getElementById('tallerButtonId').addEventListener('click', () => {
      const newRows =
        parseInt(this.shadowRoot.getElementById('panelMessageDisplayId').getAttribute('rows')) + 5;
      this.shadowRoot.getElementById('panelMessageDisplayId')
        .setAttribute('rows', newRows.toString());
    });

    // -------------------------
    // Normal button handler
    // -------------------------
    this.shadowRoot.getElementById('normalButtonId').addEventListener('click', () => {
      this.shadowRoot.getElementById('panelMessageDisplayId').setAttribute('rows', '5');
    });

    // -------------------------------
    // Clear message activity ICON by clicking on the main
    // -------------------------------
    this.shadowRoot.getElementById('panelDivId').addEventListener('click', function () {
      // resetNotActivityIcon();
    });

    // -------------------------------------
    // 2 of 2 Listeners on global events
    // -------------------------------------

    //
    // Add cache reload message to notice window
    //
    // Example:  14:33:02 -----Cache Reload-----
    //
    document.addEventListener('cache-reload-done', (event) => {
      const panelMessageDisplayEl = this.shadowRoot.getElementById('panelMessageDisplayId');
      const cacheReloadString =
        document.getElementById('globVars').constants('cacheReloadString');
      let markerString = '';
      let timestampString = '';
      if (('detail' in event) && ('timestamp' in event.detail)) {
        timestampString = document.getElementById('displayUtils')
          .unixTimestampToHMS(event.detail.timestamp);
      }
      if (timestampString) {
        markerString += timestampString;
      }
      markerString += ' ' + cacheReloadString + '\n';

      if (panelMessageDisplayEl.value !== '') {
        panelMessageDisplayEl.value += markerString;
        panelMessageDisplayEl.scrollTop =
          panelMessageDisplayEl.scrollHeight;
      }
    });

    document.addEventListener('cache-reload-error', function (event) {
      const cacheErrorString =
        document.getElementById('globVars').constants('cacheErrorString');
      let errorString = '\n';
      let timestampString = '';
      if (('detail' in event) && ('timestamp' in event.detail)) {
        timestampString = document.getElementById('displayUtils')
          .unixTimestampToHMS(event.detail.timestamp);
      }
      if (timestampString) {
        errorString += timestampString;
      }
      errorString += ' ' + cacheErrorString + '\n\n';
      this.shadowRoot.getElementById('panelMessageDisplayId').value = errorString;
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

    document.addEventListener('color-theme-changed', (event) => {
      const panelDivEl = this.shadowRoot.getElementById('panelDivId');
      const panelMessageDisplayEl = this.shadowRoot.getElementById('panelMessageDisplayId');
      if (event.detail.theme === 'light') {
        panelDivEl.classList.remove('wallops-panel-theme-dark');
        panelDivEl.classList.add('wallops-panel-theme-light');
        panelMessageDisplayEl.classList.remove('global-text-theme-dark');
        panelMessageDisplayEl.classList.add('global-text-theme-light');
      } else {
        panelDivEl.classList.remove('wallops-panel-theme-light');
        panelDivEl.classList.add('wallops-panel-theme-dark');
        panelMessageDisplayEl.classList.remove('global-text-theme-light');
        panelMessageDisplayEl.classList.add('global-text-theme-dark');
      }
    });

    //
    // Clear textarea before reloading cache (Notice window)
    //
    document.addEventListener('erase-before-reload', (event) => {
      this.shadowRoot.getElementById('panelMessageDisplayId').value = '';
      this.shadowRoot.getElementById('panelDivId').setAttribute('lastDate', '0000-00-00');
      // TODO this.shadowRoot.getElementById('noticeUnreadExistIcon').setAttribute('hidden', '');
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
      if (window.globals.ircState.ircConnected !== this.ircConnectedLast) {
        this.ircConnectedLast = window.globals.ircState.ircConnected;
        if (!window.globals.ircState.ircConnected) this.hidePanel();
      }
    });

    /**
     * Change size of textArea elements to fit page
     * @listens document:resize-custom-elements
     */
    document.addEventListener('resize-custom-elements', () => {
      if (window.globals.webState.dynamic.inputAreaCharWidthPx) {
        const calcInputAreaColSize = document.getElementById('displayUtils').calcInputAreaColSize;
        // pixel width mar1 is reserved space on edges of input area at full screen width
        const mar1 = window.globals.webState.dynamic.commonMargin;
        // set width of input area elements
        this.shadowRoot.getElementById('panelMessageDisplayId')
          .setAttribute('cols', calcInputAreaColSize(mar1));
      }
    });

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
