// MIT License
//
// Copyright (c) 2023 Dave Bolenbaugh
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
// Configuration Module
//
// This module will setup the configuration for the backend web server.
//
// The program was originally intended to use the "credentials.json" configuration file.
// In version v0.2.44 this file was created to enable UNIX environment variables
// to be used for configuration.
//
// If the file credentials.json exists, it will be used, and env variables are ignored.
// else environment variables will be used for program configuration.
//
// ---------------------------------------------------------------------------

'use strict';
/* eslint-disable max-len */

// import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
// Import the .env file
dotenv.config();

export const nodeEnv = process.env.NODE_ENV || 'development';

let credentials = null;
try {
  credentials = JSON.parse(fs.readFileSync('./credentials.json', 'utf8'));
} catch (err) {
  if ((!Object.hasOwn(err, 'code')) || (err.code !== 'ENOENT')) {
    throw err;
  }
}

// fcf abbreviation for: Found Configuration.json File
// Case of configuration file: fcf = true;
// Case of environment variables: fcf = false;
let fcf = false;
if ((credentials) && (typeof credentials === 'object') && ('configVersion' in credentials)) {
  if (credentials.configVersion === 1) {
    console.log('\nPassword hash requires regeneration due to upgrade of hash function to bcrypt.\n');
    process.exit(1);
  } else if (credentials.configVersion === 2) {
    fcf = true;
  } else {
    console.log('Error, credentials.js unknown version in credentials.json');
    process.exit(1);
  }
}

// --------------------------------------------------
// Internal function to handle 'OR' multiple input
// with mixed types number and string in
// legacy credentials.json file.
//
// Issue:
// Environment variables are strings
// File configuration.json can contain string or number
// The number 0 or string '0' can interpret as false
//
// accepts number, string, null, undefined
// returns string or null

// null      --> null
// undefined --> null
// 123       --> '123'
// 0         --> '0'
// 'abc'     --> null
// ''        --> ''
// '0'       --> '0'
// '123'     --> '123'
//
function _parseNum (stringOrNumber) {
  if (typeof stringOrNumber === 'number') {
    if (stringOrNumber === 0) {
      return '0';
    } else {
      return stringOrNumber.toString();
    }
  } else if (typeof stringOrNumber === 'string') {
    if (stringOrNumber.length === 0) {
      return '';
    } else if (isNaN(stringOrNumber)) {
      return null;
    } else {
      return stringOrNumber;
    }
  } else {
    return null;
  }
}

export const site = {
  securityContact: ((fcf) ? credentials.securityContact : process.env.SITE_SECURITY_CONTACT) || '',
  securityExpires: ((fcf) ? credentials.securityExpires : process.env.SITE_SECURITY_EXPIRES) || ''
};

export const server = {
  serverTlsKey: ((fcf) ? credentials.serverTlsKey : process.env.SERVER_TLS_KEY) || '',
  serverTlsCert: ((fcf) ? credentials.serverTlsCert : process.env.SERVER_TLS_CERT) || '',
  tls: ((fcf) ? credentials.tls : (process.env.SERVER_TLS === 'true')) || false,
  port: parseInt(((fcf) ? _parseNum(credentials.port) : process.env.SERVER_PORT) || '3003'),
  pidFilename: ((fcf) ? credentials.pidFilename : process.env.SERVER_PID_FILENAME) || '',
  instanceNumber: ((fcf) ? credentials.instanceNumber : parseInt(process.env.SERVER_INSTANCE_NUMBER)),
  logRotateInterval: ((fcf) ? credentials.logRotationInterval : process.env.SERVER_LOG_ROTATE_INTERVAL) || null,
  logRotateSize: ((fcf) ? credentials.logRotationSize : process.env.SERVER_LOG_ROTATE_SIZE) || null,
  accessLogOnlyErrors: ((fcf) ? credentials.accessLogOnlyErrors : (process.env.SERVER_LOG_ONLY_ERRORS === 'true')) || false
};

export const session = {
  rollingCookie: ((fcf) ? credentials.sessionRollingCookie : (process.env.SESSION_SET_ROLLING_COOKIE === 'true')) || false,
  // 604800 = 7 days (7 * 24 * 3600)
  maxAge: parseInt(((fcf) ? _parseNum(credentials.sessionExpireAfterSec) : process.env.SESSION_EXPIRE_SEC) || '604800') * 1000,
  ttl: parseInt(((fcf) ? _parseNum(credentials.sessionExpireAfterSec) : process.env.SESSION_EXPIRE_SEC) || '604800'),
  secret: ((fcf) ? credentials.cookieSecret : process.env.SESSION_SECRET) || 'Change Me',
  enableRedis: ((fcf) ? credentials.sessionEnableRedis : (process.env.SESSION_ENABLE_REDIS === 'true')) || false,
  redisPrefix: ((fcf) ? credentials.sessionRedisPrefix : process.env.SESSION_REDIS_PREFIX) || 'irc:',
  redisPassword: ((fcf) ? credentials.sessionRedisPassword : process.env.SESSION_REDIS_PASSWORD) || ''
};

