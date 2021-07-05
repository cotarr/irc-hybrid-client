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

// --------------------------------------------
// webclient07.js - Private Message Functions
// --------------------------------------------
'use strict';
// ------------------------------------------------------
// THis module dynamically creates private message
// windows and adds them to the DOM
// ------------------------------------------------------

// --------------------------------------------
// Send text as private message to other user
//     (internal function)
// --------------------------------------------
function _sendPrivMessageToUser (targetNickname, textAreaEl) {
  let text = stripTrailingCrLf(textAreaEl.value);
  if (detectMultiLineString(text)) {
    textAreaEl.value = '';
    showError('Multi-line input is not supported.');
  } else {
    if (text.length > 0) {
      // Check slash character to see if it is an IRC command
      if (text.charAt(0) === '/') {
        // yes, it is command
        let commandAction = textCommandParser(
          {
            inputString: text,
            originType: 'private',
            originName: targetNickname
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

      // Else not slash / command, assume is input intended to send to private message.
      let message = 'PRIVMSG ' + targetNickname +
        ' :' + text;
      _sendIrcServerMessage(message);
      textAreaEl.value = '';
    }
  }
  textAreaEl.value = '';
}; // _sendPrivMessageToUser

// --------------------------------------------------------
// This creates a new PM window and adds it to the DOM
//
// Input:  nickname,
//         (Initial) parsedMessage
//
// The initial message is recieved before event listeners
// for private messages are created. It is treated
// as a special case becoming the first message
// in the PM dispaly textarea element
// -------------------------------------------------------
function createPrivateMessageEl (name, parsedMessage) {
  // if already exists, return
  if (webState.activePrivateMessageNicks.indexOf(name.toLowerCase()) >= 0) {
    console.log('createPrivateMessageEl: Private message element already exist');
    return;
  }
  // Add to local browser list of active PM windows
  webState.activePrivateMessageNicks.push(name.toLowerCase());

  // console.log('Creating private message Element for ' + name);
  let privMsgIndex = webState.activePrivateMessageNicks.indexOf(name.toLowerCase());

  // This is static HTML element created in webclient.html (Insert point)
  let privMsgContainerDivEl = document.getElementById('privateMessageContainerDiv');

  // section-div
  let privMsgSectionEl = document.createElement('div');
  privMsgSectionEl.classList.add('aa-section-div');
  privMsgSectionEl.classList.add('color-pm');

  // Top Element (non-hidden element)
  let privMsgTopDivEl = document.createElement('div');
  privMsgTopDivEl.classList.add('bm10');
  privMsgTopDivEl.classList.add('head-flex');

  // left flexbox div
  let privMsgTopLeftDivEl = document.createElement('div');
  privMsgTopLeftDivEl.classList.add('head-left');

  // center if needed here

  // right flexbox div
  let privMsgTopRightDivEl = document.createElement('div');
  privMsgTopRightDivEl.classList.add('head-right');

  // right hidable div
  let privMsgTopRightHidableDivEl = document.createElement('div');

  // show/hide button
  let privMsgHideButtonEl = document.createElement('button');
  privMsgHideButtonEl.textContent = '-';
  privMsgHideButtonEl.classList.add('channel-button');

  // Top Private Message name (Nickname)
  let privMsgNameDivEl = document.createElement('div');
  privMsgNameDivEl.textContent = name;
  privMsgNameDivEl.classList.add('chan-name-div');

  // Taller button
  let privMsgTallerButtonEl = document.createElement('button');
  privMsgTallerButtonEl.textContent = 'Taller';
  privMsgTallerButtonEl.classList.add('channel-button');

  // Normal button
  let privMsgNormalButtonEl = document.createElement('button');
  privMsgNormalButtonEl.textContent = 'Normal';
  privMsgNormalButtonEl.classList.add('channel-button');

  // Clear button
  let privMsgClearButtonEl = document.createElement('button');
  privMsgClearButtonEl.textContent = 'Clear';
  privMsgClearButtonEl.classList.add('channel-button');

  // Bottom Element (optionally hidden)
  let privMsgBottomDivEl = document.createElement('div');

  // resizable text area
  let privMsgTextAreaEl = document.createElement('textarea');
  let privMsgTextAreaId = 'privMsg' + privMsgIndex.toString() + 'TextAreaId';
  privMsgTextAreaEl.id = privMsgTextAreaId;
  privMsgTextAreaEl.setAttribute('cols', '120');
  privMsgTextAreaEl.setAttribute('rows', '6');
  privMsgTextAreaEl.setAttribute('spellCheck', 'false');
  privMsgTextAreaEl.setAttribute('readonly', '');

  // button-div
  let privMsgButtonDiv1El = document.createElement('div');
  privMsgButtonDiv1El.classList.add('button-div');

  // signle line user input
  let privMsgInputAreaEl = document.createElement('textarea');
  let privMsgInputAreaId = 'privMsg' + privMsgIndex.toString() + 'InputAreaId';
  privMsgInputAreaEl.id = privMsgInputAreaId;
  privMsgInputAreaEl.classList.add('va-middle');
  privMsgInputAreaEl.classList.add('rm5');
  privMsgInputAreaEl.setAttribute('cols', '120');
  privMsgInputAreaEl.setAttribute('rows', '1');

  // send button
  let privMsgSendButtonEl = document.createElement('button');
  privMsgSendButtonEl.textContent = 'Send';
  privMsgSendButtonEl.classList.add('va-middle');

  // button-div
  let privMsgBottomDiv4El = document.createElement('div');
  privMsgBottomDiv4El.classList.add('button-div');

  // beep on message checkbox
  let privMsgBeep1CBInputEl = document.createElement('input');
  privMsgBeep1CBInputEl.classList.add('pm-cb-cb');
  privMsgBeep1CBInputEl.setAttribute('type', 'checkbox');
  let privMsgBeep1CBTitleEl = document.createElement('span');
  privMsgBeep1CBTitleEl.classList.add('pm-cb-span');
  privMsgBeep1CBTitleEl.textContent = 'Line-beep';

  // --------------------------------
  // Append child element to DOM
  // --------------------------------

  privMsgTopLeftDivEl.appendChild(privMsgHideButtonEl);
  privMsgTopLeftDivEl.appendChild(privMsgNameDivEl);

  privMsgTopRightHidableDivEl.appendChild(privMsgTallerButtonEl);
  privMsgTopRightHidableDivEl.appendChild(privMsgNormalButtonEl);
  privMsgTopRightHidableDivEl.appendChild(privMsgClearButtonEl);

  privMsgTopRightDivEl.appendChild(privMsgTopRightHidableDivEl);

  privMsgTopDivEl.appendChild(privMsgTopLeftDivEl);
  privMsgTopDivEl.appendChild(privMsgTopRightDivEl);

  privMsgButtonDiv1El.appendChild(privMsgInputAreaEl);
  privMsgButtonDiv1El.appendChild(privMsgSendButtonEl);

  privMsgBottomDiv4El.appendChild(privMsgBeep1CBInputEl);
  privMsgBottomDiv4El.appendChild(privMsgBeep1CBTitleEl);

  privMsgBottomDivEl.appendChild(privMsgTextAreaEl);
  privMsgBottomDivEl.appendChild(privMsgButtonDiv1El);
  privMsgBottomDivEl.appendChild(privMsgBottomDiv4El);

  privMsgSectionEl.appendChild(privMsgTopDivEl);
  privMsgSectionEl.appendChild(privMsgBottomDivEl);

  privMsgContainerDivEl.appendChild(privMsgSectionEl);

  // -------------------------------------------
  // Add initial message, special case of opening new window
  // we must add the message that generated the window open request.
  // -------------------------------------------
  privMsgTextAreaEl.value += parsedMessage.timestamp + ' ' +
    parsedMessage.nick + pmNameSpacer + cleanFormatting(parsedMessage.params[1]) + '\n';
  // move scroll bar so text is scrolled all the way up
  privMsgTextAreaEl.scrollTop = privMsgTextAreaEl.scrollHeight;

  // --------------------------
  // PM specific timers
  // --------------------------

  // inhibit timer to prevent display of activity icon
  var activityIconInhibitTimer = 0;
  setInterval(function () {
    if (activityIconInhibitTimer > 0) activityIconInhibitTimer--;
  }, 1000);

  // --------------------------
  // Private Message Event listeners
  // ---------------------------

  // Erase before reload
  // Remove text content, but do not change visibility
  // This may not be necessary because child PM elements
  // like this one are removed by the erase and reload process.
  document.addEventListener('erase-before-reload', function (event) {
    // console.log('Event erase-before-reload');
    privMsgTextAreaEl.value = '';
    privMsgInputAreaEl.value = '';
  });

  //
  // Add cache reload message to private message window
  //
  // Example:  14:33:02 -----Cache Reload-----
  //
  document.addEventListener('cache-reload-done', function (event) {
    // console.log('Event cache-reload-done');
    let markerString = '';
    let timestampString = '';
    if (('detail' in event) && ('timestamp' in event.detail)) {
      timestampString = unixTimestampToHMS(event.detail.timestamp);
    }
    if (timestampString) {
      markerString += timestampString;
    }
    markerString += ' ' + cacheReloadString + '\n';

    privMsgTextAreaEl.value += markerString;
    // move scroll bar so text is scrolled all the way up
    privMsgTextAreaEl.scrollTop = privMsgTextAreaEl.scrollHeight;
  });

  // Hide PM window, Hide PM data section, Hide buttons
  document.addEventListener('priv-msg-hide-all', function (event) {
    privMsgBottomDivEl.setAttribute('hidden', '');
    privMsgHideButtonEl.textContent = '+';
    privMsgTopRightHidableDivEl.setAttribute('hidden', '');
    privMsgSectionEl.setAttribute('hidden', '');
  });

  // Show PM window
  document.addEventListener('priv-msg-show-all', function (event) {
    privMsgSectionEl.removeAttribute('hidden');
  });

  // -------------------------
  // How/Hide button handler
  // -------------------------
  // if closed: Window unchanged, show Data secton, show Buttons
  // if open:  Hide Window, hide Data section, Hide Buttons
  privMsgHideButtonEl.addEventListener('click', function () {
    if (privMsgBottomDivEl.hasAttribute('hidden')) {
      privMsgBottomDivEl.removeAttribute('hidden');
      privMsgHideButtonEl.textContent = '-';
      privMsgTopRightHidableDivEl.removeAttribute('hidden');
    } else {
      privMsgSectionEl.setAttribute('hidden', '');
      privMsgBottomDivEl.setAttribute('hidden', '');
      privMsgHideButtonEl.textContent = '+';
      privMsgTopRightHidableDivEl.setAttribute('hidden', '');
    }
  });

  // -------------------------
  // Taller button handler
  // -------------------------
  privMsgTallerButtonEl.addEventListener('click', function () {
    let newRows = parseInt(privMsgTextAreaEl.getAttribute('rows')) + 5;
    privMsgTextAreaEl.setAttribute('rows', newRows.toString());
  });

  // -------------------------
  // Normal button handler
  // -------------------------
  privMsgNormalButtonEl.addEventListener('click', function () {
    privMsgTextAreaEl.setAttribute('rows', '6');
  });

  // -------------------------
  // Clear button handler
  // -------------------------
  privMsgClearButtonEl.addEventListener('click', function () {
    privMsgTextAreaEl.value = '';
    privMsgTextAreaEl.setAttribute('rows', '6');
  });

  // ----------------
  // show all event
  // ----------------
  // show window, leaving data section and buttons unchanged (proabably closed)
  document.addEventListener('show-all-divs', function (event) {
    privMsgSectionEl.removeAttribute('hidden');
  });
  // ----------------
  // hide all event
  // ----------------
  // hide window, data section and buttons.
  document.addEventListener('hide-all-divs', function (event) {
    privMsgBottomDivEl.setAttribute('hidden', '');
    privMsgHideButtonEl.textContent = '+';
    privMsgTopRightHidableDivEl.setAttribute('hidden', '');
    privMsgSectionEl.setAttribute('hidden', '');
  });

  // -------------
  // send button
  // -------------
  privMsgSendButtonEl.addEventListener('click', function () {
    _sendPrivMessageToUser(name, privMsgInputAreaEl);
    privMsgInputAreaEl.focus();
    resetPmActivityIcon(privMsgIndex);
    activityIconInhibitTimer = activityIconInhibitTimerValue;
  });

  // ---------------
  // Enter pressed
  // ---------------
  privMsgInputAreaEl.addEventListener('input', function (event) {
    if (((event.inputType === 'insertText') && (event.data === null)) ||
      (event.inputType === 'insertLineBreak')) {
      _sendPrivMessageToUser(name, privMsgInputAreaEl);
      resetPmActivityIcon(privMsgIndex);
      activityIconInhibitTimer = activityIconInhibitTimerValue;
    }
  });

  // ------------------------------------------------
  // Clear message activity ICON by click anywhere on the
  // dynamically created private message window
  // -------------------------------------------------
  privMsgSectionEl.addEventListener('click', function () {
    resetPmActivityIcon(privMsgIndex);
    activityIconInhibitTimer = activityIconInhibitTimerValue;
  });

  function updateVisibility () {
    if (privMsgSectionEl.hasAttribute('beep1-enabled')) {
      privMsgBeep1CBInputEl.checked = true;
    } else {
      privMsgBeep1CBInputEl.checked = false;
    }
  }

  // -------------------------
  // Beep On Message checkbox handler
  // -------------------------
  privMsgBeep1CBInputEl.addEventListener('click', function (e) {
    if (privMsgSectionEl.hasAttribute('beep1-enabled')) {
      privMsgSectionEl.removeAttribute('beep1-enabled');
    } else {
      privMsgSectionEl.setAttribute('beep1-enabled', '');
      playBeep3Sound();
    }
    updateVisibility();
  });

  // -----------------------
  // Cancel all beep sounds
  // -----------------------
  document.addEventListener('cancel-beep-sounds', function (event) {
    privMsgSectionEl.removeAttribute('beep1-enabled');
  });

  // PM window PRIVMSG event handler
  // if window closed,
  //  - open control window,
  //  - show window, data section and buttons.
  document.addEventListener('private-message', function (event) {
    function _addText (text) {
      // append text to textarea
      privMsgTextAreaEl.value += cleanFormatting(text) + '\n';
      // move scroll bar so text is scrolled all the way up
      privMsgTextAreaEl.scrollTop = privMsgTextAreaEl.scrollHeight;
    }
    let parsedMessage = event.detail.parsedMessage;
    // console.log('Event private-message: ' + JSON.stringify(parsedMessage, null, 2));
    switch (parsedMessage.command) {
      //
      // TODO cases for user left IRC or other error

      case 'PRIVMSG':
        // there may be multiple windows open with other nicknames
        // This does a nickname match and acts only on message for this intended window.
        if (parsedMessage.nick === ircState.nickName) {
          // case of this is outgoing message from me
          if (parsedMessage.params[0].toLowerCase() === name.toLowerCase()) {
            if ('isPmCtcpAction' in parsedMessage) {
              _addText(parsedMessage.timestamp + pmNameSpacer +
              parsedMessage.nick + ' ' + parsedMessage.params[1]);
            } else {
              _addText(parsedMessage.timestamp + ' ' +
              parsedMessage.nick + pmNameSpacer + parsedMessage.params[1]);
            }
            if (privMsgSectionEl.hasAttribute('beep1-enabled') &&
              (webState.cacheInhibitTimer === 0)) {
              playBeep3Sound();
            }
            // Upon privMsg message, make sectino visible.
            privMsgSectionEl.removeAttribute('hidden');
            privMsgBottomDivEl.removeAttribute('hidden');
            privMsgHideButtonEl.textContent = '-';
            privMsgTopRightHidableDivEl.removeAttribute('hidden');
            // also show control section div
            document.getElementById('privMsgMainHiddenDiv').removeAttribute('hidden');
            document.getElementById('privMsgMainHiddenButton').textContent = '-';
          }
        } else {
          // case of incoming message from others.
          if (parsedMessage.nick.toLowerCase() === name.toLowerCase()) {
            if ('isPmCtcpAction' in parsedMessage) {
              _addText(parsedMessage.timestamp + pmNameSpacer +
              parsedMessage.nick + ' ' + parsedMessage.params[1]);
            } else {
              _addText(parsedMessage.timestamp + ' ' +
              parsedMessage.nick + pmNameSpacer + parsedMessage.params[1]);
            }
            if (privMsgSectionEl.hasAttribute('beep1-enabled') &&
              (webState.cacheInhibitTimer === 0)) {
              playBeep3Sound();
            }
            // Upon privMsg message, make sectino visible.
            privMsgSectionEl.removeAttribute('hidden');
            privMsgBottomDivEl.removeAttribute('hidden');
            privMsgHideButtonEl.textContent = '-';
            privMsgTopRightHidableDivEl.removeAttribute('hidden');

            // also show control section div
            document.getElementById('privMsgMainHiddenDiv').removeAttribute('hidden');
            document.getElementById('privMsgMainHiddenButton').textContent = '-';

            // Message activity Icon
            // If focus not <inputarea> elment,
            // and focus not message send button
            // and NOT reload from cache in progress (timer not zero)
            // then display incoming message activity icon
            if ((document.activeElement !== privMsgInputAreaEl) &&
            (document.activeElement !== privMsgSendButtonEl) &&
            (webState.cacheInhibitTimer === 0) &&
            (activityIconInhibitTimer === 0)) {
              setPmActivityIcon(privMsgIndex);
            }
          }
        }
        break;
      default:
    }
  });

  // PM to be made visible on opening a new window (except on refresh)
  if (webState.cacheInhibitTimer === 0) {
    setPmActivityIcon(privMsgIndex);
  }

  // Do this when creating the PM element for this user.
  // Show control window, so open/close buttons are in sync
  document.getElementById('privMsgMainHiddenDiv').removeAttribute('hidden');
  document.getElementById('privMsgMainHiddenButton').textContent = '-';

  // -----------------------------------------------------------
  // Setup textarea elements as dynamically resizable
  // -----------------------------------------------------------
  //
  // Scale values for <textarea> are calculated in webclient10.js
  // and saved globally in the webState object
  //
  const adjustPMInputToWidowWidth = function (innerWidth) {
    // pixel width mar1 is reserved space on edges of input area at full screen width
    let mar1 = webState.dynamic.commonMargin;
    // pixel width mar2 is reserved space on edges of input area with send button added
    let mar2 = webState.dynamic.commonMargin + 5 + webState.dynamic.sendButtonWidthPx;
    // pixed width mar3 is reserved space on edges of input area with channel nickname list on sides

    privMsgTextAreaEl.setAttribute('cols', calcInputAreaColSize(mar1));
    privMsgInputAreaEl.setAttribute('cols', calcInputAreaColSize(mar2));
  }; // adjustPMInputToWidowWidth()
  //
  // Event listener for resize window (generic browser event)
  //
  window.addEventListener('resize', function (event) {
    // ignore resize events before dynamic size variables exist
    if (webState.dynamic.inputAreaCharWidthPx) {
      adjustPMInputToWidowWidth(event.currentTarget.innerWidth);
    }
  });
  //
  // Resize on creating private message window
  //
  adjustPMInputToWidowWidth(window.innerWidth);
};

// ----------------------------------------------------------
// Private message handler (create new window if message)
// ----------------------------------------------------------

// Event listener for messages to create new window
document.addEventListener('private-message', function (event) {
  // console.log('Event: private-message ' + JSON.stringify(event.detail, null, 2));
  // Determine if message is ingoing or outgoing
  // assume it is incoming
  let name = event.detail.parsedMessage.nick;
  // then if outgoing reverse it
  if (name === ircState.nickName) {
    name = event.detail.parsedMessage.params[0];
  }
  //
  // check if a private message section exists, if not create it
  //
  if (webState.activePrivateMessageNicks.indexOf(name.toLowerCase()) < 0) {
    createPrivateMessageEl(name, event.detail.parsedMessage);
  }
});

// --------------------------------
// Send private message
// --------------------------------
function _buildPrivateMessageText () {
  if (document.getElementById('userPrivMsgInputId').value.length === 0) return;
  let inputAreaEl = document.getElementById('userPrivMsgInputId');
  let text = stripTrailingCrLf(inputAreaEl.value);
  if (detectMultiLineString(text)) {
    inputAreaEl.value = '';
    showError('Multi-line input is not supported.');
  } else {
    if (text.length > 0) {
      // Check slash character to see if it is an IRC command
      if (text.charAt(0) === '/') {
        // yes, it is command
        let commandAction = textCommandParser(
          {
            inputString: text,
            originType: 'generic',
            originName: null
          }
        );
        // clear input element
        inputAreaEl.value = '';
        if (commandAction.error) {
          showError(commandAction.message);
          return;
        } else {
          if ((commandAction.ircMessage) && (commandAction.ircMessage.length > 0)) {
            _sendIrcServerMessage(commandAction.ircMessage);
          }
          return;
        }
        return;
      }
      console.log('else not command');
      // Else not slash / command, assume is input intended to send to private message.
      if (document.getElementById('pmNickNameInputId').value.length === 0) return;
      let targetNickname = document.getElementById('pmNickNameInputId').value;
      let message = 'PRIVMSG ' + targetNickname + ' :' + text;
      _sendIrcServerMessage(message);
      inputAreaEl.value = '';
    }
  }
  inputAreaEl.value = '';
};
document.getElementById('userPrivMsgInputId').addEventListener('input', function (event) {
  if ((event.inputType === 'insertText') && (event.data === null)) {
    _buildPrivateMessageText();
  }
  if (event.inputType === 'insertLineBreak') {
    _buildPrivateMessageText();
  }
});
document.getElementById('UserPrivMsgSendButton').addEventListener('click', function () {
  _buildPrivateMessageText();
});

// Initialize all input elements on reload
document.addEventListener('erase-before-reload', function (event) {
  document.getElementById('pmNickNameInputId').value = '';
  document.getElementById('userPrivMsgInputId').value = '';
});

// -------------------------
// Whois button handler
// -------------------------
document.getElementById('whoisButton').addEventListener('click', function () {
  if (document.getElementById('pmNickNameInputId').value.length > 0) {
    showRawMessageWindow();
    let message = 'WHOIS ' + document.getElementById('pmNickNameInputId').value;
    _sendIrcServerMessage(message);
    // open up server messages to show
    showRawMessageWindow();
  } else {
    showError('Input required');
  }
});
// -------------------------------------
// Private Message (Open/Close) Buttons
// -------------------------------------
document.getElementById('privMsgMainHiddenButton').addEventListener('click', function () {
  if (document.getElementById('privMsgMainHiddenDiv').hasAttribute('hidden')) {
    document.getElementById('privMsgMainHiddenDiv').removeAttribute('hidden');
    document.getElementById('privMsgMainHiddenButton').textContent = '-';
    document.dispatchEvent(new CustomEvent('priv-msg-show-all', { bubbles: true }));
  } else {
    document.getElementById('privMsgMainHiddenDiv').setAttribute('hidden', '');
    document.getElementById('privMsgMainHiddenButton').textContent = '+';
    document.dispatchEvent(new CustomEvent('priv-msg-hide-all', { bubbles: true }));
  }
});
