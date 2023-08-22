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
// IRC Server control methods
//   getIrcState()                  returns Promise(ircState)
//   sendIrcServerMessageHandler()  returns Promise(null)
//   sendIrcServerMessage()         Function wrapped in error message handler
//   connectHandler()               returns Promise(null)
//   forceDisconnectHandler()       returns Promise(null)
//   pruneIrcChannel()              returns Promise(null)
// ------------------------------------------------------------------------------
'use strict';
window.customElements.define('irc-controls-panel', class extends HTMLElement {
  constructor () {
    super();
    const template = document.getElementById('ircControlsPanelTemplate');
    const templateContent = template.content;
    this.attachShadow({ mode: 'open' })
      .appendChild(templateContent.cloneNode(true));
  }

  showPanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible', '');
    this.shadowRoot.getElementById('panelCollapsedDivId').setAttribute('visible', '');
  };

  collapsePanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible', '');
    this.shadowRoot.getElementById('panelCollapsedDivId').removeAttribute('visible');
  };

  hidePanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible');
    this.shadowRoot.getElementById('panelCollapsedDivId').removeAttribute('visible');
  };

  /**
   * Check if connected to IRC.
   * 1 = browser connect to web server only
   * 2 = require both web and IRC
   * 3 = require both web and IRC and Registered
   * @param {number} code - Option number for level of connect
   * @returns {boolean} true if connected
   */
  checkConnect = (code) => {
    if ((code >= 1) && (!window.globals.webState.webConnected)) {
      document.getElementById('errorPanel').showError('Error: not connected to web server');
      return false;
    }
    if ((code >= 2) && (!window.globals.ircState.ircConnected)) {
      document.getElementById('errorPanel').showError('Error: Not connected to IRC server.');
      return false;
    }
    if ((code >= 3) && (!window.globals.ircState.ircRegistered)) {
      document.getElementById('errorPanel').showError('Error: Not connected to IRC server.');
      return false;
    }
    return true;
  };

  lastConnectErrorCount = 0;
  /**
   * Perform network GET request to /irc/getircstate to obtain update ircState object
   * @returns {promise} Returns promise resolving to ircState object, else reject error
   */
  getIrcState = () => {
    return new Promise((resolve, reject) => {
      window.globals.webState.count.webStateCalls++;
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
      const fetchURL = document.getElementById('globVars').webServerUrl + '/irc/getircstate';
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
          window.globals.ircState = responseJson;

          // IRC server index changed
          if ((!window.globals.ircState.ircConnected) &&
            (window.globals.webState.lastIrcServerIndex !==
              window.globals.ircState.ircServerIndex)) {
            window.globals.webState.lastIrcServerIndex =
              window.globals.ircState.ircServerIndex;
            // TODO update panel display items
          } // server index changed

          if (window.globals.ircState.ircConnected) {
            // for color icon
            window.globals.webState.ircConnecting = false;

            // TODO update panel display items
            document.title = 'IRC-' + window.globals.ircState.ircServerName;
          } // if (ircState.ircConnected) {
          if (!window.globals.ircState.ircConnected) {
            // If no server list, show message and link button to add new servers
            if (window.globals.ircState.ircServerIndex === -1) {
              if (window.globals.ircState.disableServerListEditor) {
                // TODO
              } else {
                // TODO
              }
            } else {
              // TODO
            }
            // document.getElementById('headerServer').textContent = ircState.ircServerName;
            // document.getElementById('headerUser').textContent = ' (' + ircState.nickName + ')';

            // For display in browser tab
            document.title = 'irc-hybrid-client';
          } // if (!ircState.ircConnected) {
          if (this.lastConnectErrorCount !== window.globals.ircState.count.ircConnectError) {
            this.lastConnectErrorCount = window.globals.ircState.count.ircConnectError;
            if (window.globals.ircState.count.ircConnectError > 0) {
              // On page refresh, skip legacy IRC errors occurring on the
              // first /irc/getwebstate call
              if (window.globals.webState.count.webStateCalls > 1) {
                document.getElementById('errorPanel')
                  .showError('An IRC Server connection error occurred');
              }
            }
            // clear browser side connecting flag
            window.globals.webState.ircConnecting = false;
          }

          // TODO
          // document.getElementById('programVersionDiv').textContent =
          //   ' version-' + ircState.progVersion

          // Fire custom event
          document.dispatchEvent(new CustomEvent('irc-state-changed'));

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
        });
    }); // new Promise
  }; // getIrcState()

  /**
   * Perform network POST request to /irc/message to send IRC message to remote IRC server
   * @param {string} = message - The IRC message string to send to IRC server.
   * @returns {promise} Returns promise resolving null, else reject error
   */
  sendIrcServerMessageHandler = (message) => {
    return new Promise((resolve, reject) => {
      if (!this.checkConnect(3)) resolve(null);
      const fetchController = new AbortController();
      const fetchTimeout = document.getElementById('globVars').constants('fetchTimeout');
      const activitySpinnerEl = document.getElementById('activitySpinner');
      const body = {
        message: message
      };
      const fetchOptions = {
        method: 'POST',
        redirect: 'error',
        signal: fetchController.signal,
        headers: {
          'CSRF-Token': document.getElementById('globVars').csrfToken,
          'Content-type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(body)
      };
      const fetchURL =
        document.getElementById('globVars').webServerUrl + '/irc/message';
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
          if (responseJson.error) {
            reject(responseJson.message);
          } else {
            resolve(null);
          }
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
        });
    }); // new Promise
  }; // sendIrcServerMessageHandler

  /**
   * Send IRC message to IRC server.
   * This is a promise wrapper to handle error messages
   * @param {string} = message - The IRC message string to send to IRC server.
   */
  sendIrcServerMessage = (message) => {
    this.sendIrcServerMessageHandler(message)
      .catch((err) => {
        console.log(err);
        let message = err.message || err.toString() || 'Error occurred calling /irc/connect';
        // show only 1 line
        message = message.split('\n')[0];
        document.getElementById('errorPanel').showError(message);
      });
  };

  /**
   * Perform network POST request to /irc/connect to initiate a new connection to the IRC server.
   * @returns {promise} Returns promise resolving to null, else reject error
   */
  connectHandler = () => {
    return new Promise((resolve, reject) => {
      // Are we connected to web server?
      if (!this.checkConnect(1)) return;
      // Is web server already connected to IRC?
      if ((window.globals.ircState.ircConnected) ||
        (window.globals.ircState.ircConnecting) ||
        (window.globals.webState.ircConnecting)) {
        document.getElementById('errorPanel').showError('Error: Already connected to IRC server');
        return;
      }
      if (window.globals.ircState.ircServerIndex === -1) {
        document.getElementById('errorPanel').showError('Empty Server List');
        return;
      }
      // change color of icon
      window.globals.webState.ircConnecting = true;

      // TODO input field for nickname
      // if (document.getElementById('nickNameInputId').value.length < 1) {
      //   document.getElementById('errorPanel').showError('Invalid nick name.');
      //   return;
      // }
      // connectObject.nickName = document.getElementById('nickNameInputId').value;
      const connectObject = {};
      // The username is set only in the config file

      connectObject.nickName = window.globals.ircState.nickName;
      connectObject.realName = window.globals.ircState.realName;
      connectObject.userMode = window.globals.ircState.userMode;

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
        body: JSON.stringify(connectObject)
      };
      const fetchURL =
        document.getElementById('globVars').webServerUrl + '/irc/connect';
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
          if (responseJson.error) {
            reject(responseJson.message);
          } else {
            resolve(null);
          }
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
        });
    }); // new Promise
  }; // connectButtonHandler

  /**
   * Perform network POST request forcibly close IRC socket without using /QUIT
   * @returns {promise} Returns promise resolving to null, else reject error
   */
  forceDisconnectHandler = () => {
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
        body: JSON.stringify({})
      };
      const fetchURL =
        document.getElementById('globVars').webServerUrl + '/irc/disconnect';
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
          if (responseJson.error) {
            reject(responseJson.message);
          } else {
            resolve(null);
          }
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
        });
    }); // new Promise
  }; // forceDisconnectHandler()

  // Fetch API to remove channel from backend server
  pruneIrcChannel = (pruneChannel) => {
    if ((typeof pruneChannel !== 'string') || (pruneChannel.length < 1)) {
      return Promise.reject(new Error('Invalid channel name parameter'));
    } else {
      return new Promise((resolve, reject) => {
        const fetchTimeout = document.getElementById('globVars').constants('fetchTimeout');
        const activitySpinnerEl = document.getElementById('activitySpinner');
        const fetchController = new AbortController();
        const fetchOptions = {
          method: 'POST',
          redirect: 'error',
          signal: fetchController.signal,
          headers: {
            'CSRF-Token': document.getElementById('globVars').csrfToken,
            'Content-type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify({ channel: pruneChannel })
        };
        const fetchURL = document.getElementById('globVars').webServerUrl + '/irc/prune';
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

            // channel successfully removed from server
            // The server will response with a state change
            // The irc-state-change event handler
            // will detect the channel has been removed
            // It will remove it's window from the DOM
            if (fetchTimerId) clearTimeout(fetchTimerId);
            activitySpinnerEl.cancelActivitySpinner();
            if (responseJson.error) {
              reject(responseJson.message);
            } else {
              resolve(null);
            }
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
          });
      }); // new promise
    } // valid param
  }; // pruneIrcChannel()

  // ------------------------------------------------
  // Tap "Web" status icon to connect/disconnect
  // ------------------------------------------------
  ircStatusIconTouchDebounce = false;
  webConnectHeaderBarIconHandler = () => {
    // debounce button
    if (this.ircStatusIconTouchDebounce) return;
    this.ircStatusIconTouchDebounce = true;
    setTimeout(() => {
      this.ircStatusIconTouchDebounce = false;
    }, 1000);
    if ((window.globals.ircState.ircConnected) ||
      (window.globals.ircState.ircConnecting) ||
      (window.globals.webState.ircConnecting)) {
      //
      // disconnect
      if ((window.globals.webState.ircConnecting) || (window.globals.ircState.webConnecting) ||
        ((window.globals.ircState.ircConnected) && (!window.globals.ircState.ircRegistered))) {
        // with this false, icon depend only on backend state
        window.globals.webState.ircConnecting = false;
        // stuck trying to connect, just request server to destroy socket
        this.forceDisconnectHandler()
          .catch((err) => {
            console.log(err);
            let message = err.message || err.toString() || 'Error occurred calling /irc/connect';
            // show only 1 line
            message = message.split('\n')[0];
            document.getElementById('errorPanel').showError(message);
          });
      } else {
        // else, connected to server, exit gracefully by command.
        document.getElementById('ircControlsPanel').sendIrcServerMessage(
          'QUIT :' + window.globals.ircState.progName + ' ' + window.globals.ircState.progVersion);
      }
    } else {
      //
      // Connect
      this.connectHandler()
        .catch((err) => {
          console.log(err);
          let message = err.message || err.toString() || 'Error occurred calling /irc/connect';
          // show only 1 line
          message = message.split('\n')[0];
          document.getElementById('errorPanel').showError(message);
        });
    }
  }; // webConnectHeaderBarIconHandler

  /**
   * Called once per second as task scheduler, called from js/_afterLoad.js
   */
  // timerTickHandler = () => {
  // };

  // ------------------
  // Main entry point
  // ------------------
  // initializePlugin = () => {
  // }; // initializePlugin()

  // add event listeners to connected callback
  // -------------------------------------------
  connectedCallback () {
    // -------------------------------------
    // 1 of 2 Listeners on internal elements
    // -------------------------------------

    this.shadowRoot.getElementById('closePanelButtonId').addEventListener('click', () => {
      this.hidePanel();
    });

    this.shadowRoot.getElementById('collapsePanelButtonId').addEventListener('click', () => {
      if (this.shadowRoot.getElementById('panelCollapsedDivId').hasAttribute('visible')) {
        this.collapsePanel();
      } else {
        this.showPanel();
      }
    });

    this.shadowRoot.getElementById('editServerButtonId').addEventListener('click', () => {
      document.getElementById('serverForm').showPanel();
    });

    this.shadowRoot.getElementById('connectButtonId').addEventListener('click', () => {
      this.connectHandler()
        .catch((err) => {
          console.log(err);
          let message = err.message || err.toString() || 'Error occurred calling /irc/connect';
          // show only 1 line
          message = message.split('\n')[0];
          document.getElementById('errorPanel').showError(message);
        });
    });

    // ------------------------------------------------------
    // Quit Button handler (Send QUIT message to IRC server)
    // ------------------------------------------------------
    this.shadowRoot.getElementById('quitButtonId').addEventListener('click', () => {
      if ((window.globals.webState.ircConnecting) ||
        (window.globals.ircState.webConnecting) ||
        ((window.globals.ircState.ircConnected) &&
        (!window.globals.ircState.ircRegistered))) {
        // with this false, icon depend only on backend state
        window.globals.webState.ircConnecting = false;
        // stuck trying to connect, just request server to destroy socket
        this.forceDisconnectHandler()
          .catch((err) => {
            console.log(err);
            let message = err.message || err.toString() || 'Error occurred calling /irc/connect';
            // show only 1 line
            message = message.split('\n')[0];
            document.getElementById('errorPanel').showError(message);
          });
      } else if ((window.globals.ircState.ircAutoReconnect) &&
        (window.globals.ircState.ircConnectOn) &&
        (!window.globals.ircState.ircConnected) &&
        (!window.globals.ircState.ircConnecting)) {
        // case of backend waiting on timer to reconnect.
        // when QUIT pressed, send hard disconnet to kill timer.
        this.forceDisconnectHandler()
          .catch((err) => {
            console.log(err);
            let message = err.message || err.toString() || 'Error occurred calling /irc/connect';
            // show only 1 line
            message = message.split('\n')[0];
            document.getElementById('errorPanel').showError(message);
          });
      } else {
        // else, connected to server, exit gracefully by command.
        this.sendIrcServerMessage('QUIT :' + window.globals.ircState.progName + ' ' +
          window.globals.ircState.progVersion);
      }
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

    /**
     * Global event listener on document object to implement changes to color theme
     * @listens document:color-theme-changed
     * @param {object} event.detail.theme - Color theme values 'light' or 'dark'
     */
    document.addEventListener('color-theme-changed', (event) => {
      const panelDivEl = this.shadowRoot.getElementById('panelDivId');
      if (event.detail.theme === 'light') {
        panelDivEl.classList.remove('irc-controls-panel-theme-dark');
        panelDivEl.classList.add('irc-controls-panel-theme-light');
      } else {
        panelDivEl.classList.remove('irc-controls-panel-theme-light');
        panelDivEl.classList.add('irc-controls-panel-theme-dark');
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
     * Global event listener on document object to detect state change of remote IRC server
     * Detect addition of new IRC channels and create channel panel.
     * Data source: ircState object
     * @listens document:irc-state-changed
     */
    document.addEventListener('irc-state-changed', () => {
      if (window.globals.ircState.ircConnected !== this.ircConnectedLast) {
        this.ircConnectedLast = window.globals.ircState.ircConnected;
        if (window.globals.ircState.ircConnected) {
          this.collapsePanel();
        } else {
          this.showPanel();
        }
      }
    });

    /**
     * Make panel visible unless listed as exception.
     * @listens document:show-all-panels
     * @param {string|string[]} event.detail.except - No action if listed as exception
     */
    document.addEventListener('show-all-panels', (event) => {
      if ((event.detail) && (event.detail.except)) {
        if (typeof event.detail.except === 'string') {
          // this.id assigned in html/_index.html
          if (event.detail.except !== this.id) {
            this.showPanel();
          }
        } else if (Array.isArray(event.detail.except)) {
          if (event.detail.except.indexOf(this.id) < 0) {
            this.showPanel();
          }
        }
      } else {
        this.showPanel();
      }
    });
  } // connectedCallback()
});
