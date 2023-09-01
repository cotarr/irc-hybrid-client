// MIT License
//
// Copyright (c) 2021 Dave Bolenbaugh
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
// ------------------------------------------------------------------------------
//
// This JavaScript file loads globally at program start.
//
//  - Before this script runs, the /irc/webclient.html (build from source-files/html/_index.html)
//      is the  main HTML index file used to load web components.
//  - After the HTML and web components are loaded, this file "_afterLoad.js" is used
//       to run initial functions inside each web component, executed in the proper order.
//  - This script also contains a global 1 second timer that web components can hook.
//  - This script has some eventListener functions for window events that
//       are not available within web component shawDOM scope.
// ------------------------------------------------------------------------------
'use strict';
//
// Confirm web browser supports V1 Web components
//
if (!(window.customElements && document.body.attachShadow)) {
  const bodyElement = document.querySelector('body');
  bodyElement.id = 'broken';
  bodyElement.innerHTML =
    '<b>Your browser does not support Shadow DOM and Custom Elements v1.</b>';
  // do not load page
} else {
  //
  // Yes web components are supported.
  //
  // -------------------------------------------
  // Initialize each web component functionality
  // -------------------------------------------
  //
  // Do not change the order
  //
  document.getElementById('globVars').initializePlugin();
  document.getElementById('displayUtils').initializePlugin();
  document.getElementById('beepSounds').initializePlugin();
  // document.getElementById('localCommandParser').initializePlugin();
  // document.getElementById('remoteCommandParser').initializePlugin();
  // document.getElementById('ctcpParser').initializePlugin();
  document.getElementById('websocketPanel').initializePlugin();
  document.getElementById('navMenu').initializePlugin();
  document.getElementById('headerBar').initializePlugin();
  document.getElementById('serverFormPanel').initializePlugin();
  document.getElementById('serverListPanel').initializePlugin();
  document.getElementById('ircControlsPanel').initializePlugin();
  document.getElementById('ircServerPanel').initializePlugin();
  document.getElementById('wallopsPanel').initializePlugin();
  document.getElementById('noticePanel').initializePlugin();
  document.getElementById('managePmPanels').initializePlugin();

  /**
   * When requested, scroll page to top
   */
  document.addEventListener('global-scroll-to-top', function (e) {
    window.scrollTo(0, 0);
  });

  /**
   * The resize event is not available inside the shadowDOM of the custom element
   * Detect event and call the display-utils web component method.
   */
  window.addEventListener('resize', (event) => {
    document.getElementById('displayUtils').handleExternalWindowResizeEvent(event);
    document.dispatchEvent(new CustomEvent('resize-custom-elements', { bubbles: true }));
  });

  /**
   * Common task scheduler, 1 second interval timer.
   */
  setInterval(() => {
    document.getElementById('errorPanel').timerTickHandler();
    document.getElementById('displayUtils').timerTickHandler();
    document.getElementById('beepSounds').timerTickHandler();
    // document.getElementById('localCommandParser').timerTickHandler();
    // document.getElementById('remoteCommandParser').timerTickHandler();
    // document.getElementById('ctcpCommandParser').timerTickHandler();
    document.getElementById('websocketPanel').timerTickHandler();
    // document.getElementById('ircControlsPanel').timerTickHandler();
    document.getElementById('ircServerPanel').timerTickHandler();
    document.getElementById('managePmPanels').timerTickHandler();
    document.getElementById('manageChannelsPanel').timerTickHandler();
  }, 1000);

  // -----------------------------
  //   D O   T H I S   L A S T
  // -----------------------------
  document.getElementById('websocketPanel').firstWebSocketConnectOnPageLoad();
}
