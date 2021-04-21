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


// ----------------------------------------------------------------
//    Source Files
//
// These are all bundled to webclient.js for deployment
//
// webclient.js - Global state variables, update API, rendering
// webclient2.js - Parse IRC messages from backend/IRC server
// webclient3.js - Websocket Management
// webclient4.js - API requests
// webclient5.js - User Input Text Command Parser
// webclient6.js - IRC Channel Functions
// webclient7.js - Private Message Functions
// webclient8.js - Notice and WallOps functions
// webclient9.js - Display raw server messages and program info
// ----------------------------------------------------------------
//
'use strict';

// --------------------
// Global variables
// --------------------
//
const channelPrefixChars = '@#+!';
const nicknamePrefixChars = '~&@%+';
const nickChannelSpacer = ' | ';

// ----------------------------------------------------------
// Do not edit ircState, represents state on web server end
// Object updated from getIrcState() fetch request
//
// ircState represents the state of the IRC connection
//    within the backend web server.
//
//   R E A D   O N L Y
//
var ircState = {
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

  times: {
    programRun: 0,
    ircConnect: 0
  },

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
webState.websocketCount = 0;
webState.noticeOpen = false;
webState.wallopsOpen = false;
webState.viewRawMessages = false;
webState.showRawInHex = false;
webState.showCommsMessages = false;

// Some IRC channel local variables (most in ircState)
webState.channels = [];
webState.channelStates = [];
webState.resizableChannelTextareaIds = [];
webState.resizableChanSplitTextareaIds = [];
webState.resizableSendButtonTextareaIds = [];
// Private message variables
webState.lastPMNick = '';
webState.activePrivateMessageNicks = [];
webState.resizablePrivMsgTextareaIds = [];
webState.resizableSendButtonPMTextareaIds = [];
webState.times = {webConnect: 0};
webState.count = {webConnect: 0};

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

// -------------------------------------------
// Default beep sound (Max 1 per 5 seconds)
// -------------------------------------------
// 1300 Hz 0.75 Amplitude 0.250 sec
const beep1 = new Audio('sounds/short-beep1.mp3');
// 850 Hz 0.75 Amplitude 0.400 Sec
const beep2 = new Audio('sounds/short-beep2.mp3');

var beep1InhibitTimer = 0;
var beep2InhibitTimer = 0;

function beepTimerTick() {
  if (beep1InhibitTimer > 0) beep1InhibitTimer--;
  if (beep2InhibitTimer > 0) beep2InhibitTimer--;
}

function inhibitBeep(seconds) {
  // used for reload/update
  beep1InhibitTimer = seconds;
  beep2InhibitTimer = seconds;
}

function playBeep1Sound () {
  if (beep1InhibitTimer === 0) {
    beep1.play();
    beep1InhibitTimer = 5;
  }
}

function playBeep2Sound () {
  if (beep2InhibitTimer === 0) {
    beep2.play();
    beep2InhibitTimer = 5;
  }
}
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

// Return UNIX timestamp in seconds
function timestamp () {
  let now = new Date;
  return parseInt(now.valueOf() / 1000).toString();
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
  document.getElementById('hiddenInfoDiv').removeAttribute('hidden');
  document.getElementById('infoOpenCloseButton').textContent = '-';
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
  document.getElementById('hiddenInfoDiv').setAttribute('hidden', '');
  document.getElementById('infoOpenCloseButton').textContent = '+';
});

