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
//   "group": 0,
//   "port": 6667,
//   "tls": false,
//   "verify": false,
//   "proxy": true,
//   "reconnect": false,
//   "logging": false,
//   "password": "",
//   "saslUsername", "",
//   "saslPassword", "",
//   "identifyNick": "",
//   "identifyCommand": "",
//   "nick": "myNick",
//   "altNick": "myNick2",
//   "recoverNick": false,
//   "user": "myUser",
//   "real": "myRealName",
//   "modes": "+iw",
//   "channelList": "#test, #test2, #test3"
// }
// -----------------------------------------------------------------------------
'use strict';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import vars from './irc-client-vars.mjs';

// const nodeEnv = process.env.NODE_ENV || 'development';

// Custom case for use with ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nodeEnv = process.env.NODE_ENV || 'development';
const nodeDebugLog = process.env.NODE_DEBUG_LOG || 0;

const authLogFilename = path.join(__dirname, '../../logs/auth.log');
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
    } else {
      resolve(chainObject);
    }
  });
};

/**
 * Function to prevent using list controller to lock or unlock the database when
 * the IRC client is connected to the IRC network.
 * @param {Object} chainObject - Wrapper object used to pass common date through promise chain
 * @returns {Promise} Resolve to Object (chainObject) or reject error https status 409
 */
const requireListWithoutLock = function (req, chainObject) {
  return new Promise(function (resolve, reject) {
    if ((vars.ircState.ircConnected) || (vars.ircState.ircConnecting)) {
      if (('query' in req) && ('lock' in req.query)) {
        const err = new Error('Editing server list requires IRC client to disconnect from IRC');
        err.status = 409; // Status 409 = Conflict
        reject(err);
      } else {
        resolve(chainObject);
      }
    } else {
      resolve(chainObject);
    }
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
    const data = JSON.stringify(chainObject.serversFile, null, 2) + '\n';
    fs.writeFile(serverListFilename, data, { encoding: 'utf8' },
      function (err, jsonData) {
        if (err) {
          reject(err);
        } else {
          // Tell the IRC client to reload the server list
          if ('externalEvent' in global) {
            global.externalEvent.emit('serverListChanged');
          }
          resolve(chainObject);
        }
      });
  });
};

/**
 * Check for missing properties in each IRC server, add default if necessary
 * The purpose is to handle upgrade from previous versions
 * @param {Object} chainObject - Wrapper object used to pass common date through promise chain
 * @returns {Promise} Resolve to Object (chainObject) or reject error
 */
