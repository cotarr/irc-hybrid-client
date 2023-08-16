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
// This web component is toolbox of functions that individual UI panels
// can call to perform common display tasks.
//
// Key functions involve measurement of screen size textArea character size
// that are used by UI panels to dynamically adjust testArea elements
// when the browser window size is changed by dragging the mouse.
//
// ------------------------------------------------------------------------------
'use strict';
window.customElements.define('display-utils', class extends HTMLElement {
  //
  // Called without argument to toggle the page color theme between light and dark
  //
  toggleColorTheme = () => {
    if (document.querySelector('body').getAttribute('theme') === 'light') {
      document.querySelector('body').setAttribute('theme', 'dark');
      window.localStorage.setItem('colorTheme', JSON.stringify({ theme: 'dark' }));
      document.dispatchEvent(new CustomEvent('color-theme-changed',
        { bubbles: true, detail: { theme: 'dark' } }));
    } else {
      document.querySelector('body').setAttribute('theme', 'light');
      window.localStorage.setItem('colorTheme', JSON.stringify({ theme: 'light' }));
      document.dispatchEvent(new CustomEvent('color-theme-changed',
        { bubbles: true, detail: { theme: 'light' } }));
    }
  };

  // ------------------------------------------
  // Function to strip colors from a string
  // ------------------------------------------
  cleanFormatting = (inString) => {
    // Filterable formatting codes
    const formattingChars = [
      2, // 0x02 bold
      7, // 0x07 bell character
      15, // 0x0F reset
      17, // 0x11 mono-space
      22, // 0x16 Reverse color
      29, // 0x1D Italics
      30, // 0x1E Strikethrough
      31 // 0x1F Underline
    ];
    // Color encoding (2 methods)
    // 0x03+color (1 or 2 digits in range 0-9)
    // 0x04+color (6 digit hexadecimal color)
    let outString = '';
    // l = length of input string
    const l = inString.length;
    if (l === 0) return outString;
    // i = index into input string
    let i = 0;

    // Loop through all characters in input string
    let active = true;
    while (i < l) {
      active = true;
      // Filter format characters capable of toggle on/off
      if ((active) && (i < l) && (formattingChars.indexOf(inString.charCodeAt(i)) >= 0)) {
        active = false;
        i++;
      }
      // Removal of color codes 0x03 + (1 or 2 digit) in range ('0' to '9')
      // followed by optional comma and background color.
      // Examples
      //     0x03 + '3'
      //     0x03 + '03'
      //     0x03 + '3,4'
      //     0x03 + '03,04'
      if ((active) && (i < l) && (inString.charCodeAt(i) === 3)) {
        active = false;
        i++;
        if ((i < l) && (inString.charAt(i) >= '0') && (inString.charAt(i) <= '9')) i++;
        if ((i < l) && (inString.charAt(i) >= '0') && (inString.charAt(i) <= '9')) i++;
        if ((i < l) && (inString.charAt(i) === ',')) {
          i++;
          if ((i < l) && (inString.charAt(i) >= '0') && (inString.charAt(i) <= '9')) i++;
          if ((i < l) && (inString.charAt(i) >= '0') && (inString.charAt(i) <= '9')) i++;
        }
      }
      // Hexadecimal colors 0x04 + 6 hexadecimal digits
      // followed by optional comma and 6 hexadeciaml digits for background color
      // In this case, 6 characters are removed regardless if 0-9, A-F
      if ((active) && (i < l) && (inString.charCodeAt(i) === 4)) {
        active = false;
        i++;
        if (((inString.charAt(i) >= '0') &&
          (inString.charAt(i) <= '9')) ||
          ((inString.toUpperCase().charAt(i) >= 'A') &&
          (inString.toUpperCase().charAt(i) <= 'F'))) {
          for (let j = 0; j < 6; j++) {
            if (i < l) i++;
          }
          if ((i < l) && (inString.charAt(i) === ',')) {
            i++;
            for (let j = 0; j < 6; j++) {
              if (i < l) i++;
            }
          }
        }
      }
      if ((active) && (i < l)) {
        active = false;
        outString += inString.charAt(i);
        i++;
      }
    }
    return outString;
  };

  // ---------------------------------------------------------------------------
  // This runs as part of page load
  //
  // This program displays and receives user input using <textarea> elements.
  // The <textarea> elements render differently in desktop and mobile devices
  // The size of the buttons is different in desktop and mobile devices.
  //
  // Therefore, it is necessary to dynamically create <textarea> and <button>
  // elements and determine the size in pixels for a particular browser and zoom.
  //
  // The width of a <textarea> element is the sum of a fixed
  // value for margin, or difference between element pixel internal characters.
  // The second part is the pixel size of each character in the <textarea>
  // For Chrome on my Linux desktop with a zoom of 100%,
  // a <textarea> element is 7 pixels per character plus 21 pixels on the sides.
  //
  // For this to work, a fixed width font is required.
  //
  // The following code will:
  //   Dynamically insert 2 <textarea> elements into the shadowDOM of this custom element
  //       (these temporary elements are positioned underneath the header bar at the top)
  //   Set character width2
  //   Measure element pixel width of each textarea
  //   Calculate regression to get slope and intercept
  //   The intercept is the margin width
  //   The slope is the pixel width of each character.
  //   Remove the element from the shadowDOM
  //
  //   Dynamically insert a <button> element
  //   Set textContent to "Send"
  //   Measure pixel width of [Send] button
  //   Remove the element
  //
  // These values to be used to determine value of the "cols" attribute
  // of a <textarea> element to dynamically size it to a variable window width.
  // --------------------------------------------------------------------------
  //
  // This is a element measurement function
  // It should be run before resizing elements to avoid browser Reflow violations
  //
  _updatePageMeasurements () {
    window.globals.webState.dynamic.bodyClientWidth =
      document.querySelector('body').clientWidth.toString();
    // Debug: To watch a variable, put it here.
    if (!window.globals.webState.watch) window.globals.webState.watch = {};
    window.globals.webState.watch.innerHeight = window.innerHeight.toString() + 'px';
    window.globals.webState.watch.innerWidth = window.innerWidth.toString() + 'px';
    window.globals.webState.watch.bodyClientWidth =
      window.globals.webState.dynamic.bodyClientWidth.toString() + 'px';
    window.globals.webState.watch.devicePixelRatio = window.devicePixelRatio;
  }; // _updatePageMeasurements

  // -----------------------------------------------------------------------
  // Create temporary elements and measure the size in pixels, the delete
  // -----------------------------------------------------------------------
  _calibrateElementSize () {
    // Insertion parent element
    const displayUtilsElement = document.getElementById('displayUtils');

    // Value of temporary character size (cols attribute)
    const rulerX1 = 10;
    const rulerX2 = 20;

    // Create size #1 <textarea> element using first width value
    const rulerTextareaEl1 = document.createElement('textarea');
    rulerTextareaEl1.setAttribute('cols', rulerX1.toString());
    rulerTextareaEl1.setAttribute('rows', '1');
    displayUtilsElement.appendChild(rulerTextareaEl1);

    // Create size #2 <textarea> element using first width value
    const rulerTextareaEl2 = document.createElement('textarea');
    rulerTextareaEl2.setAttribute('cols', rulerX2.toString());
    rulerTextareaEl2.setAttribute('rows', '1');
    displayUtilsElement.appendChild(rulerTextareaEl2);

    // Create <button> element and fill with "Send" string value
    const rulerButtonEl = document.createElement('button');
    rulerButtonEl.textContent = 'Send';
    displayUtilsElement.appendChild(rulerButtonEl);

    // the rulerY1, is the pixel width of a textarea with rulerX1 characters
    const rulerY1 = rulerTextareaEl1.getBoundingClientRect().width;
    // repeat with different character and pixel width
    const rulerY2 = rulerTextareaEl2.getBoundingClientRect().width;

    // perform regression (2 equation, 2 variables) to get slope and intercept (Y = mX + b)
    window.globals.webState.dynamic.inputAreaCharWidthPx =
      (rulerY2 - rulerY1) / (rulerX2 - rulerX1);
    window.globals.webState.dynamic.inputAreaSideWidthPx =
      rulerY1 - (rulerX1 * window.globals.webState.dynamic.inputAreaCharWidthPx);

    window.globals.webState.dynamic.sendButtonWidthPx = rulerButtonEl.getBoundingClientRect().width;
    // done, remove the temporary element
    displayUtilsElement.removeChild(rulerTextareaEl1);
    displayUtilsElement.removeChild(rulerTextareaEl2);
    displayUtilsElement.removeChild(rulerButtonEl);
  }; // _calibrateElementSize()

  // ---------------------------------------------------------------------------
  // Function to calculate <textarea> "cols" attribute for proper width on page.
  //
  // This is called by various panels with IRC chat textarea elements
  // to set the character size of textarea for proper page layout.
  //
  // Input: margin width outside <textarea>  (innerWidth - element width)
  // Output: String containing integer value of textarea "cols" attribute
  // --------------------------------------------------------------------------
  calcInputAreaColSize (marginPxWidth) {
    if ((typeof marginPxWidth === 'number') &&
      (window.globals.webState.dynamic.inputAreaCharWidthPx) &&
      (typeof window.globals.webState.dynamic.inputAreaCharWidthPx === 'number') &&
      (window.globals.webState.dynamic.inputAreaCharWidthPx > 1) &&
      (window.globals.webState.dynamic.inputAreaSideWidthPx) &&
      (typeof window.globals.webState.dynamic.inputAreaSideWidthPx === 'number') &&
      (window.globals.webState.dynamic.inputAreaSideWidthPx > 1)) {
      let margin = marginPxWidth;
      if (margin < 0) margin = 0;
      const cols = parseInt(
        (window.globals.webState.dynamic.bodyClientWidth -
          window.globals.webState.dynamic.inputAreaSideWidthPx - margin) /
        window.globals.webState.dynamic.inputAreaCharWidthPx);
      return cols.toString();
    } else {
      console.log('alcInputAreaColSize() invalid input');
      return null;
    }
  }; // calcInputAreaColSize()

  // --------------------------------------------------------
  // Event listener for resize window (generic browser event)
  //
  // was not allowed inside a custom element.
  // An external listener will call this function
  // --------------------------------------------------------
  // TODO remove
  handleExternalWindowResizeEvent (event) {
    this._updatePageMeasurements();
    // ignore resize events before dynamic size variables exist
    if (window.globals.webState.dynamic.inputAreaCharWidthPx) {
      // console.log('window resize event');
      //
      // If browser supports devicePixelRatio, then compare
      // against last value. If change, then user has changed
      // browser zoom, so dynamic textarea element resize
      // will need to be re-calibrated.
      //
      if (window.devicePixelRatio) {
        if (window.globals.webState.dynamic.lastDevicePixelRatio !== window.devicePixelRatio) {
          // case of zoom changed, recalibrate element pixel size
          window.globals.webState.dynamic.lastDevicePixelRatio = window.devicePixelRatio;

          // recalibrate pixel width of textarea elements
          this._calibrateElementSize();
        }
      }

      // Resize textarea elements
      document.dispatchEvent(new CustomEvent('resize-custom-elements',
        {
          bubbles: true,
          detail: {
          }
        }));

      // This is to prevent unnecessary resize event on timer check (next function below)
      window.globals.webState.dynamic.lastClientWidth =
        window.globals.webState.dynamic.bodyClientWidth;
    }
  };

  //
  // Timer service routine
  //
  // Resize input area elements after pageClientWidth unexpectedly changes without event.
  // Typically appearance of vertical slider causes this.
  //
  _checkVerticalSliderPageWidth () {
    this._updatePageMeasurements();

    // skip if not initialized
    if (window.globals.webState.dynamic.inputAreaCharWidthPx) {
      // Case of making window visible/hidden add or remove vertical slider, change width.
      // There is no event to catch this so it's done on a timer.
      if (window.globals.webState.dynamic.lastClientWidth !==
        window.globals.webState.dynamic.bodyClientWidth) {
        window.globals.webState.dynamic.lastClientWidth =
          window.globals.webState.dynamic.bodyClientWidth;

        // Resize textarea elements
        document.dispatchEvent(new CustomEvent('resize-custom-elements',
          {
            bubbles: true,
            detail: {
            }
          }));
      }
    }
  }; // _checkVerticalSliderPageWidth()

  // Button event handlers can call this during debug
  manualRecalcPageWidth () {
    this._updatePageMeasurements();

    // recalibrate pixel width of textarea elements
    this._calibrateElementSize();

    // Resize textarea elements
    document.dispatchEvent(new CustomEvent('resize-custom-elements',
      {
        bubbles: true,
        detail: {
        }
      }
    ));
  };

  /**
   * Called once per second as task scheduler, called from js/_afterLoad.js
   */
  timerTickHandler = () => {
    this._checkVerticalSliderPageWidth();
  };

  // ------------------
  // Main entry point
  // ------------------
  initializePlugin () {
    //
    // Do initially on page load, calibrate textarea element size, and resize input area elements.
    //
    this._updatePageMeasurements();
    window.globals.webState.dynamic.lastClientWidth =
     window.globals.webState.dynamic.bodyClientWidth;
    this._calibrateElementSize();
    // Resize textarea elements
    document.dispatchEvent(new CustomEvent('resize-custom-elements',
      {
        bubbles: true,
        detail: {
        }
      }
    ));

    // -----------------------------------------------------
    // On page load, restore color theme from local storage
    // -----------------------------------------------------
    let localStorageColorTheme = null;
    localStorageColorTheme = JSON.parse(window.localStorage.getItem('colorTheme'));
    if ((localStorageColorTheme) && (localStorageColorTheme.theme === 'dark')) {
      document.querySelector('body').setAttribute('theme', 'dark');
      document.dispatchEvent(new CustomEvent('color-theme-changed',
        { bubbles: true, detail: { theme: 'dark' } }));
    }
    if ((localStorageColorTheme) && (localStorageColorTheme.theme === 'light')) {
      document.querySelector('body').setAttribute('theme', 'light');
      document.dispatchEvent(new CustomEvent('color-theme-changed',
        { bubbles: true, detail: { theme: 'light' } }));
    }

    //
    // And do same one more time...
    // and again, as a work around to prevent to correct
    // condition where textarea about 80% of normal on first page load.
    //
    setTimeout(() => {
      this._calibrateElementSize();
      // Resize textarea elements
      document.dispatchEvent(new CustomEvent('resize-custom-elements',
        {
          bubbles: true,
          detail: {
          }
        }
      ));
    }, 900);
  }

  connectedCallback () {
    //
    // Global event listeners
    document.addEventListener('color-theme-changed', (event) => {
      if (event.detail.theme === 'light') {
        document.querySelector('body').classList.remove('global-body-theme-dark');
        document.querySelector('body').classList.add('global-body-theme-light');
      } else {
        document.querySelector('body').classList.remove('global-body-theme-light');
        document.querySelector('body').classList.add('global-body-theme-dark');
      }
    });
  }
});