// returns scope as string or array of strings
function _getScope (fcf, credentials) {
  let scope = null;
  if (fcf) {
    // Case of scope from credentials.json file (Override ENV variables scope)
    if ((credentials.remoteScope) &&
      ((typeof credentials.remoteScope === 'string') ||
      (Array.isArray(credentials.remoteScope)))) {
      // case of string and case of Array handled the same
      scope = credentials.remoteScope;
    }
  } else {
    // Case of scope from environment variable configuration
    if ((process.env.OAUTH2_REMOTE_SCOPE) &&
      (typeof process.env.OAUTH2_REMOTE_SCOPE === 'string') &&
      (process.env.OAUTH2_REMOTE_SCOPE.length > 0)) {
      if (process.env.OAUTH2_REMOTE_SCOPE.indexOf(',') >= 0) {
        // first check for comma separated list, split to array of stings
        scope = process.env.OAUTH2_REMOTE_SCOPE.split(',');
      } else {
        // else, use the scope string directly
        scope = process.env.OAUTH2_REMOTE_SCOPE;
      }
    }
  }
  return scope;
}

export const oauth2 = {
  enableRemoteLogin: ((fcf) ? credentials.enableRemoteLogin : (process.env.OAUTH2_ENABLE_REMOTE_LOGIN === 'true')) || false,
  remoteAuthHost: ((fcf) ? credentials.remoteAuthHost : process.env.OAUTH2_REMOTE_AUTH_HOST) || null,
  remoteCallbackHost: ((fcf) ? credentials.remoteCallbackHost : process.env.OAUTH2_REMOTE_CALLBACK_HOST) || null,
  remoteClientId: ((fcf) ? credentials.remoteClientId : process.env.OAUTH2_REMOTE_CLIENT_ID) || null,
  remoteClientSecret: ((fcf) ? credentials.remoteClientSecret : process.env.OAUTH2_REMOTE_CLIENT_SECRET) || null,
  remoteScope: _getScope(fcf, credentials) || null
};

// returns array of user objects
function _getUsers (fcf, credentials) {
  let userArray = null;
  if (!oauth2.enableRemoteLogin) {
    if (fcf) {
      if (('loginUsers' in credentials) && (Array.isArray(credentials.loginUsers))) {
        userArray = credentials.loginUsers;
      }
    } else {
      if ((process.env.LOGIN_USER_USERID) &&
        (process.env.LOGIN_USER_USER) &&
        (process.env.LOGIN_USER_NAME) &&
        (process.env.LOGIN_USER_HASH)) {
        userArray = [
          {
            userid: parseInt(process.env.LOGIN_USER_USERID),
            user: process.env.LOGIN_USER_USER,
            name: process.env.LOGIN_USER_NAME,
            hash: process.env.LOGIN_USER_HASH
          }
        ];
      }
    }
  }
  return userArray;
}

export const loginUsers = _getUsers(fcf, credentials);

export const irc = {
  disableServerListEditor: ((fcf) ? credentials.disableServerListEditor : (process.env.IRC_DISABLE_LIST_EDITOR === 'true')) || false,
  persistIrcMessageCache: ((fcf) ? credentials.persistIrcMessageCache : (process.env.IRC_PERSIST_MESSAGE_CACHE === 'true')) || false,
  ircSocketLocalAddress: ((fcf) ? credentials.ircSocketLocalAddress : process.env.IRC_SOCKET_LOCAL_ADDRESS) || null,
  serveHtmlHelpDocs: ((fcf) ? credentials.serveHtmlHelpDocs : (process.env.IRC_SERVE_HTML_HELP_DOCS === 'true')) || false,
  customBeepSounds: ((fcf) ? credentials.customBeepSounds : (process.env.IRC_CUSTOM_BEEP_SOUNDS === 'true')) || false
};

export const proxy = {
  enableSocks5Proxy: ((fcf) ? credentials.enableSocks5Proxy : (process.env.IRC_ENABLE_SOCKS5_PROXY === 'true')) || false,
  socks5Host: ((fcf) ? credentials.socks5Host : process.env.IRC_SOCKS5_HOST) || null,
  socks5Port: parseInt(((fcf) ? _parseNum(credentials.socks5Port) : process.env.IRC_SOCKS5_PORT)) || null,
  socks5Username: ((fcf) ? credentials.socks5Username : process.env.IRC_SOCKS5_USERNAME) || null,
  socks5Password: ((fcf) ? credentials.socks5Password : process.env.IRC_SOCKS5_PASSWORD) || null
};

// For session cookie
if (session.secret.length < 8) {
  console.error('Error, cookie secret required');
  process.exit(1);
}
if ((nodeEnv !== 'development') && (session.secret === 'Change Me')) {
  console.error('Error, you must assign a unique session secret to sign cookies');
  process.exit(1);
}

if (!oauth2.enableRemoteLogin) {
  if ((!Array.isArray(loginUsers)) || (loginUsers.length < 1)) {
    console.error('Configured for local authentication and no users found in password file');
    process.exit(1);
  }
}

export default { nodeEnv, site, server, session, oauth2, loginUsers, irc, proxy };

// console.log(JSON.stringify({ nodeEnv, site, server, session, oauth2, loginUsers, irc, proxy }, null, 2));
// process.exit(0);

/* eslint-enable max-len */
