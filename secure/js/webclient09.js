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
// ------------------------------------------------------------
// webclient09.js  - Display formatted server messages
//
// Note: unformatted raw server messages displayed in webclient02.js
// ------------------------------------------------------------
'use strict';
// -------------------------------------------------------------------------
// Internal function to detect IRC slash commands
// by parsing input on server window user input textarea.
// -------------------------------------------------------------------------
function _parseInputForIRCCommands(textAreaEl) {
  let text = stripTrailingCrLf(textAreaEl.value);
  if (detectMultiLineString(text)) {
    textAreaEl.value = '';
    showError('Multi-line input is not supported.');
  } else {
    if (text.length > 0) {
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
  }
  textAreaEl.value = '';
};

// -----------------------------------------------
// Send IRC server textarea send button pressed
// -----------------------------------------------
document.getElementById('sendRawMessageButton').addEventListener('click', function() {
  _parseInputForIRCCommands(document.getElementById('rawMessageInputId'));
  document.getElementById('rawMessageInputId').focus();
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
  // This will skip prefix, command, and param[0], printing the rest
  function _showAfterParamZero (parsedMessage) {
    let msgString = '';
    if (parsedMessage.params.length > 1) {
      for (let i = 1; i< parsedMessage.params.length; i++) {
        msgString += ' ' + parsedMessage.params[i];
      }
    } else {
      console.log('Error _showAfterParamZero() no parsed field');
    }
    displayRawMessage(
      cleanFormatting(
        cleanCtcpDelimiter(
          parsedMessage.timestamp + msgString)));
  }

  // console.log(JSON.stringify(event.detail, null, 2));

  switch(event.detail.parsedMessage.command) {
    //
    // Server First connect messages
    //
    case '001':
    case '002':
    case '003':
    case '004':
      _showAfterParamZero(event.detail.parsedMessage);
      break;
    case '005':
      break;
    case '250':
    case '251':
    case '252':
    case '254':
    case '255':
    case '265':
    case '265':
      _showAfterParamZero(event.detail.parsedMessage);
      break;

    // Admin
    case '256':
    case '257':
    case '258':
    case '259':
      _showAfterParamZero(event.detail.parsedMessage);
      break;
    //
    // Who response
    //
    case '315':
      break;
    case '352':
      _showAfterParamZero(event.detail.parsedMessage);
      break;

    //
    // Whois response
    //
    case '275':
    case '301':
    case '307':
    case '311':
    case '312':
    case '313':
    case '317':
    case '318':
    case '319':
      _showAfterParamZero(event.detail.parsedMessage);
      break;

    //
    // LIST
    //
    // case '322': // irc server motd
    //   _showAfterParamZero(event.detail.parsedMessage);
    //   break;
    // case '321': // Start LIST
    // case '323': // End LIST
    //   break;
    //
    // VERSION TODO
    //
    // case '351':
    //   _showAfterParamZero(event.detail.parsedMessage);
    //   break;
    //
    // MOTD
    //
    case '372': // irc server motd
      _showAfterParamZero(event.detail.parsedMessage);
      break;
    case '375': // Start MOTD
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

    case 'NOTICE':
      displayRawMessage(
        cleanFormatting(
          cleanCtcpDelimiter(
            event.detail.parsedMessage.timestamp + ' ' +
            'NOTICE ' +
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
  document.getElementById('rawMessageDisplay').value = '';
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