const addMissingProperties = function (chainObject) {
  return new Promise(function (resolve, reject) {
    // console.log(JSON.stringify(chainObject.serversFile.serverArray, null, 2));
    // Upgrade fix, add missing properties set to default
    if (chainObject.serversFile.serverArray.length > 0) {
      for (let i = 0; i < chainObject.serversFile.serverArray.length; i++) {
        if (!('group' in chainObject.serversFile.serverArray[i])) {
          chainObject.serversFile.serverArray[i].group = 0;
        }
        if (!('altNick' in chainObject.serversFile.serverArray[i])) {
          chainObject.serversFile.serverArray[i].altNick = '';
        }
        if (!('recoverNick' in chainObject.serversFile.serverArray[i])) {
          chainObject.serversFile.serverArray[i].recoverNick = false;
        }
        if (!('saslUsername' in chainObject.serversFile.serverArray[i])) {
          chainObject.serversFile.serverArray[i].saslUsername = '';
        }
        if (!('saslPassword' in chainObject.serversFile.serverArray[i])) {
          chainObject.serversFile.serverArray[i].saslPassword = '';
        }
      }
    }
    resolve(chainObject);
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
          tempServer.disabled = chainObject.serversFile.serverArray[i].disabled;
          tempServer.group = chainObject.serversFile.serverArray[i].group;
          tempServer.name = chainObject.serversFile.serverArray[i].name;
          tempServer.host = chainObject.serversFile.serverArray[i].host;
          tempServer.port = chainObject.serversFile.serverArray[i].port;
          tempServer.tls = chainObject.serversFile.serverArray[i].tls;
          tempServer.verify = chainObject.serversFile.serverArray[i].verify;
          tempServer.proxy = chainObject.serversFile.serverArray[i].proxy;
          tempServer.reconnect = chainObject.serversFile.serverArray[i].reconnect;
          tempServer.logging = chainObject.serversFile.serverArray[i].logging;
          // Security: Password is never sent to the browser
          if (chainObject.serversFile.serverArray[i].password.length === 0) {
            // No password has been set, return empty string
            tempServer.password = '';
          } else {
            // else never send password, replace with NULL
            tempServer.password = null;
          }
          tempServer.saslUsername = chainObject.serversFile.serverArray[i].saslUsername;
          // Security: Password is never sent to the browser
          if (chainObject.serversFile.serverArray[i].saslPassword.length === 0) {
            // No password has been set, return empty string
            tempServer.saslPassword = '';
          } else {
            // else never send password, replace with NULL
            tempServer.saslPassword = null;
          }
          tempServer.identifyNick = chainObject.serversFile.serverArray[i].identifyNick;
          // Security: Nickserv identify password  is never sent to the browser
          if (chainObject.serversFile.serverArray[i].identifyCommand.length === 0) {
            // No identifyCommand has been set, return empty string
            tempServer.identifyCommand = '';
          } else {
            // else never send identifyCommand, replace with NULL
            tempServer.identifyCommand = null;
          }
          // tempServer.identifyCommand = chainObject.serversFile.serverArray[i].identifyCommand;
          tempServer.nick = chainObject.serversFile.serverArray[i].nick;
          tempServer.altNick = chainObject.serversFile.serverArray[i].altNick || '';
          tempServer.recoverNick = chainObject.serversFile.serverArray[i].recoverNick || false;
          if (tempServer.altNick.length === 0) tempServer.recoverNick = false;
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
  if (cleanString === '') return [];
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
    tempServer.disabled = req.body.disabled;
    tempServer.group = req.body.group;
    tempServer.name = req.body.name;
    tempServer.host = req.body.host;
    tempServer.port = req.body.port;
    tempServer.tls = req.body.tls;
    tempServer.verify = req.body.verify;
    tempServer.proxy = req.body.proxy;
    tempServer.reconnect = req.body.reconnect;
    tempServer.logging = req.body.logging;
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
    tempServer.saslUsername = req.body.saslUsername;
    if ('saslPassword' in req.body) {
      tempServer.saslPassword = req.body.saslPassword;
    } else {
      if ((!('index' in req.query)) || (req.query.index === -1)) {
        // case of new IRC server
        tempServer.saslPassword = '';
      } else {
        // case of existing IRC server, use existing value
        tempServer.saslPassword = chainObject.serversFile.serverArray[index].saslPassword;
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
    tempServer.altNick = req.body.altNick;
    tempServer.recoverNick = req.body.recoverNick;
    if (tempServer.altNick.length === 0) tempServer.recoverNick = false;
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
 * Name of duplicated server appended with sequential integers '-0' to '-9'
 * @param {Object} req - NodeJs HTTP request object
 * @param {Object} req.query.index - URL query parameter for from index for copy operation
 * @param {Object} chainObject - Wrapper object used to pass common date through promise chain
 * @param {Object} chainObject.serversFile.serverArray - IRC server list (from file).
* @returns {Promise} Resolve to chainObject with chainObject.newServer or reject error
 */
const copyExistingServer = function (req, chainObject) {
  return new Promise(function (resolve, reject) {
    const index = parseInt(req.query.index);
    const listLength = chainObject.serversFile.serverArray.length;
    if (index < listLength) {
      chainObject.fromIndex = index;
      // this is a deep copy
      chainObject.newServer =
        JSON.parse(JSON.stringify(chainObject.serversFile.serverArray[index]));
      // Name (label) of new IRC server formed from copied server name.
      let newName = chainObject.newServer.name;
      // Append ('-0', '-1', '-2',  ... '-8', '-9', '-dup' to the end of the server name
      // If server name ends in '-dup', leave it without modification.
      if ((newName.length < 4) || (newName.indexOf('-dup') !== newName.length - 4)) {
        if ((newName.length > 2) && (newName.charAt(newName.length - 2) === '-') &&
          (newName.charCodeAt(newName.length - 1) >= '0'.charCodeAt(0)) &&
          (newName.charCodeAt(newName.length - 1) <= '9'.charCodeAt(0))) {
          // Server name already ends in '-?', so strip 2 characters.
          newName = newName.slice(0, newName.length - 2);
        }
        let available = false;
        let suffix = '';
        // loop ascii digits '0' to '9'
        for (let i = 0; i <= 9; i++) {
          available = true;
          suffix = '-' + String.fromCharCode('0'.charCodeAt(0) + i);
          // loop through each server in the list checking for duplicate names.
          for (let j = 0; j < chainObject.serversFile.serverArray.length; j++) {
            if (newName + suffix === chainObject.serversFile.serverArray[j].name) {
              available = false;
              break;
            }
          } // next j
          if (available) break;
        } // next i
        if (available) {
          newName += suffix;
        } else {
          newName += '-dup';
        }
      }
      chainObject.newServer.name = newName;
      resolve(chainObject);
    } else {
      const err = new Error('Copy index out of range');
      err.status = 400; // Bad Request
      reject(err);
    }
  });
};

/**
 * Function to insert a copy of existing IRC server into array IRC server definitions
 * at location immediately after the source IRC server index position.
 * Both new IRC server object and IRC server array are present within chainObject
 * @param {Object} chainObject - Wrapper object used to pass common date through promise chain
 * @param {Object} chainObject.fromIndex - Array index of source IRC server for copy
 * @param {Object} chainObject.serversFile.serverArray - IRC server list (from file).
 * @param {Object} chainObject.newServer - Javascript object defining the copied IRC server.
 * @returns {Promise} Resolve to chainObject, chainObject.serversFile.serverArray or reject error
 */
const insertArrayElement = function (chainObject) {
  return new Promise((resolve, reject) => {
    const index = chainObject.fromIndex;
    const listLength = chainObject.serversFile.serverArray.length;
    if ((typeof index === 'number') && (index >= 0) && (index < listLength)) {
      const newArray = [];
      for (let i = 0; i <= index; i++) {
        newArray.push(chainObject.serversFile.serverArray[i]);
      }
      newArray.push(chainObject.newServer);
      if (listLength > index + 1) {
        for (let i = index + 1; i < chainObject.serversFile.serverArray.length; i++) {
          newArray.push(chainObject.serversFile.serverArray[i]);
        }
      }
      chainObject.serversFile.serverArray = newArray;
      chainObject.returnIndex = index + 1;
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
    } else if ((index === 0) && (chainObject.serverArray.length === 0)) {
      // This is to address edge case of empty server list.
      // A valid lock + unlock request is needed to create a new record in
      // an empty server list.
      res.json({});
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
    method: req.method,
    index: chainObject.returnIndex
  };
  if (chainObject.returnValue) responseJson.value = chainObject.returnValue;
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
    chainObject.returnIndex = chainObject.serversFile.serverArray.length - 1;
    resolve(chainObject);
  });
};

/**
 * Function to re-order server list. The record at the
 * specified index is moved up by one position in the list
 * @param {Object} req - NodeJs HTTP request object, req.query.index contain index
 * @param {Object} chainObject - Wrapper object used to pass common date through promise chain
 * @returns {Promise} Resolve to Object (chainObject) or reject error
 */
const reorderArray = function (req, chainObject) {
  return new Promise(function (resolve, reject) {
    // chainObject.serversFile.serverArray.push(chainObject.newServer);
    const index = parseInt(req.query.index);
    const listLength = chainObject.serversFile.serverArray.length;
    if ((!isNaN(index)) && (index < listLength)) {
      if (index === 0) {
        // first record can not move up, no changed needed
        chainObject.returnIndex = 0;
        resolve(chainObject);
      } else {
        // Exchange 2 records
        const temp = chainObject.serversFile.serverArray[index];
        chainObject.serversFile.serverArray[index] =
          chainObject.serversFile.serverArray[index - 1];
        chainObject.serversFile.serverArray[index - 1] = temp;
        chainObject.returnIndex = index - 1;
        resolve(chainObject);
      }
    } else {
      const err = new Error('Invalid array index');
      err.status = 500;
      reject(err);
    }
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
        chainObject.returnIndex = index;
        resolve(chainObject);
      } else {
        const err = new Error('Invalid array index');
        err.status = 500;
        reject(err);
      }
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
      chainObject.returnIndex = chainObject.serversFile.serverArray.length - 1;
      resolve(chainObject);
    } else {
      const err = new Error('Array index out of range');
      err.status = 400;
      reject(err);
    }
  });
};

/**
 * Function to toggle disabled property of a server object
 * The IRC server array is assumed to be present within chainObject
 * @param {Object} req - NodeJs HTTP request object, req.query.index contain index
 * @param {Object} chainObject - Wrapper object used to pass common date through promise chain
 * @returns {Promise} Resolve to Object (chainObject) or reject error
 */
const toggleServerDisabled = function (req, chainObject) {
  // console.log(JSON.stringify(chainObject, null, 2));
  return new Promise(function (resolve, reject) {
    if (('serversFile' in chainObject) && ('serverArray' in chainObject.serversFile)) {
      const index = parseInt(req.query.index);
      if ((!isNaN(index)) && (index < chainObject.serversFile.serverArray.length)) {
        let toggledLock = true;
        if (chainObject.serversFile.serverArray[index].disabled) toggledLock = false;
        chainObject.serversFile.serverArray[index].disabled = toggledLock;
        chainObject.returnIndex = index;
        chainObject.returnValue = toggledLock;
        resolve(chainObject);
      } else {
        const err = new Error('Invalid array index');
        err.status = 500;
        reject(err);
      }
    } else {
      const err = new Error('chainObject internal data error');
      err.status = 500;
      reject(err);
    }
  });
};

/**
 * Server List Edit API logger - Changes to the server list are written to "auth.log"
 * @param {Object} req - NodeJs HTTP request object, req.query.index contain index
 * @param {Object} chainObject - Wrapper object used to pass common date through promise chain
 * @returns {Promise} Resolve to Object (chainObject) or reject error
 */
const logger = (req, chainObject) => {
  return new Promise((resolve, reject) => {
    let method = null;
    let server = {};
    if (req.method.toUpperCase() === 'POST') {
      method = 'POST';
      server = chainObject.newServer;
    } else if (req.method.toUpperCase() === 'PATCH') {
      method = 'PATCH';
      server = chainObject.newServer;
    } else if (req.method.toUpperCase() === 'COPY') {
      method = 'COPY';
      server = chainObject.newServer;
    } else if (req.method.toUpperCase() === 'DELETE') {
      method = 'DELETE';
      const index = parseInt(req.query.index);
      if ((!isNaN(index)) && (index >= 0) &&
        (index < chainObject.serversFile.serverArray.length)) {
        server = chainObject.serversFile.serverArray[index];
      } else {
        reject(new Error('Server list API method DELETE received bad index.'));
      }
    }

    if ((method == null) || (server == null)) {
      reject(new Error('Server list API logger parsing error.'));
    } else {
      //
      // build log text string
      //
      const now = new Date();
      let logEntry = now.toISOString();
      if ('_remoteAddress' in req) {
        logEntry += ' ' + req._remoteAddress;
      } else {
        logEntry += ' NOADDRESS';
      }
      if ((req.session) && (req.session.sessionAuth) && (req.session.sessionAuth.user) &&
      (req.session.sessionAuth.user.length > 0)) {
        logEntry += ' ' + req.session.sessionAuth.user;
      } else {
        logEntry += ' NOUSER';
      }
      logEntry += ' EDITSERVERLIST';
      logEntry += ' ' + method + ' ' + server.host + ' ' + server.port.toString();
      //
      // Append string to file
      //
      if ((nodeEnv === 'development') || (nodeDebugLog)) {
        console.log(logEntry);
        resolve(chainObject);
      } else {
        fs.writeFile(
          authLogFilename,
          logEntry + '\n',
          {
            encoding: 'utf8',
            mode: 0o600,
            flag: 'a'
          },
          function (err) {
            if (err) {
              const error = new Error(err.message || err.toString() || 'Server List Log I/O Error');
              reject(error);
            } else {
              resolve(chainObject);
            }
          }
        );
      }
    }
  });
}; // logger()

/**
 * List - NodeJs Middleware function: GET /irc/serverlist route handler
 */
const list = function (req, res, next) {
  const chainObject = {};
  requireListWithoutLock(req, chainObject)
    .then((chainObject) => setDatabaseLock(req, chainObject))
    .then((chainObject) => readServersFile(chainObject))
    .then((chainObject) => addMissingProperties(chainObject))
    .then((chainObject) => serializeElements(chainObject))
    .then((chainObject) => returnServerList(req, res, next, chainObject))
    .catch((err) => next(err));
};

/**
 * Create - NodeJs Middleware function: POST /irc/serverlist route handler
 */
const create = function (req, res, next) {
  const chainObject = {};
  requireIrcNotConnected(chainObject)
    .then((chainObject) => requireNotLock(chainObject))
    .then((chainObject) => readServersFile(chainObject))
    .then((chainObject) => addMissingProperties(chainObject))
    .then((chainObject) => deserializeElements(req, chainObject))
    .then((chainObject) => appendArrayElement(chainObject))
    .then((chainObject) => writeServersFile(chainObject))
    .then((chainObject) => logger(req, chainObject))
    .then((chainObject) => returnStatus(req, res, chainObject))
    .catch((err) => next(err));
};

/**
 * Update - NodeJs Middleware function:  PATCH /irc/serverlist?index=0 route handler
 */
const update = function (req, res, next) {
  const chainObject = {};
  requireIrcNotConnected(chainObject)
    .then((chainObject) => requireLock(chainObject))
    .then((chainObject) => matchIndex(req, chainObject))
    .then((chainObject) => readServersFile(chainObject))
    .then((chainObject) => addMissingProperties(chainObject))
    .then((chainObject) => deserializeElements(req, chainObject))
    .then((chainObject) => replaceArrayElement(req, chainObject))
    .then((chainObject) => writeServersFile(chainObject))
    .then((chainObject) => logger(req, chainObject))
    .then((chainObject) => returnStatus(req, res, chainObject))
    .catch((err) => handlePromiseErrors(next, err));
};

/**
 * Copy - NodeJs Middleware function: COPY /irc/serverlist?index=0 route handler
 */
const copy = function (req, res, next) {
  // Copy specified record to the end of the list as a duplicate
  const chainObject = {};
  requireIrcNotConnected(chainObject)
    .then((chainObject) => requireNotLock(chainObject))
    .then((chainObject) => readServersFile(chainObject))
    .then((chainObject) => addMissingProperties(chainObject))
    .then((chainObject) => copyExistingServer(req, chainObject))
    .then((chainObject) => insertArrayElement(chainObject))
    .then((chainObject) => writeServersFile(chainObject))
    .then((chainObject) => logger(req, chainObject))
    .then((chainObject) => returnStatus(req, res, chainObject))
    .catch((err) => next(err));
};

/**
 * Destroy - NodeJs Middleware function:  DELETE /irc/serverlist?index=0 route handler
 */
const destroy = function (req, res, next) {
  const chainObject = {};
  requireIrcNotConnected(chainObject)
    .then((chainObject) => requireNotLock(chainObject))
    .then((chainObject) => readServersFile(chainObject))
    .then((chainObject) => addMissingProperties(chainObject))
    .then((chainObject) => logger(req, chainObject))
    .then((chainObject) => deleteArrayElement(req, chainObject))
    .then((chainObject) => writeServersFile(chainObject))
    .then((chainObject) => returnStatus(req, res, chainObject))
    .catch((err) => handlePromiseErrors(next, err));
};

/**
 * Tools - NodeJs Middleware function: POST /irc/serverlist/tools?index=0 route handler
*/
const tools = function (req, res, next) {
  if (('action' in req.body) && (req.body.action === 'move-up')) {
    // Case 1: reorder the list moving record at index up 1 position
    // body {
    //   "index": 0,
    //   "action": "move-up"
    // }
    const chainObject = {};
    requireIrcNotConnected(chainObject)
      .then((chainObject) => requireNotLock(chainObject))
      .then((chainObject) => readServersFile(chainObject))
      .then((chainObject) => addMissingProperties(chainObject))
      .then((chainObject) => reorderArray(req, chainObject))
      .then((chainObject) => writeServersFile(chainObject))
      .then((chainObject) => returnStatus(req, res, chainObject))
      .catch((err) => next(err));
  } else if (('action' in req.body) && (req.body.action === 'toggle-disabled')) {
    // Case 2: toggle disabled setting
    // body {
    //   "index": 0,
    //   "action": "toggle-disabled"
    // }
    const chainObject = {};
    requireIrcNotConnected(chainObject)
      .then((chainObject) => requireNotLock(chainObject))
      .then((chainObject) => readServersFile(chainObject))
      .then((chainObject) => addMissingProperties(chainObject))
      .then((chainObject) => toggleServerDisabled(req, chainObject))
      .then((chainObject) => writeServersFile(chainObject))
      .then((chainObject) => returnStatus(req, res, chainObject))
      .catch((err) => handlePromiseErrors(next, err));
  } else {
    const err = new Error('Invalid action property');
    err.status = 400;
    next(err);
  }
};

export default {
  list,
  create,
  update,
  copy,
  destroy,
  tools
};
