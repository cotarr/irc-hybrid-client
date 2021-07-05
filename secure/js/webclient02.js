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
// -------------------------------------------------------------

// -------------------------------------------------------------
// webclient02.js - Parse IRC messages from backend/IRC server
//
//    IRC-Server  -->  backend-webserver -->  Browser (here)
// -------------------------------------------------------------
//
'use strict';
//
// ------------------------------------------
// Function to strip colors from a string
// ------------------------------------------
function cleanFormatting (inString) {
  // Filterable formatting codes
  const formattingChars = [
    2, // 0x02 bold
    7, // 0x07 bell character
    15, // 0x0F reset
    17, // 0x11 mono-space
    22, // 0x16 Reverse color
    29, // 0x1D Italics
    30, // 0x1E Strickthrough
    31 // 0x1F Underline
  ];
  // Color encoding (2 methods)
  // 0x03+color (1 or 2 digits in range 0-9)
  // 0x04+color (6 digit hexadecimal color)
  let outString = '';
  // l = length of input string
  const l = inString.length;
  if (l === 0) return outString;
  // i = index into input string
  let i = 0;

  // Loop through all characters in input string
  let active = true;
  while (i < l) {
    active = true;
    // Filter format characters capable of toggle on/off
    if ((active) && (i < l) && (formattingChars.indexOf(inString.charCodeAt(i)) >= 0)) {
      active = false;
      i++;
    }
    // Removal of color codes 0x03 + (1 or 2 digit) in range ('0' to '9')
    // followed by optional comma and background color.
    // Examples
    //     0x03 + '3'
    //     0x03 + '03'
    //     0x03 + '3,4'
    //     0x03 + '03,04'
    if ((active) && (i < l) && (inString.charCodeAt(i) === 3)) {
      active = false;
      i++;
      if ((i < l) && (inString.charAt(i) >= '0') && (inString.charAt(i) <= '9')) i++;
      if ((i < l) && (inString.charAt(i) >= '0') && (inString.charAt(i) <= '9')) i++;
      if ((i < l) && (inString.charAt(i) === ',')) {
        i++;
        if ((i < l) && (inString.charAt(i) >= '0') && (inString.charAt(i) <= '9')) i++;
        if ((i < l) && (inString.charAt(i) >= '0') && (inString.charAt(i) <= '9')) i++;
      }
    }
    // Hexadecimal colors 0x04 + 6 hexadecimal digits
    // followed by optional comma and 6 hexadeciaml digits for background color
    // In this case, 6 characters are removed regardless if 0-9, A-F
    if ((active) && (i < l) && (inString.charCodeAt(i) === 4)) {
      active = false;
      i++;
      if (((inString.charAt(i) >= '0') &&
        (inString.charAt(i) <= '9')) ||
        ((inString.toUpperCase().charAt(i) >= 'A') &&
        (inString.toUpperCase().charAt(i) <= 'F'))) {
        for (let j = 0; j < 6; j++) {
          if (i < l) i++;
        }
        if ((i < l) && (inString.charAt(i) === ',')) {
          i++;
          for (let j = 0; j < 6; j++) {
            if (i < l) i++;
          }
        }
      }
    }
    if ((active) && (i < l)) {
      active = false;
      outString += inString.charAt(i);
      i++;
    }
  }
  return outString;
}

// ------ This is a color format removal test -------------
// let colorTest = 'This is ' +
//   String.fromCharCode(3) + '04' + 'Red' + String.fromCharCode(3) + ' color ' +
//   String.fromCharCode(3) + '04,12' + 'Red/Gray' + String.fromCharCode(3) + ' color ' +
//   String.fromCharCode(4) + '0Fd7ff' + 'Hex-color' + String.fromCharCode(4) + ' color ' +
//   String.fromCharCode(4) + '0Fd7ff,17a400' + 'Hex-color,hexcolor' + String.fromCharCode(4) +
//   ' color ' +
//   String.fromCharCode(2) + 'Bold' + String.fromCharCode(2) + ' text ';
// console.log('colorTest ' + cleanFormatting(colorTest));
// ------ end color format removal test -------------

