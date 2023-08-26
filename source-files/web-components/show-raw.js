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
// --------------------------------------------------------------------------------
//
//  Show current state variables for the remote IRC client inside web server.
//
// --------------------------------------------------------------------------------
'use strict';
window.customElements.define('show-raw', class extends HTMLElement {
  constructor () {
    super();
    const template = document.getElementById('showRawTemplate');
    const templateContent = template.content;
    this.attachShadow({ mode: 'open' })
      .appendChild(templateContent.cloneNode(true));
  }

  _startCollectingRawMessages = () => {
    this.shadowRoot.getElementById('pauseButtonId').textContent = 'Pause';
    this.shadowRoot.getElementById('titleDivId').textContent = 'Raw Server Messages';
    this.shadowRoot.getElementById('panelDivId').setAttribute('collecting', '');
  };

  _pauseCollectingRawMessages = () => {
    this.shadowRoot.getElementById('pauseButtonId').textContent = 'Start';
    this.shadowRoot.getElementById('titleDivId').textContent = 'Raw Server Messages (Paused)';
    this.shadowRoot.getElementById('panelDivId').removeAttribute('collecting');
  };

  /**
   * Make panel visible
   */
  showPanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible', '');
  };

  /**
   * This panel does not collapse, instead close it.
   */
  collapsePanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible');
  };

  /**
   * Hide panel
   */
  hidePanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible');
  };

  displayRawIrcServerMessage = (rawMessage) => {
    if (!window.globals.webState.cacheReloadInProgress) {
      if (this.shadowRoot.getElementById('panelDivId').hasAttribute('collecting')) {
        // Insert a text string into the server window and scroll to bottom
        this.shadowRoot.getElementById('panelMessageDisplayId').value += rawMessage + '\n';
        // Option to show raw messages in hexadecimal
        if (this.shadowRoot.getElementById('panelDivId').hasAttribute('hex')) {
          // Option to convert the message to hexadecimal format an append the message in hex
          const uint8String = new TextEncoder('utf8').encode(rawMessage);
          let hexString = '';
          for (let i = 0; i < uint8String.length; i++) {
            hexString += uint8String[i].toString(16).padStart(2, '0') + ' ';
          }
          this.shadowRoot.getElementById('panelMessageDisplayId').value += hexString + '\n';
        }
        // scroll to view new text
        this.shadowRoot.getElementById('panelMessageDisplayId').scrollTop =
        this.shadowRoot.getElementById('panelMessageDisplayId').scrollHeight;
      }
    }
  };

  /**
   * Called once per second as task scheduler, called from js/_afterLoad.js
   */
  // timerTickHandler = () => {
  // };

  // initializePlugin () {
  // }

  connectedCallback () {
    // -------------------------------------
    // 1 of 2 Listeners on internal elements
    // -------------------------------------

    this.shadowRoot.getElementById('closePanelButtonId').addEventListener('click', () => {
      this.hidePanel();
    });

    this.shadowRoot.getElementById('clearButtonId').addEventListener('click', () => {
      this.shadowRoot.getElementById('panelMessageDisplayId').value = '';
    });

    this.shadowRoot.getElementById('pauseButtonId').addEventListener('click', () => {
      if (this.shadowRoot.getElementById('panelDivId').hasAttribute('collecting')) {
        this._pauseCollectingRawMessages();
      } else {
        this._startCollectingRawMessages();
      }
    });

    this.shadowRoot.getElementById('showRawInHexCheckboxId').addEventListener('click', () => {
      if (this.shadowRoot.getElementById('showRawInHexCheckboxId').checked) {
        this.shadowRoot.getElementById('panelDivId').setAttribute('hex', '');
      } else {
        this.shadowRoot.getElementById('panelDivId').removeAttribute('hex');
      }
    });

    // -------------------------------------
    // 2 of 2 Listeners on global events
    // -------------------------------------

    /**
     * Event to collapse all panels. This panel does not collapse so it is hidden
     * @listens document:collapse-all-panels
     * @property {string|string[]} event.detail.except - No action if listed as exception
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
      const panelMessageDisplayEd = this.shadowRoot.getElementById('panelMessageDisplayId');
      if (event.detail.theme === 'light') {
        panelDivEl.classList.remove('show-raw-theme-dark');
        panelDivEl.classList.add('show-raw-theme-light');
        panelMessageDisplayEd.classList.remove('global-text-theme-dark');
        panelMessageDisplayEd.classList.add('global-text-theme-light');
      } else {
        panelDivEl.classList.remove('show-raw-theme-light');
        panelDivEl.classList.add('show-raw-theme-dark');
        panelMessageDisplayEd.classList.remove('global-text-theme-light');
        panelMessageDisplayEd.classList.add('global-text-theme-dark');
      }
    }); // color-theme-changed
    /**
     * Hide panel (not visible) unless listed as exception.
     * @listens document:hide-all-panels
     * @property {string|string[]} event.detail.except - No action if listed as exception
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
        const mar1 = window.globals.webState.dynamic.commonMarginRightPx;
        // set width of input area elements
        this.shadowRoot.getElementById('panelMessageDisplayId')
          .setAttribute('cols', calcInputAreaColSize(mar1));
      }
    });

    /**
     * Make panel visible unless listed as exception.
     * Special case, only open panel if debug === true
     * @listens document:show-all-panels
     * @param {string|string[]} event.detail.except - No action if listed as exception
     */
    document.addEventListener('show-all-panels', (event) => {
      if ((event.detail) && (event.detail.except)) {
        if (typeof event.detail.except === 'string') {
          // this.id assigned in html/_index.html
          if ((event.detail.except !== this.id) && (event.detail.debug)) {
            this.showPanel();
          }
        } else if (Array.isArray(event.detail.except)) {
          if ((event.detail.except.indexOf(this.id) < 0) && (event.detail.debug)) {
            this.showPanel();
          }
        }
      } else {
        if ((event.detail) && (event.detail.debug)) this.showPanel();
      }
    });
  } // connectedCallback()
});
