// ---------------------------------------
// webclient6.js - IRC Channel Functions
// ---------------------------------------
'use strict';
// ------------------------------------------
// Send text to channel (internal function)
//     (internal function)
// ------------------------------------------
function _sendTextToChannel(channelIndex, textAreaEl) {
  if ((textAreaEl.value.length > 0)) {
    let text = textAreaEl.value;
    text = text.replace('\r', '').replace('\n', '');

    // Check slash character to see if it is an IRC command
    if (text.charAt(0) === '/') {
      // yes, it is command
      let commandAction = textCommandParser(
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
    let message = 'PRIVMSG ' +
      ircState.channelStates[channelIndex].name +
      ' :' + text;
    _sendIrcServerMessage(message);
    textAreaEl.value = '';
  }
};

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
  let initIrcStateIndex = ircState.channels.indexOf(name.toLowerCase());
  webState.channelStates.push({
    lastJoined: ircState.channelStates[initIrcStateIndex].joined
  });

  var maxNickLength = 0;
  // console.log('creating Channel Element ' + name);

  let channelIndex = ircState.channels.indexOf(name.toLowerCase());
  // console.log('channel state obj ' +
  //   JSON.stringify(ircState.channelStates[channelIndex], null, 2));

  // This is static HTML element created in webclient.html (Insert point)
  let channelContainerDivEl = document.getElementById('channelContainerDiv');

  // section-div (main element for each channel)
  let channelMainSectionEl = document.createElement('div');
  channelMainSectionEl.classList.add('channel-main-section-div');
  channelMainSectionEl.classList.add('aa-section-div');

  // Top Element (non-hidden element)
  let channelTopDivEl = document.createElement('div');
  channelTopDivEl.classList.add('channel-top-div');
  channelTopDivEl.classList.add('head-flex');

  // left flexbox div
  let channelTopLeftDivEl = document.createElement('div');
  channelTopLeftDivEl.classList.add('head-left');

  // center if needed here

  // right flexbox div
  let channelTopRightDivEl = document.createElement('div');
  channelTopRightDivEl.classList.add('head-right');

  // right hidable div
  let channelTopRightHidableDivEl = document.createElement('div');
  channelTopRightHidableDivEl.classList.add('head-right-hidable-div');

  // show/hide button
  let channelHideButtonEl = document.createElement('button');
  channelHideButtonEl.textContent = '-';
  channelHideButtonEl.classList.add('channel-button');

  // Top Channel name
  let channelNameDivEl = document.createElement('div');
  channelNameDivEl.textContent = ircState.channelStates[channelIndex].name;
  channelNameDivEl.classList.add('chan-name-div');

  // Taller button
  let channelTallerButtonEl = document.createElement('button');
  channelTallerButtonEl.textContent = 'Taller';
  channelTallerButtonEl.classList.add('channel-button');

  // Normal button
  let channelNormalButtonEl = document.createElement('button');
  channelNormalButtonEl.textContent = 'Normal';
  channelNormalButtonEl.classList.add('channel-button');

  // Clear button
  let channelClearButtonEl = document.createElement('button');
  channelClearButtonEl.textContent = 'Clear';
  channelClearButtonEl.classList.add('channel-button');

  // Bottom Element (optionally hidden)
  let channelBottomDivEl = document.createElement('div');
  channelBottomDivEl.classList.add('channel-bottom-div');

  //Channel topic
  let channelTopicDivEl = document.createElement('div');
  channelTopicDivEl.textContent = cleanFormatting(ircState.channelStates[channelIndex].topic);
  channelTopicDivEl.classList.add('chan-topic-div');

  // list of nick names display
  let channelNamesDisplayEl = document.createElement('textarea');
  channelNamesDisplayEl.classList.add('channel-names-display');
  channelNamesDisplayEl.setAttribute('cols', '20');
  channelNamesDisplayEl.setAttribute('rows', defaultHeightInRows);
  channelNamesDisplayEl.setAttribute('spellCheck', 'false');
  channelNamesDisplayEl.setAttribute('readonly', '');

  // resizable text area
  let channelTextAreaEl = document.createElement('textarea');
  let channelTextAreaId = 'chan' + channelIndex.toString() + 'TextAreaId';
  channelTextAreaEl.id = channelTextAreaId;
  channelTextAreaEl.setAttribute('cols', '30');
  channelTextAreaEl.setAttribute('rows', defaultHeightInRows);
  channelTextAreaEl.setAttribute('spellCheck', 'false');
  channelTextAreaEl.setAttribute('readonly', '');

  // div holding input area and send button
  let channelBottomDiv1El = document.createElement('div');
  channelBottomDiv1El.classList.add('button-div');

  // single line user input
  let channelInputAreaEl = document.createElement('textarea');
  let channelInputAreaId = 'chan' + channelIndex.toString() + 'InputInputId';
  channelInputAreaEl.id = channelInputAreaId;
  channelInputAreaEl.setAttribute('cols', '120');
  channelInputAreaEl.setAttribute('rows', '1');
  channelInputAreaEl.classList.add('va-middle');
  channelInputAreaEl.classList.add('rm10');

  // send button
  let channelSendButtonEl = document.createElement('button');
  channelSendButtonEl.textContent = 'Send';
  channelSendButtonEl.classList.add('va-middle');

  // button-div
  let channelBottomDiv2El = document.createElement('div');
  channelBottomDiv2El.classList.add('button-div');

  // join button
  let channelJoinButtonEl = document.createElement('button');
  channelJoinButtonEl.textContent = 'Join';
  channelJoinButtonEl.classList.add('channel-button');

  // part button
  let channelPartButtonEl = document.createElement('button');
  channelPartButtonEl.textContent = 'Part';
  channelPartButtonEl.classList.add('channel-button');

  // refresh button
  let channelRefreshButtonEl = document.createElement('button');
  channelRefreshButtonEl.textContent = 'Refresh';
  channelRefreshButtonEl.classList.add('channel-button');

  // button-div
  let channelBottomDiv3El = document.createElement('div');
  channelBottomDiv3El.classList.add('button-div');

  // Text Format checkbox
  let channelFormatCBInputEl = document.createElement('input');
  channelFormatCBInputEl.classList.add('channel-cb-cb');
  channelFormatCBInputEl.setAttribute('type', 'checkbox');
  let channelFormatCBTitleEl = document.createElement('span');
  channelFormatCBTitleEl.classList.add('channel-cb-span');
  channelFormatCBTitleEl.textContent = 'Brief';

  // Auto-complete checkbox
  let channelAutoCompCBInputEl = document.createElement('input');
  channelAutoCompCBInputEl.classList.add('channel-cb-cb');
  channelAutoCompCBInputEl.setAttribute('type', 'checkbox');
  let channelAutoCompCBTitleEl = document.createElement('span');
  channelAutoCompCBTitleEl.classList.add('channel-cb-span');
  channelAutoCompCBTitleEl.textContent = 'Auto-complete (space-space)';

  // button-div
  let channelBottomDiv4El = document.createElement('div');
  channelBottomDiv4El.classList.add('button-div');

  // beep on message checkbox
  let channelBeep1CBInputEl = document.createElement('input');
  channelBeep1CBInputEl.classList.add('channel-cb-cb');
  channelBeep1CBInputEl.setAttribute('type', 'checkbox');
  let channelBeep1CBTitleEl = document.createElement('span');
  channelBeep1CBTitleEl.classList.add('channel-cb-span');
  channelBeep1CBTitleEl.textContent = 'Line-beep';

  // beep on join checkbox
  let channelBeep2CBInputEl = document.createElement('input');
  channelBeep2CBInputEl.classList.add('channel-cb-cb');
  channelBeep2CBInputEl.setAttribute('type', 'checkbox');
  let channelBeep2CBTitleEl = document.createElement('span');
  channelBeep2CBTitleEl.classList.add('channel-cb-span');
  channelBeep2CBTitleEl.textContent = 'Join-beep';

  // beep on matchNick my nickname checkbox
  let channelBeep3CBInputEl = document.createElement('input');
  channelBeep3CBInputEl.classList.add('channel-cb-cb');
  channelBeep3CBInputEl.setAttribute('type', 'checkbox');
  let channelBeep3CBTitleEl = document.createElement('span');
  channelBeep3CBTitleEl.classList.add('channel-cb-span');
  channelBeep3CBTitleEl.textContent = 'Name-beep';


  // --------------------------------
  // Append child element to DOM
  // --------------------------------

  channelTopLeftDivEl.appendChild(channelHideButtonEl);
  channelTopLeftDivEl.appendChild(channelNameDivEl);

  channelTopRightHidableDivEl.appendChild(channelTallerButtonEl);
  channelTopRightHidableDivEl.appendChild(channelNormalButtonEl);
  channelTopRightHidableDivEl.appendChild(channelClearButtonEl);

  channelTopRightDivEl.appendChild(channelTopRightHidableDivEl);

  channelTopDivEl.appendChild(channelTopLeftDivEl);
  channelTopDivEl.appendChild(channelTopRightDivEl);

  channelBottomDiv1El.appendChild(channelInputAreaEl);
  channelBottomDiv1El.appendChild(channelSendButtonEl);

  channelBottomDiv2El.appendChild(channelJoinButtonEl);
  channelBottomDiv2El.appendChild(channelPartButtonEl);
  channelBottomDiv2El.appendChild(channelRefreshButtonEl);

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
  channelMainSectionEl.appendChild(channelBottomDivEl);

  channelContainerDivEl.appendChild(channelMainSectionEl);

  // --------------------------
  // Channel Event listeners
  // ---------------------------

  // -------------------------
  // Show/Hide button handler
  // -------------------------
  channelHideButtonEl.addEventListener('click', function() {
    if (channelBottomDivEl.hasAttribute('hidden')) {
      channelBottomDivEl.removeAttribute('hidden');
      channelHideButtonEl.textContent = '-';
      channelTopRightHidableDivEl.removeAttribute('hidden');
    } else {
      channelBottomDivEl.setAttribute('hidden', '');
      channelHideButtonEl.textContent = '+';
      channelTopRightHidableDivEl.setAttribute('hidden', '');
    }
  });

  // -------------------------
  // Taller button handler
  // -------------------------
  channelTallerButtonEl.addEventListener('click', function() {
    let newRows = parseInt(channelTextAreaEl.getAttribute('rows')) + 5;
    channelTextAreaEl.setAttribute('rows', newRows.toString());
    channelNamesDisplayEl.setAttribute('rows', newRows.toString());
  });

  // -------------------------
  // Normal button handler
  // -------------------------
  channelNormalButtonEl.addEventListener('click', function() {
    channelTextAreaEl.setAttribute('rows', defaultHeightInRows);
    channelNamesDisplayEl.setAttribute('rows', defaultHeightInRows);
  });

  // -------------------------
  // Clear button handler
  // -------------------------
  channelClearButtonEl.addEventListener('click', function() {
    channelTextAreaEl.textContent = '';
    channelTextAreaEl.setAttribute('rows', defaultHeightInRows);
    channelNamesDisplayEl.setAttribute('rows', defaultHeightInRows);
  });

  // ----------------
  // show all event
  // ----------------
  document.addEventListener('show-all-divs', function(event) {
    channelBottomDivEl.removeAttribute('hidden');
    channelHideButtonEl.textContent = '-';
    channelTopRightHidableDivEl.removeAttribute('hidden');
  });
  // ----------------
  // hide all event
  // ----------------
  document.addEventListener('hide-all-divs', function(event) {
    channelBottomDivEl.setAttribute('hidden', '');
    channelHideButtonEl.textContent = '+';
    channelTopRightHidableDivEl.setAttribute('hidden', '');
  });

  // -------------------------
  // Join button handler
  // -------------------------
  channelJoinButtonEl.addEventListener('click', function() {
    let message = 'JOIN ' + name;
    _sendIrcServerMessage(message);
  });

  // -------------------------
  // Part button handler
  // -------------------------
  channelPartButtonEl.addEventListener('click', function() {
    let message = 'PART ' + name;
    _sendIrcServerMessage(message);
  });

  // -------------------------
  // Refresh button handler
  // -------------------------
  channelRefreshButtonEl.addEventListener('click', function() {
    // this forces a global update which will refreesh text area
    document.dispatchEvent(new CustomEvent('update-from-cache', {bubbles: true}));
    // THis will request a new nickname list from IRC server.
    channelNamesDisplayEl.textContent = '';
    _sendIrcServerMessage('NAMES ' + name);
  });

  // -------------
  // send button
  // -------------
  channelSendButtonEl.addEventListener('click', function() {
    _sendTextToChannel(channelIndex, channelInputAreaEl);
  }.bind(this));

  // ---------------
  // Enter pressed
  // ---------------
  channelInputAreaEl.addEventListener('input', function(event) {
    if (((event.inputType === 'insertText') && (event.data === null)) ||
      (event.inputType === 'insertLineBreak')) {
      _sendTextToChannel(channelIndex, channelInputAreaEl);
    }
  }.bind(this));

  function updateVisibility() {
    // console.log('Event: irc-state-changed (createChannelEl)');
    let index = ircState.channels.indexOf(name.toLowerCase());
    if (index >= 0) {
      if (ircState.channelStates[index].joined) {
        channelTopicDivEl.textContent = cleanFormatting(ircState.channelStates[index].topic);
        channelNamesDisplayEl.removeAttribute('disabled');
        channelTextAreaEl.removeAttribute('disabled');
        channelInputAreaEl.removeAttribute('disabled');
        channelSendButtonEl.removeAttribute('disabled');
        channelJoinButtonEl.setAttribute('disabled', '');
        channelPartButtonEl.removeAttribute('disabled');
      } else {
        channelNamesDisplayEl.setAttribute('disabled', '');
        channelTextAreaEl.setAttribute('disabled', '');
        channelInputAreaEl.setAttribute('disabled', '');
        channelSendButtonEl.setAttribute('disabled', '');
        channelJoinButtonEl.removeAttribute('disabled');
        channelPartButtonEl.setAttribute('disabled', '');
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
    }
  }

  // -------------------------
  // Beep On Message checkbox handler
  // -------------------------
  channelBeep1CBInputEl.addEventListener('click', function(e) {
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
  channelBeep2CBInputEl.addEventListener('click', function(e) {
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
  channelBeep3CBInputEl.addEventListener('click', function(e) {
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
  document.addEventListener('cancel-beep-sounds', function(event) {
    channelMainSectionEl.removeAttribute('beep1-enabled');
    channelMainSectionEl.removeAttribute('beep2-enabled');
    channelMainSectionEl.removeAttribute('beep3-enabled');
  }.bind(this));

  // -------------------------
  // Text Format checkbox handler
  // -------------------------
  channelFormatCBInputEl.addEventListener('click', function() {
    if (channelMainSectionEl.hasAttribute('brief-enabled')) {
      channelMainSectionEl.removeAttribute('brief-enabled');
    } else {
      channelMainSectionEl.setAttribute('brief-enabled', '');
    }
    // updateVisibility();

    // this forces a global update which will refreesh text area
    document.dispatchEvent(new CustomEvent('update-from-cache', {bubbles: true}));

    // THis will request a new nickname list from IRC server.
    // channelNamesDisplayEl.textContent = '';
    // _sendIrcServerMessage('NAMES ' + name);
  });

  // First time on page load
  if (window.innerWidth < 600) {
    channelMainSectionEl.setAttribute('brief-enabled', '');
    channelFormatCBInputEl.checked = true;
  } else {
    channelMainSectionEl.removeAttribute('brief-enabled');
    channelFormatCBInputEl.checked = false;
  }
  // show the brief/full setting in checkbox
  updateVisibility();

  // -------------------------
  // AutoCoplete checkbox handler
  // -------------------------
  channelAutoCompCBInputEl.addEventListener('click', function() {
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
    updateVisibility();
  } else {
    channelMainSectionEl.setAttribute('auto-comp-enabled', '');
    updateVisibility();
    channelAutoCompCBInputEl.setAttribute('disabled', '');
  }

  // ---------------------------------------
  // textarea beforeinput event handler
  //
  // Auto complete function
  // ---------------------------------------
  const channelAutoComplete = function(e) {
    if (channelAutoCompCBInputEl.hasAttribute('disabled')) return;
    if (!channelMainSectionEl.hasAttribute('auto-comp-enabled')) return;
    if (!e.data) return;
    if(channelInputAreaEl.value.length < 2) return;

    // Tab character not possible due to higher navigation binding
    // Auto-complete on space
    let autoCompleteKey = 32;
    // console.log('key code ' + e.data.charCodeAt(0));
    if (((e.data) && (e.data.charCodeAt(0) === autoCompleteKey)) &&
      // and if previous character is also the auto-complete autoCompleteKey
      (channelInputAreaEl.value.charCodeAt(channelInputAreaEl.value.length -1) ===
        autoCompleteKey)) {
      // strip previous occurrence of autoCompleteKey
      channelInputAreaEl.value =
        channelInputAreaEl.value.slice(0, channelInputAreaEl.value.length - 1);
      // check one more character, if a third auto-compelte code, abort
      if (channelInputAreaEl.value.charCodeAt(channelInputAreaEl.value.length - 1) ===
        autoCompleteKey) {
        // abort auto-complete
        channelInputAreaEl.value += String.fromCharCode(autoCompleteKey) +
          String.fromCharCode(autoCompleteKey);
        e.preventDefault();
        return;
      }
      // parse last space character delimitered string
      let snippet = '';
      let snippetArray = channelInputAreaEl.value.split(' ');
      if (snippetArray.length > 0) {
        snippet = snippetArray[snippetArray.length - 1];
      }
      // console.log('snippet ' + snippet);
      if (name.toLowerCase().indexOf(snippet.toLowerCase()) === 0) {
        // #1 Check if # for channel name
        channelInputAreaEl.value =
          channelInputAreaEl.value.slice(0, channelInputAreaEl.value.length - snippet.length);
        channelInputAreaEl.value += name;
        channelInputAreaEl.value += String.fromCharCode(autoCompleteKey);
      } else if (ircState.nickName.toLowerCase().indexOf(snippet.toLowerCase()) === 0) {
        // #2 check if my nickname
        channelInputAreaEl.value =
          channelInputAreaEl.value.slice(0, channelInputAreaEl.value.length - snippet.length);
        channelInputAreaEl.value += ircState.nickName;
        channelInputAreaEl.value += String.fromCharCode(autoCompleteKey);
      } else {
        // #3 check channel nickname list
        let completeNick = '';
        let chanIndex = ircState.channels.indexOf(name.toLowerCase());
        if (chanIndex >= 0) {
          if (ircState.channelStates[chanIndex].names.length > 0) {
            for (let i=0; i<ircState.channelStates[chanIndex].names.length; i++) {
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
          channelInputAreaEl.value += String.fromCharCode(autoCompleteKey);
        } else {
          // #4 not match other, abort
          channelInputAreaEl.value += String.fromCharCode(autoCompleteKey) +
            String.fromCharCode(autoCompleteKey);
        }
      }
      e.preventDefault();
    }
  }.bind(this);
  channelInputAreaEl.addEventListener('beforeinput', channelAutoComplete);

  //----------------
  // Nickname list
  //----------------
  function _updateNickList() {
    let index = ircState.channels.indexOf(name.toLowerCase());
    if (index >= 0) {
      maxNickLength = 0;
      if (ircState.channelStates[index].names.length > 0) {
        channelNamesDisplayEl.textContent = '';
        let opList = [];
        let otherList = [];
        for (let i=0; i<ircState.channelStates[index].names.length; i++) {
          if (ircState.channelStates[index].names[i].charAt(0) === '@') {
            opList.push(ircState.channelStates[index].names[i]);
          } else {
            otherList.push(ircState.channelStates[index].names[i]);
          }
        }
        let sortedOpList = opList.sort();
        let sortedOtherList = otherList.sort();
        if (sortedOpList.length > 0) {
          for (let i=0; i<sortedOpList.length; i++) {
            channelNamesDisplayEl.textContent += sortedOpList[i] + '\n';
            if (maxNickLength < sortedOpList[i].length) {
              maxNickLength = sortedOpList[i].length;
            }
          }
        }
        if (sortedOtherList.length > 0) {
          for (let i=0; i<sortedOtherList.length; i++) {
            channelNamesDisplayEl.textContent += sortedOtherList[i] + '\n';
            if (maxNickLength < sortedOtherList[i].length) {
              maxNickLength = sortedOtherList[i].length;
            }
          }
        }
      }
    }
  } //_updateNickList()
  // populate it initially on creating the element
  _updateNickList();

  document.addEventListener('irc-state-changed', function(event) {
    // console.log('Event: irc-state-changed (createChannelEl)');

    //
    // If channel was previously joined, then parted, then re-joined
    // Check for joined change to true and show channel if hidden
    //
    let ircStateIndex = ircState.channels.indexOf(name.toLowerCase());
    let webStateIndex = webState.channels.indexOf(name.toLowerCase());
    if ((ircStateIndex >= 0) && (webStateIndex >= 0)) {
      if (ircState.channelStates[ircStateIndex].joined !==
        webState.channelStates[webStateIndex].lastJoined) {
        if ((ircState.channelStates[ircStateIndex].joined) &&
          (!webState.channelStates[webStateIndex].lastJoined)) {
          channelBottomDivEl.removeAttribute('hidden');
          channelHideButtonEl.textContent = '-';
          channelTopRightHidableDivEl.removeAttribute('hidden');
        }
        webState.channelStates[webStateIndex].lastJoined =
          ircState.channelStates[ircStateIndex].joined;
      }
    }
    // state object includes up to date list of nicks in a channel
    _updateNickList();
    // show/hide disable or enable channel elements depend on state
    updateVisibility();
  }.bind(this));

  document.addEventListener('channel-message', function(event) {
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
      channelTextAreaEl.textContent += out;
      // move scroll bar so text is scrolled all the way up
      channelTextAreaEl.scrollTop = channelTextAreaEl.scrollHeight;
    }

    let parsedMessage = event.detail.parsedMessage;
    // console.log('Event channel-message: ' + JSON.stringify(parsedMessage, null, 2));


    switch(parsedMessage.command) {
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
              ' (' + reason + ')' );
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
          if (channelMainSectionEl.hasAttribute('beep2-enabled')) {
            playBeep1Sound();
          }
        }
        break;
      case 'MODE':
        if (parsedMessage.params[0].toLowerCase() === name.toLowerCase()) {
          // this could be more elegant than stringify.
          _addText(parsedMessage.timestamp,
            '*',
            'Mode ' + JSON.stringify(parsedMessage.params) + ' by ' + parsedMessage.nick);
        }
        break;
      case 'NICK':
        if (true) {
          _addText(parsedMessage.timestamp,
            '*',
            parsedMessage.nick + ' is now known as ' + parsedMessage.params[0]);
        }
        break;
      case 'NOTICE':
        if (parsedMessage.params[0].toLowerCase() === name.toLowerCase()) {
          _addText(parsedMessage.timestamp,
            '*',
            'Notice(' +
            parsedMessage.nick + ' to ' + parsedMessage.params[0] + ') ' + parsedMessage.params[1]);
          // Upon channel message, make sectino visible.
          channelBottomDivEl.removeAttribute('hidden');
          channelHideButtonEl.textContent = '-';
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
              '(' + reason + ')' );
          }
        }
        break;
      case 'PRIVMSG':
        if (parsedMessage.params[0].toLowerCase() === name.toLowerCase()) {
          _addText(parsedMessage.timestamp,
            parsedMessage.nick,
            parsedMessage.params[1]);
          if (channelMainSectionEl.hasAttribute('beep1-enabled')) {
            playBeep1Sound();
          }
          if (channelMainSectionEl.hasAttribute('beep3-enabled')) {
            let checkLine = parsedMessage.params[1].toLowerCase();
            if (checkLine.indexOf(ircState.nickName.toLowerCase()) >= 0) {
              // timer to avoid overlap with line sound
              setTimeout(playBeep2Sound, 250);
            }
          }
          // Upon channel message, make sectino visible.
          channelBottomDivEl.removeAttribute('hidden');
          channelHideButtonEl.textContent = '-';
        }
        break;
      case 'QUIT':
        if (true) {
          // TODO, this will send Quit message to all channels, even if
          // the quitting nick is not in them.
          // Problem is the nick is no longer in the name array
          // when this message is received, so attendance can not
          // be checked.
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
              '(' + reason + ')' );
          }
        }
        break;
      case 'TOPIC':
        if (parsedMessage.params[0].toLowerCase() === name.toLowerCase()) {
          _addText(parsedMessage.timestamp,
            '*',
            'Topic for ' + parsedMessage.params[0] + ' changed to \"' +
            parsedMessage.params[1] + '\" by ' + parsedMessage.nick);
        }
        break;
      default:
    }
  });

  document.addEventListener('erase-before-reload', function(event) {
    // console.log('Event erase-before-reload');
    channelTextAreaEl.textContent = '';
    channelInputAreaEl.textContent = '';
  }.bind(this));

  // set visibility and divs
  updateVisibility();
  // -----------------------------------------------------------
  // Setup textarea elements as dynamically resizable (globally)
  // -----------------------------------------------------------
  webState.resizableSendButtonTextareaIds.push(channelInputAreaId);
  webState.resizableChanSplitTextareaIds.push(channelTextAreaId);
  document.dispatchEvent(new CustomEvent('element-resize', {bubbles: true}));
};

// ----------------------------------------------------------------------
// A change in state occurred, check if new channel need to be created.
// ----------------------------------------------------------------------
// init to zero to force first update
var lastJoinedChannelCount = -1;
document.addEventListener('irc-state-changed', function(event) {
  // console.log('checking for channel updates');

  // Check list of server's channels and create new if missing.
  if (ircState.channels.length > 0) {
    ircState.channels.forEach(function(name) {
      if (webState.channels.indexOf(name.toLowerCase()) === -1) {
        // console.log('Creating new channel ' + name);
        createChannelEl(name);
      }
    });
  }

  // Check if a new channel was added, or old one /PARTed
  // if so re-create channel join buttions from the favorite channel list
  //
  let needButtonUpdate = false;
  let joinedChannelCount = 0;
  if (ircState.channels.length > 0) {
    for (let i=0; i<ircState.channels.length; i++) {
      if (ircState.channelStates[i].joined) joinedChannelCount++;
    }
  }
  if (joinedChannelCount !== lastJoinedChannelCount) {
    needButtonUpdate = true;
    lastJoinedChannelCount = joinedChannelCount;
  }

  if (needButtonUpdate) {
    // remove old button elements
    let channelJoinButtonContainerEl = document.getElementById('channelJoinButtonContainer');
    while (channelJoinButtonContainerEl.firstChild) {
      channelJoinButtonContainerEl.removeChild(channelJoinButtonContainerEl.firstChild);
    }
    if (ircState.channelList.length > 0) {
      for (let i=0; i<ircState.channelList.length; i++) {
        let channelIndex = ircState.channels.indexOf(ircState.channelList[i].toLowerCase());
        if ((channelIndex < 0) || (!ircState.channelStates[channelIndex].joined)) {
          // console.log('adding ' + ircState.channelList[i]);
          let joinButtonEl = document.createElement('button');
          joinButtonEl.textContent = ircState.channelList[i];
          joinButtonEl.classList.add('channel-button');
          channelJoinButtonContainerEl.appendChild(joinButtonEl);
          joinButtonEl.addEventListener('click', function() {
            _sendIrcServerMessage('JOIN ' + ircState.channelList[i]);
          });
        }
      } // next i
    }
  } // needButtonUpdate
}); // addEventListener('irc-state-changed

// ---------------------------------------
// Join New Channel (Button and Enter)
// ---------------------------------------
function _newChannel() {
  let newChannel = document.getElementById('newChannelNameInputId').value;
  document.getElementById('newChannelNameInputId').value = '';
  let chanPrefixChars = '#&+!';
  if ((newChannel.length > 1) &&
    (chanPrefixChars.indexOf(newChannel.charAt(0)) >= 0)) {
    let message = 'JOIN ' + newChannel;
    _sendIrcServerMessage(message);
  } else {
    showError('Invalid Channel Name');
  }
}
document.getElementById('newChannelNameInputId').addEventListener('input', function(event) {
  if (((event.inputType === 'insertText') && (event.data === null)) ||
    (event.inputType === 'insertLineBreak')) {
    _newChannel();
  }
}.bind(this));
document.getElementById('newChannelButton').addEventListener('click', function() {
  _newChannel();
});
