// ---------------------------------------------
// webclient04.js - Connect/Disconnect API requests
// ---------------------------------------------
'use strict';
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
}); // cycleNextServerButton()

// -------------------------
// Connect Button Handler
// -------------------------
function connectButtonHandler() {
  // change color of icon
  webState.ircConnecting = true;
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
  connectObject.realName = document.getElementById('realNameInputId').value;
  connectObject.userMode = document.getElementById('userModeInputId').value;

  let fetchURL = webServerUrl + '/irc/connect';
  let fetchOptions = {
    method: 'POST',
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
}; // connectButtonHandler

document.getElementById('connectButton').addEventListener('click', function() {
  connectButtonHandler();
}.bind(this));

// ------------------------------------------------
// Tap "Web" status icon to connect/disconnect
// ------------------------------------------------
var ircStatusIconTouchDebounce = false;
document.getElementById('ircConnectIconId').addEventListener('click', function() {
  if (!webState.webConnected) return;
  // debounce button
  if (ircStatusIconTouchDebounce) return;
  ircStatusIconTouchDebounce = true;
  setTimeout(function() {
    ircStatusIconTouchDebounce = false;
  }, 1000);
  if (ircState.ircConnected) {
    //
    // disconnect
    _sendIrcServerMessage('QUIT');
  } else {
    //
    // Connect
    connectButtonHandler();
  }
});

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
  _sendIrcServerMessage('QUIT');
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
  if (((ircState.ircConnected) && (webState.webConnected)) || (!webState.webConnected)) {
    document.getElementById('logoutConfirmDiv').removeAttribute('hidden');
  } else {
    window.location.href='/logout';
  }
});
document.getElementById('cancelLogoutConfirmButton').addEventListener('click', function() {
  document.getElementById('logoutConfirmDiv').setAttribute('hidden', '');
});

//
// Away icon click to cancel away
//
document.getElementById('ircIsAwayIconId').addEventListener('click', function() {
  if ((ircState.ircConnected) && (ircState.ircIsAway)) {
    _sendIrcServerMessage('AWAY');
  }
});

document.getElementById('setAwayButton').addEventListener('click', function() {
  if ((ircState.ircConnected) &&
    (document.getElementById('userAwayMessageId').value.length > 0)) {
    _sendIrcServerMessage('AWAY ' + document.getElementById('userAwayMessageId').value);
  }
});
document.getElementById('setBackButton').addEventListener('click', function() {
  if ((ircState.ircConnected) && (ircState.ircIsAway)) {
    _sendIrcServerMessage('AWAY');
  }
});
