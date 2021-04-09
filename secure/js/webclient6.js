// ------------------------------------------------------------
// webclient6 - Display raw server messages and program info
//              End of javascript load initializations
// ------------------------------------------------------------

function _parseInputForIRCCommands(textAreaEl) {
  if ((textAreaEl.value.length > 0)) {
    let text = textAreaEl.value;
    text = text.replace('\r', '').replace('\n', '');

    // TODO copy/paste multiple lines

    let commandAction = textCommandParser(
      {
        inputString: text,
        originType: 'generic',
        originName: null
      }
    );
    // clear input element
    textAreaEl.value = '';
    if (commandAction.error) {
      showError(commandAction.message);
      return;
    } else {
      if ((commandAction.ircMessage) && (commandAction.ircMessage.length > 0)) {
        _sendIrcServerMessage(commandAction.ircMessage);
      }
      return;
    }
  }
};


// -------------------------
// raw Show/Hide button handler
// -------------------------
document.getElementById('rawHiddenElementsButton').addEventListener('click', function() {
  if (document.getElementById('rawHiddenElements').hasAttribute('hidden')) {
    document.getElementById('rawHiddenElements').removeAttribute('hidden');
    document.getElementById('rawHiddenElementsButton').textContent = '-';
    document.getElementById('rawHeadRightButtons').removeAttribute('hidden');
    // scroll message to most recent
    document.getElementById('rawMessageDisplay').scrollTop =
      document.getElementById('rawMessageDisplay').scrollHeight;
  } else {
    document.getElementById('rawHiddenElements').setAttribute('hidden', '');
    document.getElementById('rawHiddenElementsButton').textContent = '+';
    document.getElementById('rawHeadRightButtons').setAttribute('hidden', '');
  }
});

// -------------------------
// raw Clear button handler
// -------------------------
document.getElementById('rawClearButton').addEventListener('click', function() {
  document.getElementById('rawMessageDisplay').textContent = '';
  document.getElementById('rawMessageDisplay').setAttribute('rows', '10');
});
// -------------------------
// raw Taller button handler
// -------------------------
document.getElementById('rawTallerButton').addEventListener('click', function() {
  let newRows =
    parseInt(document.getElementById('rawMessageDisplay').getAttribute('rows')) + 10;
  document.getElementById('rawMessageDisplay').setAttribute('rows', newRows.toString());
}.bind(this));

// -------------------------
// raw Normal button handler
// -------------------------
document.getElementById('rawNormalButton').addEventListener('click', function() {
  document.getElementById('rawMessageDisplay').setAttribute('rows', '10');
}.bind(this));

// --------------------------------
// Send IRC command button pressed
// --------------------------------
document.getElementById('sendRawMessageButton').addEventListener('click', function() {
  _parseInputForIRCCommands(document.getElementById('rawMessageInputId'));
}.bind(this));
// --------------------------------
// Send IRC command Enter pressed
// --------------------------------
document.getElementById('rawMessageInputId').addEventListener('input', function(event) {
  if (((event.inputType === 'insertText') && (event.data === null)) ||
    (event.inputType === 'insertLineBreak')) {
    _parseInputForIRCCommands(document.getElementById('rawMessageInputId'));
  }
}.bind(this));

// -----------------------------
// Show Debug button handler
// -----------------------------
document.getElementById('showDebugButton').addEventListener('click', function() {
  if (document.getElementById('hiddenDebugDiv').hasAttribute('hidden')) {
    document.getElementById('hiddenDebugDiv').removeAttribute('hidden');
  } else {
    document.getElementById('hiddenDebugDiv').setAttribute('hidden', '');
  }
}.bind(this));

// --------------------------------
// Update from cache (button)
// --------------------------------
document.getElementById('loadFromCacheButton').addEventListener('click', function() {
  updateFromCache();
}.bind(this));

// -----------------------
// Show all divs button
// -----------------------
document.getElementById('showAllDivsButton').addEventListener('click', function() {
  // Emit event for dynamically generated hidden divs
  document.dispatchEvent(new CustomEvent('show-all-divs', {bubbles: true}));
}.bind(this));

// -----------------------
// Hide all divs button
// -----------------------
document.getElementById('hideAllDivsButton').addEventListener('click', function() {
  // Emit event for dynamically generated hidden divs
  document.dispatchEvent(new CustomEvent('hide-all-divs', {bubbles: true}));
}.bind(this));

// -----------------------
// Variables button
// -----------------------
document.getElementById('variablesButtonId').addEventListener('click', function() {
  document.getElementById('variablesDivId').removeAttribute('hidden');
  document.getElementById('variablesPreId').textContent =
    'Press [Variables] to refresh\n' +
    'Press [Debug] to close\n' +
    '----------------------------\n\n' +
    'ircState = ' + JSON.stringify(ircState, null, 2) + '\n\n' +
    'webState = ' + JSON.stringify(webState, null, 2);
}.bind(this));

