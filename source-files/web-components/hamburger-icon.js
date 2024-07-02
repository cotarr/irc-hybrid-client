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
// Public Methods:
//    giveNavMenuHamburgerIconFocus = ()
//    setColorTheme(theme)
//    updateHamburgerInfo(menuOpenState)
//    updateHamburgerTitle(newTitle)
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

  /**
   * Update hamburger icon attributes
   * @param {String} menuOpenState - Nav menu state 'open', 'closed'
   */
  updateHamburgerInfo = (menuOpenState) => {
    if (menuOpenState === 'open') {
      this.shadowRoot.getElementById('hamburgerBorderId')
        .setAttribute('aria-expanded', 'true');
    } else {
      this.shadowRoot.getElementById('hamburgerBorderId')
        .setAttribute('aria-expanded', 'false');
    }
  };

  /**
   * Update main nav button title attribute
   * @param {String} newTitle - Tooltip popup for main nav menu icon
   */
  updateHamburgerTitle = (newTitle) => {
    this.shadowRoot.getElementById('hamburgerBorderId').title = newTitle;
  };

  /**
   * Set focus to Hamburger Nav Icon
   */
  giveNavMenuHamburgerIconFocus = () => {
    this.shadowRoot.getElementById('hamburgerBorderId').focus();
  };

  /**
   * Change colors of the hamburger icon
   * @param {string} theme - Allowed:  'light', 'dark'
   */
  setColorTheme = (theme) => {
    const hamburgerIconEl = this.shadowRoot.getElementById('hamburgerBorderId');
    const hamburgerLine1El = this.shadowRoot.getElementById('hamburgerLine1Id');
    const hamburgerLine2El = this.shadowRoot.getElementById('hamburgerLine2Id');
    const hamburgerLine3El = this.shadowRoot.getElementById('hamburgerLine3Id');
    if (theme === 'light') {
      hamburgerIconEl.classList.remove('hamburger-icon-theme-dark');
      hamburgerLine1El.classList.remove('hamburger-line-theme-dark');
      hamburgerLine2El.classList.remove('hamburger-line-theme-dark');
      hamburgerLine3El.classList.remove('hamburger-line-theme-dark');

      hamburgerIconEl.classList.add('hamburger-icon-theme-light');
      hamburgerLine1El.classList.add('hamburger-line-theme-light');
      hamburgerLine2El.classList.add('hamburger-line-theme-light');
      hamburgerLine3El.classList.add('hamburger-line-theme-light');
    } else if (theme === 'dark') {
      hamburgerIconEl.classList.remove('hamburger-icon-theme-light');
      hamburgerLine1El.classList.remove('hamburger-line-theme-light');
      hamburgerLine2El.classList.remove('hamburger-line-theme-light');
      hamburgerLine3El.classList.remove('hamburger-line-theme-light');

      hamburgerIconEl.classList.add('hamburger-icon-theme-dark');
      hamburgerLine1El.classList.add('hamburger-line-theme-dark');
      hamburgerLine2El.classList.add('hamburger-line-theme-dark');
      hamburgerLine3El.classList.add('hamburger-line-theme-dark');
    } else {
      throw new Error('Invalid color theme, allowed: light, dark');
    }
  };

  // initializePlugin () {
  // }

  connectedCallback () {
    // Detect keyboard keypress and use for Navigation of the dropdown Nav menu
    this.shadowRoot.addEventListener('keydown', (e) => {
      if (!(e.altKey) &&
        (!e.ctrlKey) &&
        (!e.shiftKey) &&
        (!e.metaKey)) {
        // console.log(e.code);
        // //
        if (e.code === 'ArrowRight') {
          const activeElement = this.shadowRoot.activeElement;
          if (activeElement.id === 'hamburgerBorderId') {
            document.getElementById('navMenu').openIfClosedNavMenu();
          }
        }
      }
    }, false);
  }
});
