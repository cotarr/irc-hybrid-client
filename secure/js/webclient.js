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

'use strict';

// --------------------------------------------------------------------------------
//                     Web Server Authentication notes
//
// These HTML pages are authenticated by session cookies.
// The API routes (GET, POST) are authenticated by session cookies.
// The websocket connection (ws://, wss://) upgrade request is manually
// authenticated in backend using the browser provided cookie.
//
// Connection sequence.
//    1) Call initWebSocketAuth(callback) with callback to connectWebSocket()
//    1) initWebSocketAuth send POST request to /irc/wsauth starting 10 second auth window
//    2) Upon POST response, callback function calls connectWebSocket() to initiate connection
//    3) Browser passes current cookie to the websocket server for validation
//    5) Upon successful open event of web socket, web page calls getIrcState().
//    6) Upon successful recponse event from ircGetState, browser is "connected"
//
// --------------------------------------------------------------------------------

// --------------------
// Global variables
// --------------------
//
const channelPrefixChars = '@#+!';
const nickChannelSpacer = ' | ';

// ----------------------------------------------------------
// Do not edit ircState, represents state on web server end
// Object updated from getIrcState() fetch request
//
//   R E A D   O N L Y
//
var ircState = {
  showPingPong: false,
  ircConnected: false,
  ircConnecting: false,
  ircRegistered: false,

  ircServerName: '',
  ircServerHost: '',
  ircServerPort: 6667,
  ircTLSEnabled: false,
  ircServerIndex: 0,
  channelList: [],

  nickName: '',
  userName: '',
  realName: '',
  userMode: '',
  userHost: '',

  channels: [],
  channelStates: [],

  botVersion: '0.0.0',
  botName: '',

  websocketCount: 0
};

document.getElementById('webConnectIconId').removeAttribute('connected');
document.getElementById('ircConnectIconId').removeAttribute('connected');
document.getElementById('webConnectIconId').removeAttribute('connecting');
document.getElementById('ircConnectIconId').removeAttribute('connecting');

//
// webState represents state of web page in browser
//
var webState = {};
webState.loginUser = {};
webState.webConnectOn = true;
webState.webConnected = false;
webState.webConnecting = false;
webState.noticeOpen = false;
webState.wallopsOpen = false;
webState.rawShowHex = false;
webState.rawNoClean = false;
// Some IRC channel local variables (most in ircState)
webState.channels = [];
webState.resizableChannelTextareaIds = [];
webState.resizableChanSplitTextareaIds = [];
// Private message variables
webState.lastPMNick = '';
webState.activePrivateMessageNicks = [];
webState.resizablePrivMsgTextareaIds = [];

// -------------------------------
// Build URL from page location
// -------------------------------
var webServerUrl = 'https://';
var webSocketUrl = 'wss://';
if (document.location.protocol === 'http:') {
  webServerUrl = 'http://';
  webSocketUrl = 'ws://';
}
webServerUrl += window.location.hostname + ':' + window.location.port;
webSocketUrl += window.location.hostname + ':' + window.location.port;

// -----------------------
// WebSocket placeholder
// -----------------------
var wsocket = null;

// --------------------------
// Error display functions
// --------------------------

const errorExpireSeconds = 5;
var errorRemainSeconds = 0;

function clearError() {
  let errorDivEl = document.getElementById('errorDiv');
  errorDivEl.setAttribute('hidden', '');
  let errorContentDivEl = document.getElementById('errorContentDiv');
  while (errorContentDivEl.firstChild) {
    errorContentDivEl.removeChild(errorContentDivEl.firstChild);
  }
  errorRemainSeconds = 0;
};

function showError (errorString) {
  let errorDivEl = document.getElementById('errorDiv');
  errorDivEl.removeAttribute('hidden');
  let errorContentDivEl = document.getElementById('errorContentDiv');
  let errorMessageEl = document.createElement('div');
  errorMessageEl.textContent = errorString || 'Error: unknown error (2993)';
  errorContentDivEl.appendChild(errorMessageEl);
  errorRemainSeconds = errorExpireSeconds;
}

document.addEventListener('show-error-message', function(event) {
  showError(event.detail.message);
});

// ------------------------------------
// Click error to remove error display
// ------------------------------------
document.getElementById('errorDiv').addEventListener('click', function() {
  clearError();
});

// ------------------------------------------------
// This is called 1 / second as part of global timer
// ------------------------------------------------
function errorTimerTickHandler () {
  if (errorRemainSeconds > 0) {
    errorRemainSeconds--;
    if (errorRemainSeconds === 0) {
      clearError();
    } else {
      document.getElementById('errorTitle').textContent =
        'Tap to Close (' + errorRemainSeconds.toString() + ')';
    }
  }
};

// --------------------------------------
// Check if connected, both web and irc
// 1 = browser connect to web server only
// 2 = require both web and IRC
// 3 = require both web and IRC and Registered
// --------------------------------------
function checkConnect(code) {
  if ((code >= 1) && (!webState.webConnected)) {
    showError('Error: not connected to web server');
    return false;
  }
  if ((code >= 2) && (!ircState.ircConnected)) {
    showError('Error: Not connected to IRC server.');
    return false;
  }
  if ((code >= 3) && (!ircState.ircRegistered)) {
    showError('Error: Not connected to IRC server.');
    return false;
  }
  return true;
}

