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
// webclient02.js - Parse IRC messages from backend/IRC server
// webclient03.js - Websocket Management
// webclient04.js - IRC Connect/Disconnect API requests
// webclient05.js - User Input Text Command Parser
// webclient06.js - IRC Channel Functions
// webclient07.js - Private Message Functions
// webclient08.js - Notice and WallOps functions
// webclient09.js - Display formatted server messages and program info
// webclient10.js - Fetch handlers and screen resize events
//
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
const pmNameSpacer = ' - ';
// Time during which incoming messages do not trigger activity icon
const activityIconInhibitTimerValue = 10;
const cacheReloadString = '-----IRC Cache Reload-----';
const cacheErrorString = '-----IRC Cache Error-----';
// CSRF token to be included with POST requests
const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

// ----------------------------------------------------------
// Do not edit ircState contents from within browser.
//
// Object updated from getIrcState() fetch request
//
// ircState represents the state of the IRC connection
//    within the backend web server.
//
//   R E A D   O N L Y
//
// ----------------------------------------------------------
var ircState = {
  ircConnectOn: false,
  ircConnecting: false,
  ircConnected: false,
  ircRegistered: false,
  ircIsAway: false,
  ircAutoReconnect: false,
  lastPing: '0.000',

  ircServerName: '',
  ircServerHost: '',
  ircServerPort: 6667,
  ircTLSEnabled: false,
  ircServerIndex: 0,
  ircServerPrefix: '',
  channelList: [],

  nickName: '',
  userName: '',
  realName: '',
  userMode: '',
  userHost: '',

  channels: [],
  channelStates: [],

  progVersion: '0.0.0',
  progName: '',

  times: {
    programRun: 0,
    ircConnect: 0
  },
  count: {
    ircConnect: 0,
    ircConnectError: 0
  },
  websocketCount: 0
};
// -------------------------------------------------------------

document.getElementById('webConnectIconId').removeAttribute('connected');
document.getElementById('ircConnectIconId').removeAttribute('connected');
document.getElementById('webConnectIconId').removeAttribute('connecting');
document.getElementById('ircConnectIconId').removeAttribute('connecting');

// ---------------------------------------------------
// webState represents state of web page in browser
// ---------------------------------------------------
const webState = {};
webState.loginUser = {};
webState.webConnectOn = true;
webState.webConnected = false;
webState.webConnecting = false;
webState.ircConnecting = false;
webState.websocketCount = 0;
webState.noticeOpen = false;
webState.wallopsOpen = false;
webState.viewRawMessages = false;
webState.showRawInHex = false;
webState.showCommsMessages = false;
webState.lastIrcServerIndex = -1;

// Some IRC channel local variables (most in ircState)
webState.channels = [];
webState.channelStates = [];
// Private message variables
webState.lastPMNick = '';
webState.activePrivateMessageNicks = [];
webState.times = { webConnect: 0 };
webState.count = {
  webConnect: 0,
  webStateCalls: 0
};
webState.cacheReloadInProgress = false;

//
// Ping statistics
//
webState.lag = {
  last: 0,
  min: 9999,
  max: 0
};

//
// dynamic page layout, these values overwritten dynamically
//
webState.dynamic = {
  inputAreaCharWidthPx: null,
  inputAreaSideWidthPx: null,
  sendButtonWidthPx: null,
  // commonMargin represents a space on iPHone right side thumb scroll area
  commonMargin: 50,
  lastDevicePixelRatio: 1,
  bodyClientWidth: document.querySelector('body').clientWidth,
  lastClientWidth: document.querySelector('body').clientWidth
};
// only if browser support devicePixelRatio
if (window.devicePixelRatio) {
  webState.dynamic.lastDevicePixelRatio = window.devicePixelRatio;
}

// -------------------------------
// Build URL from page location
// -------------------------------
let webServerUrl = 'https://';
let webSocketUrl = 'wss://';
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
//
// new Audio returns a Promise
//
// 1300 Hz 0.75 Amplitude 0.250 sec
const beep1 = new Audio('sounds/short-beep1.mp3');
// 850 Hz 0.75 Amplitude 0.400 Sec
const beep2 = new Audio('sounds/short-beep2.mp3');
// 1175 Hz 0.75 Amplitude 0.250 Sec
const beep3 = new Audio('sounds/short-beep3.mp3');