document.getElementById('rawDisplayHexButtonId').addEventListener('click', function() {
  if (webState.rawShowHex) {
    webState.rawShowHex = false;
    document.getElementById('rawDisplayHexButtonId').classList.remove('button-on-color');
  } else {
    webState.rawShowHex = true;
    document.getElementById('rawDisplayHexButtonId').classList.add('button-on-color');
  }
});

// -----------------------
// Die (Server) button
// -----------------------
document.getElementById('serverTerminateButton').addEventListener('click', function() {
  console.log('Requesting backend server to terminate');
  let fetchURL = webServerUrl + '/terminate';
  let fetchOptions = {
    method: 'POST',
    timeout: 10000,
    // credentials: 'include',
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

// -------------------------
//  Show/Hide license info
// -------------------------
document.getElementById('infoOpenCloseButton').addEventListener('click', function() {
  if (document.getElementById('hiddenInfoDiv').hasAttribute('hidden')) {
    document.getElementById('hiddenInfoDiv').removeAttribute('hidden');
  } else {
    document.getElementById('hiddenInfoDiv').setAttribute('hidden', '');
  }
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
    timeout: 10000,
    // credentials: 'include',
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
        document.getElementById('noticeMessageDisplay').textContent = '';
        document.getElementById('wallopsMessageDisplay').textContent = '';
        document.getElementById('rawMessageDisplay').textContent = '';
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
      console.log(JSON.stringify(responseJson, null, 2));
    })
    .catch( (error) => {
      console.log(error);
    });
});

// --------------------
// Test Button #2
// --------------------
document.getElementById('test2Button').addEventListener('click', function() {
  console.log('Test2 button pressed.');

  let fetchURL = webServerUrl + '/irc/test2';
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
        console.log(response);
        throw new Error('Fetch status ' + response.status + ' ' + response.statusText);
      }
    })
    .then( (responseJson) => {
      console.log(JSON.stringify(responseJson, null, 2));
    })
    .catch( (error) => {
      console.log(error);
    });
});

// --------------------
// Test Button #3
// --------------------
document.getElementById('test3Button').addEventListener('click', function() {
  console.log('Test3 button pressed.');

  // send over socket to web server
  // console.log('Sent to WebServer Socket: Test 2 pressed');
  // wsocket.send('Sent to WebServer Socket: Test 2 pressed');

  document.dispatchEvent(new CustomEvent('show-error-message',
    {
      bubbles: true,
      detail: {
        message: 'A test error has occurred.'
      }
    }));

  // document.getElementById('rawMessageDisplay').textContent +=
  //   'innerWidth ' + window.innerWidth + '\n';
});

// --------------------
// Test Button #4
// --------------------
document.getElementById('test4Button').addEventListener('click', function() {
  console.log('Test4 button pressed.');
  getIrcState(function(err, data) {
    if (err) {
      console.log(err);
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
  });
});

// ---------------------------------------------------------------------------
// This is some code to dynamically resize the width of the textarea elements
//
// First, html file defines textarea with width of 120 columns.
// Next get the width in pixels for 120 columns (font dependant?)
// Save this factor as a constant
// Get the window innerWidth and divide by the factor.
// ---------------------------------------------------------------------------
const colummSize =
  (document.getElementById('rawMessageDisplay').getBoundingClientRect().width + 10)/ 120;

//
// Function called both initially and also no event
const adjustInputToWidowWidth = function (innerWidth) {
  let cols = parseInt((window.innerWidth / colummSize) - 4);
  // static text area defined in webclient.html
  document.getElementById('userPrivMsgInputId').setAttribute('cols', cols.toString());
  document.getElementById('noticeMessageDisplay').setAttribute('cols', cols.toString());
  document.getElementById('wallopsMessageDisplay').setAttribute('cols', cols.toString());
  document.getElementById('rawMessageDisplay').setAttribute('cols', cols.toString());
  document.getElementById('rawMessageInputId').setAttribute('cols', cols.toString());
  // array of text areas generated dynamically by javascript.
  if (webState.resizeableTextareaIds.length > 0) {
    webState.resizeableTextareaIds.forEach(function(id) {
      document.getElementById(id).setAttribute('cols', cols.toString());
    });
  }
  if (webState.resizeableChanareaIds.length > 0) {
    webState.resizeableChanareaIds.forEach(function(id) {
      if (window.innerWidth > 600) {
        document.getElementById(id).setAttribute('cols', (cols-23).toString());
      } else {
        document.getElementById(id).setAttribute('cols', cols.toString());
      }
    });
  }
  document.getElementById('errorDiv').style.width = '100%';
  // for see width of phone
  if (!webState.watch) webState.watch = {};
  webState.watch.innerWidth = window.innerWidth.toString() + 'px';
};
//
// Event listener for resize widnow
//
window.addEventListener('resize', function(event) {
  if (colummSize) {
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
document.getElementById('rawHiddenElements').setAttribute('hidden', '');
document.getElementById('rawHiddenElementsButton').textContent = '+';
document.getElementById('rawHeadRightButtons').setAttribute('hidden', '');

//
// 1 second utility timer
//
setInterval(function() {
  errorTimerTickHandler();
  onHeartbeatTimerTick();
}.bind(this), 1000);
