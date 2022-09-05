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
function _parseInputForIRCCommands (textAreaEl) {
  const text = stripTrailingCrLf(textAreaEl.value);
  if (detectMultiLineString(text)) {
    textAreaEl.value = '';
    showError('Multi-line input is not supported.');
  } else {
    if (text.length > 0) {
      const commandAction = textCommandParser(
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
document.getElementById('sendRawMessageButton').addEventListener('click', function () {
  _parseInputForIRCCommands(document.getElementById('rawMessageInputId'));
  document.getElementById('rawMessageInputId').focus();
});
// ---------------------------------------
// Send IRC server textarea Enter pressed
// ---------------------------------------
document.getElementById('rawMessageInputId').addEventListener('input', function (event) {
  if (((event.inputType === 'insertText') && (event.data === null)) ||
    (event.inputType === 'insertLineBreak')) {
    // Remove EOL characters at cursor loction
    stripOneCrLfFromElement(document.getElementById('rawMessageInputId'));
    _parseInputForIRCCommands(document.getElementById('rawMessageInputId'));
  }
});

// ---------------------------------------
// textarea before input event handler
//
// Auto complete function
//
// Keys:  desktop: tab,  mobile phone: space-space
// Channel name selected by tab-tab or space-space-space
// ---------------------------------------
const _autoCompleteServInputElement = function (snippet) {
  const serverInputAreaEl = document.getElementById('rawMessageInputId');
  let last = '';
  const trailingSpaceKey = 32;
  // parse last space character delimitered string
  // console.log('snippet ' + snippet);
  //
  // Check snippet in list of IRC text commands
  let matchedCommand = '';
  if (autoCompleteCommandList.length > 0) {
    for (let i = 0; i < autoCompleteCommandList.length; i++) {
      if (autoCompleteCommandList[i].indexOf(snippet.toUpperCase()) === 0) {
        matchedCommand = autoCompleteCommandList[i];
      }
    }
  }
  // Check snippet in list of IRC text commands
  let matchedRawCommand = '';
  if (autoCompleteRawCommandList.length > 0) {
    for (let i = 0; i < autoCompleteRawCommandList.length; i++) {
      if (autoCompleteRawCommandList[i].indexOf(snippet.toUpperCase()) === 0) {
        matchedRawCommand = autoCompleteRawCommandList[i];
      }
    }
  }
  // If valid irc command and if beginning of line where snippet = input.value
  if ((matchedCommand.length > 0) && (serverInputAreaEl.value === snippet)) {
    // #1 check if IRC text command?
    serverInputAreaEl.value =
      serverInputAreaEl.value.slice(0, serverInputAreaEl.value.length - snippet.length);
    serverInputAreaEl.value += matchedCommand;
    serverInputAreaEl.value += String.fromCharCode(trailingSpaceKey);
    last = matchedCommand;
  } else if ((matchedRawCommand.length > 0) &&
    (serverInputAreaEl.value.slice(0, 7).toUpperCase() === '/QUOTE ')) {
    // #2 Line starts with /QUOTE and rest is a valid raw irc command
    serverInputAreaEl.value =
      serverInputAreaEl.value.slice(0, serverInputAreaEl.value.length - snippet.length);
    serverInputAreaEl.value += matchedRawCommand;
    serverInputAreaEl.value += String.fromCharCode(trailingSpaceKey);
    last = matchedRawCommand;
  } else if (ircState.nickName.toLowerCase().indexOf(snippet.toLowerCase()) === 0) {
    // #3 check if my nickname
    // This also matches empty snipped, defaulting to nickname
    serverInputAreaEl.value =
      serverInputAreaEl.value.slice(0, serverInputAreaEl.value.length - snippet.length);
    serverInputAreaEl.value += ircState.nickName;
    serverInputAreaEl.value += String.fromCharCode(trailingSpaceKey);
    last = ircState.nickName;
    // #5 channel name replace space
  } else {
    // #7 not match other, abort, add trailing space
    serverInputAreaEl.value += String.fromCharCode(trailingSpaceKey);
  }
  return last;
};
let lastServAutoCompleteMatch = '';
const serverAutoComplete = function (e) {
  const serverInputAreaEl = document.getElementById('rawMessageInputId');
  const autoCompleteTabKey = 9;
  const autoCompleteSpaceKey = 32;
  const trailingSpaceKey = 32;
  if (!e.keyCode) return;

  if ((e.keyCode) && (e.keyCode === autoCompleteTabKey)) {
    if (serverInputAreaEl.value.length < 2) {
      e.preventDefault();
      return;
    }
    let snippet = '';
    const snippetArray = serverInputAreaEl.value.split(' ');
    if (snippetArray.length > 0) {
      snippet = snippetArray[snippetArray.length - 1];
    }
    if (snippet.length > 0) {
      if ((e.keyCode === autoCompleteTabKey) && (snippet.length > 0)) {
        _autoCompleteServInputElement(snippet);
      }
    } else {
      if (serverInputAreaEl.value.toUpperCase() === '/QUIT ') {
        // scase of autocomplete /QUIT shows version
        serverInputAreaEl.value += ircState.progName + ' ' + ircState.progVersion;
      } else {
        // following space character, default to nickname
        serverInputAreaEl.value += ircState.nickName;
      }
      serverInputAreaEl.value += String.fromCharCode(trailingSpaceKey);
    }
    e.preventDefault();
  } // case of tab key
  //
  // Case of space key to autocomplete on space-space
  if ((e.keyCode) && (e.keyCode === autoCompleteSpaceKey)) {
    if (serverInputAreaEl.value.length > 0) {
      // if previous characters is space (and this key is space too)
      if (serverInputAreaEl.value.charCodeAt(serverInputAreaEl.value.length - 1) ===
      autoCompleteSpaceKey) {
        if ((serverInputAreaEl.value.length > 1) &&
          (serverInputAreaEl.value.charCodeAt(serverInputAreaEl.value.length - 2) ===
          autoCompleteSpaceKey)) {
          //
          // auto complete from:  space-space-space
          //
          // Remove one of the space characters
          serverInputAreaEl.value =
            serverInputAreaEl.value.slice(0, serverInputAreaEl.value.length - 1);

          if (serverInputAreaEl.value.toUpperCase() === '/QUIT ') {
            // scase of autocomplete /QUIT shows version
            serverInputAreaEl.value += ircState.progName + ' ' + ircState.progVersion;
          } else {
            // following space character, default to nickname
            serverInputAreaEl.value += ircState.nickName;
          }
          serverInputAreaEl.value += String.fromCharCode(trailingSpaceKey);
          e.preventDefault();
        } else {
          //
          // auto complete from:  space-space-space
          //
          // remove trailing space to get snippet from split()
          serverInputAreaEl.value =
            serverInputAreaEl.value.slice(0, serverInputAreaEl.value.length - 1);
          let snippet = '';
          const snippetArray = serverInputAreaEl.value.split(' ');
          if (snippetArray.length > 0) {
            snippet = snippetArray[snippetArray.length - 1];
          }
          if (snippet.length > 0) {
            const matchStr = _autoCompleteServInputElement(snippet);
            if (lastServAutoCompleteMatch !== matchStr) {
              lastServAutoCompleteMatch = matchStr;
              e.preventDefault();
            }
            // serverInputAreaEl.value += String.fromCharCode(autoCompleteSpaceKey);
          } else {
            // else, put it back again, snippet was zero length
            serverInputAreaEl.value += String.fromCharCode(autoCompleteSpaceKey);
          }
        }
      }
    } else {
      // do nothing, allow space to be appended
    }
  } // case of tab key
};
document.getElementById('rawMessageInputId').addEventListener('keydown', serverAutoComplete, false);

// -------------------------------------------------
// In first text field of message
// Exchange Unix seconds with HH:MM:SS time format
// -------------------------------------------------
function substituteHmsTime (inMessage) {
  const timeString = inMessage.split(' ')[0];
  const restOfMessage = inMessage.slice(timeString.length + 1, inMessage.length);
  const hmsString = timestampToHMS(timeString);
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
document.addEventListener('server-message', function (event) {
  // console.log(JSON.stringify(event.detail, null, 2));

  // This will skip prefix, command, and param[0], printing the rest
  // If title provided, it will replace timestamp
  function _showAfterParamZero (parsedMessage, title) {
    let msgString = '';
    if (parsedMessage.params.length > 1) {
      for (let i = 1; i < parsedMessage.params.length; i++) {
        msgString += ' ' + parsedMessage.params[i];
      }
    } else {
      console.log('Error _showAfterParamZero() no parsed field');
    }
    let outMessage = parsedMessage.timestamp + msgString;
    if (title) {
      outMessage = title + msgString;
    }
    displayRawMessage(
      cleanFormatting(
        cleanCtcpDelimiter(outMessage)));
  }

  switch (event.detail.parsedMessage.command) {
    //
    // Server First connect messages
    //
    case '001':
    case '002':
    case '003':
    case '004':
      _showAfterParamZero(event.detail.parsedMessage, null);
      break;
    case '005':
      break;
    case '250':
    case '251':
    case '252':
    case '254':
    case '255':
    case '265':
      _showAfterParamZero(event.detail.parsedMessage, null);
      break;

    // Admin
    case '256':
    case '257':
    case '258':
    case '259':
      _showAfterParamZero(event.detail.parsedMessage, null);
      break;
    //
    // Who response
    //
    case '315':
      displayRawMessage('WHO --End--');
      break;
    case '352':
      _showAfterParamZero(event.detail.parsedMessage, 'WHO');
      break;

    //
    // Whois response
    //
    case '275':
    case '307':
    case '311':
    case '312':
    case '313':
    case '317':
    case '319':
    case '330':
    case '338':
    case '378':
    case '379':
    case '671':
      _showAfterParamZero(event.detail.parsedMessage, 'WHOIS');
      break;
    // AWAY message
    case '301':
      if (event.detail.parsedMessage.params.length !== 3) {
        // unexpected parse, just display verbatum from server
        _showAfterParamZero(event.detail.parsedMessage, 'WHOIS');
      } else {
        // else, show: WHOIS <nick> is away: <away message>
        const outMessage = 'WHOIS ' +
          event.detail.parsedMessage.params[1] +
          ' is away: ' +
          event.detail.parsedMessage.params[2];
        displayRawMessage(
          cleanFormatting(
            cleanCtcpDelimiter(outMessage)));
      }
      break;
    case '318':
      displayRawMessage('WHOIS --End--');
      break;

    //
    // LIST
    //
    case '322': // irc server motd
      if (event.detail.parsedMessage.params.length === 4) {
        let outMessage = 'LIST ' +
          event.detail.parsedMessage.params[1] + ' ' +
          event.detail.parsedMessage.params[2];
        if (event.detail.parsedMessage.params[3]) {
          outMessage += ' ' + event.detail.parsedMessage.params[3];
        };
        displayRawMessage(
          cleanFormatting(
            cleanCtcpDelimiter(outMessage)));
      } else {
        console.log('Error Msg 322 not have 4 parsed parameters');
      }
      break;
    case '321': // Start LIST
      // displayRawMessage('LIST --Start--');
      break;
    case '323': // End LIST
      displayRawMessage('LIST --End--');
      break;
    //
    // VERSION TODO
    //
    // case '351':
    //   _showAfterParamZero(event.detail.parsedMessage, null);
    //   break;
    //
    // MOTD
    //
    case '372': // irc server motd
      _showAfterParamZero(event.detail.parsedMessage, null);
      break;
    case '375': // Start MOTD
    case '376': // End MOTD
      break;

    //
    // IRCv3 CAP SASL authentication success messages
    //
    case '900':
    case '903':
      _showAfterParamZero(event.detail.parsedMessage, null);
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
    case 'NICK':
      displayRawMessage(
        cleanFormatting(
          cleanCtcpDelimiter(
            event.detail.parsedMessage.timestamp + ' ' +
            '(No channel) ' +
            event.detail.parsedMessage.nick + ' is now known as ' +
            event.detail.parsedMessage.params[0])));
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
    // none match, use default
    default:
      // this is catch-all, if no formatted case, then display here
      displayRawMessage(
        cleanFormatting(
          cleanCtcpDelimiter(
            substituteHmsTime(event.detail.message))));
  } // switch
  if (!webState.cacheReloadInProgress) {
    showRawMessageWindow();
  }
}); // server-message event handler

//
// Clear textarea before reloading cache (Server window)
//
document.addEventListener('erase-before-reload', function (event) {
  document.getElementById('rawMessageDisplay').value = '';
  document.getElementById('rawMessageInputId').value = '';
});

//
// Add cache reload message to server window
//
// Example:  14:33:02 -----Cache Reload-----
//
document.addEventListener('cache-reload-done', function (event) {
  //
  // If server display in raw mode, but not HEX mode, then after reloading cache
  // sort the lines by the timestamp in the cached message.
  // this is because multiple different cache buffers and combined
  // when viewing the raw server messages.
  //
  if ((webState.viewRawMessages) && (!webState.showRawInHex)) {
    const tempRawMessages =
      document.getElementById('rawMessageDisplay').value.split('\n');
    if (tempRawMessages.length > 1) {
      const tempTimestampArray = [];
      const tempSortIndexArray = [];
      const lineCount = tempRawMessages.length;
      for (let i = 0; i < lineCount; i++) {
        // @time=2022-09-04T19:56:01.900Z :nickname!user@host JOIN :#myChannel
        tempTimestampArray.push(new Date(
          tempRawMessages[i].split(' ')[0].split('=')[1]
        ));
        tempSortIndexArray.push(i);
      }
      let tempIndex = 0;
      for (let i = 0; i < lineCount; i++) {
        for (let j = 0; j < lineCount - 1; j++) {
          if (tempTimestampArray[tempSortIndexArray[j]] >
            tempTimestampArray[tempSortIndexArray[j + 1]]) {
            tempIndex = tempSortIndexArray[j];
            tempSortIndexArray[j] = tempSortIndexArray[j + 1];
            tempSortIndexArray[j + 1] = tempIndex;
          }
        } // next j
      } // next i
      document.getElementById('rawMessageDisplay').value = '';
      for (let i = 0; i < lineCount; i++) {
        document.getElementById('rawMessageDisplay').value +=
          tempRawMessages[tempSortIndexArray[i]] + '\n';
      }
    }
  } // if webState.viewRawMessages

  let markerString = '';
  let timestampString = '';
  if (('detail' in event) && ('timestamp' in event.detail)) {
    timestampString = unixTimestampToHMS(event.detail.timestamp);
  }
  if (timestampString) {
    markerString += timestampString;
  }
  markerString += ' ' + cacheReloadString + '\n';

  if (document.getElementById('rawMessageDisplay').value !== '') {
    document.getElementById('rawMessageDisplay').value += markerString;
    document.getElementById('rawMessageDisplay').scrollTop =
      document.getElementById('rawMessageDisplay').scrollHeight;
  }
});

document.addEventListener('cache-reload-error', function (event) {
  let errorString = '\n';
  let timestampString = '';
  if (('detail' in event) && ('timestamp' in event.detail)) {
    timestampString = unixTimestampToHMS(event.detail.timestamp);
  }
  if (timestampString) {
    errorString += timestampString;
  }
  errorString += ' ' + cacheErrorString + '\n\n';
  document.getElementById('rawMessageDisplay').value = errorString;
});

// -------------------------
// raw Show/Hide button handler
// -------------------------
document.getElementById('rawHiddenElementsButton').addEventListener('click', function () {
  if (document.getElementById('rawHiddenElements').hasAttribute('hidden')) {
    showRawMessageWindow();
  } else {
    hideRawMessageWindow();
  }
});

// -------------------------
// raw Clear button handler
// -------------------------
document.getElementById('rawClearButton').addEventListener('click', function () {
  document.getElementById('rawMessageDisplay').value = '';
  document.getElementById('rawMessageDisplay').setAttribute('rows', '10');
  document.getElementById('rawMessageInputId').value = '';
});
// -------------------------
// raw Taller button handler
// -------------------------
document.getElementById('rawTallerButton').addEventListener('click', function () {
  const newRows =
    parseInt(document.getElementById('rawMessageDisplay').getAttribute('rows')) + 10;
  document.getElementById('rawMessageDisplay').setAttribute('rows', newRows.toString());
});

// -------------------------
// raw Normal button handler
// -------------------------
document.getElementById('rawNormalButton').addEventListener('click', function () {
  document.getElementById('rawMessageDisplay').setAttribute('rows', '10');
});

// -----------------------------
// Show Debug button handler
// -----------------------------
document.getElementById('showDebugButton').addEventListener('click', function () {
  if (document.getElementById('hiddenDebugDiv').hasAttribute('hidden')) {
    document.getElementById('hiddenDebugDiv').removeAttribute('hidden');
    document.getElementById('showDebugButton').textContent = 'Less...';
  } else {
    document.getElementById('hiddenDebugDiv').setAttribute('hidden', '');
    document.getElementById('variablesDivId').setAttribute('hidden', '');
    document.getElementById('showDebugButton').textContent = 'More...';
  }
});

// --------------------------------
// Update from cache (button)
// --------------------------------
document.getElementById('loadFromCacheButton').addEventListener('click', function () {
  // updateFromCache();
  if (!webState.cacheReloadInProgress) {
    document.dispatchEvent(new CustomEvent('update-from-cache', { bubbles: true }));
  }
});

// -----------------------
// Show all divs button
// -----------------------
document.getElementById('showAllDivsButton').addEventListener('click', function () {
  clearLastZoom();
  // Emit event for dynamically generated hidden divs
  document.dispatchEvent(new CustomEvent('show-all-divs', { bubbles: true }));
});

// -----------------------
// Hide all divs button
// -----------------------
document.getElementById('hideAllDivsButton').addEventListener('click', function () {
  clearLastZoom();
  // Emit event to command divs to hide, skiping selected zoom div
  document.dispatchEvent(new CustomEvent('hide-or-zoom', { bubbles: true }));
});

// -----------------------
// Variables button
// -----------------------
document.getElementById('variablesButtonId').addEventListener('click', function () {
  if (document.getElementById('variablesDivId').hasAttribute('hidden')) {
    document.getElementById('variablesDivId').removeAttribute('hidden');

    // also updated from getIrcState()
    document.getElementById('variablesPreId').textContent =
      'ircState = ' + JSON.stringify(ircState, null, 2) + '\n\n' +
      'webState = ' + JSON.stringify(webState, null, 2);
  } else {
    document.getElementById('variablesDivId').setAttribute('hidden', '');
  }
});

// -------------------------
// Text Format checkbox handler
// -------------------------
document.getElementById('viewRawMessagesCheckbox').addEventListener('click', function (e) {
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
  document.dispatchEvent(new CustomEvent('update-from-cache', { bubbles: true }));
});
document.getElementById('showRawInHexCheckbox').addEventListener('click', function () {
  if (document.getElementById('showRawInHexCheckbox').checked) {
    webState.showRawInHex = true;
  } else {
    webState.showRawInHex = false;
  }
  // this forces a global update which will refreesh text area
  document.dispatchEvent(new CustomEvent('update-from-cache', { bubbles: true }));
});
document.getElementById('showCommsCheckbox').addEventListener('click', function () {
  if (document.getElementById('showCommsCheckbox').checked) {
    webState.showCommsMessages = true;
  } else {
    webState.showCommsMessages = false;
  }
  // this forces a global update which will refreesh text area
  document.dispatchEvent(new CustomEvent('update-from-cache', { bubbles: true }));
});

// -------------------------
//  Show/Hide license info
// -------------------------
document.getElementById('infoOpenCloseButton').addEventListener('click', function () {
  if (document.getElementById('hiddenInfoDiv').hasAttribute('hidden')) {
    document.getElementById('hiddenInfoDiv').removeAttribute('hidden');
    document.getElementById('infoOpenCloseButton').textContent = '-';
  } else {
    document.getElementById('hiddenInfoDiv').setAttribute('hidden', '');
    document.getElementById('infoOpenCloseButton').textContent = '+';
  }
});
