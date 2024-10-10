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
'use strict';

// const nodeEnv = process.env.NODE_ENV || 'development';

// Replaced when loaded from file
const servers = {
  configVersion: -1,
  ctcpTimeLocale: ['en-US', 'UTC'],
  serverArray: []
};

// ircState hold main IRC state variables visible to browser and backend
const ircState = {};
let ircServerPassword = null;
let ircSaslUsername = null;
let ircSaslPassword = null;

// Socks5 proxy variables
let socks5Username = '';
let socks5Password = '';

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
//
// Comments:
// This program can experience occasional disconnects,
// sometimes due to TLS or Socks5 sockets being re-opened.
// that seem to be general network issues.
// In this case, the IRC client can typically reconnect
// successfully to the same IRC server without issue.
// For tis reason, a const serverRotateInhibitTimeout
// is used to inhibit IRC server rotation.
//
// In the default values, the first 3 attempts are at 10, 76, 142 seconds
// With an inhibit value of 90 seconds, the first two reconnects at
// 10 and 76 seconds will try the existing IRC server, then future
// attempts will rotate address at time intervals given by the array.
//
// It is also noted that some ident lookups on port 113 can take up to
// 45 seconds to exceed network time limits, so the
// socket connect timeout is set to 10 seconds, followed by
// nickname registration at 50 seconds limit.
// Therefore, interval spacing of reconnects should be greater than 60 seconds.
//
//
// Example: ircServerReconnectIntervals  [
//   10,76,142,208,274,340,666,992,1318,1644,1970,2296,2622,2948,3274,3600
//   4500,5400,6300,7200,9000,10800,12600,14400,18000,21600,25200,28800]
//
const ircServerReconnectIntervals = [];
// End after 10 seconds
let tempValue = 10;
ircServerReconnectIntervals.push(tempValue);
// End after 10 + (5*66) = 340 seconds
for (let i = 0; i < 5; i++) {
  tempValue += 66;
  ircServerReconnectIntervals.push(tempValue);
}
// End after 340 + (10*326) = 3600 seconds or 1 hour
for (let i = 0; i < 10; i++) {
  tempValue += 326;
  ircServerReconnectIntervals.push(tempValue);
}
// End after 3600 + (4*900) = 7200 seconds or 2 hour
for (let i = 0; i < 4; i++) {
  tempValue += 900;
  ircServerReconnectIntervals.push(tempValue);
}
// End after 7200 + (4*1800) = 14400 seconds or 4 hour
for (let i = 0; i < 4; i++) {
  tempValue += 1800;
  ircServerReconnectIntervals.push(tempValue);
}
// End after 14400 + (4*3600) = 28800 seconds or 8 hour
for (let i = 0; i < 4; i++) {
  tempValue += 3600;
  ircServerReconnectIntervals.push(tempValue);
}
// console.log('ircServerReconnectIntervals ', JSON.stringify(ircServerReconnectIntervals));

// Time in seconds
// This is to keep same server for initial reconnect
const serverRotateInhibitTimeout = 90;

let ircServerReconnectTimerSeconds = 0;
let ircServerReconnectChannelString = '';
let ircServerReconnectAwayString = '';

// Time in seconds
const ircSocketConnectingTimeout = 10;
const ircRegistrationTimeout = 50;

// Time in seconds
let activityWatchdogTimerSeconds = 0;
const activityWatchdogTimerLimit = 300;

// Time in seconds
let clientToServerPingSendTimer = 0;
let clientToServerPingResponseTimer = 0;
const clientToServerPingInterval = 60;
const clientToServerPingTimeout = 30;

// Time in milliseconds
let clientToServerPingTimestampMs = 0;

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

export default {
  servers,
  ircState,
  ircServerPassword,
  ircSaslUsername,
  ircSaslPassword,
  socks5Username,
  socks5Password,
  nsIdentifyNick,
  nsIdentifyCommand,
  nickNameLength,
  userNameLength,
  realNameLength,
  channelPrefixChars,
  channelUserModeChars,
  nicknamePrefixChars,
  commandMsgPrefix,
  ircServerReconnectTimerSeconds,
  ircServerReconnectIntervals,
  ircServerReconnectChannelString,
  ircServerReconnectAwayString,
  ircSocketConnectingTimeout,
  ircRegistrationTimeout,
  serverRotateInhibitTimeout,
  activityWatchdogTimerSeconds,
  activityWatchdogTimerLimit,
  clientToServerPingSendTimer,
  clientToServerPingResponseTimer,
  clientToServerPingTimestampMs,
  clientToServerPingInterval,
  clientToServerPingTimeout,
  ctcpTimeLocale,
  timestamp,
  unixTimestamp
};