// ------------------------------------------
// Function to strip CTCP delimiter
// ------------------------------------------
function cleanCtcpDelimiter (inString) {
  // Filterable formatting codes
  const ctcpDelim = 1;
  let outString = '';
  const l = inString.length;
  if (l === 0) return outString;
  let i = 0;
  while (i < l) {
    if ((i < l) && (inString.charCodeAt(i) === ctcpDelim)) {
      i++;
    } else {
      if (i < l) outString += inString.charAt(i);
      i++;
    }
  }
  return outString;
}
// --------------------------------------------------------
// Convert string with IRCv3 timestamp to HH:MM:SS string
// --------------------------------------------------------
const timestampToHMS = function (timeString) {
  // console.log('timeString ' + timeString);
  // Reference: https://ircv3.net/specs/extensions/server-time
  // @time=2011-10-19T16:40:51.620Z :Angel!angel@example.org PRIVMSG Wiz :Hello
  let outString = '';
  if (timeString.length === 0) {
    outString = null;
  } else {
    if (timeString.indexOf('@time=') === 0) {
      const timeObj = new Date(timeString.slice(6, timeString.length));
      outString += timeObj.getHours().toString().padStart(2, '0') + ':';
      outString += timeObj.getMinutes().toString().padStart(2, '0') + ':';
      outString += timeObj.getSeconds().toString().padStart(2, '0');
    } else {
      outString = null;
    }
  }
  return outString;
};

// ----------------------------------------------------------------
// Convert unix timestamp in seconds to HH:MM:SS string local time
// ----------------------------------------------------------------
const unixTimestampToHMS = function (seconds) {
  // console.log('timeString ' + timeString);
  let outString = '';
  if ((typeof seconds === 'number') &&
    (Number.isInteger(seconds)) &&
    (seconds > 1000000000) &&
    (seconds < 1000000000000)) {
    const timeObj = new Date(seconds * 1000);
    let language;
    if (window.navigator.languages) {
      language = window.navigator.languages[0];
    } else {
      language = window.navigator.userLanguage || window.navigator.language || 'en-US';
    }
    outString = timeObj.toLocaleTimeString(language, { hour12: false }); // hh:mm:ss browser time
  } else {
    outString = null;
  }
  // console.log(seconds, outString);
  return outString;
};

// --------------------------------------------------------
// Convert string with IRCv3 timestamp to Unix Seconds
// --------------------------------------------------------
const timestampToUnixSeconds = function (timeString) {
  // Reference: https://ircv3.net/specs/extensions/server-time
  // @time=2011-10-19T16:40:51.620Z :Angel!angel@example.org PRIVMSG Wiz :Hello
  let outSeconds = null;
  if (timeString.length === 0) {
    outSeconds = null;
  } else {
    if (timeString.indexOf('@time=') === 0) {
      const timeObj = new Date(timeString.slice(6, timeString.length));
      outSeconds = parseInt(timeObj.valueOf() / 1000);
    } else {
      outSeconds = null;
    }
  }
  return outSeconds;
};