let beep1InhibitTimer = 0;
let beep2InhibitTimer = 0;
let beep3InhibitTimer = 0;

function beepTimerTick () {
  if (beep1InhibitTimer > 0) beep1InhibitTimer--;
  if (beep2InhibitTimer > 0) beep2InhibitTimer--;
  if (beep3InhibitTimer > 0) beep3InhibitTimer--;
}

function inhibitBeep (seconds) {
  // used for reload/update
  beep1InhibitTimer = seconds;
  beep2InhibitTimer = seconds;
  beep3InhibitTimer = seconds;
}

const audioPromiseErrorStr =
  'Browser policy has blocked Audio.play() ' +
  'because user must interact with page or manually play sound first.';

function playBeep1Sound () {
  if (beep1InhibitTimer === 0) {
    // Note: Chrome requires user interact with page before playing media
    // Chrome on IOS requires manually selecting button to play sound first time.
    // Else throws a DOMException violating media policy
    beep1.play()
      .then(function () {
        // upon successful play sound, then hide the button
        document.getElementById('enableAudioButton').setAttribute('hidden', '');
      })
      .catch(function (error) {
        if (error.name === 'NotAllowedError') {
          console.info('playBeep1Sound() ' + audioPromiseErrorStr);
        } else {
          console.error(error);
        }
      });
    beep1InhibitTimer = 5;
  }
}

function playBeep2Sound () {
  if (beep2InhibitTimer === 0) {
    beep2.play().catch(function (error) {
      if (error.name === 'NotAllowedError') {
        // Duplicate: use error message from beep1
        // console.info('playBeep2Sound() ' + audioPromiseErrorStr);
      } else {
        console.error(error);
      }
    });
    beep2InhibitTimer = 5;
  }
}
function playBeep3Sound () {
  if (beep3InhibitTimer === 0) {
    beep3.play().catch(function (error) {
      if (error.name === 'NotAllowedError') {
        console.info('playBeep3Sound() ' + audioPromiseErrorStr);
      } else {
        console.error(error);
      }
    });
    beep3InhibitTimer = 5;
  }
}

//
// Check if browser localStorage contains
// at lease 1 enabled audio beep for channel text
// return true = Enabled
//
function areBeepsConfigured () {
  let isAnyBeepEnabled = false;
  let beepEnableChanArray = null;
  beepEnableChanArray = JSON.parse(window.localStorage.getItem('beepEnableChanArray'));
  if ((beepEnableChanArray) &&
    (Array.isArray(beepEnableChanArray))) {
    if (beepEnableChanArray.length > 0) {
      for (let i = 0; i < beepEnableChanArray.length; i++) {
        if (beepEnableChanArray[i].beep1) isAnyBeepEnabled = true;
        if (beepEnableChanArray[i].beep2) isAnyBeepEnabled = true;
        if (beepEnableChanArray[i].beep3) isAnyBeepEnabled = true;
      }
    }
  }
  return isAnyBeepEnabled;
} // areBeepsConfigured()

// ---------------------------------------------------------------------------------------
// This is to address the case of audio beep previously enabled before page load.
// The checkbox state for channel beep messages is restored from browser localStorage.
// However, the browser will not play audio media unless audio is initiated by a user event.
// The following function is called by a user interaction event.
// The function plays the audio in direct response to user interaction to enable the audio.
// This result of this function is to leave channel message beep sounds capable of function.
// ---------------------------------------------------------------------------------------
function userInitiatedAudioPlay () {
  document.getElementById('enableAudioButton').setAttribute('hidden', '');
  // check if beep enabled in window.localStorage
  if (areBeepsConfigured()) {
    playBeep2Sound();
    setTimeout(playBeep1Sound, 500);
    // beep3 not included because it is private message and not auto-eabled.
  }
} // userInitiatedAudioPlay()
// click event for buttion in header bar
document.getElementById('enableAudioButton').addEventListener('click', userInitiatedAudioPlay);
// Show button to enable sound in case browser localStorage has enabled beeps
if (areBeepsConfigured()) {
  document.getElementById('enableAudioButton').removeAttribute('hidden');
}

