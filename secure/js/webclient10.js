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
        webState.resizableSendButtonPMTextareaIds = [];
        document.getElementById('noticeMessageDisplay').value = '';
        document.getElementById('wallopsMessageDisplay').value = '';
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

function cacheInhibitTimerTick () {
  if (webState.cacheInhibitTimer > 0) webState.cacheInhibitTimer--;
}

// On initial load or reload of page, inhibit timers
webState.cacheInhibitTimer = 3;

// -----------------------
// Die (Server) button
// -----------------------
document.getElementById('serverTerminateButton').addEventListener('click', function() {
  console.log('Requesting backend server to terminate');
  let fetchURL = webServerUrl + '/terminate';
  let fetchOptions = {
    method: 'POST',
    headers: {
      'Content-type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({terminate: 'YES'})
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
      console.log(JSON.stringify(responseJson));
    })
    .catch( (error) => {
      showError('Terminate: Unable to connect');
      console.log(error);
    });
});

// ---------------------------------------
// Request server to erase message cache
//
// Route:  /erase
// ---------------------------------------
document.getElementById('eraseCacheButton').addEventListener('click', function() {
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
      'Accept': 'application/json'
    },
    body: JSON.stringify({erase: 'YES'})
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
        document.getElementById('rawMessageDisplay').value = '';
        document.getElementById('rawMessageInputId').value = '';
        webState.privMsgOpen = false;
        webState.noticeOpen = false;
        webState.wallopsOpen = false;
        updateDivVisibility();
      }
    })
    .catch( (error) => {
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
      webState.loginUser = responseJson;
    })
    .catch( (error) => {
      console.log(error);
    });
};
updateUsername();

// --------------------
// Test Button #1
// --------------------
document.getElementById('test1Button').addEventListener('click', function() {
  console.log('Test1 button pressed.');

  let fetchURL = webServerUrl + '/irc/test1';
  let fetchOptions = {
    method: 'GET',
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
      console.log(JSON.stringify(responseJson, null, 2));
      if (responseJson.error) {
        showError(responseJson.message);
      }
    })
    .catch( (error) => {
      console.log(error);
      if (error) showError(error.toString());
    });
});
document.getElementById('test1ButtonDesc').textContent = 'Force garbage collect';

// --------------------
// Test Button #2
// --------------------
document.getElementById('test2Button').addEventListener('click', function() {
  console.log('Test2 button pressed.');

  let fetchURL = webServerUrl + '/irc/test2';
  let fetchOptions = {
    method: 'GET',
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
        console.log(response);
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
      if (error) showError(error.toString());
    });
});
document.getElementById('test2ButtonDesc').textContent = 'Emulate IRC ping timeout';

// --------------------
// Test Button #3
// --------------------
document.getElementById('test3Button').addEventListener('click', function() {
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
document.getElementById('test4Button').addEventListener('click', function() {
  console.log('Test 4 button pressed.');

  // ---------------------------------
  console.log('Test 4 getIrcState()');
  getIrcState();
  // ---------------------------------
});
document.getElementById('test4ButtonDesc').textContent = 'Call getIrcState()';

// ---------------------------------------------------------------------------
// This is some code to dynamically resize the width of the textarea elements
//
// First, html file defines textarea with width of 120 columns.
// Next get the width in pixels for 120 columns (font dependant?)
// Save this factor as a constant
// Get the window innerWidth and divide by the factor.
// ---------------------------------------------------------------------------
const columnSize =
  (document.getElementById('rawMessageDisplay').getBoundingClientRect().width + 10)/ 120;

// console.log('columnSize ' + columnSize);
// console.log(document.getElementById('rawMessageDisplay').getBoundingClientRect());
//
// Function called both initially and also no event
const adjustInputToWidowWidth = function (innerWidth) {
  let cols = parseInt((window.innerWidth / columnSize) - 5);
  // static text area defined in webclient.html
  document.getElementById('userPrivMsgInputId').setAttribute('cols', (cols-8).toString());
  document.getElementById('noticeMessageDisplay').setAttribute('cols', cols.toString());
  document.getElementById('wallopsMessageDisplay').setAttribute('cols', cols.toString());
  document.getElementById('rawMessageDisplay').setAttribute('cols', cols.toString());
  document.getElementById('rawMessageInputId').setAttribute('cols', (cols-8).toString());

  // In the IRC channel area, this is to handle main
  //     text area when it is split with nickname list.
  if (webState.resizableChanSplitTextareaIds.length > 0) {
    webState.resizableChanSplitTextareaIds.forEach(function(id) {
      if (document.getElementById(id)) {
        if (window.innerWidth > 600) {
          document.getElementById(id).setAttribute('cols', (cols-23).toString());
        } else {
          document.getElementById(id).setAttribute('cols', cols.toString());
        }
      } else {
        console.log('Error: ' + id);
      }
    });
  }

  // This is single line text area with SEND button next to it.
  if (webState.resizableSendButtonTextareaIds.length > 0) {
    webState.resizableSendButtonTextareaIds.forEach(function(id) {
      if (document.getElementById(id)) {
        document.getElementById(id).setAttribute('cols', (cols-8).toString());
      } else {
        console.log('Error: ' + id);
      }
    });
  }

  // This is for dynamically generated elements
  // Private message <textarea> element for auto-resize
  if (webState.resizablePrivMsgTextareaIds.length > 0) {
    webState.resizablePrivMsgTextareaIds.forEach(function(id) {
      if (document.getElementById(id)) {
        document.getElementById(id).setAttribute('cols', cols.toString());
      } else {
        console.log('Error: ' + id);
      }
    });
  }
  if (webState.resizableSendButtonPMTextareaIds.length > 0) {
    webState.resizableSendButtonPMTextareaIds.forEach(function(id) {
      if (document.getElementById(id)) {
        document.getElementById(id).setAttribute('cols', (cols-8).toString());
      } else {
        console.log('Error: ' + id);
      }
    });
  }
  document.getElementById('errorDiv').style.width = '100%';

  // Debug: To watch a variable, put it here.
  if (!webState.watch) webState.watch = {};
  webState.watch.innerWidth = window.innerWidth.toString() + 'px';
  webState.watch.innerHeight = window.innerHeight.toString() + 'px';
};
//
// Event listener for resize widnow
//
window.addEventListener('resize', function(event) {
  if (columnSize) {
    adjustInputToWidowWidth(event.currentTarget.innerWidth);
  }
}.bind(this));
//
// Resize on request by fire event
//
window.addEventListener('element-resize', function(event) {
  adjustInputToWidowWidth(window.innerWidth);
}.bind(this));
//
// Do initially on page load
//
adjustInputToWidowWidth(window.innerWidth);

//
// After everything is sized, the area may be hidden
//
// document.getElementById('webDisconnectedHiddenDiv').setAttribute('hidden', '');
// document.getElementById('rawHiddenElements').setAttribute('hidden', '');
// document.getElementById('rawHiddenElementsButton').textContent = '+';
// document.getElementById('rawHeadRightButtons').setAttribute('hidden', '');

//
// 1 second utility timer
//
setInterval(function() {
  errorTimerTickHandler();
  heartbeatTimerTickHandler();
  reconnectTimerTickHandler();
  beepTimerTick();
  updateElapsedTimeDisplay();
  cacheInhibitTimerTick();
}.bind(this), 1000);

// -----------------------------
//   D O   T H I S   L A S T
// -----------------------------
firstWebSocketConnectOnPageLoad();
