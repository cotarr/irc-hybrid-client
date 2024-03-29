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
//    Utility toolbox of common text processing and pixel calculations
//
// ------------------------------------------------------------------------------
//
// This web component is toolbox of functions that individual UI panels
// can call to perform common display tasks.
//
// Key functions involve measurement of screen size textArea character size
// that are used by UI panels to dynamically adjust testArea elements
// when the browser window size is changed by dragging the mouse.
//
// Public methods
//   toggleColorTheme()
//   timestampToHMS(timeString)
//   timestampToYMD(timeString)
//   unixTimestampToHMS(seconds)
//   timestampToUnixSeconds(timeString)
//   stripTrailingCrLf(inString)
//   detectMultiLineString(inString)
//   handleExternalWindowResizeEvent()
//   manualRecalcPageWidth()
//
// ------------------------------------------------------------------------------
'use strict';
window.customElements.define('display-utils', class extends HTMLElement {
  /**
   * Called without argument to toggle the page color theme between light and dark
   */
  toggleColorTheme = () => {
    if (document.querySelector('body').getAttribute('theme') === 'light') {
      document.querySelector('body').setAttribute('theme', 'dark');
      window.localStorage.setItem('colorTheme', JSON.stringify({ theme: 'dark' }));
      document.dispatchEvent(new CustomEvent('color-theme-changed',
        { detail: { theme: 'dark' } }));
    } else {
      document.querySelector('body').setAttribute('theme', 'light');
      window.localStorage.setItem('colorTheme', JSON.stringify({ theme: 'light' }));
      document.dispatchEvent(new CustomEvent('color-theme-changed',
        { detail: { theme: 'light' } }));
    }
  };

  /**
   * Convert string with IRCv3 timestamp to HH:MM:SS string
   * @param {string} timeString - IRCv3 timestamp prefix
   * @returns {string} in format HH:MM:DD
   */
  timestampToHMS = (timeString) => {
    // console.log('timeString ' + timeString);
    // Reference: https://ircv3.net/specs/extensions/server-time
    // @time=2011-10-19T16:40:51.620Z :Angel!angel@example.org PRIVMSG Wiz :Hello
    let outString = '';
    if (timeString.length === 0) {
      outString = null;
    } else {
      if (timeString.indexOf('@time=') === 0) {
        const timeObj = new Date(timeString.slice(6, timeString.length));
        outString += timeObj.getHours().toString().padStart(2, '0') + ':';
        outString += timeObj.getMinutes().toString().padStart(2, '0') + ':';
        outString += timeObj.getSeconds().toString().padStart(2, '0');
      } else {
        outString = null;
      }
    }
    return outString;
  };

  /**
   * Convert string with IRCv3 timestamp to YYYY-MM-DD string
   * @param {string} timeString - IRCv3 timestamp prefix
   * @returns {string} - in format YYYY-MM-DD
   */
  timestampToYMD = (timeString) => {
    let outString = '';
    if (timeString.length === 0) {
      outString = null;
    } else {
      if (timeString.indexOf('@time=') === 0) {
        const timeObj = new Date(timeString.slice(6, timeString.length));
        outString += timeObj.getFullYear().toString().padStart(4, '0') + '-';
        // Month start at 0
        outString += (timeObj.getMonth() + 1).toString().padStart(2, '0') + '-';
        outString += timeObj.getDate().toString().padStart(2, '0');
      } else {
        outString = null;
      }
    }
    return outString;
  };

  /**
   * Convert unix timestamp in seconds to HH:MM:SS string local time
   * @param {number} seconds - Unix time in seconds
   * @returns {string} in format HH:MM:DD
   */
  unixTimestampToHMS = (seconds) => {
    // console.log('timeString ' + timeString);
    let outString = '';
    if ((typeof seconds === 'number') &&
      (Number.isInteger(seconds)) &&
      (seconds > 1000000000) &&
      (seconds < 1000000000000)) {
      const timeObj = new Date(seconds * 1000);
      let language;
      if (window.navigator.languages) {
        language = window.navigator.languages[0];
      } else {
        language = window.navigator.userLanguage || window.navigator.language || 'en-US';
      }
      outString = timeObj.toLocaleTimeString(language, { hour12: false }); // hh:mm:ss browser time
    } else {
      outString = null;
    }
    // console.log(seconds, outString);
    return outString;
  };

  /**
   * Convert string with IRCv3 timestamp to Unix Seconds
   * @param {string} timeString - IRCv3 timestamp prefix
   * @returns {number} - Unix time in seconds
   */
  timestampToUnixSeconds = (timeString) => {
    // Reference: https://ircv3.net/specs/extensions/server-time
    // @time=2011-10-19T16:40:51.620Z :Angel!angel@example.org PRIVMSG Wiz :Hello
    let outSeconds = null;
    if (timeString.length === 0) {
      outSeconds = null;
    } else {
      if (timeString.indexOf('@time=') === 0) {
        const timeObj = new Date(timeString.slice(6, timeString.length));
        outSeconds = parseInt(timeObj.valueOf() / 1000);
      } else {
        outSeconds = null;
      }
    }
    return outSeconds;
  };

  /**
   * Remove trailing CR-LF
   * @param {string} - Remove trailing CR-LF
   * @returns {string }
   */
  stripTrailingCrLf = (inString) => {
    let inLength = inString.length;
    if ((inLength > 0) && (inString.charCodeAt(inLength - 1) === 10)) inLength--;
    if ((inLength > 0) && (inString.charCodeAt(inLength - 1) === 13)) inLength--;
    // remove trailing ascii space (left from auto-complete)
    if ((inLength > 0) && (inString.charCodeAt(inLength - 1) === 32)) inLength--;
    if ((inLength > 0) && (inString.charCodeAt(inLength - 1) === 32)) inLength--;
    if (inLength === 0) {
      return '';
    } else {
      return inString.slice(0, inLength);
    }
  };

  /**
   * Function to test string for multi-line content
   * This is to avoid multi-line errors from copy paste or mobile voice dictation
   * @param {string} inString - string to check
   * @returns {boolean} true if text is multi-line
   */
  detectMultiLineString = (inString) => {
    let inLength = inString.length;
    // if last character is newline 0x0A, then reduce by 1
    if ((inLength > 0) && (inString.charCodeAt(inLength - 1) === 10)) inLength--;
    if (inLength > 0) {
      let countCR = 0;
      for (let i = 0; i < inLength; i++) {
        if (inString.charCodeAt(i) === 10) countCR++;
      }
      if (countCR === 0) {
        return false;
      } else {
        return true;
      }
    } else {
      return false;
    }
  };

  // ------ This is a color format removal test -------------
  // let colorTest = 'This is ' +
  //   String.fromCharCode(3) + '04' + 'Red' + String.fromCharCode(3) + ' color ' +
  //   String.fromCharCode(3) + '04,12' + 'Red/Gray' + String.fromCharCode(3) + ' color ' +
  //   String.fromCharCode(4) + '0Fd7ff' + 'Hex-color' + String.fromCharCode(4) + ' color ' +
  //   String.fromCharCode(4) + '0Fd7ff,17a400' + 'Hex-color,hexcolor' + String.fromCharCode(4) +
  //   ' color ' +
  //   String.fromCharCode(2) + 'Bold' + String.fromCharCode(2) + ' text ';
  // console.log('colorTest ' + cleanFormatting(colorTest));
  // ------ end color format removal test -------------

  /**
   * strip CTCP delimiter from text
   * @param {string} inString - IRC text content starting with CTCP marker
   * @returns {string} - Processed string
   */
  cleanCtcpDelimiter = (inString) => {
    // Filterable formatting codes
    const ctcpDelim = 1;
    let outString = '';
    const l = inString.length;
    if (l === 0) return outString;
    let i = 0;
    while (i < l) {
      if ((i < l) && (inString.charCodeAt(i) === ctcpDelim)) {
        i++;
      } else {
        if (i < l) outString += inString.charAt(i);
        i++;
      }
    }
    return outString;
  };

  /**
   * Clean IRC color format codes from string
   * @param {string} inString - IRC text with possible color codes
   * @returns {string} Returns same string with codes removed
   */
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

  /**
   * Modifies HTML element in DOM to remove one CR-LF anywhere from inputArea element
   * @param {Object} textAreaElement - HTML <textarea> or <input> element
   */
  stripOneCrLfFromElement = (textAreaElement) => {
    if (!textAreaElement.value) return;
    const inString = textAreaElement.value.toString();
    //
    // detect \n or \r\n, and remove one time
    //
    let crCount = 0;
    let lfCount = 0;
    if (inString.length > 0) {
      for (let i = 0; i < inString.length; i++) {
        if (inString.charCodeAt(i) === 0x0D) crCount++;
        if (inString.charCodeAt(i) === 0x0A) lfCount++;
      }
    }
    // Case of Unix end of line
    if ((crCount === 0) && (lfCount === 1)) {
      let newString = '';
      for (let i = 0; i < inString.length; i++) {
        if (inString.charCodeAt(i) !== 0x0A) {
          newString += inString.charAt(i);
        }
      }
      // Exchange value (contents) with new string in html element
      textAreaElement.value = newString;
    }
    // Case of Windows end of line
    if ((crCount === 1) && (lfCount === 1)) {
      let newString = '';
      for (let i = 0; i < inString.length; i++) {
        if ((inString.charCodeAt(i) !== 0x0A) && (inString.charCodeAt(i) !== 0x0D)) {
          newString += inString.charAt(i);
        }
      }
      // Exchange value (contents) with new string in html element
      textAreaElement.value = newString;
    }
  }; // stripOneCrLfFromElement()

  // ---------------------------------------------------------------------------
  // This runs as part of page load
  //
  // This program displays and receives user input using <textarea> elements.
  // The <textarea> elements render differently in desktop and mobile devices
  // The size of the textarea will change if the browser zoom is changed (not 100%)
  // The size of the buttons is different in desktop and mobile devices.
  //
  // Therefore, it is necessary to dynamically create <textarea> and <button>
  // elements and determine the size in pixels for a particular browser and zoom.
  //
  // The width of a <textarea> element is the sum of a fixed
  // value for textarea padding and the (column width * number of columns)
  // or (row width * number of rows)
  //
  // For this to work, a fixed width font is required.
  //
  // The following code will:
  //   Dynamically insert 2 <textarea> elements into the shadowDOM of this custom element
  //       (these temporary elements are positioned underneath the header bar at the top)
  //   Set character width2
  //   Measure textarea padding width of each textarea
  //   Calculate regression to get slope and intercept
  //   The intercept is the padding in pixels
  //   The slope is the pixel width of each column or row.
  //   Remove the element from the shadowDOM
  //
  //   Dynamically insert a <button> element
  //   Set textContent to "Send"
  //   Measure pixel width of [Send] button
  //   Remove the element
  //
  // These values to be used to determine value of the "rows" and "cols" attribute
  // of a <textarea> element to dynamically size it to a dynamic window size.
  // --------------------------------------------------------------------------

  /**
   * This is a element measurement function
   * It should be run before resizing elements to avoid browser Reflow violations
   */
  _updatePageMeasurements () {
    // This is based on "body" width to be inside of the vertical slider bar if present
    window.globals.webState.dynamic.panelPxWidth =
      document.querySelector('body').clientWidth.toString();
    // THis is based on "window" height because actual panels may be
    // shorter than browser window height
    window.globals.webState.dynamic.panelPxHeight =
      window.innerHeight.toString();
    // Determine browser window sizes
    if (!window.globals.webState.watch) window.globals.webState.watch = {};
    window.globals.webState.watch.innerHeight = window.innerHeight.toString() + 'px';
    window.globals.webState.watch.innerWidth = window.innerWidth.toString() + 'px';
    window.globals.webState.watch.panelPxWidth =
      window.globals.webState.dynamic.panelPxWidth.toString() + 'px';
    window.globals.webState.watch.panelPxHeight =
      window.globals.webState.dynamic.panelPxHeight.toString() + 'px';
    window.globals.webState.watch.devicePixelRatio = window.devicePixelRatio;
  }; // _updatePageMeasurements

  /**
   * Create temporary elements and measure the size in pixels, the delete
   */
  _calibrateElementSize () {
    // Insertion parent element
    const displayUtilsElement = document.getElementById('displayUtils');

    // Value of temporary character size (cols attribute)
    const rulerX1 = 10;
    const rulerX2 = 20;
    const rulerY1 = 1;
    const rulerY2 = 11;

    // Create size #1 <textarea> element using first width value
    const rulerTextareaEl1 = document.createElement('textarea');
    rulerTextareaEl1.setAttribute('cols', rulerX1.toString());
    rulerTextareaEl1.setAttribute('rows', rulerY1.toString());
    displayUtilsElement.appendChild(rulerTextareaEl1);

    // Create size #2 <textarea> element using first width value
    const rulerTextareaEl2 = document.createElement('textarea');
    rulerTextareaEl2.setAttribute('cols', rulerX2.toString());
    rulerTextareaEl2.setAttribute('rows', rulerY2.toString());
    displayUtilsElement.appendChild(rulerTextareaEl2);

    // Create <button> element and fill with "Send" string value
    const rulerButton1El = document.createElement('button');
    rulerButton1El.textContent = 'Send';
    displayUtilsElement.appendChild(rulerButton1El);

    // Button to show/hide the bottom part of channel panel
    const rulerButton2El = document.createElement('button');
    rulerButton2El.textContent = '⇅';
    displayUtilsElement.appendChild(rulerButton2El);

    // the size, is the pixel width of a textarea with rulerX1 characters
    const sizeX1 = rulerTextareaEl1.getBoundingClientRect().width;
    const sizeX2 = rulerTextareaEl2.getBoundingClientRect().width;
    const sizeY1 = rulerTextareaEl1.getBoundingClientRect().height;
    const sizeY2 = rulerTextareaEl2.getBoundingClientRect().height;
    // console.log('small', sizeX1, sizeY1, 'large', sizeX2, sizeY2);

    // perform regression (2 equation, 2 variables) to get slope and intercept (Y = mX + b)
    window.globals.webState.dynamic.testAreaColumnPxWidth =
      (sizeX2 - sizeX1) / (rulerX2 - rulerX1);
    window.globals.webState.dynamic.textAreaPaddingPxWidth =
      sizeX1 - (rulerX1 * window.globals.webState.dynamic.testAreaColumnPxWidth);
    window.globals.webState.dynamic.textAreaRowPxHeight =
      (sizeY2 - sizeY1) / (rulerY2 - rulerY1);
    window.globals.webState.dynamic.textareaPaddingPxHeight =
      sizeY1 - (rulerY1 * window.globals.webState.dynamic.textAreaRowPxHeight);
    window.globals.webState.dynamic.sendButtonWidthPx =
      rulerButton1El.getBoundingClientRect().width;
    window.globals.webState.dynamic.collapseButtonWidthPx =
      rulerButton2El.getBoundingClientRect().width;
    // done, remove the temporary element
    displayUtilsElement.removeChild(rulerTextareaEl1);
    displayUtilsElement.removeChild(rulerTextareaEl2);
    displayUtilsElement.removeChild(rulerButton1El);
    displayUtilsElement.removeChild(rulerButton2El);
  }; // _calibrateElementSize()

  /**
   * Function to calculate <textarea> "cols" attribute for proper width on page.
   *
   * This is called by various panels with IRC chat textarea elements
   * to set the character size of textarea for proper page layout.
   * @param {*} marginPxWidth - Margin width outside <textarea>  (innerWidth - element width)
   * @returns {string} String containing integer value of textarea "cols" attribute
   */
  calcInputAreaColSize (marginPxWidth) {
    if ((typeof marginPxWidth === 'number') &&
      (window.globals.webState.dynamic.testAreaColumnPxWidth) &&
      (typeof window.globals.webState.dynamic.testAreaColumnPxWidth === 'number') &&
      (window.globals.webState.dynamic.testAreaColumnPxWidth > 1) &&
      (window.globals.webState.dynamic.textAreaPaddingPxWidth) &&
      (typeof window.globals.webState.dynamic.textAreaPaddingPxWidth === 'number') &&
      (window.globals.webState.dynamic.textAreaPaddingPxWidth > 1)) {
      let margin = marginPxWidth;
      if (margin < 0) margin = 0;
      const cols = parseInt(
        (window.globals.webState.dynamic.panelPxWidth -
          window.globals.webState.dynamic.textAreaPaddingPxWidth - margin) /
        window.globals.webState.dynamic.testAreaColumnPxWidth);
      return cols.toString();
    } else {
      console.log('alcInputAreaColSize() invalid input');
      return null;
    }
  }; // calcInputAreaColSize()

  /**
   * Event handler called from js/_afterLoad.js when window.resize is fired
   * The resize event was not available inside the web component.
   * All sizes are obtained from DOM, event object not used.
   * @fires resize-custom-elements
   */
  handleExternalWindowResizeEvent () {
    this._updatePageMeasurements();
    // ignore resize events before dynamic size variables exist
    if (window.globals.webState.dynamic.testAreaColumnPxWidth) {
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
      document.dispatchEvent(new CustomEvent('resize-custom-elements'));

      // This is to prevent unnecessary resize event on timer check (next function below)
      window.globals.webState.dynamic.lastPanelPxWidth =
        window.globals.webState.dynamic.panelPxWidth;
      window.globals.webState.dynamic.lastClientHeight =
        window.globals.webState.dynamic.panelPxHeight;
    }
  };

  /**
   * Timer service routine to check for changes in page size
   * Typically appearance or disappearance of vertical slider causes this.
   * @fires resize-custom-elements
   */
  _checkVerticalSliderPageWidth () {
    this._updatePageMeasurements();

    // skip if not initialized
    if (window.globals.webState.dynamic.testAreaColumnPxWidth) {
      // Case of making window visible/hidden add or remove vertical slider, change width.
      // There is no event to catch this so it's done on a timer.
      if ((window.globals.webState.dynamic.lastPanelPxWidth !==
        window.globals.webState.dynamic.panelPxWidth) ||
        (window.globals.webState.dynamic.lastPanelPxHeight !==
          window.globals.webState.dynamic.panelPxHeight)) {
        window.globals.webState.dynamic.lastPanelPxWidth =
          window.globals.webState.dynamic.panelPxWidth;
        window.globals.webState.dynamic.lastPanelPxHeight =
          window.globals.webState.dynamic.panelPxHeight;

        // Resize textarea elements
        document.dispatchEvent(new CustomEvent('resize-custom-elements'));
      }
    }
  }; // _checkVerticalSliderPageWidth()

  /**
   * Button event handlers can call this during debug
   */
  manualRecalcPageWidth () {
    this._updatePageMeasurements();

    // recalibrate pixel width of textarea elements
    this._calibrateElementSize();

    // Resize textarea elements
    document.dispatchEvent(new CustomEvent('resize-custom-elements'));
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
    window.globals.webState.dynamic.lastPanelPxWidth =
     window.globals.webState.dynamic.panelPxWidth;
    this._calibrateElementSize();
    // Resize textarea elements
    document.dispatchEvent(new CustomEvent('resize-custom-elements',
      {
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
        { detail: { theme: 'dark' } }));
    }
    if ((localStorageColorTheme) && (localStorageColorTheme.theme === 'light')) {
      document.querySelector('body').setAttribute('theme', 'light');
      document.dispatchEvent(new CustomEvent('color-theme-changed',
        { detail: { theme: 'light' } }));
    }

    //
    // And do same one more time...
    // and again, as a work around to prevent to correct
    // condition where textarea about 80% of normal on first page load.
    //
    setTimeout(() => {
      this._calibrateElementSize();
      // Resize textarea elements
      document.dispatchEvent(new CustomEvent('resize-custom-elements'));
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
