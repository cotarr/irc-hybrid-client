// --------------------------------------------------------------------------------
// webclient3.js - Websocket Management
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
//
// 1) Test /status
// 2) Test /secure
// 3) Call function to open socket
//
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