// ------------------------------------------------------------------
// Internal function to parse one line of message from IRC server
// Returns jason object with prefix, command and params array
//
// Input: UTF-8 string as input (one message from IRC server)
// Return: Structured JSON object
// ------------------------------------------------------------------
function _parseIrcMessage (message) {
  // ------------------------
  // internal functions
  // ------------------------
  //
  // 1) timestamp
  //
  // timestamp :prefix command param1 param2 .... :lastParam
  // =========
  //
  function _extractTimeString (start, end, messageString) {
    let i = start;
    let timeString = '';
    while ((messageString.charAt(i) !== ' ') && (i <= end)) {
      timeString += messageString.charAt(i);
      i++;
    }
    const outString = timestampToHMS(timeString);
    return {
      data: outString,
      nextIndex: i + 1
    };
  }
  //
  // 2) Check if colon string
  //
  // timestamp :prefix command param1 param2 .... :lastParam
  //          ===                                ===
  //
  function _isColonString (start, messageString) {
    if (messageString.charAt(start) === ':') {
      return {
        isColonStr: true,
        nextIndex: start + 1
      };
    } else {
      return {
        isColonStr: false,
        nextIndex: start
      };
    }
  }
  //
  // 3) Command or param string, but not last param
  //
  // timestamp :prefix command param1 param2 .... :lastParam
  //                   ======= ====== ======
  //
  function _extractMidString (start, end, messageString) {
    let i = start;
    let outString = '';
    while ((messageString.charAt(i) !== ' ') && (i <= end)) {
      outString += messageString.charAt(i);
      i++;
    }
    if (outString.length === 0) outString = null;
    return {
      data: outString,
      nextIndex: i + 1
    };
  }
  // 4) Last param string (start with :)
  //
  // timestamp :prefix command param1 param2 .... :lastParam
  //                                               =========
  //
  function _extractFinalString (start, end, messageString) {
    let i = start;
    let outString = '';
    while (i <= end) {
      outString += messageString.charAt(i);
      i++;
    }
    if (outString.length === 0) outString = null;
    return {
      data: outString,
      nextIndex: i + 1
    };
  }
  //
  // Extract nickname
  //
  // nick!user@host.domain
  // nick!user@nn:nn:nn:nn: (ipv6)
  function _extractNickname (inText) {
    if (inText) {
      if ((inText.indexOf('!') >= 0) &&
        (inText.indexOf('@') >= 0) &&
        (inText.indexOf('!') < inText.indexOf('@'))) {
        const nick = inText.split('!')[0];
        return nick;
      } else {
        return null;
      }
    } else {
      return null;
    }
  }
  //
  // Extract hostname
  //
  function _extractHostname (inText) {
    if (inText) {
      if ((inText.indexOf('!') >= 0) &&
        (inText.indexOf('@') >= 0) &&
        (inText.indexOf('!') < inText.indexOf('@'))) {
        const host = inText.split('!')[1];
        return host;
      } else {
        return null;
      }
    } else {
      return null;
    }
  }
  // ---------------------------------------------------------
  //                   Decode the line
  // --------------------------------------------------------
  // This accepts a Buffer as input with UTF8 characters
  //
  // Format:  [:prefix] command param1 [param2] .... [:lastParam]
  // --------------------------------------------------------
  //
  //  Line composed of 3 parts, prefix, command, params
  //
  let timestamp = null;
  let prefix = null;
  let extNick = null;
  let extHost = null;
  let command = null;
  const params = [];
  //
  // Parsing variables
  const messageString = message.toString();
  const end = messageString.length - 1;
  let temp = { nextIndex: 0 };

  // 1) Extract timestamp
  temp = _extractTimeString(temp.nextIndex, end, messageString);
  timestamp = temp.data;

  // 2) Check if prefix exist, if exit parse value, return nextIndex
  temp = _isColonString(temp.nextIndex, messageString);
  if (temp.isColonStr) {
    temp = _extractMidString(temp.nextIndex, end, messageString);
    prefix = temp.data;
    extNick = _extractNickname(temp.data);
    extHost = _extractHostname(temp.data);
  }

  // 3) extract command string
  temp = _extractMidString(temp.nextIndex, end, messageString);
  command = temp.data;

  // 4) Extract optional params, in loop, until all params extracted.
  let done = false;
  while (!done) {
    if (temp.nextIndex > end) {
      done = true;
    } else {
      temp = _isColonString(temp.nextIndex, messageString);
      if (temp.isColonStr) {
        // case of colon string, this is last param
        temp = _extractFinalString(temp.nextIndex, end, messageString);
        params.push(temp.data);
        done = true;
      } else {
        // else not colon string, must be middle param string
        temp = _extractMidString(temp.nextIndex, end, messageString);
        if ((temp.data) && (temp.data.length > 0)) {
          params.push(temp.data);
        } else {
          // zero length must be done
          done = true;
        }
      }
    }
  }
  // console.log(prefix, command, JSON.stringify(params));
  return {
    timestamp: timestamp,
    prefix: prefix,
    nick: extNick,
    host: extHost,
    command: command,
    params: params
  };
}; // _parseIrcMessage()

// -----------------------------------------------------------------------
// Channel windows are created dynamically and inserted into the DOM
// Fire this event to send channel message to listener in channel window
//
// -----------------------------------------------------------------------
// :nick!~user@host.domain PRIVMSG #channel :This is channel text message.
// -----------------------------------------------------------------------
function displayChannelMessage (parsedMessage) {
  document.dispatchEvent(new CustomEvent('channel-message',
    {
      bubbles: true,
      detail: {
        parsedMessage: parsedMessage
      }
    }));
} // displayChannelMessage()

