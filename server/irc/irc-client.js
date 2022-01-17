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
(function () {
  'use strict';

  const net = require('net');
  const tls = require('tls');
  const fs = require('fs');
  const isValidUTF8 = require('utf-8-validate');
  const socks5 = require('socks5-client');

  // log module loaded first to create /logs folder if needed.
  const ircLog = require('./irc-client-log');

  const ircWrite = require('./irc-client-write');
  const ircParse = require('./irc-client-parse');
  const ircCommand = require('./irc-client-command');
  const ircMessageCache = require('./irc-client-cache');
  const vars = require('./irc-client-vars');

  const nodeEnv = process.env.NODE_ENV || 'development';

  const servers = JSON.parse(fs.readFileSync('./servers.json', 'utf8'));
  if ((!('configVersion' in servers)) || (servers.configVersion !== 1)) {
    console.error('Error, servers.js wrong configVersion');
    process.exit(1);
  }
  if ((!('serverArray' in servers)) || (servers.serverArray.length < 1)) {
    console.error('Error, no server configuration in servers.json');
    process.exit(1);
  }
  // TLS Verify property added 2021-07-17, message to update config file.
  if (!('verify' in servers.serverArray[0])) {
    console.error('File: servers.json: missing boolean "verify" property for TLS hostname check.');
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
  vars.ircState.ircTLSVerify = servers.serverArray[0].verify;
  vars.ircServerPassword = servers.serverArray[0].password;
  vars.nsIdentifyNick = servers.serverArray[0].identifyNick;
  vars.nsIdentifyCommand = servers.serverArray[0].identifyCommand;
  // index into servers.json file
  vars.ircState.ircServerIndex = 0;
  vars.ircState.ircServerPrefix = '';
  // pass on IRC socket TLS info
  vars.ircState.ircSockInfo = {};
  // List of favorite channels
  vars.ircState.channelList = servers.serverArray[0].channelList;

  vars.ircState.nickName = servers.serverArray[0].nick;
  vars.ircState.userName = servers.serverArray[0].user;
  vars.ircState.realName = servers.serverArray[0].real;
  vars.ircState.userMode = servers.serverArray[0].modes;
  vars.ircState.userHost = '';

  if ('ctcpTimeLocale' in servers) {
    vars.ctcpTimeLocale = servers.ctcpTimeLocale;
  }

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

  // --------------------------------------------------
  // Optional - Connect to IRC using socks5 client
  //
  // To be backward compatible with older credentials.json files
  // socks5 client will be disabled without error message in the
  // case that socks5 configuration properties are omitted.
  //
  // credentials.json socks5 properties
  //
  // Option 1: socks5 client disabled (automatically disabled if property omitted)
  // {
  //   enableSocks5Proxy: false
  // }
  //
  // Option 2: socks5 client unauthenticated
  //
  // {
  //   enableSocks5Proxy: true,
  //   socks5Host: '192.168.0.1',
  //   socks5Port: '1080'
  // }
  //
  // Option 3: socks5 client requires password authentication
  // {
  //   enableSocks5Proxy: true,
  //   socks5Host: '192.168.0.1',
  //   socks5Port: '1080',
  //   socksUsername: 'user1',
  //   socksPassword: 'xxxxxxxx'
  // }
  //
  const credentials = JSON.parse(fs.readFileSync('./credentials.json', 'utf8'));
  vars.ircState.enableSocks5Proxy = credentials.enableSocks5Proxy || false;
  if (vars.ircState.enableSocks5Proxy) {
    vars.ircState.socks5Host = credentials.socks5Host || '';
    vars.ircState.socks5Port = parseInt(credentials.socks5Port || '1080');
    if ((credentials.socks5Username) && (credentials.socks5Username.length > 0) &&
      (credentials.socks5Password) && (credentials.socks5Password.length > 0)) {
      vars.socks5Username = credentials.socks5Username || '';
      vars.socks5Password = credentials.socks5Password || '';
    };
  };

  // get name and version number from npm package.json
  vars.ircState.progVersion = require('../../package.json').version;
  vars.ircState.progName = require('../../package.json').name;

  vars.ircState.times = { programRun: 0, ircConnect: 0 };
  vars.ircState.count = {
    ircConnect: 0,
    ircConnectError: 0,
    ircStateCalls: 0
  };
  vars.ircState.websocketCount = 0;

  ircLog.setRawMessageLogEnabled(servers.rawMessageLog);

  console.log('Starting web server: ' + vars.ircState.progName +
    ' version-' + vars.ircState.progVersion);
  console.log('Point web browser to <your-http-domain-name> + "/irc/webclient.html"');

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

  const tellBrowserToRequestState = function () {
    global.sendToBrowser('UPDATE\r\n');
  };

  // -----------------------------------------------------
  // Called for IRC server socket error, or close socket
  // to capture items like current channels used to
  // auto-reconnect.
  //
  // NOTE: does not support channel passwords
  // -----------------------------------------------------
  const onDisconnectGrabState = function () {
    vars.ircServerReconnectChannelString = '';
    vars.ircServerReconnectAwayString = '';
    if (vars.ircState.channels.length > 0) {
      for (let i = 0; i < vars.ircState.channels.length; i++) {
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
  const _connectEventHandler = function (socket) {
    global.sendToBrowser('webServer: Ready\n');
    setTimeout(function () {
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
  }; // _connectEventHandler

  // -------------------------------------------------------------------------
  // Process Buffer object from socket stream
  //
  // Combine previous message fragment with incoming Buffer of UTF-8 characters
  // Split stream into messages using CR-LF 0x10 0x13 as message delimiter
  // Pass each message to message parse function as type Buffer
  // If left over characters not terminated in CR-LF, save as next fragment
  // -------------------------------------------------------------------------
  let previousBufferFragment = Buffer.from('', 'utf8');
  const extractMessagesFromStream = function (socket, inBuffer) {
    if (!inBuffer) return;
    if (!Buffer.isBuffer(inBuffer)) {
      console.log('previousBufferFragment() data type not Buffer');
      return;
    }
    // this returns a new Buffer, not a reference to shared memory
    const data = Buffer.concat([previousBufferFragment, inBuffer]);
    previousBufferFragment = Buffer.from('');
    const len = data.length;
    if (len === 0) return;
    let index = 0;
    let count = 0;
    for (let i = 0; i < len; i++) {
      // this is a 8 bit integer
      const charCode = data.readUInt8(i);
      if ((charCode !== 10) && (charCode !== 13)) {
        // valid message character
        count = count + 1;
      } else {
        // case of CR or LF as message separator
        if (count > 0) {
          //
          // Option 1, take buffer direct from IRC stream (no cleaning)
          // (Disabled...)
          // let message = Buffer.from(data.slice(index, index + count));
          //
          // Option 2, attempt to clean characters to avoid UTF-8 validation failure
          //
          // 1) Extract sub-string as Buffer
          // 2) Decode Buffer into UTF-8 string to convert non UTF-8 Characters to
          //    the UTF-8 replacement character 0xEF 0xBF 0xBD (question mark in diamond)
          // 3) Then re-encode back to Buffer (non UTF-8 have been cleaned)
          //
          const message =
            Buffer.from(
              // wrapped in Buffer.from because slice returns a reference
              Buffer.from(data.slice(index, index + count))
                // to remove non UTF-8 characters
                .toString('utf8'),
              // encoded back to a Buffer
              'utf8'
            );

          //
          // This is one CR-LF terminated IRC server message
          //
          // 512 btye maximum size from RFC 2812 2.3 Messages
          if (message.length > 512) {
            console.log('Error, extracted message exceeds max length of 512 btyes');
          } else if (!isValidUTF8(message)) {
            console.log('extractMessagesFromStream() failed UTF-8 validation');
            // message ignored (else if block)
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
  // This is the socket for connection to IRC server (placeholder)
  let ircSocket = null;
  // socks5Socket is used only for TLS over Socks5 (placeholder)
  let socks5Socket = null;

  //
  // Primary function to create socket to IRC server
  //
  // Called by POST /irc/connect route handler and reconnect timers
  //
  const connectIRC = function () {
    let connectMessage = 'Opening socket to ' + vars.ircState.ircServerName + ' ' +
      vars.ircState.ircServerHost + ':' + vars.ircState.ircServerPort;
    if (vars.ircState.ircTLSEnabled) {
      connectMessage += ' (TLS)';
    }
    if (vars.ircState.enableSocks5Proxy) {
      connectMessage += ' (Socks5 Proxy: ' +
        vars.ircState.socks5Host + ':' + vars.ircState.socks5Port + ')';
    }
    global.sendToBrowser('UPDATE\nwebServer: ' + connectMessage + '\n');
    ircLog.writeIrcLog(connectMessage);

    // update later if TLS
    vars.ircState.ircSockInfo.encrypted = false;
    vars.ircState.ircSockInfo.verified = false;
    vars.ircState.ircSockInfo.protocol = '';

    // ---------------------
    //      Old Socket ?
    // ---------------------
    if (ircSocket) {
      try {
        // If old socket exist, destroy to be sure not left connected.
        ircSocket.destroy();
        ircSocket = null;
      } catch (err) {
        // Ingore
      }
    }

    // --------------------------------------------------------------------------------------
    // Event table
    //              socks5Socket  socks5Socket
    //              (TLS wrapper) (TlS wrapper) ircSocket  ircSocket     ircSocket ircSocket
    //                connect        error       connect  secureConnect    close     error
    // TCP                                          X                        X         X
    // TCP+TLS                                                 X             X         X
    // Socks5                                       X                        X         X
    // Socks5+TLS        X             X                       X             X         X
    //
    // Notes: Double 'error' events can be fired for Socks5+TLS due to TLS as wrapper socket
    //        Double 'close' events can be fired for Socks5+TLS due to TLS as wrapper socket
    // --------------------------------------------------------------------------------------

    //
    // Internal function to create IRC socket event listeners
    //
    function _createIrcSocketEventListeners (newIrcSocket) {
      //
      // Connecting watchdog timer
      //
      // Note: Timer does not detect failure to register with IRC server
      //       Timer is cleared where possible in case multiple manual connects in a row.
      //
      const watchdogTimer = setTimeout(function () {
        if (vars.ircState.ircConnecting) {
          // console.log('Connecting watchdog detect timeout error');
          if (newIrcSocket) {
            newIrcSocket.destroy();
          }
          // signal browser to show an error
          vars.ircState.count.ircConnectError++;

          vars.ircState.ircServerPrefix = '';
          vars.ircState.ircConnecting = false;
          vars.ircState.ircConnected = false;
          vars.ircState.ircRegistered = false;
          vars.ircState.ircIsAway = false;
          global.sendToBrowser('UPDATE\nwebError: IRC server timeout while connecting\n');
          ircLog.writeIrcLog('IRC server timeout while connecting');
        }
      }, vars.ircSocketConnectingTimeout * 1000);

      // -------------------------------------------------
      // On secure Connect - This event applies to TLS
      //        encrypted connected, both TCP and Socks5
      // -------------------------------------------------
      newIrcSocket.on('secureConnect', function (e) {
        console.log('Event: secureConnect');
        vars.ircState.ircSockInfo.encrypted = newIrcSocket.encrypted;
        vars.ircState.ircSockInfo.verified = newIrcSocket.authorized;
        vars.ircState.ircSockInfo.protocol = newIrcSocket.getProtocol();
        if (vars.ircState.ircTLSEnabled) {
          // clear watchdog timer
          if (watchdogTimer) clearTimeout(watchdogTimer);
          global.sendToBrowser('webServer: Connected (TLS)\n');
          ircLog.writeIrcLog('Connected to IRC server ' + vars.ircState.ircServerName + ' ' +
            vars.ircState.ircServerHost + ':' + vars.ircState.ircServerPort);
          _connectEventHandler(newIrcSocket);
        }
      });

      // --------------------------------------------------
      //   On Connect   (IRC client socket connected)
      // --------------------------------------------------
      newIrcSocket.on('connect', function () {
        console.log('Event ircSocket: connect');
        if (!vars.ircState.ircTLSEnabled) {
          // clear watchdog timer
          if (watchdogTimer) clearTimeout(watchdogTimer);
          global.sendToBrowser('webServer: Connected\n');
          ircLog.writeIrcLog('Connected to IRC server ' + vars.ircState.ircServerName + ' ' +
            vars.ircState.ircServerHost + ':' + vars.ircState.ircServerPort);
          _connectEventHandler(newIrcSocket);
        }
      });

      // -----------
      // ON Data
      // -----------
      newIrcSocket.on('data', function (data) {
        vars.activityWatchdogTimerSeconds = 0;
        extractMessagesFromStream(newIrcSocket, data);
      });

      // -------------------------------------------
      //   On Close    (IRC client socket closed)
      // -------------------------------------------
      newIrcSocket.on('close', function (hadError) {
        console.log('Event ircSocket: close, hadError=' + hadError);
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
          ircLog.writeIrcLog('Socket to IRC server closed, hadError: ' + hadError.toString());
        } else {
          global.sendToBrowser('UPDATE\nwebServer: Socket to IRC server closed, hadError: ' +
            hadError.toString() + '\n');
          ircLog.writeIrcLog('Socket to IRC server closed, hadError: ' + hadError.toString());
        }
      });

      // --------------------------
      //   On Error   (IRC client socket)
      // --------------------------
      newIrcSocket.on('error', function (err) {
        if (err) {
          console.log('Event ircSocket: error ' + err.toString());
          // console.log(err);
        }
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

        let errorMessage = 'IRC server socket error';
        if ('code' in err) {
          errorMessage += ': ' + err.code;
        } else if ('message' in err) {
          errorMessage += ': ' + err.message;
        }
        global.sendToBrowser('UPDATE\nwebError: ' + errorMessage + '\n');
        ircLog.writeIrcLog(errorMessage);
      });
    } // createIrcSocketEventListeners()

    // ----------------------------------
    //       Create New IRC Socket
    // Once created, call previous function
    // to create event listeners on the new
    // TCP socket.
    //
    // There are 4 different cases
    // ----------------------------------

    if ((!vars.ircState.ircTLSEnabled) && (!vars.ircState.enableSocks5Proxy)) {
      // --------------------------------------------------------------------------
      // Case 1 of 4 - TCP connection to IRC server with NodeJs module
      //               "net" using method net.connect()
      // --------------------------------------------------------------------------
      const options = {
        port: vars.ircState.ircServerPort,
        host: vars.ircState.ircServerHost
      };
      ircSocket = net.connect(options);
      _createIrcSocketEventListeners(ircSocket);
    } else if ((vars.ircState.ircTLSEnabled) && (!vars.ircState.enableSocks5Proxy)) {
      // --------------------------------------------------------------------------
      // Case 2 of 4 - TLS encrypted connection to IRC server with NodeJs
      //               "tls" module calling tls.connect()
      // --------------------------------------------------------------------------
      const options = {
        port: vars.ircState.ircServerPort,
        host: vars.ircState.ircServerHost
      };
      options.rejectUnauthorized = vars.ircState.ircTLSVerify;
      if (vars.ircState.ircTLSVerify) {
        options.servername = vars.ircState.ircServerHost;
      }
      ircSocket = tls.connect(options);
      _createIrcSocketEventListeners(ircSocket);
    } else if ((!vars.ircState.ircTLSEnabled) && (vars.ircState.enableSocks5Proxy)) {
      // --------------------------------------------------------------------------
      // Case 3 of 4 - TCP connection to socks5 proxy using npm module
      //               "socks5-client" calling method socks5.createConnection()
      // --------------------------------------------------------------------------
      //
      const options = {
        port: vars.ircState.ircServerPort,
        host: vars.ircState.ircServerHost,
        socksPort: vars.ircState.socks5Port,
        socksHost: vars.ircState.socks5Host
      };
      if ((vars.socks5Username.length > 0) &&
        (vars.socks5Username.length > 0)) {
        options.socksUsername = vars.socks5Username;
        options.socksPassword = vars.socks5Password;
      }
      ircSocket = socks5.createConnection(options);
      _createIrcSocketEventListeners(ircSocket);
    } else if ((vars.ircState.ircTLSEnabled) && (vars.ircState.enableSocks5Proxy)) {
      // --------------------------------------------------------------------------
      // Case 4 of 4 - TCP connection to socks5 proxy using npm module
      //               "socks5-client" calling method socks5.createConnection()
      //               Then, pass newly created socks5 socket to NodeJs
      //               'tls' module and passing the new socket into
      //               tls.connect() to return a TLS encrypted socks5 socket.
      //
      //               i.e. this is socket within a socket
      // --------------------------------------------------------------------------

      const socks5Options = {
        port: vars.ircState.ircServerPort,
        host: vars.ircState.ircServerHost,
        socksPort: vars.ircState.socks5Port,
        socksHost: vars.ircState.socks5Host
      };
      if ((vars.socks5Username.length > 0) &&
        (vars.socks5Username.length > 0)) {
        socks5Options.socksUsername = vars.socks5Username;
        socks5Options.socksPassword = vars.socks5Password;
      }

      const tlsOptions = {
        socket: null,
        servername: 'door4.cotarr.net',
        rejectUnauthorized: vars.ircState.ircTLSVerify,
        minVersion: 'TLSv1.2'
      };
      if (tlsOptions.rejectUnauthorized) {
        tlsOptions.servername = vars.ircState.ircServerHost;
      }

      // Old Socket? Then destroy it
      if (ircSocket) {
        try {
          // If old socket exist, destroy to be sure not left connected.
          ircSocket.destroy();
          ircSocket = null;
        } catch (err) {
          // Ignore
        }
      }

      // This creates a new non-encrypted socket, then connects the socket to Socks5 proxy
      // The newly connected socket will be passed to the TLS module as an options property
      socks5Socket = socks5.createConnection(socks5Options);
      // Add event listener for socks5 proxy connect event
      // When event fires, the socket is open and can be passed into TLS module
      socks5Socket.on('connect', () => {
        console.log('Event socks5Socket: connect');
        // Pass the open socket into the TLS module as an options property
        tlsOptions.socket = socks5Socket;
        // tls.connect() performs TLS handshake, then returns an encrypted
        //     socket as a TLS wrapper socket
        ircSocket = tls.connect(tlsOptions);
        // Add event listeners to new TLS socket
        _createIrcSocketEventListeners(ircSocket);
      });

      // debugging...
      socks5Socket.on('close', () => {
        console.log('Event socks5Socket: close');
      });

      // Note: this error applies to non-encrypted socks5 sockets.
      // However, should the TLS socket error occur, this event will also fire.
      // In the case of a socks5 socket error before TLS is connected, only 1 error will fire.
      socks5Socket.on('error', (err) => {
        if (err) {
          console.log('Event socks5Socket: error ' + err.toString());
          // console.log(err);
        }
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

        // // clear watchdog timer
        // The watchdog timer is outside of _createIrcSocketEventListeners() function
        // so the watchdog timer not in scope of namespace here --> commented out
        // if (watchdogTimer) clearTimeout(watchdogTimer);

        let errorMessage = 'socks5 proxy socket error';
        if ('code' in err) {
          errorMessage += ': ' + err.code;
        } else if ('message' in err) {
          errorMessage += ': ' + err.message;
        }
        global.sendToBrowser('UPDATE\nwebError: ' + errorMessage + '\n');
        ircLog.writeIrcLog(errorMessage);
      });
    }
  }; // connectIRC()

  // --------------------------------------------------------------------------
  // Nickname Registration Watchdog
  //
  // This assumed TCP socket is already connected, that is a different watchdog
  // --------------------------------------------------------------------------
  let registrationWatchdogSeconds = 0;
  const registrationWatchdogTimerTick = function () {
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
      ircLog.writeIrcLog('IRC server Nickname registration timeout');
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
      ircLog.writeIrcLog('Reconnect handler activated after ' +
        vars.ircServerReconnectTimerSeconds.toString() + ' seconds.');
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
      ircLog.writeIrcLog('IRC server activity watchdog expired');
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
      const outBuffer = Buffer.from('PING ' + vars.ircState.ircServerPrefix + '\r\n', 'utf8');
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

  // ----------------------------------------
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
  // ----------------------------------------
  const serverHandler = function (req, res, next) {
    if ((vars.ircState.ircConnected) ||
      (vars.ircState.ircConnecting) ||
      (vars.ircState.ircConnectOn)) {
      return res.json({
        error: true,
        message: 'Can not change servers while connected or connecting'
      });
    }
    // Check for presence of extraneous keys
    const validKeys = ['index'];
    Object.keys(req.body).forEach(function (key) {
      if (validKeys.indexOf(key) < 0) {
        const err = new Error('BAD REQUEST');
        err.status = 400;
        err.message = 'Extraneous property in server request';
        return next(err);
      }
    });
    // input type validation
    if ((!('index' in req.body)) ||
      (typeof req.body.index !== 'number') ||
      (!Number.isInteger(req.body.index))) {
      const error = new Error('Bad Reqeust');
      error.status = 400;
      error.message = 'index is required property of type integer';
      return next(error);
    }
    // input range validaton
    const inputIndex = req.body.index;
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
    vars.ircState.ircTLSVerify = servers.serverArray[vars.ircState.ircServerIndex].verify;
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

    res.json({
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
  const connectHandler = function (req, res, next) {
    // Abort if already connected.
    if ((vars.ircState.ircConnected) || (vars.ircState.ircConnecting)) {
      return res.json({
        error: true,
        message: 'Error: already connected to IRC server.'
      });
    }
    if ('userName' in req.body) {
      const err = new Error('BAD REQUEST');
      err.status = 400;
      err.message = 'IRC user name (userName) set only in config file.';
      return next(err);
    }
    const validKeys = ['nickName', 'realName', 'userMode'];
    Object.keys(req.body).forEach(function (key) {
      if (validKeys.indexOf(key) < 0) {
        const err = new Error('BAD REQUEST');
        err.status = 400;
        err.message = 'Extraneous property in connect request';
        return next(err);
      }
    });

    let inputNickName = '';
    if ('nickName' in req.body) {
      if ((typeof req.body.nickName === 'string') &&
        (req.body.nickName.length > 0) &&
        (req.body.nickName.length <= vars.nickNameLength)) {
        inputNickName = req.body.nickName;
      } else {
        const err = new Error('BAD REQUEST');
        err.status = 400;
        err.message = 'Invalid nick name in connect request';
        return next(err);
      }
    }
    //
    // Special case, leave userName as default from config file
    //
    // let inputUserName = '';
    // if ('userName' in req.body) {
    //   if ((typeof req.body.userName === 'string') &&
    //     (req.body.userName.length > 0) &&
    //     (req.body.userName.length <= vars.userNameLength)) {
    //     inputUserName = req.body.userName;
    //   } else {
    //     let err = new Error('BAD REQUEST');
    //     err.status = 400;
    //     err.message = 'Invalid user name in connect request';
    //     return next(err);
    //   }
    // }
    let inputRealName = '';
    if ('realName' in req.body) {
      if ((typeof req.body.realName === 'string') &&
        (req.body.realName.length > 0) &&
        (req.body.realName.length <= vars.realNameLength)) {
        inputRealName = req.body.realName;
      } else {
        const err = new Error('BAD REQUEST');
        err.status = 400;
        err.message = 'Invalid real name in connect request';
        return next(err);
      }
    }
    const selectorChars = '+-';
    let inputUserMode = '';
    if ('userMode' in req.body) {
      if ((typeof req.body.userMode === 'string') &&
        (req.body.userMode.length <= 16)) {
        if ((req.body.userMode.length > 0) &&
          (selectorChars.indexOf(req.body.userMode.charAt(0)) < 0)) {
          const err = new Error('BAD REQUEST');
          err.status = 400;
          err.message = 'Invalid user mode syntax';
          return next(err);
        }
        inputUserMode = req.body.userMode;
      } else {
        const err = new Error('BAD REQUEST');
        err.status = 400;
        err.message = 'Invalid initial user mode in connect request';
        return next(err);
      }
    }

    if (inputNickName.length === 0) {
      const err = new Error('BAD REQUEST');
      err.status = 400;
      err.message = 'Error: nickName is a required property in connect request';
      return next(err);
    }
    // if (inputUserName.length === 0) {
    //   let err = new Error('BAD REQUEST');
    //   err.status = 400;
    //   err.message = 'Error: userName is a required property in connect request';
    //   return next(err);
    // }
    if (inputRealName.length === 0) {
      const err = new Error('BAD REQUEST');
      err.status = 400;
      err.message = 'Error: realName is a required property in connect request';
      return next(err);
    }
    vars.ircState.nickName = inputNickName;
    // userName is special case, leave as in config file
    // vars.ircState.userName = inputUserName;
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
  // Note: This is to force socket to hard disconnect
  // In routine operation, use "QUIT" server command
  //
  // Method: POST
  // Route:  /irc/disconnect
  //
  // Input: none (body not used)
  //
  //  req.body{}
  //
  // ------------------------------------
  const disconnectHandler = function (req, res, next) {
    // console.log('disconnect handler called');
    // console.log(JSON.stringify(req.body));
    if (Object.keys(req.body).length > 0) {
      const err = new Error('BAD REQUEST');
      err.status = 400;
      err.message = 'Extraneous property in disconnect request';
      return next(err);
    }
    // cancel reconnect timer
    vars.ircState.ircConnectOn = false;
    vars.ircServerReconnectTimerSeconds = 0;
    vars.ircServerReconnectChannelString = '';
    vars.ircServerReconnectAwayString = '';
    global.sendToBrowser('webServer: Forcibly closing IRC server TCP socket\n');
    ircLog.writeIrcLog('Forcibly closing IRC server TCP socket');
    if (ircSocket) {
      ircSocket.destroy();
      vars.ircState.ircServerPrefix = '';
      vars.ircState.ircConnecting = false;
      vars.ircState.ircConnected = false;
      vars.ircState.ircRegistered = false;
      vars.ircState.ircIsAway = false;
      tellBrowserToRequestState();
      res.json({ error: false });
    } else {
      global.sendToBrowser('webServer: Can not destry socket before it is created\n');
      res.json({ error: true, message: 'Can not destry socket before it is created.' });
    }
  }; // disconnectHandler()

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
  const messageHandler = function (req, res, next) {
    // console.log(req.body);
    if (!vars.ircState.ircConnected) {
      global.sendToBrowser('webError: messageHandler() IRC server not connected\n');
      return res.json({
        error: true,
        message: 'Can not send server message when IRC server not connected'
      });
    }
    // Check for presence of extraneous keys
    const validKeys = ['message'];
    Object.keys(req.body).forEach(function (key) {
      if (validKeys.indexOf(key) < 0) {
        const err = new Error('BAD REQUEST');
        err.status = 400;
        err.message = 'Extraneous property in message request';
        return next(err);
      }
    });
    if (!('message' in req.body)) {
      const err = new Error('BAD REQUEST');
      err.status = 400;
      err.message = 'message is a required property';
      return next(err);
    }
    if (!(typeof req.body.message === 'string')) {
      const err = new Error('BAD REQUEST');
      err.status = 400;
      err.message = 'IRC message expect type=string';
      return next(err);
    }
    // This is to address multi-byte characters, IRC limit is in bytes, not characters
    const uint8BtyeArray = new TextEncoder('utf8').encode(req.body.message);
    if (uint8BtyeArray.length > 512) {
      const err = new Error('BAD REQUEST');
      err.status = 400;
      err.message = 'IRC message exceeds 512 byte maximum length';
      return next(err);
    }
    const messageBuf = Buffer.from(req.body.message, 'utf8');
    if (!isValidUTF8(messageBuf)) {
      return res.json({ error: true, message: 'IRC message failed UTF-8 validation' });
    }
    if (messageBuf.includes(0)) {
      return res.json({ error: true, message: 'IRC message failed zero byte validation' });
    }
    if (messageBuf.length === 0) {
      return res.json({ error: true, message: 'Ignoring Empty message' });
    } else {
      let message = messageBuf.toString('utf8');
      // If present, remove tailing new line character
      if (message.charAt(message.length - 1) === '\n') {
        message = message.slice(0, message.length - 1);
      }
      // If present, remove tailing new return character
      if (message.charAt(message.length - 1) === '\r') {
        message = message.slice(0, message.length - 1);
      }
      // Multiple line strings are not allowed.
      if ((message.indexOf('\n') >= 0) || (message.indexOf('\r') >= 0)) {
        return res.json({ error: true, message: 'Invalid multiple line message' });
      } else {
        const parseResult = ircCommand.parseBrowserMessageForCommand(message);
        if (parseResult.error) {
          return res.json({ error: true, message: parseResult.message });
        } else {
          // Send browser message on to web server
          ircWrite.writeSocket(ircSocket, message);
          res.json({ error: false });
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
  const getIrcState = function (req, res, next) {
    vars.ircState.websocketCount = global.getWebsocketCount();
    vars.ircState.count.ircStateCalls++;
    res.json(vars.ircState);
  };

  // -----------------------------------------------
  // Request backend to return all of cache to browser
  //
  // Method: GET
  // Route:  /irc/cache
  // -----------------------------------------------
  const getCache = function (req, res, next) {
    if (Object.keys(req.body).length > 0) {
      const err = new Error('BAD REQUEST');
      err.status = 400;
      err.message = 'Extraneous property in cache request';
      return next(err);
    }
    const cacheArrayOfBuffers = ircMessageCache.allMessages();
    const outArray = [];
    let err = false;
    if (cacheArrayOfBuffers.length > 0) {
      for (let i = 0; i < cacheArrayOfBuffers.length; i++) {
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
      const error = new Error('Unprocessable Entity');
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
  const pruneChannel = function (req, res, next) {
    let inputChannel = '';
    //
    // Validate request
    //
    if (!vars.ircState.ircConnected) {
      return res.json({
        error: true,
        message: 'IRC server not connected'
      });
    }
    if ('channel' in req.body) {
      if ((typeof req.body.channel === 'string') &&
        (req.body.channel.length > 1) &&
        (vars.channelPrefixChars.indexOf(req.body.channel.charAt(0)) >= 0)) {
        inputChannel = req.body.channel;
      } else {
        const err = new Error('BAD REQUEST');
        err.status = 400;
        err.message = 'Invalid channel name in prune request';
        return next(err);
      }
    } else {
      const err = new Error('BAD REQUEST');
      err.status = 400;
      err.message = 'channel is a required property';
      return next(err);
    }
    // Check for presence of extraneous keys
    const validKeys = ['channel'];
    Object.keys(req.body).forEach(function (key) {
      if (validKeys.indexOf(key) < 0) {
        const err = new Error('BAD REQUEST');
        err.status = 400;
        err.message = 'Extraneous property in prune request';
        return next(err);
      }
    });
    //
    // Remove the channel
    //
    if (inputChannel.length > 0) {
      const index = vars.ircState.channels.indexOf(inputChannel.toLowerCase());
      if (index >= 0) {
        if (!vars.ircState.channelStates[index].joined) {
          // prune the channel from arrays
          vars.ircState.channels.splice(index, 1);
          vars.ircState.channelStates.splice(index, 1);
          tellBrowserToRequestState();
          res.json({
            error: false
          });
          return;
        } else {
          return res.json({
            error: true,
            message: 'Leave channel before prune'
          });
        }
      } else {
        return res.json({
          error: true,
          message: 'Channel not found'
        });
      }
    }
    const err = new Error('INTERNAL SERVER ERROR');
    err.status = 500;
    err.message = 'Error in prune request';
    next(err);
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
  const eraseCache = function (req, res, next) {
    // Abort if connected.
    if ((vars.ircState.ircConnected) || (vars.ircState.ircConnecting)) {
      return res.json({
        error: true,
        message: 'Disconnect from IRC before clearing cache'
      });
    }
    // Check for presence of extraneous keys
    const validKeys = ['erase'];
    Object.keys(req.body).forEach(function (key) {
      if (validKeys.indexOf(key) < 0) {
        const err = new Error('BAD REQUEST');
        err.status = 400;
        err.message = 'Extraneous property in erase request';
        return next(err);
      }
    });
    let inputVerifyString = '';
    if (('erase' in req.body) &&
      (typeof req.body.erase === 'string') &&
      (req.body.erase.length < 16)) {
      inputVerifyString = req.body.erase;
    }
    if (inputVerifyString === 'YES') {
      ircMessageCache.eraseCache();
      res.json({ error: false });
    } else {
      const error = new Error('Bad Reqeust');
      error.status = 400;
      error.message = 'Error parsing confirmation property';
      return next(error);
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
  const test1Handler = function (req, res, next) {
    // -------- test code here -----------------
    //
    // Check allocated memory, garbage collect, check memory again.
    if (global.gc) {
      const before = process.memoryUsage();
      global.gc();
      setTimeout(function () {
        const after = process.memoryUsage();
        res.json({
          error: false,
          comment: 'Debug: Forcing nodejs garbage collection',
          data: {
            before: before,
            after: after
          }
        });
      }, 1000);
    } else {
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

  const test2Handler = function (req, res, next) {
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
  setInterval(function () {
    ircServerReconnectTimerTick();
    registrationWatchdogTimerTick();
    activityWatchdogTimerTick();
    clientToServerPingTimerTick();
  }, 1000);

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
