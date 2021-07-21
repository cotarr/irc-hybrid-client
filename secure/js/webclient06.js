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
// ---------------------------------------
// webclient06.js - IRC Channel Functions
// ---------------------------------------
'use strict';
// ------------------------------------------------------
// THis module dynamically creates channel windows and
// adds them to the DOM
// ------------------------------------------------------

// ------------------------------------------
// Send text to channel (internal function)
// Intercept IRC text command if detected
// ------------------------------------------
function _sendTextToChannel (channelIndex, textAreaEl) {
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
            originType: 'channel',
            originName: ircState.channelStates[channelIndex].name
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

      // Else not slash / command, assume is input intended to send to channel.
      //
      // Check if marked away, if so cancel away, 1 second delay
      //
      if ((ircState.ircConnected) && (ircState.ircIsAway)) {
        setTimeout(function () {
          // check again after timer, abort if not away
          if ((ircState.ircConnected) && (ircState.ircIsAway)) {
            // cancel away state, IRC server response will be parsed in backend
            _sendIrcServerMessage('AWAY');
          }
        }, 1000);
      }
      //
      // Send message to channel
      //
      const message = 'PRIVMSG ' +
        ircState.channelStates[channelIndex].name +
        ' :' + text;
      _sendIrcServerMessage(message);
      textAreaEl.value = '';
    }
  }
  textAreaEl.value = '';
}; // _sendTextToChannel

let zoomIndexNumber = 0;
const mobileBreakpointPx = 600;

