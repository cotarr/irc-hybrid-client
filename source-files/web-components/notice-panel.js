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
// This web component is a UI panel to display IRC Notice messages
//
// ------------------------------------------------------------------------------
'use strict';
window.customElements.define('notice-panel', class extends HTMLElement {
  constructor () {
    super();
    const template = document.getElementById('noticePanelTemplate');
    const templateContent = template.content;
    this.attachShadow({ mode: 'open' })
      .appendChild(templateContent.cloneNode(true));
  }

  showPanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible', '');
  };

  // this panel does not collapse, so close it.
  collapsePanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible');
  };

  hidePanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible');
  };

  displayCtcpNoticeMessage = (ctcpMessage) => {
    // console.log('ctcpMessage', ctcpMessage);
    const panelMessageDisplayEl = this.shadowRoot.getElementById('panelMessageDisplayId');
    panelMessageDisplayEl.value +=
      document.getElementById('displayUtils').cleanFormatting(ctcpMessage) + '\n';

    if (!window.globals.webState.cacheReloadInProgress) {
      if ((!('zoomPanelId' in window.globals.webState)) ||
        (window.globals.webState.zoomPanelId.length < 1)) {
        this.showPanel();
      }
    }

    if (!window.globals.webState.cacheReloadInProgress) {
      panelMessageDisplayEl.scrollTop = panelMessageDisplayEl.scrollHeight;
    }
  };

  // -----------------------------------------------------
  // Notice messages are displayed here
  // This is to allow integration of CTCP responses
  //
  // Note: notice window controls are in another module
  // {
  //   "timestamp": "11:39:42",
  //   "datestamp": "2023-08-22",
  //   "prefix": "sendingNick!~userl@192.168.1.100",
  //   "nick": "sendingNick",
  //   "host": "~userl@192.168.1.100",
  //   "command": "NOTICE",
  //   "params": [
  //     "receivingNick",
  //     "Notice message text example."
  //   ]
  // }
  // // -----------------------------------------------------
  displayNoticeMessage = (parsedMessage) => {
    // console.log(JSON.stringify(parsedMessage, null, 2));
    console.log(parsedMessage);
    const panelDivEl = this.shadowRoot.getElementById('panelDivId');
    const panelMessageDisplayEl = this.shadowRoot.getElementById('panelMessageDisplayId');
    const _addText = (text) => {
      panelMessageDisplayEl.value +=
        document.getElementById('displayUtils').cleanFormatting(text) + '\n';
      if (!window.globals.webState.cacheReloadInProgress) {
        panelMessageDisplayEl.scrollTop = panelMessageDisplayEl.scrollHeight;
      }
    };

    // console.log('parsedMessage ' + JSON.stringify(parsedMessage, null, 2));

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

    // Ignore channel message
    if (window.globals.ircState.channels
      .indexOf(parsedMessage.params[0].toLowerCase()) >= 0) {
      return;
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

    if (parsedMessage.params[0] === window.globals.ircState.nickName) {
      // Case of regular notice address to my nickname, not CTCP reply
      if (parsedMessage.nick) {
        // case of valid user nickname parse
        _addText(parsedMessage.timestamp + ' ' +
        parsedMessage.nick +
          document.getElementById('globVars').constants('nickChannelSpacer') +
          parsedMessage.params[1]);
      } else {
        // else must be a services server message, use prefix
        _addText(parsedMessage.timestamp + ' ' +
        parsedMessage.prefix +
        document.getElementById('globVars').constants('nickChannelSpacer') +
          parsedMessage.params[1]);
      }

      // Message activity Icon
      // If NOT reload from cache in progress (timer not zero)
      // then display incoming message activity icon
      // TODO
      // if (!window.globals.webState.cacheReloadInProgress) {
      //   setNotActivityIcon();
      // }
    } else if (parsedMessage.nick === window.globals.ircState.nickName) {
      // Case of regular notice, not CTCP reply
      _addText(parsedMessage.timestamp + ' [to] ' +
      parsedMessage.params[0] +
      document.getElementById('globVars').constants('nickChannelSpacer') +
      parsedMessage.params[1]);
    }
  }; // displayNoticeMessage()

  // //
  // // Clear textarea before reloading cache (Notice window)
  // //
  // document.addEventListener('erase-before-reload', (event) => {
  //   document.getElementById('noticeMessageDisplay').value = '';
  //   document.getElementById('noticeSectionDiv').setAttribute('lastDate', '0000-00-00');
  //   document.getElementById('noticeUnreadExistIcon').setAttribute('hidden', '');
  //   updateDivVisibility();
  // });

  // //
  // // Add cache reload message to notice window
  // //
  // // Example:  14:33:02 -----Cache Reload-----
  // //
  // document.addEventListener('cache-reload-done', (event) => {
  //   let markerString = '';
  //   let timestampString = '';
  //   if (('detail' in event) && ('timestamp' in event.detail)) {
  //     timestampString = unixTimestampToHMS(event.detail.timestamp);
  //   }
  //   if (timestampString) {
  //     markerString += timestampString;
  //   }
  //   markerString += ' ' + cacheReloadString + '\n';
  //   //
  //   // If text area is blank, leave blank
  //   // If not blank, then append cache reload divider.
  //   if (document.getElementById('noticeMessageDisplay').value !== '') {
  //     document.getElementById('noticeMessageDisplay').value += markerString;
  //     document.getElementById('noticeMessageDisplay').scrollTop =
  //       document.getElementById('noticeMessageDisplay').scrollHeight;
  //   }
  // });

  // document.addEventListener('cache-reload-error', (event) => {
  //   let errorString = '\n';
  //   let timestampString = '';
  //   if (('detail' in event) && ('timestamp' in event.detail)) {
  //     timestampString = unixTimestampToHMS(event.detail.timestamp);
  //   }
  //   if (timestampString) {
  //     errorString += timestampString;
  //   }
  //   errorString += ' ' + cacheErrorString + '\n\n';
  //   document.getElementById('noticeMessageDisplay').value = errorString;
  // });

  // ------------------
  // Main entry point
  // ------------------
  initializePlugin = () => {
    // console.log('notice-panel initializePlugin');
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
      this.shadowRoot.getElementById('panelMessageDisplayId').value =
        '\nTODO: fetch request to server for cache erase';
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
        panelDivEl.classList.remove('notice-panel-theme-dark');
        panelDivEl.classList.add('notice-panel-theme-light');
        panelMessageDisplayEl.classList.remove('global-text-theme-dark');
        panelMessageDisplayEl.classList.add('global-text-theme-light');
      } else {
        panelDivEl.classList.remove('notice-panel-theme-light');
        panelDivEl.classList.add('notice-panel-theme-dark');
        panelMessageDisplayEl.classList.remove('global-text-theme-light');
        panelMessageDisplayEl.classList.add('global-text-theme-dark');
      }
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
