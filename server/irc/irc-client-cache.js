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
//       IRC Server Message Cache, used to refresh web client contents
//
// This contains an array of NodeJs Buffer objects having UTF-8 encoded contents
//
// -----------------------------------------------------------------------------
//
// Note: This is only intended to provide screen refresh during periods of
// mobile phone screen lock. The size is limited. It is not intended to
// be a long term off-line cache or logger.
//
// -----------------------------------------------------------------------------
(function () {
  'use strict';

  const path = require('path');
  const fs = require('fs');
  const vars = require('./irc-client-vars');

  const credentials = JSON.parse(fs.readFileSync('./credentials.json', 'utf8'));

  // ------------------------------------------------
  // Example of data structure for message cache
  //
  // cachedArrays = {
  //   default: [
  //     'server message',
  //     'server message',
  //     'server message'
  //   ]
  //   '#mychannel': [
  //     'channel message',
  //     'channel message'
  //   ]
  // };
  // cachedInPointers = {
  //   default: 3,
  //   '#mychannel': 2
  // };

  // size in lines of text for each message cache buffer
  const cacheSize = 100; // messages
  const maximumChannelCaches = 5; // IRC channel count (excluding default cache)

  // Placeholder for primary cache variables
  let cachedArrays = null;
  let cachedInPointers = null;

  /**
   * Erase and re-initialize message cache buffers
   * This is an external API method for this module
   */
  const eraseCache = function () {
    // console.log('Cache Erased');
    cachedInPointers = {
      default: 0
    };
    cachedArrays = {
      default: []
    };
    for (let i = 0; i < cacheSize; i++) {
      cachedArrays.default.push(null);
    }
  };

  // On program start, initialize the message cache buffers
  eraseCache();

  /**
   * Find WALLOPS messages in cache and delete them
   * This is an external API method for this module
   */
  const eraseCacheWallops = function () {
    if (cachedArrays.default.length === cacheSize) {
      for (let i = 0; i < cacheSize; i++) {
        if (!(cachedArrays.default[i] == null)) {
          // Line is stored in array as type utf-8 encoded Buffer
          const lineWords = cachedArrays.default[i].toString('utf8').split(' ');
          if ((lineWords.length > 3) && (lineWords[2].toUpperCase() === 'WALLOPS')) {
            // erase the array element
            cachedArrays.default[i] = null;
          }
        }
      }
    }
  };

  /**
   * Find NOTICE messages in cache and delete them
   * Find CTCP requests that are not an ACTION and delete them.
   *
   * This is an external API method for this module
   */
  const eraseCacheNotices = function () {
    if (cachedArrays.default.length === cacheSize) {
      for (let i = 0; i < cacheSize; i++) {
        if (!(cachedArrays.default[i] == null)) {
          // Line is stored in array as type utf-8 encoded Buffer
          const lineWords = cachedArrays.default[i].toString('utf8').split(' ');
          if ((lineWords.length > 4) && (lineWords[2].toUpperCase() === 'NOTICE')) {
            // Check that this user notice, not a channel notice message
            if (vars.channelPrefixChars.indexOf(lineWords[3].charAt(0)) < 0) {
              // erase the array element
              cachedArrays.default[i] = null;
            }
          } else if ((lineWords.length > 4) && (lineWords[2].toUpperCase() === 'PRIVMSG')) {
            // Check if this is CTCP request sent as PRIVMSG that is not an ACTION
            // 58 = : and 1 = CTCP delimiter
            if ((lineWords[4].length > 1) &&
              (lineWords[4].charCodeAt(0) === 58) &&
              (lineWords[4].charCodeAt(1) === 1) &&
              (lineWords[4].toUpperCase().indexOf('ACTION') < 0)) {
              // erase the array element
              cachedArrays.default[i] = null;
            }
          }
        }
      }
    }
  };

  /**
   * Find all PRIVMSG messages in cache, then...
   * A) Determine if they are channel or user PM, erase if user PM
   * B) Determine if it is a CTCP request that an not an ACTION and erase
   *
   * This is an external API method for this module
   */
  const eraseCacheUserPM = function () {
    if (cachedArrays.default.length === cacheSize) {
      for (let i = 0; i < cacheSize; i++) {
        if (!(cachedArrays.default[i] == null)) {
          // Line is stored in array as type utf-8 encoded Buffer
          const lineWords = cachedArrays.default[i].toString('utf8').split(' ');
          if ((lineWords.length > 4) && (lineWords[2].toUpperCase() === 'PRIVMSG')) {
            // Check that this user PRIVMSG (private message),
            // and it is not a channel PRIVMSG command (public message)
            if ((vars.channelPrefixChars.indexOf(lineWords[3].charAt(0)) < 0) &&
              (lineWords[4].length > 1) &&
              (
                // ... check if it is not CTCP request sent as PRIVMSG
                (
                  (lineWords[4].charCodeAt(0) === 58) &&
                  (lineWords[4].charCodeAt(1) !== 1)
                ) ||
                // ... or ... check if it a CTCP request that is an ACTION
                (
                  (lineWords[4].charCodeAt(0) === 58) &&
                  (lineWords[4].charCodeAt(1) === 1) &&
                  (lineWords[4].toUpperCase().indexOf('ACTION') >= 0)
                )
              )) {
              // erase the array element
              cachedArrays.default[i] = null;
            }
          }
        }
      }
    }
  };

  // ----------------------
  // Notes on QUIT messages
  // ----------------------
  // In the IRC protocol, QUIT message do not contain an IRC channel names.
  //
  // Example: ":nick!user@host QUIT :Reason for quitting"
  //
  // It is up to the IRC client to identify all channels where the QUIT nick is present.
  // This is done by maintaining a list of IRC channels in ircState.channels[].
  // Each IRC channel also maintains a list of members in ircState.channelStates[].names[]
  // In a channel window, QUIT activities are display if the member was present in the list.
  //
  // In the case where the web browser reloads content from the cache,
  // the member list may be out of date. Nicknames may or may not
  // still be present in the channel. Therefore the channel name must be stored.
  //
  // A custom IRC message type "cachedQUIT" has been created. This is similar
  // to a normal QUIT message except the channel name is added.
  // The message is duplicated for each IRC channel.
  //
  // Example:  ":nick!user@host cachedQUIT #channel :Reason for quitting"
  //
  // As real time messages are received from the IRC server, standard QUIT messages
  // are parsed directly. When the browser content is deleted and restored from
  // the IRC message cache, the alternate cachedQUIT messages are used.
  //

  /**
   * Parse IRC message to determine if it is QUIT command.
   * In the case of a QUIT command, generate an Array containing
   * a list of IRC channels where the QUIT nickname has membership.
   *
   * @param {Buffer} message - IRC server message encoded as UTF-8 Buffer.
   * @returns {Object} - Returns object with isQuit flag and Array of IRC channels
   */
  function _parseQuitChannels (message) {
    // First convert to a UTF-8 string
    let messageUtf8 = null;
    if (Buffer.isBuffer(message)) messageUtf8 = message.toString('utf8');
    if (typeof message === 'string') messageUtf8 = message;
    // then separate the string into an array of words
    const messageWords = messageUtf8.split(' ');
    if (messageWords.length > 1) {
      // check if the command word is QUIT?
      if (
        // messageWords[1] is optional prefix ':xxxx'
        (messageWords[1].charAt(0) === ':') &&
        // Since word[1] is a prefix, then word[2] must be the command
        (messageWords[2].toUpperCase() === 'QUIT')) {
        // Yes, it is a QUIT command, next get the associated IRC nickname
        const nick = messageWords[1].split('!')[0].replace(':', '');
        const channels = [];
        if (vars.ircState.channelStates.length > 0) {
          // Iterate through each IRC channel
          for (let i = 0; i < vars.ircState.channelStates.length; i++) {
            const channelStateObj = vars.ircState.channelStates[i];
            if (channelStateObj.names.length > 0) {
              // Iterate through each nickname in the channel names list
              for (let j = 0; j < channelStateObj.names.length; j++) {
                // if nickname is a member of the IRC channel, add it to the array
                let tempNick = channelStateObj.names[j].toLowerCase();
                if (vars.nicknamePrefixChars.indexOf(tempNick.charAt(0)) >= 0) {
                  tempNick = tempNick.slice(1, tempNick.length);
                }
                if (tempNick === nick.toLowerCase()) {
                  channels.push(channelStateObj.name);
                }
              } // next j
            } // length > 0
          } // next i
        } // length > 0
        if (channels.length === 0) {
          channels.push('default');
        }
        //
        // return the array of membership channel names
        return {
          isQuit: true,
          channels: channels
        };
      } else {
        // Case of not QUIT message, should be displayed
        return {
          isQuit: false,
          channels: []
        };
      }
    } else {
      // case of un-parsable message, should be displayed
      return {
        isQuit: false,
        channels: []
      };
    }
  } // _parseQuitChannels()

  /**
   * Parse IRC message to determine if it is NICK command.
   * In the case of a NICK command, generate an Array containing
   * a list of IRC channels where the previous nickname has membership.
   *
   * @param {Buffer} message - IRC server message encoded as UTF-8 Buffer.
   * @returns {Object} - Returns object with isNick flag and Array of IRC channels
   */
  function _parseNickChannels (message) {
    // First convert to a UTF-8 string
    let messageUtf8 = null;
    if (Buffer.isBuffer(message)) messageUtf8 = message.toString('utf8');
    if (typeof message === 'string') messageUtf8 = message;
    // then separate the string into an array of words
    const messageWords = messageUtf8.split(' ');
    if (messageWords.length > 2) {
      // check if the command word is NICK?
      if (
        // messageWords[1] is optional prefix ':xxxx'
        (messageWords[1].charAt(0) === ':') &&
        // Since word[1] is a prefix, then word[2] must be the command
        (messageWords[2].toUpperCase() === 'NICK') &&
        (messageWords[3].charAt(0) === ':')) {
        // Yes, it is a NICK command, next get the previous IRC nickname
        const nick = messageWords[1].split('!')[0].replace(':', '');
        const channels = [];
        if (vars.ircState.channelStates.length > 0) {
          // Iterate through each IRC channel
          for (let i = 0; i < vars.ircState.channelStates.length; i++) {
            const channelStateObj = vars.ircState.channelStates[i];
            if (channelStateObj.names.length > 0) {
              // Iterate through each nickname in the channel names list
              for (let j = 0; j < channelStateObj.names.length; j++) {
                // if nickname is a member of the IRC channel, add it to the array
                let tempNick = channelStateObj.names[j].toLowerCase();
                if (vars.nicknamePrefixChars.indexOf(tempNick.charAt(0)) >= 0) {
                  tempNick = tempNick.slice(1, tempNick.length);
                }
                if (tempNick === nick.toLowerCase()) {
                  channels.push(channelStateObj.name);
                }
              } // next j
            } // length > 0
          } // next i
        } // length > 0
        //
        // Case of own nickname being changed,
        // add separate listing to the cache
        if (vars.ircState.nickName.toLowerCase() === nick.toLowerCase()) {
          channels.push('default');
        }
        // fallback, always something in server window
        if (channels.length === 0) {
          channels.push('default');
        }
        //
        // return the array of membership channel names
        return {
          isNick: true,
          channels: channels
        };
      } else {
        // Case of not NICK message, should be displayed
        return {
          isNick: false,
          channels: []
        };
      }
    } else {
      // case of un-parsable message, should be displayed
      return {
        isNick: false,
        channels: []
      };
    }
  } // _parseNickChannels()

  //
  // _channelCommands is a list of IRC server commands
  // that should be segregated to a dedicated channel cache buffer.
  //
  // QUIT and NICK are not included due to special case handling
  const _channelCommands = [
    'JOIN',
    'KICK',
    'MODE',
    'NOTICE',
    'PART',
    'PRIVMSG',
    'TOPIC'
  ];

  /**
   * Check if IRC command is in list of channel allowed cache commands
   * If so, extract the channel name from the IRC message as a string
   * Else return 'default' if not in the list of allowed commands.
   *
   * @param {Buffer} message - IRC server message encoded as UTF-8 Buffer.
   * @returns {String} - Returns IRC channel name, else returns 'default'
   */
  function _extractChannel (message) {
    let channel = 'default';
    // First convert to a UTF-8 string
    let messageUtf8 = null;
    if (Buffer.isBuffer(message)) messageUtf8 = message.toString('utf8');
    if (typeof message === 'string') messageUtf8 = message;
    // then separate the string into an array of words
    const messageWords = messageUtf8.split(' ');
    if (messageWords.length > 2) {
      if (_channelCommands.indexOf(messageWords[2].toUpperCase()) >= 0) {
        // Check if the command word is JOIN?
        // In the RFC protocol, the JOIN channel name starts with a colon :
        // In the case of JOIN messages, remove the ":"
        if (
          // messageWords[1] is optional prefix ':xxxx'
          (messageWords[1].charAt(0) === ':') &&
          // Since word[1] is a prefix, then word[2] must be the command
          (messageWords[2].toUpperCase() === 'JOIN') &&
          // And it is a valid channel name
          (messageWords[3].length > 2) &&
          (messageWords[3].charAt(1) === '#')) {
          // remove colon from JOIN :#channel
          channel = messageWords[3].replace(':', '').toLowerCase();
        } else if (
          // messageWords[1] is optional prefix ':xxxx'
          (messageWords[1].charAt(0) === ':') &&
          // Since word[1] is a prefix, then word[2] must be the command
          (messageWords[2].toUpperCase() === 'MODE') &&
          // Check if MODE command for user instead of channel
          (messageWords[3].charAt(0) !== '#')) {
          channel = 'default';
        } else if (
          // make sure this is :prefix command #channel ...
          (messageWords[1].charAt(0) === ':') &&
          // and check if valid channel name
          (messageWords[3].length > 1) &&
          (messageWords[3].charAt(0) === '#')) {
          channel = messageWords[3].toLowerCase();
        } else {
          channel = 'default';
        }
      }
    }
    if ((channel !== 'default') && (channel.charAt(0) !== '#')) {
      channel = 'default';
    }
    // return string with channel name or else return null
    return channel;
  }

  const excludedMessageList = [
    // Body of MOTD
    '372',
    // TOPIC reply
    '332',
    '333',
    // JOIN channel Names list response
    '353',
    '366',
    // ADMIN
    '256',
    '257',
    '258',
    '259',
    // LINKS
    '364',
    '365',
    // LIST response
    '321',
    '322',
    '323',
    // WHO response
    '315',
    '352',
    // WHOIS response
    '275',
    '307',
    '311',
    '312',
    '313',
    '317',
    '318',
    '319',
    '330',
    '338',
    '378',
    '379',
    '671',
    // Channel URL
    '328'
  ];

  /**
   * Function to extract the IRC command from the IRC message.
   * If the command is included in the excluded command list
   * return a flag to exclude this IRC command from storage into the cache
   *
   * @param {Buffer} message - IRC server message encoded as UTF-8 Buffer.
   * @returns {Boolean} - Returns true if message NOT in the exclude list, else return false.
   */
  function _checkExclusionFilter (message) {
    // First convert to a UTF-8 string
    let messageUtf8 = null;
    if (Buffer.isBuffer(message)) messageUtf8 = message.toString('utf8');
    if (typeof message === 'string') messageUtf8 = message;
    // then separate the string into an array of words
    const messageWords = messageUtf8.split(' ');
    if ((excludedMessageList.length > 0) && (messageWords.length > 1)) {
      if (
        // messageWords[1] is optional prefix ':xxxx'
        (messageWords[1].charAt(0) === ':') &&
        // Since word[1] is a prefix, then word[2] must be the command
        (excludedMessageList.indexOf(messageWords[2].toUpperCase()) >= 0)) {
        // case of found, false === don't show message
        return false;
      } else {
        return true; // true === show the message
      }
    } else {
      // Cant check to go ahead
      return true; // true === show the message
    }
  } // _checkExclusionFilter()

  /**
   * Internal function to add a single IRC message to the proper IRC channel cache buffer
   *
   * @param {String} message - String containing IRC channel name or 'default'.
   * @param {Buffer} message - IRC server message encoded as UTF-8 Buffer.
   */
  function _addMessageToCacheBuffer (indexIn, messageAsBuf) {
    let indexStr = indexIn.toLowerCase();
    if ((!(indexStr == null)) && (indexStr !== 'default')) {
      // Check if a cache buffer exists, if not, create it and fill with null
      if ((indexStr) &&
        (Object.keys(cachedArrays).indexOf(indexStr) < 0) &&
        // check if maximum number of channels is exceeded.
        (Object.keys(cachedArrays).length < maximumChannelCaches + 1)) {
        cachedInPointers[indexStr] = 0;
        cachedArrays[indexStr] = [];
        for (let i = 0; i < cacheSize; i++) {
          cachedArrays[indexStr].push(null);
        }
      }
    }
    // Possibly maximum buffers exceeded, use default buffer
    if (Object.keys(cachedArrays).indexOf(indexStr) < 0) indexStr = 'default';

    cachedArrays[indexStr][cachedInPointers[indexStr]] = messageAsBuf;
    cachedInPointers[indexStr]++;
    if (cachedInPointers[indexStr] >= cacheSize) cachedInPointers[indexStr] = 0;
  } // _addMessageToCacheBuffer()

  /**
   * This will add an IRC message to the IRC message cache.
   * This is an external API method for this module
   *
   * @param {String} message - String containing IRC channel name or 'default'.
   */
  const addMessage = function (message) {
    // Edge case, QUIT and NICK messages do not contain channel name, may refer to multiple channels
    // see parsedQuitChannels, parsedNickChannels above...
    //
    // parsedQuitChannels contains an array of IRC channel names
    // where the nickname has channel membership
    const parsedQuitChannels = _parseQuitChannels(message);
    // parsedNickChannels contains an array of IRC channel names
    // where the nickname has channel membership
    const parsedNickChannels = _parseNickChannels(message);

    // Is IRC message a QUIT message?
    if (parsedQuitChannels.isQuit) {
      // Special case of IRC QUIT message, one user can be in multiple channels at the same time
      //
      // iterate each array element (each cache buffer) and
      // then duplicate the QUIT message to that cache buffer
      parsedQuitChannels.channels.forEach(function (indexStr) {
        // Modify the QUIT message before caching duplicate copies
        // 1) Change "QUIT" to "cachedQUIT"
        // 2) Insert channel name as string value
        // Example:  ":nick!user@host cachedQUIT #channel :Reason for quitting"
        let messageAsStr = null;
        if (Buffer.isBuffer(message)) messageAsStr = message.toString('utf8');
        if (typeof message === 'string') messageAsStr = message;
        const messageAsWords = messageAsStr.split(' ');
        messageAsStr = '';
        if (messageAsWords.length > 0) {
          for (let i = 0; i < messageAsWords.length; i++) {
            if (i === 0) {
              messageAsStr += messageAsWords[i];
            } else if (i === 2) {
              if (indexStr === 'default') {
                // do not reformat QUIT messages to default buffer
                messageAsStr += ' ' + messageAsWords[i];
              } else {
                // Reformat message to alternate cacheQUIT pseudo IRC command and add channel name
                messageAsStr += ' cachedQUIT ' + indexStr;
              }
            } else {
              messageAsStr += ' ' + messageAsWords[i];
            }
          }
        }
        const messageAsBuf = Buffer.from(messageAsStr, 'utf8');
        // save it to the cache buffer
        if (Object.keys(cachedArrays).indexOf(indexStr) >= 0) {
          // console.log('Adding QUIT to ' + indexStr + ' cache buffer');
          _addMessageToCacheBuffer(indexStr, messageAsBuf);
        } else {
          // console.log('Adding QUIT to default cache buffer');
          _addMessageToCacheBuffer('default', messageAsBuf);
        }
      });
    } else if (parsedNickChannels.isNick) {
      // Special case of IRC NICK message, one user can be in multiple channels at the same time
      //
      // iterate each array element (each cache buffer) and
      // then duplicate the NICK message to that cache buffer
      parsedNickChannels.channels.forEach(function (indexStr) {
        // Modify the NICK message before caching duplicate copies
        // 1) Change "NIC" to "cachedNick"
        // 2) Insert new nickname as string value
        // Example:  ":oldNick!user@host cachedNICK #channel :newNick
        let messageAsStr = null;
        if (Buffer.isBuffer(message)) messageAsStr = message.toString('utf8');
        if (typeof message === 'string') messageAsStr = message;
        const messageAsWords = messageAsStr.split(' ');
        messageAsStr = '';
        if (messageAsWords.length > 0) {
          for (let i = 0; i < messageAsWords.length; i++) {
            if (i === 0) {
              messageAsStr += messageAsWords[i];
            } else if (i === 2) {
              messageAsStr += ' cachedNICK ' + indexStr;
            } else {
              messageAsStr += ' ' + messageAsWords[i];
            }
          }
        }
        const messageAsBuf = Buffer.from(messageAsStr, 'utf8');
        // save it to the cache buffer
        if (Object.keys(cachedArrays).indexOf(indexStr) >= 0) {
          // console.log('Adding NICK to ' + indexStr + ' cache buffer');
          _addMessageToCacheBuffer(indexStr, messageAsBuf);
        } else {
          // console.log('Adding NICK to default cache buffer');
          _addMessageToCacheBuffer('default', messageAsBuf);
        }
      });
    } else {
      // Case of not a QUIT or NICK message, this is a simple case.

      // Type conversion to UTF-8 encoded Buffer
      let messageAsBuf = null;
      if (Buffer.isBuffer(message)) messageAsBuf = Buffer.from(message);
      if (typeof message === 'string') messageAsBuf = Buffer.from(message, 'utf8');

      const parsedChannel = _extractChannel(message);
      if (_checkExclusionFilter(message)) {
        if ((parsedChannel) && (parsedChannel.length > 0)) {
          _addMessageToCacheBuffer(parsedChannel, messageAsBuf);
        } else {
          _addMessageToCacheBuffer('default', messageAsBuf);
        }
      }
    } // isQuit
  }; // addMessage()

  /**
   * Delete IRC channel cache buffer for POST /irc/prune route.
   *
   * @param {String} channelStr - Name of IRC channel to delete cache buffer
   */
  const pruneChannelCache = function (channelStr) {
    if ((!(channelStr == null)) && (channelStr.length > 0) &&
      (channelStr !== 'default')) {
      if ((channelStr in cachedArrays) && (channelStr in cachedInPointers)) {
        // Case of channel message cached in own array buffer
        delete cachedArrays[channelStr];
        delete cachedInPointers[channelStr];
      } else {
        // Case of maximum channel buffer count exceeded, and
        // channel messages were stored in the default cache array
        if (cachedArrays.default.length === cacheSize) {
          for (let i = 0; i < cacheSize; i++) {
            if (!(cachedArrays.default[i] == null)) {
              // Valid message types:
              // Note JOIN is special case
              const validCachedChanMsgs = [
                'KICK',
                'MODE',
                'NOTICE',
                'PART',
                'PRIVMSG',
                'TOPIC',
                'cachedNICK'.toUpperCase(),
                'cachedQUIT'.toUpperCase()
              ];
              // Line is stored in array as type utf-8 encoded Buffer
              const lineWords = cachedArrays.default[i].toString('utf8').split(' ');
              if (lineWords.length >= 4) {
                if ((validCachedChanMsgs.indexOf(lineWords[2].toUpperCase()) >= 0) &&
                  (lineWords[3].toLowerCase() === channelStr.toLowerCase())) {
                  // erase the array element
                  cachedArrays.default[i] = null;
                } else if ((lineWords[2].toUpperCase() === 'JOIN') &&
                (lineWords[3].toLowerCase() === (':' + channelStr.toLowerCase()))) {
                  // Special case with colon character:  nick!user@host JOIN :#channel
                  cachedArrays.default[i] = null;
                }
              }
            }
          }
        }
      }
    }
  };

  /**
   * Concatenate all cache buffers into an Array of IRC messages
   * This is an external API method for this module
   *
   * @returns {Array} - Returns an Array of UTF-8 encoded Buffers
   */
  const allMessages = function () {
    const outArray = [];
    const arrayNameList = Object.keys(cachedArrays);
    arrayNameList.forEach(function (indexStr) {
      // Check if channel buffer is listed in ircState.channels
      // If a channel is pruned, removed from ircState.channels
      // then filter the list by skipping the buffer for the pruned channel.
      if ((vars.ircState.channels.indexOf(indexStr) >= 0) ||
        (indexStr === 'default')) {
        let cacheOutPointer = cachedInPointers[indexStr];
        for (let i = 0; i < cacheSize; i++) {
          if ((cachedArrays[indexStr][cacheOutPointer]) &&
            (cachedArrays[indexStr][cacheOutPointer].length > 0)) {
            // Option 1 to send array of utf8 encoded Buffer objects
            outArray.push(cachedArrays[indexStr][cacheOutPointer]);
            // Option 2 to send array of utf8 strings
            // outArray.push(cachedArrays[indexStr][cacheOutPointer].toString('utf8'));
          }
          cacheOutPointer++;
          if (cacheOutPointer >= cacheSize) cacheOutPointer = 0;
        }
      }
    });
    return outArray;
  };

  /**
   * Returns data related to size of the message cach3
   * This is an external API method for this module
   *
   * @returns {Object} - Returns Object with properties showing the size of the cache
   */
  const cacheInfo = function () {
    let size = 0;
    let lines = 0;
    const arrayNameList = Object.keys(cachedArrays);
    arrayNameList.forEach(function (indexStr) {
      for (let i = 0; i < cacheSize; i++) {
        if ((!(cachedArrays[indexStr][i] == null)) && (cachedArrays[indexStr][i].length > 0)) {
          lines++;
          size += cachedArrays[indexStr][i].length;
        }
      }
    });
    const info = {};
    info.sizeCache = cacheSize;
    info.buffers = Object.keys(cachedArrays).length;
    // maxBuffers = channel buffers + 1 default buffer
    info.maxBuffers = maximumChannelCaches + 1;
    info.usedLines = lines;
    info.sizeInBytes = size;
    return info;
  };

  // ---------------------------------------------------------
  // Optional Code Section
  //
  // Enabled by credentials.persistIrcMessageCache === true
  //
  // In this section of the code, functionality has been added
  // to automatically save and restore the IRC message cache
  // across web server restarts.
  //
  // File format
  //
  // {
  //   "timestamp":1659402194,
  //   "hasBeenUsed": false,
  //   "cacheInPointer": 44,
  //   "cacheArray": [
  //     "UTF-8 String",
  //     "UTF-8 String",
  //        ...
  //     "UTF-8 String",
  //     null,
  //     null,
  //        ...
  //     null
  //   ]
  // }
  // ---------------------------------------------------------

  // Note: The log folder is created automatically with
  // write permission in the alternate module server/irc/irc-client-log.js
  const cacheFilename = path.join(__dirname, '../../logs/savedMessageCache.json');
  // Cache file must be used within 5 minutes.
  const cacheReloadWindowSeconds = 300;

  // ----------------------------
  // Part 1 - Save on Shutdown
  // ----------------------------

  //
  // terminalSignalHandler is called after receiving Unix SIGINT or SIGTERM
  // Cache data is converted from Array of Buffer to
  // an Array of type utf8 String and saved as JSON encoded Object to a file.
  // After file I/O is complete, callback exits program with status 0
  //
  const terminateSignalHandler = function (signal) {
    const now = new Date();
    // timestamp in seconds
    const timestamp = parseInt(now.getTime() / 1000);

    const stringArrays = {};
    const arrayNameList = Object.keys(cachedArrays);
    arrayNameList.forEach(function (indexStr) {
      stringArrays[indexStr] = [];
      for (let i = 0; i < cacheSize; i++) {
        if (cachedArrays[indexStr][i] == null) {
          stringArrays[indexStr].push(null);
        } else {
          stringArrays[indexStr].push(cachedArrays[indexStr][i].toString('utf8'));
        }
      }
    });

    const encodedCache = JSON.stringify(
      {
        timestamp: timestamp,
        hasBeenUsed: false,
        cachedInPointers: cachedInPointers,
        cachedArrays: stringArrays
      }
    );
    // Asynchronous File I/O
    fs.writeFile(
      cacheFilename,
      encodedCache,
      {
        encoding: 'utf8',
        mode: 0o600,
        flag: 'w'
      },
      function (err) {
        if (err) {
          console.log('\nReceived ' + signal + ' ' + now.toISOString());
          console.log('Error writing message cache. Server exit(1)');
          console.error(err);
          process.exit(1);
        } else {
          console.log('\nReceived ' + signal + ' ' + now.toISOString());
          console.log('Message cache written. Server exit(0)');
          process.exit(0);
        }
      }
    );
  }; // terminateSignalHandler()

  //
  // This event handler will listen for Unix operating system SIGINT and SIGTERM signals.
  // Upon receiving SIGINT or SIGTERM initiate function to asynchronously.
  // write the message cache to a file.
  // The program will exit with status 0 if the file is successfully saved.
  //
  let acceptSignalsFlag = true;
  if (credentials.persistIrcMessageCache) {
    process.on('SIGINT', function (signal) {
      if (acceptSignalsFlag) {
        acceptSignalsFlag = false;
        terminateSignalHandler(signal);
      }
    });
    process.on('SIGTERM', function (signal) {
      if (acceptSignalsFlag) {
        acceptSignalsFlag = false;
        terminateSignalHandler(signal);
      }
    });

    // ----------------------------
    // Part 2 - Restore on restart
    // ----------------------------

    //
    // This function runs automatically on program start.
    //
    // If a file containing the previous message cache exists, then
    // it will asynchronously read the file, import the message cache,
    // restore cache pointer, then remove the data from the file.
    // Data is converted from Array of type utf-8 String to Array of type Buffer.
    //
    // For the case where the file does not exist, or has already been loaded,
    // or has an expired timestamp, the message cache will default to
    // an empty array without throwing any errors.
    //

    // The following runs at program load
    (function () {
      const now = new Date();
      // timestamp in seconds
      const timeNow = parseInt(now.getTime() / 1000);
      fs.readFile(
        cacheFilename,
        {
          encoding: 'utf8'
        },
        function (err, data) {
          if (!err) {
            let decoded = null;
            try {
              decoded = JSON.parse(data);
            } catch (error) {
              console.log('Error decoding previous message cache JSON format');
              console.error(error);
              process.exit(1);
            }
            if ((decoded) && (!decoded.hasBeenUsed)) {
              if (timeNow - decoded.timestamp < cacheReloadWindowSeconds) {
                // Check for legacy file format, skip if found
                // Prior to v0.1.14, 'cachedArrays' was 'cacheArray'
                if (('cachedInPointers' in decoded) &&
                  ('cachedArrays' in decoded)) {
                  // Directly restore the circular buffer array pointers
                  cachedInPointers = decoded.cachedInPointers;
                  // List of array keys, example: ['default', '#channel1', '#otherchannel']
                  const arrayNameList = Object.keys(cachedInPointers);
                  // cycle through each array buffer
                  arrayNameList.forEach(function (indexStr) {
                    if ((!(cachedInPointers[indexStr] == null)) &&
                      (Array.isArray(decoded.cachedArrays[indexStr])) &&
                      (decoded.cachedArrays[indexStr].length === cacheSize)) {
                      // Convert each UTF-8 string in the array to Buffer objects.
                      cachedArrays[indexStr] = [];
                      for (let i = 0; i < cacheSize; i++) {
                        if (decoded.cachedArrays[indexStr][i] == null) {
                          cachedArrays[indexStr].push(null);
                        } else {
                          // console.log(i, decoded.cacheArray[i]);
                          cachedArrays[indexStr].push(
                            Buffer.from(decoded.cachedArrays[indexStr][i], 'utf8'));
                        }
                      } // for (let i=...)
                    }
                  }); // forEach
                  console.log('Message cache loaded from file');
                } else {
                  console.log('Message cache: legacy format detected, not reloaded.');
                }
              } else {
                console.log('Message cache expired, not reloaded.');
              }
              const encodedCache = JSON.stringify(
                {
                  timestamp: timeNow,
                  hasBeenUsed: true,
                  cachedInPointers: {
                    default: 0
                  },
                  cachedArrays: {
                    default: []
                  }
                }
              );
              // Erase the old saved cache so it can not be used again.
              fs.writeFile(
                cacheFilename,
                encodedCache,
                {
                  encoding: 'utf8',
                  mode: 0o600,
                  flag: 'w'
                },
                function (err) {
                  if (err) {
                    console.log(err);
                    process.exit(1);
                  }
                }
              ); // fs.writeFile()
            } // if ((decoded) && (!decoded.hasBeenUsed)) {
          } else {
            if (err.code === 'ENOENT') {
              // If file does not exist, this is not an error, leave the cache empty.
              console.log('Message cache: File not found. Starting with empty cache');
            } else {
              console.log(err || err.toString());
              process.exit(1);
            }
          }
        } // callback function
      ); // fs.readfile
    })(); // immediate function
  } // if (credentials.persistIrcMessageCache)

  // const nodeEnv = process.env.NODE_ENV || 'development';
  // if (nodeEnv === 'development') {
  //   setInterval(() => {
  //     Object.keys(cachedArrays).forEach(function (indexStr) {
  //       cachedArrays[indexStr].forEach(function (line) {
  //         if (line) {
  //           console.log(indexStr + ': ' + line.toString('utf8'));
  //         } else {
  //           console.log(indexStr + ': null');
  //         }
  //       });
  //     });
  //     console.log(cachedInPointers);
  //   }, 15000);
  // }

  module.exports = {
    eraseCache: eraseCache,
    eraseCacheWallops: eraseCacheWallops,
    eraseCacheNotices: eraseCacheNotices,
    eraseCacheUserPM: eraseCacheUserPM,
    addMessage: addMessage,
    pruneChannelCache: pruneChannelCache,
    allMessages: allMessages,
    cacheInfo: cacheInfo
  };
})();
