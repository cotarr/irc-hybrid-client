// ------------------------------------------------------------
// webclient09.js  - Display formatted server messages
//
// Note: unformatted raw server messages displayed in webclient02.js
// ------------------------------------------------------------
'use strict';
// -------------------------------------------------------------------------
// Internaal function to detect IRC slash commands
// by parsing input on server window user input textarea.
// -------------------------------------------------------------------------
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

// -----------------------------------------------
// Send IRC server textarea send button pressed
// -----------------------------------------------
document.getElementById('sendRawMessageButton').addEventListener('click', function() {
  _parseInputForIRCCommands(document.getElementById('rawMessageInputId'));
}.bind(this));
// ---------------------------------------
// Send IRC server textarea Enter pressed
// ---------------------------------------
document.getElementById('rawMessageInputId').addEventListener('input', function(event) {
  if (((event.inputType === 'insertText') && (event.data === null)) ||
    (event.inputType === 'insertLineBreak')) {
    _parseInputForIRCCommands(document.getElementById('rawMessageInputId'));
  }
}.bind(this));

// -------------------------------------------------
// In first text field of message
// Exchange Unix seconds with HH:MM:SS time format
// -------------------------------------------------
function substituteHmsTime(inMessage) {
  let timeSeconds = inMessage.split(' ')[0];
  let restOfMessage = inMessage.slice(timeSeconds.length + 1, inMessage.length);
  let timeObj = new Date(parseInt(timeSeconds) * 1000);
  let hmsString = '';
  hmsString += timeObj.getHours().toString().padStart(2, '0') + ':';
  hmsString += timeObj.getMinutes().toString().padStart(2, '0') + ':';
  hmsString += timeObj.getSeconds().toString().padStart(2, '0');
  return hmsString + ' ' + restOfMessage;
}

// ---------------------------------------------------------------------------
// Global event listener
//
// Messages from the IRC server are parsed for commands in another module.
// If raw server message is selected, that is performed in another module.
// Non-server messages, i.e. channel PRIVMSG are filtered in another module.
//
// Else, this is where filtered server message are formatted for display
// ---------------------------------------------------------------------------
document.addEventListener('server-message', function(event) {
  // console.log(JSON.stringify(event.detail, null, 2));

  switch(event.detail.parsedMessage.command) {
    case '372': // irc server motd
      displayRawMessage(
        cleanFormatting(
          cleanCtcpDelimiter(
            event.detail.parsedMessage.timestamp + ' ' +
            event.detail.parsedMessage.params[1])));
      break;
    case '375': // Start MOTD
      break;
    case '376': // End MOTD
      break;
    case 'MODE':
      displayRawMessage(
        cleanFormatting(
          cleanCtcpDelimiter(
            event.detail.parsedMessage.timestamp + ' ' +
            'MODE ' +
            event.detail.parsedMessage.params[0] + ' ' +
            event.detail.parsedMessage.params[1])));

      break;
    default:
      // this is catch-all, if no formatted case, then display here
      if (true) {
        displayRawMessage(
          cleanFormatting(
            cleanCtcpDelimiter(
              substituteHmsTime(event.detail.message))));
      }
  } // switch
  showRawMessageWindow();
}); // server-message event handler

// -------------------------
// raw Show/Hide button handler
// -------------------------
document.getElementById('rawHiddenElementsButton').addEventListener('click', function() {
  if (document.getElementById('rawHiddenElements').hasAttribute('hidden')) {
    showRawMessageWindow();
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

// -----------------------------
// Show Debug button handler
// -----------------------------
document.getElementById('showDebugButton').addEventListener('click', function() {
  if (document.getElementById('hiddenDebugDiv').hasAttribute('hidden')) {
    document.getElementById('hiddenDebugDiv').removeAttribute('hidden');
  } else {
    document.getElementById('hiddenDebugDiv').setAttribute('hidden', '');
    document.getElementById('variablesDivId').setAttribute('hidden', '');
  }
}.bind(this));

// --------------------------------
// Update from cache (button)
// --------------------------------
document.getElementById('loadFromCacheButton').addEventListener('click', function() {
  // updateFromCache();
  document.dispatchEvent(new CustomEvent('update-from-cache', {bubbles: true}));
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
  if (document.getElementById('variablesDivId').hasAttribute('hidden')) {
    document.getElementById('variablesDivId').removeAttribute('hidden');

    // also updated from getIrcState()
    document.getElementById('variablesPreId').textContent =
      'ircState = ' + JSON.stringify(ircState, null, 2) + '\n\n' +
      'webState = ' + JSON.stringify(webState, null, 2);
  } else {
    document.getElementById('variablesDivId').setAttribute('hidden', '');
  }
}.bind(this));

// -------------------------
// Text Format checkbox handler
// -------------------------
document.getElementById('viewRawMessagesCheckbox').addEventListener('click', function(e) {
  if (document.getElementById('viewRawMessagesCheckbox').checked) {
    document.getElementById('showRawInHexCheckbox').removeAttribute('disabled');
    document.getElementById('showCommsCheckbox').removeAttribute('disabled');
    webState.viewRawMessages = true;
  } else {
    document.getElementById('showRawInHexCheckbox').checked = false;
    document.getElementById('showRawInHexCheckbox').setAttribute('disabled', '');
    document.getElementById('showCommsCheckbox').checked = false;
    document.getElementById('showCommsCheckbox').setAttribute('disabled', '');
    webState.viewRawMessages = false;
    webState.showRawInHex = false;
    webState.showCommsMessages = false;
  }
  // this forces a global update which will refreesh text area
  document.dispatchEvent(new CustomEvent('update-from-cache', {bubbles: true}));
});
document.getElementById('showRawInHexCheckbox').addEventListener('click', function() {
  if (document.getElementById('showRawInHexCheckbox').checked) {
    webState.showRawInHex = true;
  } else {
    webState.showRawInHex = false;
  }
  // this forces a global update which will refreesh text area
  document.dispatchEvent(new CustomEvent('update-from-cache', {bubbles: true}));
});
document.getElementById('showCommsCheckbox').addEventListener('click', function() {
  if (document.getElementById('showCommsCheckbox').checked) {
    webState.showCommsMessages = true;
  } else {
    webState.showCommsMessages = false;
  }
  // this forces a global update which will refreesh text area
  document.dispatchEvent(new CustomEvent('update-from-cache', {bubbles: true}));
});

// -------------------------
//  Show/Hide license info
// -------------------------
document.getElementById('infoOpenCloseButton').addEventListener('click', function() {
  if (document.getElementById('hiddenInfoDiv').hasAttribute('hidden')) {
    document.getElementById('hiddenInfoDiv').removeAttribute('hidden');
    document.getElementById('infoOpenCloseButton').textContent = '-';
  } else {
    document.getElementById('hiddenInfoDiv').setAttribute('hidden', '');
    document.getElementById('infoOpenCloseButton').textContent = '+';
  }
});
