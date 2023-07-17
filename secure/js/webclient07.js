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
  const text = stripTrailingCrLf(textAreaEl.value);
  if (detectMultiLineString(text)) {
    textAreaEl.value = '';
    showError('Multi-line input is not supported.');
  } else {
    if (text.length > 0) {
      // Check slash character to see if it is an IRC command
      if (text.charAt(0) === '/') {
        // yes, it is command
        const commandAction = textCommandParser(
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
      const message = 'PRIVMSG ' + targetNickname +
        ' :' + text;
      _sendIrcServerMessage(message);
      textAreaEl.value = '';
    }
  }
  textAreaEl.value = '';
}; // _sendPrivMessageToUser

// -----------------------------------------------------------------
// This shows the page layout hierarchy for private message sections
// -----------------------------------------------------------------
//
// html
// - head
// - body
// -- div (errorDiv)
// -- div (annunciatorDivId)
// -- div (scrollableDivId)
// --- div (infoSectionDiv)
// --- div (logoutConfirmDiv)
// --- div (webDisconnectedHiddenDiv1)
// --- div ( ) No id, used both webDisconnected and web connected
// --- div (webDisconnectedHiddenDiv2)
// ---- div (ircDisconnectedHiddenDiv)
// ----- div (wallopsSectionDiv)
// ----- div (noticeSectionDiv)

// ++++++++++++ Static Private Message +++++++++++++
// ----- div (privMsgSectionDiv)   <-- Hidable
// ------ div ( ) No id (class head-flex)
// ------- div ( ) No id (class head left)
// -------- button (privMsgMainHiddenButton)
// -------- span ( ) No id button label
// -------- div (privMsgWindowCountDiv)
// -------- div (privMsgCountDiv)
// ------- div ( ) No id (class head-right)
// -------- div (privMsgMainHiddenDiv)  <-- Hidable, event handler for erase all button
// --------- button ( ) No Id Erase All PM button (event handler in parent div)
// ------ div (privMsgHeaderEraseAllDiv) <--- Hidable, div for whois and initial PM send
// ------- div ( ) No id, button div
// -------- input (pmNickNameInputId)
// -------- button (whoisButton)
// ------- div ( ) No id. button div
// -------- textarea (userPrivMsgInputId)
// -------- button (UserPrivMsgSendButton)

// +++++++++++++ Dynamically generate each PM section +++++++++++++++
// ----- div (privateMessageContainerDiv)  <--- static container in html
// ------ div (privMsgSectionEl)              <---- Dynamically inserted, Hidable
// ------- div (privMsgTopDivEl)                 <---- Always visible
// -------- div (privMsgTopLeftDivEl)
// --------- button (privMsgHideButtonEl)
// --------- div (rivMsgNameDivEl)
// --------- div (privMsgCounterEl)
// -------- div (privMsgTopRightDivEl)
// --------- div (privMsgTopRightHidableDivEl)  <--- Hidable
// ---------- button (privMsgTallerButtonEl)
// ---------- button (privMsgNormalButtonEl)
// ------- div (privMsgBottomDivEl)              <---- Hidable, lower half
// -------- textarea (privMsgTextAreaEl)
// -------- div (privMsgBottomDiv1El)
// --------- textarea (privMsgInputAreaEl)
// --------- button (privMsgSendButtonEl)
// -------- div (privMsgButtonDiv2El)
// --------- span (privMsgMultiLineSendSpanEl)
// --------- button (privMsgMultiLineSendButtonEl)
// -------- div (privMsgBottomDiv4El)
// --------- input/checkbox (privMsgBeep1CBInputEl)
// --------- span (privMsgBeep1CBTitleEl)

// ----- div (channelMenuDiv)
// ----- div (channelContainerDiv)
// -- div (webDisconnectedVisibleDiv)
//
// -------------------
// Global Event Listeners
// -------------------
// erase-before-reload
// cache-reload-done
// cache-reload-error
// cancel-beep-sounds
// private-message
// show-all-divs
// hide-or-zoom
// priv-msg-show-all
// priv-msg-hide-all
// update-pm-count

// --------------------------------------------------------
// This creates a new PM window and adds it to the DOM
//
// Input:  nickname,
//         (Initial) parsedMessage
//
// The initial message is received before event listeners
// for private messages are created. It is treated
// as a special case becoming the first message
// in the PM display textarea element
// -------------------------------------------------------
function createPrivateMessageEl (name, parsedMessage) {
  // if already exists, return
  if (webState.activePrivateMessageNicks.indexOf(name.toLowerCase()) >= 0) {
    console.log('createPrivateMessageEl: Private message element already exist');
    return;
  }
  // Add to local browser list of active PM windows
  webState.activePrivateMessageNicks.push(name.toLowerCase());
  // Initialize count of active PM windows to zero
  document.getElementById('privMsgWindowCountDiv').textContent =
    webState.activePrivateMessageNicks.length.toString();
  document.getElementById('privMsgWindowCountDiv').removeAttribute('hidden');
  document.getElementById('privMsgHeaderEraseAllDiv').removeAttribute('hidden');

  // console.log('Creating private message Element for ' + name);
  const privMsgIndex = webState.activePrivateMessageNicks.indexOf(name.toLowerCase());

  // This is static HTML element created in webclient.html (Insert point)
  const privMsgContainerDivEl = document.getElementById('privateMessageContainerDiv');

  // section-div
  const privMsgSectionEl = document.createElement('div');
  privMsgSectionEl.classList.add('aa-section-div');
  privMsgSectionEl.classList.add('pm-panel-theme-light');
  privMsgSectionEl.setAttribute('lastDate', '0000-00-00');

  // Top Element (non-hidden element)
  const privMsgTopDivEl = document.createElement('div');
  privMsgTopDivEl.classList.add('bm10');
  privMsgTopDivEl.classList.add('head-flex');

  // left flexbox div
  const privMsgTopLeftDivEl = document.createElement('div');
  privMsgTopLeftDivEl.classList.add('head-left');

  // center flexbox div (not used)
  // const privMsgTopCenterDivEl = document.createElement('div');
  // privMsgTopCenterDivEl.classList.add('head-center');

  // right flexbox div
  const privMsgTopRightDivEl = document.createElement('div');
  privMsgTopRightDivEl.classList.add('head-right');

  // right hidable div
  const privMsgTopRightHidableDivEl = document.createElement('div');

  // show/hide button
  const privMsgHideButtonEl = document.createElement('button');
  privMsgHideButtonEl.textContent = '-';
  privMsgHideButtonEl.classList.add('channel-button');

  // Top Private Message name (Nickname)
  const privMsgNameDivEl = document.createElement('div');
  privMsgNameDivEl.textContent = name;
  privMsgNameDivEl.classList.add('chan-name-div');

  // Private message activity counter
  const privMsgCounterEl = document.createElement('div');
  privMsgCounterEl.textContent = '0';
  privMsgCounterEl.classList.add('message-count');
  // pm-count-class is used to querySelectorAll summation loop
  privMsgCounterEl.classList.add('pm-count-class');
  privMsgCounterEl.setAttribute('hidden', '');

  // Taller button
  const privMsgTallerButtonEl = document.createElement('button');
  privMsgTallerButtonEl.textContent = 'Taller';
  privMsgTallerButtonEl.classList.add('channel-button');

  // Normal button
  const privMsgNormalButtonEl = document.createElement('button');
  privMsgNormalButtonEl.textContent = 'Normal';
  privMsgNormalButtonEl.classList.add('channel-button');

  // Bottom Element (optionally hidden)
  const privMsgBottomDivEl = document.createElement('div');

  // resizable text area
  const privMsgTextAreaEl = document.createElement('textarea');
  const privMsgTextAreaId = 'privMsg' + privMsgIndex.toString() + 'TextAreaId';
  privMsgTextAreaEl.id = privMsgTextAreaId;
  privMsgTextAreaEl.classList.add('text-theme-light');
  privMsgTextAreaEl.setAttribute('cols', '120');
  privMsgTextAreaEl.setAttribute('rows', '6');
  privMsgTextAreaEl.setAttribute('spellCheck', 'false');
  privMsgTextAreaEl.setAttribute('readonly', '');

  // div to hold textarea input element
  const privMsgBottomDiv1El = document.createElement('div');
  privMsgBottomDiv1El.classList.add('button-div');

  // single line user input
  const privMsgInputAreaEl = document.createElement('textarea');
  const privMsgInputAreaId = 'privMsg' + privMsgIndex.toString() + 'InputAreaId';
  privMsgInputAreaEl.id = privMsgInputAreaId;
  privMsgInputAreaEl.classList.add('text-theme-light');
  privMsgInputAreaEl.classList.add('va-middle');
  privMsgInputAreaEl.classList.add('rm5');
  privMsgInputAreaEl.setAttribute('cols', '120');
  privMsgInputAreaEl.setAttribute('rows', '1');

  // send button
  const privMsgSendButtonEl = document.createElement('button');
  privMsgSendButtonEl.textContent = 'Send';
  privMsgSendButtonEl.classList.add('va-middle');

  // div to hold multi-line paste notice and button
  const privMsgBottomDiv2El = document.createElement('div');
  privMsgBottomDiv2El.setAttribute('hidden', '');
  privMsgBottomDiv2El.classList.add('button-div');

  // Span holding notice message of multi-line paste from clipboard
  const privMsgMultiLineSendSpanEl = document.createElement('span');
  privMsgMultiLineSendSpanEl.classList.add('privMsg-button');
  privMsgMultiLineSendSpanEl.textContent = 'Clipboard (0 lines)';

  // send button for multi-line paste
  const privMsgMultiLineSendButtonEl = document.createElement('button');
  privMsgMultiLineSendButtonEl.classList.add('privMsg-button');
  privMsgMultiLineSendButtonEl.textContent = 'Send as multi-line';

  // button-div
  const privMsgBottomDiv4El = document.createElement('div');
  privMsgBottomDiv4El.classList.add('button-div');

  // beep on message checkbox
  const privMsgBeep1CBInputEl = document.createElement('input');
  privMsgBeep1CBInputEl.classList.add('pm-cb-cb');
  privMsgBeep1CBInputEl.setAttribute('type', 'checkbox');
  const privMsgBeep1CBTitleEl = document.createElement('span');
  privMsgBeep1CBTitleEl.classList.add('pm-cb-span');
  privMsgBeep1CBTitleEl.textContent = 'Line-beep';

  // --------------------------------
  // Append child element to DOM
  // --------------------------------

  privMsgTopLeftDivEl.appendChild(privMsgHideButtonEl);
  privMsgTopLeftDivEl.appendChild(privMsgNameDivEl);
  privMsgTopLeftDivEl.appendChild(privMsgCounterEl);

  privMsgTopRightHidableDivEl.appendChild(privMsgTallerButtonEl);
  privMsgTopRightHidableDivEl.appendChild(privMsgNormalButtonEl);

  privMsgTopRightDivEl.appendChild(privMsgTopRightHidableDivEl);

  privMsgTopDivEl.appendChild(privMsgTopLeftDivEl);
  // privMsgTopDivEl.appendChild(privMsgTopCenterDivEl);
  privMsgTopDivEl.appendChild(privMsgTopRightDivEl);

  privMsgBottomDiv1El.appendChild(privMsgInputAreaEl);
  privMsgBottomDiv1El.appendChild(privMsgSendButtonEl);

  privMsgBottomDiv2El.appendChild(privMsgMultiLineSendSpanEl);
  privMsgBottomDiv2El.appendChild(privMsgMultiLineSendButtonEl);

  privMsgBottomDiv4El.appendChild(privMsgBeep1CBInputEl);
  privMsgBottomDiv4El.appendChild(privMsgBeep1CBTitleEl);

  privMsgBottomDivEl.appendChild(privMsgTextAreaEl);
  privMsgBottomDivEl.appendChild(privMsgBottomDiv1El);
  privMsgBottomDivEl.appendChild(privMsgBottomDiv2El);
  privMsgBottomDivEl.appendChild(privMsgBottomDiv4El);

  privMsgSectionEl.appendChild(privMsgTopDivEl);
  privMsgSectionEl.appendChild(privMsgBottomDivEl);

  privMsgContainerDivEl.appendChild(privMsgSectionEl);

  // ------------------------------------------------------------
  // Add initial date divider message, this is repeated below for
  // for addition incoming PM
  // ------------------------------------------------------------
  if (privMsgSectionEl.getAttribute('lastDate') !== parsedMessage.datestamp) {
    privMsgSectionEl.setAttribute('lastDate', parsedMessage.datestamp);
    privMsgTextAreaEl.value +=
      '\n=== ' + parsedMessage.datestamp + ' ===\n\n';
  }

  // -------------------------------------------
  // Add initial message, special case of opening new window
  // we must add the message that generated the window open request.
  // -------------------------------------------
  privMsgTextAreaEl.value += parsedMessage.timestamp + ' ' +
    parsedMessage.nick + pmNameSpacer + cleanFormatting(parsedMessage.params[1]) + '\n';
  // move scroll bar so text is scrolled all the way up
  if (!webState.cacheReloadInProgress) {
    privMsgTextAreaEl.scrollTop = privMsgTextAreaEl.scrollHeight;
  }

  // --------------------------
  // PM specific timers
  // --------------------------

  // inhibit timer to prevent display of activity icon
  // This timer is removed before destroying element
  let activityIconInhibitTimer = 0;
  const iconInhibitTimer = setInterval(function () {
    if (activityIconInhibitTimer > 0) activityIconInhibitTimer--;
  }, 1000);

  // -----------------------------------------------------
  // Increment unread message counter and make visible
  // -----------------------------------------------------
  function updateTotalPmCount () {
    // This is handled at the end of this source file to sum all PM windows
    document.dispatchEvent(new CustomEvent('update-pm-count', { bubbles: true }));
  };

  function incrementPrivMsgCount () {
    let count = parseInt(privMsgCounterEl.textContent);
    count++;
    privMsgCounterEl.textContent = count.toString();
    privMsgCounterEl.removeAttribute('hidden');
    updateTotalPmCount();
  }

  // Clear and hide it.
  function resetPrivMsgCount () {
    privMsgCounterEl.textContent = '0';
    privMsgCounterEl.setAttribute('hidden', '');
    updateTotalPmCount();
  }

  // --------------------------
  // Private Message Event listeners
  // ---------------------------

  // Handled later in file (below)
  // document.addEventListener('erase-before-reload', function (event) {
  // });

  //
  // Add cache reload message to private message window
  //
  // Example:  14:33:02 -----Cache Reload-----
  //
  function handleCacheReloadDone (event) {
    // Clear temporary array so next asynchronous API cache reload
    // can start with an empty array.
    listOfOpenPMPanels = [];
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
  };
  document.addEventListener('cache-reload-done', handleCacheReloadDone);

  function handelCacheReloadError (event) {
    // Clear temporary array so next asynchronous API cache reload
    // can start with an empty array.
    listOfOpenPMPanels = [];
    let errorString = '\n';
    let timestampString = '';
    if (('detail' in event) && ('timestamp' in event.detail)) {
      timestampString = unixTimestampToHMS(event.detail.timestamp);
    }
    if (timestampString) {
      errorString += timestampString;
    }
    errorString += ' ' + cacheErrorString + '\n\n';
    privMsgTextAreaEl.value = errorString;
  };
  document.addEventListener('cache-reload-error', handelCacheReloadError);

  // Hide PM window, Hide PM data section, Hide buttons
  function handlePrivMsgHideAll (event) {
    privMsgBottomDivEl.setAttribute('hidden', '');
    privMsgHideButtonEl.textContent = '+';
    privMsgTopRightHidableDivEl.setAttribute('hidden', '');
    privMsgSectionEl.setAttribute('hidden', '');
  };
  document.addEventListener('priv-msg-hide-all', handlePrivMsgHideAll);

  // Show PM window
  function handlePrivMsgShowAll (event) {
    privMsgSectionEl.removeAttribute('hidden');
  };
  document.addEventListener('priv-msg-show-all', handlePrivMsgShowAll);

  // -------------------------
  // How/Hide button handler
  // -------------------------
  // if closed: Window unchanged, show Data section, show Buttons
  // if open:  Hide Window, hide Data section, Hide Buttons
  function handlePrivMsgHideButtonElClick (event) {
    if (privMsgBottomDivEl.hasAttribute('hidden')) {
      privMsgBottomDivEl.removeAttribute('hidden');
      privMsgHideButtonEl.textContent = '-';
      privMsgTopRightHidableDivEl.removeAttribute('hidden');
      clearLastZoom();
      // collapse input area of PM whois/send panel
      document.getElementById('privMsgMainHiddenDiv').setAttribute('hidden', '');
      document.getElementById('privMsgMainHiddenButton').textContent = '+';
    } else {
      privMsgBottomDivEl.setAttribute('hidden', '');
      privMsgHideButtonEl.textContent = '+';
      privMsgTopRightHidableDivEl.setAttribute('hidden', '');
    }
  };
  privMsgHideButtonEl.addEventListener('click', handlePrivMsgHideButtonElClick);

  // -------------------------
  // Taller button handler
  // -------------------------
  function handlePrivMsgTallerButtonElClick (event) {
    const newRows = parseInt(privMsgTextAreaEl.getAttribute('rows')) + 5;
    privMsgTextAreaEl.setAttribute('rows', newRows.toString());
    privMsgInputAreaEl.setAttribute('rows', '3');
  };
  privMsgTallerButtonEl.addEventListener('click', handlePrivMsgTallerButtonElClick);

  // -------------------------
  // Normal button handler
  // -------------------------
  function handlePrivMsgNormalButtonElClick (event) {
    privMsgTextAreaEl.setAttribute('rows', '6');
    privMsgInputAreaEl.setAttribute('rows', '1');
  };
  privMsgNormalButtonEl.addEventListener('click', handlePrivMsgNormalButtonElClick);

  // ----------------
  // show all event
  // ----------------
  // show window, leaving data section and buttons unchanged (probably closed)
  function handleShowAllDivs (event) {
    privMsgBottomDivEl.removeAttribute('hidden');
    privMsgHideButtonEl.textContent = '-';
    privMsgTopRightHidableDivEl.removeAttribute('hidden');
    privMsgSectionEl.removeAttribute('hidden');
  };
  document.addEventListener('show-all-divs', handleShowAllDivs);

  // ----------------
  // hide all event
  // ----------------
  // hide window, data section and buttons.
  function handleHideOrZoom (event) {
    privMsgBottomDivEl.setAttribute('hidden', '');
    privMsgHideButtonEl.textContent = '+';
    privMsgTopRightHidableDivEl.setAttribute('hidden', '');
    privMsgSectionEl.setAttribute('hidden', '');
  };
  document.addEventListener('hide-or-zoom', handleHideOrZoom);

  // ---------------------------------------------
  // Detect change in color theme
  // Call updateVisibility to changes CSS classes
  // ---------------------------------------------
  function handleColorThemePM (event) {
    updateVisibility();
  };
  document.addEventListener('color-theme-changed', handleColorThemePM);

  // -----------------------
  // Detect paste event,
  // Check clipboard, if multi-line, make multi-line send button visible
  // -----------------------
  function handleprivMsgInputAreaElPaste (event) {
    if (_splitMultiLinePaste(event.clipboardData.getData('text')).length > 1) {
      // Make multi-line clilpboard past notice visible and show button
      privMsgMultiLineSendSpanEl.textContent = 'Clipboard (' +
      _splitMultiLinePaste(event.clipboardData.getData('text')).length + ' lines)';
      privMsgBottomDiv2El.removeAttribute('hidden');
    };
  }; // handleprivMsgInputAreaElPaste()
  privMsgInputAreaEl.addEventListener('paste', handleprivMsgInputAreaElPaste);

  // -------------
  // Event handler for clipboard
  // multi-line paste, Send button
  // -------------
  function handleMultiLineSendButtonClick (event) {
    const multiLineArray = _splitMultiLinePaste(privMsgInputAreaEl.value);
    if (multiLineArray.length > 100) {
      privMsgBottomDiv2El.setAttribute('hidden', '');
      privMsgInputAreaEl.value = '';
      showError('Maximum multi-line clipboard paste 100 Lines');
    } else {
      // initialize state flags
      const lastIrcConnect = ircState.times.ircConnect;
      const lastWebConnect = webState.times.webConnect;
      let abortedFlag = false;
      // Avoid flood detect with delay timer, milliseconds per line sent
      const delayIntervalMs = 2000;
      let delayMs = 0;
      if (multiLineArray.length > 0) {
        // Show each line in inputArea while waiting for timer
        privMsgInputAreaEl.value = multiLineArray[0];
        for (let i = 0; i < multiLineArray.length; i++) {
          delayMs += delayIntervalMs;
          setTimeout(function () {
            let okToSend = false;
            if (
              // First, are we connected to IRC server?
              (ircState.ircConnected) &&
              // And, not re-connected IRC
              (lastIrcConnect === ircState.times.ircConnect) &&
              // And, not re-connected Webserver
              (lastWebConnect === webState.times.webConnect) &&
              // And, not aborted
              (!abortedFlag)) {
              okToSend = true;
            }
            if (okToSend) {
              // PM window minimized
              if (privMsgBottomDivEl.hasAttribute('hidden')) okToSend = false;
              // PM name not in active PM list
              if (webState.activePrivateMessageNicks.indexOf(name.toLowerCase()) < 0) {
                okToSend = false;
              }
            }
            if (!okToSend) {
              // once not ok, don't try again
              abortedFlag = true;
            } else {
              // SEnd private message to user
              const message = 'PRIVMSG ' + name +
                ' :' + multiLineArray[i];
              _sendIrcServerMessage(message);
              if (i !== multiLineArray.length - 1) {
                // Show each line in inputArea while waiting for timer
                privMsgInputAreaEl.value = multiLineArray[i + 1];
              } else {
                privMsgInputAreaEl.value = '';
              }
            } // send private message
          }, delayMs); // timer
        } // next i
        privMsgBottomDiv2El.setAttribute('hidden', '');
      } else {
        // case of not multi-line exceed maximum length
        privMsgBottomDiv2El.setAttribute('hidden', '');
        privMsgInputAreaEl.value = '';
      }
    } // case of less than max allowed lines
  } // handleMultiLineSendButtonClick()
  privMsgMultiLineSendButtonEl.addEventListener('click', handleMultiLineSendButtonClick);

  // -------------
  // send button
  // -------------
  function handlePrivMsgSendButtonElClick (event) {
    _sendPrivMessageToUser(name, privMsgInputAreaEl);
    privMsgInputAreaEl.focus();
    resetPrivMsgCount();
    activityIconInhibitTimer = activityIconInhibitTimerValue;
    privMsgBottomDiv2El.setAttribute('hidden', '');
    // Collapse PM whois/send panel after sending message
    document.getElementById('privMsgMainHiddenDiv').setAttribute('hidden', '');
    document.getElementById('privMsgMainHiddenButton').textContent = '+';
  };
  privMsgSendButtonEl.addEventListener('click', handlePrivMsgSendButtonElClick);

  // ---------------
  // Enter pressed
  // ---------------
  function handlePrivMsgInputAreaElInput (event) {
    if (((event.inputType === 'insertText') && (event.data === null)) ||
      (event.inputType === 'insertLineBreak')) {
      // Remove EOL characters at cursor location
      stripOneCrLfFromElement(privMsgInputAreaEl);
      _sendPrivMessageToUser(name, privMsgInputAreaEl);
      resetPrivMsgCount();
      activityIconInhibitTimer = activityIconInhibitTimerValue;
      privMsgBottomDiv2El.setAttribute('hidden', '');
      // Collapse PM whois/send panel after sending message
      document.getElementById('privMsgMainHiddenDiv').setAttribute('hidden', '');
      document.getElementById('privMsgMainHiddenButton').textContent = '+';
    }
  };
  privMsgInputAreaEl.addEventListener('input', handlePrivMsgInputAreaElInput);

  // Clear PM activity counters when activity counter is clicked this individual PM window
  function handlePrivMsgCounterElClick (event) {
    resetPrivMsgCount();
  };
  privMsgCounterEl.addEventListener('click', handlePrivMsgCounterElClick);

  // Clear PM activity counters when activity counter in the parent PM window is clicked
  function handlePrivMsgCountDivClick () {
    resetPrivMsgCount();
  };
  document.getElementById('privMsgCountDiv').addEventListener('click', handlePrivMsgCountDivClick);

  // Clear PM activity counters when activity counter at top of Main page is clicked
  function handlePrivMsgUnreadExistIconClick () {
    resetPrivMsgCount();
  };
  document.getElementById('privMsgUnreadExistIcon')
    .addEventListener('click', handlePrivMsgUnreadExistIconClick);

  // ------------------------------------------------
  // Clear message activity counter by click
  // anywhere on the lower part of the
  // dynamically created private message window
  // -------------------------------------------------
  function handlePrivMsgBottomDivElClick (event) {
    resetPrivMsgCount();
    activityIconInhibitTimer = activityIconInhibitTimerValue;
  };
  privMsgBottomDivEl.addEventListener('click', handlePrivMsgBottomDivElClick);

  // Sound beep checkbox
  function updateVisibility () {
    if (privMsgSectionEl.hasAttribute('beep1-enabled')) {
      privMsgBeep1CBInputEl.checked = true;
    } else {
      privMsgBeep1CBInputEl.checked = false;
    }
    // -------------------------------------
    // Color Theme selector
    // Exchange light theme and dark theme CSS classes
    // -------------------------------------
    if (document.querySelector('body').getAttribute('theme') === 'dark') {
      privMsgSectionEl.classList.add('pm-panel-theme-dark');
      privMsgTextAreaEl.classList.add('text-theme-dark');
      privMsgInputAreaEl.classList.add('text-theme-dark');

      privMsgSectionEl.classList.remove('pm-panel-theme-light');
      privMsgTextAreaEl.classList.remove('text-theme-light');
      privMsgInputAreaEl.classList.remove('text-theme-light');
    } else {
      privMsgSectionEl.classList.add('pm-panel-theme-light');
      privMsgTextAreaEl.classList.add('text-theme-light');
      privMsgInputAreaEl.classList.add('text-theme-light');

      privMsgSectionEl.classList.remove('pm-panel-theme-dark');
      privMsgTextAreaEl.classList.remove('text-theme-dark');
      privMsgInputAreaEl.classList.remove('text-theme-dark');
    }
  }

  // -------------------------
  // Beep On Message checkbox handler
  // -------------------------
  function handlePrivMsgBeep1CBInputElClick (event) {
    if (privMsgSectionEl.hasAttribute('beep1-enabled')) {
      privMsgSectionEl.removeAttribute('beep1-enabled');
    } else {
      privMsgSectionEl.setAttribute('beep1-enabled', '');
      playBeep3Sound();
    }
    updateVisibility();
  };
  privMsgBeep1CBInputEl.addEventListener('click', handlePrivMsgBeep1CBInputElClick);

  // ----------------------------------
  // On creating a new PM chat element
  // initialize the audio line-beep setting
  //
  // Note, reloading from cache destroys and creates
  // new PM elements, and will re-initialize
  // ----------------------------------
  function initPrivMsgBeep1CB () {
    // Check the global setting
    if (document.getElementById('privMsgSectionDiv').hasAttribute('beep-enabled')) {
      // case of enabled globally, enable for new/refreshed element
      privMsgSectionEl.setAttribute('beep1-enabled', '');
      if (!webState.cacheReloadInProgress) {
        playBeep3Sound();
      }
    } else {
      // else disabled globally
      privMsgSectionEl.removeAttribute('beep1-enabled');
    }
    updateVisibility();
  };
  initPrivMsgBeep1CB();

  // -----------------------
  // Cancel all beep sounds
  // -----------------------
  function handleCancelBeepSounds (event) {
    privMsgSectionEl.removeAttribute('beep1-enabled');
  };
  document.addEventListener('cancel-beep-sounds', handleCancelBeepSounds);

  // PM window PRIVMSG event handler
  // if window closed,
  //  - open control window,
  //  - show window, data section and buttons.
  function handlePrivateMessage (event) {
    // console.log(JSON.stringify(event.detail, null, 2));
    function _addText (text) {
      // append text to textarea
      privMsgTextAreaEl.value += cleanFormatting(text) + '\n';
      // move scroll bar so text is scrolled all the way up
      if (!webState.cacheReloadInProgress) {
        privMsgTextAreaEl.scrollTop = privMsgTextAreaEl.scrollHeight;
      }
    }
    const parsedMessage = event.detail.parsedMessage;
    // console.log('Event private-message: ' + JSON.stringify(parsedMessage, null, 2));

    // With each message, if date has changed, print the new date value
    // Two places, see above for opening new window with date divider
    if (
      // case of this is outgoing message from me
      (parsedMessage.params[0].toLowerCase() === name.toLowerCase()) ||
      // case of incoming message from others.
      (
        (parsedMessage.params[0].toLowerCase() !== name.toLowerCase()) &&
        (parsedMessage.nick.toLowerCase() === name.toLowerCase())
      )) {
      if (privMsgSectionEl.getAttribute('lastDate') !== parsedMessage.datestamp) {
        privMsgSectionEl.setAttribute('lastDate', parsedMessage.datestamp);
        privMsgTextAreaEl.value +=
          '\n=== ' + parsedMessage.datestamp + ' ===\n\n';
      }
    }

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
              (!webState.cacheReloadInProgress)) {
              playBeep3Sound();
            }
            // Upon privMsg message, make section visible, unless reload in progress
            if (!webState.cacheReloadInProgress) {
              privMsgSectionEl.removeAttribute('hidden');
              privMsgBottomDivEl.removeAttribute('hidden');
              privMsgHideButtonEl.textContent = '-';
              privMsgTopRightHidableDivEl.removeAttribute('hidden');
            } else {
              if (listOfOpenPMPanels.indexOf(name.toLowerCase()) >= 0) {
                privMsgSectionEl.removeAttribute('hidden');
                privMsgBottomDivEl.removeAttribute('hidden');
                privMsgHideButtonEl.textContent = '-';
                privMsgTopRightHidableDivEl.removeAttribute('hidden');
              } else {
                privMsgSectionEl.setAttribute('hidden', '');
                privMsgBottomDivEl.setAttribute('hidden', '');
                privMsgHideButtonEl.textContent = '+';
                privMsgTopRightHidableDivEl.setAttribute('hidden', '');
              }
            }
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
              (!webState.cacheReloadInProgress)) {
              playBeep3Sound();
            }
            // Upon privMsg message, make section visible, unless reload in progress
            if (!webState.cacheReloadInProgress) {
              privMsgSectionEl.removeAttribute('hidden');
              privMsgBottomDivEl.removeAttribute('hidden');
              privMsgHideButtonEl.textContent = '-';
              privMsgTopRightHidableDivEl.removeAttribute('hidden');
            } else {
              if (listOfOpenPMPanels.indexOf(name.toLowerCase()) >= 0) {
                privMsgSectionEl.removeAttribute('hidden');
                privMsgBottomDivEl.removeAttribute('hidden');
                privMsgHideButtonEl.textContent = '-';
                privMsgTopRightHidableDivEl.removeAttribute('hidden');
              } else {
                privMsgSectionEl.setAttribute('hidden', '');
                privMsgBottomDivEl.setAttribute('hidden', '');
                privMsgHideButtonEl.textContent = '+';
                privMsgTopRightHidableDivEl.setAttribute('hidden', '');
              }
            }
            if (!webState.cacheReloadInProgress) {
              clearLastZoom();
            }

            // Message activity Icon
            // If focus not <inputarea> elment,
            // and focus not message send button
            // and NOT reload from cache in progress (timer not zero)
            // then display incoming message activity icon
            if ((document.activeElement !== privMsgInputAreaEl) &&
            (document.activeElement !== privMsgSendButtonEl) &&
            (!webState.cacheReloadInProgress) &&
            (activityIconInhibitTimer === 0)) {
              incrementPrivMsgCount();
            }
          }
        }
        break;
      default:
    }
  };
  document.addEventListener('private-message', handlePrivateMessage);

  // PM to be made visible on opening a new window (except on refresh)
  if (!webState.cacheReloadInProgress) {
    incrementPrivMsgCount();
  }

  // Do this when creating the PM element for this user.
  // Hide control window, so open/close buttons are in sync
  document.getElementById('privMsgMainHiddenDiv').setAttribute('hidden', '');
  document.getElementById('privMsgMainHiddenButton').textContent = '+';

  // In case of cache reload
  // Persist open window from array of PM nicknames.
  if (webState.cacheReloadInProgress) {
    if (listOfOpenPMPanels.indexOf(name.toLowerCase()) >= 0) {
      privMsgSectionEl.removeAttribute('hidden');
      privMsgBottomDivEl.removeAttribute('hidden');
      privMsgHideButtonEl.textContent = '-';
      privMsgTopRightHidableDivEl.removeAttribute('hidden');
    } else {
      privMsgSectionEl.setAttribute('hidden', '');
      privMsgBottomDivEl.setAttribute('hidden', '');
      privMsgHideButtonEl.textContent = '+';
      privMsgTopRightHidableDivEl.setAttribute('hidden', '');
    }
  }

  // -----------------------------------------------------------
  // Setup textarea elements as dynamically resizable
  // -----------------------------------------------------------
  //
  // Scale values for <textarea> are calculated in webclient10.js
  // and saved globally in the webState object
  //
  const adjustPMInputToWidowWidth = function () {
    // pixel width mar1 is reserved space on edges of input area at full screen width
    const mar1 = webState.dynamic.commonMargin;
    // pixel width mar2 is reserved space on edges of input area with send button added
    const mar2 = webState.dynamic.commonMargin + 5 + webState.dynamic.sendButtonWidthPx;
    // pixel width mar3 is reserved space on edges of input area with channel nickname list on sides

    privMsgTextAreaEl.setAttribute('cols', calcInputAreaColSize(mar1));
    privMsgInputAreaEl.setAttribute('cols', calcInputAreaColSize(mar2));
  }; // adjustPMInputToWidowWidth()
  //
  // Event listener for resize window (fired as global event)
  //
  function handleResizeCustomElements (event) {
    if (webState.dynamic.inputAreaCharWidthPx) {
      adjustPMInputToWidowWidth();
    }
  };
  window.addEventListener('resize-custom-elements', handleResizeCustomElements);
  //
  // Resize on creating private message window
  //
  adjustPMInputToWidowWidth();

  //
  // This is a hack. If adding the channel window
  // causes the vertical scroll to appear,
  // Then the dynamic element side of textarea
  // element will not account for vertical slider width
  // Fix...wait 0.15 sec for scroll bar to appear and
  // dynamically size again.
  //
  setTimeout(adjustPMInputToWidowWidth, 150);

  // ---------------------------------------------------------------
  // These are global event listeners created in dynamic windows.
  // Refreshing the cache will delete and re-create these elements
  // This is to remove the global event listeners before destroy element
  // ---------------------------------------------------------------
  function handleEraseBeforeReload (event) {
    // console.log('erase-before-reload event fired in PM window');
    // Case of visible PM panel the show/hide button has minus sign [-]
    // Before performing API cache reload, add PM nickname to temporary
    // array of nicknames for use during cache reload to set panel visibility.
    if (privMsgHideButtonEl.textContent === '-') {
      listOfOpenPMPanels.push(privMsgNameDivEl.textContent.toLowerCase());
    }

    // first remove cyclic timers within element
    clearInterval(iconInhibitTimer);

    // Next remove global event listeners
    document.removeEventListener('cache-reload-done', handleCacheReloadDone);
    document.removeEventListener('cache-reload-error', handelCacheReloadError);
    document.removeEventListener('priv-msg-hide-all', handlePrivMsgHideAll);
    document.removeEventListener('priv-msg-show-all', handlePrivMsgShowAll);
    privMsgHideButtonEl.removeEventListener('click', handlePrivMsgHideButtonElClick);
    privMsgTallerButtonEl.removeEventListener('click', handlePrivMsgTallerButtonElClick);
    privMsgNormalButtonEl.removeEventListener('click', handlePrivMsgNormalButtonElClick);
    document.removeEventListener('show-all-divs', handleShowAllDivs);
    document.removeEventListener('hide-or-zoom', handleHideOrZoom);
    document.removeEventListener('color-theme-changed', handleColorThemePM);
    privMsgSendButtonEl.removeEventListener('click', handlePrivMsgSendButtonElClick);
    privMsgMultiLineSendButtonEl.removeEventListener('click', handleMultiLineSendButtonClick);
    privMsgInputAreaEl.removeEventListener('input', handlePrivMsgInputAreaElInput);
    privMsgInputAreaEl.removeEventListener('paste', handleprivMsgInputAreaElPaste);
    privMsgCounterEl.removeEventListener('click', handlePrivMsgCounterElClick);
    document.getElementById('privMsgCountDiv')
      .removeEventListener('click', handlePrivMsgCountDivClick);
    document.getElementById('privMsgUnreadExistIcon')
      .removeEventListener('click', handlePrivMsgUnreadExistIconClick);
    privMsgBottomDivEl.removeEventListener('click', handlePrivMsgBottomDivElClick);
    privMsgBeep1CBInputEl.removeEventListener('click', handlePrivMsgBeep1CBInputElClick);
    document.removeEventListener('cancel-beep-sounds', handleCancelBeepSounds);
    document.removeEventListener('private-message', handlePrivateMessage);
    window.removeEventListener('resize-custom-elements', handleResizeCustomElements);
    document.removeEventListener('erase-before-reload', handleEraseBeforeReload);

    // this PM element can now be removed from DOM externally (below)
    if (privMsgContainerDivEl.contains(privMsgSectionEl)) {
      // console.log('removeChild(privMsgSectionEl');
      // remove the private message element from DOM
      privMsgContainerDivEl.removeChild(privMsgSectionEl);
    }
  };
  document.addEventListener('erase-before-reload', handleEraseBeforeReload);
}; // createPrivateMessageEl()

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
  const inputAreaEl = document.getElementById('userPrivMsgInputId');
  const text = stripTrailingCrLf(inputAreaEl.value);
  if (detectMultiLineString(text)) {
    showError('Multi-line input is not supported.');
    inputAreaEl.value = '';
  } else {
    if (text.length === 0) {
      // remove cr/lf if present, then do nothing
      inputAreaEl.value = '';
    } else {
      // Check slash character to see if it is an IRC command
      if (text.charAt(0) === '/') {
        // yes, it is command
        const commandAction = textCommandParser(
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
        } else {
          if ((commandAction.ircMessage) && (commandAction.ircMessage.length > 0)) {
            _sendIrcServerMessage(commandAction.ircMessage);
          }
        }
      } else {
        // console.log('else not command');
        // Else not slash / command, assume is input intended to send to private message.
        if (document.getElementById('pmNickNameInputId').value.length === 0) return;
        const targetNickname = document.getElementById('pmNickNameInputId').value;
        const message = 'PRIVMSG ' + targetNickname + ' :' + text;
        _sendIrcServerMessage(message);
        inputAreaEl.value = '';
      }
    }
  }
}; // _buildPrivateMessageText ()
document.getElementById('userPrivMsgInputId').addEventListener('input', function (event) {
  if ((event.inputType === 'insertText') && (event.data === null)) {
    // Remove EOL characters at cursor location
    stripOneCrLfFromElement(document.getElementById('userPrivMsgInputId'));
    _buildPrivateMessageText();
  }
  if (event.inputType === 'insertLineBreak') {
    // Remove EOL characters at cursor location
    stripOneCrLfFromElement(document.getElementById('userPrivMsgInputId'));
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

  // Clear all previous PM nicknames
  webState.activePrivateMessageNicks = [];
  webState.lastPMNick = '';

  // Clear total PM counter and window count
  document.getElementById('privMsgWindowCountDiv').textContent = '0';
  document.getElementById('privMsgWindowCountDiv').setAttribute('hidden', '');
  document.getElementById('privMsgHeaderEraseAllDiv').setAttribute('hidden', '');

  document.getElementById('privMsgCountDiv').textContent = '0';
  document.getElementById('privMsgCountDiv').setAttribute('hidden', '');
  document.getElementById('privMsgUnreadExistIcon').setAttribute('hidden', '');

  document.getElementById('privMsgMainHiddenDiv').setAttribute('hidden', '');
  document.getElementById('privMsgMainHiddenButton').textContent = '+';
});

// ---------------------------------------------------
// Load Private Message beep enable from local storage
// ---------------------------------------------------
function loadBeepEnable () {
  // Default disabled
  document.getElementById('openPmWithBeepCheckbox').checked = false;
  document.getElementById('privMsgSectionDiv').removeAttribute('beep-enabled');

  let beepEnableObj = null;
  beepEnableObj = JSON.parse(window.localStorage.getItem('privMsgBeep'));
  if ((beepEnableObj) &&
    (typeof beepEnableObj === 'object')) {
    if (beepEnableObj.beep) {
      document.getElementById('openPmWithBeepCheckbox').checked = true;
      document.getElementById('privMsgSectionDiv').setAttribute('beep-enabled', '');
    } else {
      document.getElementById('openPmWithBeepCheckbox').checked = false;
      document.getElementById('privMsgSectionDiv').removeAttribute('beep-enabled');
    }
  }
}
// do on creating new channel element
loadBeepEnable();

// ---------------------------------------
// Event handler for open with line-beep checkbox
// ---------------------------------------
function handleOpenWithBeepCBClick (event) {
  const now = unixTimestamp();
  if (document.getElementById('openPmWithBeepCheckbox').checked) {
    document.getElementById('privMsgSectionDiv').setAttribute('beep-enabled', '');
    window.localStorage.setItem('privMsgBeep', JSON.stringify(
      {
        timestamp: now,
        beep: true
      }
    ));
    playBeep3Sound();
  } else {
    document.getElementById('privMsgSectionDiv').removeAttribute('beep-enabled');
    window.localStorage.setItem('privMsgBeep', JSON.stringify(
      {
        timestamp: now,
        beep: false
      }
    ));
  }
};
document.getElementById('openPmWithBeepCheckbox')
  .addEventListener('click', handleOpenWithBeepCBClick);

// -------------------------
// [Erase All  PM] button handler
// -------------------------
document.getElementById('privMsgHeaderEraseAllDiv').addEventListener('click', function () {
  const fetchURL = webServerUrl + '/irc/erase';
  const fetchOptions = {
    method: 'POST',
    headers: {
      'CSRF-Token': csrfToken,
      'Content-type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({ erase: 'PRIVMSG' })
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
      }
    })
    .catch((error) => {
      // console.log(error);
      showError(error.toString());
    });
});

