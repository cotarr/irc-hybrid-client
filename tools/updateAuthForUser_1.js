#!/usr/bin/env node

// This will set a new login user/password for userid = 1
// - This is a static password not editable online
// - It is intended there is only one user for the program
// - This must be run from the tools folder to find credentials.json
//
//
// To run:
//    cd tools
//    node updateAuthForUser_1.js
//
const crypto = require('crypto');
const readline = require('readline');
const fs = require('fs');

const credentials = JSON.parse(fs.readFileSync('../credentials.json', 'utf8'));

const getPass = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function _isEOL(inChar) {
  if (inChar.charAt(0) === '\n') return true;
  if (inChar.charAt(0) === '\r') return true;
  return false;
}

function _removeCRLF (inStr) {
  // If tailing CR-LF, remove them
  if ((inStr.length > 0) && (_isEOL(inStr.charAt(inStr.length-1)))) {
    inStr = inStr.slice(0, inStr.length - 1);
  }
  if ((inStr.length > 0) && (_isEOL(inStr.charAt(inStr.length-1)))) {
    inStr = inStr.slice(0, inStr.length - 1);
  }
  return inStr;
}
console.log();
console.log('Caution, you are editing the password file');
console.log();
console.log('This will set a new login user/password for userid=1 at array index=0');
console.log('This is a static password not editable online');
console.log('It is intended there is only one user for the program');
console.log('This must be run from the tools folder to find credentials.json');
console.log();

crypto.randomBytes(16, function(err, buffer) {
  if (err) {
    throw err;
  } else {
    let salt = buffer.toString('hex');
    getPass.question('Enter new user:', function(user) {
      user = _removeCRLF(user);
      getPass.question('Enter new name (' + user + '):', function(name) {
        if (name.length === 0) name = user;
        name = _removeCRLF(name);
        getPass.question('Enter new password:', function(password) {
          password = _removeCRLF(password);
          let hash = crypto.createHash('sha256');
          hash.update(password + salt);
          credentials.loginUsers[0].user = user;
          credentials.loginUsers[0].name = name;
          credentials.loginUsers[0].salt = salt;
          credentials.loginUsers[0].hash = hash.digest('hex');
          let filename = '../credentials.json';
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
  }
});