// --------------------------------------------------------
// This creates a new channel window and adds it to the DOM
//
// Input:  Channel name with prefix character (#mychannel)
// --------------------------------------------------------
function createChannelEl (name) {
  // if channel already exist abort
  if (webState.channels.indexOf(name.toLowerCase()) >= 0) {
    console.log('createChannelEl: channel already exist');
    return;
  }

  const defaultHeightInRows = '17';

  // Add to local browser list of open channels
  webState.channels.push(name.toLowerCase());
  // Initialize local state (note upon page refresh, channel joined may be false)
  const initIrcStateIndex = ircState.channels.indexOf(name.toLowerCase());
  webState.channelStates.push({
    lastJoined: ircState.channelStates[initIrcStateIndex].joined
  });

  let maxNickLength = 0;
  // console.log('creating Channel Element ' + name);

  const channelIndex = ircState.channels.indexOf(name.toLowerCase());
  // console.log('channel state obj ' +
  //   JSON.stringify(ircState.channelStates[channelIndex], null, 2));

  // This is static HTML element created in webclient.html (Insert point)
  const channelContainerDivEl = document.getElementById('channelContainerDiv');

  // section-div (main element for each channel)
  const channelMainSectionEl = document.createElement('div');
  channelMainSectionEl.classList.add('color-channel');
  channelMainSectionEl.classList.add('aa-section-div');

  // Top Element (non-hidden element)
  const channelTopDivEl = document.createElement('div');
  channelTopDivEl.classList.add('channel-top-div');
  channelTopDivEl.classList.add('head-flex');

  // left flexbox div
  const channelTopLeftDivEl = document.createElement('div');
  channelTopLeftDivEl.classList.add('head-left');

  const channelTopSpacerDivEl = document.createElement('div');
  channelTopSpacerDivEl.classList.add('vh5');

  // center if needed here

  // right flexbox div
  const channelTopRightDivEl = document.createElement('div');
  channelTopRightDivEl.classList.add('head-right');

  // right hidable div
  const channelTopRightHidableDivEl = document.createElement('div');
  channelTopRightHidableDivEl.classList.add('head-right-hidable-div');

  // show/hide button
  const channelHideButtonEl = document.createElement('button');
  channelHideButtonEl.textContent = '-';
  channelHideButtonEl.classList.add('channel-button');

  // Top Channel name
  const channelNameDivEl = document.createElement('div');
  channelNameDivEl.textContent = ircState.channelStates[channelIndex].name;
  channelNameDivEl.classList.add('chan-name-div');

  // Taller button
  const channelTallerButtonEl = document.createElement('button');
  channelTallerButtonEl.textContent = 'Taller';
  channelTallerButtonEl.classList.add('channel-button');

  // Normal button
  const channelNormalButtonEl = document.createElement('button');
  channelNormalButtonEl.textContent = 'Normal';
  channelNormalButtonEl.classList.add('channel-button');

  // Clear button
  const channelClearButtonEl = document.createElement('button');
  channelClearButtonEl.textContent = 'Clear';
  channelClearButtonEl.classList.add('channel-button');

  // Bottom Element (optionally hidden)
  const channelBottomDivEl = document.createElement('div');
  channelBottomDivEl.classList.add('channel-bottom-div');

  // channel topic
  const channelTopicDivEl = document.createElement('div');
  channelTopicDivEl.textContent = cleanFormatting(ircState.channelStates[channelIndex].topic);
  channelTopicDivEl.classList.add('chan-topic-div');

  // list of nick names display
  const channelNamesCharWidth = 20;
  const channelNamesDisplayEl = document.createElement('textarea');
  channelNamesDisplayEl.classList.add('channel-names-display');
  channelNamesDisplayEl.setAttribute('cols', channelNamesCharWidth.toString());
  channelNamesDisplayEl.setAttribute('rows', defaultHeightInRows);
  channelNamesDisplayEl.setAttribute('spellCheck', 'false');
  channelNamesDisplayEl.setAttribute('readonly', '');

  // resizable text area
  const channelTextAreaEl = document.createElement('textarea');
  const channelTextAreaId = 'chan' + channelIndex.toString() + 'TextAreaId';
  channelTextAreaEl.id = channelTextAreaId;
  // this is temporary, the width (cols attribute) will be resized dynamically
  channelTextAreaEl.setAttribute('cols', '30');
  channelTextAreaEl.setAttribute('rows', defaultHeightInRows);
  channelTextAreaEl.setAttribute('spellCheck', 'false');
  channelTextAreaEl.setAttribute('readonly', '');

  // div holding input area and send button
  const channelBottomDiv1El = document.createElement('div');
  channelBottomDiv1El.classList.add('button-div');

  // single line user input
  const channelInputAreaEl = document.createElement('textarea');
  const channelInputAreaId = 'chan' + channelIndex.toString() + 'InputInputId';
  channelInputAreaEl.id = channelInputAreaId;
  channelInputAreaEl.setAttribute('cols', '120');
  channelInputAreaEl.setAttribute('rows', '1');
  channelInputAreaEl.classList.add('va-middle');
  channelInputAreaEl.classList.add('rm5');

  // send button
  const channelSendButtonEl = document.createElement('button');
  channelSendButtonEl.textContent = 'Send';
  channelSendButtonEl.classList.add('va-middle');

  // button-div
  const channelBottomDiv2El = document.createElement('div');
  channelBottomDiv2El.classList.add('button-div');

  // join button
  const channelJoinButtonEl = document.createElement('button');
  channelJoinButtonEl.textContent = 'Join';
  channelJoinButtonEl.classList.add('channel-button');

  // prune button
  const channelPruneButtonEl = document.createElement('button');
  channelPruneButtonEl.textContent = 'Prune';
  channelPruneButtonEl.classList.add('channel-button');

  // part button
  const channelPartButtonEl = document.createElement('button');
  channelPartButtonEl.textContent = 'Leave';
  channelPartButtonEl.classList.add('channel-button');

  // zoom button
  const channelZoomButtonEl = document.createElement('button');
  const zoomOffText = 'Zoom';
  const zoomOnText = 'Un-zoom';
  channelZoomButtonEl.textContent = zoomOffText;
  channelZoomButtonEl.classList.add('channel-button');

  // refresh button
  const channelRefreshButtonEl = document.createElement('button');
  channelRefreshButtonEl.textContent = 'Refresh';
  channelRefreshButtonEl.classList.add('channel-button');

  // button-div
  const channelBottomDiv3El = document.createElement('div');
  channelBottomDiv3El.classList.add('button-div');

  // Text Format checkbox
  const channelFormatCBInputEl = document.createElement('input');
  channelFormatCBInputEl.classList.add('channel-cb-cb');
  channelFormatCBInputEl.setAttribute('type', 'checkbox');
  const channelFormatCBTitleEl = document.createElement('span');
  channelFormatCBTitleEl.classList.add('channel-cb-span');
  channelFormatCBTitleEl.textContent = 'Brief';

  // Auto-complete checkbox
  const channelAutoCompCBInputEl = document.createElement('input');
  channelAutoCompCBInputEl.classList.add('channel-cb-cb');
  channelAutoCompCBInputEl.setAttribute('type', 'checkbox');
  const channelAutoCompCBTitleEl = document.createElement('span');
  channelAutoCompCBTitleEl.classList.add('channel-cb-span');
  channelAutoCompCBTitleEl.textContent = 'Auto-complete (tab, space-space)';

  // button-div
  const channelBottomDiv4El = document.createElement('div');
  channelBottomDiv4El.classList.add('button-div');

  // beep on message checkbox
  const channelBeep1CBInputEl = document.createElement('input');
  channelBeep1CBInputEl.classList.add('channel-cb-cb');
  channelBeep1CBInputEl.setAttribute('type', 'checkbox');
  const channelBeep1CBTitleEl = document.createElement('span');
  channelBeep1CBTitleEl.classList.add('channel-cb-span');
  channelBeep1CBTitleEl.textContent = 'Line-beep';

  // beep on join checkbox
  const channelBeep2CBInputEl = document.createElement('input');
  channelBeep2CBInputEl.classList.add('channel-cb-cb');
  channelBeep2CBInputEl.setAttribute('type', 'checkbox');
  const channelBeep2CBTitleEl = document.createElement('span');
  channelBeep2CBTitleEl.classList.add('channel-cb-span');
  channelBeep2CBTitleEl.textContent = 'Join-beep';

  // beep on matchNick my nickname checkbox
  const channelBeep3CBInputEl = document.createElement('input');
  channelBeep3CBInputEl.classList.add('channel-cb-cb');
  channelBeep3CBInputEl.setAttribute('type', 'checkbox');
  const channelBeep3CBTitleEl = document.createElement('span');
  channelBeep3CBTitleEl.classList.add('channel-cb-span');
  channelBeep3CBTitleEl.textContent = 'Name-beep';

  // --------------------------------
  // Append child element to DOM
  // --------------------------------

  channelTopLeftDivEl.appendChild(channelHideButtonEl);
  channelTopLeftDivEl.appendChild(channelNameDivEl);

  channelTopRightHidableDivEl.appendChild(channelJoinButtonEl);
  channelTopRightHidableDivEl.appendChild(channelPruneButtonEl);
  channelTopRightHidableDivEl.appendChild(channelPartButtonEl);
  channelTopRightHidableDivEl.appendChild(channelZoomButtonEl);

  channelTopRightDivEl.appendChild(channelTopRightHidableDivEl);

  channelTopDivEl.appendChild(channelTopLeftDivEl);
  channelTopDivEl.appendChild(channelTopRightDivEl);

  channelBottomDiv1El.appendChild(channelInputAreaEl);
  channelBottomDiv1El.appendChild(channelSendButtonEl);

  channelBottomDiv2El.appendChild(channelRefreshButtonEl);
  channelBottomDiv2El.appendChild(channelClearButtonEl);
  channelBottomDiv2El.appendChild(channelTallerButtonEl);
  channelBottomDiv2El.appendChild(channelNormalButtonEl);

  channelBottomDiv3El.appendChild(channelFormatCBInputEl);
  channelBottomDiv3El.appendChild(channelFormatCBTitleEl);
  channelBottomDiv3El.appendChild(channelAutoCompCBInputEl);
  channelBottomDiv3El.appendChild(channelAutoCompCBTitleEl);

  channelBottomDiv4El.appendChild(channelBeep1CBInputEl);
  channelBottomDiv4El.appendChild(channelBeep1CBTitleEl);
  channelBottomDiv4El.appendChild(channelBeep2CBInputEl);
  channelBottomDiv4El.appendChild(channelBeep2CBTitleEl);
  channelBottomDiv4El.appendChild(channelBeep3CBInputEl);
  channelBottomDiv4El.appendChild(channelBeep3CBTitleEl);

  channelBottomDivEl.appendChild(channelTopicDivEl);
  channelBottomDivEl.appendChild(channelNamesDisplayEl);
  channelBottomDivEl.appendChild(channelTextAreaEl);
  channelBottomDivEl.appendChild(channelBottomDiv1El);
  channelBottomDivEl.appendChild(channelBottomDiv2El);
  channelBottomDivEl.appendChild(channelBottomDiv3El);
  channelBottomDivEl.appendChild(channelBottomDiv4El);

  channelMainSectionEl.appendChild(channelTopDivEl);
  channelMainSectionEl.appendChild(channelTopSpacerDivEl);
  channelMainSectionEl.appendChild(channelBottomDivEl);

  if (channelContainerDivEl.firstChild) {
    channelContainerDivEl.insertBefore(
      channelMainSectionEl, channelContainerDivEl.firstChild);
  } else {
    channelContainerDivEl.appendChild(channelMainSectionEl);
  }

  // This is to make room for seeing the display.
  // If state of channel is joined, then hide raw servermessage window.
  if (ircState.channelStates[initIrcStateIndex].joined) {
    hideRawMessageWindow();
  }

  // --------------------------
  // Channel specific timers
  // --------------------------

  // inhibit timer to prevent display of activity icon
  let activityIconInhibitTimer = 0;
  setInterval(function () {
    if (activityIconInhibitTimer > 0) activityIconInhibitTimer--;
  }, 1000);

  // --------------------------
  // Channel Event listeners
  // ---------------------------

  // -------------------------
  // Show/Hide button handler
  // -------------------------
  channelHideButtonEl.addEventListener('click', function () {
    if (channelMainSectionEl.hasAttribute('opened')) {
      channelMainSectionEl.removeAttribute('opened');
      channelMainSectionEl.removeAttribute('zoom');
    } else {
      channelMainSectionEl.setAttribute('opened', '');
      channelMainSectionEl.removeAttribute('zoom');
    }
    updateVisibility();
  });

  // -------------------------
  // Taller button handler
  // -------------------------
  channelTallerButtonEl.addEventListener('click', function () {
    const newRows = parseInt(channelTextAreaEl.getAttribute('rows')) + 10;
    channelTextAreaEl.setAttribute('rows', newRows.toString());
    channelNamesDisplayEl.setAttribute('rows', newRows.toString());
    channelInputAreaEl.setAttribute('rows', '3');
  }); // createChannelEl()

  // -------------------------
  // Normal button handler
  // -------------------------
  channelNormalButtonEl.addEventListener('click', function () {
    channelTextAreaEl.setAttribute('rows', defaultHeightInRows);
    channelNamesDisplayEl.setAttribute('rows', defaultHeightInRows);
    channelInputAreaEl.setAttribute('rows', '1');
  });

  // -------------------------
  // Clear button handler
  // -------------------------
  channelClearButtonEl.addEventListener('click', function () {
    channelTextAreaEl.value = '';
    channelTextAreaEl.setAttribute('rows', defaultHeightInRows);
    channelNamesDisplayEl.setAttribute('rows', defaultHeightInRows);
    channelInputAreaEl.setAttribute('rows', '1');
  });

  // -------------------------
  // Join button handler
  // -------------------------
  channelJoinButtonEl.addEventListener('click', function () {
    const message = 'JOIN ' + name;
    _sendIrcServerMessage(message);
  });

  // -------------------------
  // Part button handler
  // -------------------------
  channelPartButtonEl.addEventListener('click', function () {
    const message = 'PART ' + name + ' :' + ircState.progName + ' ' + ircState.progVersion;
    _sendIrcServerMessage(message);
  });

  // -------------------------
  // Prune button handler
  // -------------------------
  channelPruneButtonEl.addEventListener('click', function () {
    // Internal function to remove channel window from DOM
    // Some variabes are within variable namespace of parent function.
    function _removeChannelFromDom () {
      // remove frontend browser state info for this channel
      const webStateChannelsIndex = webState.channels.indexOf(name.toLowerCase());
      if (webStateChannelsIndex >= 0) {
        webState.channels.splice(webStateChannelsIndex, 1);
        webState.channelStates.splice(webStateChannelsIndex, 1);
      }

      // This removes self (own element)
      // remove the channel element from DOM
      channelContainerDivEl.removeChild(channelMainSectionEl);
    }

    // Fetch API to remove channel from backend server
    const index = ircState.channels.indexOf(name.toLowerCase());
    if (index >= 0) {
      // if not joined, this is quietly ignored without error
      if (!ircState.channelStates[index].joined) {
        const fetchURL = webServerUrl + '/irc/prune';
        const fetchOptions = {
          method: 'POST',
          headers: {
            'Content-type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify({ channel: name })
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
            // console.log(JSON.stringify(responseJson, null, 2));
            if (responseJson.error) {
              showError(responseJson.message);
            } else {
              // channel successfully removed from server, remove it from client also
              _removeChannelFromDom();
            }
          })
          .catch((error) => {
            console.log(error);
          });
      }
    } else {
      // Special case - channel removed from outsdie this web page.
      // Most likely you are logged into two devices.
      // Channel is gone, remove from DOM using prune button
      _removeChannelFromDom();
    }
  });

  // -------------------------
  // Refresh button handler
  // -------------------------
  channelRefreshButtonEl.addEventListener('click', function () {
    if (!webState.cacheReloadInProgress) {
      // this forces a global update which will refreesh text area
      document.dispatchEvent(new CustomEvent('update-from-cache', { bubbles: true }));
      // THis will request a new nickname list from IRC server.

      // 2021-07-16 temporary disable
      // channelNamesDisplayEl.value = '';
      // _sendIrcServerMessage('NAMES ' + name);
    }
  });

  // -------------
  // send button
  // -------------
  channelSendButtonEl.addEventListener('click', function () {
    _sendTextToChannel(channelIndex, channelInputAreaEl);
    channelInputAreaEl.focus();
    resetChanActivityIcon(channelIndex);
    activityIconInhibitTimer = activityIconInhibitTimerValue;
  });

  // ---------------
  // Enter pressed
  // ---------------
  channelInputAreaEl.addEventListener('input', function (event) {
    if (((event.inputType === 'insertText') && (event.data === null)) ||
      (event.inputType === 'insertLineBreak')) {
      // Remove EOL characters at cursor loction
      stripOneCrLfFromElement(channelInputAreaEl);
      _sendTextToChannel(channelIndex, channelInputAreaEl);
      resetChanActivityIcon(channelIndex);
      activityIconInhibitTimer = activityIconInhibitTimerValue;
    }
  });

  // ------------------------------------------------
  // Clear message activity ICON by click anywhere on the
  // dynamically created channel message window
  // -------------------------------------------------
  channelMainSectionEl.addEventListener('click', function () {
    resetChanActivityIcon(channelIndex);
    activityIconInhibitTimer = activityIconInhibitTimerValue;
  });

  function updateVisibility () {
    const index = ircState.channels.indexOf(name.toLowerCase());
    if (index >= 0) {
      if (channelMainSectionEl.hasAttribute('opened')) {
        // show contents below header bar
        channelBottomDivEl.removeAttribute('hidden');
        // update show/hide button
        channelHideButtonEl.textContent = '-';
        if (ircState.channelStates[index].joined) {
          channelTopicDivEl.textContent = cleanFormatting(ircState.channelStates[index].topic);
          channelNamesDisplayEl.removeAttribute('disabled');
          channelTextAreaEl.removeAttribute('disabled');
          channelInputAreaEl.removeAttribute('disabled');
          channelSendButtonEl.removeAttribute('disabled');

          channelJoinButtonEl.setAttribute('hidden', '');
          channelPruneButtonEl.setAttribute('hidden', '');
          channelPartButtonEl.removeAttribute('hidden');
        } else {
          channelNamesDisplayEl.setAttribute('disabled', '');
          channelTextAreaEl.setAttribute('disabled', '');
          channelInputAreaEl.setAttribute('disabled', '');
          channelSendButtonEl.setAttribute('disabled', '');

          channelJoinButtonEl.removeAttribute('hidden');
          channelPruneButtonEl.removeAttribute('hidden');
          channelPartButtonEl.setAttribute('hidden', '');

          channelTopicDivEl.removeAttribute('hidden');
          channelBottomDiv2El.removeAttribute('hidden');
          channelBottomDiv3El.removeAttribute('hidden');
          channelBottomDiv4El.removeAttribute('hidden');
          channelNamesDisplayEl.removeAttribute('hidden');
        } // not joined

        // common, both joined and not joined, for zoom
        if (channelMainSectionEl.hasAttribute('zoom')) {
          channelZoomButtonEl.textContent = zoomOnText;
          channelTopicDivEl.setAttribute('hidden', '');
          channelBottomDiv2El.setAttribute('hidden', '');
          channelBottomDiv3El.setAttribute('hidden', '');
          channelBottomDiv4El.setAttribute('hidden', '');
          if (webState.dynamic.bodyClientWidth > mobileBreakpointPx) {
            channelNamesDisplayEl.removeAttribute('hidden');
          } else {
            channelNamesDisplayEl.setAttribute('hidden', '');
          }
        } else {
          channelZoomButtonEl.textContent = zoomOffText;
          channelTopicDivEl.removeAttribute('hidden');
          channelBottomDiv2El.removeAttribute('hidden');
          channelBottomDiv3El.removeAttribute('hidden');
          channelBottomDiv4El.removeAttribute('hidden');
          channelNamesDisplayEl.removeAttribute('hidden');
        }

        if (channelMainSectionEl.hasAttribute('beep1-enabled')) {
          channelBeep1CBInputEl.checked = true;
        } else {
          channelBeep1CBInputEl.checked = false;
        }
        if (channelMainSectionEl.hasAttribute('beep2-enabled')) {
          channelBeep2CBInputEl.checked = true;
        } else {
          channelBeep2CBInputEl.checked = false;
        }
        if (channelMainSectionEl.hasAttribute('beep3-enabled')) {
          channelBeep3CBInputEl.checked = true;
        } else {
          channelBeep3CBInputEl.checked = false;
        }
        if (channelMainSectionEl.hasAttribute('brief-enabled')) {
          channelFormatCBInputEl.checked = true;
        } else {
          channelFormatCBInputEl.checked = false;
        }
        if (channelMainSectionEl.hasAttribute('auto-comp-enabled')) {
          channelAutoCompCBInputEl.checked = true;
        } else {
          channelAutoCompCBInputEl.checked = false;
        }
      } else {
        // case of NOT opened
        channelZoomButtonEl.textContent = zoomOffText;
        channelBottomDivEl.setAttribute('hidden', '');
        channelPruneButtonEl.setAttribute('hidden', '');
        channelJoinButtonEl.setAttribute('hidden', '');
        channelPartButtonEl.setAttribute('hidden', '');
        channelHideButtonEl.textContent = '+';
      }
    } else {
      // Case of index < 0
      channelZoomButtonEl.textContent = zoomOffText;
      channelBottomDivEl.setAttribute('hidden', '');
      channelPruneButtonEl.setAttribute('hidden', '');
      channelJoinButtonEl.setAttribute('hidden', '');
      channelPartButtonEl.setAttribute('hidden', '');
      channelHideButtonEl.textContent = '+';
    }
  } // updateVisibility()

  // -------------------------
  // Zoom button handler
  // -------------------------
  zoomIndexNumber++;
  const zoomEventId = 'chan' + zoomIndexNumber.toString() + 'ZoomId';
  channelZoomButtonEl.addEventListener('click', function () {
    if (channelMainSectionEl.hasAttribute('zoom')) {
      // Turn off channel zoom
      channelMainSectionEl.removeAttribute('zoom');
      updateVisibility();
      // scroll text to most recent messages
      channelTextAreaEl.scrollTop = channelTextAreaEl.scrollHeight;
    } else {
      // this will be executed by all other windows.
      // The handler for this window will match zoomEventId
      // and handle the zoom for this window as a special case
      document.dispatchEvent(new CustomEvent('hide-all-divs',
        {
          bubbles: true,
          detail: { zoom: zoomEventId }
        }
      ));
    }
  });

  // ----------------
  // show all event
  // ----------------
  document.addEventListener('show-all-divs', function (event) {
    channelMainSectionEl.removeAttribute('zoom');
    channelMainSectionEl.setAttribute('opened', '');
    updateVisibility();
  });
  // -----------------------------------------------------------
  // hide all event
  //
  // If event.detail.zoom === zoomEventId, abort without action
  // -----------------------------------------------------------
  document.addEventListener('hide-all-divs', function (event) {
    if ((event.detail) &&
      (event.detail.zoom) &&
      (event.detail.zoom.length > 0)) {
      if (event.detail.zoom !== zoomEventId) {
        // case of event id not match, hide
        channelMainSectionEl.removeAttribute('zoom');
        channelMainSectionEl.removeAttribute('opened');
        updateVisibility();
      } else {
        // case of event id is a match, Turn on channel zoom
        channelMainSectionEl.setAttribute('zoom', '');
        channelMainSectionEl.setAttribute('opened', '');
        updateVisibility();
        // scroll text to most recent messages
        channelTextAreaEl.scrollTop = channelTextAreaEl.scrollHeight;
      }
    } else {
      // property not found hide.
      channelMainSectionEl.removeAttribute('zoom');
      channelMainSectionEl.removeAttribute('opened');
      updateVisibility();
    }
  });

  // -------------------------
  // Beep On Message checkbox handler
  // -------------------------
  channelBeep1CBInputEl.addEventListener('click', function (e) {
    if (channelMainSectionEl.hasAttribute('beep1-enabled')) {
      channelMainSectionEl.removeAttribute('beep1-enabled');
    } else {
      channelMainSectionEl.setAttribute('beep1-enabled', '');
      playBeep1Sound();
    }
    updateVisibility();
  });

  // -------------------------
  // Beep On Join checkbox handler
  // -------------------------
  channelBeep2CBInputEl.addEventListener('click', function (e) {
    if (channelMainSectionEl.hasAttribute('beep2-enabled')) {
      channelMainSectionEl.removeAttribute('beep2-enabled');
    } else {
      channelMainSectionEl.setAttribute('beep2-enabled', '');
      playBeep1Sound();
    }
    updateVisibility();
  });

  // -------------------------
  // Beep On match my nickname checkbox handler
  // -------------------------
  channelBeep3CBInputEl.addEventListener('click', function (e) {
    if (channelMainSectionEl.hasAttribute('beep3-enabled')) {
      channelMainSectionEl.removeAttribute('beep3-enabled');
    } else {
      channelMainSectionEl.setAttribute('beep3-enabled', '');
      playBeep2Sound();
    }
    updateVisibility();
  });

  // -----------------------
  // Cancel all beep sounds
  // -----------------------
  document.addEventListener('cancel-beep-sounds', function (event) {
    channelMainSectionEl.removeAttribute('beep1-enabled');
    channelMainSectionEl.removeAttribute('beep2-enabled');
    channelMainSectionEl.removeAttribute('beep3-enabled');
  });

  // -------------------------
  // Text Format checkbox handler
  // -------------------------
  channelFormatCBInputEl.addEventListener('click', function () {
    if (channelMainSectionEl.hasAttribute('brief-enabled')) {
      channelMainSectionEl.removeAttribute('brief-enabled');
    } else {
      channelMainSectionEl.setAttribute('brief-enabled', '');
    }
    // updateVisibility();

    // this forces a global update which will refreesh text area
    document.dispatchEvent(new CustomEvent('update-from-cache', { bubbles: true }));

    // THis will request a new nickname list from IRC server.
    // channelNamesDisplayEl.value = '';
    // _sendIrcServerMessage('NAMES ' + name);
  });

  //
  // First time on page load
  //
  if (webState.dynamic.bodyClientWidth < mobileBreakpointPx) {
    channelMainSectionEl.setAttribute('brief-enabled', '');
    channelFormatCBInputEl.checked = true;
  } else {
    channelMainSectionEl.removeAttribute('brief-enabled');
    channelFormatCBInputEl.checked = false;
  }

  // -------------------------
  // AutoComplete checkbox handler
  // -------------------------
  channelAutoCompCBInputEl.addEventListener('click', function () {
    if (channelMainSectionEl.hasAttribute('auto-comp-enabled')) {
      channelMainSectionEl.removeAttribute('auto-comp-enabled');
    } else {
      channelMainSectionEl.setAttribute('auto-comp-enabled', '');
    }
    updateVisibility();
  });
  // Is browser capable of auto-complete?
  // Check if beforeInput event is supported in this browser (part of InputEvent)
  if ((window.InputEvent) && (typeof InputEvent.prototype.getTargetRanges === 'function')) {
    channelMainSectionEl.setAttribute('auto-comp-enabled', '');
  } else {
    channelMainSectionEl.setAttribute('auto-comp-enabled', '');
    channelAutoCompCBInputEl.setAttribute('disabled', '');
  }

  // ---------------------------------------
  // textarea before input event handler
  //
  // Auto complete function
  //
  // Keys:  desktop: tab,  mobile phone: space-space
  // Channel name selected by tab-tab or space-space-space
  // ---------------------------------------
  const _autoCompleteInputElement = function (snippet) {
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
    if ((matchedCommand.length > 0) && (channelInputAreaEl.value === snippet)) {
      // #1 check if IRC text command?
      channelInputAreaEl.value =
        channelInputAreaEl.value.slice(0, channelInputAreaEl.value.length - snippet.length);
      channelInputAreaEl.value += matchedCommand;
      channelInputAreaEl.value += String.fromCharCode(trailingSpaceKey);
      last = matchedCommand;
    } else if ((matchedRawCommand.length > 0) &&
      (channelInputAreaEl.value.slice(0, 7).toUpperCase() === '/QUOTE ')) {
      // #2 Line starts with /QUOTE and rest is a valid raw irc command
      channelInputAreaEl.value =
        channelInputAreaEl.value.slice(0, channelInputAreaEl.value.length - snippet.length);
      channelInputAreaEl.value += matchedRawCommand;
      channelInputAreaEl.value += String.fromCharCode(trailingSpaceKey);
      last = matchedRawCommand;
    } else if (name.toLowerCase().indexOf(snippet.toLowerCase()) === 0) {
      // #3 Check if # for channel name
      // This also matches empty snipped, defaulting to channel name
      channelInputAreaEl.value =
        channelInputAreaEl.value.slice(0, channelInputAreaEl.value.length - snippet.length);
      channelInputAreaEl.value += name;
      channelInputAreaEl.value += String.fromCharCode(trailingSpaceKey);
      last = name;
    } else if (ircState.nickName.toLowerCase().indexOf(snippet.toLowerCase()) === 0) {
      // #4 check if my nickname
      channelInputAreaEl.value =
        channelInputAreaEl.value.slice(0, channelInputAreaEl.value.length - snippet.length);
      channelInputAreaEl.value += ircState.nickName;
      channelInputAreaEl.value += String.fromCharCode(trailingSpaceKey);
      last = ircState.nickName;
      // #5 channel name replace space
    } else {
      // #6 check channel nickname list
      let completeNick = '';
      const chanIndex = ircState.channels.indexOf(name.toLowerCase());
      if (chanIndex >= 0) {
        if (ircState.channelStates[chanIndex].names.length > 0) {
          for (let i = 0; i < ircState.channelStates[chanIndex].names.length; i++) {
            let matchNick = ircState.channelStates[chanIndex].names[i];
            // if nick starts with op character, remove first character
            if (nicknamePrefixChars.indexOf(matchNick.charAt(0)) >= 0) {
              matchNick = matchNick.slice(1, matchNick.length);
            }
            if (matchNick.toLowerCase().indexOf(snippet.toLowerCase()) === 0) {
              completeNick = matchNick;
            }
          }
        }
      }
      if (completeNick.length > 0) {
        channelInputAreaEl.value =
          channelInputAreaEl.value.slice(0, channelInputAreaEl.value.length - snippet.length);
        channelInputAreaEl.value += completeNick;
        channelInputAreaEl.value += String.fromCharCode(trailingSpaceKey);
        last = completeNick;
      } else {
        // #7 not match other, abort, add trailing space
        channelInputAreaEl.value += String.fromCharCode(trailingSpaceKey);
      }
    }
    return last;
  };
  let lastAutoCompleteMatch = '';
  const channelAutoComplete = function (e) {
    const autoCompleteTabKey = 9;
    const autoCompleteSpaceKey = 32;
    const trailingSpaceKey = 32;
    if (channelAutoCompCBInputEl.hasAttribute('disabled')) return;
    if (!channelMainSectionEl.hasAttribute('auto-comp-enabled')) return;
    if (!e.keyCode) return;

    if ((e.keyCode) && (e.keyCode === autoCompleteTabKey)) {
      if (channelInputAreaEl.value.length < 2) {
        e.preventDefault();
        return;
      }
      let snippet = '';
      const snippetArray = channelInputAreaEl.value.split(' ');
      if (snippetArray.length > 0) {
        snippet = snippetArray[snippetArray.length - 1];
      }
      if (snippet.length > 0) {
        if ((e.keyCode === autoCompleteTabKey) && (snippet.length > 0)) {
          _autoCompleteInputElement(snippet);
        }
      } else {
        // following space character, default to channel name
        if (channelInputAreaEl.value.toUpperCase() === '/PART ' + name.toUpperCase() + ' ') {
          channelInputAreaEl.value += ircState.progName + ' ' + ircState.progVersion;
        } else if (channelInputAreaEl.value.toUpperCase() === '/QUIT ') {
          channelInputAreaEl.value += ircState.progName + ' ' + ircState.progVersion;
        } else {
          channelInputAreaEl.value += name;
        }
        channelInputAreaEl.value += String.fromCharCode(trailingSpaceKey);
      }
      e.preventDefault();
    } // case of tab key
    //
    // Case of space key to autocomplete on space-space
    if ((e.keyCode) && (e.keyCode === autoCompleteSpaceKey)) {
      if (channelInputAreaEl.value.length > 0) {
        // if previous characters is space (and this key is space too)
        if (channelInputAreaEl.value.charCodeAt(channelInputAreaEl.value.length - 1) ===
        autoCompleteSpaceKey) {
          if ((channelInputAreaEl.value.length > 1) &&
            (channelInputAreaEl.value.charCodeAt(channelInputAreaEl.value.length - 2) ===
            autoCompleteSpaceKey)) {
            //
            // auto complete from:  space-space-space
            //
            // Remove one of the space characters
            channelInputAreaEl.value =
              channelInputAreaEl.value.slice(0, channelInputAreaEl.value.length - 1);
            if (channelInputAreaEl.value.toUpperCase() === '/PART ' + name.toUpperCase() + ' ') {
              channelInputAreaEl.value += ircState.progName + ' ' + ircState.progVersion;
            } else if (channelInputAreaEl.value.toUpperCase() === '/QUIT ') {
              channelInputAreaEl.value += ircState.progName + ' ' + ircState.progVersion;
            } else {
              channelInputAreaEl.value += name;
            }
            channelInputAreaEl.value += String.fromCharCode(trailingSpaceKey);
            e.preventDefault();
          } else {
            //
            // auto complete from:  space-space-space
            //
            // remove trailing space to get snippet from split()
            channelInputAreaEl.value =
              channelInputAreaEl.value.slice(0, channelInputAreaEl.value.length - 1);
            let snippet = '';
            const snippetArray = channelInputAreaEl.value.split(' ');
            if (snippetArray.length > 0) {
              snippet = snippetArray[snippetArray.length - 1];
            }
            if (snippet.length > 0) {
              const matchStr = _autoCompleteInputElement(snippet);
              if (lastAutoCompleteMatch !== matchStr) {
                lastAutoCompleteMatch = matchStr;
                e.preventDefault();
              }
              // channelInputAreaEl.value += String.fromCharCode(autoCompleteSpaceKey);
            } else {
              // else, put it back again, snippet was zero length
              channelInputAreaEl.value += String.fromCharCode(autoCompleteSpaceKey);
            }
          }
        }
      } else {
        // do nothing, allow space to be appended
      }
    } // case of tab key
  };
  // channelInputAreaEl.addEventListener('beforeinput', channelAutoComplete);
  channelInputAreaEl.addEventListener('keydown', channelAutoComplete, false);

  // ----------------
  // Nickname list
  // ----------------
  function _updateNickList () {
    const index = ircState.channels.indexOf(name.toLowerCase());
    if (index >= 0) {
      maxNickLength = 0;
      if (ircState.channelStates[index].names.length > 0) {
        channelNamesDisplayEl.value = '';
        const opList = [];
        const otherList = [];
        for (let i = 0; i < ircState.channelStates[index].names.length; i++) {
          if (ircState.channelStates[index].names[i].charAt(0) === '@') {
            opList.push(ircState.channelStates[index].names[i]);
          } else {
            otherList.push(ircState.channelStates[index].names[i]);
          }
        }
        const sortedOpList = opList.sort();
        const sortedOtherList = otherList.sort();
        if (sortedOpList.length > 0) {
          for (let i = 0; i < sortedOpList.length; i++) {
            channelNamesDisplayEl.value += sortedOpList[i] + '\n';
            if (maxNickLength < sortedOpList[i].length) {
              maxNickLength = sortedOpList[i].length;
            }
          }
        }
        if (sortedOtherList.length > 0) {
          for (let i = 0; i < sortedOtherList.length; i++) {
            channelNamesDisplayEl.value += sortedOtherList[i] + '\n';
            if (maxNickLength < sortedOtherList[i].length) {
              maxNickLength = sortedOtherList[i].length;
            }
          }
        }
      }
    }
  } // _updateNickList()
  // populate it initially on creating the element
  _updateNickList();

  //
  // Append user count to the end of the channel name string in title area
  //
  function _updateChannelTitle () {
    let titleStr = name + ' (';
    const index = ircState.channels.indexOf(name.toLowerCase());
    if (index >= 0) {
      if (ircState.channelStates[index].joined) {
        titleStr += parseInt(ircState.channelStates[index].names.length).toString();
      } else {
        if (ircState.channelStates[index].kicked) {
          titleStr += 'Kicked';
        } else {
          titleStr += '0';
        }
      }
    }
    channelNameDivEl.textContent = titleStr + ')';
  }
  // do one upon channel creation
  _updateChannelTitle();

  function _isNickInChannel (nickString, channelString) {
    if ((!nickString) || (nickString.length === 0)) return false;
    if (ircState.channels.length === 0) return false;
    let channelIndex = -1;
    for (let i = 0; i < ircState.channels.length; i++) {
      if (channelString.toLowerCase() === ircState.channels[i].toLowerCase()) channelIndex = i;
    }
    if (channelIndex < 0) return false;
    if (ircState.channelStates[channelIndex].names.length === 0) return false;
    // if check nickname starts with an op character, remove it
    let pureNick = nickString.toLowerCase();
    if (nicknamePrefixChars.indexOf(pureNick.charAt(0)) >= 0) {
      pureNick = pureNick.slice(1, pureNick.length);
    }
    let present = false;
    for (let i = 0; i < ircState.channelStates[channelIndex].names.length; i++) {
      let checkNick = ircState.channelStates[channelIndex].names[i].toLowerCase();
      // if channel nickname start with an OP character remove it
      if (nicknamePrefixChars.indexOf(checkNick.charAt(0)) >= 0) {
        checkNick = checkNick.slice(1, checkNick.length);
      }
      if (checkNick === pureNick) present = true;
    }
    return present;
  } // _nickInChannel()

  document.addEventListener('irc-state-changed', function (event) {
    // console.log('Event: irc-state-changed (createChannelEl)');

    //
    // If channel was previously joined, then parted, then re-joined
    // Check for joined change to true and show channel if hidden
    //
    const ircStateIndex = ircState.channels.indexOf(name.toLowerCase());
    const webStateIndex = webState.channels.indexOf(name.toLowerCase());
    if ((ircStateIndex >= 0) && (webStateIndex >= 0)) {
      if (ircState.channelStates[ircStateIndex].joined !==
        webState.channelStates[webStateIndex].lastJoined) {
        if ((ircState.channelStates[ircStateIndex].joined) &&
          (!webState.channelStates[webStateIndex].lastJoined)) {
          channelBottomDivEl.removeAttribute('hidden');
          channelHideButtonEl.textContent = '-';
          // channelTopRightHidableDivEl.removeAttribute('hidden');
        }
        webState.channelStates[webStateIndex].lastJoined =
          ircState.channelStates[ircStateIndex].joined;
      }
    }
    // state object includes up to date list of nicks in a channel
    _updateNickList();
    // Update title string to include some data
    _updateChannelTitle();
    // show/hide disable or enable channel elements depend on state
    updateVisibility();
  });

  document.addEventListener('channel-message', function (event) {
    function _addText (timestamp, nick, text) {
      //
      let out = '';
      if (channelMainSectionEl.hasAttribute('brief-enabled')) {
        out = timestamp + ' ';
        if (nick === '*') {
          out += nick + nickChannelSpacer;
        } else {
          out += nick + nickChannelSpacer + '\n';
        }
        out += cleanFormatting(text) + '\n\n';
      } else {
        out = timestamp + ' ' +
        nick.padStart(maxNickLength, ' ') + nickChannelSpacer +
        cleanFormatting(text) + '\n';
      }
      // append text to textarea
      channelTextAreaEl.value += out;
      // move scroll bar so text is scrolled all the way up
      // Performing this during cache reload will generate browser violation for forced reflow.
      if (!webState.cacheReloadInProgress) {
        channelTextAreaEl.scrollTop = channelTextAreaEl.scrollHeight;
      }
    }

    const parsedMessage = event.detail.parsedMessage;
    // console.log('Event channel-message: ' + JSON.stringify(parsedMessage, null, 2));

    switch (parsedMessage.command) {
      //
      // TODO cases for channel closed or other error
      //
      case 'KICK':
        if (parsedMessage.params[0].toLowerCase() === name.toLowerCase()) {
          let reason = ' ';
          if (parsedMessage.params[2]) reason = parsedMessage.params[2];
          if (channelMainSectionEl.hasAttribute('brief-enabled')) {
            _addText(parsedMessage.timestamp,
              '*',
              parsedMessage.nick + ' has kicked ' + parsedMessage.params[1]);
          } else {
            _addText(parsedMessage.timestamp,
              '*',
              parsedMessage.nick + ' has kicked ' + parsedMessage.params[1] +
              ' (' + reason + ')');
          }
        }
        break;
      case 'JOIN':
        if (parsedMessage.params[0].toLowerCase() === name.toLowerCase()) {
          if (channelMainSectionEl.hasAttribute('brief-enabled')) {
            _addText(parsedMessage.timestamp,
              '*',
              parsedMessage.nick + ' has joined');
          } else {
            _addText(parsedMessage.timestamp,
              '*',
              parsedMessage.nick + ' (' + parsedMessage.host + ') has joined');
          }
          if (channelMainSectionEl.hasAttribute('beep2-enabled') &&
            (!webState.cacheReloadInProgress)) {
            playBeep1Sound();
          }
          // Upon channel make, make section visible.
          channelBottomDivEl.removeAttribute('hidden');
          channelHideButtonEl.textContent = '-';
        }
        break;
      case 'MODE':
        if (parsedMessage.params[0].toLowerCase() === name.toLowerCase()) {
          // this could be more elegant than stringify.
          if (parsedMessage.nick) {
            // case of mode by user
            _addText(parsedMessage.timestamp,
              '*',
              'Mode ' + JSON.stringify(parsedMessage.params) + ' by ' + parsedMessage.nick);
          } else {
            // case of mode by netsplit
            _addText(parsedMessage.timestamp,
              '*',
              'Mode ' + JSON.stringify(parsedMessage.params) + ' by ' + parsedMessage.prefix);
          }
        }
        break;
      case 'NICK':
        {
          // ------------
          // Is previous nick or new nick in ANY active channel?
          // -----------
          let present = false;
          // previous nick
          if (_isNickInChannel(parsedMessage.nick, name)) present = true;
          // new nick
          if (_isNickInChannel(parsedMessage.params[0], name)) present = true;
          if (present) {
            _addText(parsedMessage.timestamp,
              '*',
              parsedMessage.nick + ' is now known as ' + parsedMessage.params[0]);
          }
        }
        break;
      case 'NOTICE':
        if (parsedMessage.params[0].toLowerCase() === name.toLowerCase()) {
          _addText(parsedMessage.timestamp,
            '*',
            'Notice(' +
            parsedMessage.nick + ' to ' + parsedMessage.params[0] + ') ' + parsedMessage.params[1]);

          // Upon channel notice, make sectino visible.
          channelBottomDivEl.removeAttribute('hidden');
          channelHideButtonEl.textContent = '-';

          // Message activity Icon
          // If focus not <textarea> elment,
          // and focus not message send button
          // and NOT reload from cache in progress (timer not zero)
          // then display incoming message activity icon
          if ((document.activeElement !== channelInputAreaEl) &&
          (document.activeElement !== channelSendButtonEl) &&
          (!webState.cacheReloadInProgress) &&
          (activityIconInhibitTimer === 0)) {
            setChanActivityIcon(channelIndex);
          }
        }
        break;

      case 'PART':
        if (parsedMessage.params[0].toLowerCase() === name.toLowerCase()) {
          let reason = ' ';
          if (parsedMessage.params[1]) reason = parsedMessage.params[1];
          if (channelMainSectionEl.hasAttribute('brief-enabled')) {
            _addText(parsedMessage.timestamp,
              '*',
              parsedMessage.nick + ' has left');
          } else {
            _addText(parsedMessage.timestamp,
              '*',
              parsedMessage.nick + ' (' + parsedMessage.host + ') has left ' +
              '(' + reason + ')');
          }
        }
        break;
      case 'PRIVMSG':
        if (parsedMessage.params[0].toLowerCase() === name.toLowerCase()) {
          _addText(parsedMessage.timestamp,
            parsedMessage.nick,
            parsedMessage.params[1]);
          if (channelMainSectionEl.hasAttribute('beep1-enabled') &&
            (!webState.cacheReloadInProgress)) {
            playBeep1Sound();
          }
          if (channelMainSectionEl.hasAttribute('beep3-enabled')) {
            const checkLine = parsedMessage.params[1].toLowerCase();
            if ((checkLine.indexOf(ircState.nickName.toLowerCase()) >= 0) &&
              (!webState.cacheReloadInProgress)) {
              setTimeout(playBeep2Sound, 250);
            }
          }
          // Upon channel message, make sectino visible.
          channelBottomDivEl.removeAttribute('hidden');
          channelHideButtonEl.textContent = '-';

          // Message activity Icon
          // If focus not <textarea> elment,
          // and focus not message send button
          // and NOT reload from cache in progress (timer not zero)
          // then display incoming message activity icon
          if ((document.activeElement !== channelInputAreaEl) &&
          (document.activeElement !== channelSendButtonEl) &&
          (!webState.cacheReloadInProgress) &&
          (activityIconInhibitTimer === 0)) {
            setChanActivityIcon(channelIndex);
          }
        }
        break;
      case 'QUIT':
        // Normally QUIT messages are displayed in the channel window
        // In the case of loading messages from cache, the list of
        // channel membership names may not contain the nickname that quit.
        // So, as a special case, QUIT message on refresh or load from cache
        // will be displayed in the server window when the channel is unknown.
        // There are 3 places in the code, search: 'QUIT':
        //
        if (_isNickInChannel(parsedMessage.nick, name)) {
          let reason = ' ';
          if (parsedMessage.params[0]) reason = parsedMessage.params[0];
          if (channelMainSectionEl.hasAttribute('brief-enabled')) {
            _addText(parsedMessage.timestamp,
              '*',
              parsedMessage.nick + ' has quit');
          } else {
            _addText(parsedMessage.timestamp,
              '*',
              parsedMessage.nick + ' (' + parsedMessage.host + ') has quit ' +
              '(' + reason + ')');
          }
        }
        break;
      case 'TOPIC':
        if (parsedMessage.params[0].toLowerCase() === name.toLowerCase()) {
          _addText(parsedMessage.timestamp,
            '*',
            'Topic for ' + parsedMessage.params[0] + ' changed to "' +
            parsedMessage.params[1] + '" by ' + parsedMessage.nick);
        }
        break;
      default:
    }
  });

  document.addEventListener('erase-before-reload', function (event) {
    // console.log('Event erase-before-reload');
    channelTextAreaEl.value = '';
    channelInputAreaEl.value = '';
  });

  //
  // Add cache reload message to channel window
  //
  // Example:  14:33:02 -----Cache Reload-----
  //
  document.addEventListener('cache-reload-done', function (event) {
    let markerString = '';
    let timestampString = '';
    if (('detail' in event) && ('timestamp' in event.detail)) {
      timestampString = unixTimestampToHMS(event.detail.timestamp);
    }
    if (timestampString) {
      markerString += timestampString;
    }
    markerString += ' ' + cacheReloadString + '\n';
    if (channelMainSectionEl.hasAttribute('brief-enabled')) {
      markerString += '\n';
    }
    channelTextAreaEl.value += markerString;
    // move scroll bar so text is scrolled all the way up
    channelTextAreaEl.scrollTop = channelTextAreaEl.scrollHeight;
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
    channelTextAreaEl.value = errorString;
  });

  // -----------------------------------------------------------
  // Setup textarea elements as dynamically resizable
  // -----------------------------------------------------------
  //
  // Scale values for <textarea> are calculated in webclient10.js
  // and saved globally in the webState object
  //
  const adjustChannelInputToWidowWidth = function () {
    // pixel width mar1 is reserved space on edges of input area at full screen width
    const mar1 = webState.dynamic.commonMargin;
    // pixel width mar2 is reserved space on edges of input area with send button added
    const mar2 = webState.dynamic.commonMargin + 5 + webState.dynamic.sendButtonWidthPx;
    // pixed width mar3 is reserved space on edges of input area with channel nickname list on sides

    // get size of nickname list element
    const nicknameListPixelWidth = webState.dynamic.inputAreaSideWidthPx +
      (channelNamesCharWidth * webState.dynamic.inputAreaCharWidthPx);

    // nickname list + right margin.
    const mar3 = webState.dynamic.commonMargin + nicknameListPixelWidth + 6;

    if (webState.dynamic.bodyClientWidth > mobileBreakpointPx) {
      // channelNamesDisplayEl.setAttribute('cols', channelNamesCharWidth.toString());

      channelTextAreaEl.setAttribute('cols', calcInputAreaColSize(mar3));
      channelNamesDisplayEl.removeAttribute('hidden');
    } else {
      // option to set name list to full with when above text window
      // channelNamesDisplayEl.setAttribute('cols', calcInputAreaColSize(mar1));

      channelTextAreaEl.setAttribute('cols', calcInputAreaColSize(mar1));
      if (channelMainSectionEl.hasAttribute('zoom')) {
        channelNamesDisplayEl.setAttribute('hidden', '');
      } else {
        channelNamesDisplayEl.removeAttribute('hidden');
      }
    }
    channelInputAreaEl.setAttribute('cols', calcInputAreaColSize(mar2));
  }; // adjustChannelInputToWidowWidth()
  //
  // Event listener for resize window (fired as global event)
  //
  window.addEventListener('resize-custom-elements', function (event) {
    if (webState.dynamic.inputAreaCharWidthPx) {
      adjustChannelInputToWidowWidth();
    }
  });

  // Upon creating new channel window, open it unzoomed
  channelMainSectionEl.setAttribute('opened', '');
  channelMainSectionEl.removeAttribute('zoom');
  updateVisibility();

  //
  // Resize on creating channel window
  //
  adjustChannelInputToWidowWidth();
  //
  // This is a hack. If adding the channel window
  // causes the vertical scroll to appear,
  // Then the dynamic element side of textarea
  // element will not account for vertical slider width
  // Fix...wait 0.1 sec for scroll bar to appear and
  // dynamically size again.
  //
  setTimeout(adjustChannelInputToWidowWidth, 100);
};

