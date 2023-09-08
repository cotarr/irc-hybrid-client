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
//    Show raw IRC server messages
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
    this.shadowRoot.getElementById('panelMessageDisplayId').value += '----- Active -----\n';
  };

  _pauseCollectingRawMessages = () => {
    this.shadowRoot.getElementById('pauseButtonId').textContent = 'Start';
    this.shadowRoot.getElementById('titleDivId').textContent = 'Raw Server Messages (Paused)';
    this.shadowRoot.getElementById('panelDivId').removeAttribute('collecting');
    this.shadowRoot.getElementById('panelMessageDisplayId').value += '----- Paused -----\n';
  };

  /**
   * Scroll web component to align top of panel with top of viewport and set focus
   */
  _scrollToTop = () => {
    this.focus();
    const newVertPos = window.scrollY + this.getBoundingClientRect().top - 50;
    window.scrollTo({ top: newVertPos, behavior: 'smooth' });
  };

  /**
   * Make panel visible
   */
  showPanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible', '');
    this._scrollToTop();
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
        if (this.shadowRoot.getElementById('showRawInHexCheckboxId').checked) {
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

  displayParsedServerMessage = (parsedMessage) => {
    if ((!window.globals.webState.cacheReloadInProgress) &&
      (this.shadowRoot.getElementById('panelDivId').hasAttribute('collecting')) &&
      (this.shadowRoot.getElementById('appendParsedMessageCheckboxId').checked)) {
      this.shadowRoot.getElementById('panelMessageDisplayId').value +=
        JSON.stringify(parsedMessage, null, 2) + '\n';
      // scroll to view new text
      this.shadowRoot.getElementById('panelMessageDisplayId').scrollTop =
      this.shadowRoot.getElementById('panelMessageDisplayId').scrollHeight;
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
    // Debug option to enable logging at page load.
    if (document.location.hash === '#LOG_RAW') {
      this._startCollectingRawMessages();
      this.showPanel();
      document.getElementById('debugPanel').showPanel();
      console.log(
        'Debug: Detected URL hash=#LOG_RAW. Enabled raw log before page initialization.');
    }
    // -------------------------------------
    // 1 of 2 Listeners on internal elements
    // -------------------------------------

    this.shadowRoot.getElementById('closePanelButtonId').addEventListener('click', () => {
      this.hidePanel();
    });

    this.shadowRoot.getElementById('clearButtonId').addEventListener('click', () => {
      this.shadowRoot.getElementById('panelMessageDisplayId').value = '';
    });

    this.shadowRoot.getElementById('showHelpButtonId').addEventListener('click', () => {
      const helpPanelEl = this.shadowRoot.getElementById('helpPanelId');
      const helpPanel2El = this.shadowRoot.getElementById('helpPanel2Id');
      if (helpPanelEl.hasAttribute('hidden')) {
        helpPanelEl.removeAttribute('hidden');
        helpPanel2El.removeAttribute('hidden');
        this._scrollToTop();
      } else {
        helpPanelEl.setAttribute('hidden', '');
        helpPanel2El.setAttribute('hidden', '');
      }
    });

    this.shadowRoot.getElementById('showHelpButton2Id').addEventListener('click', () => {
      const helpPanelEl = this.shadowRoot.getElementById('helpPanelId');
      const helpPanel2El = this.shadowRoot.getElementById('helpPanel2Id');
      if (helpPanelEl.hasAttribute('hidden')) {
        helpPanelEl.removeAttribute('hidden');
        helpPanel2El.removeAttribute('hidden');
        this._scrollToTop();
      } else {
        helpPanelEl.setAttribute('hidden', '');
        helpPanel2El.setAttribute('hidden', '');
      }
    });

    this.shadowRoot.getElementById('pauseButtonId').addEventListener('click', () => {
      if (this.shadowRoot.getElementById('panelDivId').hasAttribute('collecting')) {
        this._pauseCollectingRawMessages();
      } else {
        this._startCollectingRawMessages();
      }
    });

    this.shadowRoot.getElementById('cacheButtonId').addEventListener('click', () => {
      const panelMessageDisplayEl = this.shadowRoot.getElementById('panelMessageDisplayId');
      // Stop collection
      this._pauseCollectingRawMessages();
      // Erase previous content
      panelMessageDisplayEl.value = '';

      // Fetch cache from server
      //
      const fetchTimeout = document.getElementById('globVars').constants('fetchTimeout');
      const activitySpinnerEl = document.getElementById('activitySpinner');
      const fetchController = new AbortController();
      const fetchOptions = {
        method: 'GET',
        redirect: 'error',
        signal: fetchController.signal,
        headers: {
          Accept: 'application/json'
        }
      };
      const fetchURL = document.getElementById('globVars').webServerUrl + '/irc/cache';
      activitySpinnerEl.requestActivitySpinner();
      const fetchTimerId = setTimeout(() => fetchController.abort(), fetchTimeout);
      fetch(fetchURL, fetchOptions)
        .then((response) => {
          if (response.status === 200) {
            return response.json();
          } else {
            // Retrieve error message from remote web server and pass to error handler
            return response.text()
              .then((remoteErrorText) => {
                const err = new Error('HTTP status error');
                err.status = response.status;
                err.statusText = response.statusText;
                err.remoteErrorText = remoteErrorText;
                throw err;
              });
          }
        })
        .then((responseArray) => {
          if (fetchTimerId) clearTimeout(fetchTimerId);
          activitySpinnerEl.cancelActivitySpinner();
          if (Array.isArray(responseArray)) {
            let lineCount = 0;
            let charCount = 0;
            if (responseArray.length > 1) {
              const index = [];
              // create index array
              for (let i = 0; i < responseArray.length; i++) index.push(i);
              // sort the index
              for (let i = 0; i < responseArray.length; i++) {
                let inOrder = true;
                for (let j = 0; j < responseArray.length - 1; j++) {
                  const date1 =
                    new Date(responseArray[index[j]].split(' ')[0].replace('@time=', ''));
                  const date2 =
                    new Date(responseArray[index[j + 1]].split(' ')[0].replace('@time=', ''));
                  if (date1 > date2) {
                    inOrder = false;
                    const tempIndex = index[j + 1];
                    index[j + 1] = index[j];
                    index[j] = tempIndex;
                  }
                } // next j
                if (inOrder) break;
              } // next i
              // fill textarea using index applied to array
              for (let i = 0; i < responseArray.length; i++) {
                // add cached message
                panelMessageDisplayEl.value += responseArray[index[i]].toString() + '\n';
                lineCount++;
                charCount += responseArray[index[i]].toString().length;
              }
              const statsStr =
                '----------------------------\n' +
                charCount.toString() + ' characters, ' +
                lineCount.toString() + ' lines\n' +
                '----------------------------\n';
              this.shadowRoot.getElementById('panelMessageDisplayId').value += statsStr;
            } else if (responseArray.length === 1) {
              panelMessageDisplayEl.value = responseArray[0];
            }
            // scroll to most recent
            panelMessageDisplayEl.scrollTop = panelMessageDisplayEl.scrollHeight;
          }
        })
        .catch((err) => {
          console.log(err);
          if (fetchTimerId) clearTimeout(fetchTimerId);
          activitySpinnerEl.cancelActivitySpinner();
          // Build generic error message to catch network errors
          let message = ('Fetch error, ' + fetchOptions.method + ' ' + fetchURL + ', ' +
            (err.message || err.toString() || 'Error'));
          if (err.status) {
            // Case of HTTP status error, build descriptive error message
            message = ('HTTP status error, ') + err.status.toString() + ' ' +
              err.statusText + ', ' + fetchOptions.method + ' ' + fetchURL;
          }
          if (err.remoteErrorText) {
            message += ', ' + err.remoteErrorText;
          }
          // keep first line
          message = message.split('\n')[0];
          document.getElementById('errorPanel').showError(message);
        });
    });

    this.shadowRoot.getElementById('exampleSampleMessageButtonId').addEventListener('click', () => {
      this.shadowRoot.getElementById('panelMessageInputId').value =
        '@time=2023-09-08T14:53:41.504Z ERROR :This is example RFC-2812 formatted IRC ' +
        'error message for display in IRC Server panel';
    });

    this.shadowRoot.getElementById('parseSampleMessageButtonId').addEventListener('click', () => {
      const errorPanelEl = document.getElementById('errorPanel');
      const panelMessageInputEl = this.shadowRoot.getElementById('panelMessageInputId');
      if (!window.globals.ircState.ircConnected) {
        errorPanelEl.showError('Sample message parsing requires connection to IRC server');
        return;
      }
      if ((!(panelMessageInputEl.value)) || (panelMessageInputEl.value.length < 1)) {
        errorPanelEl.showError('Sample IRC message was empty string');
        return;
      };
      if (panelMessageInputEl.value.split('\n').length !== 1) {
        errorPanelEl.showError('Multi-line input not allowed. Omit end-of-line characters');
        return;
      }
      if (this.shadowRoot.getElementById('panelDivId').hasAttribute('collecting')) {
        this.shadowRoot.getElementById('panelMessageDisplayId').value +=
          panelMessageInputEl.value + '\n';
        // scroll to view new text
        this.shadowRoot.getElementById('panelMessageDisplayId').scrollTop =
        this.shadowRoot.getElementById('panelMessageDisplayId').scrollHeight;
      }
      document.getElementById('remoteCommandParser').parseBufferMessage(panelMessageInputEl.value);
    });

    this.shadowRoot.getElementById('saveSampleMessageButtonId').addEventListener('click', () => {
      const panelMessageInputEl = this.shadowRoot.getElementById('panelMessageInputId');
      if ((!(panelMessageInputEl)) || (panelMessageInputEl.value.length < 1)) {
        window.localStorage.removeItem('savedExampleIrcMessage');
      } else {
        const message = panelMessageInputEl.value;
        window.localStorage.setItem('savedExampleIrcMessage',
          JSON.stringify({ message: message }));
      }
    });

    this.shadowRoot.getElementById('loadSampleMessageButtonId').addEventListener('click', () => {
      let savedMessage = null;
      try {
        const savedObject = window.localStorage.getItem('savedExampleIrcMessage');
        if (savedObject) {
          savedMessage = JSON.parse(savedObject).message;
        }
      } catch (error) {
        console.log(error);
      }
      if (savedMessage) {
        this.shadowRoot.getElementById('panelMessageInputId').value = savedMessage;
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
        this.shadowRoot.getElementById('panelMessageInputId')
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
