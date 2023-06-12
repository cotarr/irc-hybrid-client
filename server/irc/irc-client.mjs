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
'use strict';

import net from 'net';
import tls from 'tls';
import fs from 'fs';
import isValidUTF8 from 'utf-8-validate';
import socks5 from 'socks5-client';
import events from 'events';

// log module loaded first to create /logs folder if needed.
import ircLog from './irc-client-log.mjs';

import { writeSocket } from './irc-client-write.mjs';
import { processIrcMessage, recoverNickTimerTick } from './irc-client-parse.mjs';
import ircCap from './irc-client-cap.mjs';
import { parseBrowserMessageForCommand } from './irc-client-command.mjs';
import ircMessageCache from './irc-client-cache.mjs';
import vars from './irc-client-vars.mjs';

// Web server configuration
import config from '../config/index.mjs';

// For use by server list editor
global.externalEvent = new events.EventEmitter();

const nodeEnv = process.env.NODE_ENV || 'development';
const nodeDebugLog = process.env.NODE_DEBUG_LOG || 0;

vars.servers = null;
const loadServerList = function () {
  vars.servers = JSON.parse(fs.readFileSync('./servers.json', 'utf8'));
  if ((!('configVersion' in vars.servers)) || (vars.servers.configVersion !== 2)) {
    if (vars.servers.configVersion === 1) {
      console.log('\nObsolete configuration format in: servers.json');
      console.log(' - See: example-servers.json');
      console.log(' - Edit: servers.json requires version 2 flag: "configVersion": 2,');
      console.log(' - Removed (Ignored): Legacy properties ircAutoReconnect and rawMessageLog.');
      console.log(' - Added: Individual servers properties: disabled, proxy, reconnect, logging');
      console.log(' - Recommend open/save each IRC server definition using IRC server editor.\n');
      process.exit(1);
    } else {
      console.error('Error, servers.json wrong configVersion');
      process.exit(1);
    }
  }
  // Upgrade from servers.json version 1 to 2, missing properties set to default
  if ((vars.servers.configVersion === 2) && (vars.servers.serverArray.length > 0)) {
    for (let i = 0; i < vars.servers.serverArray.length; i++) {
      if (!('group' in vars.servers.serverArray[i])) {
        vars.servers.serverArray[i].group = 0;
      }
      if (!('altNick' in vars.servers.serverArray[i])) {
        vars.servers.serverArray[i].altNick = '';
      }
      if (!('recoverNick' in vars.servers.serverArray[i])) {
        vars.servers.serverArray[i].recoverNick = false;
      }
      if (!('saslUsername' in vars.servers.serverArray[i])) {
        vars.servers.serverArray[i].saslUsername = '';
      }
      if (!('saslPassword' in vars.servers.serverArray[i])) {
        vars.servers.serverArray[i].saslPassword = '';
      }
    }
  }
}; // loadServerList()

// Do on program load
loadServerList();

const _countEnabledServers = function () {
  let count = 0;
  if (vars.servers.serverArray.length > 0) {
    for (let i = 0; i < vars.servers.serverArray.length; i++) {
      if (!vars.servers.serverArray[i].disabled) count++;
    }
  }
  return count;
};
//
// Returns index of first enabled IRC server, or -1 if none
const _findFirstEnabledServer = function () {
  let first = -1;
  if (vars.servers.serverArray.length > 0) {
    for (let i = 0; i < vars.servers.serverArray.length; i++) {
      if (!vars.servers.serverArray[i].disabled) {
        first = i;
        break;
      }
    }
  }
  return first;
};

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
vars.ircState.nickRecoveryActive = false;
vars.ircState.userHost = '';
vars.ircState.connectHost = '';

// Note: ircAutoReconnect moved from global setting to server setting
// vars.ircState.ircAutoReconnect = vars.servers.ircAutoReconnect;

vars.ircState.lastPing = '0.000';

// pass on IRC socket TLS info
vars.ircState.ircSockInfo = {};

// function to remove a server definition from ircState object
const eraseServerDefinition = function () {
  if (!('ircServerIndex' in vars.ircState)) {
    vars.ircState.ircServerIndex = -1;
  }
  vars.ircState.ircServerGroup = 0;
  vars.ircState.ircServerName = null;
  vars.ircState.ircServerHost = null;
  vars.ircState.ircServerPort = null;
  vars.ircState.ircTLSEnabled = null;
  vars.ircState.ircTLSVerify = null;
  vars.ircState.ircProxy = null;
  vars.ircState.ircAutoReconnect = false;
  vars.ircState.ircServerRotation = false;
  ircLog.setRawMessageLogEnabled(false);
  vars.ircServerPassword = null;
  vars.ircSaslUsername = null;
  vars.ircSaslPassword = null;
  vars.nsIdentifyNick = null;
  vars.nsIdentifyCommand = null;
  vars.ircState.nickName = null;
  vars.ircState.userName = null;
  vars.ircState.realName = null;
  vars.ircState.userMode = null;
  // List of favorite channels
  vars.ircState.channelList = [];
  // some dynamic vars
  vars.ircState.userHost = '';
  vars.ircState.connectHost = '';
  vars.ircState.ircServerPrefix = '';
};

