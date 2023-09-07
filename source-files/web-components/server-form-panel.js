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
//    HTML form for editing an IRC server definition
//
// ------------------------------------------------------------------------------
// Global Event listeners
//   collapse-all-panels
//   color-theme-changed
//   hide-all-panels
//   show-all-panels
//
// Dispatched Events
//   irc-server-edit-open
//
//  Public Methods
//    createNewIrcServer()
//    editIrcServerAtIndex(index)
//    showPanel();
//    collapsePanel();
//    hidePanel();
//
//  Public methods returning promise, run as chain of promises
//    fetchServerList(index, lock)
//    submitServer(body, method, index)
//    checkForApiError = (data)
//
//
// ------------------------------------------------------------------------------
'use strict';
window.customElements.define('server-form-panel', class extends HTMLElement {
  constructor () {
    super();
    const template = document.getElementById('serverFormPanelTemplate');
    const templateContent = template.content;
    this.attachShadow({ mode: 'open' })
      .appendChild(templateContent.cloneNode(true));
  }

  /**
   * HTTP fetch request to retrieve full list of all servers, or one server
   * @param {Number} index - Integer index into IRC server array
   * @param {Number} lock - 0 = request unlock, 1 = request lock
   * @throws {Error} - Network errors throws Error
   * @returns {Promise} Resolved to Array of Objects (without index), or one Object (index)
   */
  fetchServerList = (index, lock) => {
    return new Promise((resolve, reject) => {
      const fetchController = new AbortController();
      const fetchTimeout = document.getElementById('globVars').constants('fetchTimeout');
      const activitySpinnerEl = document.getElementById('activitySpinner');
      let urlStr = '/irc/serverlist';
      if (index >= 0) {
        urlStr += '?index=' + index.toString();
        if (lock >= 0) urlStr += '&lock=' + lock.toString();
      }
      const fetchURL = encodeURI(urlStr);
      const fetchOptions = {
        method: 'GET',
        redirect: 'error',
        signal: fetchController.signal,
        headers: {
          Accept: 'application/json'
        }
      };
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
          error.status = err.status;
          reject(error);
        });
    }); // new Promise
  }; // fetchServerList

  /**
   * HTTP fetch request to service POST, PATCH and DELETE methods
   * @param {Object} body - Object containing IRC server properties
   * @param {String} method - 'POST', 'PATCH', 'COPY' or 'DELETE'
   * @param {Number} index - Integer index into IRC server Array, or -1 for POST (new server)
   * @throws {Error} - Network errors throws Error
   * @returns {Promise} resolves to Object containing server response
   */
  submitServer = (body, method, index) => {
    return new Promise((resolve, reject) => {
      const fetchController = new AbortController();
      const fetchTimeout = document.getElementById('globVars').constants('fetchTimeout');
      const activitySpinnerEl = document.getElementById('activitySpinner');
      const csrfToken = document.getElementById('globVars').csrfToken;
      let baseUrl = '/irc/serverlist';
      if ('action' in body) baseUrl = '/irc/serverlist/tools';
      if (index !== -1) baseUrl += '?index=' + index.toString();
      const fetchURL = encodeURI(baseUrl);
      const fetchOptions = {
        method: method,
        redirect: 'error',
        signal: fetchController.signal,
        headers: {
          'CSRF-Token': csrfToken,
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      };
      activitySpinnerEl.requestActivitySpinner();
      const fetchTimerId = setTimeout(() => fetchController.abort(), fetchTimeout);
      fetch(fetchURL, fetchOptions)
        .then((response) => {
          if ((response.status === 200) || (response.status === 201)) {
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
          error.status = err.status;
          reject(error);
        });
    }); // new Promise
  }; // submitServer()

  /**
   * Used after saving changes to check for error.
   * @param {data} data - API response, example: {"status":"success","method":"PATCH","index":0}
   * @returns {Promise} Resolved to previous server response or reject with error
   */
  checkForApiError = (data) => {
    return new Promise((resolve, reject) => {
      if (data.status === 'success') {
        resolve(data);
      } else {
        reject(new Error('PATCH API did not return success status flag'));
      }
    });
  };

  /**
   * Update form to show if Socks5 proxy is enabled, if so show address
   */
  _showSocks5ProxyAvailability = () => {
    // Show availability of Socks5 proxy
    if (window.globals.ircState.enableSocks5Proxy) {
      this.shadowRoot.getElementById('ircProxyEnabledDivId').textContent =
        'Socks5 Proxy: Available';
      this.shadowRoot.getElementById('ircProxyAddrDivId').textContent =
        window.globals.ircState.socks5Host + ':' +
        window.globals.ircState.socks5Port;
    } else {
      this.shadowRoot.getElementById('ircProxyEnabledDivId').textContent =
        'Socks5 Proxy: Disabled by server';
      this.shadowRoot.getElementById('ircProxyAddrDivId').textContent = '';
    }
  }; // _showSocks5ProxyAvailability

  /**
   * Set form input elements to default values
   * @returns (Promise) Resolving to null
   */
  _clearIrcServerForm = () => {
    return new Promise((resolve, reject) => {
      this.shadowRoot.getElementById('indexInputId').value = '-1';
      this.shadowRoot.getElementById('disabledCheckboxId').checked = false;
      this.shadowRoot.getElementById('groupInputId').value = 0;
      this.shadowRoot.getElementById('nameInputId').value = '';
      this.shadowRoot.getElementById('hostInputId').value = '';
      this.shadowRoot.getElementById('portInputId').value = 6697;
      this.shadowRoot.getElementById('tlsCheckboxId').checked = true;
      this.shadowRoot.getElementById('verifyCheckboxId').checked = true;
      this._showSocks5ProxyAvailability();
      this.shadowRoot.getElementById('proxyCheckboxId').checked = false;
      this.shadowRoot.getElementById('autoReconnectCheckboxId').checked = false;
      this.shadowRoot.getElementById('loggingCheckboxId').checked = false;
      this.shadowRoot.getElementById('passwordInputId').setAttribute('disabled', '');
      this.shadowRoot.getElementById('passwordInputId').value = '(Blank)';
      this.shadowRoot.getElementById('replacePasswordButton').removeAttribute('hidden');
      this.shadowRoot.getElementById('serverPasswordWarningDiv').setAttribute('hidden', '');
      this.shadowRoot.getElementById('saslUsernameInputId').value = '';
      this.shadowRoot.getElementById('saslPasswordInputId').setAttribute('disabled', '');
      this.shadowRoot.getElementById('saslPasswordInputId').value = '(Blank)';
      this.shadowRoot.getElementById('replaceSaslPasswordButton').removeAttribute('hidden');
      this.shadowRoot.getElementById('serverSaslPasswordWarningDiv').setAttribute('hidden', '');
      this.shadowRoot.getElementById('identifyNickInputId').value = '';
      this.shadowRoot.getElementById('identifyCommandInputId').setAttribute('disabled', '');
      this.shadowRoot.getElementById('identifyCommandInputId').value = '(blank)';
      this.shadowRoot.getElementById('replaceIdentifyCommandButton').removeAttribute('hidden');
      this.shadowRoot.getElementById('nickservCommandWarningDiv').setAttribute('hidden', '');
      this.shadowRoot.getElementById('nickInputId').value = '';
      this.shadowRoot.getElementById('altNickInputId').value = '';
      this.shadowRoot.getElementById('recoverNickCheckboxId').checked = false;
      this.shadowRoot.getElementById('userInputId').value = '';
      this.shadowRoot.getElementById('realInputId').value = '';
      this.shadowRoot.getElementById('modesInputId').value = '';
      this.shadowRoot.getElementById('channelListInputId').value = '';
      resolve(null);
    });
  };

  /**
   * Parse form input elements to determine IRC Server Properties
   * Example: {index: 0, data: { ... }}
   * @returns (Promise) Resolving to Object, or reject if error
   */
  _parseFormInputValues = () => {
    return new Promise((resolve, reject) => {
      const index = parseInt(this.shadowRoot.getElementById('indexInputId').value);
      const data = {};
      if (index !== -1) data.index = parseInt(this.shadowRoot.getElementById('indexInputId').value);
      if (this.shadowRoot.getElementById('disabledCheckboxId').checked) {
        data.disabled = true;
      } else {
        data.disabled = false;
      }
      data.group = parseInt(this.shadowRoot.getElementById('groupInputId').value);
      data.name = this.shadowRoot.getElementById('nameInputId').value;
      data.host = this.shadowRoot.getElementById('hostInputId').value;
      data.port = parseInt(this.shadowRoot.getElementById('portInputId').value);
      if (this.shadowRoot.getElementById('tlsCheckboxId').checked) {
        data.tls = true;
      } else {
        data.tls = false;
      }
      if (this.shadowRoot.getElementById('verifyCheckboxId').checked) {
        data.verify = true;
      } else {
        data.verify = false;
      }
      if (this.shadowRoot.getElementById('proxyCheckboxId').checked) {
        data.proxy = true;
      } else {
        data.proxy = false;
      }
      if (this.shadowRoot.getElementById('autoReconnectCheckboxId').checked) {
        data.reconnect = true;
      } else {
        data.reconnect = false;
      }
      if (this.shadowRoot.getElementById('loggingCheckboxId').checked) {
        data.logging = true;
      } else {
        data.logging = false;
      }
      if (!(this.shadowRoot.getElementById('passwordInputId').hasAttribute('disabled'))) {
        data.password = this.shadowRoot.getElementById('passwordInputId').value;
      }
      data.saslUsername = this.shadowRoot.getElementById('saslUsernameInputId').value;
      if (!(this.shadowRoot.getElementById('saslPasswordInputId').hasAttribute('disabled'))) {
        data.saslPassword = this.shadowRoot.getElementById('saslPasswordInputId').value;
      }
      data.identifyNick = this.shadowRoot.getElementById('identifyNickInputId').value;
      if (!(this.shadowRoot.getElementById('identifyCommandInputId').hasAttribute('disabled'))) {
        data.identifyCommand = this.shadowRoot.getElementById('identifyCommandInputId').value;
      }
      data.nick = this.shadowRoot.getElementById('nickInputId').value;
      data.altNick = this.shadowRoot.getElementById('altNickInputId').value;
      if (this.shadowRoot.getElementById('recoverNickCheckboxId').checked) {
        data.recoverNick = true;
      } else {
        data.recoverNick = false;
      }
      data.user = this.shadowRoot.getElementById('userInputId').value;
      data.real = this.shadowRoot.getElementById('realInputId').value;
      data.modes = this.shadowRoot.getElementById('modesInputId').value;
      data.channelList = this.shadowRoot.getElementById('channelListInputId').value;

      let errorStr = null;
      if (isNaN(data.group)) errorStr = 'Invalid group number';
      if (parseInt(data.group) < 0) errorStr = 'Invalid group number';
      if (data.name === '') errorStr = 'Label is required input.';
      if (data.host === '') errorStr = 'Host/IP is required input.';
      if (isNaN(data.port)) errorStr = 'Invalid port number';
      if (data.nick === data.altNick) {
        errorStr = 'Nickname and alternate nickname must be different.';
      }
      if ((data.recoverNick) && (data.altNick.length === 0)) {
        errorStr = 'Nickname recovery checkbox set without valid alternate nickname';
      }
      if (data.nick === '') errorStr = 'Nickname is required input.';
      if (data.user === '') errorStr = 'Unix ident user is required input.';
      if (data.real === '') errorStr = 'Real Name is required input.';
      if (errorStr) {
        const parseError = new Error(errorStr);
        parseError.parseError = true;
        reject(parseError);
      } else {
        resolve({ data: data, index: index });
      }
    });
  }; // _parseFormInputValues()

  /**
   * Set form input elements to downloaded values
   * @param {Object} data - Object containing IRC server properties
   * @returns (Promise) Resolving to null
   */
  _populateIrcServerForm = (data) => {
    return new Promise((resolve, reject) => {
      this.shadowRoot.getElementById('indexInputId').value = data.index.toString();
      if (data.disabled) {
        this.shadowRoot.getElementById('disabledCheckboxId').checked = true;
      } else {
        this.shadowRoot.getElementById('disabledCheckboxId').checked = false;
      }
      if ('group' in data) {
        this.shadowRoot.getElementById('groupInputId').value = parseInt(data.group);
      } else {
        // Case of loading servers.json from earlier version
        this.shadowRoot.getElementById('groupInputId').value = 0;
      }
      this.shadowRoot.getElementById('nameInputId').value = data.name;
      this.shadowRoot.getElementById('hostInputId').value = data.host;
      this.shadowRoot.getElementById('portInputId').value = parseInt(data.port);
      if (data.tls) {
        this.shadowRoot.getElementById('tlsCheckboxId').checked = true;
      } else {
        this.shadowRoot.getElementById('tlsCheckboxId').checked = false;
      }
      if (data.verify) {
        this.shadowRoot.getElementById('verifyCheckboxId').checked = true;
      } else {
        this.shadowRoot.getElementById('verifyCheckboxId').checked = false;
      }
      if (data.proxy) {
        this.shadowRoot.getElementById('proxyCheckboxId').checked = true;
      } else {
        this.shadowRoot.getElementById('proxyCheckboxId').checked = false;
      }
      if (data.reconnect) {
        this.shadowRoot.getElementById('autoReconnectCheckboxId').checked = true;
      } else {
        this.shadowRoot.getElementById('autoReconnectCheckboxId').checked = false;
      }
      if (data.logging) {
        this.shadowRoot.getElementById('loggingCheckboxId').checked = true;
      } else {
        this.shadowRoot.getElementById('loggingCheckboxId').checked = false;
      }
      this.shadowRoot.getElementById('passwordInputId').setAttribute('disabled', '');
      this.shadowRoot.getElementById('replacePasswordButton').removeAttribute('hidden');
      if (data.password === null) {
        this.shadowRoot.getElementById('passwordInputId').value = '(hidden)';
      } else {
        this.shadowRoot.getElementById('passwordInputId').value = '(blank)';
      }
      this.shadowRoot.getElementById('serverPasswordWarningDiv').setAttribute('hidden', '');
      this.shadowRoot.getElementById('saslUsernameInputId').value = data.saslUsername;
      this.shadowRoot.getElementById('saslPasswordInputId').setAttribute('disabled', '');
      this.shadowRoot.getElementById('replaceSaslPasswordButton').removeAttribute('hidden');
      if (data.saslPassword === null) {
        this.shadowRoot.getElementById('saslPasswordInputId').value = '(hidden)';
      } else {
        this.shadowRoot.getElementById('saslPasswordInputId').value = '(blank)';
      }
      this.shadowRoot.getElementById('serverSaslPasswordWarningDiv').setAttribute('hidden', '');
      this.shadowRoot.getElementById('identifyNickInputId').value = data.identifyNick;
      this.shadowRoot.getElementById('identifyCommandInputId').setAttribute('disabled', '');
      this.shadowRoot.getElementById('replaceIdentifyCommandButton').removeAttribute('hidden');
      if (data.identifyCommand === null) {
        this.shadowRoot.getElementById('identifyCommandInputId').value = '(hidden)';
      } else {
        this.shadowRoot.getElementById('identifyCommandInputId').value = '(blank)';
      }
      this.shadowRoot.getElementById('nickservCommandWarningDiv').setAttribute('hidden', '');
      this.shadowRoot.getElementById('nickInputId').value = data.nick;
      this.shadowRoot.getElementById('altNickInputId').value = data.altNick;
      if (data.altNick.length === 0) {
        this.shadowRoot.getElementById('recoverNickCheckboxId').checked = false;
      } else {
        if (data.recoverNick) {
          this.shadowRoot.getElementById('recoverNickCheckboxId').checked = true;
        } else {
          this.shadowRoot.getElementById('recoverNickCheckboxId').checked = false;
        }
      }
      this.shadowRoot.getElementById('userInputId').value = data.user;
      this.shadowRoot.getElementById('realInputId').value = data.real;
      this.shadowRoot.getElementById('modesInputId').value = data.modes;
      this.shadowRoot.getElementById('channelListInputId').value = data.channelList;

      // Show availability of Socks5 proxy
      this._showSocks5ProxyAvailability();
      resolve(data);
    });
  };

  /**
   * Make server form visible, with proper buttons configured
   * This for has javascript capability to submit POST to database
   */
  createNewIrcServer = () => {
    if (window.globals.ircState.ircConnected) {
      document.getElementById('errorPanel').showError(
        'Disconnect from IRC before editing IRC server configuration');
      return;
    }
    if (window.globals.webState.ircServerEditOpen) {
      document.getElementById('errorPanel').showError(
        'Another edit session is in progress');
      return;
    }
    window.globals.webState.ircServerEditOpen = true;
    document.dispatchEvent(new CustomEvent('irc-server-edit-open'));
    this._clearIrcServerForm()
      .then(() => {
        this.shadowRoot.getElementById('saveNewButtonId').removeAttribute('hidden');
        this.shadowRoot.getElementById('saveNewButtonId2').removeAttribute('hidden');
        this.shadowRoot.getElementById('saveModifiedButtonId').setAttribute('hidden', '');
        this.shadowRoot.getElementById('saveModifiedButtonId2').setAttribute('hidden', '');
        this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible', '');
      })
      .catch((err) => {
        console.log(err);
        let message = err.message || err.toString() || 'Error';
        message = message.split('\n')[0];
        document.getElementById('errorPanel').showError(message);
        window.globals.webState.ircServerEditOpen = false;
        this.hidePanel();
      });
  }; // createNewIrcServer

  /**
   * Make server form visible, with proper buttons configured
   * Fetch existing IRC server definition and populate form with previous values
   * This for has javascript capability to submit PATCH to database with new data
   * @param {Number} index - Integer index into IRC server array
  */
  editIrcServerAtIndex = (index) => {
    if (window.globals.ircState.ircConnected) {
      document.getElementById('errorPanel').showError(
        'Disconnect from IRC before editing IRC server configuration');
      return;
    }
    if (window.globals.webState.ircServerEditOpen) {
      document.getElementById('errorPanel').showError(
        'Another edit session is in progress');
      return;
    }
    window.globals.webState.ircServerEditOpen = true;
    document.dispatchEvent(new CustomEvent('irc-server-edit-open'));
    this._clearIrcServerForm()
      .then(() => this.fetchServerList(index, 1))
      .then((data) => this._populateIrcServerForm(data))
      .then(() => {
        // console.log(JSON.stringify(data, null, 2));
        this.shadowRoot.getElementById('saveNewButtonId').setAttribute('hidden', '');
        this.shadowRoot.getElementById('saveNewButtonId2').setAttribute('hidden', '');
        this.shadowRoot.getElementById('saveModifiedButtonId').removeAttribute('hidden');
        this.shadowRoot.getElementById('saveModifiedButtonId2').removeAttribute('hidden');
        this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible', '');
      })
      .catch((err) => {
        console.log(err);
        let message = err.message || err.toString() || 'Error';
        // keep only 1 line
        message = message.split('\n')[0];
        if (err.status === 409) {
          document.getElementById('errorPanel').showError('Database Locked');
        } else if (err.status === 405) {
          document.getElementById('errorPanel').showError('Database Disabled');
        } else {
          document.getElementById('errorPanel').showError(message);
        }
        window.globals.webState.ircServerEditOpen = false;
        this.hidePanel();
      });
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
    this.shadowRoot.getElementById('saveNewButtonId').setAttribute('hidden', '');
    this.shadowRoot.getElementById('saveNewButtonId2').setAttribute('hidden', '');
    this.shadowRoot.getElementById('saveModifiedButtonId').setAttribute('hidden', '');
    this.shadowRoot.getElementById('saveModifiedButtonId2').setAttribute('hidden', '');
    this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible', '');
    this._scrollToTop();
  };

  /**
   * Hide panel
   */
  hidePanel = () => {
    if (!window.globals.webState.webConnected) {
      this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible');
      this.shadowRoot.getElementById('saveNewButtonId').setAttribute('hidden', '');
      this.shadowRoot.getElementById('saveNewButtonId2').setAttribute('hidden', '');
      this.shadowRoot.getElementById('saveModifiedButtonId').setAttribute('hidden', '');
      this.shadowRoot.getElementById('saveModifiedButtonId2').setAttribute('hidden', '');
    } else {
      const ircControlsPanelEl = document.getElementById('ircControlsPanel');
      if (window.globals.webState.ircServerEditOpen) {
        // unlock database
        this.fetchServerList(0, 0)
          .then(() => {
            window.globals.webState.ircServerEditOpen = false;
            console.log('Unlock database after aborted edit');
            this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible');
          })
          // Get IRC state to force update of other windows.
          .then(ircControlsPanelEl.getIrcState)
          .catch((err) => {
            console.log(err);
            let message = err.message || err.toString() || 'Error';
            // keep only 1 line
            message = message.split('\n')[0];
            document.getElementById('errorPanel').showError(message);
            this.shadowRoot.getElementById('saveNewButtonId').setAttribute('hidden', '');
            this.shadowRoot.getElementById('saveNewButtonId2').setAttribute('hidden', '');
            this.shadowRoot.getElementById('saveModifiedButtonId').setAttribute('hidden', '');
            this.shadowRoot.getElementById('saveModifiedButtonId2').setAttribute('hidden', '');
            // on error leave panel open
          });
      } else {
        // else not locked, close the panel
        this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible');
      }
    }
  };

  /**
   * this panel does not collapse, so close it.
   */
  collapsePanel = () => {
    this.hidePanel();
  };

  /**
   * Event handle for form Save button (New Record)
   */
  _saveNewButtonHandler = () => {
    const ircControlsPanelEl = document.getElementById('ircControlsPanel');
    const errorPanelEl = document.getElementById('errorPanel');
    // Calling submitServer() will reset the selected index to 0
    let previousSelectedIndex = window.globals.ircState.ircServerIndex;
    // Case of no servers exist, then index -1 should be changed to 0
    if (previousSelectedIndex === -1) previousSelectedIndex = 0;

    this._parseFormInputValues()
      // .then((data) => {
      //   console.log(JSON.stringify(data, null, 2));
      //   return Promise.resolve(data);
      // })
      .then((data) => this.submitServer(data.data, 'POST', -1))
      .then((data) => this.checkForApiError(data))
      .then(() => ircControlsPanelEl.serverSetIndexHandler(previousSelectedIndex))
      .then((data) => {
        if (('index' in data) && (parseInt(data.index) === previousSelectedIndex)) {
          window.globals.webState.ircServerEditOpen = false;
          this.hidePanel();
          // To update channel preset buttons
          window.globals.webState.ircServerModified = true;
          // End of promise chain, return
        } else {
          return Promise.reject(new Error('Unable to restore server index after edit'));
        }
      })
      .catch((err) => {
        console.log(err);
        let message = err.message || err.toString() || 'Error';
        // keep only 1 line
        message = message.split('\n')[0];
        // allow retry for data validation error, else remove save buttons
        if ((err.status) && (err.status === 422)) {
          message = 'Input validation rejected by server (Status 422)';
        } else {
          if (!err.parseError) {
            this.shadowRoot.getElementById('saveNewButtonId').setAttribute('hidden', '');
            this.shadowRoot.getElementById('saveNewButtonId2').setAttribute('hidden', '');
            this.shadowRoot.getElementById('saveModifiedButtonId').setAttribute('hidden', '');
            this.shadowRoot.getElementById('saveModifiedButtonId2').setAttribute('hidden', '');
          }
        }
        errorPanelEl.showError(message);
        // on error leave panel open
      });
  };

  /**
   * Event handler for browser Save button (Modified record)
   */
  _saveModifiedButtonHandler = () => {
    const ircControlsPanelEl = document.getElementById('ircControlsPanel');
    const errorPanelEl = document.getElementById('errorPanel');
    // Calling submitServer() will reset the selected index to 0
    const previousSelectedIndex = window.globals.ircState.ircServerIndex;
    this._parseFormInputValues()
      // .then((data) => {
      //   console.log(JSON.stringify(data, null, 2));
      //   return Promise.resolve(data);
      // })
      .then((data) => this.submitServer(data.data, 'PATCH', data.index))
      .then((data) => this.checkForApiError(data))
      .then(() => ircControlsPanelEl.serverSetIndexHandler(previousSelectedIndex))
      .then((data) => {
        if (('index' in data) && (parseInt(data.index) === previousSelectedIndex)) {
          window.globals.webState.ircServerEditOpen = false;
          this.hidePanel();
          // To update channel preset buttons
          window.globals.webState.ircServerModified = true;
          // End of promise chain, return
        } else {
          return Promise.reject(new Error('Unable to restore server index after edit'));
        }
      })
      .catch((err) => {
        console.log(err);
        let message = err.message || err.toString() || 'Error';
        // keep only 1 line
        message = message.split('\n')[0];
        // allow retry for data validation error, else remove save buttons
        if ((err.status) && (err.status === 422)) {
          message = 'Input validation rejected by server (Status 422)';
        } else {
          if (!err.parseError) {
            this.shadowRoot.getElementById('saveNewButtonId').setAttribute('hidden', '');
            this.shadowRoot.getElementById('saveNewButtonId2').setAttribute('hidden', '');
            this.shadowRoot.getElementById('saveModifiedButtonId').setAttribute('hidden', '');
            this.shadowRoot.getElementById('saveModifiedButtonId2').setAttribute('hidden', '');
          }
        }
        errorPanelEl.showError(message);
        // on error leave panel open
      });
  };

  // ------------------
  // Main entry point
  // ------------------
  initializePlugin = () => {
    // Set descriptive button titles
    this.shadowRoot.getElementById('saveNewButtonId').setAttribute('title',
      'Save new IRC server configuration to database and close form.');
    this.shadowRoot.getElementById('saveNewButtonId2').setAttribute('title',
      'Save new IRC server configuration to database and close form.');
    this.shadowRoot.getElementById('saveModifiedButtonId2').setAttribute('title',
      'Save modified IRC server configuration to database and close form.');
    this.shadowRoot.getElementById('saveModifiedButtonId').setAttribute('title',
      'Save modified IRC server configuration to database and close form.');
    this.shadowRoot.getElementById('cancelEditButtonId').setAttribute('title',
      'Discard changes and close form');
    this.shadowRoot.getElementById('cancelEditButtonId').setAttribute('title',
      'Discard changes and close form');
  };

  // add event listeners to connected callback
  // -------------------------------------------
  connectedCallback () {
    // -------------------------------------
    // 1 of 2 Listeners on internal elements
    // -------------------------------------

    // -------------------------------------
    // Panel Close Button
    // -------------------------------------
    this.shadowRoot.getElementById('closePanelButtonId').addEventListener('click', () => {
      this.hidePanel();
    });

    this.shadowRoot.getElementById('cancelEditButtonId').addEventListener('click', () => {
      this.hidePanel();
    });
    this.shadowRoot.getElementById('cancelEditButtonId2').addEventListener('click', () => {
      this.hidePanel();
    });
    /**
     * Save Modified IRC Server Button Event Handler
     */
    this.shadowRoot.getElementById('saveModifiedButtonId').addEventListener('click',
      this._saveModifiedButtonHandler);
    this.shadowRoot.getElementById('saveModifiedButtonId2').addEventListener('click',
      this._saveModifiedButtonHandler);

    /**
     * Save New IRC Server Button Event Handler
     */
    this.shadowRoot.getElementById('saveNewButtonId').addEventListener('click',
      this._saveNewButtonHandler);
    this.shadowRoot.getElementById('saveNewButtonId2').addEventListener('click',
      this._saveNewButtonHandler);

    /**
     * Replace IRC server password Button Event Handler
     */
    this.shadowRoot.getElementById('replacePasswordButton').addEventListener('click', () => {
      this.shadowRoot.getElementById('passwordInputId').removeAttribute('disabled');
      this.shadowRoot.getElementById('passwordInputId').value = '';
      this.shadowRoot.getElementById('replacePasswordButton').setAttribute('hidden', '');
      this.shadowRoot.getElementById('serverPasswordWarningDiv').removeAttribute('hidden');
    });

    /**
     * Replace IRC server SASL password Button Event Handler
     */
    this.shadowRoot.getElementById('replaceSaslPasswordButton').addEventListener('click', () => {
      this.shadowRoot.getElementById('saslPasswordInputId').removeAttribute('disabled');
      this.shadowRoot.getElementById('saslPasswordInputId').value = '';
      this.shadowRoot.getElementById('replaceSaslPasswordButton').setAttribute('hidden', '');
      this.shadowRoot.getElementById('serverSaslPasswordWarningDiv').removeAttribute('hidden');
    });

    /**
     * Replace Nickserv Command Button Event Handler
     */
    this.shadowRoot.getElementById('replaceIdentifyCommandButton').addEventListener('click', () => {
      this.shadowRoot.getElementById('identifyCommandInputId').removeAttribute('disabled');
      this.shadowRoot.getElementById('identifyCommandInputId').value = '';
      this.shadowRoot.getElementById('replaceIdentifyCommandButton').setAttribute('hidden', '');
      this.shadowRoot.getElementById('nickservCommandWarningDiv').removeAttribute('hidden');
    });

    /**
     * Show help for server inputs
     */
    this.shadowRoot.getElementById('disabledCheckboxInfoBtn').addEventListener('click', () => {
      if (this.shadowRoot.getElementById('disabledCheckboxInfo').hasAttribute('hidden')) {
        this.shadowRoot.getElementById('disabledCheckboxInfo').removeAttribute('hidden');
      } else {
        this.shadowRoot.getElementById('disabledCheckboxInfo').setAttribute('hidden', '');
      }
    });

    this.shadowRoot.getElementById('groupInputInfoBtn').addEventListener('click', () => {
      if (this.shadowRoot.getElementById('groupInputInfo').hasAttribute('hidden')) {
        this.shadowRoot.getElementById('groupInputInfo').removeAttribute('hidden');
      } else {
        this.shadowRoot.getElementById('groupInputInfo').setAttribute('hidden', '');
      }
    });

    this.shadowRoot.getElementById('nameInputInfoBtn').addEventListener('click', () => {
      if (this.shadowRoot.getElementById('nameInputInfo').hasAttribute('hidden')) {
        this.shadowRoot.getElementById('nameInputInfo').removeAttribute('hidden');
      } else {
        this.shadowRoot.getElementById('nameInputInfo').setAttribute('hidden', '');
      }
    });

    this.shadowRoot.getElementById('autoReconnectCheckboxInfoBtn').addEventListener('click', () => {
      if (this.shadowRoot.getElementById('autoReconnectCheckboxInfo').hasAttribute('hidden')) {
        this.shadowRoot.getElementById('autoReconnectCheckboxInfo').removeAttribute('hidden');
      } else {
        this.shadowRoot.getElementById('autoReconnectCheckboxInfo').setAttribute('hidden', '');
      }
    });

    this.shadowRoot.getElementById('loggingCheckboxInfoBtn').addEventListener('click', () => {
      if (this.shadowRoot.getElementById('loggingCheckboxInfo').hasAttribute('hidden')) {
        this.shadowRoot.getElementById('loggingCheckboxInfo').removeAttribute('hidden');
      } else {
        this.shadowRoot.getElementById('loggingCheckboxInfo').setAttribute('hidden', '');
      }
    });

    this.shadowRoot.getElementById('hostInputInfoBtn').addEventListener('click', () => {
      if (this.shadowRoot.getElementById('hostInputInfo').hasAttribute('hidden')) {
        this.shadowRoot.getElementById('hostInputInfo').removeAttribute('hidden');
      } else {
        this.shadowRoot.getElementById('hostInputInfo').setAttribute('hidden', '');
      }
    });

    this.shadowRoot.getElementById('proxyCheckboxInfoBtn').addEventListener('click', () => {
      if (this.shadowRoot.getElementById('proxyCheckboxInfo').hasAttribute('hidden')) {
        this.shadowRoot.getElementById('proxyCheckboxInfo').removeAttribute('hidden');
      } else {
        this.shadowRoot.getElementById('proxyCheckboxInfo').setAttribute('hidden', '');
      }
    });

    // this.shadowRoot.getElementById('ircProxyInfoBtn').addEventListener('click', () => {
    //   if (this.shadowRoot.getElementById('ircProxyInfo').hasAttribute('hidden')) {
    //     this.shadowRoot.getElementById('ircProxyInfo').removeAttribute('hidden');
    //   } else {
    //     this.shadowRoot.getElementById('ircProxyInfo').setAttribute('hidden', '');
    //   }
    // });

    this.shadowRoot.getElementById('passwordInputInfoBtn').addEventListener('click', () => {
      if (this.shadowRoot.getElementById('passwordInputInfo').hasAttribute('hidden')) {
        this.shadowRoot.getElementById('passwordInputInfo').removeAttribute('hidden');
      } else {
        this.shadowRoot.getElementById('passwordInputInfo').setAttribute('hidden', '');
      }
    });

    this.shadowRoot.getElementById('saslUsernameInputInfoBtn').addEventListener('click', () => {
      if (this.shadowRoot.getElementById('saslUsernameInputInfo').hasAttribute('hidden')) {
        this.shadowRoot.getElementById('saslUsernameInputInfo').removeAttribute('hidden');
      } else {
        this.shadowRoot.getElementById('saslUsernameInputInfo').setAttribute('hidden', '');
      }
    });

    this.shadowRoot.getElementById('saslPasswordInputInfoBtn').addEventListener('click', () => {
      if (this.shadowRoot.getElementById('saslPasswordInputInfo').hasAttribute('hidden')) {
        this.shadowRoot.getElementById('saslPasswordInputInfo').removeAttribute('hidden');
      } else {
        this.shadowRoot.getElementById('saslPasswordInputInfo').setAttribute('hidden', '');
      }
    });

    this.shadowRoot.getElementById('nickInputInfoBtn').addEventListener('click', () => {
      if (this.shadowRoot.getElementById('nickInputInfo').hasAttribute('hidden')) {
        this.shadowRoot.getElementById('nickInputInfo').removeAttribute('hidden');
      } else {
        this.shadowRoot.getElementById('nickInputInfo').setAttribute('hidden', '');
      }
    });

    this.shadowRoot.getElementById('altNickInputInfoBtn').addEventListener('click', () => {
      if (this.shadowRoot.getElementById('altNickInputInfo').hasAttribute('hidden')) {
        this.shadowRoot.getElementById('altNickInputInfo').removeAttribute('hidden');
      } else {
        this.shadowRoot.getElementById('altNickInputInfo').setAttribute('hidden', '');
      }
    });

    this.shadowRoot.getElementById('recoverNickCheckboxInfoBtn').addEventListener('click', () => {
      if (this.shadowRoot.getElementById('recoverNickCheckboxInfo').hasAttribute('hidden')) {
        this.shadowRoot.getElementById('recoverNickCheckboxInfo').removeAttribute('hidden');
      } else {
        this.shadowRoot.getElementById('recoverNickCheckboxInfo').setAttribute('hidden', '');
      }
    });

    this.shadowRoot.getElementById('realInputInfoBtn').addEventListener('click', () => {
      if (this.shadowRoot.getElementById('realInputInfo').hasAttribute('hidden')) {
        this.shadowRoot.getElementById('realInputInfo').removeAttribute('hidden');
      } else {
        this.shadowRoot.getElementById('realInputInfo').setAttribute('hidden', '');
      }
    });

    this.shadowRoot.getElementById('userInputInfoBtn').addEventListener('click', () => {
      if (this.shadowRoot.getElementById('userInputInfo').hasAttribute('hidden')) {
        this.shadowRoot.getElementById('userInputInfo').removeAttribute('hidden');
      } else {
        this.shadowRoot.getElementById('userInputInfo').setAttribute('hidden', '');
      }
    });

    this.shadowRoot.getElementById('identifyNickInputInfoBtn').addEventListener('click', () => {
      if (this.shadowRoot.getElementById('identifyNickInputInfo').hasAttribute('hidden')) {
        this.shadowRoot.getElementById('identifyNickInputInfo').removeAttribute('hidden');
      } else {
        this.shadowRoot.getElementById('identifyNickInputInfo').setAttribute('hidden', '');
      }
    });

    this.shadowRoot.getElementById('modesInputInfoBtn').addEventListener('click', () => {
      if (this.shadowRoot.getElementById('modesInputInfo').hasAttribute('hidden')) {
        this.shadowRoot.getElementById('modesInputInfo').removeAttribute('hidden');
      } else {
        this.shadowRoot.getElementById('modesInputInfo').setAttribute('hidden', '');
      }
    });

    this.shadowRoot.getElementById('channelListInputInfoBtn').addEventListener('click', () => {
      if (this.shadowRoot.getElementById('channelListInputInfo').hasAttribute('hidden')) {
        this.shadowRoot.getElementById('channelListInputInfo').removeAttribute('hidden');
      } else {
        this.shadowRoot.getElementById('channelListInputInfo').setAttribute('hidden', '');
      }
    });

    this.shadowRoot.getElementById('identifyCommandInputInfoBtn').addEventListener('click', () => {
      if (this.shadowRoot.getElementById('identifyCommandInputInfo').hasAttribute('hidden')) {
        this.shadowRoot.getElementById('identifyCommandInputInfo').removeAttribute('hidden');
      } else {
        this.shadowRoot.getElementById('identifyCommandInputInfo').setAttribute('hidden', '');
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

    document.addEventListener('color-theme-changed', (event) => {
      const panelDivEl = this.shadowRoot.getElementById('panelDivId');
      if (event.detail.theme === 'light') {
        panelDivEl.classList.remove('server-form-theme-dark');
        panelDivEl.classList.add('server-form-theme-light');
      } else {
        panelDivEl.classList.remove('server-form-theme-light');
        panelDivEl.classList.add('server-form-theme-dark');
      }
      let newTextTheme = 'global-text-theme-dark';
      let oldTextTheme = 'global-text-theme-light';
      if (document.querySelector('body').getAttribute('theme') === 'light') {
        newTextTheme = 'global-text-theme-light';
        oldTextTheme = 'global-text-theme-dark';
      }
      let inputEls = Array.from(this.shadowRoot.querySelectorAll('input'));
      inputEls.forEach((el) => {
        el.classList.remove(oldTextTheme);
        el.classList.add(newTextTheme);
      });
      newTextTheme = 'server-form-input-group1-dark';
      oldTextTheme = 'server-form-input-group1-light';
      if (document.querySelector('body').getAttribute('theme') === 'light') {
        newTextTheme = 'server-form-input-group1-light';
        oldTextTheme = 'server-form-input-group1-dark';
      }
      inputEls = Array.from(this.shadowRoot.querySelectorAll('.server-form-group1'));
      inputEls.forEach((el) => {
        el.classList.remove(oldTextTheme);
        el.classList.add(newTextTheme);
      });
      newTextTheme = 'server-form-input-group2-dark';
      oldTextTheme = 'server-form-input-group2-light';
      if (document.querySelector('body').getAttribute('theme') === 'light') {
        newTextTheme = 'server-form-input-group2-light';
        oldTextTheme = 'server-form-input-group2-dark';
      }
      inputEls = Array.from(this.shadowRoot.querySelectorAll('.server-form-group2'));
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
