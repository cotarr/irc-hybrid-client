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
    this.shadowRoot.getElementById('panelVisibilityDiv').setAttribute('visible', '');
  };

  // this panel does not collapse, so close it.
  collapsePanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDiv').removeAttribute('visible');
  };

  hidePanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDiv').removeAttribute('visible');
  };

  // ------------------
  // Main entry point
  // ------------------
  initializePlugin = () => {
    // console.log('notice-panel initializePlugin');
    this.shadowRoot.getElementById('panelMessageDisplayId').value =
      '12:01:26 NickServ | This nick is owned by someone else. Please choose another.\n' +
      '12:01:26 NickServ | If this is your nick, type: /msg NickSere IDENTIFY <password>\n' +
      '12:01:26 NickServ | Your nick will be changed in 60 seconds if you do not comply.\n';
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
    this.shadowRoot.getElementById('closePanelButton').addEventListener('click', () => {
      console.log('click');
      this.shadowRoot.getElementById('panelVisibilityDiv').removeAttribute('visible');
    });

    // -------------------------
    // Erase button handler
    // -------------------------
    this.shadowRoot.getElementById('eraseButton').addEventListener('click', () => {
      this.shadowRoot.getElementById('panelMessageDisplayId').value =
        '\nTODO: fetch request to server for cache erase';
    }); // panel erase button

    // -------------------------
    // Taller button handler
    // -------------------------
    this.shadowRoot.getElementById('tallerButton').addEventListener('click', () => {
      const newRows =
        parseInt(this.shadowRoot.getElementById('panelMessageDisplayId').getAttribute('rows')) + 5;
      this.shadowRoot.getElementById('panelMessageDisplayId')
        .setAttribute('rows', newRows.toString());
    });

    // -------------------------
    // Normal button handler
    // -------------------------
    this.shadowRoot.getElementById('normalButton').addEventListener('click', () => {
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
        this.hidePanel();
      }
    });

    document.addEventListener('color-theme-changed', (event) => {
      if (event.detail.theme === 'light') {
        this.shadowRoot.getElementById('panelDivId')
          .classList.remove('notice-panel-theme-dark');
        this.shadowRoot.getElementById('panelDivId')
          .classList.add('notice-panel-theme-light');
        this.shadowRoot.getElementById('panelMessageDisplayId')
          .classList.remove('global-text-theme-dark');
        this.shadowRoot.getElementById('panelMessageDisplayId')
          .classList.add('global-text-theme-light');
      } else {
        this.shadowRoot.getElementById('panelDivId')
          .classList.remove('notice-panel-theme-light');
        this.shadowRoot.getElementById('panelDivId')
          .classList.add('notice-panel-theme-dark');
        this.shadowRoot.getElementById('panelMessageDisplayId')
          .classList.remove('global-text-theme-light');
        this.shadowRoot.getElementById('panelMessageDisplayId')
          .classList.add('global-text-theme-dark');
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

    // -----------------------------------------------------------------
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
