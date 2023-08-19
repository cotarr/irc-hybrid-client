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
// This web component is the main error display UI for the page
//
// ------------------------------------------------------------------------------
'use strict';
window.customElements.define('error-panel', class extends HTMLElement {
  constructor () {
    super();
    const template = document.getElementById('errorPanelTemplate');
    const templateContent = template.content;
    this.attachShadow({ mode: 'open' })
      .appendChild(templateContent.cloneNode(true));
    this.errorExpireSeconds = 5;
    this.errorRemainSeconds = 0;
  }

  // ------- -------------------
  // Error display functions
  // --------------------------

  clearError = () => {
    this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible');
    const errorContentDivEl = this.shadowRoot.getElementById('errorContentDivId');
    while (errorContentDivEl.firstChild) {
      errorContentDivEl.removeChild(errorContentDivEl.firstChild);
    }
    this.errorRemainSeconds = 0;
  };

  showError = (errorString) => {
    this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible', '');
    const errorContentDivEl = this.shadowRoot.getElementById('errorContentDivId');
    const errorMessageEl = document.createElement('div');
    errorMessageEl.textContent = errorString || 'Error: unknown error (2993)';
    errorContentDivEl.appendChild(errorMessageEl);
    this.errorRemainSeconds = this.errorExpireSeconds;
  };

  _expireErrorMessages = () => {
    if (this.errorRemainSeconds > 0) {
      this.errorRemainSeconds--;
      if (this.errorRemainSeconds === 0) {
        this.clearError();
      } else {
        this.shadowRoot.getElementById('errorTitleId').textContent =
          'Tap to Close (' + this.errorRemainSeconds.toString() + ')';
      }
    }
  };

  /**
   * Called once per second as task scheduler, called from js/_afterLoad.js
   */
  timerTickHandler = () => {
    this._expireErrorMessages();
  };

  // ------------------
  // Main entry point
  // ------------------
  // initializePlugin = () => {
  // };

  // add event listeners to connected callback
  // -------------------------------------------
  connectedCallback () {
    // ------------------------------------
    // Click error to remove error display
    // ------------------------------------
    this.shadowRoot.getElementById('panelDivId').addEventListener('click', () => {
      this.clearError();
    });
  } // connectedCallback()
});
