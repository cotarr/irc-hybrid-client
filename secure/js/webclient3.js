// ---------------------------------------
// webclient3.js - IRC Channel Functions
// ---------------------------------------

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
  // Add to local browser list of open channels
  webState.channels.push(name.toLowerCase());

  var maxNickLength = 0;
  // console.log('creating Channel Element ' + name);

  let channelIndex = ircState.channels.indexOf(name.toLowerCase());
  // console.log('channel state obj ' +
  //   JSON.stringify(ircState.channelStates[channelIndex], null, 2));

  // This is static HTML element created in webclient.html (Insert point)
  let channelContainerDivEl = document.getElementById('channelContainerDiv');

  // section-div
  let channelSectionEl = document.createElement('div');
  channelSectionEl.classList.add('aa-section-div');
  channelSectionEl.classList.add('chan-msg-section-div');

  // Top Element (non-hidden element)
  let channelTopDivEl = document.createElement('div');
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

  //Channel topic
  let channelTopicDivEl = document.createElement('div');
  channelTopicDivEl.textContent = cleanFormatting(ircState.channelStates[channelIndex].topic);
  channelTopicDivEl.classList.add('chan-topic-div');


  // list of nick names display
  let channelNamesDisplayEl = document.createElement('textarea');
  channelNamesDisplayEl.classList.add('channel-names-display');
  channelNamesDisplayEl.setAttribute('cols', '20');
  channelNamesDisplayEl.setAttribute('rows', '10');

  // resizable text area
  let channelTextAreaEl = document.createElement('textarea');
  let channelTextAreaId = 'chan' + channelIndex.toString() + 'TextAreaId';
  channelTextAreaEl.id = channelTextAreaId;
  channelTextAreaEl.setAttribute('cols', '30');
  channelTextAreaEl.setAttribute('rows', '10');
  channelTextAreaEl.setAttribute('spellCheck', 'false');
  channelTextAreaEl.setAttribute('readonly', '');


  // single line user input
  let channelInputAreaEl = document.createElement('textarea');
  let channelInputAreaId = 'chan' + channelIndex.toString() + 'InputInputId';
  channelInputAreaEl.id = channelInputAreaId;
  channelInputAreaEl.setAttribute('cols', '120');
  channelInputAreaEl.setAttribute('rows', '1');

  // button-div
  let channelButtonDiv1El = document.createElement('div');
  channelButtonDiv1El.classList.add('button-div');

  // send button
  let channelSendButtonEl = document.createElement('button');
  channelSendButtonEl.textContent = 'Send';
  channelSendButtonEl.classList.add('channel-button');

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

  channelButtonDiv1El.appendChild(channelSendButtonEl);
  channelButtonDiv1El.appendChild(channelJoinButtonEl);
  channelButtonDiv1El.appendChild(channelPartButtonEl);
  channelButtonDiv1El.appendChild(channelRefreshButtonEl);

  channelBottomDivEl.appendChild(channelTopicDivEl);
  channelBottomDivEl.appendChild(channelNamesDisplayEl);
  channelBottomDivEl.appendChild(channelTextAreaEl);
  channelBottomDivEl.appendChild(channelInputAreaEl);
  channelBottomDivEl.appendChild(channelButtonDiv1El);

  channelSectionEl.appendChild(channelTopDivEl);
  channelSectionEl.appendChild(channelBottomDivEl);

  channelContainerDivEl.appendChild(channelSectionEl);

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
    channelTextAreaEl.setAttribute('rows', '10');
    channelNamesDisplayEl.setAttribute('rows', '10');
  });

  // -------------------------
  // Clear button handler
  // -------------------------
  channelClearButtonEl.addEventListener('click', function() {
    channelTextAreaEl.textContent = '';
    channelTextAreaEl.setAttribute('rows', '10');
    channelNamesDisplayEl.setAttribute('rows', '10');
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
      channelTopicDivEl.textContent = cleanFormatting(ircState.channelStates[index].topic);
      if (ircState.channelStates[index].joined) {
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
    }
  }

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
    _updateNickList();
    updateVisibility();
  }.bind(this));

  document.addEventListener('channel-message', function(event) {
    function _optionalTime(timestamp) {
      // if (window.innerWidth < 600) {
      //   return '';
      // }
      return timestamp + ' ';
    }
    function _addText (text) {
      // append text to textarea
      channelTextAreaEl.textContent += cleanFormatting(text) + '\n';
      // move scroll bar so text is scrolled all the way up
      channelTextAreaEl.scrollTop = channelTextAreaEl.scrollHeight;
    }
    let parsedMessage = event.detail.parsedMessage;
    // console.log('Event channel-message: ' + JSON.stringify(parsedMessage, null, 2));
    switch(parsedMessage.command) {
      //
      // TODO cases for channel closed or other error
      //
      case 'JOIN':
        if (parsedMessage.params[0].toLowerCase() === name.toLowerCase()) {
          _addText(_optionalTime(parsedMessage.timestamp) +
          '*'.padStart(maxNickLength, ' ') + nickChannelSpacer +
          parsedMessage.nick + ' (' +
          parsedMessage.host + ') has joined');
        }
        break;
      case 'MODE':
        if (parsedMessage.params[0].toLowerCase() === name.toLowerCase()) {
          // this could be more elegant than stringify.
          _addText(_optionalTime(parsedMessage.timestamp) +
            '*'.padStart(maxNickLength, ' ') + nickChannelSpacer +
            'Mode ' + JSON.stringify(parsedMessage.params) + ' by ' + parsedMessage.nick);
        }
        break;
      case 'NOTICE':
        if (parsedMessage.params[0].toLowerCase() === name.toLowerCase()) {
          _addText(_optionalTime(parsedMessage.timestamp) +
            '*'.padStart(maxNickLength, ' ') + nickChannelSpacer +
            'Notice(' +
            parsedMessage.nick + '/' + parsedMessage.params[0] + ') ' +
            parsedMessage.params[1]);
          // Upon channel message, make sectino visible.
          channelBottomDivEl.removeAttribute('hidden');
          channelHideButtonEl.textContent = '-';
        }
        break;

      case 'PART':
        if (parsedMessage.params[0].toLowerCase() === name.toLowerCase()) {
          _addText(_optionalTime(parsedMessage.timestamp) +
            '*'.padStart(maxNickLength, ' ') + nickChannelSpacer +
            parsedMessage.nick + ' (' +
            parsedMessage.host + ') has left');
        }
        break;
      case 'PRIVMSG':
        if (parsedMessage.params[0].toLowerCase() === name.toLowerCase()) {
          _addText(_optionalTime(parsedMessage.timestamp) +
            parsedMessage.nick.padStart(maxNickLength, ' ') + nickChannelSpacer +
            parsedMessage.params[1]);
          // Upon channel message, make sectino visible.
          channelBottomDivEl.removeAttribute('hidden');
          channelHideButtonEl.textContent = '-';
        }
        break;
      case 'TOPIC':
        if (parsedMessage.params[0].toLowerCase() === name.toLowerCase()) {
          _addText(_optionalTime(parsedMessage.timestamp) +
            '*'.padStart(maxNickLength, ' ') + nickChannelSpacer +
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
  webState.resizableChannelTextareaIds.push(channelInputAreaId);
  webState.resizableChanSplitTextareaIds.push(channelTextAreaId);
  document.dispatchEvent(new CustomEvent('element-resize', {bubbles: true}));

  //
  // THIS IS A HACK (First 2 to 4 lines are missing sometimes, so refresh from cache)
  //
  setTimeout(function() {
    updateFromCache();
  }.bind(this), 250);
};

// ----------------------------------------------------------------------
// A change in state occurred, check if new channel need to be created.
// ----------------------------------------------------------------------
// init to zero to force first update
var lastChannelsArray = [0];
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

  // Add channel /JOIN buttons for favorite channels
  let needButtonUpdate = false;
  if (lastChannelsArray.length !== ircState.channels.length) {
    // clase of different array size, need update
    needButtonUpdate = true;
  } else {
    // case of same array size
    if (ircState.channels.length > 0) {
      // case of same length, check entries
      for (let i=0; i<ircState.channels.length; i++) {
        if (lastChannelsArray[i] !== ircState.channels[i]) needButtonUpdate = true;
      }
    }
  }
  if (needButtonUpdate) {
    // remove old button elements
    let channelJoinButtonContainerEl = document.getElementById('channelJoinButtonContainer');
    while (channelJoinButtonContainerEl.firstChild) {
      channelJoinButtonContainerEl.removeChild(channelJoinButtonContainerEl.firstChild);
    }
    if (ircState.channelList.length > 0) {
      for (let i=0; i<ircState.channelList.length; i++) {
        if (ircState.channels.indexOf(ircState.channelList[i]) < 0) {
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
  // make a shallow copy
  lastChannelsArray = [];
  if (ircState.channels.length > 0) {
    for (let i=0; i<ircState.channels.length; i++) {
      lastChannelsArray.push(ircState.channels[i]);
    }
  }
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