// -----------------------------------------------------------------------
// Private Mesage windows are created dynamically and inserted into the DOM
// Fire this event to send channel message to listener in channel window
//
// -----------------------------------------------------------------------
// :nick!~user@host.domain PRIVMSG nickname :This is private text message.
// -----------------------------------------------------------------------
function displayPrivateMessage (parsedMessage) {
  document.dispatchEvent(new CustomEvent('private-message',
    {
      bubbles: true,
      detail: {
        parsedMessage: parsedMessage
      }
    }));
} // displayPrivateMessage

// -----------------------------------------------------
// Notice messages are displayed here
// This is to allow integration of CTCP responses
//
// Note: notice window controls are in another module
// -----------------------------------------------------
function displayNoticeMessage (parsedMessage) {
  function _addText (text) {
    document.getElementById('noticeMessageDisplay').value +=
      cleanFormatting(text) + '\n';
    document.getElementById('noticeMessageDisplay').scrollTop =
      document.getElementById('noticeMessageDisplay').scrollHeight;
  }
  // console.log('parsedMessage ' + JSON.stringify(parsedMessage, null, 2));
  switch (parsedMessage.command) {
    case 'NOTICE':
      {
        const ctcpDelim = 1;
        if (((parsedMessage.params.length === 2) &&
          (parsedMessage.params[1].charCodeAt(0) === ctcpDelim)) ||
          ((parsedMessage.params.length === 3) &&
          (parsedMessage.params[2].charCodeAt(0) === ctcpDelim))) {
          // case of CTCP notice
          // ignore, handle else
        } else {
          if (parsedMessage.params[0] === ircState.nickName) {
            // Case of regular notice address to my nickname, not CTCP reply
            if (parsedMessage.nick) {
              // case of valid user nickname parse
              _addText(parsedMessage.timestamp + ' ' +
              parsedMessage.nick + nickChannelSpacer +
                parsedMessage.params[1]);
            } else {
              // else must be a services server message, use prefix
              _addText(parsedMessage.timestamp + ' ' +
              parsedMessage.prefix + nickChannelSpacer +
                parsedMessage.params[1]);
            }
            webState.noticeOpen = true;
            updateDivVisibility();

            // Message activity Icon
            // If NOT reload from cache in progress (timer not zero)
            // then display incoming message activity icon
            if (webState.cacheInhibitTimer === 0) {
              setNotActivityIcon();
            }
          } else if (ircState.channels.indexOf(parsedMessage.params[0].toLowerCase()) >= 0) {
            // case of notice to #channel
            document.dispatchEvent(new CustomEvent('channel-message',
              {
                bubbles: true,
                detail: {
                  parsedMessage: parsedMessage
                }
              }));
          } else if (parsedMessage.nick === ircState.nickName) {
            // Case of regular notice, not CTCP reply
            _addText(parsedMessage.timestamp + ' [to] ' +
            parsedMessage.params[0] + nickChannelSpacer +
             parsedMessage.params[1]);
            webState.noticeOpen = true;
            updateDivVisibility();
          }
        }
      }
      break;
    //
    default:
  }
} // displayNoticeMessage()

//
// Add cache reload message to notice window
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

  document.getElementById('noticeMessageDisplay').value += markerString;
  document.getElementById('noticeMessageDisplay').scrollTop =
    document.getElementById('noticeMessageDisplay').scrollHeight;
});

// -----------------------------------------------------
// Wallops (+w) messages are displayed here
// Note: notice window controls are in another module
// -----------------------------------------------------
function displayWallopsMessage (parsedMessage) {
  function _addText (text) {
    document.getElementById('wallopsMessageDisplay').value += cleanFormatting(text) + '\n';
    document.getElementById('wallopsMessageDisplay').scrollTop =
      document.getElementById('wallopsMessageDisplay').scrollHeight;
  }
  // console.log('Priv Msg: ' + JSON.stringify(parsedMessage, null, 2));
  switch (parsedMessage.command) {
    case 'WALLOPS':
      if (parsedMessage.nick) {
        _addText(parsedMessage.timestamp + ' ' +
          parsedMessage.nick + nickChannelSpacer + parsedMessage.params[0]);
        webState.wallopsOpen = true;
      } else {
        _addText(parsedMessage.timestamp + ' ' +
          parsedMessage.prefix + nickChannelSpacer + parsedMessage.params[0]);
        webState.wallopsOpen = true;
      }
      updateDivVisibility();
      break;
    //
    default:
  }
} // displayWallopsMessage

