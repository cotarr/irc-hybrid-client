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
//                       M A I N   M O D U L E
//
// -----------------------------------------------------------------------------
(function() {
  'use strict';

  const net = require('net');
  const tls = require('tls');
  const fs = require('fs');
  const isUtf8 = require('is-utf8');

  // log module loaded first to create /logs folder if needed.
  const ircLog = require('./irc-client-log');

  const ircWrite = require('./irc-client-write');
  const ircParse = require('./irc-client-parse');
  const ircCommand = require('./irc-client-command');

  var ircMessageCache = require('./irc-client-cache');
  var vars = require('./irc-client-vars');

  var nodeEnv = process.env.NODE_ENV || 'development';

  const credentials = JSON.parse(fs.readFileSync('./credentials.json', 'utf8'));

  var servers = JSON.parse(fs.readFileSync('./servers.json', 'utf8'));
  if ((!('configVersion' in servers)) || (servers.configVersion !== 1)) {
    webError:('Error, servers.js wrong configVersion');
    process.exit(1);
  }

  // ----------------------------------------------------
  //
  //     Setup IRC Client variables and configuration
  //
  // ----------------------------------------------------

  vars.ircState.ircConnectOn = false;
  vars.ircState.ircConnecting = false;
  vars.ircState.ircConnected = false;
  vars.ircState.ircRegistered = false;
  vars.ircState.ircIsAway = false;

  vars.ircState.ircAutoReconnect = servers.ircAutoReconnect;

  vars.ircState.ircServerName = servers.serverArray[0].name;
  vars.ircState.ircServerHost = servers.serverArray[0].host;
  vars.ircState.ircServerPort = servers.serverArray[0].port;
  vars.ircState.ircTLSEnabled = servers.serverArray[0].tls;
  vars.ircServerPassword = servers.serverArray[0].password;
  vars.nsIdentifyNick = servers.serverArray[0].identifyNick;
  vars.nsIdentifyCommand = servers.serverArray[0].identifyCommand;
  // index into servers.json file
  vars.ircState.ircServerIndex = 0;
  vars.ircState.ircServerPrefix = '';
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
  vars.ircState.progVersion = require('../../package.json').version;
  vars.ircState.progName = require('../../package.json').name;

  vars.ircState.times = {programRun: 0, ircConnect: 0};
  vars.ircState.count = {
    ircConnect: 0,
    ircConnectError: 0
  };
  vars.ircState.websocketCount = 0;


  ircLog.setRawMessageLogEnabled(servers.rawMessageLog);

  console.log('Starting web server: ' + vars.ircState.progName +
    ' version-' + vars.ircState.progVersion);
  console.log('Point web browser to <your-http-domain-name> + \"/irc/webclient.html\"');

  // report log file status
  if (nodeEnv === 'production') {
    if (servers.rawMessageLog) {
      ircLog.writeIrcLog('-----------------------------------------');
      ircLog.writeIrcLog('Starting ' + vars.ircState.progName + ' ' + vars.ircState.progVersion);
      console.log('IRC raw message log enabled: ' + ircLog.ircLogFilename);
      console.log('Caution: IRC raw message log not pruned for size, monitor your file size.');
    } else {
      console.log('IRC raw message log disabled.');
    }
  } else {
    console.log('IRC raw message log enabled: (console)');
  }

  const tellBrowserToRequestState = function() {
    global.sendToBrowser('UPDATE\r\n');
  };

  // -----------------------------------------------------
  // Called for IRC server socket error, or close socket
  // to capture items like current channels used to
  // auto-reconnect.
  //
  // NOTE: does not support channel passwords
  // -----------------------------------------------------
  const onDisconnectGrabState = function() {
    vars.ircServerReconnectChannelString = '';
    vars.ircServerReconnectAwayString = '';
    let channelCount = 0;
    if (vars.ircState.channels.length > 0) {
      for (let i=0; i<vars.ircState.channels.length; i++) {
        if (vars.ircState.channelStates[i].joined) {
          if (i < 5) {
            if (i > 0) vars.ircServerReconnectChannelString += ',';
            vars.ircServerReconnectChannelString += vars.ircState.channels[i];
          }
        }
      } // next i
    }
  }; // onDisconnectGrabState()

  // -------------------------------------------
  //  On Ready Event Handler (Internal function)
  //
  //      R e g i s t e r   w i t h   I R C
  //
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
        vars.ircState.ircConnecting = false;
        vars.ircState.ircConnected = true;
        tellBrowserToRequestState();
        // Timer for TLS connect delay
      } else {
        // case of error handler reset ircConnecting before timer expired (TLS error probgably)
        vars.ircState.ircServerPrefix = '';
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
    if (!Buffer.isBuffer(inBuffer)) {
      console.log('previousBufferFragment() data type not Buffer');
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
          //
          // This is one CR-LF terminated IRC server message
          //
          // 512 btye maximum size from RFC 2812 2.3 Messages
          if (message.length > 512) {
            console.log('Error, extracted message exceeds max length of 512 btyes');
          } else if ((message.length > 3) && (!isUtf8(message))) {
            // is-utf8 library need minimum 4 bytes
            console.log('extractMessagesFromStream() failed UTF-8 validation');
            // message ignored
          } else if (message.includes(0)) {
            console.log('extractMessagesFromStream() failed zero byte validation');
            // message ignore
          } else {
            // else message processed
            ircParse._processIrcMessage(socket, message);
          }
        }
        index = i + 1;
        count = 0;
      }
    } // next i
    if (count > 0) {
      // slice wrapped in Buffer.from because slice returns a reference to previous buffer
      previousBufferFragment = Buffer.from(data.slice(index, index + count));
    }
  }; // extractMessagesFromStream

  // -------------------------------------------------------
  //
  //       I R C    S e r v e r   C o n n e c t i o n
  //
  // Called by connect route handler, called by reconnect timer
  //
  // This function will create the TCP socket,
  //   setup socket event handlers, and connect the socket.
  // -------------------------------------------------------
  //
  // Placeholder variable to hold socket
  var ircSocket = null;
  //
  // creates socket to IRC server
  const connectIRC = function () {
    //
    // Connecting watchdog timer
    //
    // Note: Timer does not detect failure to register with IRC server
    //       Timer is cleared where possible in case multiple manual connects in a row.
    //
    let watchdogTimer = setTimeout(function() {
      if (vars.ircState.ircConnecting) {
        // console.log('Connecting watchdog detect timeout error');
        if (ircSocket) {
          ircSocket.destroy();
        }
        // signal browser to show an error
        vars.ircState.count.ircConnectError++;

        vars.ircState.ircServerPrefix = '';
        vars.ircState.ircConnecting = false;
        vars.ircState.ircConnected = false;
        vars.ircState.ircRegistered = false;
        vars.ircState.ircIsAway = false;
        global.sendToBrowser('UPDATE\nwebError: IRC server timeout while connecting\n');
      }
    }.bind(this), vars.ircSocketConnectingTimeout * 1000);

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

    // --------------------------------------------------
    //   On Connect   (IRC client socket connected)
    // --------------------------------------------------
    ircSocket.on('connect', function() {
      // console.log('Event: connect');
      // clear watchdog timer
      if (watchdogTimer) clearTimeout(watchdogTimer);
      global.sendToBrowser('webServer: Connected\n');
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
      vars.activityWatchdogTimerSeconds = 0;
      extractMessagesFromStream(ircSocket, data);
    });

    // -------------------------------------------
    //   On Close    (IRC client socket closed)
    // -------------------------------------------
    ircSocket.on('close', function(hadError) {
      // console.log('Event: socket.close, hadError=' + hadError +
      //   ' destroyed=' + ircSocket.destroyed);
      if (((vars.ircState.ircConnectOn) && (vars.ircState.ircConnected)) ||
        (vars.ircState.ircConnecting)) {
        // signal browser to show an error
        vars.ircState.count.ircConnectError++;
      }
      vars.ircState.ircServerPrefix = '';
      vars.ircState.ircConnecting = false;
      vars.ircState.ircConnected = false;
      vars.ircState.ircRegistered = false;
      vars.ircState.ircIsAway = false;
      // is auto enabled?
      if (vars.ircState.ircAutoReconnect) {
        // and client requested a connection, and has achieved at least 1 previously
        if ((vars.ircState.ircConnectOn) && (vars.ircState.count.ircConnect > 0)) {
          if (vars.ircServerReconnectTimerSeconds === 0) vars.ircServerReconnectTimerSeconds = 1;
          onDisconnectGrabState();
        }
      }
      // clear watchdog timer
      if (watchdogTimer) clearTimeout(watchdogTimer);
      if (hadError) {
        global.sendToBrowser('UPDATE\nwebError: Socket to IRC server closed, hadError: ' +
          hadError.toString() + '\n');
      } else {
        global.sendToBrowser('UPDATE\nwebServer: Socket to IRC server closed, hadError: ' +
          hadError.toString() + '\n');
      }
    });

    // --------------------------
    //   On Error   (IRC client socket)
    // --------------------------
    ircSocket.on('error', function(err) {
      // console.log('Event: socket.error ' + err.toString());
      // console.log(err);
      if ((vars.ircState.ircConnected) || (vars.ircState.ircConnecting)) {
        // signal browser to show an error
        vars.ircState.count.ircConnectError++;
      }
      vars.ircState.ircServerPrefix = '';
      vars.ircState.ircConnecting = false;
      vars.ircState.ircConnected = false;
      vars.ircState.ircRegistered = false;
      vars.ircState.ircIsAway = false;
      // is auto enabled?
      if (vars.ircState.ircAutoReconnect) {
        // and client requested a connection, and has achieved at least 1 previously
        if ((vars.ircState.ircConnectOn) && (vars.ircState.count.ircConnect > 0)) {
          onDisconnectGrabState();
          if (vars.ircServerReconnectTimerSeconds === 0) vars.ircServerReconnectTimerSeconds = 1;
        }
      }
      // clear watchdog timer
      if (watchdogTimer) clearTimeout(watchdogTimer);
      global.sendToBrowser('UPDATE\nwebError: IRC server socket error, connected flags reset\n');
    });

    // ----------------------------------
    // All even listeners are created
    // Go ahead can connect the socket.
    // ----------------------------------
    ircSocket.connect(vars.ircState.ircServerPort, vars.ircState.ircServerHost, function() {
      ircLog.writeIrcLog('Connected to IRC server ' + vars.ircState.ircServerName + ' ' +
        vars.ircState.ircServerHost + ':'+ vars.ircState.ircServerPort);
    });
  }; // connectIRC()

  // --------------------------------------------------------------------------
  // Nickname Registration Watchdog
  //
  // This assumed TCP socket is already connected, that is a different watchdog
  // --------------------------------------------------------------------------
  var registrationWatchdogSeconds = 0;
  const registrationWatchdogTimerTick = function() {
    if ((vars.ircState.ircConnected) && (!vars.ircState.ircRegistered)) {
      registrationWatchdogSeconds++;
    } else {
      registrationWatchdogSeconds = 0;
    }
    if (registrationWatchdogSeconds > vars.ircRegistrationTimeout) {
      // console.log('Connecting nicname registration timeout');
      if (ircSocket) {
        ircSocket.destroy();
      }
      // signal browser to show an error
      vars.ircState.count.ircConnectError++;

      vars.ircState.ircServerPrefix = '';
      vars.ircState.ircConnecting = false;
      vars.ircState.ircConnected = false;
      vars.ircState.ircRegistered = false;
      vars.ircState.ircIsAway = false;
      global.sendToBrowser('UPDATE\nwebError: IRC server Nickname registration timeout\n');
    }
  }; // registrationWatchdogTimerTick()

  // ------------------------------------------------------
  //
  //     I R C   R e c o n n e c t   H a n d l e r
  //
  // In order to restart, a selected IRC server must have
  // previously achieved a successful connection.
  // Successful connections will increment a counter
  // ------------------------------------------------------
  const ircServerReconnectTimerTick = function () {
    // timer not active, abort
    if (vars.ircServerReconnectTimerSeconds === 0) return;

    // Connected already abort
    if ((vars.ircState.ircConnected) && (vars.ircState.ircRegistered)) {
      vars.ircServerReconnectTimerSeconds = 0;
      return;
    }
    // connect not requested, or auto-reconnect not requested
    if ((!vars.ircState.ircConnectOn) || (!vars.ircState.ircAutoReconnect)) {
      vars.ircServerReconnectTimerSeconds = 0;
      return;
    }

    // not previously connected, abort auto
    if (vars.ircState.count.ircConnect === 0) {
      vars.ircServerReconnectTimerSeconds = 0;
      return;
    }

    // Increment the counter (timer in seconds)
    vars.ircServerReconnectTimerSeconds++;

    // console.log('tick ' + vars.ircServerReconnectTimerSeconds + ' ' +
    //   vars.ircState.count.ircConnect + ' ' + vars.ircState.count.ircConnectError);

    // Array of integers representing reconnect times in seconds
    if (vars.ircServerReconnectIntervals.indexOf(vars.ircServerReconnectTimerSeconds) >= 0) {
      // channels here on connect, browser on disconnect
      vars.ircState.ircServerPrefix = '';
      vars.ircState.channels = [];
      vars.ircState.channelStates = [];
      vars.ircState.ircServerPrefix = '';
      vars.ircState.ircConnecting = true;
      vars.ircState.ircConnected = false;
      vars.ircState.ircRegistered = false;
      vars.ircState.ircIsAway = false;

      //
      // This will create the socket and connect it.
      //
      connectIRC();
    }
  }; // ircServerReconnectTimerTick()

  // ---------------------------------------------------------------
  // This is an activity watchdog timer
  // Default activity comes from client PING and server PONG response
  // each time socket receives data the timer is reset to zero
  // If it reaches the limit, the connection is considered timed out.
  // ---------------------------------------------------------------
  const activityWatchdogTimerTick = function () {
    if ((vars.ircState.ircConnected) && (vars.ircState.ircRegistered)) {
      vars.activityWatchdogTimerSeconds++;
    } else {
      vars.activityWatchdogTimerSeconds = 0;
    }
    if ((vars.ircState.ircConnected) && (vars.ircState.ircRegistered) &&
      (vars.activityWatchdogTimerSeconds >= vars.activityWatchdogTimerLimit)) {
      if (ircSocket) {
        ircSocket.destroy();
      }
      // signal browser to show an error
      vars.ircState.count.ircConnectError++;

      vars.ircState.ircServerPrefix = '';
      vars.ircState.ircConnecting = false;
      vars.ircState.ircConnected = false;
      vars.ircState.ircRegistered = false;
      vars.ircState.ircIsAway = false;
      global.sendToBrowser('UPDATE\nwebError: IRC server activity watchdog expired\n');
    }
  }; // activityWatchdogTimerTick()

  // ----------------------------------
  // Client sends PING to server
  // ----------------------------------
  const clientToServerPingTimerTick = function () {
    if ((vars.ircState.ircConnected) && (vars.ircState.ircRegistered)) {
      vars.clientToServerPingTimerSeconds++;
    } else {
      vars.clientToServerPingTimerSeconds = 0;
    }
    if ((vars.ircState.ircConnected) && (vars.ircState.ircRegistered) &&
      (vars.ircState.ircServerPrefix.length > 0) &&
      (vars.clientToServerPingTimerSeconds >= vars.clientToServerPingInterval)) {
      vars.clientToServerPingTimerSeconds = 0;
      //
      // PING and PONG are special cases.
      // To avoid overflow of the message cache, the PING, PONG are sent to raw socket
      // Unless for debug when PING, PONG removed from excludedCommands array
      // which makes PING and PONG visible to browser and inserted into message cache
      //
      let outBuffer = Buffer.from('PING ' + vars.ircState.ircServerPrefix + '\r\n', 'utf8');
      // console.log(outBuffer.toString());
      // 512 btye maximum size from RFC 2812 2.3 Messages
      if (outBuffer.length <= 512) {
        ircSocket.write(outBuffer, 'utf8');
        global.sendToBrowser(vars.commandMsgPrefix + outBuffer.toString('utf8'));
      }
    }
  }; // clientToServerPingTimerTick()


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
  // Method: POST
  // Route:  /irc/server
  //
  // Input: Index of server starting from 0
  //        Set to -1 for next in sequence (cycle)
  //
  //  req.body{
  //    "index": -1
  //  }
  //----------------------------------------
  const serverHandler = function(req, res, next) {
    if ((vars.ircState.ircConnected) || (vars.ircState.ircConnecting)) {
      return res.json({
        error: true,
        message: 'Can not change servers while connected or connecting'
      });
    }
    if ((!('serverArray' in servers)) || (servers.serverArray.length < 1)) {
      return res.json({
        error: true,
        message: 'Server list empty.'
      });
    }
    // input type validation
    if ((!('index' in req.body)) ||
      (typeof req.body.index !== 'number') ||
      (!Number.isInteger(req.body.index))) {
      let error = new Error('Bad Reqeust');
      error.status = 400;
      return next(error);
    }
    // input range validaton
    let inputIndex = req.body.index;
    if ((inputIndex < -1) || (inputIndex >= servers.serverArray.length)) {
      return res.json({
        error: true,
        message: 'Requested server index number out of range.'
      });
    }

    // clear these to reinitialize restart logic
    vars.ircState.count.ircConnect = 0;
    vars.ircState.count.ircConnectError = 0;

    // if index === -1, then cycle through servers, else use index value
    if (inputIndex === -1) {
      vars.ircState.ircServerIndex++;
      if (vars.ircState.ircServerIndex >= servers.serverArray.length) {
        vars.ircState.ircServerIndex = 0;
      }
    } else {
      vars.ircState.ircServerIndex = inputIndex;
    }
    //
    // Update IRC parameters
    //
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

    tellBrowserToRequestState();

    return res.json({
      error: false,
      index: vars.ircState.ircServerIndex,
      name: vars.ircState.ircServerName
    });
  }; // serverHandler()

  // -----------------------------------------------------
  // API connect request handler (Called by browser)
  //
  // Method: POST
  // Route:  /irc/connect
  //
  // Input:  nickname, realname, initial user mode
  // Not used:   userName (config file only)
  //
  // req.body {
  //   "nickName": "myNickName",
  //   "userName": "user1",         <-- not used (config file only)
  //   "realName": "John Doe",
  //   "userMode": "+i"
  // }

  // -----------------------------------------------------
  const connectHandler = function(req, res, next) {
    // Abort if already connected.
    if ((vars.ircState.ircConnected) || (vars.ircState.ircConnecting)) {
      return res.json({
        error: true,
        message: 'Error: already connected to IRC server.'
      });
    }

    let inputNickName = '';
    if (('nickName' in req.body) &&
      (typeof req.body.nickName === 'string')) {
      inputNickName = req.body.nickName;
    }
    //
    // Special case, leave userName as default from config file
    //
    let inputRealName = '';
    if (('realName' in req.body) &&
      (typeof req.body.realName === 'string')) {
      inputRealName = req.body.realName;
    }
    let inputUserMode = '';
    if (('userMode' in req.body) &&
      (typeof req.body.userMode === 'string')) {
      inputUserMode = req.body.userMode;
    }

    if ((inputNickName.length === 0) || (inputRealName.length === 0)) {
      return res.json({
        error: true,
        message: 'Error: invalid IRC signon parameters'
      });
    }

    vars.ircState.nickName = inputNickName;
    // userName is special case, leave as in config file
    vars.ircState.realName = inputRealName;
    vars.ircState.userMode = inputUserMode;

    // channels here on connect, browser on disconnect
    vars.ircState.channels = [];
    vars.ircState.channelStates = [];
    vars.ircState.ircServerPrefix = '';
    vars.ircState.ircConnecting = true;
    vars.ircState.ircConnected = false;
    vars.ircState.ircRegistered = false;
    vars.ircState.ircIsAway = false;

    // Set flag, used in automatic restart
    vars.ircState.ircConnectOn = true;
    vars.ircServerReconnectTimerSeconds = 0;
    vars.ircServerReconnectChannelString = '';
    vars.ircServerReconnectAwayString = '';
    //
    // This will create the socket and connect it.
    //
    connectIRC(null);
    //
    // This response indicates a connect request has been made
    // asynchronous errors occur later and will not show here
    //
    res.json({
      error: false
    });
  }; // connectHandler();

  // ------------------------------------
  //  API handler for forced disconnect
  //
  // Method: POST
  // Route:  /irc/disconnect
  //
  // Input: none (body not used)
  //
  //  req.body{}
  //
  // ------------------------------------
  const disconnectHandler = function(req, res, next) {
    // console.log('disconnect handler called');
    // cancel reconnect timer
    vars.ircState.ircConnectOn = false;
    vars.ircServerReconnectTimerSeconds = 0;
    vars.ircServerReconnectChannelString = '';
    vars.ircServerReconnectAwayString = '';
    global.sendToBrowser('webServer: Forcibly closing IRC server TCP socket\n');
    if (ircSocket) {
      ircSocket.destroy();
      vars.ircState.ircServerPrefix = '';
      vars.ircState.ircConnecting = false;
      vars.ircState.ircConnected = false;
      vars.ircState.ircRegistered = false;
      vars.ircState.ircIsAway = false;
      tellBrowserToRequestState();
      res.json({error: false});
    } else {
      res.json({error: true, message: 'Error Can not destry socket before it is created.'});
    }
  }; //disconnectHandler()

  // ------------------------------------------------------
  // IRC commands from browser for send to IRC server
  //
  // Method: POST
  // Route:  /irc/message
  //
  // Input: IRC server message for forward to IRC server
  //
  //  req.body{
  //    "message": "JOIN #test"
  //  }
  //
  // ------------------------------------------------------
  const messageHandler = function(req, res, next) {
    // console.log(req.body);
    if (!vars.ircState.ircConnected) {
      webError:('messageHandler() IRC server not connected');
      res.json({error: true, message: 'Can not send server message when IRC server not connected'});
    } else if (!('message' in req.body)) {
      webError:('messageHandler() IRC message not found in POST body');
      let err = new Error('BAD REQUEST');
      err.status = 400;
      err.message = 'IRC message not found in POST body';
      next(err);
    } else if (!(typeof req.body.message === 'string')) {
      webError:('messageHandler() IRC message expect type string');
      let err = new Error('BAD REQUEST');
      err.status = 400;
      err.message = 'IRC message expect type=string';
      next(err);
    } else {
      let messageBuf = Buffer.from(req.body.message, 'utf8');
      if ((messageBuf.length > 3) && (!isUtf8(messageBuf))) {
        webError:('messageHandler() IRC message failed UTF-8 validation');
        res.json({error: true, message: 'IRC message failed UTF-8 validation'});
      } else if (messageBuf.includes(0)) {
        webError:('messageHandler() IRC message zero byte validation');
        res.json({error: true, message: 'IRC message failed zero byte validation'});
      } else if (messageBuf.length >= 512) {
        webError:('messageHandler() IRC message exceeds 512 byte maximum length');
        res.json({error: true, message: 'IRC message exceeds 512 byte maximum length'});
      } else {
        if (messageBuf.length === 0) {
          webError:('messageHandler() Ignoring Empty message');
          res.json({error: true, message: 'Ignoring Empty message'});
        } else {
          // And parse for commands that change state or
          // that require dummy server messages for cached display.
          let message = messageBuf.toString('utf8');
          let parseResult = ircCommand.parseBrowserMessageForCommand(message);
          if (parseResult.error) {
            webError:(parseResult.message);
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

  // ---------------------------------------------------
  // Get status of Browser to web server connection
  //
  // Method: GET
  // Route:  /irc/getircstate
  //
  // ---------------------------------------------------
  const getIrcState = function(req, res, next) {
    vars.ircState.websocketCount = global.getWebsocketCount();
    res.json(vars.ircState);
  };

  // -----------------------------------------------
  // Request backend to return all of cache to browser
  //
  // Method: GET
  // Route:  /ircCommand/cache
  // -----------------------------------------------
  const getCache = function(req, res, next) {
    let cacheArrayOfBuffers = ircMessageCache.allMessages();
    let outArray = [];
    let err = false;
    // minimum length of 3 is for is-utf8 check
    if (cacheArrayOfBuffers.length > 0) {
      for (let i=0; i<cacheArrayOfBuffers.length; i++) {
        if ((Buffer.isBuffer(cacheArrayOfBuffers[i])) &&
          (cacheArrayOfBuffers[i].length > 3) &&
          (isUtf8(cacheArrayOfBuffers[i])) &&
          (!cacheArrayOfBuffers[i].includes(0))) {
          outArray.push(cacheArrayOfBuffers[i].toString('utf8'));
        } else {
          err = true;
        }
      }
    }
    if (err) {
      webError:('getCache() 422 Unprocessable Entity, cache contains malformed data');
      let error = new Error('Unprocessable Entity');
      error.status = 422;
      error.message = 'Cache contains malformed data';
      next(error);
    } else {
      res.json(outArray);
    }
  };

  // -----------------------------------------------
  // Prune a channel from channel array
  //
  // Method: POST
  // Route:  /irc/prune
  //
  // Input: channel name as string
  //
  //  req.body{
  //    channel: '#test'
  //  }
  //
  // -----------------------------------------------
  const pruneChannel = function(req, res, next) {
    let inputChannel = '';
    if (('channel' in req.body) && (typeof req.body.channel === 'string')) {
      inputChannel = req.body.channel;
    }
    if (inputChannel.length > 0) {
      let index = vars.ircState.channels.indexOf(inputChannel.toLowerCase());
      if (index >= 0) {
        if (!vars.ircState.channelStates[index].joined) {
          // prune the channel from arrays
          vars.ircState.channels.splice(index, 1);
          vars.ircState.channelStates.splice(index, 1);
          tellBrowserToRequestState();
          res.json({
            error: false
          });
        } else {
          res.json({
            error: true,
            message: 'Prune requires you leave channel'
          });
        }
      } else {
        res.json({
          error: true,
          message: 'Channel not found'
        });
      }
    } else {
      let error = new Error('Bad Reqeust');
      error.status = 400;
      next(error);
    }
  };

  // -----------------------------------------------
  // Request backend erase cache
  //
  // Method: POST
  // Route:  /irc/erase
  //
  // Input: confirmation of command
  //
  //  req.body{
  //    "erase": "YES"
  //  }
  //
  // -----------------------------------------------
  const eraseCache = function(req, res, next) {
    // webError:(JSON.stringify(req.body));
    let inputVerifyString = '';
    if (('erase' in req.body) && (typeof req.body.erase === 'string')) {
      inputVerifyString = req.body.erase;
    }
    if (inputVerifyString === 'YES') {
      ircMessageCache.eraseCache();
      res.json({error: false});
    } else {
      let error = new Error('Bad Reqeust');
      error.status = 400;
      next(error);
    }
  };

  // --------------------------------------------------------------
  // Test route for Debug use
  //
  // Method: GET
  // Route:  /irc/test1
  //
  // You can place a function here called by /irc/test1 route.
  //
  // --------------------------------------------------------------
  const test1Handler = function(req, res, next) {
    webError:('test1 handler called');
    // -------- test code here -----------------
    //
    // Check allocated memory, garbage collect, check memory again.
    if (global.gc) {
      let before = process.memoryUsage();
      global.gc();
      webError:('Debug: Forcing nodejs garbage collection');
      setTimeout(function() {
        let after = process.memoryUsage();
        res.json({
          error: false,
          comment: 'Debug: Forcing nodejs garbage collection',
          data: {
            before: before,
            after: after
          }
        });
      }.bind(this), 1000);
    } else {
      webError:('To debug garbage collection run: node --expose-gc bin/www');
      res.json({
        error: true,
        message: 'To debug garbage collection run: node --expose-gc bin/www'
      });
    }
    // -----------------------------------------
    // // Report Cache info to browser console log
    // res.json({
    //   error: false,
    //   comment: 'Debug message cache',
    //   data: ircMessageCache.cacheInfo()
    // });
    // -----------------------------------------
  };

  // --------------------------------------------------------------
  // Test route for Debug use
  //
  // Method: GET
  // Route:  /irc/test2
  //
  // You can place a function here called by /irc/test2 route.
  //
  // --------------------------------------------------------------

  const test2Handler = function(req, res, next) {
    webError:('test2 handler called');
    // -------- test code here -----------------
    // emulate ping timeout of IRC server (for test auto reconnect)
    vars.activityWatchdogTimerSeconds = 1000;
    res.json({
      error: false,
      message: 'Emulating IRC server ping timeout'
    });
    // -----------------------------------------
  };

  //
  // 1 second timer
  //
  setInterval(function() {
    ircServerReconnectTimerTick();
    registrationWatchdogTimerTick();
    activityWatchdogTimerTick();
    clientToServerPingTimerTick();
  }.bind(this), 1000);

  // Program run timestamp
  vars.ircState.times.programRun = vars.unixTimestamp();

  module.exports = {
    serverHandler: serverHandler,
    connectHandler: connectHandler,
    messageHandler: messageHandler,
    disconnectHandler: disconnectHandler,
    getIrcState: getIrcState,
    getCache: getCache,
    pruneChannel: pruneChannel,
    eraseCache: eraseCache,
    test1Handler: test1Handler,
    test2Handler: test2Handler
  };
}());