// Function to set current IRC server information into IRC state object
// These values will be available in the web browser
//
// The value of vars.ircState.ircServerIndex must be set before calling this function.
//
const loadServerDefinition = function () {
  // index range check
  if ((vars.ircState.ircServerIndex >= 0) &&
    (vars.ircState.ircServerIndex < vars.servers.serverArray.length)) {
    // copy definition
    vars.ircState.ircServerGroup = vars.servers.serverArray[vars.ircState.ircServerIndex].group;
    vars.ircState.ircServerName = vars.servers.serverArray[vars.ircState.ircServerIndex].name;
    vars.ircState.ircServerHost = vars.servers.serverArray[vars.ircState.ircServerIndex].host;
    vars.ircState.ircServerPort = vars.servers.serverArray[vars.ircState.ircServerIndex].port;
    vars.ircState.ircTLSEnabled = vars.servers.serverArray[vars.ircState.ircServerIndex].tls;
    vars.ircState.ircTLSVerify = vars.servers.serverArray[vars.ircState.ircServerIndex].verify;
    vars.ircState.ircProxy = vars.servers.serverArray[vars.ircState.ircServerIndex].proxy;
    vars.ircState.ircAutoReconnect =
      vars.servers.serverArray[vars.ircState.ircServerIndex].reconnect;

    // Capability to perform server rotation is determined by configuration as follows:
    vars.ircState.ircServerRotation = false;
    // group 0 is reserved for stand alone server definitions.
    if (vars.ircState.ircServerGroup > 0) {
      let rotationCount = 0;
      if (vars.servers.serverArray.length > 0) {
        for (let i = 0; i < vars.servers.serverArray.length; i++) {
          if (
            (!vars.servers.serverArray[i].disabled) &&
            (vars.servers.serverArray[i].reconnect) &&
            (vars.servers.serverArray[i].group === vars.ircState.ircServerGroup)) {
            rotationCount++;
          }
        }
        // must have greater than 2 server to perform rotation.
        if (rotationCount > 1) vars.ircState.ircServerRotation = true;
      }
    }
    // Note, not an ircState property, but included here due to common configuration
    ircLog.setRawMessageLogEnabled(
      vars.servers.serverArray[vars.ircState.ircServerIndex].logging);

    vars.ircServerPassword = vars.servers.serverArray[vars.ircState.ircServerIndex].password;
    vars.ircSaslUsername = vars.servers.serverArray[vars.ircState.ircServerIndex].saslUsername;
    vars.ircSaslPassword = vars.servers.serverArray[vars.ircState.ircServerIndex].saslPassword;
    vars.nsIdentifyNick = vars.servers.serverArray[vars.ircState.ircServerIndex].identifyNick;
    vars.nsIdentifyCommand =
      vars.servers.serverArray[vars.ircState.ircServerIndex].identifyCommand;
    vars.ircState.nickName = vars.servers.serverArray[vars.ircState.ircServerIndex].nick;
    vars.ircState.userName = vars.servers.serverArray[vars.ircState.ircServerIndex].user;
    vars.ircState.realName = vars.servers.serverArray[vars.ircState.ircServerIndex].real;
    vars.ircState.userMode = vars.servers.serverArray[vars.ircState.ircServerIndex].modes;
    // List of favorite channels
    vars.ircState.channelList =
      vars.servers.serverArray[vars.ircState.ircServerIndex].channelList;
  } else {
    throw new Error('Index out of range copying server definition');
  }
};

//
// On program load, initialize the ircState object with default server
//
eraseServerDefinition();
vars.ircState.ircServerIndex = -1;
const loadingServerIndex = _findFirstEnabledServer();
if (loadingServerIndex >= 0) {
  vars.ircState.ircServerIndex = loadingServerIndex;
  loadServerDefinition();
}

