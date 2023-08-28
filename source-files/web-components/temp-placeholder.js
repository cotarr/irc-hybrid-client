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
    console.log('"beep 1"');
  };

  playBeep3Sound = () => {
    console.log('"beep 3"');
  };
});
