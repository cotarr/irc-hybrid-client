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
// This web component is a developer interface used to debug the program.
//
// ------------------------------------------------------------------------------
//
// Public Methods:
//   showPanel()
//   collapsePanel()
//   hidePanel()
//
// ------------------------------------------------------------------------------

'use strict';
window.customElements.define('debug-panel', class extends HTMLElement {
  constructor () {
    super();
    const template = document.getElementById('debugPanelTemplate');
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

  showPanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible', '');
    document.dispatchEvent(new CustomEvent('cancel-zoom'));
    this._scrollToTop();
  };

  // this panel does not collapse, so close it.
  collapsePanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible');
  };

  hidePanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible');
  };

  /**
   * Add formatted text to the Debug Result panel
   * Multi-line values should append \n
   * @param {string} formattedText - Test for display
   */
  appendDebugResult = (formattedText) => {
    this.shadowRoot.getElementById('debugResponseSectionId').removeAttribute('hidden');
    this.shadowRoot.getElementById('debugResponsePreId').textContent += formattedText;
  };

  /**
   * Erase Debug Result area
   */
  clearDebugResult = () => {
    this.shadowRoot.getElementById('debugResponseSectionId').setAttribute('hidden', '');
    this.shadowRoot.getElementById('debugResponsePreId').textContent = '';
  };

  _test1ButtonHandler = () => {
    // ---------------------------------
    console.log('Test1 button pressed.');
    this.appendDebugResult('Memory Usage\nNodeJs garbage collect response\n');
    const fetchController = new AbortController();
    const fetchOptions = {
      method: 'GET',
      redirect: 'error',
      signal: fetchController.signal,
      headers: {
        Accept: 'application/json'
      }
    };
    const fetchURL = document.getElementById('globVars').webServerUrl + '/irc/test1';
    const fetchTimerId = setTimeout(() => fetchController.abort(), 5000);
    fetch(fetchURL, fetchOptions)
      .then((response) => {
        if (response.ok) {
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
      .then((responseJson) => {
        this.appendDebugResult(JSON.stringify(responseJson, null, 2));
        console.log(JSON.stringify(responseJson, null, 2));
        if (fetchTimerId) clearTimeout(fetchTimerId);
        if (responseJson.error) {
          throw new Error(responseJson.error);
        }
      })
      .catch((err) => {
        if (fetchTimerId) clearTimeout(fetchTimerId);
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
        console.error(message);
        // keep 1 line
        message = message.split('\n')[0];
        document.getElementById('errorPanel').showError(message);
      });
    // ---------------------------------
  };

  _test2ButtonHandler = () => {
    // ---------------------------------
    console.log('Test1 button pressed.');
    const fetchController = new AbortController();
    const fetchOptions = {
      method: 'GET',
      redirect: 'error',
      signal: fetchController.signal,
      headers: {
        Accept: 'application/json'
      }
    };
    const fetchURL = document.getElementById('globVars').webServerUrl + '/irc/test2';
    const fetchTimerId = setTimeout(() => fetchController.abort(), 5000);
    fetch(fetchURL, fetchOptions)
      .then((response) => {
        if (response.ok) {
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
      .then((responseJson) => {
        console.log(JSON.stringify(responseJson, null, 2));
        if (fetchTimerId) clearTimeout(fetchTimerId);
        if (responseJson.error) {
          throw new Error(responseJson.error);
        }
      })
      .catch((err) => {
        if (fetchTimerId) clearTimeout(fetchTimerId);
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
        console.error(message);
        // keep 1 line
        message = message.split('\n')[0];
        document.getElementById('errorPanel').showError(message);
      });
    // ---------------------------------
  };

  _test3ButtonHandler = () => {
    // ---------------------------------
    this.clearDebugResult();
    console.log('Test3 button pressed.');
    this.appendDebugResult('Websocket Ping\n');
    console.log('Echo request GET /irc/test3');
    window.globals.startTimeMsTest3 = Date.now();
    const fetchController = new AbortController();
    const fetchOptions = {
      method: 'GET',
      redirect: 'error',
      signal: fetchController.signal,
      headers: {
        Accept: 'application/json'
      }
    };
    const fetchURL = document.getElementById('globVars').webServerUrl + '/irc/test3';
    const fetchTimerId = setTimeout(() => fetchController.abort(), 5000);
    fetch(fetchURL, fetchOptions)
      .then((response) => {
        if (response.status === 201) {
          const pong1 = Date.now() - window.globals.startTimeMsTest3;
          this.appendDebugResult('Fetch response:     ' + pong1.toString() + ' ms\n');
          console.log('Fetch response:  ' + pong1.toString() + ' ms');
          if (fetchTimerId) clearTimeout(fetchTimerId);
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
      .catch((err) => {
        if (fetchTimerId) clearTimeout(fetchTimerId);
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
        console.error(message);
        // keep 1 line
        message = message.split('\n')[0];
        document.getElementById('errorPanel').showError(message);
      });
    // ---------------------------------
  }; // _test3ButtonHandler()

  _test4ButtonHandler = () => {
    // ---------------------------------
    console.log('Test 3 button: expire heart beat timer');
    setTimeout(() => {
      const websocketPanelEl = document.getElementById('websocketPanel');
      websocketPanelEl.heartbeatUpCounter =
        websocketPanelEl.heartbeatExpirationTimeSeconds - 1;
    }, 2000);
    // ---------------------------------
  }; // _test4ButtonHandler()

  // ------------------
  // Main entry point
  // ------------------
  // initializePlugin = () => {
  // };

  // -------------------------------------------
  // add event listeners to connected callback
  // -------------------------------------------
  connectedCallback () {
    // Debug option to open panel at page load.
    if (document.location.hash === '#DEBUG') {
      this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible', '');
      console.log('Debug: Detected URL hash=#DEBUG. Opened Debug panel at page load.');
    }

    // -------------------------------------
    // 1 of 3 Listeners on internal elements
    // -------------------------------------
    // -------------------------------------
    // Panel Close Button
    // -------------------------------------
    this.shadowRoot.getElementById('closePanelButtonId').addEventListener('click', () => {
      this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible');
    });

    this.shadowRoot.getElementById('forceDisconnectButtonId').addEventListener('click', () => {
      document.getElementById('ircControlsPanel').forceDisconnectHandler()
        .catch((err) => {
          console.log(err);
          let message = err.message || err.toString() || 'Error occurred calling /irc/connect';
          // show only 1 line
          message = message.split('\n')[0];
          document.getElementById('errorPanel').showError(message);
        });
    });

    this.shadowRoot.getElementById('eraseCacheButtonId').addEventListener('click', () => {
      document.getElementById('ircControlsPanel').eraseIrcCache('CACHE')
        .catch((err) => {
          console.log(err);
          let message = err.message || err.toString() || 'Error occurred calling /irc/connect';
          // show only 1 line
          message = message.split('\n')[0];
          document.getElementById('errorPanel').showError(message);
        });
    });

    this.shadowRoot.getElementById('serverTerminateButtonId').addEventListener('click', () => {
      document.getElementById('ircControlsPanel').webServerTerminate()
        .catch((err) => {
          console.log(err);
          let message = err.message || err.toString() || 'Error occurred calling /irc/connect';
          // show only 1 line
          message = message.split('\n')[0];
          document.getElementById('errorPanel').showError(message);
        });
    });

    // -------------------------------------
    // 2 of 3 Listeners on global events
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

    // document.addEventListener('color-theme-changed', (event) => {
    //   const panelDivEl = this.shadowRoot.getElementById('panelDivId');
    //   if (event.detail.theme === 'light') {
    //     panelDivEl.classList.remove('debug-panel-theme-dark');
    //     panelDivEl.classList.add('debug-panel-theme-light');
    //   } else {
    //     panelDivEl.classList.remove('debug-panel-theme-light');
    //     panelDivEl.classList.add('debug-panel-theme-dark');
    //   }
    // });

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

    // -------------------------------------
    // 3 of 3 Debug Button Listeners
    // -------------------------------------

    // --------------------------
    // Remote Server Functions
    // --------------------------
    this.shadowRoot.getElementById('button_1_1').addEventListener('click', () => {
      this._test2ButtonHandler();
    });

    this.shadowRoot.getElementById('button_1_2').addEventListener('click', () => {
      this._test4ButtonHandler();
    });

    this.shadowRoot.getElementById('button_1_3').addEventListener('click', () => {
      this._test1ButtonHandler();
    });

    this.shadowRoot.getElementById('button_1_4').addEventListener('click', () => {
      this._test3ButtonHandler();
    });

    // --------------------------
    // Display Functions
    // --------------------------
    this.shadowRoot.getElementById('button_2_1').addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('show-all-panels', {
        detail: {
          except: [],
          debug: true
        }
      }));
    });
    this.shadowRoot.getElementById('button_2_2').addEventListener('click', () => {
      document.getElementById('activitySpinner').requestActivitySpinner();
      document.getElementById('headerBar').setHeaderBarIcons({
        hideNavMenu: false,
        webConnect: 'connected',
        ircConnect: 'connected',
        wait: true,
        zoom: true,
        away: true,
        serverUnread: true,
        channelUnread: true,
        privMsgUnread: true,
        noticeUnread: true,
        wallopsUnread: true,
        nickRecovery: true,
        enableAudio: true
      });
      document.getElementById('headerBar')._updateDynamicElementTitles();
    });
    this.shadowRoot.getElementById('button_2_3').addEventListener('click', () => {
      document.getElementById('displayUtils').toggleColorTheme();
    });
    this.shadowRoot.getElementById('button_2_4').addEventListener('click', () => {
      document.getElementById('displayUtils').manualRecalcPageWidth();
    });
    this.shadowRoot.getElementById('button_2_5').addEventListener('click', () => {
      setTimeout(() => {
        document.getElementById('errorPanel').showError('This is an example error message');
      }, 100);
    });
    // --------------------
    // Data and Variables
    // --------------------
    this.shadowRoot.getElementById('button_3_1').addEventListener('click', () => {
      document.getElementById('showIrcState').showPanel();
    });
    this.shadowRoot.getElementById('button_3_2').addEventListener('click', () => {
      document.getElementById('showWebState').showPanel();
    });
    this.shadowRoot.getElementById('button_3_3').addEventListener('click', () => {
      document.getElementById('showRaw').showPanel();
    });
    this.shadowRoot.getElementById('button_3_4').addEventListener('click', () => {
      document.getElementById('showEvents').showPanel();
    });
    // --------------------
    //
    // --------------------
    this.shadowRoot.getElementById('button_4_1').addEventListener('click', () => {
      // returns promise
      document.getElementById('ircControlsPanel').getIrcState()
        .catch(() => {
        });
    });

    this.shadowRoot.getElementById('button_4_2').addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('update-from-cache'));
    });

    this.shadowRoot.getElementById('button_4_3').addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('irc-state-changed'));
    });

    this.shadowRoot.getElementById('button_4_4').addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('web-connect-changed'));
    });

    // ----------------------------------
    // Audio media playback functions
    // ----------------------------------
    this.shadowRoot.getElementById('button_5_1').addEventListener('click', () => {
      document.getElementById('beepSounds').testPlayBeepSound1();
    });
    this.shadowRoot.getElementById('button_5_2').addEventListener('click', () => {
      document.getElementById('beepSounds').testPlayBeepSound2();
    });
    this.shadowRoot.getElementById('button_5_3').addEventListener('click', () => {
      document.getElementById('beepSounds').testPlayBeepSound3();
    });

    // --------------------
    // Adhoc Functions
    // --------------------
    this.shadowRoot.getElementById('button_6_1').addEventListener('click', () => {
      console.log('Adhoc Function is not defined (debug-panel)');
      this.clearDebugResult();
      this.appendDebugResult('Adhoc function not defined\n');
      // const el = document.getElementById('manageChannelsPanel');
      // const wTop = window.scrollY;
      // console.log('scrollY wTop', wTop);
      // const eTop = el.getBoundingClientRect().top;
      // console.log('bounding eTop', eTop);
      // // window.scroll(0, wTop + eTop - 50);
      // window.scrollTo({
      //   top: wTop + eTop - 50,
      //   behavior: 'smooth'
      // });
    });
  }; // connectedCallback()
}); // customElements.define
