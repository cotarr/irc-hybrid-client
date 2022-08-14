// MIT License
//
// Copyright (c) 2022 Dave Bolenbaugh
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
//
// ---------------------------------------------------------------------------------
//
// This module is intended to provide an independent web page
// for the purpose of editing the list of IRC servers.
//
// Example IRC server object
//   - name is used to identify an IRC server definition
//   - host is FQDN or IPV4 or IPV6 address of type String
//   - Security: password and identifyCommand are not encrypted
//   - IRC channels is a comma separated list, optional space characters are ignored.
//
// {
//   "name": "local-server",
//   "host": "127.0.0.1",
//   "port": 6667,
//   "tls": false,
//   "verify": false,
//   "reconnect": false,
//   "logging": logging,
//   "password": "",
//   "identifyNick": "",
//   "identifyCommand": "",
//   "nick": "myNick",
//   "altNick": "myNick2",
//   "recoverNick", false,
//   "user": "myUser",
//   "real": "myRealName",
//   "modes": "+iw",
//   "channelList": "#test, #test2, #test3"
// }
// ----------------------------------------------------
'use strict';

// Flag to show all columns in server list table
let full = false;
// In server list table hide editor buttons in read only
let editable = false;

/**
  * Removes current error messages from error display element
  */
const _clearError = () => {
  const errorDivEl = document.getElementById('errorDiv');
  errorDivEl.setAttribute('hidden', '');
  while (errorDivEl.firstChild) {
    errorDivEl.removeChild(errorDivEl.firstChild);
  }
  document.getElementById('showRefreshButtonDiv').setAttribute('hidden', '');
};

/**
 * Adds the error message to the error display element
 * @param {String} errorString - Error message
 */
const _showError = (errorString) => {
  const errorDivEl = document.getElementById('errorDiv');
  errorDivEl.removeAttribute('hidden');
  const errorMessageEl = document.createElement('div');
  errorMessageEl.textContent = errorString || 'Error: unknown error (4712)';
  errorDivEl.appendChild(errorMessageEl);
  document.getElementById('showRefreshButtonDiv').removeAttribute('hidden');
  // scroll to bottom of page to show error
  window.scrollTo(0, document.querySelector('body').scrollHeight);
};

/**
 * HTTP fetch request to retrieve state of IRC server
 * This is used to check if IRC is connected
 * @throws {Error} - Network errors throws Error
 * @returns {Promise} Resolved to Object
 */
const fetchIrcState = () => {
  const fetchURL = encodeURI('/irc/getircstate');
  const fetchOptions = {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json'
    }
  };
  return fetch(fetchURL, fetchOptions)
    .then((response) => {
      if (response.ok) {
        return response.json();
      } else {
        // console.log(response);
        throw new Error('Fetch status ' + response.status + ' ' +
          response.statusText + ' ' + fetchURL);
      }
    });
};

/**
 * HTTP fetch request to retrieve full list of all servers, or one server
 * @param {Number} index - Integer index into IRC server array
 * @param {Number} lock - 0 = request unlock, 1 = request lock
 * @throws {Error} - Network errors throws Error
 * @returns {Promise} Resolved to Array of Objects (without index), or one Object (index specified)
 */
const fetchServerList = (index, lock) => {
  let urlStr = '/irc/serverlist';
  if (index >= 0) {
    urlStr += '?index=' + index.toString();
    if (lock >= 0) urlStr += '&lock=' + lock.toString();
  }
  const fetchURL = encodeURI(urlStr);
  const fetchOptions = {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'application/json'
    }
  };
  return fetch(fetchURL, fetchOptions)
    .then((response) => {
      if (response.ok) {
        return response.json();
      } else {
        // console.log(response);
        if (response.status === 409) {
          const err = new Error('IRC Connected or Database Locked');
          err.status = 409;
          throw err;
        } else if (response.status === 405) {
          const err = new Error('Server List Editor Disabled');
          err.status = 405;
          throw err;
        } else {
          throw new Error('Fetch status ' + response.status + ' ' +
            response.statusText + ' ' + fetchURL);
        }
      }
    });
};

