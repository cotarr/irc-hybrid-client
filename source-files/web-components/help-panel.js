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
//    Help Panel, MIT License, List of available IRC Commands
//
// ------------------------------------------------------------------------------
//
// Public methods:
//   showPanel()
//   collapsePanel()
//   hidePanel()
//
// ------------------------------------------------------------------------------
'use strict';
window.customElements.define('help-panel', class extends HTMLElement {
  constructor () {
    super();
    const template = document.getElementById('helpPanelTemplate');
    const templateContent = template.content;
    this.attachShadow({ mode: 'open' })
      .appendChild(templateContent.cloneNode(true));
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
   * Make panel visible (both internal and external function)
   */
  showPanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible', '');
    document.dispatchEvent(new CustomEvent('cancel-zoom'));
    this._scrollToTop();
  };

  /**
   * Collapse panel to bar (both internal and external function)
   */
  collapsePanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible');
  };

  /**
   * Hide this panel (both internal and external function)
   */
  hidePanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible');
  };

  /**
   * Handle keydown event to show/hide panel, called from local-command-parser.
   */
  handleHotKey = () => {
    if (this.shadowRoot.getElementById('panelVisibilityDivId').hasAttribute('visible')) {
      this.hidePanel();
    } else {
      this.showPanel();
    }
  };

  // //
  // // The /docs folder is optional, enabled in the configuration
  // // If /docs is available, then un-hide a button providing a link to the documentation pages.
  // //
  // const docsTestUrl = '/irc/docs/index.html';
  // const fetchOptions = {
  //   method: 'HEAD',
  //   headers: {
  //     Accept: 'text/html'
  //   }
  // };
  // fetch(docsTestUrl, fetchOptions)
  //   .then((response) => {
  //     if (response.ok) {
  //       // Make the irc-hybrid-client documentation link button visible
  //       document.getElementById('viewDocsButtonDiv').removeAttribute('hidden');
  //     }
  //   })
  //   .catch(() => {});

  // ------------------
  // Main entry point
  // ------------------
  // initializePlugin = () => {
  // };

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
      const infoDivEl = this.shadowRoot.getElementById('infoDivId');
      if (event.detail.theme === 'light') {
        panelDivEl.classList.remove('help-panel-theme-dark');
        panelDivEl.classList.add('help-panel-theme-light');
        infoDivEl.classList.remove('global-text-theme-dark');
        infoDivEl.classList.add('global-text-theme-light');
      } else {
        panelDivEl.classList.remove('help-panel-theme-light');
        panelDivEl.classList.add('help-panel-theme-dark');
        infoDivEl.classList.remove('global-text-theme-light');
        infoDivEl.classList.add('global-text-theme-dark');
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
