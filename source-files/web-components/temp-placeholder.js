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
  // webclient02.js
  // -----------------------------------------------------------------------
  // Private Mesage windows are created dynamically and inserted into the DOM
  // Fire this event to send channel message to listener in channel window
  //
  // -----------------------------------------------------------------------
  // :nick!~user@host.domain PRIVMSG nickname :This is private text message.
  // -----------------------------------------------------------------------
  displayPrivateMessage = (parsedMessage) => {
    const ircServerPanelEl = document.getElementById('ircServerPanel');
    if (parsedMessage.command === 'PRIVMSG') {
      const message = parsedMessage.nick +
        ' PRIVMSG: ' + parsedMessage.params[1];
      console.log(message);
      ircServerPanelEl.showPanel();
      ircServerPanelEl.displayPlainServerMessage(message);
    }
  };

  //
  // webclient.js
  playBeep1Sound = () => {
    console.log('"beep"');
  };
});