// ----------------------------------------------------------------------
// A change in state occurred, check if new channel need to be created.
// ----------------------------------------------------------------------
// init to zero to force first update
let lastJoinedChannelCount = -1;
let lastIrcServerIndex = -1;
document.addEventListener('irc-state-changed', function (event) {
  // console.log('checking for channel updates');

  // Check list of server's channels and create new if missing.
  if (ircState.channels.length > 0) {
    for (let i = 0; i < ircState.channels.length; i++) {
      const name = ircState.channels[i];
      if (webState.channels.indexOf(name.toLowerCase()) === -1) {
        // console.log('Creating new channel ' + name);
        createChannelEl(name);
      }
    };
  }

  // Check if a new channel was added, or old one /PARTed
  // if so re-create channel join buttions from the favorite channel list
  //
  let needButtonUpdate = false;
  let joinedChannelCount = 0;
  if (ircState.channels.length > 0) {
    for (let i = 0; i < ircState.channels.length; i++) {
      if (ircState.channelStates[i].joined) joinedChannelCount++;
    }
  }
  if (joinedChannelCount !== lastJoinedChannelCount) {
    needButtonUpdate = true;
    lastJoinedChannelCount = joinedChannelCount;
  }
  if (ircState.ircServerIndex !== lastIrcServerIndex) {
    needButtonUpdate = true;
    lastIrcServerIndex = ircState.ircServerIndex;
  }

  if (needButtonUpdate) {
    // console.log('Updating favorite channel buttons');
    // remove old button elements
    const channelJoinButtonContainerEl = document.getElementById('channelJoinButtonContainer');
    while (channelJoinButtonContainerEl.firstChild) {
      channelJoinButtonContainerEl.removeChild(channelJoinButtonContainerEl.firstChild);
    }
    if (ircState.channelList.length > 0) {
      for (let i = 0; i < ircState.channelList.length; i++) {
        const channelIndex = ircState.channels.indexOf(ircState.channelList[i].toLowerCase());
        if ((channelIndex < 0) || (!ircState.channelStates[channelIndex].joined)) {
          // console.log('adding ' + ircState.channelList[i]);
          const joinButtonEl = document.createElement('button');
          joinButtonEl.textContent = ircState.channelList[i];
          joinButtonEl.classList.add('channel-button');
          channelJoinButtonContainerEl.appendChild(joinButtonEl);
          joinButtonEl.addEventListener('click', function () {
            _sendIrcServerMessage('JOIN ' + ircState.channelList[i]);
            hideRawMessageWindow();
          });
        }
      } // next i
    }
  } // needButtonUpdate
}); // addEventListener('irc-state-changed

