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
// -----------------------------------------------------------------------------
(function () {
  'use strict';

  const fs = require('fs');
  const path = require('path');

  const vars = require('./irc-client-vars');

  // const nodeEnv = process.env.NODE_ENV || 'development';

  // editLock must be set to true to accept POST, PATCH or DELETE methods.
  let editLock = false;
  let editLockTimer = 0;

  const _setEditLock = function (lockValue) {
    if (lockValue) {
      editLock = true;
      editLockTimer = 3600;
    } else {
      editLock = false;
      editLockTimer = 0;
    }
  };

  //
  // Editlock timer (seconds)
  //
  setInterval(function () {
    // console.log('editLock ', editLock, ' editLockTimer ', editLockTimer);
    if (editLockTimer === 1) {
      editLock = false;
      editLockTimer = 0;
    }
    if (editLockTimer > 0) editLockTimer--;
  }, 1000);

  //
  // Parse query params for: GET /irc/serverlist?index=0&lock=1
  // requies either no query params, or both 'index' and 'lock'
  // sets variable editLock
  // Some input validation is reduncant to express-validator checks.
  // returns Promise resolving to chainObject
  //
  const setReadLock = function (req, chainObject) {
    return new Promise(function (resolve, reject) {
      if (('query' in req) && ('index' in req.query) &&
      ('lock' in req.query)) {
        if (editLock) {
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
            _setEditLock(true);
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
        resolve(chainObject);
      }
    });
  };

  //
  // Verify editLock is true before modification of records
  // If successful remove editLock by set to false
  // Returns Promise resolving to chainObject
  //
  const requireLock = function (chainObject) {
    if (editLock) {
      _setEditLock(false);
      return Promise.resolve(chainObject);
    } else {
      const err = new Error('Attempt to modify unlocked data table');
      err.status = 409; // Status 409 = Conflict
      return Promise.reject(err);
    }
  };

  //
  // Verify editLock is false before modification of records
  // This is used for creating new records with POST method
  // Returns Promise resolving to chainObject
  //
  const requireNotLock = function (chainObject) {
    if (editLock) {
      const err = new Error('Attempt to insert to locked data table');
      err.status = 409; // Status 409 = Conflict
      return Promise.reject(err);
    } else {
      return Promise.resolve(chainObject);
    }
  };

  //
  // Function to check if IRC client is connected to IRC network.
  // Action is denied status 409 if connected to IRC
  // Returns Promoise resolving to chainObject
  //
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

  //
  // read 'servers.json' file and parse to javascript object
  // The parsed contents are added to chain object as serversFile property
  // Returns Promise resolving to chainObject
  //
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
  //
  // write 'servers.json' file
  // File contents are taken from chainObject.serversFile property
  // Returns Promise resolving to chainObject
  //
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

  //
  // Deep copy each IRC server object to a new array
  // Channel list is serialized into a comma separated list
  // serverArray is added to the chainObject
  // Returns Promise resolving to chain Object.
  //
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
            tempServer.password = chainObject.serversFile.serverArray[i].password;
            tempServer.identifyNick = chainObject.serversFile.serverArray[i].identifyNick;
            tempServer.identifyCommand = chainObject.serversFile.serverArray[i].identifyCommand;
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
  };

  // Accept type string
  // Remove whitespace
  // split to array of sub-strings
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

  //
  // Deep copy each IRC server object to a new array
  // Channel list is deserialized into an Array
  // newServer is added to the chainObject
  // Returns Promise resolving to chain Object.
  //
  const deserializeElements = function (req, chainObject) {
    return new Promise(function (resolve, reject) {
      const tempServer = {};
      tempServer.name = req.body.name;
      tempServer.host = req.body.host;
      tempServer.port = req.body.port;
      tempServer.tls = req.body.tls;
      tempServer.verify = req.body.verify;
      tempServer.password = req.body.password;
      tempServer.identifyNick = req.body.identifyNick;
      tempServer.identifyCommand = req.body.identifyCommand;
      tempServer.nick = req.body.nick;
      tempServer.user = req.body.user;
      tempServer.real = req.body.real;
      tempServer.modes = req.body.modes;
      tempServer.channelList = _stringToArray(req.body.channelList);
      chainObject.newServer = tempServer;
      resolve(chainObject);
    });
  };

  //
  // For http methods that modify IRC server definitions
  // This function will match the query parameter index value
  // to the index value in the body of the http request.
  // Check may be redundant to express-validator input validation
  //
  // Returns Promise resolving to unmodified chainObject
  //
  const matchIndex = function (req, chainObject) {
    return new Promise(function (resolve, reject) {
      let errorStr = null;
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
      if ((!errorStr) && (parseInt(req.query.index) !== parseInt(req.body.index))) {
        errorStr = 'index mismatch';
      }
      if (errorStr) {
        const err = new Error(errorStr);
        err.status = 400;
        reject(err);
      } else {
        resolve(chainObject);
      }
    });
  };

  //
  // This functions returns the HTTP response for methods
  // that modify a IRC server record (POST, PATCH, DELETE)
  // This is intended to be the last function in the promise chain.
  //
  const returnStatus = function (req, res, chainObject) {
    const responseJson = {
      status: 'success',
      method: req.method
    };
    if (('query' in req) && ('index' in req.query)) responseJson.index = parseInt(req.query.index);
    if (req.method === 'POST') responseJson.index = chainObject.serversFile.serverArray.length - 1;
    if (chainObject.resultStatus) responseJson.status = chainObject.resultStatus;
    if (chainObject.resultComment) responseJson.comment = chainObject.resultComment;
    res.json(responseJson);
  };

  //
  // Return HTTP response to the following requests
  //
  // GET /irc/serverlist                     Array of all configured server
  // GET /irc/serverlist?index=0             One server at index
  // GET /irc/serverlist?index=0&lock=1  One server at index, set editLock
  // This is intended to be the last function in the promise chain.
  //
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

  const appendArrayElement = function (chainObject) {
    return new Promise(function (resolve, reject) {
      chainObject.serversFile.serverArray.push(chainObject.newServer);
      resolve(chainObject);
    });
  };

  //
  // Removes a specified IRC server from serverArray
  // Returns Promise resolving to chainObject
  //
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

  // --------------------------------------------------
  // GET /irc/serverlist route handler
  // --------------------------------------------------
  const listServerlist = function (req, res, next) {
    const chainObject = {};
    requireIrcNotConnected(chainObject)
      .then((chainObject) => setReadLock(req, chainObject))
      .then((chainObject) => readServersFile(chainObject))
      .then((chainObject) => serializeElements(chainObject))
      .then((chainObject) => returnServerList(req, res, next, chainObject))
      .catch((err) => next(err));
  };

  // --------------------------------------------------
  // POST /irc/serverlist route handler
  // --------------------------------------------------
  const createServerlist = function (req, res, next) {
    const chainObject = {};
    requireIrcNotConnected(chainObject)
      .then((chainObject) => requireNotLock(chainObject))
      .then((chainObject) => deserializeElements(req, chainObject))
      .then((chainObject) => readServersFile(chainObject))
      .then((chainObject) => appendArrayElement(chainObject))
      .then((chainObject) => writeServersFile(chainObject))
      .then((chainObject) => returnStatus(req, res, chainObject))
      .catch((err) => next(err));
  };

  // --------------------------------------------------
  // PATCH /irc/serverlist route handler
  // --------------------------------------------------
  const updateServerlist = function (req, res, next) {
    res.status(405).send('Method not written yet');
  };

  // --------------------------------------------------
  // DELETE /irc/serverlist route handler
  // --------------------------------------------------
  const destroyServerList = function (req, res, next) {
    const chainObject = {};
    requireIrcNotConnected(chainObject)
      .then((chainObject) => requireLock(chainObject))
      .then((chainObject) => matchIndex(req, chainObject))
      .then((chainObject) => readServersFile(chainObject))
      .then((chainObject) => deleteArrayElement(req, chainObject))
      .then((chainObject) => writeServersFile(chainObject))
      .then((chainObject) => returnStatus(req, res, chainObject))
      .catch((err) => next(err));
  };

  module.exports = {
    list: listServerlist,
    create: createServerlist,
    update: updateServerlist,
    destroy: destroyServerList
  };
}());
