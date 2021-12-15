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
  if (webState.cacheReloadInProgress) {
    // Abort in case of cache reload already in progress
    console.log('Attempt cache reload, while previous in progress');
    return;
  }
  // Used by event handlers to inhibit various actions.
  webState.cacheReloadInProgress = true;

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
      // throw new Error('Test error for updateFromCache()');
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
      }
      // this is to inform windows that cache reload has completed.
      const timestamp = unixTimestamp();
      document.dispatchEvent(new CustomEvent('cache-reload-done', {
        bubbles: true,
        detail: {
          timestamp: timestamp
        }
      }));
    })
    .catch((error) => {
      const timestamp = unixTimestamp();
      console.log(error);
      document.dispatchEvent(new CustomEvent('cache-reload-error', {
        bubbles: true,
        detail: {
          timestamp: timestamp
        }
      }));
    });
}; // updateFromCache;
window.addEventListener('update-from-cache', function (event) {
  updateFromCache();
});

window.addEventListener('cache-reload-done', function (event) {
  webState.cacheReloadInProgress = false;
});

window.addEventListener('cache-reload-error', function (event) {
  webState.cacheReloadInProgress = false;
});

// -----------------------
// Die (Server) button
// -----------------------
document.getElementById('serverTerminateButton').addEventListener('click', function () {
  console.log('Requesting backend server to terminate');
  const fetchURL = webServerUrl + '/terminate';
  const fetchOptions = {
    method: 'POST',
    headers: {
      'CSRF-Token': csrfToken,
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
      'CSRF-Token': csrfToken,
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

// ------------------------------------------------------------
// Retrieve last web userid from local storage
// If current web userid does not match, clear local data
// Save current userid to localStorage.
// Note: userid is an integer number assigned in credentials.js
// ------------------------------------------------------------
function detectWebUseridChanged () {
  let lastLoginUser = null;
  lastLoginUser = JSON.parse(window.localStorage.getItem('lastLoginUser'));
  if ((lastLoginUser) &&
    (lastLoginUser.userid) &&
    (lastLoginUser.userid !== webState.loginUser.userid)) {
    console.log('User id changed, clearing local storage');
    window.localStorage.clear();
  }
  const newLoginTimestamp = unixTimestamp();
  const newLoginUser = {
    timestamp: newLoginTimestamp,
    userid: webState.loginUser.userid
  };
  window.localStorage.setItem('lastLoginUser', JSON.stringify(newLoginUser));
} // saveUseridToLocalStorage()

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
      detectWebUseridChanged();
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
  // console.log('Test 4 getIrcState()');
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
// a <textarea> element is 7 pixels per character plus 21 pixels on the sides.
//
// For this to work, a fixed width font is required.
//
// The following code will:
//   dynamically insert 2 <textarea> elements
//   set character width2
//   measure element pixel width of each textarea
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
// This is a element measurement function
// It should be run before resizing elements to avoid browser Reflow violations
//
const updatePageMeasurements = function () {
  webState.dynamic.bodyClientWidth = document.querySelector('body').clientWidth.toString();
  // Debug: To watch a variable, put it here.
  if (!webState.watch) webState.watch = {};
  webState.watch.innerHeight = window.innerHeight.toString() + 'px';
  webState.watch.innerWidth = window.innerWidth.toString() + 'px';
  webState.watch.bodyClientWidth = webState.dynamic.bodyClientWidth.toString() + 'px';
  webState.watch.devicePixelRatio = window.devicePixelRatio;
}; // updateWatchProps()

// -----------------------------------------------------------------------
// Create temporary elements and measure the size in pixels, the delete
// -----------------------------------------------------------------------
const calibrateElementSize = function () {
  // Insertion parent element
  const rulerDivEl = document.getElementById('rulerDiv');

  // Value of temporary character size (cols attribute)
  const rulerX1 = 10;
  const rulerX2 = 20;

  // Create size #1 <textarea> element using first width value
  const rulerTextareaEl1 = document.createElement('textarea');
  rulerTextareaEl1.setAttribute('cols', rulerX1.toString());
  rulerTextareaEl1.setAttribute('rows', '1');
  rulerDivEl.appendChild(rulerTextareaEl1);

  // Create size #2 <textarea> element using first width value
  const rulerTextareaEl2 = document.createElement('textarea');
  rulerTextareaEl2.setAttribute('cols', rulerX2.toString());
  rulerTextareaEl2.setAttribute('rows', '1');
  rulerDivEl.appendChild(rulerTextareaEl2);

  // Create <button> elment and fill with "Send" string value
  const rulerButtonEl = document.createElement('button');
  rulerButtonEl.textContent = 'Send';
  rulerDivEl.appendChild(rulerButtonEl);

  // the rulerY1, is the pixel width of a textarea with rulerX1 characters
  const rulerY1 = rulerTextareaEl1.getBoundingClientRect().width;
  // repeat with different character and pixel width
  const rulerY2 = rulerTextareaEl2.getBoundingClientRect().width;

  // perform regression (2 equation, 2 variables) to get slope and intercept (Y = mX + b)
  webState.dynamic.inputAreaCharWidthPx = (rulerY2 - rulerY1) / (rulerX2 - rulerX1);
  webState.dynamic.inputAreaSideWidthPx =
    rulerY1 - (rulerX1 * webState.dynamic.inputAreaCharWidthPx);

  webState.dynamic.sendButtonWidthPx = rulerButtonEl.getBoundingClientRect().width;
  // done, remove the temporary element
  rulerDivEl.removeChild(rulerTextareaEl1);
  rulerDivEl.removeChild(rulerTextareaEl2);
  rulerDivEl.removeChild(rulerButtonEl);
}; // calibrateElementSize()

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
      (webState.dynamic.bodyClientWidth -
        webState.dynamic.inputAreaSideWidthPx - margin) /
      webState.dynamic.inputAreaCharWidthPx);
    return cols.toString();
  } else {
    console.log('alcInputAreaColSize() invalid input');
    return null;
  }
}; // calcInputAreaColSize()

// ----------------------------------------------------
// Resize textarea elements for proper width on page
// ----------------------------------------------------
// Function called:
//    1) Initially
//    2) On  browser resize event
//    3) Timer routine detect scroll bar appear or hide, due to window visiblity
//
// This changes textarea element sizes (elements mutated)
// To avoid Reflow violations, no element measurements are taken after this.
//
// A similar function is used to adjust channel windows.
// ----------------------------------------------------
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
}; // adjustInputToWidowWidth()

