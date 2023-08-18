//
// Temporary file ---- TO BE DELETED ----
//
// There are dummy function used to prevent js reference errors when
// when debugging the modules before full functionality is available.
//
// ---------------------------

'use strict';
window.customElements.define('temp-placeholder', class extends HTMLElement {
  //
  // webclient.js
  playBeep1Sound = () => {
    console.log('"beep"');
  };

  // webclient03.js
  sendIrcServerMessage = (message) => {
    console.log('emulate message sent: ', message);
  };

  // webclient05.js
  textCommandParser = (inputObj) => {
    return {
      error: false,
      message: null,
      ircMessage: 'emulated string value'
    };
  };

  autoCompleteCommandList = [
    '/JOIN',
    '/PART'
  ];

  // webclient05.jps
  autoCompleteRawCommandList = [
    'JOIN',
    'PART'
  ];
});
