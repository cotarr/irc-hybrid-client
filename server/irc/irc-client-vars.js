(function() {
  timestamp = function() {
    let now = new Date;
    return parseInt(now.valueOf() / 1000).toString();
  };

  module.exports = {
    ircState: {},
    channelPrefixChars: '@#+!',
    channelUserModeChars: 'qaohv',
    nicknamePrefixChars: '~&@%+',
    commandMsgPrefix: '--> ',
    timestamp: timestamp
  };
})();