//
// Add cache reload message to wallops window
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

  document.getElementById('wallopsMessageDisplay').value += markerString;
  document.getElementById('wallopsMessageDisplay').scrollTop =
    document.getElementById('wallopsMessageDisplay').scrollHeight;
});

// ----------------------------------------------
// Insert a text string into the server window
// and scroll to bottom
// ----------------------------------------------
function displayRawMessage (inString) {
  document.getElementById('rawMessageDisplay').value += inString + '\n';
  // scroll to view new text
  document.getElementById('rawMessageDisplay').scrollTop =
    document.getElementById('rawMessageDisplay').scrollHeight;
};

// ----------------------------------------------------------------
// Prefix raw server message in hexadecimal
// multi-byte UTF-8 characters are converted to 8 bit
// bytes using TextEncoder.
// ----------------------------------------------------------------
function displayRawMessageInHex (message) {
  const uint8String = new TextEncoder('utf8').encode(message);
  let hexString = '';
  for (let i = 0; i < uint8String.length; i++) {
    hexString += uint8String[i].toString(16).padStart(2, '0') + ' ';
  }
  displayRawMessage(hexString);
};

// -------------------------------------------
// This is called to apply message formatting
// to IRC server message for display
// -------------------------------------------
function displayFormattedServerMessage (parsedMessage, message) {
  document.dispatchEvent(new CustomEvent('server-message',
    {
      bubbles: true,
      detail: {
        parsedMessage: parsedMessage,
        message: message
      }
    }));
} // displayChannelMessage()