// -----------------------------------------------------------------
// All textarea elements in the program are resized with this event
// -----------------------------------------------------------------
window.addEventListener('resize-custom-elements', function (event) {
  if (webState.dynamic.inputAreaCharWidthPx) {
    adjustInputToWidowWidth();
  }
});

// --------------------------------------------------------
// Event listener for resize window (generic browser event)
// --------------------------------------------------------
window.addEventListener('resize', function (event) {
  updatePageMeasurements();
  // ignore resize events before dynamic size variables exist
  if (webState.dynamic.inputAreaCharWidthPx) {
    // console.log('window resize event');
    //
    // If browser supports devicePixelRatio, then compare
    // against last value. If change, then user has changed
    // browser zoom, so dynamic textarea element resize
    // will need to be recalibrated.
    //
    if (window.devicePixelRatio) {
      if (webState.dynamic.lastDevicePixelRatio !== window.devicePixelRatio) {
        // case of zoom changed, recalibrate element pixel size
        webState.dynamic.lastDevicePixelRatio = window.devicePixelRatio;

        // recalibrate pixel width of textarea elements
        calibrateElementSize();
      }
    }

    // Resize textarea elements
    document.dispatchEvent(new CustomEvent('resize-custom-elements',
      {
        bubbles: true,
        detail: {
        }
      }));

    // This is to prevent unnecessary resize event on timer check (next function below)
    webState.dynamic.lastClientWidth = webState.dynamic.bodyClientWidth;
  }
});

//
// Timer service routine
//
// Resize input area elements after pageClientWidth unexpectedly changes without event.
// Typically appearance of vertical slider causes this.
//
const checkVerticalSliderPageWidth = function () {
  updatePageMeasurements();

  // skip if not initialized
  if (webState.dynamic.inputAreaCharWidthPx) {
    // Case of making window visible/hidden add or remove vertical slider, change width.
    // There is no event to catch this so it's done on a timer.
    if (webState.dynamic.lastClientWidth !== webState.dynamic.bodyClientWidth) {
      webState.dynamic.lastClientWidth = webState.dynamic.bodyClientWidth;

      // Resize textarea elements
      document.dispatchEvent(new CustomEvent('resize-custom-elements',
        {
          bubbles: true,
          detail: {
          }
        }));
    }
  }
}; // checkVerticalSliderPageWidth()

// button to manually update widths (may remove in future)
document.addEventListener('recalcPageWidthButtonId', function () {
  updatePageMeasurements();

  // recalibrate pixel width of textarea elements
  calibrateElementSize();

  // Resize textarea elements
  document.dispatchEvent(new CustomEvent('resize-custom-elements',
    {
      bubbles: true,
      detail: {
      }
    }
  ));
});

//
// Do initially on page load, calibrate textarea element size, and resize input area elements.
//
updatePageMeasurements();
webState.dynamic.lastClientWidth = webState.dynamic.bodyClientWidth;
calibrateElementSize();
// Resize textarea elements
document.dispatchEvent(new CustomEvent('resize-custom-elements',
  {
    bubbles: true,
    detail: {
    }
  }
));

//
// And do same one more time...
// and again, as a work around to prevent to correct
// condition whree textarea about 80% of normal on first page load.
//
setTimeout(function () {
  calibrateElementSize();
  // Resize textarea elements
  document.dispatchEvent(new CustomEvent('resize-custom-elements',
    {
      bubbles: true,
      detail: {
      }
    }
  ));
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
  checkVerticalSliderPageWidth();
}, 1000);

// -----------------------------
//   D O   T H I S   L A S T
// -----------------------------
firstWebSocketConnectOnPageLoad();
