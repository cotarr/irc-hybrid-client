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
//              Variable used globally in program
//
// -----------------------------------------------------------------------------
(function () {
  'use strict';

  // Excluded command list.
  // The purpose is to avoid filling the message cache up with PING, PONG
  // traffic which would cause unseen messages to scroll out of the buffer.
  //
  // These are still processed by the backend, but invisible to cache and browser.
  //
  const excludedCommands = [
    'PING',
    'PONG'
  ];

  // ircState hold main IRC state variables visible to browser and backend
  const ircState = {};
  let ircServerPassword = null;

  // Socks5 proxy variables are not included in ircState object to keep proxy
  // connection credentials private from web browser.
  let socksHost = null;
  let socksPort = null;
  let socksUsername = null;
  let socksPassword = null;

  let nsIdentifyNick = null;
  let nsIdentifyCommand = null;

  // in future these could be updated from a specific server
  let nickNameLength = 32;
  let userNameLength = 32;
  let realNameLength = 64;

  const channelPrefixChars = '@#+!';
  const channelUserModeChars = 'qaohv';
  const nicknamePrefixChars = '~&@%+';
  const commandMsgPrefix = '--> ';

  // IRC server reconnect when timer matches (time in seconds)
  const ircServerReconnectIntervals = [10, 60, 120, 180, 300, 600, 900];
  let ircServerReconnectTimerSeconds = 0;
  let ircServerReconnectChannelString = '';
  let ircServerReconnectAwayString = '';

  // Time inseconds
  const ircSocketConnectingTimeout = 10;
  const ircRegistrationTimeout = 30;

  // Time in seconds
  let activityWatchdogTimerSeconds = 0;
  const activityWatchdogTimerLimit = 300;

  // Time in seconds
  let clientToServerPingTimer = 0;
  const clientToServerPingInterval = 60;

  // used by JavaScript built in toLocaleString(locales, options.timeZone)
  let ctcpTimeLocale = ['en-US', 'UTC'];

  // Reference: https://ircv3.net/specs/extensions/server-time
  // @time=2011-10-19T16:40:51.620Z :Angel!angel@example.org PRIVMSG Wiz :Hello
  const timestamp = function () {
    const now = new Date();
    // return parseInt(now.valueOf() / 1000).toString();
    return '@time=' + now.toISOString();
  };
  const unixTimestamp = function () {
    const now = new Date();
    return parseInt(now.valueOf() / 1000).toString();
  };

  module.exports = {
    excludedCommands: excludedCommands,
    ircState: ircState,
    ircServerPassword: ircServerPassword,
    socksHost: socksHost,
    socksPort: socksPort,
    socksUsername: socksUsername,
    socksPassword: socksPassword,
    nsIdentifyNick: nsIdentifyNick,
    nsIdentifyCommand: nsIdentifyCommand,
    nickNameLength: nickNameLength,
    userNameLength: userNameLength,
    realNameLength: realNameLength,
    channelPrefixChars: channelPrefixChars,
    channelUserModeChars: channelUserModeChars,
    nicknamePrefixChars: nicknamePrefixChars,
    commandMsgPrefix: commandMsgPrefix,
    ircServerReconnectTimerSeconds: ircServerReconnectTimerSeconds,
    ircServerReconnectIntervals: ircServerReconnectIntervals,
    ircServerReconnectChannelString: ircServerReconnectChannelString,
    ircServerReconnectAwayString: ircServerReconnectAwayString,
    ircSocketConnectingTimeout: ircSocketConnectingTimeout,
    ircRegistrationTimeout: ircRegistrationTimeout,
    activityWatchdogTimerSeconds: activityWatchdogTimerSeconds,
    activityWatchdogTimerLimit: activityWatchdogTimerLimit,
    clientToServerPingTimer: clientToServerPingTimer,
    clientToServerPingInterval: clientToServerPingInterval,
    ctcpTimeLocale: ctcpTimeLocale,
    timestamp: timestamp,
    unixTimestamp: unixTimestamp
  };
})();
