#!/usr/bin/env node

// This is a tool to generate bcrypt user hash when using environment variables for configuration.
// - This will generate string output that can be copy/pasted, containing user hash
// - This must be run from the tools folder to find credentials.json
//
//
// To run:
//    cd tools
//    node genEnvVarAuthForUser_1.mjs
//
import readline from 'readline';
import bcrypt from 'bcryptjs';

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
console.log('You are running a script to generate user login environment variables.');
console.log();
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
      console.log('\nYou may copy/paste these enviornment variables\n');
      console.log('LOGIN_USER_USERID=1');
      console.log('LOGIN_USER_USER=' + user);
      console.log('LOGIN_USER_NAME=' + name);
      console.log('LOGIN_USER_HASH=' + hash);
      console.log();
      getPass.close();
    });
  });
});
