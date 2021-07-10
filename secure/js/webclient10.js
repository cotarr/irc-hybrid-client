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

  const fetchURL = webServerUrl + '/irc/cache';
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
        throw new Error('Fetch status ' + response.status + ' ' + response.statusText);
      }
    })
    .then((responseArray) => {
      if ((Array.isArray(responseArray)) && (responseArray.length > 0)) {
        // remove dynamically created private message elements to match list
        const privMsgSessionEl = document.getElementById('privateMessageContainerDiv');
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
        const timestamp = unixTimestamp();
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
  const fetchURL = webServerUrl + '/terminate';
  const fetchOptions = {
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
  const fetchURL = webServerUrl + '/irc/erase';
  const fetchOptions = {
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
        const privMsgSessionEl = document.getElementById('privateMessageContainerDiv');
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
  const fetchURL = webServerUrl + '/userinfo';
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

  const fetchURL = webServerUrl + '/irc/test1';
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

  const fetchURL = webServerUrl + '/irc/test2';
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
// --------------------------------------------------------------------------
//
// Create temporary elements and measure the size in pixels, the delete
//
const calibrateElementSize = function () {
  // Insertion parent element
  const rulerDivEl = document.getElementById('rulerDiv');

  // Value of temporary character size (cols attribute)
  const rulerX1 = 10;
  const rulerX2 = 20;
  // Create <textarea> element using first width value
  const rulerTextareaEl = document.createElement('textarea');
  rulerTextareaEl.setAttribute('cols', rulerX1.toString());
  rulerTextareaEl.setAttribute('rows', '1');
  rulerDivEl.appendChild(rulerTextareaEl);
  // the rulerY1 is the pixel width of a textarea with rulerX1 characters
  const rulerY1 = rulerTextareaEl.getBoundingClientRect().width;
  // repeat with different character and pixel width
  rulerTextareaEl.setAttribute('cols', rulerX2.toString());
  const rulerY2 = rulerTextareaEl.getBoundingClientRect().width;
  // done, remove the temporary element
  rulerDivEl.removeChild(rulerTextareaEl);

  // object to hold dynamic variables
  if (!webState.dynamic) {
    webState.dynamic = {};
    //
    // To detect browser zoom changes, save last devicePixelRatio
    //
    // Default if browser not support
    webState.dynamic.lastClientWidth = document.querySelector('body').clientWidth;
    webState.dynamic.lastDevicePixelRatio = 1;
    // only if browser support devicePixelRatio
    if (window.devicePixelRatio) {
      webState.dynamic.lastDevicePixelRatio = window.devicePixelRatio;
    }
  }

  // perform regression (2 equation, 2 variables) to get slope and intercept (Y = mX + b)
  webState.dynamic.inputAreaCharWidthPx = (rulerY2 - rulerY1) / (rulerX2 - rulerX1);
  webState.dynamic.inputAreaSideWidthPx =
    rulerY1 - (rulerX1 * webState.dynamic.inputAreaCharWidthPx);

  // Create <button> elment and fill with "Send" string value
  const rulerButtonEl = document.createElement('button');
  rulerButtonEl.textContent = 'Send';
  rulerDivEl.appendChild(rulerButtonEl);
  webState.dynamic.sendButtonWidthPx = rulerButtonEl.getBoundingClientRect().width;
  // done, remove the temporary element
  rulerDivEl.removeChild(rulerButtonEl);

  // Common margin for all windows in pixels (window width outside textarea)
  //
  // This represents a space on the right where thumb can be used to side
  // contents up and down vertically
  //
  webState.dynamic.commonMargin = 50;
}; // calibrateElementSize()

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
    const cols = parseInt(
      (document.querySelector('body').clientWidth -
        webState.dynamic.inputAreaSideWidthPx - margin) /
      webState.dynamic.inputAreaCharWidthPx);
    return cols.toString();
  } else {
    console.log('alcInputAreaColSize() invalid input');
    return null;
  }
}; // calcInputAreaColSize()

// ----------------------------------------------------
// Resize inputarea elements for proper width on page
// ----------------------------------------------------
// Function called:
//    1) Initially
//    2) On  browser resize event
//    3) timer routine detect scroll bar appear or hide, due to window visiblity
//
const adjustInputToWidowWidth = function () {
  // pixel width mar1 is reserved space on edges of input area at full screen width
  const mar1 = webState.dynamic.commonMargin;
  // set width of input area elements
  document.getElementById('rawMessageDisplay').setAttribute('cols', calcInputAreaColSize(mar1));
  document.getElementById('noticeMessageDisplay').setAttribute('cols', calcInputAreaColSize(mar1));
  document.getElementById('wallopsMessageDisplay').setAttribute('cols', calcInputAreaColSize(mar1));

  // pixel width mar2 is reserved space on edges of input area with send button added
  const mar2 = webState.dynamic.commonMargin + 5 + webState.dynamic.sendButtonWidthPx;
  // set width of input area elements
  document.getElementById('rawMessageInputId').setAttribute('cols', calcInputAreaColSize(mar2));
  document.getElementById('userPrivMsgInputId').setAttribute('cols', calcInputAreaColSize(mar2));

  document.getElementById('errorDiv').style.width = '100%';

  // Debug: To watch a variable, put it here.
  if (!webState.watch) webState.watch = {};
  webState.watch.innerHeight = window.innerHeight.toString() + 'px';
  webState.watch.innerWidth = window.innerWidth.toString() + 'px';
  webState.watch.bodyClientWidth = document.querySelector('body').clientWidth.toString() + 'px';
  webState.watch.devicePixelRatio = window.devicePixelRatio;
}; // adjustInputToWidowWidth()

//
// Event listener for resize window (generic browser event)
//
window.addEventListener('resize', function (event) {
  // ignore resize events before dynamic size variables exist
  if (webState.dynamic.inputAreaCharWidthPx) {
    // console.log('window resize event');
    //
    // If browser supports devicePixelRatio, then compare
    // against last value. If change, then user has changed
    // browser zoom, so dynamic inputarea element resize
    // will need to be recalibrated.
    //
    if (window.devicePixelRatio) {
      if (webState.dynamic.lastDevicePixelRatio !== window.devicePixelRatio) {
        // case of zoom changed, recalibrate element pixel size
        webState.dynamic.lastDevicePixelRatio = window.devicePixelRatio;

        // recalibrate pixel width of inputarea elements
        calibrateElementSize();
      }
    }

    // go resize inputarea elements
    adjustInputToWidowWidth();

    // Tell channel windows and PM windows to resize themselves
    document.dispatchEvent(new CustomEvent('resize-custom-elements',
      {
        bubbles: true,
        detail: {
        }
      }));

    // This is to prevent unnecessary resize event on timer check (next function below)
    webState.dynamic.lastClientWidth = document.querySelector('body').clientWidth;
  }
});

//
// Resize input area elements after page width unexpectedly changes without event.
// Typically appearance of vertical slider causes this.
//
const checkVerticalSliderPageWidth = function () {
  // skip if not initialized
  if (webState.dynamic.inputAreaCharWidthPx) {
    // Case of making window visible/hidden add or remove vertical slider, change width.
    // There is no event to catch this so it's done on a timer.
    if (webState.dynamic.lastClientWidth !== document.querySelector('body').clientWidth) {
      webState.dynamic.lastClientWidth = document.querySelector('body').clientWidth;

      // resize inputarea elements
      adjustInputToWidowWidth();

      // Tell channel windows and PM windows to resize themselves
      document.dispatchEvent(new CustomEvent('resize-custom-elements',
        {
          bubbles: true,
          detail: {
          }
        }));
    }
  }
}; // checkVerticalSliderPageWidth()

document.addEventListener('recalcPageWidthButtonId', function () {
  // recalibrate pixel width of inputarea elements
  calibrateElementSize();

  // resize inputarea elements
  adjustInputToWidowWidth();

  // Tell channel windows and PM windows to resize themselves
  document.dispatchEvent(new CustomEvent('resize-custom-elements',
    {
      bubbles: true,
      detail: {
      }
    }
  ));
});

//
// Do initially on page load, calibrate inputarea element size, and resize input area elements.
//
calibrateElementSize();
adjustInputToWidowWidth();

//
// And do same one more time...
// and again, as a work around to prevent to correct
// condition whree inputarea about 80% of normal on first page load.
//
setTimeout(function () {
  calibrateElementSize();
  adjustInputToWidowWidth();
}, 900);

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
  checkVerticalSliderPageWidth();
}, 1000);

// -----------------------------
//   D O   T H I S   L A S T
// -----------------------------
firstWebSocketConnectOnPageLoad();