/**
 * HTTP fetch request to service POST, PATCH and DELETE methods
 * @param {Object} body - Object containing IRC server properties
 * @param {String} method - 'POST', 'PATCH', 'COPY' or 'DELETE'
 * @param {Number} index - Integer index into IRC server Array, or -1 for POST (new server)
 * @throws {Error} - Network errors throws Error
 * @returns {Promise} resolves to Object containing server response
 */
const submitServer = (body, method, index) => {
  const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
  let baseUrl = '/irc/serverlist';
  if ('action' in body) baseUrl = '/irc/serverlist/tools';
  if (index !== -1) baseUrl += '?index=' + index.toString();
  const fetchURL = encodeURI(baseUrl);
  const fetchOptions = {
    method: method,
    credentials: 'include',
    headers: {
      'CSRF-Token': csrfToken,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  };
  // Returns Promise
  return fetch(fetchURL, fetchOptions)
    .then((response) => {
      if (response.ok) {
        return response.json();
      } else {
        // console.log(response);
        if (response.status === 409) {
          const err = new Error('IRC Connected or Database Locked');
          err.status = 409;
          throw err;
        } else if (response.status === 422) {
          const err = new Error('Unprocessable Entity');
          err.status = 422;
          throw err;
        } else {
          throw new Error('Fetch status ' + response.status + ' ' +
            response.statusText + ' ' + fetchURL);
        }
      }
    });
}; // submitServer()

/**
 * Set form input elements to default values
 * @returns (Promise) Resolving to null
 */
const clearIrcServerForm = () => {
  return new Promise((resolve, reject) => {
    document.getElementById('saveNewButton').removeAttribute('hidden');
    document.getElementById('saveModifiedButton').setAttribute('hidden', '');
    document.getElementById('indexInputId').value = '-1';
    document.getElementById('disabledCheckboxId').checked = false;
    document.getElementById('groupInputId').value = 0;
    document.getElementById('nameInputId').value = '';
    document.getElementById('hostInputId').value = '';
    document.getElementById('portInputId').value = 6697;
    document.getElementById('tlsCheckboxId').checked = true;
    document.getElementById('verifyCheckboxId').checked = true;
    document.getElementById('proxyCheckboxId').checked = false;
    document.getElementById('autoReconnectCheckboxId').checked = false;
    document.getElementById('loggingCheckboxId').checked = false;
    document.getElementById('passwordInputId').setAttribute('disabled', '');
    document.getElementById('passwordInputId').value = '(Hidden)';
    document.getElementById('identifyNickInputId').value = '';
    document.getElementById('identifyCommandInputId').setAttribute('disabled', '');
    document.getElementById('identifyCommandInputId').value = '(Hidden)';
    document.getElementById('nickInputId').value = '';
    document.getElementById('altNickInputId').value = '';
    document.getElementById('recoverNickCheckboxId').checked = false;
    document.getElementById('userInputId').value = '';
    document.getElementById('realInputId').value = '';
    document.getElementById('modesInputId').value = '';
    document.getElementById('channelListInputId').value = '';
    resolve(null);
  });
};

/**
 * Set form input elements to downloaded values
 * @param {Object} data - Object containing IRC server properties
 * @returns (Promise) Resolving to null
 */
const populateIrcServerForm = (data) => {
  return new Promise((resolve, reject) => {
    clearIrcServerForm();
    document.getElementById('saveNewButton').setAttribute('hidden', '');
    document.getElementById('saveModifiedButton').removeAttribute('hidden');
    document.getElementById('listVisibilityDiv').setAttribute('hidden', '');
    document.getElementById('formVisibilityDiv').removeAttribute('hidden');
    document.getElementById('serverPasswordWarningDiv').setAttribute('hidden', '');
    document.getElementById('nickservCommandWarningDiv').setAttribute('hidden', '');
    document.getElementById('indexInputId').value = data.index.toString();
    if (data.disabled) {
      document.getElementById('disabledCheckboxId').checked = true;
    } else {
      document.getElementById('disabledCheckboxId').checked = false;
    }
    if ('group' in data) {
      document.getElementById('groupInputId').value = parseInt(data.group);
    } else {
      // Case of loading servers.json from earlier version
      document.getElementById('groupInputId').value = 0;
    }
    document.getElementById('nameInputId').value = data.name;
    document.getElementById('hostInputId').value = data.host;
    document.getElementById('portInputId').value = parseInt(data.port);
    if (data.tls) {
      document.getElementById('tlsCheckboxId').checked = true;
    } else {
      document.getElementById('tlsCheckboxId').checked = false;
    }
    if (data.verify) {
      document.getElementById('verifyCheckboxId').checked = true;
    } else {
      document.getElementById('verifyCheckboxId').checked = false;
    }
    if (data.proxy) {
      document.getElementById('proxyCheckboxId').checked = true;
    } else {
      document.getElementById('proxyCheckboxId').checked = false;
    }
    if (data.reconnect) {
      document.getElementById('autoReconnectCheckboxId').checked = true;
    } else {
      document.getElementById('autoReconnectCheckboxId').checked = false;
    }
    if (data.logging) {
      document.getElementById('loggingCheckboxId').checked = true;
    } else {
      document.getElementById('loggingCheckboxId').checked = false;
    }
    document.getElementById('passwordInputId').setAttribute('disabled', '');
    document.getElementById('passwordInputId').value = '(hidden)';
    document.getElementById('identifyNickInputId').value = data.identifyNick;
    document.getElementById('identifyCommandInputId').setAttribute('disabled', '');
    document.getElementById('identifyCommandInputId').value = ('(hidden)');
    document.getElementById('serverPasswordWarningDiv').setAttribute('hidden', '');
    document.getElementById('nickservCommandWarningDiv').setAttribute('hidden', '');
    document.getElementById('nickInputId').value = data.nick;
    document.getElementById('altNickInputId').value = data.altNick;
    if (data.altNick.length === 0) {
      document.getElementById('recoverNickCheckboxId').checked = false;
    } else {
      if (data.recoverNick) {
        document.getElementById('recoverNickCheckboxId').checked = true;
      } else {
        document.getElementById('recoverNickCheckboxId').checked = false;
      }
    }
    document.getElementById('userInputId').value = data.user;
    document.getElementById('realInputId').value = data.real;
    document.getElementById('modesInputId').value = data.modes;
    document.getElementById('channelListInputId').value = data.channelList;
    resolve(null);
  });
};

/**
 * Button Event Handler to service dynamically generated buttons in server list table
 * @param {Number} index - Integer index into IRC server Array
 */
const toggleDisabled = (index) => {
  _clearError();
  submitServer({ index: index, action: 'toggle-disabled' }, 'POST', index)
    .then((data) => checkForApiError(data))
    .then(() => fetchIrcState())
    .then((data) => setDivVisibility(data))
    .then(() => fetchServerList(-1, -1))
    .then((data) => buildServerListTable(data))
    .catch((err) => {
      _showError(err.toString() || err);
      console.log(err);
    });
};

/**
 * Button Event Handler to service dynamically generated buttons in server list table
 * @param {Number} index - Integer index into IRC server Array
 */
const openIrcServerEdit = (index) => {
  _clearError();
  clearIrcServerForm()
    .then(() => fetchServerList(index, 1))
    .then((data) => populateIrcServerForm(data))
    .catch((err) => {
      _showError(err.toString() || err);
      console.log(err);
    });
};

/**
 * Button Event Handler to service dynamically generated buttons in server list table
 * @param {Number} index - Integer index into IRC server Array
 */
const copyIrcServerToNew = (index) => {
  _clearError();
  submitServer({ index: index }, 'COPY', index)
    .then((data) => checkForApiError(data))
    .then(() => fetchIrcState())
    .then((data) => setDivVisibility(data))
    .then(() => fetchServerList(-1, -1))
    .then((data) => buildServerListTable(data))
    .catch((err) => {
      _showError(err.toString() || err);
      console.log(err);
    });
};

/**
 * Button Event Handler to service dynamically generated buttons in server list table
 * @param {Number} index - Integer index into IRC server Array
 */
const deleteIrcServer = (index) => {
  _clearError();
  submitServer({ index: index }, 'DELETE', index)
    .then((data) => checkForApiError(data))
    .then(() => fetchIrcState())
    .then((data) => setDivVisibility(data))
    .then(() => fetchServerList(-1, -1))
    .then((data) => buildServerListTable(data))
    .catch((err) => {
      _showError(err.toString() || err);
      console.log(err);
    });
};

/**
 * Button Event Handler to service dynamically generated buttons in server list table
 * @param {Number} index - Integer index into IRC server Array
 */
const moveUpInList = (index) => {
  _clearError();
  submitServer({ index: index, action: 'move-up' }, 'POST', index)
    .then((data) => checkForApiError(data))
    .then(() => fetchIrcState())
    .then((data) => setDivVisibility(data))
    .then(() => fetchServerList(-1, -1))
    .then((data) => buildServerListTable(data))
    .catch((err) => {
      _showError(err.toString() || err);
      console.log(err);
    });
};

/**
 * Parse form input elements to determine IRC Server Properties
 * Example: {index: 0, data: { ... }}
 * @returns (Promise) Resolving to Object, or reject if error
 */
const parseFormInputValues = () => {
  return new Promise((resolve, reject) => {
    const index = parseInt(document.getElementById('indexInputId').value);
    const data = {};
    if (index !== -1) data.index = parseInt(document.getElementById('indexInputId').value);
    if (document.getElementById('disabledCheckboxId').checked) {
      data.disabled = true;
    } else {
      data.disabled = false;
    }
    data.group = parseInt(document.getElementById('groupInputId').value);
    data.name = document.getElementById('nameInputId').value;
    data.host = document.getElementById('hostInputId').value;
    data.port = parseInt(document.getElementById('portInputId').value);
    if (document.getElementById('tlsCheckboxId').checked) {
      data.tls = true;
    } else {
      data.tls = false;
    }
    if (document.getElementById('verifyCheckboxId').checked) {
      data.verify = true;
    } else {
      data.verify = false;
    }
    if (document.getElementById('proxyCheckboxId').checked) {
      data.proxy = true;
    } else {
      data.proxy = false;
    }
    if (document.getElementById('autoReconnectCheckboxId').checked) {
      data.reconnect = true;
    } else {
      data.reconnect = false;
    }
    if (document.getElementById('loggingCheckboxId').checked) {
      data.logging = true;
    } else {
      data.logging = false;
    }
    if (!(document.getElementById('passwordInputId').hasAttribute('disabled'))) {
      data.password = document.getElementById('passwordInputId').value;
    }
    data.identifyNick = document.getElementById('identifyNickInputId').value;
    if (!(document.getElementById('identifyCommandInputId').hasAttribute('disabled'))) {
      data.identifyCommand = document.getElementById('identifyCommandInputId').value;
    }
    data.nick = document.getElementById('nickInputId').value;
    data.altNick = document.getElementById('altNickInputId').value;
    if (document.getElementById('recoverNickCheckboxId').checked) {
      data.recoverNick = true;
    } else {
      data.recoverNick = false;
    }
    data.user = document.getElementById('userInputId').value;
    data.real = document.getElementById('realInputId').value;
    data.modes = document.getElementById('modesInputId').value;
    data.channelList = document.getElementById('channelListInputId').value;

    let errorStr = null;
    if (isNaN(data.group)) errorStr = 'Invalid group number';
    if (parseInt(data.group) < 0) errorStr = 'Invalid group number';
    if (data.name === '') errorStr = 'Label is required input.';
    if (data.host === '') errorStr = 'Host/IP is required input.';
    if (isNaN(data.port)) errorStr = 'Invalid port number';
    if (data.nick === data.altNick) errorStr = 'Nickname and alternate nickname must be different.';
    if ((data.recoverNick) && (data.altNick.length === 0)) {
      errorStr = 'Nickname recovery checkbox set without valid alternate nickname';
    }
    if (data.nick === '') errorStr = 'Nickname is required input.';
    if (data.user === '') errorStr = 'Unix ident user is required input.';
    if (data.real === '') errorStr = 'Real Name is required input.';
    if (errorStr) {
      reject(new Error(errorStr));
    } else {
      resolve({ data: data, index: index });
    }
  });
}; // parseFormInputValues()

/**
 * Dynamically add rows to HTML table for list of IRC servers
 * @param {Object} data - Array of Objects
 * @returns {Promise} resolved to null
 */
const buildServerListTable = (data) => {
  // console.log(JSON.stringify(data, null, 2));

  return new Promise((resolve, reject) => {
    const tableNode = document.getElementById('tbodyId');

    // clear any previous rows
    while (tableNode.firstChild) {
      tableNode.removeChild(tableNode.firstChild);
    }

    //
    // dynamically build array of column headings for the server list
    //
    const columnTitles = [];

    columnTitles.push('Index'); // td01 Not a server property, array index number
    columnTitles.push('Disabled'); // td10 .disabled
    columnTitles.push('Group'); // td11 .group
    columnTitles.push('Label'); // td12 .name

    columnTitles.push('Host');// td20 .host
    columnTitles.push('Port');// td21 .port
    if (full) columnTitles.push('TLS'); // td22 .tls
    if (full) columnTitles.push('verify'); // td23 .verify
    if (full) columnTitles.push('proxy'); // td24 .proxy
    if (full) columnTitles.push('password'); //  td25 .password

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

    if (editable) columnTitles.push(''); // td70 .logging
    if (editable) columnTitles.push(''); // td71 .logging
    if (editable) columnTitles.push(''); // td72 .logging
    if (editable) columnTitles.push(''); // td73 .logging

    const titleRowEl = document.createElement('tr');
    columnTitles.forEach((titleName) => {
      const tdEl = document.createElement('td');
      tdEl.textContent = titleName;
      titleRowEl.appendChild(tdEl);
    });
    tableNode.appendChild(titleRowEl);

    //
    // Dynamically create table elements and add to table
    //
    if ((Array.isArray(data)) && (data.length > 0)) {
      for (let i = 0; i < data.length; i++) {
        const rowEl = document.createElement('tr');

        rowEl.setAttribute('index', i.toString());

        const td01El = document.createElement('td');
        td01El.textContent = i.toString();
        rowEl.appendChild(td01El);

        const td10El = document.createElement('td');
        const disabledCheckboxEl = document.createElement('input');
        disabledCheckboxEl.setAttribute('type', 'checkbox');
        if (editable) {
          disabledCheckboxEl.removeAttribute('disabled');
        } else {
          disabledCheckboxEl.setAttribute('disabled', '');
        }
        disabledCheckboxEl.checked = data[i].disabled;
        td10El.appendChild(disabledCheckboxEl);
        rowEl.appendChild(td10El);

        const td11El = document.createElement('td');
        if ('group' in data[i]) {
          td11El.textContent = data[i].group;
        } else {
          td11El.textContent = 0;
        }
        rowEl.appendChild(td11El);

        const td12El = document.createElement('td');
        td12El.textContent = data[i].name;
        rowEl.appendChild(td12El);

        const td20El = document.createElement('td');
        td20El.textContent = data[i].host;
        rowEl.appendChild(td20El);

        const td21El = document.createElement('td');
        td21El.textContent = data[i].port;
        rowEl.appendChild(td21El);

        if (full) {
          const td22El = document.createElement('td');
          const tlsCheckboxEl = document.createElement('input');
          tlsCheckboxEl.setAttribute('type', 'checkbox');
          tlsCheckboxEl.setAttribute('disabled', '');
          tlsCheckboxEl.checked = data[i].tls;
          td22El.appendChild(tlsCheckboxEl);
          rowEl.appendChild(td22El);

          const td23El = document.createElement('td');
          const verifyCheckboxEl = document.createElement('input');
          verifyCheckboxEl.setAttribute('type', 'checkbox');
          verifyCheckboxEl.setAttribute('disabled', '');
          verifyCheckboxEl.checked = data[i].verify;
          td23El.appendChild(verifyCheckboxEl);
          rowEl.appendChild(td23El);

          const td24El = document.createElement('td');
          const proxyCheckboxEl = document.createElement('input');
          proxyCheckboxEl.setAttribute('type', 'checkbox');
          proxyCheckboxEl.setAttribute('disabled', '');
          proxyCheckboxEl.checked = data[i].proxy;
          td24El.appendChild(proxyCheckboxEl);
          rowEl.appendChild(td24El);

          const td25El = document.createElement('td');
          td25El.textContent = '(hidden)';
          rowEl.appendChild(td25El);
        } // if (full)

        const td30El = document.createElement('td');
        td30El.textContent = data[i].nick;
        rowEl.appendChild(td30El);

        if (full) {
          const td31El = document.createElement('td');
          td31El.textContent = data[i].altNick;
          rowEl.appendChild(td31El);

          const td32El = document.createElement('td');
          const recoverCheckboxEl = document.createElement('input');
          recoverCheckboxEl.setAttribute('type', 'checkbox');
          recoverCheckboxEl.setAttribute('disabled', '');
          recoverCheckboxEl.checked = data[i].recoverNick;
          td32El.appendChild(recoverCheckboxEl);
          rowEl.appendChild(td32El);

          const td33El = document.createElement('td');
          td33El.textContent = data[i].user;
          rowEl.appendChild(td33El);

          const td34El = document.createElement('td');
          td34El.textContent = data[i].real;
          rowEl.appendChild(td34El);

          const td35El = document.createElement('td');
          td35El.textContent = data[i].modes;
          rowEl.appendChild(td35El);

          const td40El = document.createElement('td');
          data[i].channelList.split(',').forEach((channel) => {
            const chanDiv = document.createElement('div');
            chanDiv.textContent = channel;
            td40El.appendChild(chanDiv);
          });
          rowEl.appendChild(td40El);

          const td50El = document.createElement('td');
          td50El.textContent = data[i].identifyNick;
          rowEl.appendChild(td50El);

          const td51El = document.createElement('td');
          td51El.textContent = '(hidden)';
          rowEl.appendChild(td51El);

          const td60El = document.createElement('td');
          const reconnectCheckboxEl = document.createElement('input');
          reconnectCheckboxEl.setAttribute('type', 'checkbox');
          reconnectCheckboxEl.setAttribute('disabled', '');
          reconnectCheckboxEl.checked = data[i].reconnect;
          td60El.appendChild(reconnectCheckboxEl);
          rowEl.appendChild(td60El);

          const td61El = document.createElement('td');
          const loggingCheckboxEl = document.createElement('input');
          loggingCheckboxEl.setAttribute('type', 'checkbox');
          loggingCheckboxEl.setAttribute('disabled', '');
          loggingCheckboxEl.checked = data[i].logging;
          td61El.appendChild(loggingCheckboxEl);
          rowEl.appendChild(td61El);
        } // if (full)

        if (editable) {
          const td70El = document.createElement('td');
          const editButtonEl = document.createElement('button');
          editButtonEl.textContent = 'Edit';
          td70El.appendChild(editButtonEl);
          rowEl.appendChild(td70El);

          const td71El = document.createElement('td');
          const copyButtonEl = document.createElement('button');
          copyButtonEl.textContent = 'Copy';
          td71El.appendChild(copyButtonEl);
          rowEl.appendChild(td71El);

          const td72El = document.createElement('td');
          const deleteButtonEl = document.createElement('button');
          deleteButtonEl.textContent = 'Delete';
          td72El.appendChild(deleteButtonEl);
          rowEl.appendChild(td72El);

          const td73El = document.createElement('td');
          const moveUpButtonEl = document.createElement('button');
          moveUpButtonEl.textContent = 'move-up';
          if (i > 0) td73El.appendChild(moveUpButtonEl);
          rowEl.appendChild(td73El);

          disabledCheckboxEl.addEventListener('click', () => {
            toggleDisabled(parseInt(rowEl.getAttribute('index')));
          });
          editButtonEl.addEventListener('click', () => {
            openIrcServerEdit(parseInt(rowEl.getAttribute('index')));
          });
          copyButtonEl.addEventListener('click', () => {
            copyIrcServerToNew(parseInt(rowEl.getAttribute('index')));
          });
          deleteButtonEl.addEventListener('click', () => {
            deleteIrcServer(parseInt(rowEl.getAttribute('index')));
          });
          if (i > 0) {
            moveUpButtonEl.addEventListener('click', () => {
              moveUpInList(parseInt(rowEl.getAttribute('index')));
            });
          }
        } // if editable
        tableNode.appendChild(rowEl);
      } // next i
    }
    resolve(null);
  });
}; // buildServerListTable()

/**
 * Used after saving changes to check for error.
 * @param {data} data - API response, example: {"status":"success","method":"PATCH","index":0}
 * @returns {Promise} Resolved to null or reject with error
 */

const checkForApiError = (data) => {
  return new Promise((resolve, reject) => {
    if (data.status === 'success') {
      resolve(null);
    } else {
      reject(new Error('PATCH API did not return success status flag'));
    }
  });
};

/**
 * Accept ircState object, determine if IRC network connected, and set visibility of div elements
 * @param {data} data - API response, example: {"ircConnected": false, ... }
 * @returns {Promise} Resolved to null
 */
const setDivVisibility = (data) => {
  document.getElementById('listVisibilityDiv').removeAttribute('hidden', '');
  document.getElementById('formVisibilityDiv').setAttribute('hidden', '');
  document.getElementById('serverPasswordWarningDiv').setAttribute('hidden', '');
  document.getElementById('nickservCommandWarningDiv').setAttribute('hidden', '');
  // show/hide buttons in server list table
  if ((data.ircConnected) || (data.ircConnecting)) {
    document.getElementById('createNewButton').setAttribute('hidden', '');
    document.getElementById('warningVisibilityDiv').removeAttribute('hidden');
    editable = false;
  } else {
    document.getElementById('createNewButton').removeAttribute('hidden');
    document.getElementById('warningVisibilityDiv').setAttribute('hidden', '');
    editable = true;
  }
  // show/hide proxy setting info at bottom
  if (data.enableSocks5Proxy) {
    document.getElementById('ircProxyDiv').textContent =
      'Socks5 Proxy: Enabled Globally\nSocks5 Proxy: ' +
      data.socks5Host + ':' + data.socks5Port;
  } else {
    document.getElementById('ircProxyDiv').textContent = 'Socks5 Proxy: Disabled Globally';
  }
  return Promise.resolve(null);
};

// -------------------------------------
//        Button Event Handlers
// -------------------------------------

/**
 * Show help for server groups
 */
document.getElementById('groupInfoButton').addEventListener('click', () => {
  document.getElementById('groupInfoHiddenDiv').removeAttribute('hidden');
});

/**
 * Replace IRC server password Button Event Handler
 */
document.getElementById('replacePasswordButton').addEventListener('click', () => {
  document.getElementById('passwordInputId').removeAttribute('disabled');
  document.getElementById('passwordInputId').value = '';
  document.getElementById('serverPasswordWarningDiv').removeAttribute('hidden');
});

/**
 * Replace Nickserv Command Button Event Handler
 */
document.getElementById('replaceIdentifyCommandButton').addEventListener('click', () => {
  document.getElementById('identifyCommandInputId').removeAttribute('disabled');
  document.getElementById('identifyCommandInputId').value = '';
  document.getElementById('nickservCommandWarningDiv').removeAttribute('hidden');
});

/**
 * Create New Button Event Handler
 */
document.getElementById('createNewButton').addEventListener('click', () => {
  _clearError();
  // First lock, error if already locked, if not error reverse with unlock
  fetchServerList(0, 1)
    .then(() => fetchServerList(0, 0))
    .then(() => clearIrcServerForm())
    .then(() => {
      document.getElementById('listVisibilityDiv').setAttribute('hidden', '');
      document.getElementById('formVisibilityDiv').removeAttribute('hidden');
      document.getElementById('serverPasswordWarningDiv').setAttribute('hidden', '');
      document.getElementById('nickservCommandWarningDiv').setAttribute('hidden', '');
    })
    .catch((err) => {
      _showError(err.toString() || err);
      console.log(err);
    });
});

/**
 * Save New Button Event Handler
 */
document.getElementById('saveNewButton').addEventListener('click', () => {
  _clearError();
  parseFormInputValues()
    .then((data) => submitServer(data.data, 'POST', -1))
    .then((data) => checkForApiError(data))
    .then(() => fetchIrcState())
    .then((data) => setDivVisibility(data))
    .then(() => fetchServerList(-1, -1))
    .then((data) => buildServerListTable(data))
    .catch((err) => {
      _showError(err.toString() || err);
      console.log(err);
    });
});

/**
 * Save Modified Button Event Handler
 */
document.getElementById('saveModifiedButton').addEventListener('click', () => {
  _clearError();
  parseFormInputValues()
    .then((data) => submitServer(data.data, 'PATCH', data.index))
    .then((data) => checkForApiError(data))
    .then(() => fetchIrcState())
    .then((data) => setDivVisibility(data))
    .then(() => fetchServerList(-1, -1))
    .then((data) => buildServerListTable(data))
    .catch((err) => {
      _showError(err.toString() || err);
      console.log(err);
    });
});

/**
 * Cancel Edit Button Event Handler
 */
document.getElementById('cancelEditButton').addEventListener('click', () => {
  _clearError();
  fetchIrcState()
    .then((data) => setDivVisibility(data))
    .then(() => fetchServerList(-1, -1))
    .then((data) => buildServerListTable(data))
    // Unlock database index=0 lock=0
    .then(() => fetchServerList(0, 0))
    .catch((err) => {
      _showError(err.toString() || err);
      console.log(err);
    });
});

/**
 * Force Unlock Button Event Handler,
 * THis is used when the web page is closed during an edit, leaving database locked.
 */
document.getElementById('forceUnlockAll').addEventListener('click', () => {
  _clearError();
  clearIrcServerForm()
    .then(() => fetchServerList(0, 0))
    .catch((err) => {
      _showError(err.toString() || err);
      console.log(err);
    });
});

/**
 * Button handler to pull fresh data from API and regenerate page content
 */
document.getElementById('refreshButton').addEventListener('click', () => {
  _clearError();
  fetchIrcState()
    .then((data) => setDivVisibility(data))
    .then(() => fetchServerList(-1, -1))
    .then((data) => buildServerListTable(data))
    .catch((err) => {
      _showError(err.toString() || err);
      console.log(err);
    });
});

/**
 * Button handler to toggle between full table (all columns) and small table.
 */
document.getElementById('fullButton').addEventListener('click', () => {
  _clearError();
  if (full) {
    full = false;
    document.getElementById('fullButton').textContent = 'Show All Columns';
  } else {
    full = true;
    document.getElementById('fullButton').textContent = 'Hide Columns';
  }
  fetchIrcState()
    .then((data) => setDivVisibility(data))
    .then(() => fetchServerList(-1, -1))
    .then((data) => buildServerListTable(data))
    .catch((err) => {
      _showError(err.toString() || err);
      console.log(err);
    });
});

// --------------------------------------------------------------
// Initialization
//
// Do this at page load
// Determine if editor disabled and show message, else,
// Retrieve list of servers and build IRC server list table
// --------------------------------------------------------------
_clearError();
fetchIrcState()
  .then((data) => setDivVisibility(data))
  .then(() => fetchServerList(-1, -1))
  .then((data) => buildServerListTable(data))
  .catch((err) => {
    if ((err.status) && (err.status === 405)) {
      // Show disabled message
      document.getElementById('serverListDisabledDiv').removeAttribute('hidden');
      // And ... hide everything else
      document.getElementById('warningVisibilityDiv').setAttribute('hidden', '');
      document.getElementById('listVisibilityDiv').setAttribute('hidden', '');
      document.getElementById('formVisibilityDiv').setAttribute('hidden', '');
      document.getElementById('serverPasswordWarningDiv').setAttribute('hidden', '');
      document.getElementById('nickservCommandWarningDiv').setAttribute('hidden', '');
    } else {
      _showError(err.toString() || err);
      console.log(err);
    }
  });
