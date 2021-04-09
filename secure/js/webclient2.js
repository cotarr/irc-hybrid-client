// -----------------------------------
// webclient2.js Text Command Parser
// -----------------------------------

//
// inputObj = {
//   inputString: '/'+command [arguments...]
//   originType: ('channel', 'private', 'generic')
//   originName: (target channel or target private message nickname)
// }
//
// returnObj = {
//   error: false,
//   message: null, (for or string if error)
//   ircMessage: '<command> [<argument1>] [<augument2] ... [:Some output string value]'
// }
//

const textCommandParser = function(inputObj) {
  console.log('textCommandParser inputObj:' + JSON.stringify(inputObj, null, 2));

  // Internal function, detect whitespace character
  function _isWS(inChar) {
    if (inChar.charAt(0) === ' ') return true;
    if (inChar.charCodeAt(0) === 9) return true;
    return false;
  }
  function _isEOL(inChar) {
    if (inChar.charAt(0) === '\n') return true;
    if (inChar.charAt(0) === '\r') return true;
    return false;
  }

  let inStr = inputObj.inputString;

  // If tailing CR-LF, remove them
  if ((inStr.length > 0) && (_isEOL(inStr.charAt(inStr.length-1)))) {
    inStr = inStr.slice(0, inStr.length - 1);
  }
  if ((inStr.length > 0) && (_isEOL(inStr.charAt(inStr.length-1)))) {
    inStr = inStr.slice(0, inStr.length - 1);
  }

  let inStrLen = inStr.length;

  // Example decoded line
  //
  // "input string": "/test one two three four five six seven eight",
  //
  // parsedCommand {
  //   "command": "test",
  //   "params": [
  //     null,
  //     "one",
  //     "two",
  //     "three",
  //     "four",
  //     "five"
  //   ],
  //   "restOf": [
  //     "one two three four five six seven eight",
  //     "two three four five six seven eight",
  //     "three four five six seven eight",
  //     "four five six seven eight",
  //     "five six seven eight",
  //     "six seven eight"
  //   ]
  // }
  //
  let parsedCommand = {
    command: '',
    params: [],
    restOf: []
  };

  if (inStr.length < 2) {
    return {
      error: true,
      message: 'Error no command not found',
      ircMessage: null
    };
  }

  if (inStr.charAt(0) !== '/') {
    return {
      error: true,
      message: 'Error missing / before command',
      ircMessage: null
    };
  }
  if (_isWS(inStr.charAt(1))) {
    return {
      error: true,
      message: 'Error space after slash',
      ircMessage: null
    };
  }

  // character index, start after slash /
  idx = 1;

  // ----------------
  // C O M M A N D
  // ----------------
  // parse command chars until whitespace or end of string
  while ((!_isWS(inStr.charAt(idx))) && (idx < inStrLen)) {
    parsedCommand.command += inStr.charAt(idx);
    idx++;
  }
  // advance past and ignore whitespace chars until non-whitespace or end of string
  while ((_isWS(inStr.charAt(idx))) && (idx < inStrLen)) {
    idx++;
  }
  // case of command only, no tailing parameter date
  parsedCommand.command = parsedCommand.command.toUpperCase();

  // no array data pushed
  // else... more data to parse
  if (inStr.slice(idx, inStrLen).length > 0) {
    parsedCommand.params.push(null);
    parsedCommand.restOf.push(inStr.slice(idx, inStrLen));

    // ------------------------------------
    // No Param, but all is ending string
    // ------------------------------------
    // parse param chars until whitespace or end of string
    let chars1 = '';
    while ((!_isWS(inStr.charAt(idx))) && (idx < inStrLen)) {
      chars1 += inStr.charAt(idx);
      idx++;
    }
    // advance past and ignore whitespace chars until non-whitespace or end of string
    while ((_isWS(inStr.charAt(idx))) && (idx < inStrLen)) {
      idx++;
    }
    // if more to parse remaining
    if (inStr.slice(idx, inStrLen).length > 0) {
      parsedCommand.params.push(chars1);
      parsedCommand.restOf.push(inStr.slice(idx, inStrLen));
      // ------------------------------------
      // One parameter plus optional ending string
      // ------------------------------------
      // parse command chars until whitespace or end of string
      let chars2 = '';
      while ((!_isWS(inStr.charAt(idx))) && (idx < inStrLen)) {
        chars2 += inStr.charAt(idx);
        idx++;
      }
      // advance past and ignore whitespace chars until non-whitespace or end of string
      while ((_isWS(inStr.charAt(idx))) && (idx < inStrLen)) {
        idx++;
      }
      // if more to parse remaining
      if (inStr.slice(idx, inStrLen).length > 0) {
        parsedCommand.params.push(chars2);
        parsedCommand.restOf.push(inStr.slice(idx, inStrLen));
        // ------------------------------------
        // Two parameter plus optional ending string
        // ------------------------------------
        // parse command chars until whitespace or end of string
        let chars3 = '';
        while ((!_isWS(inStr.charAt(idx))) && (idx < inStrLen)) {
          chars3 += inStr.charAt(idx);
          idx++;
        }
        // advance past and ignore whitespace chars until non-whitespace or end of string
        while ((_isWS(inStr.charAt(idx))) && (idx < inStrLen)) {
          idx++;
        }
        // if more to parse remaining
        if (inStr.slice(idx, inStrLen).length > 0) {
          parsedCommand.params.push(chars3);
          parsedCommand.restOf.push(inStr.slice(idx, inStrLen));
          // ------------------------------------
          // Three parameter plus optional ending string
          // ------------------------------------
          // parse command chars until whitespace or end of string
          let chars4 = '';
          while ((!_isWS(inStr.charAt(idx))) && (idx < inStrLen)) {
            chars4 += inStr.charAt(idx);
            idx++;
          }
          // advance past and ignore whitespace chars until non-whitespace or end of string
          while ((_isWS(inStr.charAt(idx))) && (idx < inStrLen)) {
            idx++;
          }
          // if more to parse remaining
          if (inStr.slice(idx, inStrLen).length > 0) {
            parsedCommand.params.push(chars4);
            parsedCommand.restOf.push(inStr.slice(idx, inStrLen));
            // ------------------------------------
            // Four parameter plus optional ending string
            // ------------------------------------
            // parse command chars until whitespace or end of string
            let chars5 = '';
            while ((!_isWS(inStr.charAt(idx))) && (idx < inStrLen)) {
              chars5 += inStr.charAt(idx);
              idx++;
            }
            // advance past and ignore whitespace chars until non-whitespace or end of string
            while ((_isWS(inStr.charAt(idx))) && (idx < inStrLen)) {
              idx++;
            }
            // if more to parse remaining
            if (inStr.slice(idx, inStrLen).length > 0) {
              parsedCommand.params.push(chars5);
              parsedCommand.restOf.push(inStr.slice(idx, inStrLen));
              //
              // TBD if deepend needed go another cycle here
              //
            } // after 4 parameters + optional string
          } // after 3 param + optional string
        } // after 2 param + optional string
      } // after 1 param + optional string
    } // after no param + optional string
  } // after command


  console.log('Remain: >' + inStr.slice(idx, inStrLen) + '<');
  console.log('parsedCommand ' + JSON.stringify(parsedCommand, null, 2));

  // default message
  let ircMessage = null;

  switch (parsedCommand.command) {
    case 'JOIN':
      if (parsedCommand.params.length < 1) {
        return {
          error: true,
          message: 'Expect: /JOIN #channel ',
          ircMessage: null
        };
      }
      if (parsedCommand.params.length === 1) {
        ircMessage = 'JOIN ' + parsedCommand.restOf[0];
      }
      if (parsedCommand.params.length === 2) {
        ircMessage = 'JOIN ' + parsedCommand.params[1] + ' ' + parsedCommand.restOf[1];
      }
      break;
    case 'NOP':
      return {
        error: false,
        message: null,
        ircMessage: null
      };
      break;
    case 'PART':
      if (parsedCommand.params.length < 1) {
        if (inputObj.originType === 'channel') {
          ircMessage = 'PART ' + inputObj.originName;
        } else {
          return {
            error: true,
            message: 'Expect: /PART #channel [Optional message]',
            ircMessage: null
          };
        }
      } else {
        if (parsedCommand.params.length === 1) {
          // specify channel without message
          ircMessage = 'PART ' + parsedCommand.restOf[0];
        } else {
          // specify channel and PART message
          ircMessage = 'PART ' + parsedCommand.params[1] + ' :' + parsedCommand.restOf[1];
        }
      }
      break;
    case 'QUIT':
      ircMessage = 'QUIT';
      if (parsedCommand.restOf.length > 0) {
        ircMessage ='QUIT :' + parsedCommand.restOf[0];
      }
      break;
    case 'QUOTE':
      if (parsedCommand.restOf.length > 0) {
        ircMessage = parsedCommand.restOf[0];
      } else {
        return {
          error: true,
          message: 'Expect: /QUOTE RAWCOMMAND [arguments]',
          ircMessage: null
        };
      }
      break;
    default:
  }

  // parsing complete. Opon success, ircMessage will contain IRC command
  // If so, send it to IRC server.
  if (ircMessage) {
    return {
      error: false,
      message: null,
      ircMessage: ircMessage
    };
  }

  return {
    error: true,
    message: 'Command "/' + parsedCommand.command +
      '" unknown command.',
    ircMessage: null
  };
};
