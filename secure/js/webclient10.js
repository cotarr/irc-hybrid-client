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
// -------------------------------------------------------------------------------
//
// ------------------------------------------------------------
// webclient10.js  - Event fetch requests
//                   screen resize events
// ------------------------------------------------------------
//
// -------------------------------------------------
// This function performs API request to obtain
// the full IRC server message cache from the web server
// as an API response. The contents are then parsed as if
// the message were real time.
// -------------------------------------------------
function updateFromCache () {
  // Timer down counter to disable
  // prase events during reload (beeps and activity icons)
  webState.cacheInhibitTimer = 3;
  // Clear activity icons
  resetNotActivityIcon();
  resetPmActivityIcon(-1);
  resetChanActivityIcon(-1);

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
        throw new Error('Fetch status ' + response.status + ' ' + response.statusText);
      }
    })
    .then((responseArray) => {
      if ((Array.isArray(responseArray)) && (responseArray.length > 0)) {
        // remove dynamically created private message elements to match list
        let privMsgSessionEl = document.getElementById('privateMessageContainerDiv');
        while (privMsgSessionEl.firstChild) {
          privMsgSessionEl.removeChild(privMsgSessionEl.firstChild);
        }
        webState.lastPMNick = '';
        webState.activePrivateMessageNicks = [];
        document.getElementById('noticeMessageDisplay').value = '';
        document.getElementById('wallopsMessageDisplay').value = '';
        document.getElementById('pmNickNameInputId').value = '';
        document.getElementById('newChannelNameInputId').value = '';
        document.getElementById('rawMessageDisplay').value = '';
        document.getElementById('rawMessageInputId').value = '';
        webState.noticeOpen = false;
        webState.wallopsOpen = false;
        //
        // Option 1, receive array of NodeJS Buffer object and convert to utf8 string messages
        //
        // let utf8decoder = new TextDecoder('utf8');
        // for (let i=0; i<responseArray.length; i++) {
        //   if ((responseArray[i].type === 'Buffer') && (responseArray[i].data.length > 0)) {
        //     let data = new Uint8Array(responseArray[i].data);
        //     _parseBufferMessage(utf8decoder.decode(data));
        //   }
        // }
        //
        // Option 2, recieve array of utf8 string message
        //
        for (let i = 0; i < responseArray.length; i++) {
          if (responseArray[i].length > 0) {
            _parseBufferMessage(responseArray[i]);
          }
        }
        // this is to inform windows that cache reload has completed.
        let timestamp = unixTimestamp();
        document.dispatchEvent(new CustomEvent('cache-reload-done', {
          bubbles: true,
          detail: {
            timestamp: timestamp
          }
        }));
      }
    })
    .catch((error) => {
      console.log(error);
    });
}; // updateFromCache;
window.addEventListener('update-from-cache', function (event) {
  updateFromCache();
});

function cacheInhibitTimerTick () {
  if (webState.cacheInhibitTimer > 0) webState.cacheInhibitTimer--;
}

// On initial load or reload of page, inhibit timers
webState.cacheInhibitTimer = 3;

// -----------------------
// Die (Server) button
// -----------------------
document.getElementById('serverTerminateButton').addEventListener('click', function () {
  console.log('Requesting backend server to terminate');
  let fetchURL = webServerUrl + '/terminate';
  let fetchOptions = {
    method: 'POST',
    headers: {
      'Content-type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({ terminate: 'YES' })
  };
  fetch(fetchURL, fetchOptions)
    .then((response) => {
      // console.log(response.status);
      if (response.ok) {
        return response.json();
      } else {
        throw new Error('Fetch status ' + response.status + ' ' + response.statusText);
      }
    })
    .then((responseJson) => {
      console.log(JSON.stringify(responseJson));
    })
    .catch((error) => {
      showError('Terminate: Unable to connect');
      console.log(error);
    });
});

// ---------------------------------------
// Request server to erase message cache
//
// Route:  /erase
// ---------------------------------------
document.getElementById('eraseCacheButton').addEventListener('click', function () {
  if (ircState.ircConnected) {
    showError('You must be disconnected from IRC to clear cache.');
    return;
  }
  document.dispatchEvent(new CustomEvent('erase-before-reload',
    {
      bubbles: true,
      detail: {
      }
    }));
  let fetchURL = webServerUrl + '/irc/erase';
  let fetchOptions = {
    method: 'POST',
    headers: {
      'Content-type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({ erase: 'YES' })
  };
  fetch(fetchURL, fetchOptions)
    .then((response) => {
      // console.log(response.status);
      if (response.ok) {
        return response.json();
      } else {
        throw new Error('Fetch status ' + response.status + ' ' + response.statusText);
      }
    })
    .then((responseJson) => {
      if (responseJson.error) {
        showError(responseJson.message);
      } else {
        // remove dynamically created private message elements to match list
        let privMsgSessionEl = document.getElementById('privateMessageContainerDiv');
        while (privMsgSessionEl.firstChild) {
          privMsgSessionEl.removeChild(privMsgSessionEl.firstChild);
        }
        document.getElementById('noticeMessageDisplay').value = '';
        document.getElementById('wallopsMessageDisplay').value = '';
        document.getElementById('pmNickNameInputId').value = '';
        document.getElementById('newChannelNameInputId').value = '';
        document.getElementById('rawMessageDisplay').value = '';
        document.getElementById('rawMessageInputId').value = '';
        webState.privMsgOpen = false;
        webState.noticeOpen = false;
        webState.wallopsOpen = false;
        updateDivVisibility();
      }
    })
    .catch((error) => {
      console.log(error);
    });
});

// --------------------------------------------
// Fetch web login user's name and update top
// --------------------------------------------
function updateUsername () {
  let fetchURL = webServerUrl + '/userinfo';
  let fetchOptions = {
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
        throw new Error('Fetch status ' + response.status + ' ' + response.statusText);
      }
    })
    .then((responseJson) => {
      webState.loginUser = responseJson;
    })
    .catch((error) => {
      console.log(error);
    });
};
updateUsername();