if ('ctcpTimeLocale' in vars.servers) {
  vars.ctcpTimeLocale = vars.servers.ctcpTimeLocale;
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
// or env variables if credentials.json does not exist
//
// Option 1: socks5 client disabled (automatically disabled if property omitted)
// {
//   enableSocks5Proxy: false
// }
//
// IRC_ENABLE_SOCKS5_PROXY=false
//
// Option 2: socks5 client unauthenticated
//
// {
//   enableSocks5Proxy: true,
//   socks5Host: '192.168.0.1',
//   socks5Port: '1080'
// }
//
// IRC_ENABLE_SOCKS5_PROXY=true
// IRC_SOCKS5_HOST=192.168.0.1
// IRC_SOCKS5_PORT=1080
//
// Option 3: socks5 client requires password authentication
// {
//   enableSocks5Proxy: true,
//   socks5Host: '192.168.0.1',
//   socks5Port: '1080',
//   socks5Username: 'user1',
//   socks5Password: 'xxxxxxxx'
// }
//
// IRC_ENABLE_SOCKS5_PROXY=true
// IRC_SOCKS5_HOST=192.168.0.1
// IRC_SOCKS5_PORT=1080
// IRC_SOCKS5_USERNAME=user1
// IRC_SOCKS5_PASSWORD="xxxxxxxx"
//
vars.ircState.enableSocks5Proxy = config.proxy.enableSocks5Proxy || false;
if (vars.ircState.enableSocks5Proxy) {
  vars.ircState.socks5Host = config.proxy.socks5Host || '';
  vars.ircState.socks5Port = parseInt(config.proxy.socks5Port || '1080');
  if ((config.proxy.socks5Username) && (config.proxy.socks5Username.length > 0) &&
    (config.proxy.socks5Password) && (config.proxy.socks5Password.length > 0)) {
    vars.socks5Username = config.proxy.socks5Username || '';
    vars.socks5Password = config.proxy.socks5Password || '';
  };
};

// get name and version number from npm package.json
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
vars.ircState.progVersion = packageJson.version;
vars.ircState.progName = packageJson.name;

vars.ircState.times = { programRun: 0, ircConnect: 0 };
vars.ircState.count = {
  ircConnect: 0,
  ircConnectError: 0,
  ircStateCalls: 0
};
vars.ircState.websocketCount = 0;

// Used to disable or hide buttons in IRC client page
vars.ircState.disableServerListEditor = false;
if (config.irc.disableServerListEditor) {
  vars.ircState.disableServerListEditor = true;
}

// Designate alternate set of sound file filenames for browser download
vars.ircState.customBeepSounds = false;
if (config.irc.customBeepSounds) {
  vars.ircState.customBeepSounds = true;
}

// ircLog.setRawMessageLogEnabled(vars.servers.rawMessageLog);

console.log('Application: ' + vars.ircState.progName + ' ' + vars.ircState.progVersion);
console.log('IRC web-client URL: <your-http-domain-name> + "/irc/webclient.html"');

// report log file status
if ((nodeEnv === 'development') || (nodeDebugLog)) {
  console.log('IRC raw message log: (console)');
} else {
  ircLog.writeIrcLog('-----------------------------------------');
  ircLog.writeIrcLog('Starting ' + vars.ircState.progName + ' ' + vars.ircState.progVersion);
  if (((ircLog.logRotationInterval) && (ircLog.logRotationInterval.length > 1)) ||
    ((ircLog.logRotationSize) && (ircLog.logRotationSize.length > 1))) {
    let logMessage = 'IRC raw message log: ' + ircLog.ircLogFilename + ' (Rotate:';
    // Rotation by time interval
    if ((ircLog.logRotationInterval) && (ircLog.logRotationInterval.length > 1)) {
      logMessage += ' interval:' + ircLog.logRotationInterval;
    }
    // Rotation by log file size
    if ((ircLog.logRotationSize) && (ircLog.logRotationSize.length > 1)) {
      logMessage += ' size:' + ircLog.logRotationSize;
    }
    logMessage += ')';
    console.log(logMessage);
  } else {
    console.log('IRC raw message log: ' + ircLog.ircLogFilename);
    console.log('Caution: Log rotation disabled. Please monitor log file size.');
  }
  if (ircLog.getRawMessageLogEnabled()) {
    console.log('IRC raw message log enabled for currently selected IRC server (servers.json).');
  } else {
    console.log('IRC raw message log disabled for currently selected IRC server (servers.json)');
  }
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
  if ((vars.ircState.channels.length > 0) &&
  (vars.ircServerReconnectChannelString.length === 0)) {
    vars.ircServerReconnectChannelString = '';
    for (let i = 0; i < vars.ircState.channels.length; i++) {
      if (vars.ircState.channelStates[i].joined) {
        if (i < 5) {
          if (i > 0) vars.ircServerReconnectChannelString += ',';
          vars.ircServerReconnectChannelString += vars.ircState.channels[i];
        }
      }
    } // next i
  }
  // TODO remember away string and set upon reconnect
  vars.ircServerReconnectAwayString = '';
}; // onDisconnectGrabState()

// Primary nickname reset function
//
// 1) Alternate nickname reset to primary nickname
// 2) Services Guest12345 (Guest*) reset to primary nickname.
//
const onDisconnectResetPrimaryNick = function () {
  const configNick = vars.servers.serverArray[vars.ircState.ircServerIndex].nick;
  const alternateNick = vars.servers.serverArray[vars.ircState.ircServerIndex].altNick;
  if ((alternateNick.length > 0) &&
    (vars.ircState.nickName === alternateNick) &&
    (configNick !== alternateNick)) {
    vars.ircState.nickName = configNick;
    ircLog.writeIrcLog(
      'After IRC disconnect alternate nickname was restored to ' + configNick);
    global.sendToBrowser(
      'webError: After IRC disconnect alternate nickname was restored to ' + configNick + '\n');
  } else if ((vars.ircState.nickName !== configNick) &&
    (vars.ircState.nickName !== alternateNick)) {
    if ((vars.ircState.nickName.indexOf('Guest') === 0) &&
      (vars.ircState.nickName.length === 10)) {
      let numberSubStr = '';
      for (let i = 5; i < 10; i++) {
        numberSubStr += vars.ircState.nickName.charAt(i);
      }
      if (!isNaN(numberSubStr)) {
        vars.ircState.nickName = configNick;
        ircLog.writeIrcLog(
          'After IRC disconnect nickname GUEST????? was recovered to ' +
          configNick);
        global.sendToBrowser('webError: ' +
          'After IRC disconnect nickname GUEST????? was recovered to ' +
          configNick + '\n');
      }
    }
  }
};

// De-bounce, see below
let disconnectRotateInhibitFlag = false;

// Rotate server definition after disconnect
//
// Connected server must have reconnect === true
// Connected server must have group number > 0
// At least one other server in the same group must
// exist, not disabled, with reconnect === true
//
// Time intervals and inhibit interval are set in server/irc/irc-client-vars.js
// to prioritize the existing server on the first reconnect(s)
// before automatically rotating server on future disconnects.
//
const onDisconnectRotateNextServer = function () {
  // Internal function to generate list of available servers
  // Accepts group number
  // Returns array of available index numbers
  function _getGroupIndexList (group) {
    const groupIndexList = [];
    if (vars.servers.serverArray.length > 0) {
      for (let i = 0; i < vars.servers.serverArray.length; i++) {
        if (
          (!vars.servers.serverArray[i].disabled) &&
          (vars.servers.serverArray[i].reconnect) &&
          (vars.servers.serverArray[i].group === group)) {
          groupIndexList.push(i);
        }
      }
    }
    return groupIndexList;
  }
  // Internal function to generate next available server index number
  // accepts array of available index numbers and current index number
  // returns integer index number of next available server
  function _nextIndexInGroup (groupList, index) {
    let nextIndex = index;
    if (vars.servers.serverArray.length > 0) {
      for (let i = 0; i < vars.servers.serverArray.length; i++) {
        nextIndex++;
        if (nextIndex >= vars.servers.serverArray.length) nextIndex = 0;
        if (groupList.indexOf(nextIndex) >= 0) break;
      }
    }
    // console.log('Rotate servers ', index, groupList, nextIndex);
    return nextIndex;
  }
  const currentIndex = vars.ircState.ircServerIndex;
  const currentServerObj = vars.servers.serverArray[currentIndex];
  const currentGroupNumber = currentServerObj.group;
  const groupIndexList = _getGroupIndexList(currentGroupNumber);

  // De-bounce, see below
  if (disconnectRotateInhibitFlag) return;

  // The first reconnect(s) before this limit should use the current server without rotation.
  if (vars.ircServerReconnectTimerSeconds < vars.serverRotateInhibitTimeout) return;

  // Group #0 is reserved for standalone servers that do not rotate
  if (currentGroupNumber === 0) return;

  // This server is not set to reconnect
  if (!currentServerObj.reconnect) return;

  // There are no other available servers in the list for rotation
  if (groupIndexList.length < 2) return;

  const nextIndex = _nextIndexInGroup(groupIndexList, currentIndex);
  //
  // loading a new server definition will include the default nickname.
  // When reconnecting from existing connection,
  // preserve current nickname to use in place of server definition nickname.
  // Note, if current nickname is alternate nickname or Guest12345
  // it may have been reverted back to the primary configuration nickname
  // by function onDisconnectResetPrimaryNick()
  //
  const lastNick = vars.ircState.nickName;

  //
  // Update IRC parameters
  //
  vars.ircState.ircServerIndex = -1;
  eraseServerDefinition();
  vars.ircState.ircServerIndex = nextIndex;
  // load definition from index var.ircState.ircServerIndex
  loadServerDefinition();

  // Nickname special case, keep save across server rotation
  vars.ircState.nickName = lastNick;

  tellBrowserToRequestState();

  const logMsg = 'Rotated IRC server to definition ' +
    vars.servers.serverArray[vars.ircState.ircServerIndex].name +
    ' at index ' + vars.ircState.ircServerIndex +
    ' using nickname ' + vars.ircState.nickName;
  ircLog.writeIrcLog(logMsg);
  global.sendToBrowser('webError: ' + logMsg + '\n');

  //
  // De-bounce disconnect for 5 seconds
  // There can be several sockets: Proxy socket, TLS socket and TCP socket.
  // Sometimes multiple socket error events can fire for a single disconnect.
  // This 5 second inhibit timer prevents stepping over possible IRC servers
  // in the list for chained errors
  //
  disconnectRotateInhibitFlag = true;
  setTimeout(function () {
    disconnectRotateInhibitFlag = false;
  }, 5000);
}; // onDisconnectRotateNextServer()

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
      // IRCv3 CAP negotiation
      ircCap.initCapNegotiation(socket);
      // Traditional IRC Registration
      if ((vars.ircServerPassword) && (vars.ircServerPassword.length > 0)) {
        writeSocket(socket, 'PASS ' + vars.ircServerPassword);
      }
      writeSocket(socket, 'NICK ' + vars.ircState.nickName);
      // Note: mode 8 = i not working on ngirc ?
      writeSocket(socket, 'USER ' + vars.ircState.userName +
        ' 0 * :' + vars.ircState.realName);
      vars.ircState.ircConnecting = false;
      vars.ircState.ircConnected = true;
      tellBrowserToRequestState();
      // Timer for TLS connect delay
    } else {
      // case of error handler reset ircConnecting before timer expired (TLS error probably)
      vars.ircState.ircServerPrefix = '';
      vars.ircState.ircConnecting = false;
      vars.ircState.ircConnected = false;
      vars.ircState.ircRegistered = false;
      vars.ircState.ircIsAway = false;
      vars.ircState.nickRecoveryActive = false;
      vars.ircState.userHost = '';
      vars.ircState.connectHost = '';
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
          processIrcMessage(socket, socks5Socket, message);
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
      ircSocket.destroy();
    } catch (err) {
      // Ingore
    }
  }
  ircSocket = null;
  if (socks5Socket) {
    try {
      socks5Socket.destroy();
    } catch (err) {
      // Ingore
    }
  }
  socks5Socket = null;

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
        if (ircSocket) {
          ircSocket.destroy();
        }
        ircSocket = null;
        if (socks5Socket) {
          socks5Socket.destroy();
        }
        socks5Socket = null;
        // signal browser to show an error
        vars.ircState.count.ircConnectError++;

        vars.ircState.ircServerPrefix = '';
        vars.ircState.ircConnecting = false;
        vars.ircState.ircConnected = false;
        vars.ircState.ircRegistered = false;
        vars.ircState.ircIsAway = false;
        vars.ircState.nickRecoveryActive = false;
        vars.ircState.userHost = '';
        vars.ircState.connectHost = '';
        global.sendToBrowser('UPDATE\nwebError: IRC server timeout while connecting\n');
        ircLog.writeIrcLog('IRC server timeout while connecting');
      }
    }, vars.ircSocketConnectingTimeout * 1000);

    // -------------------------------------------------
    // On secure Connect - This event applies to TLS
    //        encrypted connected, both TCP and Socks5
    // -------------------------------------------------
    newIrcSocket.on('secureConnect', function (e) {
      // console.log('Event: secureConnect');
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
      // console.log('Event ircSocket: connect');
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
      // console.log('Event ircSocket: close, hadError=' + hadError);
      if (((vars.ircState.ircConnectOn) && (vars.ircState.ircConnected)) ||
        (vars.ircState.ircConnecting)) {
        // signal browser to show an error
        vars.ircState.count.ircConnectError++;
      }
      // is auto enabled?
      if (vars.ircState.ircAutoReconnect) {
        // and client requested a connection, and has achieved at least 1 previously
        if ((vars.ircState.ircConnectOn) && (vars.ircState.count.ircConnect > 0)) {
          if (vars.ircServerReconnectTimerSeconds === 0) {
            vars.ircServerReconnectTimerSeconds = 1;
          }
          onDisconnectGrabState();
          onDisconnectResetPrimaryNick();
          onDisconnectRotateNextServer();
        } else {
          onDisconnectResetPrimaryNick();
        }
      } else {
        onDisconnectResetPrimaryNick();
      }
      vars.ircState.ircServerPrefix = '';
      vars.ircState.ircConnecting = false;
      vars.ircState.ircConnected = false;
      vars.ircState.ircRegistered = false;
      vars.ircState.ircIsAway = false;
      vars.ircState.nickRecoveryActive = false;
      vars.ircState.userHost = '';
      vars.ircState.connectHost = '';
      vars.ircState.channels = [];
      vars.ircState.channelStates = [];

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
        // console.log('Event ircSocket: error ' + err.toString());
        // console.log(err);
      }
      if ((vars.ircState.ircConnected) || (vars.ircState.ircConnecting)) {
        // signal browser to show an error
        vars.ircState.count.ircConnectError++;
      }
      // is auto enabled?
      if (vars.ircState.ircAutoReconnect) {
        // and client requested a connection, and has achieved at least 1 previously
        if ((vars.ircState.ircConnectOn) && (vars.ircState.count.ircConnect > 0)) {
          if (vars.ircServerReconnectTimerSeconds === 0) {
            vars.ircServerReconnectTimerSeconds = 1;
          }
          onDisconnectGrabState();
          onDisconnectResetPrimaryNick();
          onDisconnectRotateNextServer();
        } else {
          onDisconnectResetPrimaryNick();
        }
      } else {
        onDisconnectResetPrimaryNick();
      }
      vars.ircState.ircServerPrefix = '';
      vars.ircState.ircConnecting = false;
      vars.ircState.ircConnected = false;
      vars.ircState.ircRegistered = false;
      vars.ircState.ircIsAway = false;
      vars.ircState.nickRecoveryActive = false;
      vars.ircState.userHost = '';
      vars.ircState.connectHost = '';
      vars.ircState.channels = [];
      vars.ircState.channelStates = [];
      if ((vars.ircState.ircConnectOn) && (vars.ircState.count.ircConnect === 0)) {
        // Case of socket error when not previously connected, cancel auto-connect
        vars.ircState.ircConnectOn = false;
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
      // This timer is a hack...
      // During a new connection, the connection error event
      // can be seen by the browser before the beginning connect event.
      // When events arrive out of order, browser was stuck, with buttons grayed and disabled.
      // To remediate this, the browser is requested to get a state update a second time.
      setTimeout(function () {
        global.sendToBrowser('UPDATE\n');
      }, 1000);

      if (ircSocket) {
        ircSocket.destroy();
      }
      ircSocket = null;
      if (socks5Socket) {
        socks5Socket.destroy();
      }
      socks5Socket = null;
    });
  } // createIrcSocketEventListeners()

  // Proxy enabled both global and for specific selected IRC server.
  const ircProxyInUse = vars.ircState.enableSocks5Proxy && vars.ircState.ircProxy;
  // ----------------------------------
  //       Create New IRC Socket
  // Once created, call previous function
  // to create event listeners on the new
  // TCP socket.
  //
  // There are 4 different cases
  // ----------------------------------
  if ((!vars.ircState.ircTLSEnabled) && (!ircProxyInUse)) {
    // --------------------------------------------------------------------------
    // Case 1 of 4 - TCP connection to IRC server with NodeJs module
    //               "net" using method net.connect()
    // --------------------------------------------------------------------------
    const options = {
      port: vars.ircState.ircServerPort,
      host: vars.ircState.ircServerHost
    };
    // Options to bind a specific IP address to the IRC connections
    // Warning, this will block IPV4 or IPV6 that does not
    // match the family of the specified address.
    if ((Object.hasOwn(config.irc, 'ircSocketLocalAddress')) &&
      (typeof config.irc.ircSocketLocalAddress === 'string') &&
      (config.irc.ircSocketLocalAddress.length > 0)) {
      options.localAddress = config.irc.ircSocketLocalAddress;
    }
    ircSocket = net.connect(options);
    _createIrcSocketEventListeners(ircSocket);
  } else if ((vars.ircState.ircTLSEnabled) && (!ircProxyInUse)) {
    // --------------------------------------------------------------------------
    // Case 2 of 4 - TLS encrypted connection to IRC server with NodeJs
    //               "tls" module calling tls.connect()
    // --------------------------------------------------------------------------
    const options = {
      port: vars.ircState.ircServerPort,
      host: vars.ircState.ircServerHost,
      minVersion: 'TLSv1.2'
    };
    options.rejectUnauthorized = vars.ircState.ircTLSVerify;
    if (vars.ircState.ircTLSVerify) {
      options.servername = vars.ircState.ircServerHost;
    }
    // Options to bind a specific IP address to the IRC connections
    // Warning, this will block IPV4 or IPV6 that does not
    // match the family of the specified address.
    if ((Object.hasOwn(config.irc, 'ircSocketLocalAddress')) &&
      (typeof config.irc.ircSocketLocalAddress === 'string') &&
      (config.irc.ircSocketLocalAddress.length > 0)) {
      options.localAddress = config.irc.ircSocketLocalAddress;
    }
    ircSocket = tls.connect(options);
    _createIrcSocketEventListeners(ircSocket);
  } else if ((!vars.ircState.ircTLSEnabled) && (ircProxyInUse)) {
    // --------------------------------------------------------------------------
    // Case 3 of 4 - TCP connection to socks5 proxy using npm module
    //               "socks5-client" calling method socks5.createConnection()
    // --------------------------------------------------------------------------
    //
    const proxyConnectMessage = 'Attempting proxy connection using: ' +
      vars.ircState.socks5Host + ':' + vars.ircState.socks5Port;
    global.sendToBrowser('webServer: ' + proxyConnectMessage + '\n');
    ircLog.writeIrcLog(proxyConnectMessage);
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
  } else if ((vars.ircState.ircTLSEnabled) && (ircProxyInUse)) {
    // --------------------------------------------------------------------------
    // Case 4 of 4 - TCP connection to socks5 proxy using npm module
    //               "socks5-client" calling method socks5.createConnection()
    //               Then, pass newly created socks5 socket to NodeJs
    //               'tls' module and passing the new socket into
    //               tls.connect() to return a TLS encrypted socks5 socket.
    //
    //               i.e. this is socket within a socket
    // --------------------------------------------------------------------------
    const proxyConnectMessage = 'Attempting proxy connection using: ' +
      vars.ircState.socks5Host + ':' + vars.ircState.socks5Port;
    global.sendToBrowser('webServer: ' + proxyConnectMessage + '\n');
    ircLog.writeIrcLog(proxyConnectMessage);

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
      minVersion: 'TLSv1.2'
    };
    tlsOptions.rejectUnauthorized = vars.ircState.ircTLSVerify;
    if (tlsOptions.rejectUnauthorized) {
      tlsOptions.servername = vars.ircState.ircServerHost;
    }

    // This creates a new non-encrypted socket, then connects the socket to Socks5 proxy
    // The newly connected socket will be passed to the TLS module as an options property
    socks5Socket = socks5.createConnection(socks5Options);
    // Add event listener for socks5 proxy connect event
    // When event fires, the socket is open and can be passed into TLS module
    socks5Socket.on('connect', () => {
      // console.log('Event socks5Socket: connect');
      // Pass the open socket into the TLS module as an options property
      tlsOptions.socket = socks5Socket;
      // tls.connect() performs TLS handshake, then returns an encrypted
      //     socket as a TLS wrapper socket
      ircSocket = tls.connect(tlsOptions);
      // Add event listeners to new TLS socket
      _createIrcSocketEventListeners(ircSocket);
    });

    // debugging...
    // socks5Socket.on('close', () => {
    //   console.log('Event socks5Socket: close');
    // });

    // Note: this error applies to non-encrypted socks5 sockets.
    // However, should the TLS socket error occur, this event will also fire.
    // In the case of a socks5 socket error before TLS is connected, only 1 error will fire.
    socks5Socket.on('error', (err) => {
      if (err) {
        // console.log('Event socks5Socket: error ' + err.toString());
        // console.log(err);
      }
      if ((vars.ircState.ircConnected) || (vars.ircState.ircConnecting)) {
        // signal browser to show an error
        vars.ircState.count.ircConnectError++;
      }
      // is auto enabled?
      if (vars.ircState.ircAutoReconnect) {
        // and client requested a connection, and has achieved at least 1 previously
        if ((vars.ircState.ircConnectOn) && (vars.ircState.count.ircConnect > 0)) {
          if (vars.ircServerReconnectTimerSeconds === 0) {
            vars.ircServerReconnectTimerSeconds = 1;
          }
          onDisconnectGrabState();
          onDisconnectRotateNextServer();
          onDisconnectResetPrimaryNick();
        } else {
          onDisconnectResetPrimaryNick();
        }
      } else {
        onDisconnectResetPrimaryNick();
      }
      vars.ircState.ircServerPrefix = '';
      vars.ircState.ircConnecting = false;
      vars.ircState.ircConnected = false;
      vars.ircState.ircRegistered = false;
      vars.ircState.ircIsAway = false;
      vars.ircState.nickRecoveryActive = false;
      vars.ircState.userHost = '';
      vars.ircState.connectHost = '';
      vars.ircState.channels = [];
      vars.ircState.channelStates = [];
      if ((vars.ircState.ircConnectOn) && (vars.ircState.count.ircConnect === 0)) {
        // Case of socket error when not previously connected, cancel auto-connect
        vars.ircState.ircConnectOn = false;
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
      if (ircSocket) {
        ircSocket.destroy();
      }
      ircSocket = null;
      if (socks5Socket) {
        socks5Socket.destroy();
      }
      socks5Socket = null;
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
    // console.log('Connecting nickname registration timeout');
    // If old socket exist, make sure not left connected.
    if (ircSocket) {
      ircSocket.destroy();
    }
    ircSocket = null;
    if (socks5Socket) {
      socks5Socket.destroy();
    }
    socks5Socket = null;
    // signal browser to show an error
    vars.ircState.count.ircConnectError++;

    vars.ircState.ircServerPrefix = '';
    vars.ircState.ircConnecting = false;
    vars.ircState.ircConnected = false;
    vars.ircState.ircRegistered = false;
    vars.ircState.ircIsAway = false;
    vars.ircState.nickRecoveryActive = false;
    vars.ircState.userHost = '';
    vars.ircState.connectHost = '';

    if ((vars.ircState.ircConnectOn) && (vars.ircState.count.ircConnect === 0)) {
      // Case of socket error when not previously connected, cancel auto-connect
      vars.ircState.ircConnectOn = false;
    }

    global.sendToBrowser('UPDATE\nwebError: IRC server Nickname registration timeout\n');
    ircLog.writeIrcLog('IRC server Nickname registration timeout');
  }
}; // registrationWatchdogTimerTick()

// ------------------------------------------------------
//
//     I R C   R e c o n n e c t   H a n d l e r
//
// In order to restart, a selected IRC server must have
// previously achieved a successful connection at least once.
// Successful connections will increment a counter for this purpose
//
// Variable rcServerReconnectTimerSeconds is a counter
// that increments value 1 per second if greater than zero.
// It is used to determine if restart is active ( > 0 )
// ------------------------------------------------------
// Example of state variables during reconnect after error
//
//   A --- ircState.ircConnectOn
//   B --- ircState.ircConnecting
//   C --- ircState.ircConnected
//   D --- ircState.ircRegistered
//   E --- ircServerReconnectTimerSeconds (if > 0, then increments 1 per second)

//   A  B  C  D  E  Case of direct connect port 6667 (no TLS) and stop IRC server, then restart
//  ----------------
//   F  F  F  F  0  - Load NodeJs files
//   T  T  F  F  0  - Function: connectIRC()
//   T  T  F  F  0  - Event: on connect
//   T  F  T  F  0  - Function:_connectEventHandler
//   T  F  T  T  0  - Event: IRC message 001 from IRC server
//   T  F  F  F  1  - Event: on close
//   T  T  F  F  10 - Function: connectIRC()
//   T  F  F  F  10 - Event: on error
//   T  F  F  F  10 - Event: on close
//   T  T  F  F  76 - Function: connectIRC()
//   T  T  F  F  76 - Event: on connect
//   T  F  T  F  76 - Function: _connectEventHandler
//   T  F  T  T  76 - Event: IRC message 001 from IRC server
//   T  F  T  T  0  - Function: ircServerReconnectTimerTick()

//   A  B  C  D  E  Case socks5 proxy to port 6667 (no TLS) and stop IRC server, then restart
//                  Also stop Socks5 proxy and restart, the events are the same.
//  ----------------
//   F  F  F  F  0  - Load NodeJs files
//   T  T  F  F  0  - Function: connectIRC()
//   T  T  F  F  0  - Event: on connect
//   T  F  T  F  0  - Function:_connectEventHandler
//   T  F  T  T  0  - Event: IRC message 001 from IRC server
//   T  F  F  F  1  - Event: on close
//   T  T  F  F  10 - Function: connectIRC()
//   T  F  F  F  10 - Event: on error
//   T  T  F  F  76 - Function: connectIRC()
//   T  T  F  F  76 - Event: on connect
//   T  F  T  F  76 - Function: _connectEventHandler
//   T  F  T  T  76 - Event: IRC message 001 from IRC server
//   T  F  T  T  0  - Function: ircServerReconnectTimerTick()

//   A  B  C  D  E  Case of TLS connect using socks5 proxy, then stop IRC server, then restart
//  ----------------
//   F  F  F  F  0  - Load NodeJs files
//   T  T  F  F  0  - Function: connectIRC()
//   T  T  F  F  0  - Event: socks5 on connect
//   T  T  F  F  0  - Event: on secureConnect
//   T  F  T  F  0  - Function:_connectEventHandler
//   T  F  T  T  0  - Event: IRC message 001 from IRC server
//   T  F  F  F  1  - Event: on close
//   T  T  F  F  10 - Function: connectIRC()
//   T  F  F  F  10 - Event: socks5 on error
//   T  T  F  F  76 - Function: connectIRC()
//   T  T  F  F  76 - Event: socks5 on connect
//   T  T  F  F  76 - Event: on secureConnect
//   T  F  T  F  76 - Function: _connectEventHandler
//   T  F  T  T  76 - Event: IRC message 001 from IRC server
//   T  F  T  T  0  - Function: ircServerReconnectTimerTick()

//   A  B  C  D  E  Case of TLS connect using socks5 proxy, then stop socks5 proxy, then restart
//  ----------------
//   F  F  F  F  0  - Load NodeJs files
//   T  T  F  F  0  - Function: connectIRC()
//   T  T  F  F  0  - Event: socks5 on connect
//   T  T  F  F  0  - Event: on secureConnect
//   T  F  T  F  0  - Function:_connectEventHandler
//   T  F  T  T  0  - Event: IRC message 001 from IRC server
//   T  F  F  F  1  - Event: socks5 on error
//   T  F  F  F  1  - Event: on error
//   T  F  F  F  1  - Event: on close
//   T  T  F  F  10 - Function: connectIRC()
//   T  F  F  F  10 - Event: socks5 on error
//   T  T  F  F  76 - Function: connectIRC()
//   T  T  F  F  76 - Event: socks5 on connect
//   T  T  F  F  76 - Event: on secureConnect
//   T  F  T  F  76 - Function: _connectEventHandler
//   T  F  T  T  76 - Event: IRC message 001 from IRC server
//   T  F  T  T  0  - Function: ircServerReconnectTimerTick()

//
//   A  B  C  D  E  Case of TLS connect without socks5, then stop IRC server, then restart
//  ----------------
//   F  F  F  F  0  - Load NodeJs files
//   T  T  F  F  0  - Function: connectIRC()
//   T  T  F  F  0  - Event: on connect
//   T  T  F  F  0  - Event: on secureConnect
//   T  F  T  F  0  - Function:_connectEventHandler
//   T  F  T  T  0  - Event: IRC message 001 from IRC server
//   T  F  F  F  1  - Event: on close
//   T  T  F  F  10 - Function: connectIRC()
//   T  F  F  F  10 - Event: on error
//   T  F  F  F  10 - Event: on close
//   T  T  F  F  76 - Function: connectIRC()
//   T  T  F  F  76 - Event: on connect
//   T  T  F  F  76 - Event: on secureConnect
//   T  F  T  F  76 - Function: _connectEventHandler
//   T  F  T  T  76 - Event: IRC message 001 from IRC server
//   T  F  T  T  0  - Function: ircServerReconnectTimerTick()
//
// ------------------------------------------------------

// Maximum time allowed to reconnect
const ircServerReconnectMaxLimit =
  vars.ircServerReconnectIntervals[vars.ircServerReconnectIntervals.length - 1] +
  vars.ircSocketConnectingTimeout;

// Timer service routine
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
    vars.ircServerReconnectChannelString = '';
    return;
  }

  // not previously connected, abort auto
  if (vars.ircState.count.ircConnect === 0) {
    vars.ircServerReconnectTimerSeconds = 0;
    return;
  }

  // Increment the counter (timer in seconds)
  vars.ircServerReconnectTimerSeconds++;

  // Check maximum time, abort if exceeded
  if (vars.ircServerReconnectTimerSeconds > ircServerReconnectMaxLimit) {
    // cancel reconnect timer
    vars.ircState.ircConnectOn = false;
    vars.ircServerReconnectTimerSeconds = 0;
    vars.ircServerReconnectChannelString = '';
    vars.ircServerReconnectAwayString = '';
    global.sendToBrowser('webServer: Auto-reconnect maximum time exceeded\n');
    ircLog.writeIrcLog('Auto-reconnect maximum time exceeded');
    if (ircSocket) {
      ircSocket.destroy();
    }
    ircSocket = null;
    if (socks5Socket) {
      socks5Socket.destroy();
    }
    socks5Socket = null;
    vars.ircState.ircServerPrefix = '';
    vars.ircState.ircConnecting = false;
    vars.ircState.ircConnected = false;
    vars.ircState.ircRegistered = false;
    vars.ircState.ircIsAway = false;
    vars.ircState.nickRecoveryActive = false;
    vars.ircState.userHost = '';
    vars.ircState.connectHost = '';
    tellBrowserToRequestState();
    return;
  }

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
    vars.ircState.nickRecoveryActive = false;
    vars.ircState.userHost = '';
    vars.ircState.connectHost = '';

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
    ircSocket = null;
    if (socks5Socket) {
      socks5Socket.destroy();
    }
    socks5Socket = null;
    // signal browser to show an error
    vars.ircState.count.ircConnectError++;

    vars.ircState.ircServerPrefix = '';
    vars.ircState.ircConnecting = false;
    vars.ircState.ircConnected = false;
    vars.ircState.ircRegistered = false;
    vars.ircState.ircIsAway = false;
    vars.ircState.nickRecoveryActive = false;
    vars.ircState.userHost = '';
    vars.ircState.connectHost = '';
    global.sendToBrowser('UPDATE\nwebError: IRC server activity watchdog expired\n');
    ircLog.writeIrcLog('IRC server activity watchdog expired');
  }
}; // activityWatchdogTimerTick()

