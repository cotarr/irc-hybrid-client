#!/usr/bin/env node

// This will set a new login user/password
// - This must be run from the tools folder to find credentials.json
//
//
// To run:
//    cd tools
//    node updateAuthForUser_1.js
//
import readline from 'readline';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const credentials = JSON.parse(fs.readFileSync('../credentials.json', 'utf8'));

if (credentials.configVersion > 2) {
  console.log('credentials.json error: configVersion unrecognized value');
  process.exit(1);
}

if (credentials.enableRemoteLogin === true) {
  console.log('Error: A new local web server password may not be assigned because the program' +
    ' is configured for remote login in credentials.json, enableRemoteLogin: true.');
  process.exit(1);
}

// previous version used salt as a key value pair. The hash was sha256.
// The new version uses bcrypt where salt in incorporated into the hash.
// Running this on a version 1 config will automatically update the format by removing salt.
//
if (credentials.configVersion === 1) {
  delete credentials.loginUsers[0].salt;
  credentials.configVersion = 2;
  console.log('\n\n* * * Updating credentials.json from configVersion 1 to 2 to support bcrypt\n');
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

const _sanatizeString = function (inString) {
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

console.log();
console.log('Caution, you are editing the password file');
console.log();
console.log('This will set a new login user/password for userid=1 at array index=0');
console.log('This is a static password not editable online');
console.log('It is intended there is only one user for the program');
console.log('This must be run from the tools folder to find credentials.json');

console.log('\nUser up to 16 characters a-z,A-Z,0-9');
getPass.question('Enter new user:', function (user) {
  user = _sanatizeString(_removeCRLF(user));
  if (user.length > 16) {
    console.log('Error: Exceeded maximum username 16 characters');
    process.exit(1);
  }
  console.log('\nName up to 32 characters a-z,A-Z,0-9');
  getPass.question('Enter new name (' + user + '):', function (name) {
    if (name.length === 0) name = user;
    name = _sanatizeString(_removeCRLF(name));
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
      const hash = bcrypt.hashSync(password, 10);
      credentials.loginUsers[0].user = user;
      credentials.loginUsers[0].name = name;
      credentials.loginUsers[0].hash = hash;
      const filename = '../credentials.json';
      fs.writeFileSync(filename, JSON.stringify(credentials, null, 2) + '\n', {
        encoding: 'utf8',
        mode: 0o600,
        flag: 'w'
      });
      // If file pre-exists, change permissions
      fs.chmodSync(filename, 0o600);
      getPass.close();
      console.log(JSON.stringify(credentials, null, 2));
    });
  });
});
