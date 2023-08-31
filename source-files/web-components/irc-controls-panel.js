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
//  External methods
//    showPanel()
//    collapsePanel()
//    hidePanel()
//    getIrcState()                  returns Promise(ircState)
//    sendIrcServerMessageHandler()  returns Promise(null)
//    sendIrcServerMessage()         Function wrapped in error message handler
//    serverSetIndexHandler(index)
//    connectHandler()               returns Promise(null)
//    disconnectHandler()            Function sends /QUIT
//    forceDisconnectHandler()       returns Promise(null)
//    updateFromCache()
//    pruneIrcChannel()              returns Promise(null)
//    eraseIrcCache()
//    webServerTerminate
//    webConnectHeaderBarIconHandler (called externally when bar iconclicked)
// ------------------------------------------------------------------------------
//
// Panel Visibility
//   HTML template: irc-controls-panel hidden by default, flag webSocketFirstConnect = true
//
//   Websocket (re)connect:  (page refresh, page initial load)
//     Any getIrcState() response after web socket connected (detect first time)
//       if (webSocketFirstConnect===true) Show irc-controls-panel  flag set false
//
//   Connect and disconnect from IRC network
//   getIrcState() response, ircConnected changed:
//       ircConnected:  false to true  --> Collapse irc-controls-panel to bar
//       ircConnected:  true to false  --> Show irc-controls-panel
//
//   Websocket disconnect
//       Global hide-all-panels event hides the panel
//       webState.webConnected changes true to false, reset flag webSocketFirstConnect = true
//
//   Scroll:  panel scrolls to top on showPanel()
//
// ------------------------------------------------------------------------------
'use strict';
window.customElements.define('irc-controls-panel', class extends HTMLElement {
  constructor () {
    super();
    const template = document.getElementById('ircControlsPanelTemplate');
    const templateContent = template.content;
    this.attachShadow({ mode: 'open' })
      .appendChild(templateContent.cloneNode(true));
    this.lastConnectErrorCount = 0;
    this.ircConnectedLast = false;
    this.ircConnectingLast = false;
    this.webSocketFirstConnect = true;
    this.webConnectedLast = false;
    this.updateCacheDebounceActive = false;
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
    this.shadowRoot.getElementById('panelCollapsedDivId').setAttribute('visible', '');
    this._updateVisibility();
    document.dispatchEvent(new CustomEvent('cancel-zoom'));
    this._scrollToTop();
  };

  collapsePanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible', '');
    this.shadowRoot.getElementById('panelCollapsedDivId').removeAttribute('visible');
    this._updateVisibility();
  };

  hidePanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible');
    this.shadowRoot.getElementById('panelCollapsedDivId').removeAttribute('visible');
  };

  _updateVisibility = () => {
    const editServerButtonEl = this.shadowRoot.getElementById('editServerButtonId');
    const connectButtonEl = this.shadowRoot.getElementById('connectButtonId');
    const forceUnlockButtonEl = this.shadowRoot.getElementById('forceUnlockButtonId');
    const editorOpenWarningDivEl = this.shadowRoot.getElementById('editorOpenWarningDivId');
    const emptyTableWarningDivEl = this.shadowRoot.getElementById('emptyTableWarningDivId');
    const awayHiddenDivEl = this.shadowRoot.getElementById('awayHiddenDivId');
    // default visible, hide on conditions
    editServerButtonEl.removeAttribute('hidden');
    connectButtonEl.removeAttribute('disabled');
    awayHiddenDivEl.setAttribute('hidden', '');
    if ((window.globals.ircState.ircConnected) ||
      (window.globals.webState.ircServerEditOpen)) {
      editServerButtonEl.setAttribute('hidden', '');
      connectButtonEl.setAttribute('disabled', '');
    }
    editorOpenWarningDivEl.setAttribute('hidden', '');
    if (window.globals.webState.ircServerEditOpen) {
      editorOpenWarningDivEl.removeAttribute('hidden');
    }
    emptyTableWarningDivEl.setAttribute('hidden', '');
    if (window.globals.ircState.ircServerIndex < 0) {
      emptyTableWarningDivEl.removeAttribute('hidden');
      editServerButtonEl.setAttribute('hidden', '');
      connectButtonEl.setAttribute('disabled', '');
    }
    if (window.globals.ircState.ircConnected) {
      awayHiddenDivEl.removeAttribute('hidden');
    }
    // always hide force button unless specific error
    forceUnlockButtonEl.setAttribute('hidden', '');
  }; // updateVisbility()

  /**
   * Check if connected to IRC.
   * 1 = browser connect to web server only
   * 2 = require both web and IRC
   * 3 = require both web and IRC and Registered
   * @param {number} code - Option number for level of connect
   * @returns {boolean} true if connected
   */
  _checkConnect = (code) => {
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

          // If waiting for IRC socket connection, show spinner
          if (window.globals.ircState.ircConnecting !== this.ircConnectingLast) {
            this.ircConnectingLast = window.globals.ircState.ircConnecting;
            if (window.globals.ircState.ircConnecting) {
              activitySpinnerEl.requestActivitySpinner();
            } else {
              activitySpinnerEl.cancelActivitySpinner();
            }
          }
          if (this.lastConnectErrorCount !== window.globals.ircState.count.ircConnectError) {
            this.lastConnectErrorCount = window.globals.ircState.count.ircConnectError;
            if (window.globals.ircState.count.ircConnectError > 0) {
              // On page refresh, skip legacy IRC errors occurring on the
              // first /irc/getwebState call
              if (window.globals.webState.count.webStateCalls > 1) {
                document.getElementById('errorPanel')
                  .showError('An IRC Server connection error occurred');
              }
            }
            // clear browser side connecting flag
            window.globals.webState.ircConnecting = false;
          }

          // Fire custom event
          document.dispatchEvent(new CustomEvent('irc-state-changed'));

          resolve(window.globals.ircState);
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
    }); // new Promise
  }; // getIrcState()

  /**
   * Perform network POST request to /irc/message to send IRC message to remote IRC server
   * @param {string} = message - The IRC message string to send to IRC server.
   * @returns {promise} Returns promise resolving null, else reject error
   */
  sendIrcServerMessageHandler = (message) => {
    return new Promise((resolve, reject) => {
      if (!this._checkConnect(3)) resolve(null);
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
            reject(new Error(responseJson.message));
          } else {
            resolve(null);
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
   * Perform network POST request to set the IRC server list index number
   * @returns {promise} Returns promise resolving to null, else reject error
   */
  serverSetIndexHandler = (index) => {
    console.log('serverSetIndexHandler', index);
    if (window.globals.ircState.ircConnected) {
      return Promise.reject(new Error('Can not change servers while connected'));
    }

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
        body: JSON.stringify({ index: index })
      };
      const fetchURL =
        document.getElementById('globVars').webServerUrl + '/irc/server';
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
          // {
          //   "error": false,
          //   "index": 2,
          //   "name": "label1"
          // }
          resolve(responseJson);
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
    }); // new Promise
  }; // serverSetIndexHandler()

  /**
   * Perform network POST request to /irc/connect to initiate a new connection to the IRC server.
   * @returns {promise} Returns promise resolving to null, else reject error
   */
  connectHandler = () => {
    if (window.globals.webState.ircServerEditOpen) {
      return Promise.reject(new Error('Connection not allowed during IRC server edit.'));
    }
    return new Promise((resolve, reject) => {
      // Are we connected to web server?
      if (!this._checkConnect(1)) return;
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

      const connectObject = {};
      // The username is set only in the config file

      connectObject.nickName = this.shadowRoot.getElementById('nickNameInputId').value;
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
            reject(new Error(responseJson.message));
          } else {
            resolve(null);
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
    }); // new Promise
  }; // connectButtonHandler

  /**
   * First try /QUIT, if this does not work, then force disconnect
   */
  disconnectHandler = () => {
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
  };

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
            reject(new Error(responseJson.message));
          } else {
            resolve(null);
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
    }); // new Promise
  }; // forceDisconnectHandler()

  // -------------------------------------------------
  // This function performs API request to obtain
  // the full IRC server message cache from the web server
  // as an API response. The contents are then parsed as if
  // the message were real time.
  // -------------------------------------------------
  updateFromCache = () => {
    if (window.globals.webState.cacheReloadInProgress) {
      // Abort in case of cache reload already in progress
      return Promise.reject(new Error(
        'Attempt cache reload, while previous in progress'));
    }
    // Used by event handlers to inhibit various actions.
    window.globals.webState.cacheReloadInProgress = true;

    // Fire event to clear previous contents
    // TODO this is async, could clear after fetch
    document.dispatchEvent(new CustomEvent('erase-before-reload'));
    return new Promise((resolve, reject) => {
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
            window.globals.webState.lastPMNick = '';
            window.globals.webState.activePrivateMessageNicks = [];

            //
            // Option 1, receive array of NodeJS Buffer object and convert to utf8 string messages
            //
            // let utf8decoder = new TextDecoder('utf8');
            // for (let i=0; i<responseArray.length; i++) {
            //   if ((responseArray[i].type === 'Buffer') && (responseArray[i].data.length > 0)) {
            //     let data = new Uint8Array(responseArray[i].data);
            //     _parseBufferMessage(utf8decoder.decode(data));
            //   }
            // }
            //
            // Option 2, receive array of utf8 string message
            //
            const remoteCommandParserEl = document.getElementById('remoteCommandParser');
            if (responseArray.length > 0) {
              for (let i = 0; i < responseArray.length; i++) {
                if (responseArray[i].length > 0) {
                  remoteCommandParserEl.parseBufferMessage(responseArray[i]);
                }
              }
            }
          }
          // this is to inform windows that cache reload has completed.
          const timestamp = Math.floor(Date.now() / 1000);
          document.dispatchEvent(new CustomEvent('cache-reload-done', {
            detail: {
              timestamp: timestamp
            }
          }));
          resolve(null);
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
          const timestamp = Math.floor(Date.now() / 1000);
          document.dispatchEvent(new CustomEvent('cache-reload-error', {
            detail: {
              timestamp: timestamp
            }
          }));
          const error = new Error(message);
          reject(error);
        });
    }); // new Promise
  }; // updateFromCache;

  /**
   * Fetch API to remove channel from backend server
   * @param {string} pruneChannel - Name of channel to prune
   * @returns {promise} Returns promise resolving to null, else reject error
   */
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
              reject(new Error(responseJson.message));
            } else {
              resolve(null);
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
      }); // new promise
    } // valid param
  }; // pruneIrcChannel()

  /**
   * Fetch API Request server to erase message cache
   * @param {string} cacheType -Allowed: CACHE, NOTICE, WALLOPS, PRIVMSG
   * @returns {promise} Returns promise resolving to null, else reject error
   */
  eraseIrcCache = (cacheType) => {
    if ((typeof cacheType !== 'string') || (cacheType.length < 1)) {
      return Promise.reject(new Error('Invalid erase cache parameter'));
    } else {
      // signal to panels to clear content before reload
      document.dispatchEvent(new CustomEvent('erase-before-reload'));
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
          body: JSON.stringify({ erase: cacheType })
        };
        const fetchURL = document.getElementById('globVars').webServerUrl + '/irc/erase';
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
              reject(new Error(responseJson.message));
            } else {
              resolve(responseJson);
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
      }); // new promise
    } // valid param
  }; // eraseIrcCache

  /**
   * Fetch API to shutdown (Die) web server and remote IRC client
   * @returns {promise} Returns promise resolving to null, else reject error
   */
  webServerTerminate = () => {
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
        body: JSON.stringify({ terminate: 'YES' })
      };
      const fetchURL =
        document.getElementById('globVars').webServerUrl + '/terminate';
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
            reject(new Error(responseJson.message));
          } else {
            resolve(responseJson);
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
    }); // new promise
  }; // webServerTerminate

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

  awayButtonHeaderBarIconHandler = () => {
    if ((window.globals.ircState.ircConnected) && (window.globals.ircState.ircIsAway)) {
      this.sendIrcServerMessage('AWAY');
    }
  };

  /**
   * Called once per second as task scheduler, called from js/_afterLoad.js
   */
  // timerTickHandler = () => {
  // };

  // ------------------
  // Main entry point
  // ------------------
  initializePlugin = () => {
    // Set descriptive button titles
    this.shadowRoot.getElementById('editServerButtonId').setAttribute('title',
      'Opens form to edit IRC server configuration');
    this.shadowRoot.getElementById('forceUnlockButtonId').setAttribute('title',
      'Press to unlock database. Refreshing or leaving editor ' +
      'form during edit can leave database locked.');
    this.shadowRoot.getElementById('connectButtonId').setAttribute('title',
      'Connect to the IRC network');
    this.shadowRoot.getElementById('quitButtonId').setAttribute('title',
      'Disconnect (/QUIT) from the IRC network.');
  }; // initializePlugin()

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

    this.shadowRoot.getElementById('showServerListButtonId').addEventListener('click', () => {
      document.getElementById('serverListPanel').showPanel();
    });
    this.shadowRoot.getElementById('showServerPanelButtonId').addEventListener('click', () => {
      document.getElementById('ircServerPanel').showPanel();
    });

    this.shadowRoot.getElementById('editServerButtonId').addEventListener('click', () => {
      const serverFormEl = document.getElementById('serverFormPanel');
      const index = window.globals.ircState.ircServerIndex;
      // test if locked by attempting to lock it
      serverFormEl.fetchServerList(index, 1)
        // was not locked, unlock before requesting edit
        .then(() => { serverFormEl.fetchServerList(index, 0); })
        // this returns leaving page open.
        .then(() => { serverFormEl.editIrcServerAtIndex(index); })
        .catch((err) => {
          console.log(err);
          let message = err.message || err.toString() ||
            'Error attempting edit IRC server';
          // limit to 1 line
          message = message.split('\n')[0];
          if (err.status === 409) {
            this.shadowRoot.getElementById('forceUnlockButtonId').removeAttribute('hidden');
            document.getElementById('errorPanel').showError('Database Locked');
          } else if (err.status === 405) {
            document.getElementById('errorPanel').showError('Database Disabled');
          } else {
            document.getElementById('errorPanel').showError(message);
          }
        });
    });

    this.shadowRoot.getElementById('forceUnlockButtonId').addEventListener('click', () => {
      const serverFormEl = document.getElementById('serverFormPanel');
      serverFormEl.fetchServerList(0, 0)
        .then(() => {
          console.log('Database: unlock successful');
          window.globals.webState.ircServerEditOpen = false;
          this._updateVisibility();
        })
        .catch((err) => {
          console.log(err);
          let message = err.message || err.toString() ||
            'Error attempting to create new IRC server';
          // limit to 1 line
          message = message.split('\n')[0];
          document.getElementById('errorPanel').showError(message);
        });
    });

    this.shadowRoot.getElementById('connectButtonId').addEventListener('click', () => {
      if (this.shadowRoot.getElementById('nickNameInputId').value.length < 1) {
        document.getElementById('errorPanel').showError('Invalid nick name.');
        return;
      }
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
      this.disconnectHandler();
    });

    // ---------------------------------
    // Away icon and buttons
    // ---------------------------------
    this.shadowRoot.getElementById('setAwayButtonId').addEventListener('click', () => {
      if ((window.globals.ircState.ircConnected) &&
        (this.shadowRoot.getElementById('userAwayMessageId').value.length > 0)) {
        this.sendIrcServerMessage(
          'AWAY ' + this.shadowRoot.getElementById('userAwayMessageId').value);
      }
    });
    this.shadowRoot.getElementById('setBackButtonId').addEventListener('click', () => {
      if ((window.globals.ircState.ircConnected) && (window.globals.ircState.ircIsAway)) {
        this.sendIrcServerMessage('AWAY');
      }
    });
    this.shadowRoot.getElementById('setAwayInfoBtnId').addEventListener('click', () => {
      this.shadowRoot.getElementById('setAwayInfoId').removeAttribute('hidden');
    });

    // -------------------------------------
    // 2 of 2 Listeners on global events
    // -------------------------------------

    //
    // Global Cache Events
    //
    document.addEventListener('cache-reload-done', (event) => {
      window.globals.webState.cacheReloadInProgress = false;
    });

    document.addEventListener('cache-reload-error', (event) => {
      window.globals.webState.cacheReloadInProgress = false;
    });

    // updateFromCache with 1 second debounce
    window.addEventListener('debounced-update-from-cache', (event) => {
      if (!this.updateCacheDebounceActive) {
        this.updateCacheDebounceActive = true;
        setTimeout(() => {
          this.updateCacheDebounceActive = false;
          if (!window.globals.webState.cacheReloadInProgress) {
            this.updateFromCache()
              .catch((err) => {
                console.log(err);
                let message = err.message || err.toString() || 'Error';
                // show only 1 line
                message = message.split('\n')[0];
                document.getElementById('errorPanel').showError(message);
              });
          }
        }, 1000);
      }
    });

    document.addEventListener('update-from-cache', (event) => {
      this.updateFromCache()
        .catch((err) => {
          console.log(err);
          let message = err.message || err.toString() || 'Error';
          // show only 1 line
          message = message.split('\n')[0];
          document.getElementById('errorPanel').showError(message);
        });
    });

    //
    // Rest of non Cache events
    //

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
      let newTextTheme = 'global-text-theme-dark';
      let oldTextTheme = 'global-text-theme-light';
      if (document.querySelector('body').getAttribute('theme') === 'light') {
        newTextTheme = 'global-text-theme-light';
        oldTextTheme = 'global-text-theme-dark';
      }
      const inputEls = Array.from(this.shadowRoot.querySelectorAll('input'));
      inputEls.forEach((el) => {
        el.classList.remove(oldTextTheme);
        el.classList.add(newTextTheme);
      });
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
     * Global event listener on document object to detect editor panel has been opened
     * @listens document:irc-server-edit-open
     */
    document.addEventListener('irc-server-edit-open', () => {
      this._updateVisibility();
    }); // irc-server-edit-open

    /**
     * Global event listener on document object to detect state change of remote IRC server
     * Detect addition of new IRC channels and create channel panel.
     * Data source: ircState object
     * @listens document:irc-state-changed
     */
    document.addEventListener('irc-state-changed', () => {
      // If this is first load of the page, open the panel.
      if (this.webSocketFirstConnect) {
        this.webSocketFirstConnect = false;
        if (!window.globals.ircState.ircConnected) {
          this.showPanel();
          //
          // This is to handle a new installation of the server.
          // Case of first connect, if the server list array is empty, show server list form.
          // This is done by calling the server-form-panel web component
          //
          if (window.globals.ircState.ircServerIndex < 0) {
            this.shadowRoot.getElementById('editServerButtonId').setAttribute('hidden', '');
            this.shadowRoot.getElementById('connectButtonId').setAttribute('disabled', '');
            const serverFormEl = document.getElementById('serverFormPanel');
            // test if locked by attempting to open it
            serverFormEl.fetchServerList(0, 1)
              // was not locked, unlock before requesting new server
              .then(() => { serverFormEl.fetchServerList(0, 0); })
              // this returns leaving page open.
              .then(() => { serverFormEl.createNewIrcServer(); })
              .catch((err) => {
                console.log(err);
                let message = err.message || err.toString() || 'Error';
                // show only 1 line
                message = message.split('\n')[0];
                document.getElementById('errorPanel').showError(message);
              });
          }
        }
      } // if first connect

      // Check if IRC connect changes, if connected show panel, else collapse it
      if (window.globals.ircState.ircConnected !== this.ircConnectedLast) {
        this.ircConnectedLast = window.globals.ircState.ircConnected;
        if (window.globals.ircState.ircConnected) {
          this.collapsePanel();
        } else {
          this.showPanel();
        }
      }
      //
      // Set default nickname
      //
      if (window.globals.ircState.ircConnected) {
        this.shadowRoot.getElementById('nickNameInputId').value =
          window.globals.ircState.nickName;
      } else {
        // ircServerIndex -1 if server list empty
        if (window.globals.ircState.ircServerIndex >= 0) {
          this.shadowRoot.getElementById('nickNameInputId').value =
            window.globals.ircState.nickName;
        }
      }
      //
      // Set panel title
      //
      if (window.globals.ircState.ircConnected) {
        this.shadowRoot.getElementById('panelTitleDivId').textContent =
          'IRC Controls ' + window.globals.ircState.ircServerName + ' (' +
          window.globals.ircState.nickName + ')';
      } else {
        this.shadowRoot.getElementById('panelTitleDivId').textContent = 'IRC Controls';
      }

      //
      // Dynamically set page title
      //
      if (window.globals.ircState.ircConnected) {
        window.globals.webState.ircConnecting = false;
        document.title = 'IRC-' + window.globals.ircState.ircServerName +
          '(' + window.globals.ircState.nickName + ')';
      } // if (ircState.ircConnected) {
      if (!window.globals.ircState.ircConnected) {
        // For display in browser tab
        document.title = 'irc-hybrid-client';
      } // if (!ircState.ircConnected) {

      //
      // Update select server display
      //
      let infoReconnect = '';
      if (window.globals.ircState.ircAutoReconnect) {
        infoReconnect = 'Auto-reconnect:   Enabled\n';
      }
      let infoRotate = '';
      if ((window.globals.ircState.ircServerRotation) &&
      (window.globals.ircState.ircServerGroup > 0)) {
        infoRotate = '' +
        'Rotate servers:   Group: ' +
        window.globals.ircState.ircServerGroup.toString() + '\n';
      }
      let selectedServerInfo = 'Label:\nServer:\nNickname:';

      if (window.globals.ircState.ircServerIndex >= 0) {
        selectedServerInfo =
          'Label:            ' + window.globals.ircState.ircServerName +
          ' (Index=' + window.globals.ircState.ircServerIndex.toString() + ')\n' +
          'Server:           ' + window.globals.ircState.ircServerHost + ':' +
          window.globals.ircState.ircServerPort + '\n' +
          infoReconnect + infoRotate +
          'Nickname:         ' + window.globals.ircState.nickName;
      }
      this.shadowRoot.getElementById('selectedServerPreId').textContent = selectedServerInfo;
      this._updateVisibility();
    }); // irc-state-changed

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
    }); // show-all-panels

    /**
     *
     * @listens document:web-connect-changed
     */
    document.addEventListener('web-connect-changed', () => {
      // Detect change in websocket connected state
      if (window.globals.webState.webConnected !== this.webConnectedLast) {
        this.webConnectedLast = window.globals.webState.webConnected;
        if (!window.globals.webState.webConnected) {
          // reset to have proper display based on ircConnected state
          this.webSocketFirstConnect = true;
        }
      }
    });
  } // connectedCallback()
});