// -------------------------------------
// IRC Channel (Open/Close) Buttons
// -------------------------------------
document.getElementById('ircChannelsMainHiddenButton').addEventListener('click', function () {
  if (document.getElementById('ircChannelsMainHiddenDiv').hasAttribute('hidden')) {
    document.getElementById('ircChannelsMainHiddenDiv').removeAttribute('hidden');
    document.getElementById('ircChannelsMainHiddenButton').textContent = '-';
  } else {
    document.getElementById('ircChannelsMainHiddenDiv').setAttribute('hidden', '');
    document.getElementById('ircChannelsMainHiddenButton').textContent = '+';
  }
});

// ---------------------------------------
// Join New Channel (Button and Enter)
// ---------------------------------------
function _newChannel () {
  const newChannel = document.getElementById('newChannelNameInputId').value;
  document.getElementById('newChannelNameInputId').value = '';
  if ((newChannel.length > 1) &&
    (channelPrefixChars.indexOf(newChannel.charAt(0)) >= 0)) {
    const message = 'JOIN ' + newChannel;
    _sendIrcServerMessage(message);
    hideRawMessageWindow();
  } else {
    showError('Invalid Channel Name');
  }
}
document.getElementById('newChannelNameInputId').addEventListener('input', function (event) {
  if (((event.inputType === 'insertText') && (event.data === null)) ||
    (event.inputType === 'insertLineBreak')) {
    _newChannel();
  }
});
document.getElementById('newChannelButton').addEventListener('click', function () {
  _newChannel();
});
