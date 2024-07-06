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
//    Web socket security test
//    Development only.
//    Testing web page: /testws/test-websocket.html
//
// --------------------------------------------

'use strict';

// CSRF token needed by /irc/wsauth route
const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

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

// -----------------------------------------------------
// Functions to display progress on the browser web page
// -----------------------------------------------------
function logMessage (message) {
  document.getElementById('logContent').textContent += message + '\n';
};
function showContent (message) {
  document.getElementById('messageContent').textContent += message;
};

// Clear Initial textContent
document.getElementById('logContent').textContent = '';
document.getElementById('messageContent').textContent = '';

// -----------------------------------------------
// This commands the backend web server to expect
// the browser to attempt a websocket connection.
// -----------------------------------------------
function initWebSocketAuth () {
  const fetchURL = webServerUrl + '/irc/wsauth';
  const fetchOptions = {
    method: 'POST',
    headers: {
      'Content-type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({ purpose: 'websocket-auth' })
  };
  if (!document.getElementById('noCsrfTokenCheckbox').checked) {
    if (document.getElementById('invalidCsrfTokenCheckbox').checked) {
      // This is a random generated CSRF token that will not match session storage
      fetchOptions.headers['CSRF-Token'] = '0agVm341bCin1sfG9gF9ocYsdW8';
    } else {
      fetchOptions.headers['CSRF-Token'] = csrfToken;
    }
  }
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
      // console.log(responseJson);
      if (responseJson.error) {
        logMessage('Error occurred');
        logMessage(responseJson.message);
      } else {
        logMessage('Websocket authorization successfully scheduled');
      }
    })
    .catch((error) => {
      console.log(error);
      logMessage(error);
    });
} // initWebSocketAuth

// ----------------------
// Button press handler
// ----------------------
document.getElementById('schedAuthButton').addEventListener('click', function () {
  logMessage('Requesting schedule websocket auth');
  initWebSocketAuth();
});

// place holder
let wsocket = null;

// ---------------------------------------------------
// This function establishes a websocket connection
// to the backend web server.
// ---------------------------------------------------
function connectWebSocket () {
  // Create WebSocket connection.
  // This replaces temporary dummy variable
  wsocket = new WebSocket(webSocketUrl + '/irc/ws');

  // -----------------------
  // On Open event handler
  // -----------------------
  wsocket.addEventListener('open', function (event) {
    logMessage('websocket: open event fired.');
  });

  // -----------------------
  // On Close event handler
  // -----------------------
  wsocket.addEventListener('close', function (event) {
    logMessage('websocket: close event fired');
  });

  // -----------------------
  // On Error event handler
  // -----------------------
  wsocket.addEventListener('error', function (error) {
    if (error) {
      console.log(error);
      logMessage('websocket: error event fired');
    }
  });

  // -----------------------------------
  // Listen for messages on websocket
  // -----------------------------------
  // Caution, this shows the raw message buffer.
  // It may contain multiple messages,
  // or message fragments, split between packets
  // -----------------------------------
  wsocket.addEventListener('message', function (event) {
    showContent(event.data);
  });
};

// ----------------------
// Button press handler
// ----------------------
document.getElementById('connectWebSocket').addEventListener('click', function () {
  logMessage('Attempting to connect websocket');
  connectWebSocket();
});

// ----------------------
// Clear Button press handler
// ----------------------
document.getElementById('clearMessages').addEventListener('click', function () {
  document.getElementById('logContent').textContent = '';
  document.getElementById('messageContent').textContent = '';
});

function sendUnexpectedMessage () {
  if ((wsocket) && (wsocket.readyState === 1)) {
    logMessage('Sending unexpected websocket message: "MYMESSAGE"');
    wsocket.send('MYMESSAGE');
  } else {
    logMessage('Error: Websocket not connected');
  }
}

document.getElementById('sendUnexpectedMessage').addEventListener('click', function () {
  sendUnexpectedMessage();
});

logMessage('Page loaded.');