// --------------------
// Test Button #1
// --------------------
document.getElementById('test1Button').addEventListener('click', function () {
  console.log('Test1 button pressed.');

  let fetchURL = webServerUrl + '/irc/test1';
  let fetchOptions = {
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
        throw new Error('Fetch status ' + response.status + ' ' + response.statusText);
      }
    })
    .then((responseJson) => {
      console.log(JSON.stringify(responseJson, null, 2));
      if (responseJson.error) {
        showError(responseJson.message);
      }
    })
    .catch((error) => {
      console.log(error);
      if (error) showError(error.toString());
    });
});
document.getElementById('test1ButtonDesc').textContent = 'Force garbage collect';

// --------------------
// Test Button #2
// --------------------
document.getElementById('test2Button').addEventListener('click', function () {
  console.log('Test2 button pressed.');

  let fetchURL = webServerUrl + '/irc/test2';
  let fetchOptions = {
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
        console.log(response);
        throw new Error('Fetch status ' + response.status + ' ' + response.statusText);
      }
    })
    .then((responseJson) => {
      console.log(JSON.stringify(responseJson, null, 2));
      if (responseJson.error) {
        showError(responseJson.message);
      }
    })
    .catch((error) => {
      console.log(error);
      if (error) showError(error.toString());
    });
});
document.getElementById('test2ButtonDesc').textContent = 'Emulate IRC ping timeout';

// --------------------
// Test Button #3
// --------------------
document.getElementById('test3Button').addEventListener('click', function () {
  console.log('Test 3 button pressed.');
  // ---------------------------------
  console.log('Test 3 button: expire heart beat timer');
  heartbeatUpCounter = heartbeatExpirationTimeSeconds - 1;
  // webState.webConnectOn = false;
  // ---------------------------------
});
document.getElementById('test3ButtonDesc').textContent = 'Emulate websocket timeout';

// --------------------
// Test Button #4
// --------------------
document.getElementById('test4Button').addEventListener('click', function () {
  console.log('Test 4 button pressed.');

  // ---------------------------------
  console.log('Test 4 getIrcState()');
  getIrcState();
  // ---------------------------------
});
document.getElementById('test4ButtonDesc').textContent = 'Call getIrcState()';

// ---------------------------------------------------------------------------
// This is some code to dynamically resize the width of the textarea elements
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// This runs as part of page load
//
// This program displays and receives user input using <textarea> elements.
// The <textarea> elements render differently in desktop and mobile devices
// The size of the buttons is different in desktop and mobile devices.
//
// Therefore, it is necessary to dynamically create <textarea> and <button>
// elements and determine the size in pixels for a particular browser and zoom.
//
// The width of a <textarea> element is the sum of a fixed
// value for margin, or difference between element pixel internal characters.
// The second part is the pixel size of each character in the <textarea>
// For Chrome on my Linux desktop with a zoom of 100%,
// a <textarea> element is 7 pixels per character plus 21 pixels
// per character.
//
// For this to work, a fixed width font is required.
//
// The following code will:
//   dynamically insert a <textarea> element
//   set character width
//   measure element pixel width
//   change character width
//   measure changed element width.
//   Calculate regression to get slope and intercept
//   Intercept is margin width
//   slope is the pixel width of each character.
//   remove the element
//
//   dynamically insert a <button> element
//   set textContent to "Send"
//   measure pixel width of [Send] button
//   remove the element
//
// These values to be used to determine value of the "cols" attribute
// of a <textarea> element to dynamically size it to a variable window width.
// ---------------------------------------------------------------------------
//
// This element exists hardcoded at the bottom of webclient.html
// It will be used to hold temporary elements while measuring the width
let rulerDivEl = document.getElementById('rulerDiv');

