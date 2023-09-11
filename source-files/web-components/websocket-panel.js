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
//    Websocket Management
//
// --------------------------------------------------------------------------------
//
//                     Web Server Authentication notes
//
// These HTML pages are authenticated by session cookies.
// The API routes (GET, POST) are authenticated by session cookies.
// The websocket connection (ws://, wss://) upgrade request is manually
// authenticated in backend using the browser provided cookie.
//
// Connection sequence.
//    1) Call _initWebSocketAuth() returns Promise to _connectWebSocket()
//    1) _initWebSocketAuth send POST request to /irc/wsauth starting 10 second auth window
//    2) Upon POST response, Promise resolve back to _connectWebSocket() to initiate connection
//    3) Browser passes current cookie to the websocket server for validation
//    5) Upon successful open event of web socket, web page calls getIrcState().
//    6) Upon successful response event from ircGetState, browser is "connected"
//
// --------------------------------------------------------------------------------
//
// Public Methods
//   showPanel()
//   collapsePanel()
//   hidePanel()
//   firstWebSocketConnectOnPageLoad()
//   webConnectNavBarMenuHandler(action)
//   webConnectHeaderBarIconHandler()
//   onHeartbeatReceived()
//

// Panel Visibility
//   HTML template: websocket-panel hidden by default at load
//   Page Load: websocket-panel remains hidden during initial connect, spinner is going
//   First Connect: Hide spinner, websocket-panel remains hidden
//   Websocket event: 'open" --> fetch request by calling getIrcState()
//      ircGetState() success --> Hide websocket-panel
//      ircGetState() error --> Show websocket-panel (remains visible)
//
//   Websocket event: 'close' --> Show websocket-panel, attempt reconnect
//   Websocket event: 'error' --> Show websocket-panel, attempt reconnect
//
//   Scroll:  No scroll, is only panel visible when websocket not connected
// --------------------------------------------------------------------------------
'use strict';
window.customElements.define('websocket-panel', class extends HTMLElement {
  constructor () {
    super();
    const template = document.getElementById('websocketPanelTemplate');
    const templateContent = template.content;
    this.attachShadow({ mode: 'open' })
      .appendChild(templateContent.cloneNode(true));
    this.firstConnect = true;
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

  /**
   * Update panel visibility and set custom events to notify other panels
   * @fires web-connect-changed
   * @fires hide-all-panels
   */
  _updateWebsocketStatus = () => {
    if (!window.globals.webState.webConnected) {
      //
      // Disconnected
      //
      document.dispatchEvent(new CustomEvent('web-connect-changed'));
      this.showPanel();
      document.dispatchEvent(new CustomEvent('hide-all-panels', {
        detail: {
          except: ['websocketPanel']
        }
      }));
    } else if (window.globals.webState.webConnecting) {
      //
      // Connecting...
      //
      document.dispatchEvent(new CustomEvent('web-connect-changed'));
      this.showPanel();
      document.dispatchEvent(new CustomEvent('hide-all-panels', {
        detail: {
          except: ['websocketPanel']
        }
      }));
    } else {
      //
      // Connected
      //
      document.dispatchEvent(new CustomEvent('web-connect-changed'));
    }
  };

  /**
   * Notify web server to expect connection request within the next 10 seconds
   * The request is expected to have a valid session cookie.
   * @returns {promise} Resolves to empty object literal, else reject error.
   */
  _initWebSocketAuth = () => {
    return new Promise((resolve, reject) => {
      const fetchController = new AbortController();
      const fetchTimeout = document.getElementById('globVars').constants('fetchTimeout');
      const activitySpinnerEl = document.getElementById('activitySpinner');
      const fetchOptions = {
        method: 'POST',
        redirect: 'error',
        signal: fetchController.signal,
        headers: {
          'CSRF-Token': document.getElementById('globVars').csrfToken,
          'Content-type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ purpose: 'websocket-auth' })
      };
      const fetchURL = document.getElementById('globVars').webServerUrl + '/irc/wsauth';
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
        .then((responseJson) => {
          // console.log(JSON.stringify(responseJson, null, 2));
          if (fetchTimerId) clearTimeout(fetchTimerId);
          activitySpinnerEl.cancelActivitySpinner();
          resolve(window.globals.ircState);
        })
        .catch((err) => {
          if (fetchTimerId) clearTimeout(fetchTimerId);
          activitySpinnerEl.cancelActivitySpinner();
          window.globals.webState.webConnected = false;
          window.globals.webState.webConnecting = false;
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
          const error = new Error(message);
          reject(error);
          // TODO  updateDivVisibility();
        });
    }); // promise
  }; // _initWebSocketAuth

  /**
   * Function to connect web socket to web server.
   */
  _connectWebSocket = () => {
    // Create WebSocket connection.
    // This replaces temporary dummy variable
    window.globals.wsocket =
      new WebSocket(document.getElementById('globVars').webSocketUrl + '/irc/ws');

    // Counter to avoid duplication of websockets
    window.globals.webState.websocketCount++;
    // console.log('Creating new websocket, count: ' + window.globals.webState.websocketCount);
    // -----------------------
    // On Open event handler
    // -----------------------
    window.globals.wsocket.addEventListener('open', (event) => {
      // console.log('Websocket open, count: ' + window.globals.webState.websocketCount);
      window.globals.webState.webConnected = true;
      window.globals.webState.webConnecting = false;
      window.globals.webState.times.webConnect = Math.floor(Date.now() / 1000);
      window.globals.webState.count.webConnect++;
      this.shadowRoot.getElementById('reconnectStatusDivId').textContent +=
        'Websocket opened successfully\n';
      this._updateWebsocketStatus();

      this._resetHeartbeatTimer();

      // load state of IRC connection
      // returns Promise, log's own fetch errors
      document.getElementById('ircControlsPanel').getIrcState()
        .then(() => {
          // Clear web socket status panel
          this.shadowRoot.getElementById('reconnectStatusDivId').textContent =
            'Websocket opened successfully\n';
          this.hidePanel();
          if (this.firstConnect) {
            this.firstConnect = false;
            document.getElementById('activitySpinner').cancelActivitySpinner();
          }
          // panels will update new contents from cache
          document.dispatchEvent(new CustomEvent('update-from-cache'));
        })
        .catch((err) => {
          console.log(err);
          let message = err.message || err.toString() || 'Error calling getIrcState()';
          // limit to 1 line
          message = message.split('\n')[0];
          document.getElementById('errorPanel').showError(message);
          document.getElementById('errorPanel').showError(
            'Error calling getIrcState() after web socket connection.');
          this.shadowRoot.getElementById('reconnectStatusDivId').textContent +=
            'Error calling getIrcState() after web socket connection.\n';
          // Disconnect web socket

          this.shadowRoot.getElementById('reconnectStatusDivId').textContent +=
            'Closing websocket\n';
          window.globals.webState.webConnectOn = false;
          if (window.globals.wsocket) {
            // Closing the web socket will generate a 'close' event.
            window.globals.wsocket.close(3002, 'Closed due to getIrcState() error.');
          }

          //
          // Error occurred, show error and then close other windows.
          //
          this.showPanel();
          document.dispatchEvent(new CustomEvent('hide-all-panels', {
            detail: {
              except: ['websocketPanel']
            }
          }));
        });
    });
    /**
     * Event handler for websocket close events
     * @listens websocket:close
     * @property {object} event
     */
    window.globals.wsocket.addEventListener('close', (event) => {
      // If a new socket is spawned before the fault one had disappeared,
      // then allow multiple web sockets. When socket count is zero,
      // then we are not reconnected, and must set the state to not-connected.
      if (window.globals.webState.websocketCount > 0) {
        window.globals.webState.websocketCount--;
        console.log('Websocket closed, count: ' + window.globals.webState.websocketCount +
          ' code: ' + event.code + ' ' + event.reason);
        if (window.globals.webState.websocketCount === 0) {
          if (window.globals.webState.webConnected) {
            if (('code' in event) && (event.code === 3001)) {
              this.shadowRoot.getElementById('reconnectStatusDivId').textContent +=
                'Web page disconnected at user request.\n' +
                'Auto-reconnect disabled\n';
            } else {
              this.shadowRoot.getElementById('reconnectStatusDivId').textContent +=
              'Web socket connection closed, count: ' +
              window.globals.webState.websocketCount + '\n' +
              'Code: ' + event.code + ' ' + event.reason + '\n';
              if (!window.globals.webState.webConnectOn) {
                window.shadowRoot.getElementById('reconnectStatusDivId').textContent +=
                'Automatic web reconnect is disabled. \nPlease reconnect manually.\n';
              }
            }
          }
          window.globals.webState.webConnected = false;
          window.globals.webState.webConnecting = false;
          this._updateWebsocketStatus();
        }
      }
    });

    /**
     * Event handler for websocket error events
     * @listens websocket:error
     * @property {object} event
     */
    window.globals.wsocket.addEventListener('error', (error) => {
      if (error) {
        let errMessage = error.message || error.toString() || 'Websocket error event occurred';
        console.log(errMessage);
        // take only first line
        errMessage = errMessage.split('\n')[0];
        this.shadowRoot.getElementById('reconnectStatusDivId').textContent +=
          'Websocket Error \n';
      }
      // showError('WebSocket error occurred.');
      window.globals.webState.webConnected = false;
      window.globals.webState.webConnecting = false;
      this._updateWebsocketStatus();
    });

    // -----------------------------------------------------------------------------
    //                  On Data Event handler
    // -----------------------------------------------------------------------------
    // UTF8 data coming in over web socket can break input lines
    // such that message block may not end in a CR-LF or LF.
    // Therefore it is necessary to parse stream character by character,
    // remove the CR, split by LF, but if the message data block
    // does not end in a LF, then wait for next data and merge old and new message.
    // -----------------------------------------------------------------------------

    // -------------------------------------------------------------------------
    // Process Buffer object from socket stream
    //
    // Combine previous message fragment with incoming Buffer of UTF-8 characters
    // Split stream into messages using CR-LF 0x10 0x13 as message delimiter
    // Pass each message to message parse function as type Buffer
    // If left over characters not terminated in CR-LF, save as next fragment
    // -------------------------------------------------------------------------

    let previousBufferFragment = '';
    /**
     * Function to re-combine strings that are split between websocket packets.
     * Calls _parseBufferMessage(message) to process result
     * @param {string} inBuffer - String for last websocket data event
     */
    const parseStreamBuffer = (inBuffer) => {
      if (!inBuffer) return;
      const data = previousBufferFragment.concat(inBuffer);
      previousBufferFragment = '';
      const len = data.length;
      if (len === 0) return;
      let index = 0;
      let count = 0;
      for (let i = 0; i < len; i++) {
        // this is a 8 bit integer
        const charCode = data.charCodeAt(i);
        if ((charCode !== 10) && (charCode !== 13)) {
          // valid message character
          count = count + 1;
        } else {
          // case of CR or LF as message separator
          if (count > 0) {
            const message = data.slice(index, index + count);
            // console.log('websocketPanel:', message);
            document.getElementById('showRaw').displayRawIrcServerMessage(message);
            document.getElementById('remoteCommandParser').parseBufferMessage(message);
          }
          index = i + 1;
          count = 0;
        }
      }
      if (count > 0) {
        previousBufferFragment = data.slice(index, index + count);
      }
    };

    /**
     * Event listener for incoming IRC messages in the websocket stream.
     * @listens websocket:message
     */
    window.globals.wsocket.addEventListener('message', (event) => {
      // console.log(event.data);
      parseStreamBuffer(event.data);
    });
  };

  /**
   * Perform network GET request to /status to see if web server is running.
   * @returns {promise} Resolves to empty object literal, else reject error.
   */
  _testWebServerRunning = () => {
    return new Promise((resolve, reject) => {
      const fetchController = new AbortController();
      const fetchTimeout = document.getElementById('globVars').constants('fetchTimeout');
      const activitySpinnerEl = document.getElementById('activitySpinner');
      const fetchOptions = {
        method: 'GET',
        redirect: 'error',
        signal: fetchController.signal,
        headers: {
          Accept: 'application/json'
        }
      };
      const fetchURL = document.getElementById('globVars').webServerUrl + '/status';
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
        .then((responseJson) => {
          // console.log(JSON.stringify(responseJson, null, 2));
          if (fetchTimerId) clearTimeout(fetchTimerId);
          activitySpinnerEl.cancelActivitySpinner();
          if ((Object.hasOwn(responseJson, 'status')) && (responseJson.status === 'ok')) {
            resolve({});
          } else {
            const statErr = new Error('Call to /status did not return ok');
            reject(statErr);
          }
        })
        .catch((err) => {
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
          const error = new Error(message);
          this.shadowRoot.getElementById('reconnectStatusDivId').textContent +=
            'Error: No internet or server down\n';
          reject(error);
        });
    });
  };

  /**
   * Perform network GET request to /secure to see if session cookie is authorized.
   * @returns {promise} Resolves to empty object literal, else reject error.
   */
  _testWebServerLoginCookie = () => {
    return new Promise((resolve, reject) => {
      const fetchController = new AbortController();
      const fetchTimeout = document.getElementById('globVars').constants('fetchTimeout');
      const activitySpinnerEl = document.getElementById('activitySpinner');
      const fetchOptions = {
        method: 'GET',
        redirect: 'error',
        signal: fetchController.signal,
        headers: {
          Accept: 'application/json'
        }
      };
      const fetchURL = document.getElementById('globVars').webServerUrl + '/secure';
      activitySpinnerEl.requestActivitySpinner();
      const fetchTimerId = setTimeout(() => fetchController.abort(), fetchTimeout);
      fetch(fetchURL, fetchOptions)
        .then((response) => {
          if (response.status === 200) {
            return response.json();
          } else {
            console.log(response.status);
            //
            // If Status 403 redirect to /login
            if (response.status === 403) {
              window.location.href = '/login';
            }
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
          // console.log(JSON.stringify(responseJson, null, 2));
          if (fetchTimerId) clearTimeout(fetchTimerId);
          activitySpinnerEl.cancelActivitySpinner();
          if ((Object.hasOwn(responseJson, 'secure')) && (responseJson.secure === 'ok')) {
            resolve({});
          } else {
            const statErr = new Error('Call to /secure did not return ok');
            reject(statErr);
          }
        })
        .catch((err) => {
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
          const error = new Error(message);
          reject(error);
        });
    });
  };

  /**
   * Function to manage re-connection of disconnected web socket
   * 1) Test /status, 2) Test /secure, 3) Call function to open socket
   */
  _reConnectWebSocketAfterDisconnect = () => {
    this._testWebServerRunning()
      .then(() => {
        this.shadowRoot.getElementById('reconnectStatusDivId').textContent +=
          'Server found, Checking authorization.\n';
        return Promise.resolve({});
      })
      .then(this._testWebServerLoginCookie)
      .then(() => {
        this.shadowRoot.getElementById('reconnectStatusDivId').textContent +=
          'Login authorization confirmed, opening web socket.\n';
        return Promise.resolve({});
      })
      .then(this._initWebSocketAuth)
      .then(() => {
        this.shadowRoot.getElementById('reconnectStatusDivId').textContent +=
          'Authorizing websocket....\n';
        setTimeout(() => {
          this._connectWebSocket();
        }, 100);
      })
      .catch((err) => {
        let errMessage = err.message || err.toString() || 'Websocket Authorization Error';
        console.log(errMessage);
        // Limit to 1 line
        errMessage = errMessage.split('\n')[0];
        document.getElementById('errorPanel')
          .showError('Error connecting web socket: ' + errMessage);
        this.shadowRoot.getElementById('reconnectStatusDivId').textContent +=
          'Error: authorizing websocket.\n';
        window.globals.webState.webConnected = false;
        window.globals.webState.webConnecting = false;
        this._updateWebsocketStatus();
      });
  };

  /**
   * Function (called externally) to initiate a new websocket connection at page load.
   * This is called from js/_afterLoad.js after all panels have been loaded and initialized.
   */
  firstWebSocketConnectOnPageLoad = () => {
    // If a user had previously disconnected from the web server
    // the auto-connect of the web socket is persisted in future page loads
    const persistedWebsocketState =
      JSON.parse(window.localStorage.getItem('persistedWebsocketState'));
    if ((persistedWebsocketState) && (persistedWebsocketState.persist)) {
      this.shadowRoot.getElementById('persistCheckBoxId').checked = true;
    }
    if ((persistedWebsocketState) && (persistedWebsocketState.disabled)) {
      window.globals.webState.webConnectOn = false;
      this.shadowRoot.getElementById('reconnectStatusDivId').textContent =
        'Auto-reconnect disabled';
      this.showPanel();
      document.getElementById('activitySpinner').cancelActivitySpinner();
    } else {
      // Else not disabled, establish a new websocket connection on page load.
      window.globals.webState.webConnectOn = true;
      window.globals.webState.webConnecting = true;
      this._initWebSocketAuth()
        .then(() => {
          this.shadowRoot.getElementById('reconnectStatusDivId').textContent +=
            'Authorizing websocket....\n';
          setTimeout(() => {
            this._connectWebSocket();
          }, 100);
        })
        .catch((err) => {
          this.showPanel();
          let errMessage = err.message || err.toString() || 'Unknown error';
          console.log(errMessage);
          // limit to 1 line for display
          errMessage = errMessage.split('\n')[0];
          document.getElementById('errorPanel')
            .showError('Error connecting web socket ' + errMessage);
        });
    }
  };

  /**
   * Internal function to initiate a websocket connection on user request
   */
  _connectHandler = () => {
    if ((!window.globals.webState.webConnected) && (!window.globals.webState.webConnecting)) {
      window.globals.webState.webConnectOn = true;
      window.globals.webState.webConnecting = true;
      this._updateWebsocketStatus();
      this.shadowRoot.getElementById('reconnectStatusDivId').textContent +=
        'Reconnect to web server initiated (Manual)\n';
      this._reConnectWebSocketAfterDisconnect();
      // persist websocket disabled auto-reconnect on next page load
      const persist = this.shadowRoot.getElementById('persistCheckBoxId').checked;
      if (persist) {
        const persistedWebsocketStateObj = {
          persist: true,
          disabled: false
        };
        window.localStorage.setItem('persistedWebsocketState',
          JSON.stringify(persistedWebsocketStateObj));
      }
    }
  };

  /**
   * Internal function to disconnect a websocket connection on user request
   */
  _disconnectHandler = () => {
    if (window.globals.webState.webConnected) {
      this.shadowRoot.getElementById('reconnectStatusDivId').textContent =
        'Placing web browser in "standby".\n' +
        'Closing websocket to remote IRC client.\n';
      window.globals.webState.webConnectOn = false;
      if (window.globals.wsocket) {
        window.globals.wsocket.close(3001, 'Disconnect on request');
      }
      // persist websocket disabled auto-reconnect on next page load
      const persist = this.shadowRoot.getElementById('persistCheckBoxId').checked;
      if (persist) {
        const persistedWebsocketStateObj = {
          persist: true,
          disabled: true
        };
        window.localStorage.setItem('persistedWebsocketState',
          JSON.stringify(persistedWebsocketStateObj));
      }
    }
  };

  /**
   * Menu event handler called from nav-ban panel dropdown menu
   * @param {string} action - Values: 'connect', 'disconnect'
   */
  webConnectNavBarMenuHandler = (action) => {
    if (action === 'connect') {
      this._connectHandler();
    } else if (action === 'disconnect') {
      this._disconnectHandler();
    };
  };

  _webStatusIconTouchDebounce = false;
  /**
   * Click event handler called from header-bar panel when web status icon is clicked
   * to disconnect or reconnect websocket at user's request.
   */
  webConnectHeaderBarIconHandler = () => {
    // debounce button
    if (this._webStatusIconTouchDebounce) return;
    this._webStatusIconTouchDebounce = true;
    setTimeout(() => {
      this._webStatusIconTouchDebounce = false;
    }, 1000);
    // Toggle
    if ((!window.globals.webState.webConnected) && (!window.globals.webState.webConnecting)) {
      this._connectHandler();
    } else if (window.globals.webState.webConnected) {
      this._disconnectHandler();
    }
  };

  // ---------------------------------
  // Timer called once per second to
  // manage web-socket reconnection.
  // ---------------------------------
  wsReconnectCounter = 0;
  wsReconnectTimer = 0;
  /**
   * Websocket reconnect handler, 1 second timer tick handler
   */
  _reconnectTimerTickHandler = () => {
    // If disabled, or if connection successful, reset counter/timer
    if ((!window.globals.webState.webConnectOn) || (window.globals.webState.webConnected)) {
      this.wsReconnectCounter = 0;
      this.wsReconnectTimer = 0;
      return;
    }

    // connection in progress, skip.
    if (window.globals.webState.webConnecting) return;

    // increment timer
    this.wsReconnectTimer++;

    // first time on first timer tick (immediately)
    if (this.wsReconnectCounter === 0) {
      if (this.wsReconnectTimer > 0) {
        window.globals.webState.webConnecting = true;
        this._updateWebsocketStatus();
        this.wsReconnectTimer = 0;
        this.wsReconnectCounter++;
        this.shadowRoot.getElementById('reconnectStatusDivId').textContent +=
          'Reconnect to web server initiated (Timer-1)\n';
        this._reConnectWebSocketAfterDisconnect();
      }
    } else if (this.wsReconnectCounter === 1) {
      // then second try in 5 seconds
      if (this.wsReconnectTimer > 5) {
        window.globals.webState.webConnecting = true;
        this._updateWebsocketStatus();
        this.wsReconnectTimer = 0;
        this.wsReconnectCounter++;
        this.shadowRoot.getElementById('reconnectStatusDivId').textContent +=
          'Reconnect to web server initiated (Timer-2)\n';
        this._reConnectWebSocketAfterDisconnect();
      }
    } else if (this.wsReconnectCounter > 10) {
      // Stop at the limit
      window.globals.webState.webConnectOn = false;
      // TODO updateDivVisibility();
      if (this.wsReconnectCounter === 11) {
        // only do the message one time
        this.shadowRoot.getElementById('reconnectStatusDivId').textContent +=
          'Auto-reconnect disabled\n';
      }
    } else {
      if (this.wsReconnectTimer > 15) {
        window.globals.webState.webConnecting = true;
        this._updateWebsocketStatus();
        this.wsReconnectTimer = 0;
        this.wsReconnectCounter++;
        this.shadowRoot.getElementById('reconnectStatusDivId').textContent +=
          'Reconnect to web server initiated (Timer-3)\n';
        this._reConnectWebSocketAfterDisconnect();
      }
    }
  };

  // ------------------------------------------------------------------------------
  // Group of heartbeat functions.
  //
  // Web server sends websocket message 'HEARTBEAT' at 10 second intervals
  // Command parser intercept the HEATBEAT message and calls onHeartbeatReceived()
  // ------------------------------------------------------------------------------

  heartbeatExpirationTimeSeconds = 15;
  heartbeatUpCounter = 0;
  /**
   * De-activate heartbeat timer when not connected
   */
  _resetHeartbeatTimer = () => {
    this.heartbeatUpCounter = 0;
  };

  /**
   * Called by parser when HEARTBEAT is received over websocket stream
   */
  onHeartbeatReceived = () => {
    this.heartbeatUpCounter = 0;
  };

  /**
   * Websocket watchdog timer
   */
  _heartbeatTimerTickHandler = () => {
    // console.log('tick');
    //
    // Case 1, socket still connected, but HEARTBEAT stopped
    // After increment second reaches limit, --> try to close socket with error code
    // If unsuccessful
    // Case 2, socket unresponsive to close, but no closed event triggered
    // After increment second to limit + 2 second,
    // Set application to disconnected state.
    //
    this.heartbeatUpCounter++;
    if (window.globals.webState.webConnected) {
      if (this.heartbeatUpCounter > this.heartbeatExpirationTimeSeconds + 1) {
        console.log('HEARTBEAT timeout + 2 seconds, socket unresponsive, forcing disconnect');
        this.shadowRoot.getElementById('reconnectStatusDivId').textContent +=
          'Web socket connection timeout, socket unresponsive, force disconnect\n';
        window.globals.webState.webConnected = false;
        window.globals.webState.webConnecting = false;
        this._updateWebsocketStatus();
        // TODO (removed channels) setVariablesShowingIRCDisconnected();
      } else if (this.heartbeatUpCounter === this.heartbeatExpirationTimeSeconds) {
        console.log('HEARTBEAT timeout + 0 seconds , attempting to closing socket');
        this.shadowRoot.getElementById('reconnectStatusDivId').textContent +=
          'Web socket connection timeout, attempting to close\n';
        if (window.globals.wsocket) {
          // Closing the web socket will generate a 'close' event.
          window.globals.wsocket.close(3000, 'Heartbeat timeout');
        }
      }
    }
  };

  /**
   * Called once per second as task scheduler, called from js/_afterLoad.js
   */
  timerTickHandler = () => {
    this._reconnectTimerTickHandler();
    this._heartbeatTimerTickHandler();
  };

  initializePlugin () {
    // set descriptions to title attribute of buttons in panel
    this.shadowRoot.getElementById('manualWebSocketReconnectButtonId').setAttribute('title',
      'Connect or disconnect web browser from remote IRC client');
    this.shadowRoot.getElementById('stopWebSocketReconnectButtonId').setAttribute('title',
      'Disable auto-reconnect to remote IRC client');
    this.shadowRoot.getElementById('persistCheckBoxId').setAttribute('title',
      'Remember websocket disabled state in future page load/refresh');
  }

  connectedCallback () {
    // -------------------------------------
    // 1 of 2 Listeners on internal elements
    // -------------------------------------

    /**
     * Button to initiate manual web socket reconnect
     */
    this.shadowRoot.getElementById('manualWebSocketReconnectButtonId')
      .addEventListener('click', () => {
        if ((!window.globals.webState.webConnected) && (!window.globals.webState.webConnecting)) {
          window.globals.webState.webConnectOn = true;
          window.globals.webState.webConnecting = true;
          this._updateWebsocketStatus();
          this.shadowRoot.getElementById('reconnectStatusDivId').textContent +=
            'Reconnect to web server initiated (Manual)\n';
          this._reConnectWebSocketAfterDisconnect();
        }
        // persist websocket disabled auto-reconnect on next page load
        const persist = this.shadowRoot.getElementById('persistCheckBoxId').checked;
        if (persist) {
          const persistedWebsocketStateObj = {
            persist: true,
            disabled: false
          };
          window.localStorage.setItem('persistedWebsocketState',
            JSON.stringify(persistedWebsocketStateObj));
        }
      });

    /**
     * Button to stop manual web socket reconnect
     */
    this.shadowRoot.getElementById('stopWebSocketReconnectButtonId')
      .addEventListener('click', () => {
        if (!window.globals.webState.webConnected) {
          window.globals.webState.webConnectOn = false;
          window.globals.webState.webConnecting = false;
          this._updateWebsocketStatus();
          this.shadowRoot.getElementById('reconnectStatusDivId').textContent =
            'Auto-reconnect disabled\n';
          // persist websocket disabled auto-reconnect on next page load
          const persist = this.shadowRoot.getElementById('persistCheckBoxId').checked;
          if (persist) {
            const persistedWebsocketStateObj = {
              persist: true,
              disabled: true
            };
            window.localStorage.setItem('persistedWebsocketState',
              JSON.stringify(persistedWebsocketStateObj));
          }
        }
      });

    /**
     * Checkbox to persist disabled websocket to localStorage
     */
    this.shadowRoot.getElementById('persistCheckBoxId')
      .addEventListener('click', () => {
        if (this.shadowRoot.getElementById('persistCheckBoxId').checked) {
          // Invert...
          const disabled = !window.globals.webState.webConnectOn;
          const persistedWebsocketStateObj = {
            persist: true,
            disabled: disabled
          };
          window.localStorage.setItem('persistedWebsocketState',
            JSON.stringify(persistedWebsocketStateObj));
        } else {
          window.localStorage.removeItem('persistedWebsocketState');
        }
      });

    /**
     * Button to show help information on websocket panel
     */
    this.shadowRoot.getElementById('websocketInfoButtonId')
      .addEventListener('click', () => {
        if (this.shadowRoot.getElementById('websocketInfoDivId').hasAttribute('hidden')) {
          this.shadowRoot.getElementById('websocketInfoDivId').removeAttribute('hidden');
        } else {
          this.shadowRoot.getElementById('websocketInfoDivId').setAttribute('hidden', '');
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
     * Hide panel (not visible)unless listed as exception.
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