// --------------------------
// Error display functions
// --------------------------

const errorExpireSeconds = 5;
let errorRemainSeconds = 0;

function clearError () {
  const errorDivEl = document.getElementById('errorDiv');
  errorDivEl.setAttribute('hidden', '');
  const errorContentDivEl = document.getElementById('errorContentDiv');
  while (errorContentDivEl.firstChild) {
    errorContentDivEl.removeChild(errorContentDivEl.firstChild);
  }
  errorRemainSeconds = 0;
};

function showError (errorString) {
  const errorDivEl = document.getElementById('errorDiv');
  errorDivEl.removeAttribute('hidden');
  const errorContentDivEl = document.getElementById('errorContentDiv');
  const errorMessageEl = document.createElement('div');
  errorMessageEl.textContent = errorString || 'Error: unknown error (2993)';
  errorContentDivEl.appendChild(errorMessageEl);
  errorRemainSeconds = errorExpireSeconds;
}

document.addEventListener('show-error-message', function (event) {
  showError(event.detail.message);
});

// ------------------------------------
// Click error to remove error display
// ------------------------------------
document.getElementById('errorDiv').addEventListener('click', function () {
  clearError();
});

// ------------------------------------------------
// Error message timer tick handler
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

// -----------------------------------------
// Return current UNIX timestamp in seconds
// -----------------------------------------
function unixTimestamp () {
  const now = new Date();
  return parseInt(now.valueOf() / 1000);
};

function clearLastZoom () {
  const now = unixTimestamp();
  // temporary comment debug zoom refresh issue
  // window.localStorage.setItem('lastZoom', JSON.stringify({
  //   timestamp: now,
  //   zoomType: null,
  //   zoomValue: null
  // }));
}

