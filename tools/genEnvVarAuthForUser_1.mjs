#!/usr/bin/env node

// This is a tool to generate bcrypt user hash when using environment variables for configuration.
// - This will generate string output that can be copy/pasted, containing user hash
// - This must be run from the tools folder
//
//
// To run:
//    cd tools
//    node genEnvVarAuthForUser_1.mjs
//
import readline from 'readline';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config({ quiet: true, path: '../.env' });

try {
  const packageJson = JSON.parse(fs.readFileSync('../package.json', 'utf8'));
  if (!(packageJson)) {
    throw new Error('Wrong folder');
  }
} catch (e) {
  console.log('This utility should be run from the "tools/" folder');
  process.exit(1);
}

const getPass = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function _isEOL (inChar) {
  if (inChar.charAt(0) === '\n') return true;
  if (inChar.charAt(0) === '\r') return true;
  return false;
}

function _removeCRLF (inStr) {
  // If tailing CR-LF, remove them
  if ((inStr.length > 0) && (_isEOL(inStr.charAt(inStr.length - 1)))) {
    inStr = inStr.slice(0, inStr.length - 1);
  }
  if ((inStr.length > 0) && (_isEOL(inStr.charAt(inStr.length - 1)))) {
    inStr = inStr.slice(0, inStr.length - 1);
  }
  return inStr;
}

const _sanitizeUserString = function (inString) {
  let sanitizedString = '';
  const allowedChars =
    'abcdefghijklmnoqprstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  if ((typeof inString === 'string') && (inString.length > 0)) {
    for (let i = 0; i < inString.length; i++) {
      const allowedCharIndex = allowedChars.indexOf(inString[i]);
      if (allowedCharIndex > -1) {
        sanitizedString += allowedChars[allowedCharIndex];
      }
    }
  }
  return sanitizedString;
};

const _sanitizeNameString = function (inString) {
  let sanitizedString = '';
  const allowedChars =
    'abcdefghijklmnoqprstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  if ((typeof inString === 'string') && (inString.length > 0)) {
    for (let i = 0; i < inString.length; i++) {
      const allowedCharIndex = allowedChars.indexOf(inString[i]);
      if (allowedCharIndex > -1) {
        sanitizedString += allowedChars[allowedCharIndex];
      }
    }
  }
  return sanitizedString;
};

console.log();
console.log('You are running a script to generate user login environment variables.');
console.log('This is a static password not editable online.');
console.log('It is intended there is only one user for the program.');
console.log('This must be run from the tools/ folder.');
console.log();
console.log('\nUser up to 16 characters a-z,A-Z,0-9');
getPass.question('Enter new user:', function (user) {
  user = _sanitizeUserString(_removeCRLF(user));
  if (user.length > 16) {
    console.log('Error: Exceeded maximum username 16 characters');
    process.exit(1);
  }
  console.log('\nName up to 32 characters a-z,A-Z,0-9 and spaces');
  getPass.question('Enter new name (' + user + '):', function (name) {
    if (name.length === 0) name = user;
    name = _sanitizeNameString(_removeCRLF(name));
    if (name.length > 32) {
      console.log('Error: Exceeded maximum username 32 characters');
      process.exit(1);
    }
    getPass.question('\nEnter new password:', function (password) {
      // Unicode characters can be up to 4 bytes, bcrypt has maximum input 72 characters.
      const uint8PasswordArray = new TextEncoder('utf8').encode(password);
      if (uint8PasswordArray.length > 72) {
        console.log('Error: Exceeded maximum password length 72 bytes');
        process.exit(1);
      }
      password = _removeCRLF(password);
      if (password.length < 8) {
        console.log('Error: password to short. Expect >= 8 characters.');
        process.exit(1);
      }
      const hash = bcrypt.hashSync(password, 10);
      console.log('\nYou may copy/paste these environment variables\n');
      console.log('LOGIN_USER_USERID=1');
      console.log('LOGIN_USER_USER="' + user + '"');
      console.log('LOGIN_USER_NAME="' + name + '"');
      console.log('LOGIN_USER_HASH="' + hash + '"');
      getPass.close();
      //
      // Perform some sanity checks and show warning if necessary.
      //
      if ((process.env.ENV_VAR_CONFIG_VERSION) &&
        (process.env.ENV_VAR_CONFIG_VERSION !== '2')) {
        console.log('\nWarning: Based on current environment variables, it appears ' +
          'the environment variable contains an unrecognized configuration version. ' +
          '(expected: "ENV_VAR_CONFIG_VERSION=2"). ' +
          'Your configuration settings may be out of date.');
      }
      if ((process.env.OAUTH2_ENABLE_REMOTE_LOGIN) &&
        (process.env.OAUTH2_ENABLE_REMOTE_LOGIN === 'true')) {
        console.log('\nWarning: Based on current environment variables, it appears ' +
          'the program is configured to use remote login (OAUTH2_ENABLE_REMOTE_LOGIN=true).' +
          'User login credentials generated with this utility are not applicable when ' +
          'configured for remote login.');
      }
      try {
        const credentials = JSON.parse(fs.readFileSync('../credentials.json', 'utf8'));
        if (credentials) {
          console.log('\nWarning: ' +
            'The "credentials.json" file has been detected in the project base folder. ' +
            'This indicates that environment variables are not being used for configuration. ' +
            'In order to configure the program settings using environment variables the ' +
            'credentials.json file must be deleted, and all configuration settings ' +
            'entered using environment variables. Alternately, you can use the ' +
            'updateAuthForUser_1.mjs program to configure a user ' +
            'account into the credentials.json file.');
          process.exit(1);
        }
      } catch (e) {
        if (e.code !== 'ENOENT') {
          console.log(e);
          process.exit(1);
        }
        // no action, continue
      }
      // one final blank line.
      console.log();
    });
  });
});
