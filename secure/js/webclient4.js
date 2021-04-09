// --------------------------------------------
// webclient4.js - Private Message Functions
// --------------------------------------------

// --------------------------------------------
// Send text as private message to other user
//     (internal function)
// --------------------------------------------
function _sendPrivMessageToUser(targetNickname, textAreaEl) {
  if ((textAreaEl.value.length > 0)) {
    let text = textAreaEl.value;
    text = text.replace('\r', '').replace('\n', '');

    // Check slash character to see if it is an IRC command
    if (text.charAt(0) === '/') {
      // yes, it is command
      let commandAction = textCommandParser(
        {
          inputString: text,
          originType: 'private',
          originName: ircState.nickName
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
}; // _sendPrivMessageToUser

function _createPrivateMessageEl (name, parsedMessage) {
  // console.log('Creating private message Element for ' + name);
  let privMsgIndex = webState.activePrivateMessageNicks.indexOf(name);

  // This is static HTML element created in webclient.html (Insert point)
  let privMsgContainerDivEl = document.getElementById('privateMessageContainerDiv');

  // section-div
  let privMsgSectionEl = document.createElement('div');
  privMsgSectionEl.classList.add('section-div');
  privMsgSectionEl.classList.add('priv-msg-section-div');

  // Top Element (non-hidden element)
  let privMsgTopDivEl = document.createElement('div');
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

  // signle line user input
  let privMsgInputAreaEl = document.createElement('textarea');
  let privMsgInputAreaId = 'privMsg' + privMsgIndex.toString() + 'InputAreaId';
  privMsgInputAreaEl.id = privMsgInputAreaId;
  privMsgInputAreaEl.setAttribute('cols', '120');
  privMsgInputAreaEl.setAttribute('rows', '1');

  // button-div
  let privMsgButtonDiv1El = document.createElement('div');
  privMsgButtonDiv1El.classList.add('button-div');

  // send button
  let privMsgSendButtonEl = document.createElement('button');
  privMsgSendButtonEl.textContent = 'Send';
  privMsgSendButtonEl.classList.add('channel-button');

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

  privMsgButtonDiv1El.appendChild(privMsgSendButtonEl);

  privMsgBottomDivEl.appendChild(privMsgTextAreaEl);
  privMsgBottomDivEl.appendChild(privMsgInputAreaEl);
  privMsgBottomDivEl.appendChild(privMsgButtonDiv1El);

  privMsgSectionEl.appendChild(privMsgTopDivEl);
  privMsgSectionEl.appendChild(privMsgBottomDivEl);

  privMsgContainerDivEl.appendChild(privMsgSectionEl);

  // -------------------------------------------
  // Add initial message, special case of opening new window
  // we must add the message that generated the window open request.
  // -------------------------------------------
  privMsgTextAreaEl.textContent += parsedMessage.timestamp + ' ' +
    parsedMessage.nick + ' ' + parsedMessage.params[1] + '\n';
  // move scroll bar so text is scrolled all the way up
  privMsgTextAreaEl.scrollTop = privMsgTextAreaEl.scrollHeight;

  document.addEventListener('erase-before-reload', function(event) {
    // console.log('Event erase-before-reload');
    privMsgTextAreaEl.textContent = '';
    privMsgInputAreaEl.textContent = '';
  }.bind(this));

  // --------------------------
  // Private Message Event listeners
  // ---------------------------

  // -------------------------
  // How/Hide button handler
  // -------------------------
  privMsgHideButtonEl.addEventListener('click', function() {
    if (privMsgBottomDivEl.hasAttribute('hidden')) {
      privMsgBottomDivEl.removeAttribute('hidden');
      privMsgHideButtonEl.textContent = '-';
      privMsgTopRightHidableDivEl.removeAttribute('hidden');
    } else {
      privMsgBottomDivEl.setAttribute('hidden', '');
      privMsgHideButtonEl.textContent = '+';
      privMsgTopRightHidableDivEl.setAttribute('hidden', '');
    }
  });

  // -------------------------
  // Taller button handler
  // -------------------------
  privMsgTallerButtonEl.addEventListener('click', function() {
    let newRows = parseInt(privMsgTextAreaEl.getAttribute('rows')) + 5;
    privMsgTextAreaEl.setAttribute('rows', newRows.toString());
  });

  // -------------------------
  // Normal button handler
  // -------------------------
  privMsgNormalButtonEl.addEventListener('click', function() {
    privMsgTextAreaEl.setAttribute('rows', '6');
  });

  // -------------------------
  // Clear button handler
  // -------------------------
  privMsgClearButtonEl.addEventListener('click', function() {
    privMsgTextAreaEl.textContent = '';
    privMsgTextAreaEl.setAttribute('rows', '6');
  });

  // ----------------
  // show all event
  // ----------------
  document.addEventListener('show-all-divs', function(event) {
    privMsgBottomDivEl.removeAttribute('hidden');
    privMsgHideButtonEl.textContent = '-';
    privMsgTopRightHidableDivEl.removeAttribute('hidden');
  });
  // ----------------
  // hide all event
  // ----------------
  document.addEventListener('hide-all-divs', function(event) {
    privMsgBottomDivEl.setAttribute('hidden', '');
    privMsgHideButtonEl.textContent = '+';
    privMsgTopRightHidableDivEl.setAttribute('hidden', '');
  });

  // -------------
  // send button
  // -------------
  privMsgSendButtonEl.addEventListener('click', function() {
    _sendPrivMessageToUser(name, privMsgInputAreaEl);
  }.bind(this));

  // ---------------
  // Enter pressed
  // ---------------
  privMsgInputAreaEl.addEventListener('input', function(event) {
    if (((event.inputType === 'insertText') && (event.data === null)) ||
      (event.inputType === 'insertLineBreak')) {
      _sendPrivMessageToUser(name, privMsgInputAreaEl);
    }
  }.bind(this));

  document.addEventListener('private-message', function(event) {
    function _addText (text) {
      // append text to textarea
      privMsgTextAreaEl.textContent += text + '\n';
      // move scroll bar so text is scrolled all the way up
      privMsgTextAreaEl.scrollTop = privMsgTextAreaEl.scrollHeight;
    }
    let parsedMessage = event.detail.parsedMessage;
    // console.log('Event private-message: ' + JSON.stringify(parsedMessage, null, 2));
    switch(parsedMessage.command) {
      //
      // TODO cases for user left IRC or other error

      case 'PRIVMSG':
        // there may be multiple windows open with other nicknames
        // This does a nickname match and acts only on message for this intended window.
        if (parsedMessage.nick === ircState.nickName) {
          // case of this is outgoing message from me
          if (parsedMessage.params[0].toLowerCase() === name.toLowerCase()) {
            _addText(parsedMessage.timestamp + ' ' +
              parsedMessage.nick + ' ' + parsedMessage.params[1]);
            // Upon privMsg message, make sectino visible.
            privMsgBottomDivEl.removeAttribute('hidden');
            privMsgHideButtonEl.textContent = '-';
          }
        } else {
          // case of incoming message from others.
          if (parsedMessage.nick.toLowerCase() === name.toLowerCase()) {
            _addText(parsedMessage.timestamp + ' ' +
              parsedMessage.nick + ' ' + parsedMessage.params[1]);
            // Upon privMsg message, make sectino visible.
            privMsgBottomDivEl.removeAttribute('hidden');
            privMsgHideButtonEl.textContent = '-';
          }
        }
        break;
      default:
    }
  });

  // -----------------------------------------------------------
  // Setup textarea elements as dynamically resizable (globally)
  // -----------------------------------------------------------
  webState.resizeableTextareaIds.push(privMsgTextAreaId);
  webState.resizeableTextareaIds.push(privMsgInputAreaId);
  document.dispatchEvent(new CustomEvent('element-resize', {bubbles: true}));
};

// Event listener for messages to create new window
document.addEventListener('private-message', function(event) {
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
    webState.activePrivateMessageNicks.push(name.toLowerCase());
    _createPrivateMessageEl(name, event.detail.parsedMessage);
  }
});

// --------------------------------
// Send private message
// --------------------------------
function _buildPrivateMessageText() {
  if ((document.getElementById('pmNickNameInputId').value.length > 0) &&
    (document.getElementById('userPrivMsgInputId').value.length > 0)) {
    let targetNick = document.getElementById('pmNickNameInputId').value;
    let inputAreaEl = document.getElementById('userPrivMsgInputId');
    _sendPrivMessageToUser(targetNick, inputAreaEl);
    document.getElementById('userPrivMsgInputId').value = '';
    // close window after sending, because a new one will open on server response.
    document.getElementById('privMsgMainHiddenDiv').setAttribute('hidden', '');
    document.getElementById('openClosePrivMessageButton').textContent = '+';
  }
};
document.getElementById('userPrivMsgInputId').addEventListener('input', function(event) {
  if ((event.inputType === 'insertText') && (event.data === null)) {
    _buildPrivateMessageText();
  }
  if (event.inputType === 'insertLineBreak') {
    _buildPrivateMessageText();
  }
}.bind(this));
document.getElementById('UserPrivMsgSendButton').addEventListener('click', function() {
  _buildPrivateMessageText();
}.bind(this));

// -------------------------
// Whois button handler
// -------------------------
document.getElementById('whoisButton').addEventListener('click', function() {
  if (document.getElementById('pmNickNameInputId').value.length > 0) {
    let message = 'WHOIS ' + document.getElementById('pmNickNameInputId').value;
    _sendIrcServerMessage(message);
    // open up server messages to show
    document.getElementById('rawHiddenElements').removeAttribute('hidden');
    document.getElementById('rawOpenCloseButton').textContent = '-';
  } else {
    showError('Input required');
  }
});
// -------------------------------------
// Private Message (Open/Close) Buttons
// -------------------------------------
document.getElementById('privMsgMainHiddenButton').addEventListener('click', function() {
  if (document.getElementById('privMsgMainHiddenDiv').hasAttribute('hidden')) {
    document.getElementById('privMsgMainHiddenDiv').removeAttribute('hidden');
    document.getElementById('privMsgMainHiddenButton').textContent = '-';
  } else {
    document.getElementById('privMsgMainHiddenDiv').setAttribute('hidden', '');
    document.getElementById('privMsgMainHiddenButton').textContent = '+';
  }
}.bind(this));