// --------------------------------------
// Check if connected, both web and irc
// 1 = browser connect to web server only
// 2 = require both web and IRC
// 3 = require both web and IRC and Registered
// --------------------------------------
function checkConnect (code) {
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

// --------------------------------------------------
// Open server message window if it is hidden
//     (used in multiple modules)
// --------------------------------------------------
function showRawMessageWindow () {
  document.getElementById('rawHiddenElements').removeAttribute('hidden');
  document.getElementById('rawHiddenElementsButton').textContent = '-';
  document.getElementById('rawHeadRightButtons').removeAttribute('hidden');
  // scroll message to most recent
  if (!webState.cacheReloadInProgress) {
    document.getElementById('rawMessageDisplay').scrollTop =
      document.getElementById('rawMessageDisplay').scrollHeight;
  }
} // showRawMessageWindow()
// --------------------------------------------------
// Hide server message window if it is hidden
// --------------------------------------------------
function hideRawMessageWindow () {
  document.getElementById('rawHiddenElements').setAttribute('hidden', '');
  document.getElementById('rawHiddenElementsButton').textContent = '+';
  document.getElementById('rawHeadRightButtons').setAttribute('hidden', '');
  document.getElementById('hiddenDebugDiv').setAttribute('hidden', '');
  document.getElementById('variablesDivId').setAttribute('hidden', '');
  document.getElementById('showDebugButton').textContent = 'More...';
} // hideRawMessageWindow()

// ----------------------------------------------
// Functions to handle activity indicator icons
// ----------------------------------------------
function setNotActivityIcon (index) {
  document.getElementById('notMsgIconId').removeAttribute('hidden');
}
// -1 indicates icon is available to be shown
let lastPmActivityIconIndex = -1;
function setPmActivityIcon (index) {
  if (lastPmActivityIconIndex === -1) {
    lastPmActivityIconIndex = index;
    document.getElementById('pmMsgIconId').removeAttribute('hidden');
  }
  // else ignore request
}
// -1 indicates icon is available to be shown
let lastChanActivityIconIndex = -1;
function setChanActivityIcon (index) {
  if (lastChanActivityIconIndex === -1) {
    lastChanActivityIconIndex = index;
    document.getElementById('chanMsgIconId').removeAttribute('hidden');
  }
  // else ignore request
}
function resetNotActivityIcon (index) {
  document.getElementById('notMsgIconId').setAttribute('hidden', '');
}
function resetPmActivityIcon (index) {
  if (index === -1) {
    // code -1 match any channel
    lastPmActivityIconIndex = -1;
    document.getElementById('pmMsgIconId').setAttribute('hidden', '');
  } else if (index === lastPmActivityIconIndex) {
    // Channel can only clear own icon
    lastPmActivityIconIndex = -1;
    document.getElementById('pmMsgIconId').setAttribute('hidden', '');
  }
  // else ignore request
}
function resetChanActivityIcon (index) {
  if (index === -1) {
    // code -1 match any channel
    lastChanActivityIconIndex = -1;
    document.getElementById('chanMsgIconId').setAttribute('hidden', '');
  } else if (index === lastChanActivityIconIndex) {
    // Channel can only clear own icon
    lastChanActivityIconIndex = -1;
    document.getElementById('chanMsgIconId').setAttribute('hidden', '');
  }
  // else ignore request
}
// --------------------------
// Clear message activity ICONs by tapping icon
// --------------------------
document.getElementById('notMsgIconId').addEventListener('click', function () {
  resetNotActivityIcon();
});
document.getElementById('pmMsgIconId').addEventListener('click', function () {
  resetPmActivityIcon(-1);
});
document.getElementById('chanMsgIconId').addEventListener('click', function () {
  resetChanActivityIcon(-1);
});

// Some initialization of div visibility at laod time
// Hidden divs to allow <noscrpit> when not javascript
// In case of javascript, show them
document.getElementById('annunciatorBackgroundDivId').removeAttribute('hidden');
document.getElementById('annunciatiorDivId').removeAttribute('hidden');
document.getElementById('scrollableDivId').removeAttribute('hidden');
hideRawMessageWindow();
// --------------------------------------------------------------
// Single function to visibility of all display divs on the page
// --------------------------------------------------------------
function updateDivVisibility () {
  // return; // uncomment to show hidden divs.
  if (webState.webConnected) {
    document.getElementById('webDisconnectedVisibleDiv').setAttribute('hidden', '');
    document.getElementById('webDisconnectedHiddenDiv1').removeAttribute('hidden');
    document.getElementById('webDisconnectedHiddenDiv2').removeAttribute('hidden');
    document.getElementById('reconnectStatusDiv').textContent = '';
    document.getElementById('webConnectIconId').setAttribute('connected', '');
    document.getElementById('webConnectIconId').removeAttribute('connecting');
    document.getElementById('rawMessageInputId').removeAttribute('disabled');
    document.getElementById('sendRawMessageButton').removeAttribute('disabled');
    document.getElementById('loadFromCacheButton').removeAttribute('disabled');
    if (ircState.ircConnected) {
      document.getElementById('cyclePrevServerButton').setAttribute('disabled', '');
      document.getElementById('cycleNextServerButton').setAttribute('disabled', '');
      document.getElementById('editServerListButton').setAttribute('disabled', '');
      document.getElementById('ircConnectIconId').removeAttribute('unavailable');
      document.getElementById('waitConnectIconId').setAttribute('hidden', '');
      if (ircState.ircRegistered) {
        document.getElementById('ircConnectIconId').removeAttribute('connecting');
        document.getElementById('ircConnectIconId').setAttribute('connected', '');
      } else {
        document.getElementById('ircConnectIconId').setAttribute('connecting', '');
        document.getElementById('ircConnectIconId').removeAttribute('connected');
      }
      if (ircState.ircIsAway) {
        document.getElementById('ircIsAwayIconId').removeAttribute('hidden');
      } else {
        document.getElementById('ircIsAwayIconId').setAttribute('hidden', '');
      }
      document.getElementById('hideLoginSection').setAttribute('hidden', '');
      document.getElementById('hideLoginSectionButton').textContent = '+';
      document.getElementById('nickNameInputId').setAttribute('disabled', '');
      // document.getElementById('userNameInputId').setAttribute('disabled', '');
      document.getElementById('realNameInputId').setAttribute('disabled', '');
      document.getElementById('userModeInputId').setAttribute('disabled', '');
      document.getElementById('connectButton').setAttribute('disabled', '');
      document.getElementById('quitButton').removeAttribute('disabled');
      document.getElementById('userAwayMessageId').removeAttribute('disabled');
      document.getElementById('setAwayButton').removeAttribute('disabled');
      document.getElementById('setBackButton').removeAttribute('disabled');
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
      if ((webState.ircConnecting) || (ircState.ircConnecting)) {
        document.getElementById('ircConnectIconId').removeAttribute('unavailable');
        document.getElementById('ircConnectIconId').setAttribute('connecting', '');
        document.getElementById('ircConnectIconId').removeAttribute('connected');
      } else {
        document.getElementById('ircConnectIconId').removeAttribute('unavailable');
        document.getElementById('ircConnectIconId').removeAttribute('connecting');
        document.getElementById('ircConnectIconId').removeAttribute('connected');
      }
      if ((ircState.ircAutoReconnect) && (ircState.ircConnectOn) &&
        (!ircState.ircConnected) && (!ircState.ircConnecting)) {
        document.getElementById('waitConnectIconId').removeAttribute('hidden');
      } else {
        document.getElementById('waitConnectIconId').setAttribute('hidden', '');
      }
      resetNotActivityIcon();
      resetPmActivityIcon(-1);
      resetChanActivityIcon(-1);
      document.getElementById('ircIsAwayIconId').setAttribute('hidden', '');
      document.getElementById('hideLoginSection').removeAttribute('hidden');
      document.getElementById('hideLoginSectionButton').textContent = '-';
      if (document.getElementById('waitConnectIconId').hasAttribute('hidden')) {
        document.getElementById('cyclePrevServerButton').removeAttribute('disabled');
        document.getElementById('cycleNextServerButton').removeAttribute('disabled');
        if (ircState.disableServerListEditor) {
          document.getElementById('editServerListButton').setAttribute('disabled', '');
        } else {
          document.getElementById('editServerListButton').removeAttribute('disabled');
        }
        document.getElementById('nickNameInputId').removeAttribute('disabled');
        // document.getElementById('userNameInputId').removeAttribute('disabled');
        document.getElementById('realNameInputId').removeAttribute('disabled');
        document.getElementById('userModeInputId').removeAttribute('disabled');
      } else {
        document.getElementById('cyclePrevServerButton').setAttribute('disabled', '');
        document.getElementById('cycleNextServerButton').setAttribute('disabled', '');
        document.getElementById('editServerListButton').setAttribute('disabled', '');
        document.getElementById('nickNameInputId').setAttribute('disabled', '');
        // document.getElementById('userNameInputId').setAttribute('disabled', '');
        document.getElementById('realNameInputId').setAttribute('disabled', '');
        document.getElementById('userModeInputId').setAttribute('disabled', '');
      }
      if (ircState.ircConnecting) {
        document.getElementById('connectButton').setAttribute('disabled', '');
        document.getElementById('quitButton').removeAttribute('disabled');
      } else {
        document.getElementById('connectButton').removeAttribute('disabled');
        if (document.getElementById('waitConnectIconId').hasAttribute('hidden')) {
          document.getElementById('quitButton').setAttribute('disabled', '');
        } else {
          document.getElementById('quitButton').removeAttribute('disabled');
        }
      }
      document.getElementById('userAwayMessageId').setAttribute('disabled', '');
      document.getElementById('setAwayButton').setAttribute('disabled', '');
      document.getElementById('setBackButton').setAttribute('disabled', '');

      document.getElementById('eraseCacheButton').removeAttribute('disabled');
      document.getElementById('ircDisconnectedHiddenDiv').setAttribute('hidden', '');
      webState.noticeOpen = false;
      document.getElementById('noticeSectionDiv').setAttribute('hidden', '');
      webState.wallopsOpen = false;
      document.getElementById('wallopsSectionDiv').setAttribute('hidden', '');
      // next time visible, show channel join options
      document.getElementById('ircChannelsMainHiddenDiv').removeAttribute('hidden');
      document.getElementById('ircChannelsMainHiddenButton').textContent = '-';
    }
  } else {
    // Else, Web server disconnected
    document.getElementById('hiddenInfoDiv').setAttribute('hidden', '');
    document.getElementById('infoOpenCloseButton').textContent = '+';
    hideRawMessageWindow();
    document.getElementById('webDisconnectedVisibleDiv').removeAttribute('hidden');
    document.getElementById('webDisconnectedHiddenDiv1').setAttribute('hidden', '');
    document.getElementById('webDisconnectedHiddenDiv2').setAttribute('hidden', '');
    document.getElementById('waitConnectIconId').setAttribute('hidden', '');
    document.getElementById('cyclePrevServerButton').setAttribute('disabled', '');
    document.getElementById('cycleNextServerButton').setAttribute('disabled', '');
    document.getElementById('editServerListButton').setAttribute('disabled', '');
    if (webState.webConnecting) {
      document.getElementById('webConnectIconId').removeAttribute('connected');
      document.getElementById('webConnectIconId').setAttribute('connecting', '');
    } else {
      document.getElementById('webConnectIconId').removeAttribute('connected');
      document.getElementById('webConnectIconId').removeAttribute('connecting');
    }
    resetNotActivityIcon();
    resetPmActivityIcon(-1);
    resetChanActivityIcon(-1);
    document.getElementById('ircConnectIconId').setAttribute('unavailable', '');
    document.getElementById('ircConnectIconId').removeAttribute('connected');
    document.getElementById('ircConnectIconId').removeAttribute('connecting');
    document.getElementById('ircIsAwayIconId').setAttribute('hidden', '');
    document.getElementById('hideLoginSection').setAttribute('hidden', '');
    document.getElementById('nickNameInputId').setAttribute('disabled', '');
    // document.getElementById('userNameInputId').setAttribute('disabled', '');
    document.getElementById('realNameInputId').setAttribute('disabled', '');
    document.getElementById('userModeInputId').setAttribute('disabled', '');
    document.getElementById('connectButton').setAttribute('disabled', '');
    document.getElementById('quitButton').setAttribute('disabled', '');
    document.getElementById('userAwayMessageId').setAttribute('disabled', '');
    document.getElementById('setAwayButton').setAttribute('disabled', '');
    document.getElementById('setBackButton').setAttribute('disabled', '');
  }
}

// -------------------------------------------------
// Global event to make all hidden divs visible
// -------------------------------------------------
document.addEventListener('show-all-divs', function (event) {
  // document.getElementById('errorDiv').removeAttribute('hidden');
  document.getElementById('hideLoginSection').removeAttribute('hidden');
  document.getElementById('hideLoginSectionButton').textContent = '-';
  document.getElementById('privMsgMainHiddenDiv').removeAttribute('hidden');
  document.getElementById('privMsgMainHiddenButton').textContent = '-';
  document.getElementById('ircChannelsMainHiddenDiv').removeAttribute('hidden');
  document.getElementById('ircChannelsMainHiddenButton').textContent = '-';
  showRawMessageWindow();
  webState.noticeOpen = true;
  webState.wallopsOpen = true;
  document.getElementById('noticeSectionDiv').removeAttribute('hidden');
  document.getElementById('wallopsSectionDiv').removeAttribute('hidden');
  // document.getElementById('hiddenInfoDiv').removeAttribute('hidden');
  // document.getElementById('infoOpenCloseButton').textContent = '-';
});

// ---------------------------------------------------------
// Global event to hide all divs with option to skip 1 div (zoom)
//
// The event contains a detail.zoom property
//  of type string that may be used to inhibit hiding
// a specific window. If the property
// is absent or zero length string, all hideable windows
// hard hidden
// -----------------------------------
document.addEventListener('hide-or-zoom', function (event) {
  // console.log(JSON.stringify(event.detail, null, 2));
  // document.getElementById('errorDiv').setAttribute('hidden', '');
  document.getElementById('hideLoginSection').setAttribute('hidden', '');
  document.getElementById('hideLoginSectionButton').textContent = '+';
  document.getElementById('privMsgMainHiddenDiv').setAttribute('hidden', '');
  document.getElementById('privMsgMainHiddenButton').textContent = '+';
  document.getElementById('ircChannelsMainHiddenDiv').setAttribute('hidden', '');
  document.getElementById('ircChannelsMainHiddenButton').textContent = '+';
  hideRawMessageWindow();
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

  document.dispatchEvent(new CustomEvent('cancel-beep-sounds', { bubbles: true }));

  const channelContainerDivEl = document.getElementById('channelContainerDiv');
  while (channelContainerDivEl.firstChild) {
    channelContainerDivEl.removeChild(channelContainerDivEl.firstChild);
  }
  webState.channels = [];
  webState.channelStates = [];
  // Note PM area arrays managed during reload instead of Disconnect
  // This is because they are not in ircState and there managed in the browser.

  //
  // Reset ping statistics
  //
  webState.lag = {
    last: 0,
    min: 9999,
    max: 0
  };
};

// ------------------------------------------------------------------------------
// Group of heartbeat functions.
//
// Web server sends websocket message 'HEARTBEAT' at 10 second intervals
// Command parser intercept the HEATBEAT message and calls onHeartbeatReceived()
// ------------------------------------------------------------------------------
const heartbeatExpirationTimeSeconds = 15;
let heartbeatUpCounter = 0;
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

// -----------------------------------
// Update elapsed time display
// and connect counter
// called 1/second by timer tick
// -----------------------------------
function updateElapsedTimeDisplay () {
  function toTimeString (seconds) {
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

  const timePreEl = document.getElementById('elapsedTimeDiv');
  const now = unixTimestamp();
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
    timeStr += 'Backend Start: ' + toTimeString(now - ircState.times.programRun) + '\n';
  } else {
    timeStr += 'Backend Start: N/A\n';
  }
  if ((ircState.ircConnected) && (webState.lag.min < 9998)) {
    timeStr += 'IRC Lag: ' + webState.lag.last.toFixed(3) +
      ' Min: ' + webState.lag.min.toFixed(3) +
      ' Max: ' + webState.lag.max.toFixed(3);
  } else {
    timeStr += 'IRC Lag: (Waiting next ping)';
  }
  timePreEl.textContent = timeStr;
}

let lastConnectErrorCount = 0;
// --------------------------------------
// Contact web server and get state of
// the connection to the IRC server
//
// ircState is main object shared in backend
// as well as browser (read only here)
// --------------------------------------
function getIrcState (callback) {
  webState.count.webStateCalls++;

  const fetchURL = webServerUrl + '/irc/getircstate';
  const fetchOptions = {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    }
  };
  fetch(fetchURL, fetchOptions)
    .then((response) => {
      // console.log(response.status);
      if (response.ok) {
        return response.json();
      } else {
        // Cookie / session is expired, need refreshed login
        if (response.status === 403) window.location.href = '/login';
        throw new Error('Fetch status ' + response.status + ' ' + response.statusText);
      }
    })
    .then((responseJson) => {
      // console.log('getIrcState() ' + JSON.stringify(responseJson, null, 2));
      ircState = responseJson;
      //
      // ---------------------------------------------------------------
      // Based on state of connection between web server and IRC server
      // update display as necessary
      // ---------------------------------------------------------------
      // only update user info if server is changed from previous.
      if ((!ircState.ircConnected) && (webState.lastIrcServerIndex !== ircState.ircServerIndex)) {
        webState.lastIrcServerIndex = ircState.ircServerIndex;
        document.getElementById('ircServerIndexInputId').value = ircState.ircServerIndex;
        document.getElementById('ircServerNameInputId').value = ircState.ircServerName;
        document.getElementById('ircServerAddrInputId').value = ircState.ircServerHost;
        document.getElementById('ircServerPortInputId').value = ircState.ircServerPort;
        if (ircState.ircTLSEnabled) {
          document.getElementById('ircServerTlsEnable').setAttribute('checked', '');
        } else {
          document.getElementById('ircServerTlsEnable').removeAttribute('checked');
        }
        if (ircState.ircTLSVerify) {
          document.getElementById('ircServerTlsVerify').setAttribute('checked', '');
        } else {
          document.getElementById('ircServerTlsVerify').removeAttribute('checked');
        }
        if (ircState.enableSocks5Proxy) {
          document.getElementById('socks5HidableDiv').removeAttribute('hidden');
          document.getElementById('socks5EnabledCheckbox').setAttribute('disabled', '');
          document.getElementById('socks5EnabledCheckbox').setAttribute('checked', '');
          document.getElementById('socks5AddrInputId').value = ircState.socks5Host;
          document.getElementById('socks5PortInputId').value = ircState.socks5Port;
        } else {
          document.getElementById('socks5HidableDiv').setAttribute('hidden', '');
          document.getElementById('socks5EnabledCheckbox').removeAttribute('checked');
          document.getElementById('socks5AddrInputId').value = '';
          document.getElementById('socks5PortInputId').value = '';
        }
        document.getElementById('nickNameInputId').value = ircState.nickName;
        document.getElementById('userNameInputId').value = ircState.userName;
        document.getElementById('realNameInputId').value = ircState.realName;
        document.getElementById('userModeInputId').value = ircState.userMode;
      }
      if (ircState.ircConnected) {
        // For display in browser tab
        document.title = 'IRC-' + ircState.ircServerName;

        document.getElementById('ircServerIndexInputId').value = ircState.ircServerIndex;
        document.getElementById('ircServerNameInputId').value = ircState.ircServerName;
        document.getElementById('ircServerAddrInputId').value = ircState.ircServerHost;
        document.getElementById('ircServerPortInputId').value = ircState.ircServerPort;
        if (ircState.ircTLSEnabled) {
          document.getElementById('ircServerTlsEnable').setAttribute('checked', '');
        } else {
          document.getElementById('ircServerTlsEnable').removeAttribute('checked');
        }
        if (ircState.ircTLSVerify) {
          document.getElementById('ircServerTlsVerify').setAttribute('checked', '');
        } else {
          document.getElementById('ircServerTlsVerify').removeAttribute('checked');
        }
        if (ircState.enableSocks5Proxy) {
          document.getElementById('socks5HidableDiv').removeAttribute('hidden');
          document.getElementById('socks5EnabledCheckbox').setAttribute('disabled', '');
          document.getElementById('socks5EnabledCheckbox').setAttribute('checked', '');
          document.getElementById('socks5AddrInputId').value = ircState.socks5Host;
          document.getElementById('socks5PortInputId').value = ircState.socks5Port;
        } else {
          document.getElementById('socks5HidableDiv').setAttribute('hidden', '');
          document.getElementById('socks5EnabledCheckbox').removeAttribute('checked');
          document.getElementById('socks5AddrInputId').value = '';
          document.getElementById('socks5PortInputId').value = '';
        }
        document.getElementById('headerServer').textContent = ircState.ircServerName;
        document.getElementById('headerUser').textContent = ' (' + ircState.nickName + ')';
        document.getElementById('nickNameInputId').value = ircState.nickName;
        document.getElementById('userNameInputId').value = ircState.userName;
        document.getElementById('realNameInputId').value = ircState.realName;
        document.getElementById('userModeInputId').value = ircState.userMode;
        // for color icon
        webState.ircConnecting = false;
      }
      if (!ircState.ircConnected) {
        // Since disconnected from IRC remove all channel plugin div
        setVariablesShowingIRCDisconnected();

        // For display in browser tab
        document.title = 'irc-hybrid-client';
      }
      if (lastConnectErrorCount !== ircState.count.ircConnectError) {
        lastConnectErrorCount = ircState.count.ircConnectError;
        if (ircState.count.ircConnectError > 0) {
          // On page refresh, skip legacy IRC errors occurring on the first /irc/getwebstate call
          if (webState.count.webStateCalls > 1) {
            showError('An IRC Server connection error occurred');
          }
        }
        // clear browser side connecting flag
        webState.ircConnecting = false;
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
      document.getElementById('programVersionDiv').textContent =
        ' version-' + ircState.progVersion;

      if (callback) {
        callback(null, ircState);
      }
    })
    .catch((error) => {
      console.log(error);
      if (callback) {
        callback(error, {});
      }
    });
} // getIrcState
