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
// ---------------------------------------------------------------------------

'use strict';

// import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
// Import the .env file
dotenv.config({ quiet: true });

// Check requirement for minimum node version
const minNodeVersion = 22;
if (parseInt(process.version.replace('v', '').split('.')[0]) < minNodeVersion) {
  console.error('Error: this program requires node version ' +
    minNodeVersion.toString() + ' or greater.');
  process.exit(1);
}

// The NODE_ENV variable should be assigned external to the .env file
// NODE_ENV is intentionally required from the parent process because legacy modules read it before/without dotenv config loading
try {
  const dotEnvFile = fs.readFileSync('./.env', 'utf8');
  if (dotEnvFile.indexOf('NODE_ENV') >= 0) {
    console.log('Error: The environment variable NODE_ENV should be defined ' +
      'external to the .env file.');
    process.exit(1);
  }
} catch (err) {
  if (err.code !== 'ENOENT') {
    console.log(err);
    process.exit(1);
  }
}

// Verify that NODE_ENV has been assigned to a valid value
if ((!Object.hasOwn(process.env, 'NODE_ENV')) ||
((process.env.NODE_ENV !== 'development') && (process.env.NODE_ENV !== 'production'))) {
  console.log('Error: The environment variable "NODE_ENV" must be assigned to either ' +
    '"NODE_ENV=development" or "NODE_ENV=production". ' +
    'This must be done external to the .env file, if used.');
  process.exit(1);
}
// const nodeEnv = process.env.NODE_ENV || 'development';

if (!Object.hasOwn(process.env, 'ENV_VAR_CONFIG_VERSION') ||
  (process.env.ENV_VAR_CONFIG_VERSION == null) ||
  (process.env.ENV_VAR_CONFIG_VERSION !== '2')) {
  console.error('Environment variable configuration error: ENV_VAR_CONFIG_VERSION does not match expected value "2"');
  process.exit(1);
}

export const site = {
  securityContact: process.env.SITE_SECURITY_CONTACT || '',
  securityExpires: process.env.SITE_SECURITY_EXPIRES || ''
};

function _getWebsocketOriginAllowList () {
  let websocketOriginAllowList = [];
  // Case of scope from environment variable configuration
  if ((process.env.SERVER_WEBSOCKET_ORIGIN_LIST) &&
    (typeof process.env.SERVER_WEBSOCKET_ORIGIN_LIST === 'string') &&
    (process.env.SERVER_WEBSOCKET_ORIGIN_LIST.length > 0)) {
    // split to array of stings
    process.env.SERVER_WEBSOCKET_ORIGIN_LIST.split(',').forEach((originItem) => {
      const trimmedOriginItem = originItem.trim();
      if (trimmedOriginItem.length > 0) websocketOriginAllowList.push(trimmedOriginItem);
    });
  }

  if (websocketOriginAllowList.length === 0) {
    console.log('Websocket Origin allow list has not been configured (recommended).')
  }
  return websocketOriginAllowList;
}

export const server = {
  serverTlsKey: process.env.SERVER_TLS_KEY || '',
  serverTlsCert: process.env.SERVER_TLS_CERT || '',
  tls: (process.env.SERVER_TLS === 'true') || false,
  port: parseInt(process.env.SERVER_PORT || '3003'),
  pidFilename: process.env.SERVER_PID_FILENAME || '',
  instanceNumber: parseInt(process.env.SERVER_INSTANCE_NUMBER),
  logRotateInterval: process.env.SERVER_LOG_ROTATE_INTERVAL || null,
  logRotateSize: process.env.SERVER_LOG_ROTATE_SIZE || null,
  accessLogOnlyErrors: (process.env.SERVER_LOG_ONLY_ERRORS === 'true') || false,
  websocketOriginAllowList: _getWebsocketOriginAllowList(),
  csrfTokenLengthBytes: 32
};

// to avoid 0 or '0' interpreted as false
if ((!Object.hasOwn(server, 'instanceNumber')) ||
  (isNaN(server.instanceNumber)) ||
  (server.instanceNumber === undefined)) {
  server.instanceNumber = null;
}

export const session = {
  rollingCookie: (process.env.SESSION_SET_ROLLING_COOKIE === 'true') || false,
  // 604800 = 7 days (7 * 24 * 3600)
  maxAge: parseInt(process.env.SESSION_EXPIRE_SEC || '604800') * 1000,
  ttl: parseInt(process.env.SESSION_EXPIRE_SEC || '604800'),
  secret: process.env.SESSION_SECRET || null, // 'Change Me'
  enableRedis: (process.env.SESSION_ENABLE_REDIS === 'true') || false,
  redisPrefix: process.env.SESSION_REDIS_PREFIX || 'irc:',
  redisPassword: process.env.SESSION_REDIS_PASSWORD || ''
};