// ---------------------------------------------
// CTCP message parser
//
// Note: CTCP replies to other users are handled
// in the backend web server. This parser is
// for user interactive CTCP requests,
// primarily ACTION from /ME commands.
// ---------------------------------------------
function _parseCtcpMessage (parsedMessage) {
  // console.log('_parseCtcpMessage ' + JSON.stringify(parsedMessage, null, 2));
  function _addNoticeText (text) {
    document.getElementById('noticeMessageDisplay').value += text + '\n';
    document.getElementById('noticeMessageDisplay').scrollTop =
      document.getElementById('noticeMessageDisplay').scrollHeight;
  }
  const ctcpDelim = 1;
  const ctcpMessage = parsedMessage.params[1];
  const end = ctcpMessage.length - 1;
  if (ctcpMessage.charCodeAt(0) !== 1) {
    console.log('_parseCtcpMessage() missing CTCP start delimiter');
    return;
  }

  let i = 1;
  let ctcpCommand = '';
  let ctcpRest = '';
  while ((ctcpMessage.charAt(i) !== ' ') && (i <= end)) {
    if (ctcpMessage.charCodeAt(i) !== ctcpDelim) {
      ctcpCommand += ctcpMessage.charAt(i);
    }
    i++;
  }
  ctcpCommand = ctcpCommand.toUpperCase();
  while ((ctcpMessage.charAt(i) === ' ') && (i <= end)) {
    i++;
  }
  while ((ctcpMessage.charCodeAt(i) !== ctcpDelim) && (i <= end)) {
    ctcpRest += ctcpMessage.charAt(i);
    i++;
  }
  // console.log('ctcpCommand ' + ctcpCommand + ' ctcpRest ' + ctcpRest);
  //
  //   ACTION
  //
  if (ctcpCommand === 'ACTION') {
    const index = ircState.channels.indexOf(parsedMessage.params[0].toLowerCase());
    if (index >= 0) {
      parsedMessage.params[1] = parsedMessage.nick + ' ' + ctcpRest;
      parsedMessage.nick = '*';
      displayChannelMessage(parsedMessage);
    } else {
      // TODO actino sent as regular PM for now
      parsedMessage.params[1] = ctcpRest;
      parsedMessage.isPmCtcpAction = true;
      displayPrivateMessage(parsedMessage);
    }
  } else {
    if (parsedMessage.nick === ircState.nickName) {
      // case of match my nickname
      if (parsedMessage.command.toUpperCase() === 'PRIVMSG') {
        // case of outgoing CTCP request from me to other client
        _addNoticeText(parsedMessage.timestamp + ' ' +
        'CTCP 1 Request to ' + parsedMessage.params[0] + ': ' +
        ctcpCommand + ' ' + ctcpRest);
        webState.noticeOpen = true;
      } else {
        // case of echo my CTCP reply to other client
        //
        // Outgoing CTCP reply has been parsed into
        // individual array elements (words).
        // This will (unparse) them back to a string
        //
        let replyContents = '';
        if (parsedMessage.params.length > 2) {
          for (let i = 2; i < parsedMessage.params.length; i++) {
            if (parsedMessage.params[i].charCodeAt(0) !== ctcpDelim) {
              replyContents += cleanCtcpDelimiter(parsedMessage.params[i]);
              if (i !== parsedMessage.params.length) {
                replyContents += ' ';
              }
            }
          }
        }
        _addNoticeText(parsedMessage.timestamp + ' ' +
        'CTCP 2 Reply to ' + parsedMessage.params[0] + ': ' +
        ctcpCommand + ' ' + replyContents);
        webState.noticeOpen = true;
      }
    } else {
      // case of ctcp message/reply for other remote IRC client
      if (parsedMessage.command.toUpperCase() === 'PRIVMSG') {
        // case of remote client request to me for CTCP response
        _addNoticeText(parsedMessage.timestamp + ' ' +
        'CTCP 3 Request from ' + parsedMessage.nick + ': ' +
        ctcpCommand + ' ' + ctcpRest);
        webState.noticeOpen = true;
      } else {
        // case of showing remote response to my CTCP request
        _addNoticeText(parsedMessage.timestamp + ' ' +
        'CTCP 4 Reply from ' +
        parsedMessage.nick + ': ' +
        ctcpCommand + ' ' + ctcpRest);
        webState.noticeOpen = true;
      }
    }
    updateDivVisibility();
  }
}

// -------------------------------------------------------------
// Server Message filter
//
// Messages with specific handlers, such as channel messages
// Are handled directly by the parser.
//
// This filter is to avoid duplication of messages
// in the server window for case of alternate display
//
// Format: simple Array of strings
// -------------------------------------------------------------
const ircMessageCommandDisplayFilter = [
  '331', // Topic
  '332', // Topic
  '333', // Topic
  '353', // Names
  '366', // End Names
  'JOIN',
  'KICK',
  'MODE',
  'NICK',
  'NOTICE',
  'PART',
  'PING',
  'PONG',
  'PRIVMSG',
  'QUIT',
  'TOPIC',
  'WALLOPS'
];