// --------------------------------------------------------------
// Single function to visibility of all display divs on the page
// --------------------------------------------------------------
function updateDivVisibility() {
  // return; // uncomment to show hidden divs.
  if (webState.webConnected) {
    document.getElementById('webDisconnectedVisibleDiv').setAttribute('hidden', '');
    document.getElementById('webDisconnectedHiddenDiv').removeAttribute('hidden');
    document.getElementById('reconnectStatusDiv').textContent = '';
    document.getElementById('webConnectIconId').setAttribute('connected', '');
    document.getElementById('webConnectIconId').removeAttribute('connecting');
    document.getElementById('rawMessageInputId').removeAttribute('disabled');
    document.getElementById('sendRawMessageButton').removeAttribute('disabled');
    document.getElementById('loadFromCacheButton').removeAttribute('disabled');
    if (ircState.ircConnected) {
      document.getElementById('cycleNextServerButton').setAttribute('disabled', '');
      document.getElementById('ircConnectIconId').setAttribute('connected', '');
      document.getElementById('hideLoginSection').setAttribute('hidden', '');
      document.getElementById('hideLoginSectionButton').textContent = '+';
      document.getElementById('nickNameInputId').setAttribute('disabled', '');
      document.getElementById('userNameInputId').setAttribute('disabled', '');
      document.getElementById('realNameInputId').setAttribute('disabled', '');
      document.getElementById('userModeInputId').setAttribute('disabled', '');
      document.getElementById('connectButton').setAttribute('disabled', '');
      document.getElementById('quitButton').removeAttribute('disabled');
      document.getElementById('eraseCacheButton').setAttribute('disabled', '');
      document.getElementById('ircDisconnectedHiddenDiv').removeAttribute('hidden');
      if (webState.noticeOpen) {
        document.getElementById('noticeSectionDiv').removeAttribute('hidden');
      } else {
        document.getElementById('noticeSectionDiv').setAttribute('hidden', '');
      }
      if (webState.wallopsOpen) {
        document.getElementById('wallopsSectionDiv').removeAttribute('hidden');
      } else {
        document.getElementById('wallopsSectionDiv').setAttribute('hidden', '');
      }
    } else {
      //
      // IRC Server Disconnected
      //
      document.getElementById('cycleNextServerButton').removeAttribute('disabled');
      document.getElementById('ircConnectIconId').removeAttribute('connected');
      document.getElementById('hideLoginSection').removeAttribute('hidden');
      document.getElementById('hideLoginSectionButton').textContent = '-';
      document.getElementById('nickNameInputId').removeAttribute('disabled');
      document.getElementById('userNameInputId').removeAttribute('disabled');
      document.getElementById('realNameInputId').removeAttribute('disabled');
      document.getElementById('userModeInputId').removeAttribute('disabled');
      document.getElementById('connectButton').removeAttribute('disabled');
      document.getElementById('quitButton').setAttribute('disabled', '');
      document.getElementById('eraseCacheButton').removeAttribute('disabled');
      document.getElementById('ircDisconnectedHiddenDiv').setAttribute('hidden', '');
      webState.noticeOpen = false;
      document.getElementById('noticeSectionDiv').setAttribute('hidden', '');
      webState.wallopsOpen = false;
      document.getElementById('wallopsSectionDiv').setAttribute('hidden', '');
    }
  } else {
    // Else, WEb server disconnected
    document.getElementById('webDisconnectedVisibleDiv').removeAttribute('hidden');
    document.getElementById('webDisconnectedHiddenDiv').setAttribute('hidden', '');
    document.getElementById('cycleNextServerButton').setAttribute('disabled', '');
    if (webState.webConnecting) {
      document.getElementById('webConnectIconId').removeAttribute('connected');
      document.getElementById('webConnectIconId').setAttribute('connecting', '');
    } else {
      document.getElementById('webConnectIconId').removeAttribute('connected');
      document.getElementById('webConnectIconId').removeAttribute('connecting');
    }
    document.getElementById('ircConnectIconId').removeAttribute('connected');
    document.getElementById('hideLoginSection').setAttribute('hidden', '');
    document.getElementById('nickNameInputId').setAttribute('disabled', '');
    document.getElementById('userNameInputId').setAttribute('disabled', '');
    document.getElementById('realNameInputId').setAttribute('disabled', '');
    document.getElementById('userModeInputId').setAttribute('disabled', '');
    document.getElementById('connectButton').setAttribute('disabled', '');
    document.getElementById('quitButton').setAttribute('disabled', '');
  }
}

// Event to show all divs
document.addEventListener('show-all-divs', function(event) {
  // document.getElementById('errorDiv').removeAttribute('hidden');
  document.getElementById('hideLoginSection').removeAttribute('hidden');
  document.getElementById('hideLoginSectionButton').textContent = '-';
  document.getElementById('privMsgMainHiddenDiv').removeAttribute('hidden');
  document.getElementById('privMsgMainHiddenButton').textContent = '-';
  document.getElementById('rawHiddenElements').removeAttribute('hidden');
  document.getElementById('rawHiddenElementsButton').textContent = '-';
  document.getElementById('rawHeadRightButtons').removeAttribute('hidden');
  webState.noticeOpen = true;
  webState.wallopsOpen = true;
  document.getElementById('noticeSectionDiv').removeAttribute('hidden');
  document.getElementById('wallopsSectionDiv').removeAttribute('hidden');
});

// Event to hide all divs
document.addEventListener('hide-all-divs', function(event) {
  // document.getElementById('errorDiv').setAttribute('hidden', '');
  document.getElementById('hideLoginSection').setAttribute('hidden', '');
  document.getElementById('hideLoginSectionButton').textContent = '+';
  document.getElementById('privMsgMainHiddenDiv').setAttribute('hidden', '');
  document.getElementById('privMsgMainHiddenButton').textContent = '+';
  document.getElementById('rawHiddenElements').setAttribute('hidden', '');
  document.getElementById('rawHiddenElementsButton').textContent = '+';
  document.getElementById('rawHeadRightButtons').setAttribute('hidden', '');
  webState.noticeOpen = false;
  document.getElementById('noticeSectionDiv').setAttribute('hidden', '');
  webState.wallopsOpen = false;
  document.getElementById('wallopsSectionDiv').setAttribute('hidden', '');
});

// --------------------------------------------------------
// Update variables to indicate disconnected state
//
// Called by getIrcState() and heartbeatTimerTickHandler()
// --------------------------------------------------------
function setVariablesShowingIRCDisconnected () {
  document.getElementById('headerUser').textContent = '';
  document.getElementById('headerServer').textContent = '';

  let channelContainerDivEl = document.getElementById('channelContainerDiv');
  while (channelContainerDivEl.firstChild) {
    channelContainerDivEl.removeChild(channelContainerDivEl.firstChild);
  }
  webState.channels = [];
  webState.resizableChannelTextareaIds = [];
  webState.resizableChanSplitTextareaIds = [];
  // Note PM area arrays managed during reload instead of Disconnect
  // This is because they are not in ircState and there managed in the browser.
};

//------------------------------------------------------------------------------
// Group of heartbeat functions.
//
// Web server sends websocket message 'HEARTBEAT' at 10 second intervals
// Command parser intercept the HEATBEAT message and calls onHeartbeatReceived()
//------------------------------------------------------------------------------
const heartbeatExpirationTimeSeconds = 15;
var heartbeatUpCounter = 0;
// One second global timer
function resetHeartbeatTimer () {
  heartbeatUpCounter = 0;
};
function onHeartbeatReceived () {
  heartbeatUpCounter = 0;
};
function heartbeatTimerTickHandler () {
  // console.log('tick');
  heartbeatUpCounter++;
  if (webState.webConnected) {
    if (heartbeatUpCounter > heartbeatExpirationTimeSeconds) {
      console.log('HEARTBEAT stopped, websocket timed out.');
      if (wsocket) {
        // Closing the web socket will generate a 'close' event.
        wsocket.close(3000, 'Heartbeat timeout');
      }
    }
  }
};

