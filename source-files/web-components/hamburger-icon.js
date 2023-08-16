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
// This web component is a simple CSS based hamburger icon used to call a menu.
// It is a static element without any functionality.
//
// ------------------------------------------------------------------------------
'use strict';
customElements.define('hamburger-icon', class extends HTMLElement {
  constructor () {
    super();
    const template = document.getElementById('hamburgerIconTemplate');
    const templateContent = template.content;
    this.attachShadow({ mode: 'open' })
      .appendChild(templateContent.cloneNode(true));
    this.activitySpinnerCounter = 0;
  }

  setColorTheme = (theme) => {
    if (theme === 'light') {
      this.shadowRoot.getElementById('hamburgerIcon')
        .classList.remove('hamburger-icon-theme-dark');
      this.shadowRoot.getElementById('hamburgerLine1')
        .classList.remove('hamburger-line-theme-dark');
      this.shadowRoot.getElementById('hamburgerLine2')
        .classList.remove('hamburger-line-theme-dark');
      this.shadowRoot.getElementById('hamburgerLine3')
        .classList.remove('hamburger-line-theme-dark');

      this.shadowRoot.getElementById('hamburgerIcon')
        .classList.add('hamburger-icon-theme-light');
      this.shadowRoot.getElementById('hamburgerLine1')
        .classList.add('hamburger-line-theme-light');
      this.shadowRoot.getElementById('hamburgerLine2')
        .classList.add('hamburger-line-theme-light');
      this.shadowRoot.getElementById('hamburgerLine3')
        .classList.add('hamburger-line-theme-light');
    } else if (theme === 'dark') {
      this.shadowRoot.getElementById('hamburgerIcon')
        .classList.remove('hamburger-icon-theme-light');
      this.shadowRoot.getElementById('hamburgerLine1')
        .classList.remove('hamburger-line-theme-light');
      this.shadowRoot.getElementById('hamburgerLine2')
        .classList.remove('hamburger-line-theme-light');
      this.shadowRoot.getElementById('hamburgerLine3')
        .classList.remove('hamburger-line-theme-light');

      this.shadowRoot.getElementById('hamburgerIcon')
        .classList.add('hamburger-icon-theme-dark');
      this.shadowRoot.getElementById('hamburgerLine1')
        .classList.add('hamburger-line-theme-dark');
      this.shadowRoot.getElementById('hamburgerLine2')
        .classList.add('hamburger-line-theme-dark');
      this.shadowRoot.getElementById('hamburgerLine3')
        .classList.add('hamburger-line-theme-dark');
    } else {
      throw new Error('Invalid color theme, allowed: light, dark');
    }
  };

  // initializePlugin () {
  // }

  // connectedCallback() {
  // }
});