// -------------------------------------------------------------
//
//      M A I N   C O M M A N D   P A R S E R
//
//    IRC server ---> backend --> Browser (parse here)
//
// This function will accept one line of text from IRC server
// First it will check for "HEARTBEAT" and "UPDATE" requests
// else will parse message string into prefix, command, and arugments
// then parse the command and relevant actions accordingly.
// -------------------------------------------------------------
function _parseBufferMessage (message) {
  if (message === 'HEARTBEAT') {
    // 1) Check if websocket heartbeat
    // console.log('heartbeat');
    onHeartbeatReceived();
    if (webState.showCommsMessages) {
      displayRawMessage('HEARTBEAT');
    }
  } else if (message === 'UPDATE') {
    // 2) Else check if backend requests browser to
    //       poll the state API and update
    // console.log('update');
    // calling this updates state itself
    getIrcState();
    if (webState.showCommsMessages) {
      displayRawMessage('UPDATE');
    }
  } else {
    // 3) Else, this is IRC message to be parsed for IRC browser user.

    // Internal function
    function _showNotExpiredError (errStr) {
      // current UNIX time in seconds
      const timeNow = new Date();
      const timeNowSeconds = parseInt(timeNow / 1000);
      const timeMessageSeconds = timestampToUnixSeconds(message.split(' ')[0]);
      // subtract timestamp from (possibly chached) server messages
      // and show error only if condition not expired
      if (timeNowSeconds - timeMessageSeconds < errorExpireSeconds) {
        showError(errStr);
      }
    }

    // Echo of outgoing messages prefixed with '-->' should not be exposed to parser
    if (message.split(' ')[0] === '-->') {
      if (webState.showCommsMessages) displayRawMessage(message);
      return;
    }

    // Misc server messages prefixed with 'Webserver: ' should not be exposed to parser
    if (message.split(' ')[0] === 'webServer:') {
      if (webState.showCommsMessages) displayRawMessage(message);
      return;
    }
    // Misc server messages prefixed with 'Webserver: ' should not be exposed to parser
    if (message.split(' ')[0] === 'webError:') {
      if (webState.showCommsMessages) displayRawMessage(message);
      if (message.length > 10) showError(message.slice(10));
      return;
    }

    //
    // Main Parser
    //
    // parse message into: prefix, command, and param array
    //
    const parsedMessage = _parseIrcMessage(message);
    // console.log('parsedMessage' + JSON.stringify(parsedMessage, null, 2));

    //
    // Display of server messages
    //
    if (webState.viewRawMessages) {
      // If selectred, display raw message in Hexadecimal
      if (webState.showRawInHex) displayRawMessageInHex(message);
      // then show raw server message (with control chars);
      displayRawMessage(message);
    } else {
      if (ircMessageCommandDisplayFilter.indexOf(parsedMessage.command.toUpperCase()) < 0) {
        // Message from server that are remaining
        // After command processing
        // And if not in mode to display server messages in raw format
        // then....
        // Send server message to be formatted for display
        displayFormattedServerMessage(parsedMessage, message);
      } // if (filtered)
    } // raw or server messages
    //
    // Check if server is responding with error code
    //
    if ((parseInt(parsedMessage.command) >= 400) &&
      (parseInt(parsedMessage.command) < 500)) {
      // TODO temporarily remove timestamp with slice, can use better parse.
      _showNotExpiredError(message.slice(12, message.length));
    }

    // Decoding complete, Parse commands
    //
    switch (parsedMessage.command) {
      case 'ERROR':
        // console.log(message.toString());
        // This is to popup error before registration, Bad server Password error
        if ((!ircState.ircRegistered) && (parsedMessage.params.length === 1)) {
          if (webState.cacheInhibitTimer === 0) {
            showError('ERROR ' + parsedMessage.params[0]);
          }
        }
        break;
      case 'KICK':
        displayChannelMessage(parsedMessage);
        break;
      case 'JOIN':
        displayChannelMessage(parsedMessage);
        break;
      case 'MODE':
        if (parsedMessage.params[0] === ircState.nickName) {
          // Case of me, my MODE has changed
          if (!webState.viewRawMessages) {
            displayFormattedServerMessage(parsedMessage, message);
          }
        } else if (channelPrefixChars.indexOf(parsedMessage.params[0].charAt(0)) >= 0) {
          // Case of channel name
          displayChannelMessage(parsedMessage);
        } else {
          console.log('Error message MODE to unknown recipient');
        }
        break;
      case 'NICK':
        {
          // ------------
          // Is previous nick or new nick in ANY active channel?
          // -----------
          let pureNick1 = parsedMessage.nick.toLowerCase();
          // if check nickname starts with an op character, remove it
          if (nicknamePrefixChars.indexOf(pureNick1.charAt(0)) >= 0) {
            pureNick1 = pureNick1.slice(1, pureNick1.length);
          }
          let pureNick2 = parsedMessage.params[0].toLowerCase();
          // if check nickname starts with an op character, remove it
          if (nicknamePrefixChars.indexOf(pureNick2.charAt(0)) >= 0) {
            pureNick2 = pureNick2.slice(1, pureNick2.length);
          }
          let present = false;
          if (ircState.channels.length > 0) {
            for (let i = 0; i < ircState.channels.length; i++) {
              if ((ircState.channelStates[i].joined) &&
                (ircState.channelStates[i].names.length > 0)) {
                for (let j = 0; j < ircState.channelStates[i].names.length; j++) {
                  let checkNick = ircState.channelStates[i].names[j].toLowerCase();
                  // if channel nickname start with an OP character remove it
                  if (nicknamePrefixChars.indexOf(checkNick.charAt(0)) >= 0) {
                    checkNick = checkNick.slice(1, checkNick.length);
                  }
                  if (checkNick === pureNick1) present = true;
                  if (checkNick === pureNick2) present = true;
                } // next j
              }
            } // next i
          }
          if (present) {
            displayChannelMessage(parsedMessage);
          } else {
            // Note, this will duplicate message when raw server messages
            // are enabled having one formatted and one unformatted.
            displayFormattedServerMessage(parsedMessage, message);
          }
        }
        break;
      case 'PART':
        displayChannelMessage(parsedMessage);
        break;
      case 'NOTICE':
        if ((!parsedMessage.nick) || (parsedMessage.nick.length === 0)) {
          // case of server messages, check raw disply to avoid duplication in server window
          if (!webState.viewRawMessages) {
            displayFormattedServerMessage(parsedMessage, message);
          }
        } else {
          const ctcpDelim = 1;
          if (parsedMessage.params[1] === null) parsedMessage.params[1] = '';
          if (parsedMessage.params[1].charCodeAt(0) === ctcpDelim) {
            // case of CTCP message
            _parseCtcpMessage(parsedMessage);
          } else {
            // case of server, user, and channel notices.
            displayNoticeMessage(parsedMessage);
          }
        }
        break;
      case 'PRIVMSG':
        {
          // first check for CTCP message
          const ctcpDelim = 1;
          if (parsedMessage.params[1].charCodeAt(0) === ctcpDelim) {
            // case of CTCP message
            _parseCtcpMessage(parsedMessage);
          } else {
            // else not a CTCP message
            const index = ircState.channels.indexOf(parsedMessage.params[0].toLowerCase());
            if (index >= 0) {
              displayChannelMessage(parsedMessage);
            } else {
              displayPrivateMessage(parsedMessage);
            }
          }
        }
        break;
      //
      case 'QUIT':
        // Normally QUIT messages are displayed in the channel window
        // In the case of loading messages from cache, the list of
        // channel membership names may not contain the nickname that quit.
        // So, as a special case, QUIT message on refresh or load from cache
        // will be displayed in the server window when the channel is unknown.
        // There are 3 places in the code, search: 'QUIT':
        //
        {
          // ------------
          // Is nick in ANY active channel?
          // -----------
          let pureNick = parsedMessage.nick.toLowerCase();
          // if check nickname starts with an op character, remove it
          if (nicknamePrefixChars.indexOf(pureNick.charAt(0)) >= 0) {
            pureNick = pureNick.slice(1, pureNick.length);
          }
          let present = false;
          if (ircState.channels.length > 0) {
            for (let i = 0; i < ircState.channels.length; i++) {
              if ((ircState.channelStates[i].joined) &&
                (ircState.channelStates[i].names.length > 0)) {
                for (let j = 0; j < ircState.channelStates[i].names.length; j++) {
                  let checkNick = ircState.channelStates[i].names[j].toLowerCase();
                  // if channel nickname start with an OP character remove it
                  if (nicknamePrefixChars.indexOf(checkNick.charAt(0)) >= 0) {
                    checkNick = checkNick.slice(1, checkNick.length);
                  }
                  if (checkNick === pureNick) present = true;
                } // next j
              }
            } // next i
          }
          if (present) {
            displayChannelMessage(parsedMessage);
          } else {
            // Note, this will duplicate message when raw server messages
            // are enabled having one formatted and one unformatted.
            displayFormattedServerMessage(parsedMessage, message);
          }
        }
        break;
      case 'TOPIC':
        if (channelPrefixChars.indexOf(parsedMessage.params[0].charAt(0)) >= 0) {
          // Case of channel name
          displayChannelMessage(parsedMessage);
        } else {
          console.log('Error message TOPIC to unknown channel');
        }
        break;
      case 'WALLOPS':
        displayWallopsMessage(parsedMessage);
        break;
      //
      default:
    }
  }
};
