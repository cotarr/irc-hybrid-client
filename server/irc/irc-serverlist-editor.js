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
// -----------------------------------------------------------------------------
//
//                           Server List Editor API
//
// This module is intended to provide an independent API
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
//   "password": "",
//   "identifyNick": "",
//   "identifyCommand": "",
//   "nick": "myNick",
//   "user": "myUser",
//   "real": "myRealName",
//   "modes": "+iw",
//   "channelList": "#test, #test2, #test3"
// }
// -----------------------------------------------------------------------------
(function () {
  'use strict';

  const fs = require('fs');
  const path = require('path');

  const vars = require('./irc-client-vars');

  // const nodeEnv = process.env.NODE_ENV || 'development';

  //
  // editLock must be set to true to accept POST, PATCH or DELETE methods.
  // lock record index must match
  //
  /**
   * @type {boolean} editlock - Server list database lock flag for edit in progress
   */
  let editLock = false;
  /**
   * @type {number} editlockIndex - Integer value of record being edited
   */
  let editLockIndex = -1;
  /**
   * @type {number} editLockTimer - Internal timer used to expire edit lock if left on
   */
  let editLockTimer = 0;

  /**
   * Internal function to manage edit lock variables
   * @param {Boolean} lockValue - True = locked
   * @param {*} index - Array index of IRC server entry
   */
  const _setEditLock = function (lockValue, index) {
    if (lockValue) {
      editLock = true;
      editLockIndex = index;
      editLockTimer = 3600;
    } else {
      editLock = false;
      editLockIndex = -1;
      editLockTimer = 0;
    }
  };

  /**
   * Check if database is locked for editing
   * @returns {Boolean} true if database is locked
   */
  const _checkEditLock = function () {
    return (editLock);
  };
  /**
   * Validate match of index between locked database and API request
   * @param {number} expectedIndex - Integer array index
   * @returns {boolean} true if index values match, else false
   */
  const _checkEditLockIndex = function (expectedIndex) {
    return (editLockIndex === expectedIndex);
  };
  /**
   * Check if database is NOT locked for editing
   * @returns {Boolean} true if NOT locked, false if locked
   */
  const _checkNotEditLock = function () {
    return (!editLock);
  };

  //
  // Edit lock timer (seconds) used to expire database lock if left locked
  //
  setInterval(function () {
    // console.log('editLock ', editLock, editLockIndex, editLockTimer);
    if (editLockTimer === 1) {
      editLock = false;
      editLockIndex = -1;
      editLockTimer = 0;
    }
    if (editLockTimer > 0) editLockTimer--;
  }, 1000);

  /**
   * Function to flag database as locked for editing, or reject Error if previously locked.
   * URL query parameters contain index and Lock to indicate index number and lock=1.
   * If neither index or lock params present in req.query, resolve to chainObject without changes.
   * Some input validation is redundant to express-validator checks.
   * @param {Object} req - NodeJs HTTP request object containing URL query params: index, lock
   * @param {Object} chainObject - Wrapper object used to pass common date through promise chain
   * @returns {Promise} Resolve to Object (chainObject) or reject error
   */
  const setDatabaseLock = function (req, chainObject) {
    return new Promise(function (resolve, reject) {
      if (('query' in req) && ('index' in req.query) &&
      ('lock' in req.query)) {
        if (_checkEditLock()) {
          // Case of editLock === true
          if (parseInt(req.query.lock) === 1) {
            const err = new Error('Lock already set');
            err.status = 409; // Status 409 = Conflict
            reject(err);
          } else if (parseInt(req.query.lock) === 0) {
            _setEditLock(false);
            resolve(chainObject);
          } else {
            const err = new Error('Lock allowed values 0 or 1');
            err.status = 400;
            reject(err);
          }
        } else {
          // Case of editLock === false
          if (parseInt(req.query.lock) === 1) {
            _setEditLock(true, parseInt(req.query.index));
            resolve(chainObject);
          } else if (parseInt(req.query.lock) === 0) {
            resolve(chainObject);
          } else {
            const err = new Error('Lock allowed values 0 or 1');
            err.status = 400;
            reject(err);
          }
        }
      } else if (('query' in req) && (!('index' in req.query)) &&
        ('lock' in req.query)) {
        const err = new Error('lock requires param: index');
        err.status = 400;
        reject(err);
      } else {
        // Case of neither 'lock' nor 'index' present (full server list requested)
        // Pass through chainObject without changes
        resolve(chainObject);
      }
    });
  }; // setDatabaseLock()

  /**
   * Function to verify database lock is true before modification of records
   * @param {Object} chainObject - Wrapper object used to pass common date through promise chain
   * @returns {Promise} Resolve to Object (chainObject) or reject error
   */
  const requireLock = function (chainObject) {
    if (_checkEditLock()) {
      return Promise.resolve(chainObject);
    } else {
      const err = new Error('Attempt to modify unlocked data table');
      err.status = 409; // Status 409 = Conflict
      return Promise.reject(err);
    }
  };

  /**
   * Function to verify database lock is false before modification of records
   * @param {Object} chainObject - Wrapper object used to pass common date through promise chain
   * @returns {Promise} Resolve to Object (chainObject) or reject error
   */
  const requireNotLock = function (chainObject) {
    if (_checkNotEditLock()) {
      return Promise.resolve(chainObject);
    } else {
      const err = new Error('Attempt to modify locked data table');
      err.status = 409; // Status 409 = Conflict
      return Promise.reject(err);
    }
  };

  /**
   * Function to check if IRC client is connected to IRC network.
   * Action is denied status 409 if IRC client is connected to IRC
   * @param {Object} chainObject - Wrapper object used to pass common date through promise chain
   * @returns {Promise} Resolve to Object (chainObject) or reject error https status 409
   */
  const requireIrcNotConnected = function (chainObject) {
    return new Promise(function (resolve, reject) {
      if ((vars.ircState.ircConnected) || (vars.ircState.ircConnecting)) {
        const err = new Error('Editing server list requires IRC client to disconnect from IRC');
        err.status = 409; // Status 409 = Conflict
        reject(err);
      }
      resolve(chainObject);
    });
  };

  /**
   * Read local file 'servers.json' in base project folder.
   * Parse JSON string into JavaScript object and insert object to chainObject
   * @param {Object} chainObject - Wrapper object used to pass common date through promise chain
   * @returns {Promise} Resolve to Object (chainObject) or reject error
   */
  const readServersFile = function (chainObject) {
    return new Promise(function (resolve, reject) {
      const serverListFilename = path.join(__dirname, '../../servers.json');
      fs.readFile(serverListFilename, { encoding: 'utf8' }, function (err, jsonData) {
        if (err) {
          reject(err);
        } else {
          chainObject.serversFile = JSON.parse(jsonData);
          resolve(chainObject);
        }
      });
    });
  };
  /**
   * Read local file 'servers.json' in base project folder.
   * Parse JSON string into JavaScript object and insert object to chainObject
   * @param {Object} chainObject - Wrapper object used to pass common date through promise chain
   * @returns {Promise} Resolve to Object (chainObject) or reject error
   */
  const writeServersFile = function (chainObject) {
    return new Promise(function (resolve, reject) {
      const serverListFilename = path.join(__dirname, '../../servers.json');
      fs.writeFile(serverListFilename,
        JSON.stringify(chainObject.serversFile, null, 2),
        { encoding: 'utf8' },
        function (err, jsonData) {
          if (err) {
            reject(err);
          } else {
            resolve(chainObject);
          }
        });
    });
  };

  /**
   * Function to serialize IRC server properties for use in API response.
   * Strings stored in arrays are converted into comma separated strings
   * Serialized IRC server object is added to chainObject as chainObject.serverArray
   * @param {Object} chainObject - Wrapper object used to pass common date through promise chain
   * @returns {Promise} Resolve to Object (chainObject) or reject error
   */
  const serializeElements = function (chainObject) {
    return new Promise(function (resolve, reject) {
      if ((chainObject) && ('serversFile' in chainObject) &&
        ('serverArray' in chainObject.serversFile)) {
        let count = 0;
        chainObject.serverArray = [];
        if (chainObject.serversFile.serverArray.length > 0) {
          for (let i = 0; i < chainObject.serversFile.serverArray.length; i++) {
            const tempServer = {};
            tempServer.index = count;
            count += 1;
            tempServer.name = chainObject.serversFile.serverArray[i].name;
            tempServer.host = chainObject.serversFile.serverArray[i].host;
            tempServer.port = chainObject.serversFile.serverArray[i].port;
            tempServer.tls = chainObject.serversFile.serverArray[i].tls;
            tempServer.verify = chainObject.serversFile.serverArray[i].verify;
            // Security: Password is not sent
            // tempServer.password = chainObject.serversFile.serverArray[i].password;
            tempServer.identifyNick = chainObject.serversFile.serverArray[i].identifyNick;
            // Security: Nickserv identify password  not sent
            // tempServer.identifyCommand = chainObject.serversFile.serverArray[i].identifyCommand;
            tempServer.nick = chainObject.serversFile.serverArray[i].nick;
            tempServer.user = chainObject.serversFile.serverArray[i].user;
            tempServer.real = chainObject.serversFile.serverArray[i].real;
            tempServer.modes = chainObject.serversFile.serverArray[i].modes;
            let channelListString = '';
            if (('channelList' in chainObject.serversFile.serverArray[i]) &&
              (chainObject.serversFile.serverArray[i].channelList.length > 0)) {
              for (let j = 0; j < chainObject.serversFile.serverArray[i].channelList.length; j++) {
                if (j > 0) {
                  channelListString += ', ';
                }
                channelListString += chainObject.serversFile.serverArray[i].channelList[j];
              } // next j
            } // length > 0
            tempServer.channelList = channelListString;
            chainObject.serverArray.push(tempServer);
          } // next i
        };
        resolve(chainObject);
      } else {
        const error = new Error('Error parsing server list array');
        reject(error);
      }
    });
  }; // serializeElements()

  /**
   * Internal function to convert comma separated string to arrays
   * @param {String} commaSeparatedString - comma separated strings
   * @returns {Array} Array containing strings
   */
  const _stringToArray = function (commaSeparatedString) {
    if (typeof commaSeparatedString !== 'string') return [];
    let cleanString = '';
    const stringLength = commaSeparatedString.length;
    for (let i = 0; i < stringLength; i++) {
      if ((commaSeparatedString.charCodeAt(i) !== 32) &&
        (commaSeparatedString.charCodeAt(i) !== 10) &&
        (commaSeparatedString.charCodeAt(i) !== 13)) {
        cleanString += commaSeparatedString.charAt(i);
      }
    }
    return cleanString.split(',');
  };

  /**
   * Function to deserialize IRC server properties from API submission.
   * Strings stored comma separated lists converted into array of strings
   * Deserialized IRC server object is added to chainObject as chainObject.newServer
   * @param {Object} chainObject - Wrapper object used to pass common date through promise chain
   * @returns {Promise} Resolve to Object (chainObject) or reject error
   */
  const deserializeElements = function (req, chainObject) {
    return new Promise(function (resolve, reject) {
      const index = parseInt(req.query.index);
      const tempServer = {};
      tempServer.name = req.body.name;
      tempServer.host = req.body.host;
      tempServer.port = req.body.port;
      tempServer.tls = req.body.tls;
      tempServer.verify = req.body.verify;
      // password is hidden and write only
      // If new values is not provided, use the previous values
      if ('password' in req.body) {
        tempServer.password = req.body.password;
      } else {
        if ((!('index' in req.query)) || (req.query.index === -1)) {
          // case of new IRC server
          tempServer.password = '';
        } else {
          // case of existing IRC server, use existing value
          tempServer.password = chainObject.serversFile.serverArray[index].password;
        }
      }
      tempServer.identifyNick = req.body.identifyNick;
      // identifyCommand is hidden and write only
      // If new values is not provided, use the previous values
      if ('identifyCommand' in req.body) {
        tempServer.identifyCommand = req.body.identifyCommand;
      } else {
        if ((!('index' in req.query)) || (req.query.index === -1)) {
          // case of new IRC server
          tempServer.identifyCommand = '';
        } else {
          // case of existing IRC server, use existing value
          tempServer.identifyCommand = chainObject.serversFile.serverArray[index].identifyCommand;
        }
      }
      tempServer.nick = req.body.nick;
      tempServer.user = req.body.user;
      tempServer.real = req.body.real;
      tempServer.modes = req.body.modes;
      // Convert comma separated strings to array of strings
      tempServer.channelList = _stringToArray(req.body.channelList);
      chainObject.newServer = tempServer;
      resolve(chainObject);
    });
  };

  /**
   * Function to copy existing IRC server to a new entry at the end of the list.
   * Index of source server is provided in URL query parameter 'index'
   * @param {Object} chainObject - Wrapper object used to pass common date through promise chain
   * @returns {Promise} Resolve to Object (chainObject) or reject error
   */
  const copyExistingServer = function (req, chainObject) {
    return new Promise(function (resolve, reject) {
      const index = parseInt(req.query.index);
      const listLength = chainObject.serversFile.serverArray.length;
      if (index < listLength) {
        // this is a deep copy
        chainObject.newServer =
          JSON.parse(JSON.stringify(chainObject.serversFile.serverArray[index]));
        chainObject.newServer.name = chainObject.newServer.name + '-2';
        resolve(chainObject);
      } else {
        const err = new Error('Copy index out of range');
        err.status = 400; // Bad Request
        reject(err);
      }
    });
  };

  /**
   * Function to validate index values match
   * Case of body.index not match query.index = status 400 error (Bad Request)
   * Case of query.index not match database lock = status 409 error (Conflict)
   * Check may be redundant to express-validator input validation
   * @param {Object} req - NodeJs HTTP request object containing URL query params: index
   * @param {Object} chainObject - Wrapper object used to pass common date through promise chain
   * @returns {Promise} Resolve to Object (chainObject) or reject error
   */
  const matchIndex = function (req, chainObject) {
    return new Promise(function (resolve, reject) {
      let errorStr = null;
      let errorStatus = 400;
      if ((!errorStr) && (!('query' in req))) {
        errorStr = 'required query param: index';
      }
      if ((!errorStr) && (!('index' in req.query))) {
        errorStr = 'required query param: index';
      }
      if ((!errorStr) && (!('body' in req))) {
        errorStr = 'required body param: index';
      }
      if ((!errorStr) && (!('index' in req.body))) {
        errorStr = 'required body param: index';
      }
      //
      // Index param value in body must match index URL query param
      if ((!errorStr) && (parseInt(req.query.index) !== parseInt(req.body.index))) {
        errorStr = 'Index mismatch (body param, URL query param';
      }
      // Index URL query param index must match locked value previously saved
      if (!(_checkEditLockIndex(parseInt(req.query.index)))) {
        errorStr = 'Index mismatch (edit lock value)';
        errorStatus = 409; // conflict
      }
      if (errorStr) {
        const err = new Error(errorStr);
        err.status = errorStatus;
        reject(err);
      } else {
        resolve(chainObject);
      }
    });
  };

  /**
   * Execute HTTP response by returning data from Chain object
   * Case 1 - Return full list of IRC servers
   * Case 2 - Return one IRC server specified by index query param
   * This is intended to be end function in chain of promises
   * @param {Object} req - NodeJs HTTP request object, req.query.index contains index
   * @param {Object} res  - NodeJs HTTP response object
   * @param {Object} next - NodeJs HTTP error object
   * @param {Object} chainObject - Wrapper object used to pass common date through promise chain
   */
  const returnServerList = function (req, res, next, chainObject) {
    if (('query' in req) && ('index' in req.query)) {
      const index = parseInt(req.query.index);
      if (isNaN(index)) {
        const err = new Error('Server list index not valid integer');
        err.status = 400;
        next(err);
      } else if ((index < 0) || (index >= chainObject.serverArray.length)) {
        const err = new Error('Server list array index out of range');
        err.status = 400;
        next(err);
      } else {
        res.json(chainObject.serverArray[index]);
      }
    } else {
      res.json(chainObject.serverArray);
    }
  };

  /**
   * Execute HTTP response to API request
   * Response contains status of data submission for POST, PATCH, DELETE requests
   * Example response: {status: 'success', method: 'POST', index: 0}
   * This is intended to be end function in chain of promises
   * @param {Object} req - NodeJs HTTP request object, req.query.index contain index, or -1
   * @param {Object} res  - NodeJs HTTP response object
   * @param {Object} chainObject - Wrapper object used to pass common date through promise chain
   */
  const returnStatus = function (req, res, chainObject) {
    _setEditLock(false);
    const responseJson = {
      status: 'success',
      method: req.method
    };
    if (('query' in req) && ('index' in req.query)) responseJson.index = parseInt(req.query.index);
    if (req.method === 'POST') responseJson.index = chainObject.serversFile.serverArray.length - 1;
    if (req.method === 'COPY') responseJson.index = chainObject.serversFile.serverArray.length - 1;
    if (chainObject.resultStatus) responseJson.status = chainObject.resultStatus;
    if (chainObject.resultComment) responseJson.comment = chainObject.resultComment;
    res.json(responseJson);
  };

  /**
   * Close edit after error occurs in promise chain
   * This is intended to be the last function in a promise chain
   * @param {Object} next - NodeJs error object
   * @param {Error} err - JS Error, with optional error.status http response code
   */
  const handlePromiseErrors = function (next, err) {
    // Edit lock remain in place for common errors involving submission syntax
    if (!('status' in err)) {
      _setEditLock(false);
    } else {
      if ((err.status !== 400) &&
        (err.status !== 409) &&
        (err.status !== 422)) {
        _setEditLock(false);
      }
    }
    next(err);
  };

  /**
   * Function to append a new IRC server to array contain IRC server definitions
   * Both new IRC server object and IRC server array are present within chainObject
   * @param {Object} chainObject - Wrapper object used to pass common date through promise chain
   * @returns {Promise} Resolve to Object (chainObject) or reject error
   */
  const appendArrayElement = function (chainObject) {
    return new Promise(function (resolve, reject) {
      chainObject.serversFile.serverArray.push(chainObject.newServer);
      resolve(chainObject);
    });
  };

  /**
   * Function to replace existing IRC server in array contain IRC server definitions
   * Both replacement IRC server object and IRC server array are present within chainObject
   * @param {Object} req - NodeJs HTTP request object, req.query.index contain index
   * @param {Object} chainObject - Wrapper object used to pass common date through promise chain
   * @returns {Promise} Resolve to Object (chainObject) or reject error
   */
  const replaceArrayElement = function (req, chainObject) {
    // console.log(JSON.stringify(chainObject, null, 2));
    return new Promise(function (resolve, reject) {
      if (('newServer' in chainObject) &&
        ('serversFile' in chainObject) && ('serverArray' in chainObject.serversFile)) {
        const index = parseInt(req.query.index);
        if ((!isNaN(index)) && (index < chainObject.serversFile.serverArray.length)) {
          chainObject.serversFile.serverArray[index] = chainObject.newServer;
        } else {
          const err = new Error('Invalid array index');
          err.status = 500;
          reject(err);
        }
        resolve(chainObject);
      } else {
        const err = new Error('chainObject internal data error');
        err.status = 500;
        reject(err);
      }
    });
  };

  /**
   * Function to remove existing IRC server from array contain IRC server definitions
   * Both replacement IRC server object and IRC server array are present within chainObject
   * Index number is specified in NodeJS request object as URL query parameter
   * @param {Object} req - NodeJs HTTP request object, req.query.index contain index
   * @param {Object} chainObject - Wrapper object used to pass common date through promise chain
   * @returns {Promise} Resolve to Object (chainObject) or reject error
   */
  const deleteArrayElement = function (req, chainObject) {
    return new Promise(function (resolve, reject) {
      const index = parseInt(req.query.index);
      if (index < chainObject.serversFile.serverArray.length) {
        chainObject.serversFile.serverArray.splice(index, 1);
        resolve(chainObject);
      } else {
        const err = new Error('Array index out of range');
        err.status = 400;
        reject(err);
      }
    });
  };

  /**
   * List - NodeJs Middleware function: GET /irc/serverlist route handler
   */
  const listServerlist = function (req, res, next) {
    const chainObject = {};
    requireIrcNotConnected(chainObject)
      .then((chainObject) => setDatabaseLock(req, chainObject))
      .then((chainObject) => readServersFile(chainObject))
      .then((chainObject) => serializeElements(chainObject))
      .then((chainObject) => returnServerList(req, res, next, chainObject))
      .catch((err) => next(err));
  };

  /**
   * Create - NodeJs Middleware function: POST /irc/serverlist route handler
   */
  const createServerlist = function (req, res, next) {
    const chainObject = {};
    requireIrcNotConnected(chainObject)
      .then((chainObject) => requireNotLock(chainObject))
      .then((chainObject) => readServersFile(chainObject))
      .then((chainObject) => deserializeElements(req, chainObject))
      .then((chainObject) => appendArrayElement(chainObject))
      .then((chainObject) => writeServersFile(chainObject))
      .then((chainObject) => returnStatus(req, res, chainObject))
      .catch((err) => next(err));
  };

  /**
   * Update - NodeJs Middleware function:  PATCH /irc/serverlist?index=0 route handler
   */
  const updateServerlist = function (req, res, next) {
    const chainObject = {};
    requireIrcNotConnected(chainObject)
      .then((chainObject) => requireLock(chainObject))
      .then((chainObject) => matchIndex(req, chainObject))
      .then((chainObject) => readServersFile(chainObject))
      .then((chainObject) => deserializeElements(req, chainObject))
      .then((chainObject) => replaceArrayElement(req, chainObject))
      .then((chainObject) => writeServersFile(chainObject))
      .then((chainObject) => returnStatus(req, res, chainObject))
      .catch((err) => handlePromiseErrors(next, err));
  };

  /**
   * Copy - NodeJs Middleware function: COPY /irc/serverlist?index=0 route handler
   */
  const copyServerlist = function (req, res, next) {
    const chainObject = {};
    requireIrcNotConnected(chainObject)
      .then((chainObject) => requireNotLock(chainObject))
      .then((chainObject) => readServersFile(chainObject))
      .then((chainObject) => copyExistingServer(req, chainObject))
      .then((chainObject) => appendArrayElement(chainObject))
      .then((chainObject) => writeServersFile(chainObject))
      .then((chainObject) => returnStatus(req, res, chainObject))
      .catch((err) => next(err));
  };

  /**
   * Destroy - NodeJs Middleware function:  DELETE /irc/serverlist?index=0 route handler
   */
  const destroyServerlist = function (req, res, next) {
    const chainObject = {};
    requireIrcNotConnected(chainObject)
      .then((chainObject) => requireNotLock(chainObject))
      .then((chainObject) => readServersFile(chainObject))
      .then((chainObject) => deleteArrayElement(req, chainObject))
      .then((chainObject) => writeServersFile(chainObject))
      .then((chainObject) => returnStatus(req, res, chainObject))
      .catch((err) => handlePromiseErrors(next, err));
  };

  module.exports = {
    list: listServerlist,
    create: createServerlist,
    update: updateServerlist,
    copy: copyServerlist,
    destroy: destroyServerlist
  };
}());