// -------------------------
// Whois button handler
// -------------------------
document.getElementById('whoisButton').addEventListener('click', function () {
  if (document.getElementById('pmNickNameInputId').value.length > 0) {
    showRawMessageWindow();
    const message = 'WHOIS ' + document.getElementById('pmNickNameInputId').value;
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

// ---------------------------------------------------------
// Update unread message count in parent PM window
//
// This function will loop through all private message elements
// For each element, build a sum of total un-read messages
// Then update the count displayed in the parent PM widow
// ---------------------------------------------------------
document.addEventListener('update-pm-count', function (event) {
  let totalCount = 0;
  document.querySelectorAll('.pm-count-class').forEach(function (el) {
    totalCount += parseInt(el.textContent);
  });
  document.getElementById('privMsgCountDiv').textContent = totalCount.toString();
  if (totalCount > 0) {
    // This is local icon at parent window to PM section
    document.getElementById('privMsgCountDiv').removeAttribute('hidden');
    // This is global icon at top of main page
    document.getElementById('privMsgUnreadExistIcon').removeAttribute('hidden');
  } else {
    // This is local icon at parent window to PM section
    document.getElementById('privMsgCountDiv').setAttribute('hidden', '');
    // This is global icon at top of main page
    document.getElementById('privMsgUnreadExistIcon').setAttribute('hidden', '');
  }
});