// Value of temporary character size (cols attribute)
let rulerX1 = 10;
let rulerX2 = 20;
// Create <textarea> element using first width value
let rulerTextareaEl = document.createElement('textarea');
rulerTextareaEl.setAttribute('cols', rulerX1.toString());
rulerTextareaEl.setAttribute('rows', '1');
rulerDivEl.appendChild(rulerTextareaEl);
// the rulerY1 is the pixel width of a textarea with rulerX1 characters
let rulerY1 = rulerTextareaEl.getBoundingClientRect().width;
// repeat with different character and pixel width
rulerTextareaEl.setAttribute('cols', rulerX2.toString());
let rulerY2 = rulerTextareaEl.getBoundingClientRect().width;
// done, remove the temporary element
rulerDivEl.removeChild(rulerTextareaEl);

// perform regression (2 equation, 2 variables) to get slope and intercept (Y = mX + b)
if (!webState.watch) webState.dynamic = {};
webState.dynamic.inputAreaCharWidthPx = (rulerY2 - rulerY1) / (rulerX2 - rulerX1);
webState.dynamic.inputAreaSideWidthPx = rulerY1 - (rulerX1 * webState.dynamic.inputAreaCharWidthPx);

// Create <button> elment and fill with "Send" string value
let rulerButtonEl = document.createElement('button');
rulerButtonEl.textContent = 'Send';
rulerDivEl.appendChild(rulerButtonEl);
webState.dynamic.sendButtonWidthPx = rulerButtonEl.getBoundingClientRect().width;
// done, remove the temporary element
rulerDivEl.removeChild(rulerButtonEl);

//
// Common margin for all windows in pixels (window width outside textarea)
//
webState.dynamic.commonMargin = 50;
//
// Finished determination of dynamic element width varaibles
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Function to calculate <textarea> "cols" attribute for proper width on page.
//
// Input: margin width outside <textarea>  (innerWidth - element width)
// Output: String contgaining integer value of textarea "cols" attribute
// --------------------------------------------------------------------------
const calcInputAreaColSize = function (marginPxWidth) {
  if ((typeof marginPxWidth === 'number') &&
    (webState.dynamic.inputAreaCharWidthPx) &&
    (typeof webState.dynamic.inputAreaCharWidthPx === 'number') &&
    (webState.dynamic.inputAreaCharWidthPx > 1) &&
    (webState.dynamic.inputAreaSideWidthPx) &&
    (typeof webState.dynamic.inputAreaSideWidthPx === 'number') &&
    (webState.dynamic.inputAreaSideWidthPx > 1)) {
    let margin = marginPxWidth;
    if (margin < 0) margin = 0;
    let cols = parseInt(
      (window.innerWidth - webState.dynamic.inputAreaSideWidthPx - margin) /
      webState.dynamic.inputAreaCharWidthPx);
    return cols.toString();
  } else {
    console.log('alcInputAreaColSize() invalid input');
    return null;
  }
}; // calcInputAreaColSize()

//
// Function called both initially and also on browser event
//
const adjustInputToWidowWidth = function (innerWidth) {
  // pixel width mar1 is reserved space on edges of input area at full screen width
  let mar1 = webState.dynamic.commonMargin;
  // set width of input area elements
  document.getElementById('rawMessageDisplay').setAttribute('cols', calcInputAreaColSize(mar1));
  document.getElementById('noticeMessageDisplay').setAttribute('cols', calcInputAreaColSize(mar1));
  document.getElementById('wallopsMessageDisplay').setAttribute('cols', calcInputAreaColSize(mar1));

  // pixel width mar2 is reserved space on edges of input area with send button added
  let mar2 = webState.dynamic.commonMargin + 5 + webState.dynamic.sendButtonWidthPx;
  // set width of input area elements
  document.getElementById('rawMessageInputId').setAttribute('cols', calcInputAreaColSize(mar2));
  document.getElementById('userPrivMsgInputId').setAttribute('cols', calcInputAreaColSize(mar2));

  document.getElementById('errorDiv').style.width = '100%';

  // Debug: To watch a variable, put it here.
  if (!webState.watch) webState.watch = {};
  webState.watch.innerWidth = window.innerWidth.toString() + 'px';
  webState.watch.innerHeight = window.innerHeight.toString() + 'px';
}; // adjustInputToWidowWidth()
//
// Event listener for resize window (generic browser event)
//
window.addEventListener('resize', function (event) {
  // ignore resize events before dynamic size variables exist
  if (webState.dynamic.inputAreaCharWidthPx) {
    adjustInputToWidowWidth(event.currentTarget.innerWidth);
  }
});

//
// Do initially on page load
//
adjustInputToWidowWidth(window.innerWidth);

//
// 1 second utility timer
//
setInterval(function () {
  errorTimerTickHandler();
  heartbeatTimerTickHandler();
  reconnectTimerTickHandler();
  beepTimerTick();
  updateElapsedTimeDisplay();
  cacheInhibitTimerTick();
}, 1000);

// -----------------------------
//   D O   T H I S   L A S T
// -----------------------------
firstWebSocketConnectOnPageLoad();