// -------------------------------------------------
//  Notify web server to expect connection request
//  within the next 10 seconds. The request
//  will have a valid session cookie.
// -------------------------------------------------
function initWebSocketAuth (callback) {
  let fetchURL = webServerUrl + '/irc/wsauth';
  let fetchOptions = {
    method: 'POST',
    timeout: 10000,
    // credentials: 'include',
    headers: {
      'Content-type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({purpose: 'websocket-auth'})
  };
  fetch(fetchURL, fetchOptions)
    .then( (response) => {
      // console.log(response.status);
      if (response.ok) {
        return response.json();
      } else {
        throw new Error('Fetch status ' + response.status + ' ' + response.statusText);
      }
    })
    .then( (responseJson) => {
      if (callback) {
        callback(null, ircState);
      }
    })
    .catch( (error) => {
      console.log(error);
      webState.webConnected = false;
      webState.webConnecting = false;
      updateDivVisibility();
      if (callback) {
        callback(error, {});
      }
    });
} // initWebSocketAuth

var lastServerIndex = -1;
// --------------------------------------
// Contact web server and get state of
// the connection to the IRC server
// --------------------------------------
function getIrcState (callback) {
  let fetchURL = webServerUrl + '/irc/getircstate';
  let fetchOptions = {
    method: 'GET',
    timeout: 10000,
    // credentials: 'include',
    headers: {
      'Accept': 'application/json'
    }
  };
  fetch(fetchURL, fetchOptions)
    .then( (response) => {
      // console.log(response.status);
      if (response.ok) {
        return response.json();
      } else {
        throw new Error('Fetch status ' + response.status + ' ' + response.statusText);
      }
    })
    .then( (responseJson) => {
      // console.log('getIrcState() ' + JSON.stringify(responseJson, null, 2));
      let lastIrcState = ircState;
      ircState = responseJson;
      //
      // ---------------------------------------------------------------
      // Based on state of connection between web server and IRC server
      // update display as necessary
      // ---------------------------------------------------------------
      // only update user info if server is changed from previous.
      if ((!ircState.ircConnected) && (lastServerIndex !== ircState.ircServerIndex)) {
        lastServerIndex = ircState.ircServerIndex;
        document.getElementById('ircServerNameInputId').value = ircState.ircServerName;
        document.getElementById('ircServerAddrInputId').value = ircState.ircServerHost;
        document.getElementById('ircServerPortInputId').value = ircState.ircServerPort;
        if (ircState.ircTLSEnabled) {
          document.getElementById('ircServerTlsCheck').setAttribute('checked', '');
        } else {
          document.getElementById('ircServerTlsCheck').removeAttribute('checked');
        }

        document.getElementById('nickNameInputId').value = ircState.nickName;
        document.getElementById('userNameInputId').value = ircState.userName;
        document.getElementById('realNameInputId').value = ircState.realName;
        document.getElementById('userModeInputId').value = ircState.userMode;
      }
      if (ircState.ircConnected) {
        document.getElementById('ircServerAddrInputId').value =
        ircState.ircServerHost + ':' + ircState.ircServerPort;
        if (ircState.ircTLSEnabled) {
          document.getElementById('ircServerAddrInputId').value += ' (TLS)';
        }
        document.getElementById('headerUser').textContent = ircState.nickName;
        document.getElementById('headerServer').textContent = ircState.ircServerName;
        document.getElementById('headerUser').textContent = ircState.nickName;
        document.getElementById('nickNameInputId').value = ircState.nickName;
        document.getElementById('userNameInputId').value = ircState.userName;
        document.getElementById('realNameInputId').value = ircState.realName;
        document.getElementById('userModeInputId').value = ircState.userMode;
      }
      // Since disconnected from IRC remove all channel plugin div
      if (!ircState.ircConnected) {
        setVariablesShowingIRCDisconnected();
      }

      // Fire custom event
      document.dispatchEvent(new CustomEvent('irc-state-changed',
        {
          bubbles: true,
          detail: {
          }
        }));

      // show or hide display sections according to state variables
      updateDivVisibility();

      if (callback) {
        callback(null, ircState);
      }
    })
    .catch( (error) => {
      console.log(error);
      if (callback) {
        callback(error, {});
      }
    });
} // getIrcState

document.addEventListener('irc-state-changed', function(event) {
  // console.log('Event: irc-state-changed, detail:' + JSON.stringify(event.detail));
});

// ------------------------------------------
// Function to strip colors from a string
// ------------------------------------------
function cleanFormatting (inString) {
  // Filterable formatting codes
  let formattingChars = [
    2, // 0x02 bold
    7, // 0x07 bell character
    15, // 0x0F reset
    17, // 0x11 mono-space
    22, // 0x16 Reverse color
    29, // 0x1D Italics
    30, // 0x1E Strickthrough
    31 // 0x1F Underline
  ];
  // Color encoding (2 methods)
  // 0x03+color (1 or 2 digits in range 0-9)
  // 0x04+color (6 digit hexadecimal color)
  let outString = '';
  // l = length of input string
  let l = inString.length;
  if (l === 0) return outString;
  // i = index into input string
  let i = 0;

  // Loop through all characters in input string
  while (i<l) {
    // Filter format characters capable of toggle on/off
    if ((i<l) && (formattingChars.indexOf(inString.charCodeAt(i)) >= 0)) i++;
    // Removal of color codes 0x03 + (1 or 2 digit) in range ('0' to '9')
    // followed by optional comma and background color.
    // Examples
    //     0x03 + '3'
    //     0x03 + '03'
    //     0x03 + '3,4'
    //     0x03 + '03,04'
    if ((i<l) && (inString.charCodeAt(i) === 3)) {
      i++;
      if ((i<l) && (inString.charAt(i) >= '0') && (inString.charAt(i) <= '9')) i++;
      if ((i<l) && (inString.charAt(i) >= '0') && (inString.charAt(i) <= '9')) i++;
      if ((i<l) && (inString.charAt(i) === ',')) {
        i++;
        if ((i<l) && (inString.charAt(i) >= '0') && (inString.charAt(i) <= '9')) i++;
        if ((i<l) && (inString.charAt(i) >= '0') && (inString.charAt(i) <= '9')) i++;
      }
    }
    // Hexadecimal colors 0x04 + 6 hexadecimal digits
    // followed by optional comma and 6 hexadeciaml digits for background color
    // In this case, 6 characters are removed regardless if 0-9, A-F
    if ((i<l) && (inString.charCodeAt(i) === 4)) {
      i++;
      for (let j=0; j<6; j++) {
        if (i<l) i++;
      }
      if ((i<l) && (inString.charAt(i) === ',')) {
        i++;
        for (let j=0; j<6; j++) {
          if (i<l) i++;
        }
      }
    }

    if (i<l) outString += inString.charAt(i);
    i++;
  }
  return outString;
}

// ------ This is a color format removal test -------------
// let colorTest = 'This is ' +
//   String.fromCharCode(3) + '04' + 'Red' + String.fromCharCode(3) + ' color ' +
//   String.fromCharCode(3) + '04,12' + 'Red/Gray' + String.fromCharCode(3) + ' color ' +
//   String.fromCharCode(4) + '0Fd7ff' + 'Hex-color' + String.fromCharCode(3) + ' color ' +
//   String.fromCharCode(4) + '0Fd7ff,17a400' + 'Hex-color,hexcolor' +String.fromCharCode(4) +
//   ' color ' +
//   String.fromCharCode(2) + 'Bold' + String.fromCharCode(2) + ' text ';
// console.log('colorTest ' + cleanFormatting(colorTest));
// ------ end color format removal test -------------

//
// Internal function to parse one line of message from IRC server
// Returns jason object with prefix, command and params array
//
function _parseIrcMessage (message) {
  // ------------------------
  // internal functions
  // ------------------------
  //
  // 1) timestamp
  //
  // timestamp :prefix command param1 param2 .... :lastParam
  // =========
  //
  function _extractTimeString(start, end, messageString) {
    let i = start;
    let timeString = '';
    while ((messageString.charAt(i) !== ' ') && (i <= end)) {
      timeString += messageString.charAt(i);
      i++;
    }
    let outString = '';
    if (timeString.length === 0) {
      outString = null;
    } else {
      let timeObj = new Date(parseInt(timeString) * 1000);
      outString += timeObj.getHours().toString().padStart(2, '0') + ':';
      outString += timeObj.getMinutes().toString().padStart(2, '0') + ':';
      outString += timeObj.getSeconds().toString().padStart(2, '0');
    }
    return {
      data: outString,
      nextIndex: i + 1
    };
  }
  //
  // 2) Check if colon string
  //
  // timestamp :prefix command param1 param2 .... :lastParam
  //          ===                                ===
  //
  function _isColonString (start, messageString) {
    if (messageString.charAt(start) === ':') {
      return {
        isColonStr: true,
        nextIndex: start + 1
      };
    } else {
      return {
        isColonStr: false,
        nextIndex: start
      };
    }
  }
  //
  // 3) Command or param string, but not last param
  //
  // timestamp :prefix command param1 param2 .... :lastParam
  //                   ======= ====== ======
  //
  function _extractMidString(start, end, messageString) {
    let i = start;
    let outString = '';
    while ((messageString.charAt(i) !== ' ') && (i <= end)) {
      outString += messageString.charAt(i);
      i++;
    }
    if (outString.length === 0) outString = null;
    return {
      data: outString,
      nextIndex: i + 1
    };
  }
  // 4) Last param string (start with :)
  //
  // timestamp :prefix command param1 param2 .... :lastParam
  //                                               =========
  //
  function _extractFinalString(start, end, messageString) {
    let i = start;
    let outString = '';
    while (i <= end) {
      outString += messageString.charAt(i);
      i++;
    }
    if (outString.length === 0) outString = null;
    return {
      data: outString,
      nextIndex: i + 1
    };
  }
  // nick!user@host.domain
  // nick!user@nn:nn:nn:nn: (ipv6)
  function _extractNickname(inText) {
    if (inText) {
      if ((inText.indexOf('!') >= 0 ) &&
        (inText.indexOf('@') >= 0) &&
        (inText.indexOf('!') < inText.indexOf('@'))) {
        let nick = inText.split('!')[0];
        return nick;
      } else {
        return null;
      }
    } else {
      return null;
    }
  }
  function _extractHostname(inText) {
    if (inText) {
      if ((inText.indexOf('!') >= 0 ) &&
        (inText.indexOf('@') >= 0) &&
        (inText.indexOf('!') < inText.indexOf('@'))) {
        let host = inText.split('!')[1];
        return host;
      } else {
        return null;
      }
    } else {
      return null;
    }
  }
  // ---------------------------------------------------------
  //                   Decode the line
  // --------------------------------------------------------
  // This accepts a Buffer as input with UTF8 characters
  //
  // Format:  [:prefix] command param1 [param2] .... [:lastParam]
  // --------------------------------------------------------
  //
  //  Line composed of 3 parts, prefix, command, params
  //
  let timestamp = null;
  let prefix = null;
  let extNick = null;
  let extHost = null;
  let hostname = null;
  let command = null;
  let params = [];
  //
  // Parsing variables
  let messageString = message.toString();
  let end = messageString.length - 1;
  let temp = {nextIndex: 0};

  // 1) Extract timestamp
  temp = _extractTimeString(temp.nextIndex, end, messageString);
  timestamp = temp.data;

  // 2) Check if prefix exist, if exit parse value, return nextIndex
  temp = _isColonString(temp.nextIndex, messageString);
  if (temp.isColonStr) {
    temp = _extractMidString(temp.nextIndex, end, messageString);
    prefix = temp.data;
    extNick = _extractNickname(temp.data);
    extHost = _extractHostname(temp.data);
  }

  // 3) extract command string
  temp = _extractMidString(temp.nextIndex, end, messageString);
  command = temp.data;

  // 4) Extract optional params, in loop, until all params extracted.
  let done = false;
  while (!done) {
    if (temp.nextIndex > end) {
      done = true;
    } else {
      temp = _isColonString(temp.nextIndex, messageString);
      if (temp.isColonStr) {
        // case of colon string, this is last param
        temp = _extractFinalString(temp.nextIndex, end, messageString);
        params.push(temp.data);
        done = true;
      } else {
        // else not colon string, must be middle param string
        temp = _extractMidString(temp.nextIndex, end, messageString);
        if ((temp.data) && (temp.data.length > 0)) {
          params.push(temp.data);
        } else {
          // zero length must be done
          done = true;
        }
      }
    }
  }
  // console.log(prefix, command, JSON.stringify(params));
  return {
    timestamp: timestamp,
    prefix: prefix,
    nick: extNick,
    host: extHost,
    command: command,
    params: params
  };
}; // _parseIrcMessage()

// :nick!~user@host.domain PRIVMSG #channel :This is channel text message.
function displayChannelMessage(parsedMessage) {
  document.dispatchEvent(new CustomEvent('channel-message',
    {
      bubbles: true,
      detail: {
        parsedMessage: parsedMessage
      }
    }));
} // displayChannelMessage()

// :nick!~user@host.domain PRIVMSG nickname :This is private text message.
function displayPrivateMessage(parsedMessage) {
  document.dispatchEvent(new CustomEvent('private-message',
    {
      bubbles: true,
      detail: {
        parsedMessage: parsedMessage
      }
    }));
} // displayPrivateMessage

function displayNoticeMessage(parsedMessage) {
  function _addText (text) {
    document.getElementById('noticeMessageDisplay').textContent += cleanFormatting(text) + '\n';
    document.getElementById('noticeMessageDisplay').scrollTop =
      document.getElementById('noticeMessageDisplay').scrollHeight;
  }
  // console.log('Priv Msg: ' + JSON.stringify(parsedMessage, null, 2));
  switch(parsedMessage.command) {
    case 'NOTICE':
      // skip last /QUIT notice from null for connection statistics
      if (parsedMessage.nick) {
        if (parsedMessage.params[0] === ircState.nickName) {
          _addText(parsedMessage.timestamp + ' -' +
          parsedMessage.nick + '- ' + parsedMessage.params[1]);
          webState.noticeOpen = true;
          updateDivVisibility();
        }
        // TODO not updated to channels[]
        if (ircState.channels.indexOf(parsedMessage.params[0].toLowerCase()) >= 0) {
          // parsedMessage.nick = 'Notice(parsedMessage.nick)' + ':';
          document.dispatchEvent(new CustomEvent('channel-message',
            {
              bubbles: true,
              detail: {
                parsedMessage: parsedMessage
              }
            }));
        }
      }
      break;
    //
    default:
  }
} // displayNoticeMessage()

function displayWallopsMessage(parsedMessage) {
  function _addText (text) {
    document.getElementById('wallopsMessageDisplay').textContent += cleanFormatting(text) + '\n';
    document.getElementById('wallopsMessageDisplay').scrollTop =
      document.getElementById('wallopsMessageDisplay').scrollHeight;
  }
  // console.log('Priv Msg: ' + JSON.stringify(parsedMessage, null, 2));
  switch(parsedMessage.command) {
    case 'WALLOPS':
      _addText(parsedMessage.timestamp + ' ' +
        parsedMessage.nick + '/Wallops ' + parsedMessage.params[0]);
      webState.wallopsOpen = true;
      updateDivVisibility();
      break;
    //
    default:
  }
} // displayWallopsMessage

function showRawMessageWindow() {
  document.getElementById('rawHiddenElements').removeAttribute('hidden');
  document.getElementById('rawHiddenElementsButton').textContent = '-';
  document.getElementById('rawHeadRightButtons').removeAttribute('hidden');
  // scroll message to most recent
  document.getElementById('rawMessageDisplay').scrollTop =
    document.getElementById('rawMessageDisplay').scrollHeight;
}

function displayRawMessage (inString) {
  let text = cleanFormatting(inString);
  if (webState.rawNoClean) text = inString;
  document.getElementById('rawMessageDisplay').textContent += text + '\n';
  document.getElementById('rawMessageDisplay').scrollTop =
    document.getElementById('rawMessageDisplay').scrollHeight;
};

function displayRawMessageInHex (message) {
  let hexString = '';
  for (let i=0; i<message.length; i++) {
    hexString += message.charCodeAt(i).toString(16).padStart(2, '0') + ' ';
  }
  displayRawMessage(hexString);
};

function _parseCtcpMessage (parsedMessage) {
  function _addNoticeText (text) {
    document.getElementById('noticeMessageDisplay').textContent += text + '\n';
    document.getElementById('noticeMessageDisplay').scrollTop =
      document.getElementById('noticeMessageDisplay').scrollHeight;
  }
  const ctcpDelim = 1;
  let ctcpMessage = parsedMessage.params[1];
  let end = ctcpMessage.length - 1;
  if (ctcpMessage.charCodeAt(0) !== 1) {
    console.log('_parseCtcpMessage() missing CTCP start delimiter');
    return;
  }

  let i = 1;
  let ctcpCommand = '';
  let ctcpRest = '';
  while ((ctcpMessage.charAt(i) !== ' ') && (i <= end)) {
    if (ctcpMessage.charCodeAt(i) !== ctcpDelim) {
      ctcpCommand += ctcpMessage.charAt(i);
    }
    i++;
  }
  ctcpCommand = ctcpCommand.toUpperCase();
  // console.log('ctcpCommand ' + ctcpCommand);
  while ((ctcpMessage.charAt(i) === ' ') && (i <= end)) {
    i++;
  }
  while ((ctcpMessage.charCodeAt(i) !== ctcpDelim) && (i <= end)) {
    ctcpRest += ctcpMessage.charAt(i);
    i++;
  }
  // console.log('ctcpRest ' + ctcpRest);
  //
  //   ACTION
  //
  if (ctcpCommand === 'ACTION') {
    let index = ircState.channels.indexOf(parsedMessage.params[0].toLowerCase());
    if (index >= 0) {
      parsedMessage.params[1] = parsedMessage.nick + ' ' + ctcpRest;
      parsedMessage.nick = '*';
      displayChannelMessage(parsedMessage);
    } else {
      // TODO actino sent as regular PM for now
      parsedMessage.params[1] = ctcpRest;
      displayPrivateMessage(parsedMessage);
    }
  } else {
    _addNoticeText(parsedMessage.timestamp + ' ' +
      parsedMessage.nick + ' to ' + parsedMessage.params[0] +
        ' CTCP Request: ' + ctcpCommand + ' ' + ctcpRest);
    webState.noticeOpen = true;
    updateDivVisibility();
  }
}

// -------------------------------------------------------------
// This function will accept one line of text from IRC server
// First it will check for "UPDATE" request
// else will parse message string into prefix, command, and arugments
// the parse the command.
// -------------------------------------------------------------
function _parseBufferMessage (message) {
  if (message === 'HEARTBEAT' ) {
    // console.log('heartbeat');
    onHeartbeatReceived();
  } else if ( message === 'UPDATE' ) {
    // console.log('update');
    // calling this updates state itself
    getIrcState();
  } else {
    // Internal function
    function _showNotExpiredError(errStr) {
      // current UNIX time in seconds
      let timeNow = new Date();
      let timeNowSeconds = parseInt(timeNow/1000);
      // subtract timestamp from (possibly chached) server messages
      // and show error only if condition not expired
      if (timeNowSeconds - message.split(' ')[0] < errorExpireSeconds) {
        showError(errStr);
      }
    }
    //
    // Display raw message in Hexadecimal
    //
    if (webState.rawShowHex) displayRawMessageInHex(message);
    //
    // Display raw message from IRC server
    //
    displayRawMessage(message);

    // Do not process back echo message prefixed with '-->'.
    if (message.split(' ')[0] === '-->') return;
    // Do not process server info message
    if (message.split(' ')[0] === 'Webserver:') return;
    //
    // parse message into: prefix, command, and param array
    let parsedMessage = _parseIrcMessage(message);
    // console.log('parsedMessage' + JSON.stringify(parsedMessage, null, 2));
    //

    if ((parseInt(parsedMessage.command) >= 400) &&
      (parseInt(parsedMessage.command) <500)) {
      // TODO temporarily remove timestamp with slice, can use better parse.
      _showNotExpiredError(message.slice(12, message.length));
    }
    // Decoding complete, Parse commands
    //
    switch(parsedMessage.command) {
      case 'ERROR':
        // console.log(message.toString());
        break;
      case 'JOIN':
        displayChannelMessage(parsedMessage);
        break;
      case 'MODE':
        if (true) {
          if (parsedMessage.params[0] === ircState.nickName) {
            // Case of me, my MODE has changed
          } else if (channelPrefixChars.indexOf(parsedMessage.params[0].charAt(0)) >= 0) {
            // Case of channel name
            displayChannelMessage(parsedMessage);
          } else {
            console.log('Error message MODE to unknown recipient');
          }
        }
        break;
      case 'NICK':
        displayChannelMessage(parsedMessage);
        break;
      case 'PART':
        displayChannelMessage(parsedMessage);
        break;
      case 'NOTICE':
        if (true) {
          let index = ircState.channels.indexOf(parsedMessage.params[0].toLowerCase());
          if ((index >= 0) && (ircState.channelStates[index].joined)) {
            displayNoticeMessage(parsedMessage);
          }
          if (parsedMessage.params[0] === ircState.nickName) {
            displayNoticeMessage(parsedMessage);
          }
        }
        break;
      case 'PRIVMSG':
        if (true) {
          // first check for CTCP message
          const ctcpDelim = 1;
          if (parsedMessage.params[1].charCodeAt(0) === ctcpDelim) {
            // case of CTCP message
            _parseCtcpMessage(parsedMessage);
          } else {
            // else not a CTCP message
            let index = ircState.channels.indexOf(parsedMessage.params[0].toLowerCase());
            if (index >= 0) {
              displayChannelMessage(parsedMessage);
            } else {
              displayPrivateMessage(parsedMessage);
            }
          }
        }
        break;
      //
      case 'QUIT':
        displayChannelMessage(parsedMessage);
        break;
      case 'TOPIC':
        if (true) {
          if (channelPrefixChars.indexOf(parsedMessage.params[0].charAt(0)) >= 0) {
            // Case of channel name
            displayChannelMessage(parsedMessage);
          } else {
            console.log('Error message MODE to unknown recipient');
          }
        }
        break;
      case 'WALLOPS':
        displayWallopsMessage(parsedMessage);
        break;
      //
      default:
    }
  }
};
//
// -------------------------------------------------
// This function performs API request to obtain
// the full IRC server message cache from the web server
// as an API response. The contents are then parsed as if
// the message were real time.
// -------------------------------------------------
function updateFromCache () {
  // Fire event to clear previous contents
  // TODO this is async, could clear after fetch
  document.dispatchEvent(new CustomEvent('erase-before-reload',
    {
      bubbles: true,
      detail: {
      }
    }));

  let fetchURL = webServerUrl + '/irc/cache';
  let fetchOptions = {
    method: 'GET',
    timeout: 10000,
    // credentials: 'include',
    headers: {
      'Accept': 'application/json'
    }
  };
  fetch(fetchURL, fetchOptions)
    .then( (response) => {
      // console.log(response.status);
      if (response.ok) {
        return response.json();
      } else {
        throw new Error('Fetch status ' + response.status + ' ' + response.statusText);
      }
    })
    .then( (responseArray) => {
      if ((Array.isArray(responseArray)) && (responseArray.length > 0)) {
        // remove dynamically created private message elements to match list
        let privMsgSessionEl = document.getElementById('privateMessageContainerDiv');
        while (privMsgSessionEl.firstChild) {
          privMsgSessionEl.removeChild(privMsgSessionEl.firstChild);
        }
        webState.lastPMNick = '';
        webState.activePrivateMessageNicks = [];
        webState.resizablePrivMsgTextareaIds = [];
        document.getElementById('noticeMessageDisplay').textContent = '';
        document.getElementById('wallopsMessageDisplay').textContent = '';
        document.getElementById('rawMessageDisplay').textContent = '';
        webState.noticeOpen = false;
        webState.wallopsOpen = false;
        for (let i=0; i<responseArray.length; i++) {
          if (responseArray[i].length > 0) {
            _parseBufferMessage(responseArray[i]);
          }
        }
      }
    })
    .catch( (error) => {
      console.log(error);
    });
}; // updateFromCache;
window.addEventListener('update-from-cache', function(event) {
  updateFromCache();
}.bind(this));

// ---------------------------------------------
// Function to connect web socket to web server.
// ---------------------------------------------
function connectWebSocket () {
  // Create WebSocket connection.
  // This replaces temporary dummy variable
  wsocket = new WebSocket(webSocketUrl + '/irc/ws');

  // -----------------------
  // On Open event handler
  // -----------------------
  wsocket.addEventListener('open', function (event) {
    // console.log('Connected to WS Server');
    webState.webConnected = true;
    webState.webConnecting = false;
    resetHeartbeatTimer();
    updateDivVisibility();
    // These will load in parallel asychronously
    getIrcState();
    updateFromCache();
  });

  // -----------------------
  // On Close event handler
  // -----------------------
  wsocket.addEventListener('close', function (event) {
    console.log('Websocket closed code: ' + event.code + ' ' + event.reason);
    if (webState.webConnected) {
      console.log('Web Socket closed.');
      document.getElementById('reconnectStatusDiv').textContent =
        'Web socket connection closed.\n' +
        'Code: ' + event.code + ' ' + event.reason + '\n';
    }
    webState.webConnected = false;
    webState.webConnecting = false;
    setVariablesShowingIRCDisconnected();
    updateDivVisibility();
  });

  // -----------------------
  // On Error event handler
  // -----------------------
  wsocket.addEventListener('error', function (error) {
    console.log('Websocket error');
    // showError('WebSocket error occurred.');
  });

  // -----------------------------------------------------------------------------
  //                  On Data Event handler
  // -----------------------------------------------------------------------------
  // UTF8 data coming in over web socket can break input lines
  // such that message block may not end in a CR-LF or LF.
  // Therefore it is necessary to parse stream character by character,
  // remove the CR, split by LF, but if the message data block
  // does not end in a LF, then wait for next data and merge old and new message.
  // -----------------------------------------------------------------------------


  // -------------------------------------------------------------------------
  // Process Buffer object from socket stream
  //
  // Combine previous message fragment with incoming Buffer of UTF-8 characters
  // Split stream into messages using CR-LF 0x10 0x13 as message delimiter
  // Pass each message to message parse function as type Buffer
  // If left over characters not terminated in CR-LF, save as next fragment
  // -------------------------------------------------------------------------
  var previousBufferFragment = '';
  function parseStreamBuffer (inBuffer) {
    if (!inBuffer) return;
    let data = previousBufferFragment.concat(inBuffer);
    previousBufferFragment = '';
    let len = data.length;
    if (len === 0) return;
    let index = 0;
    let count = 0;
    for (let i=0; i<len; i++) {
      // this is a 8 bit integer
      let charCode = data.charCodeAt(i);
      if ((charCode !== 10) && (charCode !== 13)) {
        // valid message character
        count = count + 1;
      } else {
        // case of CR or LF as message separator
        if (count > 0) {
          let message = data.slice(index, index + count);
          _parseBufferMessage(message);
        }
        index = i + 1;
        count = 0;
      }
    }
    if (count > 0) {
      previousBufferFragment = data.slice(index, index + count);
    }
  };


  // -----------------------------------
  // Listen for messages on websocket
  // -----------------------------------
  wsocket.addEventListener('message', function (event) {
    parseStreamBuffer(event.data);
  });
};

// --------------------------------------------------
// Internal function to send message to web server
// by REST API POST, which will forward it to
// the IRC server for evaluation
//
// Route /message
// --------------------------------------------------
function _sendIrcServerMessage (message) {
  if (!checkConnect(2)) return;

  let body = {
    message: message
  };
  let fetchURL = webServerUrl + '/irc/message';
  let fetchOptions = {
    method: 'POST',
    timeout: 10000,
    // credentials: 'include',
    headers: {
      'Content-type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(body)
  };
  fetch(fetchURL, fetchOptions)
    .then( (response) => {
      // console.log(response.status);
      if (response.ok) {
        return response.json();
      } else {
        if (response.status === 403) window.location.href = '/login';
        throw new Error('Fetch status ' + response.status + ' ' + response.statusText);
      }
    })
    .then( (responseJson) => {
      // console.log(JSON.stringify(responseJson, null, 2));
      if (responseJson.error) {
        showError(responseJson.message);
      }
    })
    .catch( (error) => {
      console.log(error);
    });
} // _sendIrcServerMessage

// --------------------------------------
// Function to manage re-connection of
// disconnected web socket
// --------------------------------------
function reconnectWebSocketAfterDisconnect() {
  let statusURL = webServerUrl + '/status';
  let secureStatusURL = webServerUrl + '/secure';
  let fetchOptions = {
    method: 'GET',
    // credentials: 'include',
    timeout: 10000,
    headers: {
      'Accept': 'application/json'
    }
  };
  //
  // ----------------------------------------------
  // Step 1, make non-authenticated (no cookie)
  // GET to see if server is up and internet is connected.
  // ----------------------------------------------
  fetch(statusURL, fetchOptions)
    .then( (response) => {
      // console.log(response.status);
      if (response.ok) {
        return response.json();
      } else {
        throw new Error('Fetch status ' + response.status + ' ' + response.statusText);
      }
    })
    .then( (responseJson) => {
      // console.log(JSON.stringify(responseJson));
      document.getElementById('reconnectStatusDiv').textContent +=
        'Server found, Checking authoriztion.\n';
      //
      // --------------------------------------
      // Step 2, now-make an authorized GET with
      // valid cookie to make sure cookie is not
      // expired.
      // --------------------------------------
      fetch(secureStatusURL, fetchOptions)
        .then( (response) => {
          // console.log(response.status);
          // if (response.status === 403) {
          //   window.location.href = '/login';
          //   throw new Error('Fetch status ' + response.status + ' ' + response.statusText);
          // }
          if (response.ok) {
            return response.json();
          } else {
            if (response.status === 403) window.location.href = '/login';
            throw new Error('Fetch status ' + response.status + ' ' + response.statusText);
          }
        })
        .then( (responseJson) => {
          // console.log(JSON.stringify(responseJson));
          document.getElementById('reconnectStatusDiv').textContent +=
            'Authorizton confirmed, opening web socket.\n';
          //-------------------------------------------
          // Step 3, initiate the 10 second auth window
          // for the web socket to conenct.
          //-------------------------------------------
          initWebSocketAuth(function(err, data) {
            if (err) {
              showError('Error connecting web socket');
              console.log(err);
            } else {
              // --------------------------------------
              // step 4 - 10 second auth window valid
              // Perform a HTTP Upgrade request
              // with cookie to authorize.
              // --------------------------------------
              setTimeout(function() {
                connectWebSocket();
              }.bind(this), 100);
            }
          });
        })
        .catch( (error) => {
          console.log(error);
          document.getElementById('reconnectStatusDiv').textContent +=
            'Error: Error checking authorization\n';
          webState.webConnected = false;
          webState.webConnecting = false;
          updateDivVisibility();
        });
    })
    .catch( (error) => {
      console.log(error);
      document.getElementById('reconnectStatusDiv').textContent +=
        'Error: No internet or server down\n';
      webState.webConnected = false;
      webState.webConnecting = false;
      updateDivVisibility();
    });
}

// ---------------------------------------------
// Upon page load, initiate web socket auth
// from web server, then connect web socket
// Includes small delay timer
//
// This is called at the end of all JavaScript load
// ---------------------------------------------
function firstWebSocketConnectOnPageLoad() {
  if ((!webState.webConnected) && (!webState.webConnecting)) {
    webState.webConnecting = true;
    initWebSocketAuth(function(err, data) {
      if (err) {
        showError('Error connecting web socket');
        console.log(err);
      } else {
        setTimeout(function() {
          connectWebSocket();
        }.bind(this), 100);
      }
    });
  }
}

// ------------------------------------------------
// Button to initiate manual web socket reconnect
// ------------------------------------------------
document.getElementById('manualWebSocketReconnectButton').addEventListener('click', function() {
  if ((!webState.webConnected) && (!webState.webConnecting)) {
    webState.webConnectOn = true;
    webState.webConnecting = true;
    document.getElementById('reconnectStatusDiv').textContent +=
      'Reconnect to web server initiated (Manual)\n';
    reconnectWebSocketAfterDisconnect();
  }
});

// ------------------------------------------------
// Button to stop manual web socket reconnect
// ------------------------------------------------
document.getElementById('stopWebSocketReconnectButton').addEventListener('click', function() {
  if (!webState.webConnected) {
    webState.webConnectOn = false;
    webState.webConnecting = false;
    document.getElementById('reconnectStatusDiv').textContent =
      'Reconnect disabled\n';
  }
});


//---------------------------------
// Timer called once per second to
// manage web-socket reconnection.
//---------------------------------
var wsReconnectCounter = 0;
var wsReconnectTimer = 0;
function reconnectTimerTickHandler() {
  // If disabled, or if connection successful, reset counter/timer
  if ((!webState.webConnectOn) || (webState.webConnected)) {
    wsReconnectCounter = 0;
    wsReconnectTimer = 0;
    return;
  }

  // increment timer
  wsReconnectTimer++;
  // connection in progress, skip.
  if (webState.webConnecting) return;


  // first time on first timer tick (immediately)
  if (wsReconnectCounter === 0) {
    if (wsReconnectTimer > 0) {
      webState.webConnecting = true;
      wsReconnectTimer = 0;
      wsReconnectCounter++;
      document.getElementById('reconnectStatusDiv').textContent +=
        'Reconnect to web server initiated (Timer)\n';
      reconnectWebSocketAfterDisconnect();
    }
    return;
  } else if (wsReconnectCounter === 1) {
    // then second try in 5 seconds
    if (wsReconnectTimer > 5) {
      webState.webConnecting = true;
      wsReconnectTimer = 0;
      wsReconnectCounter++;
      document.getElementById('reconnectStatusDiv').textContent +=
        'Reconnect to web server initiated (Timer)\n';
      reconnectWebSocketAfterDisconnect();
    }
    return;
  } else if (wsReconnectCounter > 10) {
    // Stop at the limit
    webState.webConnectOn = false;
    if (wsReconnectCounter === 11) {
      // only do the message one time
      document.getElementById('reconnectStatusDiv').textContent +=
        'Reconnect disabled\n';
    }
    return;
  } else {
    if (wsReconnectTimer > 15) {
      webState.webConnecting = true;
      wsReconnectTimer = 0;
      wsReconnectCounter++;
      document.getElementById('reconnectStatusDiv').textContent +=
        'Reconnect to web server initiated (Timer)\n';
      reconnectWebSocketAfterDisconnect();
    }
    return;
  }
  return;
}

// ----------------- API requests ---------------------------

// ------------------------
// Next Server Button
// ------------------------
document.getElementById('cycleNextServerButton').addEventListener('click', function() {
  // Are we connected to web server?
  if (ircState.ircConnected) {
    showError('Can not change servers while connected');
    return;
  }

  let fetchURL = webServerUrl + '/irc/server';
  let fetchOptions = {
    method: 'POST',
    // credentials: 'include',
    timeout: 10000,
    headers: {
      'Content-type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({index: -1})
  };

  fetch(fetchURL, fetchOptions)
    .then( (response) => {
      // console.log(response.status);
      if (response.ok) {
        return response.json();
      } else {
        throw new Error('Fetch status ' + response.status + ' ' + response.statusText);
      }
    })
    .then( (responseJson) => {
      // console.log(JSON.stringify(responseJson, null, 2));
      if (responseJson.error) {
        showError(responseJson.message);
      }
    })
    .catch( (error) => {
      console.log(error);
      showError(error.toString());
    });
}); // connectButton
// -------------------------
// Connect Button Handler
// -------------------------
document.getElementById('connectButton').addEventListener('click', function() {
  // Are we connected to web server?
  if (!checkConnect(1)) return;
  // Is web server already connected to IRC?
  if (ircState.ircConnected) {
    showError('Error: Already connected to IRC server');
    return;
  }

  if (document.getElementById('nickNameInputId').value.length < 1) {
    showError('Invalid nick name.');
    return;
  }

  let connectObject = {};
  connectObject.nickName = document.getElementById('nickNameInputId').value;
  connectObject.userName = document.getElementById('userNameInputId').value;
  connectObject.realName = document.getElementById('userNameInputId').value;
  connectObject.userMode = document.getElementById('userModeInputId').value;

  let fetchURL = webServerUrl + '/irc/connect';
  let fetchOptions = {
    method: 'POST',
    // credentials: 'include',
    timeout: 10000,
    headers: {
      'Content-type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(connectObject)
  };

  fetch(fetchURL, fetchOptions)
    .then( (response) => {
      // console.log(response.status);
      if (response.ok) {
        return response.json();
      } else {
        if (response.status === 403) window.location.href = '/login';
        throw new Error('Fetch status ' + response.status + ' ' + response.statusText);
      }
    })
    .then( (responseJson) => {
      // console.log(JSON.stringify(responseJson, null, 2));
      if (responseJson.error) {
        showError(responseJson.message);
      }
    })
    .catch( (error) => {
      console.log(error);
    });
}); // connectButton

// ----------------------------------
// Force Disconnect Button Handler
//
// Route /disconnect
// ----------------------------------
document.getElementById('disconnectButton').addEventListener('click', function() {
  console.log('Disconnect button pressed.');
  let fetchURL = webServerUrl + '/irc/disconnect';
  let fetchOptions = {
    method: 'POST',
    timeout: 10000,
    // credentials: 'include',
    headers: {
      'Content-type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({})
  };
  fetch(fetchURL, fetchOptions)
    .then( (response) => {
      // console.log(response.status);
      if (response.ok) {
        return response.json();
      } else {
        throw new Error('Fetch status ' + response.status + ' ' + response.statusText);
      }
    })
    .then( (responseJson) => {
      console.log(JSON.stringify(responseJson, null, 2));
      if (responseJson.error) {
        showError(responseJson.message);
      }
    })
    .catch( (error) => {
      console.log(error);
    });
}); // disconnectButton

// ------------------------------------------------------
// Quit Button handler (Send QUIT message to IRC server)
// ------------------------------------------------------
document.getElementById('quitButton').addEventListener('click', function() {
  _sendIrcServerMessage('QUIT :QUIT command');
});

document.getElementById('hideLoginSectionButton').addEventListener('click', function() {
  if (document.getElementById('hideLoginSection').hasAttribute('hidden')) {
    document.getElementById('hideLoginSection').removeAttribute('hidden');
    document.getElementById('hideLoginSectionButton').textContent = '-';
  } else {
    document.getElementById('hideLoginSection').setAttribute('hidden', '');
    document.getElementById('hideLoginSectionButton').textContent = '+';
  }
});

document.getElementById('webLogoutButton').addEventListener('click', function() {
  if ((ircState.ircConnected) && (webState.webConnected)) {
    document.getElementById('logoutConfirmDiv').removeAttribute('hidden');
  } else {
    window.location.href='/logout';
  }
});
document.getElementById('cancelLogoutConfirmButton').addEventListener('click', function() {
  document.getElementById('logoutConfirmDiv').setAttribute('hidden', '');
});