// --------------------------------------------------------
// Update variables to indicate disconnected state
//
// Called by getIrcState() and heartbeatTimerTickHandler()
// --------------------------------------------------------
function setVariablesShowingIRCDisconnected () {
  document.getElementById('headerUser').textContent = '';
  document.getElementById('headerServer').textContent = '';

  document.dispatchEvent(new CustomEvent('cancel-beep-sounds', {bubbles: true}));

  let channelContainerDivEl = document.getElementById('channelContainerDiv');
  while (channelContainerDivEl.firstChild) {
    channelContainerDivEl.removeChild(channelContainerDivEl.firstChild);
  }
  webState.channels = [];
  webState.channelStates = [];
  webState.resizableChannelTextareaIds = [];
  webState.resizableChanSplitTextareaIds = [];
  webState.resizableSendButtonTextareaIds = [];
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
// Websocket watchdog timer
//
// Case 1, socket still connected, but HEARTBEAT stopped
// After increment second reaches limit, --> try to close socket with error code
// If unsucccessful
// Case 2, socket unresponsive to close, but no closed event triggered
// After increment second to limit + 2 second,
// Set applicatin to disconnected state.
//
function heartbeatTimerTickHandler () {
  // console.log('tick');
  heartbeatUpCounter++;
  if (webState.webConnected) {
    if (heartbeatUpCounter > heartbeatExpirationTimeSeconds + 1) {
      console.log('HEARTBEAT timeout + 2 seconds, socket unresponsive, forcing disconnect');
      document.getElementById('reconnectStatusDiv').textContent +=
        'Web socket connection timeout, socket unresponsive, force disconnect\n';
      webState.webConnected = false;
      webState.webConnecting = false;
      setVariablesShowingIRCDisconnected();
      updateDivVisibility();
    } else if (heartbeatUpCounter === heartbeatExpirationTimeSeconds) {
      console.log('HEARTBEAT timeout + 0 seconds , attempting to closing socket');
      document.getElementById('reconnectStatusDiv').textContent +=
        'Web socket connection timeout, attempting to close\n';
      if (wsocket) {
        // Closing the web socket will generate a 'close' event.
        wsocket.close(3000, 'Heartbeat timeout');
      }
    }
  }
};

// called 1/second by timer tick
function updateElapsedTimeDisplay () {
  function toTimeString(seconds) {
    let remainSec = seconds;
    let day = 0;
    let hour = 0;
    let min = 0;
    let sec = 0;
    day = parseInt(remainSec / 86400);
    remainSec -= day * 86400;
    hour = parseInt(remainSec / 3600);
    remainSec -= hour * 3600;
    min = parseInt(remainSec / 60);
    sec = remainSec - (min * 60);
    return day.toString().padStart(3, ' ') + ' D ' +
      hour.toString().padStart(2, '0') + ':' +
      min.toString().padStart(2, '0') + ':' +
      sec.toString().padStart(2, '0');
  }

  let timePreEl = document.getElementById('elapsedTimeDiv');
  let now = timestamp();
  let timeStr = '';
  if (webState.webConnected) {
    timeStr += 'Web Connected: ' + toTimeString(now - webState.times.webConnect) +
      ' (' + webState.count.webConnect.toString() + ')\n';
  } else {
    timeStr += 'Web Connected: N/A\n';
  }
  if (ircState.ircConnected) {
    timeStr += 'IRC Connected: ' + toTimeString(now - ircState.times.ircConnect) +
      ' (' + ircState.count.ircConnect.toString() + ')\n';
  } else {
    timeStr += 'IRC Connected: N/A\n';
  }
  if (webState.webConnected) {
    timeStr += 'Backend Start: ' + toTimeString(now - ircState.times.programRun);
  } else {
    timeStr += 'Backend Start: N/A';
  }
  timePreEl.textContent = timeStr;
}

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
        document.getElementById('ircServerNameInputId').value = ircState.ircServerName;
        document.getElementById('ircServerAddrInputId').value = ircState.ircServerHost;
        document.getElementById('ircServerPortInputId').value = ircState.ircServerPort;
        if (ircState.ircTLSEnabled) {
          document.getElementById('ircServerTlsCheck').setAttribute('checked', '');
        } else {
          document.getElementById('ircServerTlsCheck').removeAttribute('checked');
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

      // If not hidden up date variables JSON
      // also updated in getElementById('variablesButtonId').addEventListener('click'
      if (!document.getElementById('variablesDivId').hasAttribute('hidden')) {
        document.getElementById('variablesPreId').textContent =
        'ircState = ' + JSON.stringify(ircState, null, 2) + '\n\n' +
        'webState = ' + JSON.stringify(webState, null, 2);
      }

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

// document.addEventListener('irc-state-changed', function(event) {
//   console.log('Event: irc-state-changed, detail:' + JSON.stringify(event.detail));
// });