// ----------------------------------
// Client sends PING to server
// ----------------------------------
const clientToServerPingTimerTick = function () {
  if ((vars.ircState.ircConnected) && (vars.ircState.ircRegistered)) {
    vars.clientToServerPingSendTimer++;
    if (vars.clientToServerPingResponseTimer > 0) {
      vars.clientToServerPingResponseTimer++;
      if (vars.clientToServerPingResponseTimer > vars.clientToServerPingTimeout) {
        // stop timer
        vars.clientToServerPingResponseTimer = 0;
        // IRC server not responding, handle as disconnect
        if (ircSocket) {
          ircSocket.destroy();
        }
        ircSocket = null;
        if (socks5Socket) {
          socks5Socket.destroy();
        }
        socks5Socket = null;
        // signal browser to show an error
        vars.ircState.count.ircConnectError++;

        vars.ircState.ircServerPrefix = '';
        vars.ircState.ircConnecting = false;
        vars.ircState.ircConnected = false;
        vars.ircState.ircRegistered = false;
        vars.ircState.ircIsAway = false;
        vars.ircState.nickRecoveryActive = false;
        vars.ircState.userHost = '';
        vars.ircState.connectHost = '';
        global.sendToBrowser('UPDATE\nwebError: IRC server not responding to client PING\n');
        ircLog.writeIrcLog('IRC server not responding to client PING');
      }
    }
  } else {
    vars.clientToServerPingSendTimer = 0;
    vars.clientToServerPingResponseTimer = 0;
    vars.clientToServerPingTimestampMs = 0;
    vars.ircState.lastPing = '0.000';
  }
  if ((vars.ircState.ircConnected) && (vars.ircState.ircRegistered) &&
    (vars.ircState.ircServerPrefix.length > 0) &&
    (vars.clientToServerPingSendTimer >= vars.clientToServerPingInterval)) {
    vars.clientToServerPingSendTimer = 0;
    // 0 = disabled, >=1 is counting up 1 per second, set to 1 to start
    vars.clientToServerPingResponseTimer = 1;
    // Timestamp is system time in milliseconds
    const now = new Date();
    vars.clientToServerPingTimestampMs = now.getTime();
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
      // Show PING in browser unless client-to-server PING is filtered.
      if (vars.excludedCommands.indexOf('PING') < 0) {
        global.sendToBrowser(vars.commandMsgPrefix + outBuffer.toString('utf8'));
      }
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
//        SEt to -2 for previous in sequence (cycle)
//        Servers with server.disabled = true are skipped.
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
  // Check for empty server list
  if (vars.ircState.ircServerIndex === -1) {
    return res.json({
      error: true,
      message: 'Empty Server List'
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
  if ((inputIndex < -2) || (inputIndex >= vars.servers.serverArray.length)) {
    return res.json({
      error: true,
      message: 'Requested server index number out of range.'
    });
  }
  if (_countEnabledServers() === 0) {
    return res.json({
      error: true,
      message: 'No enabled servers found'
    });
  }
  // Check if number is disabled
  if ((inputIndex >= 0) && (vars.servers.serverArray[inputIndex].disabled)) {
    return res.json({
      error: true,
      message: 'Requested server is disabled'
    });
  }
  // clear these to reinitialize restart logic
  vars.ircState.count.ircConnect = 0;
  vars.ircState.count.ircConnectError = 0;

  // Remember last server group to check if erase cache needed.
  const lastServerGroup = vars.ircState.ircServerGroup;

  // if index === -1, then cycle through servers, else use index value
  if (inputIndex === -1) {
    if (_countEnabledServers() === 1) {
      vars.ircState.ircServerIndex = _findFirstEnabledServer();
    } else {
      // Count is not 0 and not 1 so must be 2 or greater, ok to cycle
      for (let i = 0; i < vars.servers.serverArray.length; i++) {
        vars.ircState.ircServerIndex++;
        if (vars.ircState.ircServerIndex >= vars.servers.serverArray.length) {
          vars.ircState.ircServerIndex = 0;
        }
        if (!vars.servers.serverArray[vars.ircState.ircServerIndex].disabled) break;
      }
    }
  // if index ===-2, then cycle through servers, else use index value
  } else if (inputIndex === -2) {
    if (_countEnabledServers() === 1) {
      vars.ircState.ircServerIndex = _findFirstEnabledServer();
    } else {
      // Count is not 0 and not 1 so must be 2 or greater, ok to cycle
      for (let i = 0; i < vars.servers.serverArray.length; i++) {
        vars.ircState.ircServerIndex--;
        if (vars.ircState.ircServerIndex < 0) {
          vars.ircState.ircServerIndex = vars.servers.serverArray.length - 1;
        }
        if (!vars.servers.serverArray[vars.ircState.ircServerIndex].disabled) break;
      }
    }
  } else {
    if (!vars.servers.serverArray[inputIndex].disabled) {
      vars.ircState.ircServerIndex = inputIndex;
    } else {
      return res.json({
        error: true,
        message: 'Requested server is disabled'
      });
    }
  }
  //
  // Update IRC parameters
  //
  // load definition from index var.ircState.ircServerIndex
  eraseServerDefinition();
  if ((vars.ircState.ircServerIndex >= 0) &&
    (vars.ircState.ircServerIndex < vars.servers.serverArray.length)) {
    loadServerDefinition();
  } else {
    // This is a fatal error
    const err = new Error('Server index out of range loading server definition');
    return next(err);
  }

  // WHen changing servers, erase message cache unless server rotation group is the same
  if ((lastServerGroup !== vars.ircState.ircServerGroup) ||
    (vars.ircState.ircServerGroup === 0)) {
    // If previous cache is not empty,
    // then sent command to browser over websocket to initiate actions
    // to properly update (erase) displays.
    if (ircMessageCache.cacheInfo().usedLines > 0) {
      global.sendToBrowser('CACHERESET\n');
    }

    ircMessageCache.eraseCache();
  }

  tellBrowserToRequestState();

  res.json({
    error: false,
    index: vars.ircState.ircServerIndex,
    name: vars.ircState.ircServerName
  });
}; // serverHandler()

//
// Global event handler for changes to IRC server list file vars.servers.json
// External IRC server list editor send event after saving the file.
//
global.externalEvent.on('serverListChanged', function () {
  // Remember last server group to check if erase cache needed.
  const lastServerGroup = vars.ircState.ircServerGroup;

  // Read file servers.json
  loadServerList();

  //
  // Update IRC parameters
  //
  // Case of empty server list
  vars.ircState.ircServerIndex = -1;
  eraseServerDefinition();

  const reloadServerIndex = _findFirstEnabledServer();
  if (reloadServerIndex >= 0) {
    vars.ircState.ircServerIndex = reloadServerIndex;
    // load definition from index var.ircState.ircServerIndex
    loadServerDefinition();
  }

  // WHen changing servers, erase message cache unless server rotation group is the same
  if ((lastServerGroup !== vars.ircState.ircServerGroup) ||
    (vars.ircState.ircServerGroup === 0)) {
    // If previous cache is not empty,
    // then sent command to browser over websocket to initiate actions
    // to properly update (erase) displays.
    if (ircMessageCache.cacheInfo().usedLines > 0) {
      global.sendToBrowser('CACHERESET\n');
    }

    ircMessageCache.eraseCache();
  }

  tellBrowserToRequestState();
});

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
  vars.ircState.nickRecoveryActive = false;
  vars.ircState.userHost = '';
  vars.ircState.connectHost = '';

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
  }
  ircSocket = null;
  if (socks5Socket) {
    socks5Socket.destroy();
  }
  socks5Socket = null;
  vars.ircState.ircServerPrefix = '';
  vars.ircState.ircConnecting = false;
  vars.ircState.ircConnected = false;
  vars.ircState.ircRegistered = false;
  vars.ircState.ircIsAway = false;
  vars.ircState.nickRecoveryActive = false;
  vars.ircState.userHost = '';
  vars.ircState.connectHost = '';
  tellBrowserToRequestState();
  res.json({ error: false });
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
      const parseResult = parseBrowserMessageForCommand(message);
      if (parseResult.error) {
        return res.json({ error: true, message: parseResult.message });
      } else {
        // Send browser message on to web server
        writeSocket(ircSocket, message);
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
        ircMessageCache.pruneChannelCache(inputChannel);
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
//    "erase": "CACHE"
//  }
//
// Valid erase targets: CACHE, NOTICE, WALLOPS, PRIVMSG
//
// -----------------------------------------------
const eraseCache = function (req, res, next) {
  // Abort if connected.
  // if ((vars.ircState.ircConnected) || (vars.ircState.ircConnecting)) {
  //   return res.json({
  //     error: true,
  //     message: 'Disconnect from IRC before clearing cache'
  //   });
  // }
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
  if (inputVerifyString === 'CACHE') {
    // If previous cache is not empty,
    // then sent command to browser over websocket to initiate actions
    // to properly update (erase) displays.
    if (ircMessageCache.cacheInfo().usedLines > 0) {
      global.sendToBrowser('CACHERESET\n');
    }
    ircMessageCache.eraseCache();
    res.json({ error: false });
  } else if (inputVerifyString === 'WALLOPS') {
    ircMessageCache.eraseCacheWallops();
    // tell browser to pull a fresh copy of the cache
    global.sendToBrowser('CACHEPULL\n');
    res.json({ error: false });
  } else if (inputVerifyString === 'NOTICE') {
    ircMessageCache.eraseCacheNotices();
    // tell browser to pull a fresh copy of the cache
    global.sendToBrowser('CACHEPULL\n');
    res.json({ error: false });
  } else if (inputVerifyString === 'PRIVMSG') {
    ircMessageCache.eraseCacheUserPM();
    // tell browser to pull a fresh copy of the cache
    global.sendToBrowser('CACHEPULL\n');
    res.json({ error: false });
  } else {
    const error = new Error('Bad Request');
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
          after: after,
          cache: ircMessageCache.cacheInfo()
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
  vars.clientToServerPingResponseTimer = vars.clientToServerPingTimeout - 2;
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
  recoverNickTimerTick(ircSocket);
}, 1000);

// Program run timestamp
vars.ircState.times.programRun = vars.unixTimestamp();

export default {
  serverHandler,
  connectHandler,
  messageHandler,
  disconnectHandler,
  getIrcState,
  getCache,
  pruneChannel,
  eraseCache,
  test1Handler,
  test2Handler
};
