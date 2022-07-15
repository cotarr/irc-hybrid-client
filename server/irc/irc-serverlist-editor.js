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

  // editlock must be set to true to accept POST, PATCH or DELETE methods.
  let editlock = false;

  //
  // Parse query params for: GET /irc/serverlist?index=0&editlock=1
  // requies either no query params, or both 'index' and 'editlock'
  // sets variable editlock
  // returns Promise resolving to chainObject
  //
  const setReadEditLock = function (req, chainObject) {
    return new Promise(function (resolve, reject) {
      if (('query' in req) && ('index' in req.query) &&
        ('editlock' in req.query)) {
        if (editlock) {
          if (req.query.editlock === '1') {
            const err = new Error('Editlock already set');
            err.status = 409; // Status 409 = Conflict
            reject(err);
          } else if (req.query.editlock === '0') {
            editlock = false;
            resolve(chainObject);
          } else {
            const err = new Error('Editlock allowed values 0 or 1');
            err.status = 400;
            reject(err);
          }
        } else {
          if (req.query.editlock === '1') {
            editlock = true;
            resolve(chainObject);
          } else if (req.query.editlock === '0') {
            resolve(chainObject);
          } else {
            const err = new Error('Editlock allowed values 0 or 1');
            err.status = 400;
            reject(err);
          }
        }
      } else if (('query' in req) && (!('index' in req.query)) &&
        ('editlock' in req.query)) {
        const err = new Error('editlock requires param: index');
        err.status = 400;
        reject(err);
      } else {
        resolve(chainObject);
      }
    });
  };

  //
  // Verify editlock is true before modification of records
  // If successful remove editlock by set to false
  // Returns Promise resolving to chainObject
  //
  const requireEditLock = function (chainObject) {
    if (editlock) {
      editlock = false;
      return Promise.resolve(chainObject);
    } else {
      const err = new Error('Attempt to modify unlocked record');
      err.status = 409; // Status 409 = Conflict
      return Promise.reject(err);
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
  const parseServerArray = function (chainObject) {
    return new Promise(function (resolve, reject) {
      if ((chainObject) && ('serversFile' in chainObject) &&
        ('serverArray' in chainObject.serversFile)) {
        let count = 0;
        chainObject.serverArray = [];
        if (chainObject.serversFile.serverArray.length > 0) {
          for (let i = 1; i < chainObject.serversFile.serverArray.length; i++) {
            const tempServer = {};
            tempServer.index = count;
            count += 1;
            tempServer.name = chainObject.serversFile.serverArray[i].name;
            tempServer.host = chainObject.serversFile.serverArray[i].host;
            tempServer.port = chainObject.serversFile.serverArray[i].port;
            tempServer.tls = chainObject.serversFile.serverArray[i].tls;
            tempServer.verify = chainObject.serversFile.serverArray[i].verify;
            tempServer.password = chainObject.serversFile.serverArray[i].password;
            tempServer.identifyNice = chainObject.serversFile.serverArray[i].identifyNick;
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

  //
  // Return HTTP response to the following requests
  //
  // GET /irc/serverlist                     Array of all configured server
  // GET /irc/serverlist?index=0             One server at index
  // GET /irc/serverlist?index=0&editlock=1  One server at index, set editlock
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

  //
  // For http methods that modify IRC server definitions
  // This function will match the query parameter index value
  // to the index value in the body of the http request.
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
  const returnOkStatus = function (res, chainObject) {
    res.send();
  };

  //
  // Removes a specified IRC server from serverArray
  // Returns Promise resolving to chainObject
  //
  const removeDeletedServerFromArray = function (req, chainObject) {
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
  const getIrcServer = function (req, res, next) {
    const chainObject = {};
    requireIrcNotConnected(chainObject)
      .then((chainObject) => setReadEditLock(req, chainObject))
      .then((chainObject) => readServersFile(chainObject))
      .then((chainObject) => parseServerArray(chainObject))
      .then((chainObject) => returnServerList(req, res, next, chainObject))
      .catch((err) => next(err));
  };

  // --------------------------------------------------
  // POST /irc/serverlist route handler
  // --------------------------------------------------
  const createIrcServer = function (req, res, next) {
    res.status(405).send('Method not written yet');
  };

  // --------------------------------------------------
  // PATCH /irc/serverlist route handler
  // --------------------------------------------------
  const modifyIrcServer = function (req, res, next) {
    res.status(405).send('Method not written yet');
  };

  // --------------------------------------------------
  // DELETE /irc/serverlist route handler
  // --------------------------------------------------
  const deleteIrcServer = function (req, res, next) {
    const chainObject = {};
    requireIrcNotConnected(chainObject)
      .then((chainObject) => requireEditLock(chainObject))
      .then((chainObject) => matchIndex(req, chainObject))
      .then((chainObject) => readServersFile(chainObject))
      .then((chainObject) => removeDeletedServerFromArray(req, chainObject))
      .then((chainObject) => writeServersFile(chainObject))
      .then((chainObject) => returnOkStatus(res, chainObject))
      .catch((err) => next(err));
  };

  module.exports = {
    getIrcServer: getIrcServer,
    createIrcServer: createIrcServer,
    modifyIrcServer: modifyIrcServer,
    deleteIrcServer: deleteIrcServer
  };
}());
