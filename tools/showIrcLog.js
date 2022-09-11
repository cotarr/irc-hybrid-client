#!/usr/bin/env node
//
// This is a simple utility to print contents the irc.log file
//
// The output is filtered by PRIVMSG and <#hannelname>
// IRC text from other users will appear as:
//    07:42:12 nickName1:     Message text
//    07:42:31 nickName2:     This is his reply
//
// Your own messages will appear as:
//    07:43:07 -->:           This is one of my messages
//
// The log file is expected in the project folder at: logs/irc.log
//
// Since the web server may be in a different time zone from the user,
// or perhaps the web server is set to UTC, an optional location file
// may be used. If the file is not present, it will default to "en-US", "UTC".
//
// Location file in the folder at tools/showIrcLogTimeZone.json/
// Example:
// {
//   "language": "en-US",
//   "timeZone": "America/Chicago"
// }
//
// Run this utility from tools/ folder.
//
// The channel name must be in quotes due to the hash character "#"
//
// Command line: node showIrcLog.js "#channelName"
//
// The output may be pipelined such as:
//    node showIrcLog.js "#channelName" | tail -100
//    node showIrcLog.js "#channelName" | more
//
// --------------------------------------------------------------------------

const readline = require('node:readline');
const fs = require('node:fs');
const path = require('node:path');
const process = require('node:process');

if ((!process.argv) || (process.argv.length !== 3) ||
  (process.argv[2].charAt(0) !== '#')) {
  console.log('showIrcLog "<#channel>"');
  console.log();
  console.log('The channel name must start with # and be inside double quotes');
  console.log();
  process.exit(1);
}

const filePath = path.join(__dirname, '../logs/irc.log');

const locationPath = path.join(__dirname, '../tools/showIrcLogTimeZone.json');

let timeLocation = null;
try {
  timeLocation = JSON.parse(fs.readFileSync(locationPath, 'utf8'));
} catch (err) {
  if (err.code === 'ENOENT') {
    console.log('Warning: Location not found, using "en-US", "UTC"');
    console.log('To configure location: "' + locationPath + '"\n');
  } else {
    console.log(err.toString() || err);
    process.exit(1);
  }
}
if (timeLocation == null) {
  timeLocation = {
    language: 'en-US',
    timeZone: 'UTC'
  };
}

let lastDateString = '';

// The name of the IRC channel provided as command line argument
const channelNameFilter = process.argv[2].toLocaleLowerCase();

const jsTimestampToYMD = function (timestampStr) {
  let outString = null;
  if (typeof timestampStr === 'string') {
    const timeObj = new Date(timestampStr);
    // '14:33:22 UTC'
    // '06:33:22 CST'
    outString = timeObj.toLocaleDateString(timeLocation.language, {
      timeZone: timeLocation.timeZone
    }).split(' ')[0];
  } else {
    outString = null;
  }
  // console.log(timestampStr, outString);
  return outString;
};

const jsTimestampToHMS = function (timestampStr) {
  let outString = null;
  if (typeof timestampStr === 'string') {
    const timeObj = new Date(timestampStr);
    // '14:33:22 UTC'
    // '06:33:22 CST'
    outString = timeObj.toLocaleTimeString(timeLocation.language, {
      timeZone: timeLocation.timeZone,
      hour12: false,
      // Time zone name omitted, to see use: timeZoneName: 'short'
      timeZoneName: undefined
    });
  } else {
    outString = null;
  }
  // console.log(timestampStr, outString);
  return outString;
};

//
// Example Input line
// 2022-09-09T19:49:12.029Z :nickname!user@hostname PRIVMSG #channelName :This is an example message
//
function _extractPrivMsg (inStr) {
  const wordArray = inStr.split(' ');
  if (wordArray.length > 4) {
    if (
      (wordArray[1].charAt(0) === ':') &&
      (wordArray[2].toUpperCase() === 'PRIVMSG') &&
      (wordArray[3].toLowerCase() === channelNameFilter)) {
      // Print date only when changes
      const dateYMD = jsTimestampToYMD(wordArray[0]);
      if (lastDateString !== dateYMD) {
        lastDateString = dateYMD;
        console.log('\n === ' + dateYMD + ' ===\n');
      }
      const timeHMS = jsTimestampToHMS(wordArray[0]);
      const nick = wordArray[1].split('!')[0].replace(':', '');
      const mesg = inStr
        // timestamp
        .replace(wordArray[0] + ' ', '')
        // prefix
        .replace(wordArray[1] + ' ', '')
        // command
        .replace(wordArray[2] + ' ', '')
        // #channel
        .replace(wordArray[3] + ' ', '')
        // remove ending param separator (:This is message content)
        .replace(':', '');
      let pad = ' ';
      const nickWidth = 15;
      if (nick.length < nickWidth) {
        for (let i = 0; i < nickWidth - nick.length; i++) {
          pad += ' ';
        }
      }
      console.log(timeHMS + '   ' + nick + ':' + pad + mesg);
    }
  }
}

// createReadStream returns stream
const fileStream = fs.createReadStream(filePath);

const readLine = readline.createInterface({
  input: fileStream
});

// Print the filter configuration before the first line, true = need header printed
let headerFlag = true;

readLine.on('line',
  function (data) {
    // print header line at program start,then skip
    // header line is not printed if file I/O error
    if (headerFlag) {
      headerFlag = false;
      console.log('Log file: "' + filePath + '"');
      console.log('Language: "' + timeLocation.language + '"');
      console.log('Timezone: "' + timeLocation.timeZone + '"');
      console.log('Command:  "PRIVMSG"');
      console.log('Channel:  "' + process.argv[2] + '"');
    }
    // Apply filters and print the line
    _extractPrivMsg(data);
  }
);

readLine.on('error',
  function (err) {
    if (err.code === 'ENOENT') {
      console.log('File Error:\n  Unable to open ' + filePath);
      console.log('Make sure log file exists "logs/irc.log".');
      console.log(
        'Please make sure you are running this from the proper folder "tools/showIrcLog.js".');
      process.exit(1);
    } else {
      console.log(err.code);
    }
  }
);

readLine.on('close',
  function () {
    fileStream.close();
  }
);
