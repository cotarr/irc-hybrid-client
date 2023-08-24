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
// ------------------------------------------------------------------------------
'use strict';
window.customElements.define('server-list-panel', class extends HTMLElement {
  constructor () {
    super();
    const template = document.getElementById('serverListPanelTemplate');
    const templateContent = template.content;
    this.attachShadow({ mode: 'open' })
      .appendChild(templateContent.cloneNode(true));
    this.mobileWedthBreakpointPixels = 500;
    this.mobileWidth = false;
    this.fullWidth = false;
    this.editable = true;
    this.selectButtonIdList = [];
    this.connectButtonIdList = [];
    this.disabledCheckboxIdList = [];
    this.editButtonIdList = [];
    this.copyButtonIdList = [];
    this.deleteButtonIdList = [];
    this.moveUpButtonIdList = [];
    this.ircConnectedLast = false;
  }

  setVisibility = () => {
    if (window.globals.ircState.disableServerListEditor) {
      this.shadowRoot.getElementById('serverListDisabledDivId').removeAttribute('hidden');
    } else {
      this.shadowRoot.getElementById('serverListDisabledDivId').setAttribute('hidden', '');
    }
    const createNewButtonEl = this.shadowRoot.getElementById('createNewButtonId');
    const forceUnlockButtonEl = this.shadowRoot.getElementById('forceUnlockButtonId');
    createNewButtonEl.removeAttribute('hidden');
    forceUnlockButtonEl.removeAttribute('hidden');
    if (window.globals.ircState.disableServerListEditor) {
      createNewButtonEl.setAttribute('hidden', '');
      forceUnlockButtonEl.setAttribute('hidden', '');
    }
    if (window.globals.ircState.ircConnected) {
      createNewButtonEl.setAttribute('hidden', '');
      forceUnlockButtonEl.setAttribute('hidden', '');
    }
  };

  showPanel = () => {
    if (!this.shadowRoot.getElementById('panelVisibilityDivId').hasAttribute('visible')) {
      this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible', '');
      if (window.globals.ircState.ircConnected) {
        this.editable = false;
      }
      if (!window.globals.ircState.ircConnected) {
        // Case of panel visible, just disconnected from IRC
        this.editable = true;
        this.fullWidth = false;
        this.mobileWidth = false;
        if (window.globals.webState.dynamic.bodyClientWidth <
          this.mobileWedthBreakpointPixels) {
          this.mobileWidth = true;
        }
      }
    }
    this.setVisibility();
    // if (window.globals.ircState.ircConnected) {
    //   this.shadowRoot.getElementById('disconnectButtonId').removeAttribute('disabled');
    // } else {
    //   this.shadowRoot.getElementById('disconnectButtonId').setAttribute('disabled', '');
    // }
    document.getElementById('serverFormPanel').fetchServerList(-1, -1)
      .then((data) => this.buildServerListTable(data))
      .catch((err) => {
        console.log(err);
        let message = err.message || err.toString() || 'Error';
        message = message.split('\n')[0];
        document.getElementById('errorPanel').showError(message);
      });
  };

  hidePanel = () => {
    this.clearServerListTable();
    this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible');
  };

  // this panel does not collapse, so close it.
  collapsePanel = () => {
    this.hidePanel();
  };

  /**
   * Button Event Handler to service dynamically generated buttons in server list table
   * @param {Number} index - Integer index into IRC server Array
   */
  selectServerButtonHandler = (event) => {
    // console.log(event.target.id, event.target.getAttribute('index'));
    if ((window.globals.ircState.ircConnected) || (window.globals.ircState.ircConnecting)) {
      document.getElementById('errorPanel')
        .showError('May not select server when connected to IRC');
    } else {
      const ircControlsPanelEl = document.getElementById('ircControlsPanel');
      const index = parseInt(event.target.getAttribute('index'));
      this.clearServerListTable();
      ircControlsPanelEl.serverSetIndexHandler(index)
        .then((data) => {
          if (('index' in data) && (parseInt(data.index) === index)) {
            return Promise.resolve(index);
          } else {
            throw new Error('Unable to set server index');
          }
        })
        .catch((err) => {
          console.log(err);
          let message = err.message || err.toString() || 'Error';
          message = message.split('\n')[0];
          document.getElementById('errorPanel').showError(message);
        });
    }
  };

  /**
   * Button Event Handler to service dynamically generated buttons in server list table
   * @param {Number} index - Integer index into IRC server Array
   */
  connectToIrcButtonHandler = (event) => {
    // console.log(event.target.id, event.target.getAttribute('index'));
    if ((window.globals.ircState.ircConnected) || (window.globals.ircState.ircConnecting)) {
      document.getElementById('ircControlsPanel').disconnectHandler();
    } else {
      const ircControlsPanelEl = document.getElementById('ircControlsPanel');
      const index = parseInt(event.target.getAttribute('index'));
      this.clearServerListTable();
      ircControlsPanelEl.serverSetIndexHandler(index)
        .then((data) => {
          if (('index' in data) && (parseInt(data.index) === index)) {
            return Promise.resolve(index);
          } else {
            throw new Error('Unable to set server index');
          }
        })
        .then(ircControlsPanelEl.connectHandler)
        .catch((err) => {
          console.log(err);
          let message = err.message || err.toString() || 'Error';
          message = message.split('\n')[0];
          document.getElementById('errorPanel').showError(message);
        });
    }
  };

  /**
   * Button Event Handler to service dynamically generated buttons in server list table
   * @param {Number} index - Integer index into IRC server Array
   */
  toggleDisabledCheckboxHandler = (event) => {
    // console.log(event.target.id, event.target.getAttribute('index'));
    const serverFormPanelEl = document.getElementById('serverFormPanel');
    const index = parseInt(event.target.getAttribute('index'));
    this.clearServerListTable();
    serverFormPanelEl.submitServer({ index: index, action: 'toggle-disabled' }, 'POST', index)
      .then((data) => serverFormPanelEl.checkForApiError(data))
      .catch((err) => {
        console.log(err);
        let message = err.message || err.toString() || 'Error';
        message = message.split('\n')[0];
        document.getElementById('errorPanel').showError(message);
      });
  };

  /**
   * Button Event Handler to service dynamically generated buttons in server list table
   * @param {Number} index - Integer index into IRC server Array
   */
  editIrcServerButtonHandler = (event) => {
    // console.log(event.target.id, event.target.getAttribute('index'));
    const serverFormEl = document.getElementById('serverFormPanel');
    const index = parseInt(event.target.getAttribute('index'));
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
          document.getElementById('errorPanel').showError('Database Locked');
        } else if (err.status === 405) {
          document.getElementById('errorPanel').showError('Database Disabled');
        } else {
          document.getElementById('errorPanel').showError(message);
        }
      });
  };

  /**
   * Button Event Handler to service dynamically generated buttons in server list table
   * @param {Number} index - Integer index into IRC server Array
   */
  copyIrcServerToNewButtonHandler = (event) => {
    // console.log(event.target.id, event.target.getAttribute('index'));
    const serverFormPanelEl = document.getElementById('serverFormPanel');
    const index = parseInt(event.target.getAttribute('index'));
    this.clearServerListTable();
    serverFormPanelEl.submitServer({ index: index }, 'COPY', index)
      .then((data) => serverFormPanelEl.checkForApiError(data))
      .catch((err) => {
        console.log(err);
        let message = err.message || err.toString() || 'Error';
        message = message.split('\n')[0];
        document.getElementById('errorPanel').showError(message);
      });
  };

  /**
   * Button Event Handler to service dynamically generated buttons in server list table
   * @param {Number} index - Integer index into IRC server Array
   */
  deleteIrcServerButtonHandler = (event) => {
    // console.log(event.target.id, event.target.getAttribute('index'));
    const serverFormPanelEl = document.getElementById('serverFormPanel');
    const index = parseInt(event.target.getAttribute('index'));
    this.clearServerListTable();
    serverFormPanelEl.submitServer({ index: index }, 'DELETE', index)
      .then((data) => serverFormPanelEl.checkForApiError(data))
      .catch((err) => {
        console.log(err);
        let message = err.message || err.toString() || 'Error';
        message = message.split('\n')[0];
        document.getElementById('errorPanel').showError(message);
      });
  };

  /**
   * Button Event Handler to service dynamically generated buttons in server list table
   * @param {Number} index - Integer index into IRC server Array
   */
  moveUpInListButtonHandler = (event) => {
    console.log(event.target.id, event.target.getAttribute('index'));
    const serverFormPanelEl = document.getElementById('serverFormPanel');
    const index = parseInt(event.target.getAttribute('index'));
    this.clearServerListTable();
    serverFormPanelEl.submitServer({ index: index, action: 'move-up' }, 'POST', index)
      .then((data) => serverFormPanelEl.checkForApiError(data))
      .catch((err) => {
        console.log(err);
        let message = err.message || err.toString() || 'Error';
        message = message.split('\n')[0];
        document.getElementById('errorPanel').showError(message);
      });
  };

  /**
   * Removes eventListener and <tr> row elements from table
   */
  clearServerListTable = (data) => {
    const tableNode = this.shadowRoot.getElementById('tbodyId');
    //
    // (1 of 2) Remove previous event listeners
    //
    this.selectButtonIdList.forEach((id) => {
      this.shadowRoot.getElementById(id)
        .removeEventListener('click', this.selectServerButtonHandler);
    });
    this.selectButtonIdList = [];
    this.connectButtonIdList.forEach((id) => {
      this.shadowRoot.getElementById(id)
        .removeEventListener('click', this.connectToIrcButtonHandler);
    });
    this.connectButtonIdList = [];
    this.disabledCheckboxIdList.forEach((id) => {
      this.shadowRoot.getElementById(id)
        .removeEventListener('click', this.toggleDisabledCheckboxHandler);
    });
    this.disabledCheckboxIdList = [];
    this.editButtonIdList.forEach((id) => {
      this.shadowRoot.getElementById(id)
        .removeEventListener('click', this.editIrcServerButtonHandler);
    });
    this.editButtonIdList = [];
    this.copyButtonIdList.forEach((id) => {
      this.shadowRoot.getElementById(id)
        .removeEventListener('click', this.copyIrcServerToNewButtonHandler);
    });
    this.copyButtonIdList = [];
    this.deleteButtonIdList.forEach((id) => {
      this.shadowRoot.getElementById(id)
        .removeEventListener('click', this.deleteIrcServerButtonHandler);
    });
    this.deleteButtonIdList = [];
    this.moveUpButtonIdList.forEach((id) => {
      this.shadowRoot.getElementById(id)
        .removeEventListener('click', this.moveUpInListButtonHandler);
    });
    this.moveUpButtonIdList = [];

    //
    // (2 of 2) Remove previous <tr> rows from parent <tbody> element the DOM
    //
    while (tableNode.firstChild) {
      tableNode.removeChild(tableNode.firstChild);
    }
  }; // clearServerListTable

  /**
   * Dynamically add rows to HTML table for list of IRC servers
   * @param {Object} data - Array of Objects
   * @returns {Promise} resolved to null
   */
  buildServerListTable = (data) => {
    // console.log(JSON.stringify(data, null, 2));
    return new Promise((resolve, reject) => {
      // Remove eventListener and <tr> row elements from table
      this.clearServerListTable();

      // Contents will be inserted into the <tbody> element
      const tableNode = this.shadowRoot.getElementById('tbodyId');

      // Flags to set table windth (visible columns)
      const full = this.fullWidth;
      const mobile = this.mobileWidth;
      const edit = this.editable && !this.fullWidth && !this.mobileWidth;
      // Case of editor is open, hide all buttons
      if (window.globals.webState.ircServerEditOpen) this.editable = false;
      //
      // dynamically build array of column headings for the server list
      //
      const columnTitles = [];

      if (edit) columnTitles.push(''); // td01
      if ((!full) && (!window.globals.webState.ircServerEditOpen)) columnTitles.push(''); // td02

      if (!mobile) columnTitles.push('Index'); // td03 Not a server property, array index number
      if (mobile) {
        columnTitles.push('Dis'); // td10 .disabled
        columnTitles.push('G'); // td11 .group
      } else {
        columnTitles.push('Disabled'); // td10 .disabled
        columnTitles.push('Group'); // td11 .group
      }

      columnTitles.push('Label'); // td12 .name

      if (!mobile) columnTitles.push('Host');// td20 .host
      if (!mobile) columnTitles.push('Port');// td21 .port
      if (full) columnTitles.push('TLS'); // td22 .tls
      if (full) columnTitles.push('verify'); // td23 .verify
      if (full) columnTitles.push('proxy'); // td24 .proxy
      if (full) columnTitles.push('password'); //  td25 .password
      if (full) columnTitles.push('sasl username'); //  td26 .password
      if (full) columnTitles.push('sasl password'); //  td27 .password

      columnTitles.push('Nick'); // td30 .nick
      if (full) columnTitles.push('Alternate'); // td32 .altNick
      if (full) columnTitles.push('Recover'); // td32 .recoverNick
      if (full) columnTitles.push('user'); // td33 .user
      if (full) columnTitles.push('Real Name'); // td34 .real
      if (full) columnTitles.push('Modes'); // td35 .modes

      if (full) columnTitles.push('Channels'); // td40 .channelList

      if (full) columnTitles.push('identifyNick'); // td50 .identifyNick
      if (full) columnTitles.push('command'); // td51 .identifyCommand

      if (full) columnTitles.push('reconnect'); // td60 .reconnect
      if (full) columnTitles.push('logging'); // td61 .logging

      if ((edit) && (!window.globals.ircState.disableServerListEditor)) {
        columnTitles.push(''); // td70 .logging
        columnTitles.push(''); // td71 .logging
        columnTitles.push(''); // td72 .logging
        columnTitles.push(''); // td73 .logging
      }

      const titleRowEl = document.createElement('tr');
      columnTitles.forEach((titleName) => {
        const tdEl = document.createElement('th');
        tdEl.textContent = titleName;
        tdEl.classList.add('server-list-header');
        titleRowEl.appendChild(tdEl);
      });
      tableNode.appendChild(titleRowEl);

      //
      // Dynamically create table elements and add to table
      //
      if ((Array.isArray(data)) && (data.length > 0)) {
        this.shadowRoot.getElementById('emptyTableDivId').setAttribute('hidden', '');
        let allServersDisabled = true;
        for (let i = 0; i < data.length; i++) {
          //
          // <tr> Row element
          const rowEl = document.createElement('tr');
          rowEl.setAttribute('index', i.toString());
          if (data[i].disabled) {
            rowEl.classList.add('disabled-tr');
          } else {
            allServersDisabled = false;
          }

          if (edit) {
            //
            // <td><button> Select Button
            //
            const td01El = document.createElement('td');
            const selectButtonEl = document.createElement('button');
            selectButtonEl.setAttribute('index', i.toString());
            selectButtonEl.id = 'selectAtIndex' + i.toString();
            this.selectButtonIdList.push('selectAtIndex' + i.toString());
            selectButtonEl.textContent = 'Select';
            selectButtonEl.title = 'Set as active server for IRC connections';
            if (window.globals.ircState.ircConnected) {
              if (window.globals.ircState.ircServerIndex === i) {
                td01El.classList.add('server-list-button-connected');
              }
            } else {
              if (window.globals.ircState.ircServerIndex === i) {
                td01El.classList.add('server-list-button-disconnected');
              }
            }
            if (data[i].disabled) {
              selectButtonEl.setAttribute('disabled', '');
              selectButtonEl.setAttribute('title', 'Disabled');
            }
            td01El.appendChild(selectButtonEl);
            rowEl.appendChild(td01El);
          }
          if ((!full) && (!window.globals.webState.ircServerEditOpen)) {
            //
            // <td><button> Connect Button
            //
            const td02El = document.createElement('td');
            const connectButtonEl = document.createElement('button');
            connectButtonEl.textContent = 'Connect';
            connectButtonEl.setAttribute('index', i.toString());
            connectButtonEl.id = 'connectAtIndex' + i.toString();
            if (window.globals.ircState.ircConnected) {
              if (window.globals.ircState.ircServerIndex === i) {
                td02El.classList.add('server-list-button-connected');
                connectButtonEl.textContent = 'Disconnect';
                connectButtonEl.setAttribute('title', 'Disconnect from IRC server');
                // Connected, only add button and eventListener to selected server
                this.connectButtonIdList.push('connectAtIndex' + i.toString());
                td02El.appendChild(connectButtonEl);
              }
            } else {
              if (window.globals.ircState.ircServerIndex === i) {
                td02El.classList.add('server-list-button-disconnected');
              }
              connectButtonEl.setAttribute('title', 'Connect server to IRC network');
              if (data[i].disabled) {
                connectButtonEl.setAttribute('disabled', '');
                connectButtonEl.setAttribute('title', 'Disabled');
              }
              // Not connected, always add button and eventListener
              this.connectButtonIdList.push('connectAtIndex' + i.toString());
              td02El.appendChild(connectButtonEl);
            }
            rowEl.appendChild(td02El);
          }
          //
          // <td> Index number
          //
          if (!mobile) {
            const td03El = document.createElement('td');
            td03El.textContent = i.toString();
            rowEl.appendChild(td03El);
          }
          //
          // <td><input type="checkbox"> Disabled Checkbox
          //
          const td10El = document.createElement('td');
          const disabledCheckboxEl = document.createElement('input');
          disabledCheckboxEl.setAttribute('type', 'checkbox');
          disabledCheckboxEl.setAttribute('index', i.toString());
          disabledCheckboxEl.id = 'disableAtIndex' + i.toString();
          this.disabledCheckboxIdList.push('disableAtIndex' + i.toString());
          disabledCheckboxEl.setAttribute('title', 'Click to enable or disable IRC server');
          if ((this.editable) && (!window.globals.ircState.disableServerListEditor)) {
            disabledCheckboxEl.removeAttribute('disabled');
          } else {
            disabledCheckboxEl.setAttribute('disabled', '');
          }
          disabledCheckboxEl.checked = data[i].disabled;
          td10El.appendChild(disabledCheckboxEl);
          rowEl.appendChild(td10El);
          //
          // <td> Group Number
          const td11El = document.createElement('td');
          if ('group' in data[i]) {
            td11El.textContent = data[i].group;
          } else {
            td11El.textContent = 0;
          }
          if (('group' in data[i]) &&
            (data[i].group > 0) && (data[i].group < 6)) {
            td11El.classList.add('group-color-' + data[i].group.toString());
          }
          rowEl.appendChild(td11El);

          //
          // <td> IRC server label (short name)
          //
          const td12El = document.createElement('td');
          td12El.textContent = data[i].name;
          rowEl.appendChild(td12El);
          if (!mobile) {
            //
            // <td> IRC server TCP Port number
            //
            const td20El = document.createElement('td');
            td20El.textContent = data[i].host;
            rowEl.appendChild(td20El);
            //
            // <td> IRC server hostname or IP address
            //
            const td21El = document.createElement('td');
            td21El.textContent = data[i].port;
            rowEl.appendChild(td21El);
          }
          //
          // <td><input type="checkbox"> IRC server TLS flag
          //
          if (full) {
            const td22El = document.createElement('td');
            const tlsIconEl = document.createElement('div');
            const tlsIconInnerEl = document.createElement('div');
            tlsIconEl.appendChild(tlsIconInnerEl);
            if (data[i].tls) {
              tlsIconEl.classList.add('icon-true');
              tlsIconInnerEl.classList.add('icon-inner-true');
            } else {
              tlsIconEl.classList.add('icon-false');
              tlsIconInnerEl.classList.add('icon-inner-false');
            }
            td22El.appendChild(tlsIconEl);
            rowEl.appendChild(td22El);
            //
            // <td><input type="checkbox"> IRC server TLS must verify host address
            //
            const td23El = document.createElement('td');
            const verifyIconEl = document.createElement('div');
            const verifyIconInnerEl = document.createElement('div');
            verifyIconEl.appendChild(verifyIconInnerEl);
            if (data[i].verify) {
              verifyIconEl.classList.add('icon-true');
              verifyIconInnerEl.classList.add('icon-inner-true');
            } else {
              verifyIconEl.classList.add('icon-false');
              verifyIconInnerEl.classList.add('icon-inner-false');
            }
            td23El.appendChild(verifyIconEl);
            rowEl.appendChild(td23El);
            //
            // <td><input type="checkbox"> IRC server socks5 proxy enabled flag
            //
            const td24El = document.createElement('td');
            const proxyIconEl = document.createElement('div');
            const proxyIconInnerEl = document.createElement('div');
            proxyIconEl.appendChild(proxyIconInnerEl);
            if (data[i].proxy) {
              proxyIconEl.classList.add('icon-true');
              proxyIconInnerEl.classList.add('icon-inner-true');
            } else {
              proxyIconEl.classList.add('icon-false');
              proxyIconInnerEl.classList.add('icon-inner-false');
            }
            td24El.appendChild(proxyIconEl);
            rowEl.appendChild(td24El);
            //
            // <td> IRC server password (do not show current value)
            //
            const td25El = document.createElement('td');
            if (data[i].password === null) {
              td25El.textContent = '(hidden)';
            } else {
              td25El.textContent = '(blank)';
            }
            rowEl.appendChild(td25El);
            //
            // <td> SASL username
            //
            const td26El = document.createElement('td');
            td26El.textContent = data[i].saslUsername;
            rowEl.appendChild(td26El);
            //
            // <td> SASL password (do not show current value)
            //
            const td27El = document.createElement('td');
            if (data[i].saslPassword === null) {
              td27El.textContent = '(hidden)';
            } else {
              td27El.textContent = '(blank)';
            }
            rowEl.appendChild(td27El);
          } // if (full)
          //
          // <td> IRC user's nickname
          //
          const td30El = document.createElement('td');
          td30El.textContent = data[i].nick;
          rowEl.appendChild(td30El);

          if (full) {
            //
            // <td> IRC alternate nickname if current is in use
            //
            const td31El = document.createElement('td');
            td31El.textContent = data[i].altNick;
            rowEl.appendChild(td31El);
            //
            // <td><input type="checkbox"> Flag for nickname auto recovery
            //
            const td32El = document.createElement('td');
            const recoverNickIconEl = document.createElement('div');
            const recoverNickIconInnerEl = document.createElement('div');
            recoverNickIconEl.appendChild(recoverNickIconInnerEl);
            if (data[i].recoverNick) {
              recoverNickIconEl.classList.add('icon-true');
              recoverNickIconInnerEl.classList.add('icon-inner-true');
            } else {
              recoverNickIconEl.classList.add('icon-false');
              recoverNickIconInnerEl.classList.add('icon-inner-false');
            }
            td32El.appendChild(recoverNickIconEl);
            rowEl.appendChild(td32El);
            //
            // <td> IRC connection identd username
            //
            const td33El = document.createElement('td');
            td33El.textContent = data[i].user;
            rowEl.appendChild(td33El);
            //
            // <td> IRC user's real name field
            //
            const td34El = document.createElement('td');
            td34El.textContent = data[i].real;
            rowEl.appendChild(td34El);
            //
            // <td> IRC user's initial login mode flags (+i)
            //
            const td35El = document.createElement('td');
            td35El.textContent = data[i].modes;
            rowEl.appendChild(td35El);
            //
            // <td> List of IRC channel names (vertical)
            //    <div>#channel1</div>
            //    <div>#channel2</div>
            // </td>
            //
            const td40El = document.createElement('td');
            data[i].channelList.split(',').forEach((channel) => {
              const chanDiv = document.createElement('div');
              chanDiv.textContent = channel;
              td40El.appendChild(chanDiv);
            });
            rowEl.appendChild(td40El);
            //
            // <td> Nickserv user's identify nickname
            //
            const td50El = document.createElement('td');
            td50El.textContent = data[i].identifyNick;
            rowEl.appendChild(td50El);
            //
            // <td> Nickserv identify command (IRC command, not password)
            //
            const td51El = document.createElement('td');
            if (data[i].identifyCommand === null) {
              td51El.textContent = '(hidden)';
            } else {
              td51El.textContent = '(blank)';
            }
            rowEl.appendChild(td51El);
            //
            // <td><input type="checkbox"> Auto-reconnect flag
            //
            const td60El = document.createElement('td');
            const reconnectIconEl = document.createElement('div');
            const reconnectIconInnerEl = document.createElement('div');
            reconnectIconEl.appendChild(reconnectIconInnerEl);
            if (data[i].reconnect) {
              reconnectIconEl.classList.add('icon-true');
              reconnectIconInnerEl.classList.add('icon-inner-true');
            } else {
              reconnectIconEl.classList.add('icon-false');
              reconnectIconInnerEl.classList.add('icon-inner-false');
            }
            td60El.appendChild(reconnectIconEl);
            rowEl.appendChild(td60El);
            //
            // <td><input type="checkbox"> Flag to enable channel text logging
            //
            const td61El = document.createElement('td');
            const loggingIconEl = document.createElement('div');
            const loggingIconInnerEl = document.createElement('div');
            loggingIconEl.appendChild(loggingIconInnerEl);
            if (data[i].logging) {
              loggingIconEl.classList.add('icon-true');
              loggingIconInnerEl.classList.add('icon-inner-true');
            } else {
              loggingIconEl.classList.add('icon-false');
              loggingIconInnerEl.classList.add('icon-inner-false');
            }
            td61El.appendChild(loggingIconEl);
            rowEl.appendChild(td61El);
          } // if (full)

          if ((edit) && (!window.globals.ircState.disableServerListEditor)) {
            //
            // <td><button> Connect button
            //
            const td70El = document.createElement('td');
            const editButtonEl = document.createElement('button');
            editButtonEl.setAttribute('index', i.toString());
            editButtonEl.id = 'editAtIndex' + i.toString();
            this.editButtonIdList.push('editAtIndex' + i.toString());
            editButtonEl.textContent = 'Edit';
            editButtonEl.setAttribute('title', 'Open IRC server configuration form');
            td70El.appendChild(editButtonEl);
            rowEl.appendChild(td70El);
            //
            // <td><button> Duplicate Button
            //
            const td71El = document.createElement('td');
            const copyButtonEl = document.createElement('button');
            copyButtonEl.setAttribute('index', i.toString());
            copyButtonEl.id = 'copyAtIndex' + i.toString();
            this.copyButtonIdList.push('copyAtIndex' + i.toString());
            copyButtonEl.textContent = 'Duplicate';
            copyButtonEl.setAttribute('title',
              'Make a duplicate copy of this IRC server configuration');
            td71El.appendChild(copyButtonEl);
            rowEl.appendChild(td71El);
            //
            // <td><button> Delete Button
            //
            const td72El = document.createElement('td');
            const deleteButtonEl = document.createElement('button');
            deleteButtonEl.setAttribute('index', i.toString());
            deleteButtonEl.id = 'deleteAtIndex' + i.toString();
            this.deleteButtonIdList.push('deleteAtIndex' + i.toString());
            deleteButtonEl.textContent = 'Delete';
            deleteButtonEl.setAttribute('title', 'Delete this IRC server from the server list.');
            td72El.appendChild(deleteButtonEl);
            rowEl.appendChild(td72El);
            //
            // <td><button> Button to move server's index position upwards in list
            //
            const td73El = document.createElement('td');
            if (i > 0) {
              const moveUpButtonEl = document.createElement('button');
              moveUpButtonEl.setAttribute('index', i.toString());
              moveUpButtonEl.id = 'moveUpAtIndex' + i.toString();
              this.moveUpButtonIdList.push('moveUpAtIndex' + i.toString());
              moveUpButtonEl.textContent = 'Up';
              moveUpButtonEl.setAttribute('title',
                'Move IRC server up by one row in the server list table.');
              td73El.appendChild(moveUpButtonEl);
            }
            rowEl.appendChild(td73El);
          } // if editable

          // Append the <td> row element to the <tbody> parent element
          tableNode.appendChild(rowEl);
        } // next i
        //
        // Add class to get <td> element borders
        //
        const tdEls = Array.from(this.shadowRoot.querySelectorAll('td'));
        tdEls.forEach((tdEl) => {
          tdEl.classList.add('server-list-data');
        });

        //
        // Add button event listeners
        //
        this.selectButtonIdList.forEach((id) => {
          this.shadowRoot.getElementById(id)
            .addEventListener('click', this.selectServerButtonHandler);
        });
        this.connectButtonIdList.forEach((id) => {
          this.shadowRoot.getElementById(id)
            .addEventListener('click', this.connectToIrcButtonHandler);
        });
        this.disabledCheckboxIdList.forEach((id) => {
          this.shadowRoot.getElementById(id)
            .addEventListener('click', this.toggleDisabledCheckboxHandler);
        });
        this.editButtonIdList.forEach((id) => {
          this.shadowRoot.getElementById(id)
            .addEventListener('click', this.editIrcServerButtonHandler);
        });
        this.copyButtonIdList.forEach((id) => {
          this.shadowRoot.getElementById(id)
            .addEventListener('click', this.copyIrcServerToNewButtonHandler);
        });
        this.deleteButtonIdList.forEach((id) => {
          this.shadowRoot.getElementById(id)
            .addEventListener('click', this.deleteIrcServerButtonHandler);
        });
        this.moveUpButtonIdList.forEach((id) => {
          this.shadowRoot.getElementById(id)
            .addEventListener('click', this.moveUpInListButtonHandler);
        });

        if (allServersDisabled) {
          this.shadowRoot.getElementById('allDisabledWarningDivId').removeAttribute('hidden');
        } else {
          this.shadowRoot.getElementById('allDisabledWarningDivId').setAttribute('hidden', '');
        }
      } else {
        // else case of empty server list, show instructions
        this.shadowRoot.getElementById('emptyTableDivId').removeAttribute('hidden');
      }
      resolve(null);
    });
  }; // buildServerListTable()

  // ------------------
  // Main entry point
  // ------------------
  initializePlugin = () => {
    // Set descriptive button titles
    this.shadowRoot.getElementById('createNewButtonId').setAttribute('title',
      'Opens form to create a new IRC server configuration');
    this.shadowRoot.getElementById('showEditButtonId').setAttribute('title',
      'Configures table to default width. (If allowed edit buttons visible)');
    this.shadowRoot.getElementById('showFullButtonId').setAttribute('title',
      'Configures table to show all IRC configuration settings (edit button hidden)');
    this.shadowRoot.getElementById('showMobileButtonId').setAttribute('title',
      'Set narrow table width to select server from mobile phone screen');
    this.shadowRoot.getElementById('disconnectButtonId').setAttribute('title',
      'Disconnect from the IRC network');
    this.shadowRoot.getElementById('forceUnlockButtonId').setAttribute('title',
      'Press to unlock database. Refreshing or leaving editor ' +
      'form during edit can leave database locked.');
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

    /**
     * Disconnect from IRC server.
     */
    this.shadowRoot.getElementById('disconnectButtonId').addEventListener('click', () => {
      document.getElementById('ircControlsPanel').disconnectHandler();
    });

    this.shadowRoot.getElementById('forceUnlockButtonId').addEventListener('click', () => {
      const serverFormEl = document.getElementById('serverFormPanel');
      serverFormEl.fetchServerList(0, 0)
        .then(() => {
          console.log('Database: unlock successful');
          window.globals.webState.ircServerEditOpen = false;
          // this.enableConnectButtons();
          // this.enableEditButtons();
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

    this.shadowRoot.getElementById('createNewButtonId').addEventListener('click', () => {
      const serverFormEl = document.getElementById('serverFormPanel');
      // this.disableConnectButtons();
      // this.disableEditButtons();
      // test if locked by attempting to lock it
      serverFormEl.fetchServerList(0, 1)
        // was not locked, unlock before requesting edit
        .then(() => { serverFormEl.fetchServerList(0, 0); })
        // this returns leaving page open.
        .then(() => { serverFormEl.createNewIrcServer(); })
        .catch((err) => {
          console.log(err);
          let message = err.message || err.toString() ||
            'Error attempting to create new IRC server';
          // limit to 1 line
          message = message.split('\n')[0];
          if (err.status === 409) {
            document.getElementById('errorPanel').showError('Database Locked');
          } else if (err.status === 405) {
            document.getElementById('errorPanel').showError('Database Disabled');
          } else {
            document.getElementById('errorPanel').showError(message);
          }
          // this.enableConnectButtons();
          // this.enableEditButtons();
        });
    });

    /**
     * Button handler to toggle between full table (all columns) and small table.
     */
    this.shadowRoot.getElementById('showFullButtonId').addEventListener('click', () => {
      this.fullWidth = true;
      this.mobileWidth = false;
      document.getElementById('serverFormPanel').fetchServerList(-1, -1)
        .then((data) => this.buildServerListTable(data))
        .catch((err) => {
          console.log(err);
          let message = err.message || err.toString() || 'Error';
          message = message.split('\n')[0];
          document.getElementById('errorPanel').showError(message);
        });
    });
    /**
     * Button handler to toggle between full table (all columns) and small table.
     */
    this.shadowRoot.getElementById('showEditButtonId').addEventListener('click', () => {
      this.fullWidth = false;
      this.mobileWidth = false;
      document.getElementById('serverFormPanel').fetchServerList(-1, -1)
        .then((data) => this.buildServerListTable(data))
        .catch((err) => {
          console.log(err);
          let message = err.message || err.toString() || 'Error';
          message = message.split('\n')[0];
          document.getElementById('errorPanel').showError(message);
        });
    });

    /**
     * Button handler to toggle between full table (all columns) and small table.
     */
    this.shadowRoot.getElementById('showMobileButtonId').addEventListener('click', () => {
      this.fullWidth = false;
      this.mobileWidth = true;
      document.getElementById('serverFormPanel').fetchServerList(-1, -1)
        .then((data) => this.buildServerListTable(data))
        .catch((err) => {
          console.log(err);
          let message = err.message || err.toString() || 'Error';
          message = message.split('\n')[0];
          document.getElementById('errorPanel').showError(message);
        });
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

    // document.addEventListener('color-theme-changed', (event) => {
    //   const panelDivEl = this.shadowRoot.getElementById('panelDivId');
    //   if (event.detail.theme === 'light') {
    //     panelDivEl.classList.remove('server-list-theme-dark');
    //     panelDivEl.classList.add('server-list-theme-light');
    //   } else {
    //     panelDivEl.classList.remove('server-list-theme-light');
    //     panelDivEl.classList.add('server-list-theme-dark');
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
     * Global event listener on document object to detect editor panel has been opened
     * @listens document:irc-server-edit-open
     */
    document.addEventListener('irc-server-edit-open', () => {
      document.getElementById('serverFormPanel').fetchServerList(-1, -1)
        // .then((data) => {
        //   console.log(JSON.stringify(data, null, 2));
        //   return Promise.resolve(data);
        // })
        .then((data) => this.buildServerListTable(data))
        .catch((err) => {
          console.log(err);
          let message = err.message || err.toString() || 'Error';
          message = message.split('\n')[0];
          document.getElementById('errorPanel').showError(message);
        });
    }); // irc-server-edit-open

    /**
     * Global event listener on document object to detect state change of remote IRC server
     * Detect addition of new IRC channels and create channel panel.
     * Data source: ircState object
     * @listens document:irc-state-changed
     */
    document.addEventListener('irc-state-changed', () => {
      let needUpdate = false;
      if (this.shadowRoot.getElementById('panelVisibilityDivId').hasAttribute('visible')) {
        if (window.globals.ircState.ircConnected !== this.ircConnectedLast) {
          this.ircConnectedLast = window.globals.ircState.ircConnected;
          if (window.globals.ircState.ircConnected) {
            this.editable = false;
            needUpdate = true;
          } else {
            // Case of panel visible, just disconnected from IRC
            this.editable = true;
            this.fullWidth = false;
            this.mobileWidth = false;
            if (window.globals.webState.dynamic.bodyClientWidth <
              this.mobileWedthBreakpointPixels) {
              this.mobileWidth = true;
            }
            needUpdate = true;
          }
        } else {
          // case of irc-state-changed event but connection status is the same
          if (window.globals.ircState.ircConnected) {
            // if connected, don't update
            needUpdate = false;
          }
          if (!window.globals.ircState.ircConnected) {
            needUpdate = true;
            if (!window.globals.webState.ircServerEditOpen) {
              this.editable = true;
            }
          }
        }
        if (needUpdate) {
          document.getElementById('serverFormPanel').fetchServerList(-1, -1)
            // .then((data) => {
            //   console.log(JSON.stringify(data, null, 2));
            //   return Promise.resolve(data);
            // })
            .then((data) => this.buildServerListTable(data))
            .catch((err) => {
              console.log(err);
              let message = err.message || err.toString() || 'Error';
              message = message.split('\n')[0];
              document.getElementById('errorPanel').showError(message);
            });
        }
        this.setVisibility();
      }

      // if (window.globals.ircState.ircConnected) {
      //   this.shadowRoot.getElementById('disconnectButtonId').removeAttribute('disabled');
      // } else {
      //   this.shadowRoot.getElementById('disconnectButtonId').setAttribute('disabled', '');
      // }
    }); // irc-state-changed

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
