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
// This is a simple CSS based activity spinner (spinning circle)
//
// Methods:
//   requestActivitySpinner() - Increments counter, make spinner visible
//   cancelActivitySpinner() -  Decrement count, if 0 then hide spinner
//   resetActivityCounter() - Set counter to 0, hide spinner
//
// ------------------------------------------------------------------------------
'use strict';
customElements.define('activity-spinner', class extends HTMLElement {
  constructor () {
    super();
    const template = document.getElementById('activitySpinnerTemplate');
    const templateContent = template.content;
    this.attachShadow({ mode: 'open' })
      .appendChild(templateContent.cloneNode(true));
    this.activitySpinnerCounter = 0;
  }

  // ----------------------------------
  // Public methods to enable spinner
  // ----------------------------------
  requestActivitySpinner = () => {
    this.activitySpinnerCounter += 1;
    this.shadowRoot.getElementById('activitySpinner').removeAttribute('hidden');
  };

  cancelActivitySpinner = () => {
    this.activitySpinnerCounter -= 1;
    if (this.activitySpinnerCounter < 0) {
      this.activitySpinnerCounter = 0;
    }
    if (this.activitySpinnerCounter > 0) {
      this.shadowRoot.getElementById('activitySpinner').removeAttribute('hidden');
    } else {
      this.shadowRoot.getElementById('activitySpinner').setAttribute('hidden', '');
    }
  };

  resetActivitySpinner = () => {
    this.activitySpinnerCounter = 0;
    this.shadowRoot.getElementById('activitySpinner').setAttribute('hidden', '');
  };

  initializePlugin () {
    this.resetActivitySpinner();
  }

  // connectedCallback() {
  // }
});
