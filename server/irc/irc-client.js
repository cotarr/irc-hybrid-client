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
// -----------------------------------------------------------------------------
//
//     Node/Express IRC Client backend for irc-hybrid-client
//
// -----------------------------------------------------------------------------
(function() {
  'use strict';

  const net = require('net');
  const tls = require('tls');
  const fs = require('fs');
  const isValidUTF8 = require('utf-8-validate');

  const ircWrite = require('./irc-client-write');
  const ircLog = require('./irc-client-log');
  const ircParse = require('./irc-client-parse');
  const ircCommand = require('./irc-client-command');

  var ircMessageCache = require('./irc-client-cache');
  var vars = require('./irc-client-vars');

  var nodeEnv = process.env.NODE_ENV || 'development';

  const credentials = JSON.parse(fs.readFileSync('./credentials.json', 'utf8'));

  var servers = JSON.parse(fs.readFileSync('./servers.json', 'utf8'));

  // ----------------------------------------------------
  //
  //     Setup IRC Client variables and configuration
  //
  // ----------------------------------------------------

  vars.ircState.ircConnected = false;
  vars.ircState.ircConnecting = false;
  vars.ircState.ircRegistered = false;
  vars.ircState.ircIsAway = false;

  vars.ircState.ircServerName = servers.serverArray[0].name;
  vars.ircState.ircServerHost = servers.serverArray[0].host;
  vars.ircState.ircServerPort = servers.serverArray[0].port;
  vars.ircState.ircTLSEnabled = servers.serverArray[0].tls;
  vars.ircServerPassword = servers.serverArray[0].password;
  vars.nsIdentifyNick = servers.serverArray[0].identifyNick;
  vars.nsIdentifyCommand = servers.serverArray[0].identifyCommand;
  // index into servers.json file
  vars.ircState.ircServerIndex = 0;
  // List of favorite channels
  vars.ircState.channelList = servers.serverArray[0].channelList;

  vars.ircState.nickName = servers.serverArray[0].nick;
  vars.ircState.userName = servers.serverArray[0].user;
  vars.ircState.realName = servers.serverArray[0].real;
  vars.ircState.userMode = servers.serverArray[0].modes;
  vars.ircState.userHost = '';

  // ircChannels format ['#channel1', '#channel2']
  vars.ircState.channels = [];
  // Channel schema
  //
  // channelStates {
  //   name: '#channel',
  //   topic: 'this is topic',
  //   names: ['visitor1', 'visitor2'],
  //   joined: true,
  //   kicked: false
  // }
  vars.ircState.channelStates = [];

  // get name and version number from npm package.json
  vars.ircState.botVersion = require('../../package.json').version;
  vars.ircState.botName = require('../../package.json').name;

  vars.ircState.times = {programRun: 0, ircConnect: 0};
  vars.ircState.count = {ircConnect: 0};
  vars.ircState.websocketCount = 0;

  ircLog.setRawMessageLogEnabled(servers.serverArray[0].rawMessageLog);

  console.log('Starting ' + vars.ircState.botName + ' ' + vars.ircState.botVersion);
  ircLog.writeIrcLog('-----------------------------------------');
  ircLog.writeIrcLog('Starting ' + vars.ircState.botName + ' ' + vars.ircState.botVersion);

  tellBrowserToRequestState = function() {
    global.sendToBrowser('UPDATE\r\n');
  };

  // -------------------------------------------
  //  On Ready Event Handler (Internal function)
  // -------------------------------------------
  const _readyEventHandler = function(socket) {
    global.sendToBrowser('webServer: Ready\n');
    setTimeout(function() {
      // check state, if error occurred this will be false.
      if (vars.ircState.ircConnecting) {
        if ((vars.ircServerPassword) && (vars.ircServerPassword.length > 0)) {
          ircWrite.writeSocket(socket, 'PASS ' + vars.ircServerPassword);
        }
        ircWrite.writeSocket(socket, 'NICK ' + vars.ircState.nickName);
        // Note: mode 8 = i not working on ngirc ?
        ircWrite.writeSocket(socket, 'USER ' + vars.ircState.userName +
          ' 0 * :' + vars.ircState.realName);
        if (vars.ircState.userMode.length > 0) {
          ircWrite.writeSocket(socket, 'MODE ' + vars.ircState.nickName +
            ' ' + vars.ircState.userMode);
        }
        vars.ircState.ircConnecting = false;
        vars.ircState.ircConnected = true;
        tellBrowserToRequestState();
        // Timer for TLS connect delay
      } else {
        // case of error handler reset ircConnecting before timer expired (TLS error probgably)
        vars.ircState.ircConnecting = false;
        vars.ircState.ircConnected = false;
        vars.ircState.ircRegistered = false;
        vars.ircState.ircIsAway = false;
        tellBrowserToRequestState();
      }
      // reset the state variables
      vars.ircState.channels = [];
      vars.ircState.channelStates = [];
    }, 500);
  }; // _readyEventHandler

  // -------------------------------------------------------------------------
  // Process Buffer object from socket stream
  //
  // Combine previous message fragment with incoming Buffer of UTF-8 characters
  // Split stream into messages using CR-LF 0x10 0x13 as message delimiter
  // Pass each message to message parse function as type Buffer
  // If left over characters not terminated in CR-LF, save as next fragment
  // -------------------------------------------------------------------------
  var previousBufferFragment = Buffer.from('', 'utf8');
  const extractMessagesFromStream = function (socket, inBuffer) {
    if (!inBuffer) return;
    if (!Buffer.isBuffer(inBuffer)) return;
    if (!isValidUTF8(inBuffer)) {
      console.log('extractMessagesFromStream() failed UTF-8 validation');
      return;
    }
    if (inBuffer.includes(0)) {
      console.log('extractMessagesFromStream() failed zero byte validation');
      return;
    }
    // this returns a new Buffer, not a reference to shared memory
    let data = Buffer.concat([previousBufferFragment, inBuffer]);
    previousBufferFragment = Buffer.from('');
    let len = data.length;
    if (len === 0) return;
    let index = 0;
    let count = 0;
    for (let i=0; i<len; i++) {
      // this is a 8 bit integer
      let charCode = data.readUInt8(i);
      if ((charCode !== 10) && (charCode !== 13)) {
        // valid message character
        count = count + 1;
      } else {
        // case of CR or LF as message separator
        if (count > 0) {
          // wrapped in Buffer.from because slice returns a reference
          let message = Buffer.from(data.slice(index, index + count));
          // 512 btye maximum size from RFC 2812 2.3 Messages
          if ((Buffer.isBuffer(message)) && (message.length <= 512)) {
            //
            // This is one CR-LF terminated IRC server message
            //
            ircParse._processIrcMessage(socket, message);
            //
          } else {
            console.log('Error, extracted message exceeds max length of 512 btyes');
          }
        }
        index = i + 1;
        count = 0;
      }
    }
    if (count > 0) {
      // slice wrapped in Buffer.from because slice returns a reference to previous buffer
      previousBufferFragment = Buffer.from(data.slice(index, index + count));
    }
  }; // extractMessagesFromStream

  // -----------------------------------------------------
  //
  //          R O U T E   H A N D L E R S
  //
  //        connectHandler is main function
  //
  // -----------------------------------------------------
  //  Includes all socket event listeners
  // -----------------------------------------------------

  //----------------------------------------
  // Cycle server from available server list
  //
  // Route: /server
  //----------------------------------------
  const serverHandler = function(req, res, next) {
    if ((!('serverArray' in servers)) || (servers.serverArray.length < 1)) {
      return res.json({
        error: true,
        message: 'Server list empty.'
      });
    }
    if (servers.serverArray.length === 1) {
      return res.json({
        error: true,
        message: 'Only 1 server, can not cycle.'
      });
    }
    vars.ircState.ircServerIndex++;
    if (vars.ircState.ircServerIndex >= servers.serverArray.length) {
      vars.ircState.ircServerIndex = 0;
    }
    vars.ircState.ircServerName = servers.serverArray[vars.ircState.ircServerIndex].name;
    vars.ircState.ircServerHost = servers.serverArray[vars.ircState.ircServerIndex].host;
    vars.ircState.ircServerPort = servers.serverArray[vars.ircState.ircServerIndex].port;
    vars.ircState.ircTLSEnabled = servers.serverArray[vars.ircState.ircServerIndex].tls;
    vars.ircServerPassword = servers.serverArray[vars.ircState.ircServerIndex].password;
    vars.nsIdentifyNick = servers.serverArray[vars.ircState.ircServerIndex].identifyNick;
    vars.nsIdentifyCommand = servers.serverArray[vars.ircState.ircServerIndex].identifyCommand;
    vars.ircState.channelList = servers.serverArray[vars.ircState.ircServerIndex].channelList;

    vars.ircState.nickName = servers.serverArray[vars.ircState.ircServerIndex].nick;
    vars.ircState.userName = servers.serverArray[vars.ircState.ircServerIndex].user;
    vars.ircState.realName = servers.serverArray[vars.ircState.ircServerIndex].real;
    vars.ircState.userMode = servers.serverArray[vars.ircState.ircServerIndex].modes;
    vars.ircState.userHost = '';

    ircLog.setRawMessageLogEnabled(servers.serverArray[vars.ircState.ircServerIndex].rawMessageLog);

    tellBrowserToRequestState();

    return res.json({
      error: false,
      message: null,
      index: vars.ircState.ircServerIndex,
      name: vars.ircState.ircServerName
    });
  };

  // placeholder
  var ircSocket = null;
  // -----------------------------------------------------
  // API connect request handler (Called by browser)
  //
  // Route: /connect
  // -----------------------------------------------------
  const connectHandler = function(req, res, next) {
    // console.log('connect handler called');
    // Abort if already connected.
    if ((vars.ircState.ircConnected) || (vars.ircState.ircConnecting)) {
      return res.json({
        error: true,
        message: 'Error: already connected to IRC server.'
      });
    }

    // TODO add size validation, character allowlist
    vars.ircState.nickName = req.body.nickName;
    vars.ircState.userName = req.body.userName;
    vars.ircState.realName = req.body.realName;
    vars.ircState.userMode = req.body.userMode;

    // channels here on connect, browser on disconnect
    vars.ircState.channels = [];
    vars.ircState.channelStates = [];
    vars.ircState.ircConnected = false;
    vars.ircState.ircConnecting = true;
    vars.ircState.ircRegistered = false;
    vars.ircState.ircIsAway = false;

    let connectMessage = 'webServer: Opening socket to ' + vars.ircState.ircServerName + ' ' +
      vars.ircState.ircServerHost + ':' + vars.ircState.ircServerPort;
    if (vars.ircState.ircTLSEnabled) {
      connectMessage += ' (TLS)';
    }
    global.sendToBrowser('UPDATE\n' + connectMessage + '\n');

    if (vars.ircState.ircTLSEnabled) {
      ircSocket = new tls.TLSSocket();
    } else {
      ircSocket = new net.Socket();
    }

    // ----------------------------------------------------------------
    // THis function will be replaced at the time of connect request
    // so that any connect errors can be returned to web browser via
    // the response object.
    // This will deep the node response object within scope of the
    // customErrorResponse function.
    // I will be restored to his generic version after connect.
    // ----------------------------------------------------------------
    const genericErrorResponse = function(err) {
      // dummy function to be replaced
      global.sendToBrowser('webServer: IRC Server socket error occurred.\n');
      if (!ircSocket.writable) {
        vars.ircState.ircConnecting = false;
        vars.ircState.ircConnected = false;
        vars.ircState.ircRegistered = false;
        vars.ircState.ircIsAway = false;
        global.sendToBrowser('UPDATE\nwebServer: Socket not writable, connected flags reset\n');
      }
    };

    // ---------------------------------------------------
    // This error function is only used during connecting
    // ---------------------------------------------------
    const connectingErrorResponse = function(err) {
      // Response to POST request
      vars.ircState.ircConnecting = false;
      vars.ircState.ircConnected = false;
      vars.ircState.ircRegistered = false;
      vars.ircState.ircIsAway = false;
      // Send some over over websocket too
      let errMsg = 'UPDATE\nwebServer: Error opening TCP socket to ' +
        vars.ircState.ircServerName + ' ' +
        vars.ircState.ircServerHost + ':' + vars.ircState.ircServerPort;
      if (err) {
        errMsg += 'webServer: ' + err.toString();
      }
      global.sendToBrowser(errMsg + '\n');
      res.json({
        error: true,
        message: 'Error occurred attempting to open IRC server TCP socket'
      });
    };

    // ---------------------------------------
    // variable to hold transient error handler
    // ---------------------------------------
    var customErrorResponse = connectingErrorResponse;

    // --------------------------
    //   On Error   (IRC client socket)
    // --------------------------
    ircSocket.on('error', function(err) {
      console.log('IRC Server socket error occurred.');
      console.log(err);

      // This does not return if res.json(...)
      customErrorResponse(err);
    });

    // --------------------------------------------------
    //   On Connect   (IRC client socket connected)
    // --------------------------------------------------
    ircSocket.on('connect', function() {
      // console.log('Event: connect');
      global.sendToBrowser('webServer: Connected\n');
      // replace connect error handler
      customErrorResponse = genericErrorResponse;
    });

    // -----------
    //  On Ready
    // -----------
    ircSocket.on('ready', function() {
      // console.log('Event: ready');
      _readyEventHandler(ircSocket);
    }); // ircSocket.on('ready'

    // -----------
    // ON Data
    // -----------
    ircSocket.on('data', function(data) {
      extractMessagesFromStream(ircSocket, data);
    });

    // -------------------------------------------
    //   On Close    (IRC client socket closed)
    // -------------------------------------------
    ircSocket.on('close', function(hadError) {
      console.log('Event: close, hadError=' + hadError + ' destroyed=' + ircSocket.destroyed);
      vars.ircState.ircConnecting = false;
      vars.ircState.ircConnected = false;
      vars.ircState.ircRegistered = false;
      vars.ircState.ircIsAway = false;
      global.sendToBrowser('UPDATE\nwebServer: Socket to IRC server closed, hadError: ' +
        hadError.toString() + '\n');
    });

    // ----------------------------------
    // All even listeners are created
    // Go ahead can connect the socket.
    // ----------------------------------
    ircSocket.connect(vars.ircState.ircServerPort, vars.ircState.ircServerHost, function() {
      let now = new Date();
      let timeString = now.toISOString() + ' ';
      // console.log(timeString + 'Connected to IRC server ' + vars.ircState.ircServerName + ' ' +
      //   vars.ircState.ircServerHost + ':'+ vars.ircState.ircServerPort);
      ircLog.writeIrcLog('Connected to IRC server ' + vars.ircState.ircServerName + ' ' +
        vars.ircState.ircServerHost + ':'+ vars.ircState.ircServerPort);
      res.json({error: false});
    });
  }; // connectHandler()

  // ------------------------------------------------------
  // Node/Express (req, res, next) routes
  // ------------------------------------------------------

  // ------------------------------------------------------
  // IRC commands from browser for send to IRC server
  //
  // Route:  /message
  //
  // ------------------------------------------------------
  const messageHandler = function(req, res, next) {
    // console.log(req.body);
    if (!('message' in req.body)) {
      console.log('messageHandler() IRC message not found in POST body');
      let err = new Error('BAD REQUEST');
      err.status = 400;
      err.message = 'IRC message not found in POST body';
      next(err);
    } else if (!(typeof req.body.message === 'string')) {
      console.log('messageHandler() IRC message expect type string');
      let err = new Error('BAD REQUEST');
      err.status = 400;
      err.message = 'IRC message expect type=string';
      next(err);
    } else {
      let messageBuf = Buffer.from(req.body.message, 'utf8');
      if (!isValidUTF8(messageBuf)) {
        console.log('messageHandler() IRC message failed UTF-8 validation');
        res.json({error: true, message: 'IRC message failed UTF-8 validation'});
      } else if (messageBuf.includes(0)) {
        console.log('messageHandler() IRC message zero byte validation');
        res.json({error: true, message: 'IRC message failed zero byte validation'});
      } else if (messageBuf.length >= 512) {
        console.log('messageHandler() IRC message exceeds 512 byte maximum length');
        res.json({error: true, message: 'IRC message exceeds 512 byte maximum length'});
      } else {
        if (messageBuf.length === 0) {
          console.log('messageHandler() Ignoring Empty message');
          res.json({error: true, message: 'Ignoring Empty message'});
        } else {
          // And parse for commands that change state or
          // that require dummy server messages for cached display.
          let message = messageBuf.toString('utf8');
          let parseResult = ircCommand.parseBrowserMessageForCommand(message);
          if (parseResult.error) {
            console.log(parseResult.message);
            res.json({error: true, message: parseResult.message});
          } else {
            // Send browser message on to web server
            ircWrite.writeSocket(ircSocket, message);
            res.json({error: false});
          }
        }
      }
    }
  }; // messageHandler

  // ------------------------------------
  //  API handler for forced disconnect
  //
  //  Route: /disconnect
  // ------------------------------------
  const disconnectHandler = function(req, res, next) {
    // console.log('disconnect handler called');
    global.sendToBrowser('webServer: Forcibly closing IRC server TCP socket\n');
    if (ircSocket) {
      ircSocket.destroy();
      vars.ircState.ircConnecting = false;
      vars.ircState.ircConnected = false;
      vars.ircState.ircRegistered = false;
      vars.ircState.ircIsAway = false;
      tellBrowserToRequestState();
      res.json({error: false});
    } else {
      res.json({error: true, message: 'Error Can not destry socket before it is created.'});
    }
  };

  // ---------------------------------------------------
  // Get status of Browser to web server connection
  //
  // Route: /getircstate
  // ---------------------------------------------------
  const getIrcState = function(req, res, next) {
    vars.ircState.websocketCount = global.getWebsocketCount();
    res.json(vars.ircState);
  };

  // -----------------------------------------------
  // Request backend to return all of cache to browser
  //
  // Route: /cache
  // -----------------------------------------------
  const getCache = function(req, res, next) {
    let cacheArrayOfBuffers = ircMessageCache.allMessages();
    let outArray = [];
    let err = false;
    if (cacheArrayOfBuffers.length > 0) {
      for (let i=0; i<cacheArrayOfBuffers.length; i++) {
        if ((Buffer.isBuffer(cacheArrayOfBuffers[i])) &&
          (isValidUTF8(cacheArrayOfBuffers[i])) &&
          (!cacheArrayOfBuffers[i].includes(0))) {
          outArray.push(cacheArrayOfBuffers[i].toString('utf8'));
        } else {
          err = true;
        }
      }
    }
    if (err) {
      console.log('getCache() 422 Unprocessable Entity, cache contains malformed data');
      let error = new Error('Unprocessable Entity');
      error.status = 422;
      error.message = 'Cache contains malformed data';
      next(error);
    } else {
      res.json(outArray);
    }
  };

  // -----------------------------------------------
  // Request backend erase cache
  //
  // Route: /erase
  // -----------------------------------------------
  const eraseCache = function(req, res, next) {
    // console.log(JSON.stringify(req.body));
    if (('erase' in req.body) && (req.body.erase === 'YES')) {
      ircMessageCache.eraseCache();
      res.json({error: false});
    } else {
      let error = new Error('Bad Reqeust');
      error.status = 400;
      next(error);
    }
  };

  const test1Handler = function(req, res, next) {
    console.log('test1 handler called');
    // -------- test code here -----------------
    // -----------------------------------------
    res.json({
      error: false,
      comment: 'Debug message cache',
      data: ircMessageCache.cacheInfo()
    });
  };

  const test2Handler = function(req, res, next) {
    console.log('test2 handler called');
    // -------- test code here -----------------
    // -----------------------------------------
    res.json({
      error: false,
      comment: 'node.js memory',
      data: process.memoryUsage()
    });
  };

  // Program run timestamp
  vars.ircState.times.programRun = vars.timestamp();

  module.exports = {
    serverHandler: serverHandler,
    connectHandler: connectHandler,
    messageHandler: messageHandler,
    disconnectHandler: disconnectHandler,
    getIrcState: getIrcState,
    getCache: getCache,
    eraseCache: eraseCache,
    test1Handler: test1Handler,
    test2Handler: test2Handler
  };
}());