// returns scope as string or array of strings
function _getScope () {
  let scope = null;
  // Case of scope from environment variable configuration
  if ((process.env.OAUTH2_REMOTE_SCOPE) &&
    (typeof process.env.OAUTH2_REMOTE_SCOPE === 'string') &&
    (process.env.OAUTH2_REMOTE_SCOPE.length > 0)) {
    if (process.env.OAUTH2_REMOTE_SCOPE.indexOf(',') >= 0) {
      // first check for comma separated list, split to array of stings
      scope = [];
      process.env.OAUTH2_REMOTE_SCOPE.split(',').forEach((scopeItem) => {
        const trimmedScopeItem = scopeItem.trim();
        if (trimmedScopeItem.length > 0) scope.push(trimmedScopeItem);
      });
    } else {
      // else, use the scope string directly
      scope = process.env.OAUTH2_REMOTE_SCOPE;
    }
  }
  return scope;
}

export const oauth2 = {
  enableRemoteLogin: (process.env.OAUTH2_ENABLE_REMOTE_LOGIN === 'true') || false,
  remoteAuthHost: process.env.OAUTH2_REMOTE_AUTH_HOST || null,
  remoteCallbackHost: process.env.OAUTH2_REMOTE_CALLBACK_HOST || null,
  remoteClientId: process.env.OAUTH2_REMOTE_CLIENT_ID || null,
  remoteClientSecret: process.env.OAUTH2_REMOTE_CLIENT_SECRET || null,
  remoteScope: _getScope() || null
};

// returns array of user objects
function _getUsers () {
  let userArray = null;
  if (!oauth2.enableRemoteLogin) {
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
  return userArray;
}
export const loginUsers = _getUsers();

export const irc = {
  disableServerListEditor: (process.env.IRC_DISABLE_LIST_EDITOR === 'true') || false,
  persistIrcMessageCache: (process.env.IRC_PERSIST_MESSAGE_CACHE === 'true') || false,
  ircSocketLocalAddress: process.env.IRC_SOCKET_LOCAL_ADDRESS || null,
  serveHtmlHelpDocs: (process.env.IRC_SERVE_HTML_HELP_DOCS === 'true') || false,
  customBeepSounds: (process.env.IRC_CUSTOM_BEEP_SOUNDS === 'true') || false
};

export const proxy = {
  enableSocks5Proxy: (process.env.IRC_ENABLE_SOCKS5_PROXY === 'true') || false,
  socks5Host: process.env.IRC_SOCKS5_HOST || null,
  socks5Port: parseInt(process.env.IRC_SOCKS5_PORT) || null,
  socks5Username: process.env.IRC_SOCKS5_USERNAME || null,
  socks5Password: process.env.IRC_SOCKS5_PASSWORD || null
};

// For session cookie
if ((!(session.secret)) || (session.secret.length < 8)) {
  console.error('Error, cookie secret required');
  console.log('This may be set using the "SESSION_SECRET" environment variable.' +
    'This is a random string value used to create and validate cookie digital signatures.');
  process.exit(1);
}
if ((session.secret === '---COOKIE-SECRET-GOES-HERE---') ||
  (session.secret === 'xxxxxxxx') ||
  (session.secret === 'Lg9HLgCEmtag4Ff7')) {
  console.error('Error, Session cookie secret at default value.');
  console.log('This may be set in the "SESSION_SECRET" environment variable.' +
    'This is a random string value used to create and validate cookie digital signatures.');
  process.exit(1);
}

if (!oauth2.enableRemoteLogin) {
  if ((!Array.isArray(loginUsers)) || (loginUsers.length < 1)) {
    console.error('Error, no users or passwords have been configured for web page login.');
    console.log('The user account used for web page login is generated ' +
      'using the "genEnvVarAuthForUser_1.mjs" ' +
      'script may be used to generate the user account for environment variable configuration.');
    process.exit(1);
  }
}

export default { site, server, session, oauth2, loginUsers, irc, proxy };

// if (process.env.SHOW_CONFIG) {
//   const conf = { site, server, session, oauth2, loginUsers, irc, proxy};
//   console.log(JSON.stringify(conf, null, 2));
//   process.exit(0);
// }
