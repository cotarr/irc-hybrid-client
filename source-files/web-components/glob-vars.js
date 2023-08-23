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
// This web component initializes global variables on the window object
//
// ------------------------------------------------------------------------------
'use strict';
window.customElements.define('glob-vars', class extends HTMLElement {
  constants (key) {
    const constants = {
      channelPrefixChars: '@#+!',
      nicknamePrefixChars: '~&@%+',
      nickChannelSpacer: ' | ',
      pmNameSpacer: ' - ',
      // Time during which incoming messages do not trigger activity icon
      activityIconInhibitTimerValue: 10,
      cacheReloadString: '-----IRC Cache Reload-----',
      cacheErrorString: '-----IRC Cache Error-----',
      fetchTimeout: 5000
    };
    if (Object.hasOwn(constants, key)) {
      return constants[key];
    } else {
      return null;
    }
  };

  // Global variables that reside in this module
  //
  // Token to reduce risk of Cross Site Request Forgery
  csrfToken = null;
  // Private message, temporary open PM windows across reload
  listOfOpenPMPanels = [];

  webServerUrl = null;
  webSocketUrl = null;

  initializePlugin = () => {
    // --------------------
    // Global variables
    // --------------------
    //
    if (!Object.hasOwn(window, 'globals')) window.globals = Object.create(null);

    // ----------------------------------
    //  Functions related to csrfTokens
    // ----------------------------------
    try {
      this.csrfToken =
        document.querySelector('meta[name="csrf-token"]').getAttribute('content');
      if (this.csrfToken === '{{csrfToken}}') {
        console.log('The {{csrfToken}} was not replaced with dynamic data');
        this.csrfToken = null;
      }
    } catch (e) {
      console.log(e.message || e);
    }

    // ----------------------------------------------------------
    // Do not edit ircState contents from within browser.
    //
    // Object updated from getIrcState() fetch request
    //
    // ircState represents the state of the IRC connection
    //    within the backend web server.
    //
    //   R E A D   O N L Y
    //
    // ----------------------------------------------------------
    window.globals.ircState = {
      ircConnectOn: false,
      ircConnecting: false,
      ircConnected: false,
      ircRegistered: false,
      ircIsAway: false,
      ircAutoReconnect: false,
      lastPing: '0.000',

      ircServerName: '',
      ircServerHost: '',
      ircServerPort: 6667,
      ircTLSEnabled: false,
      ircServerIndex: 0,
      ircServerPrefix: '',
      channelList: [],

      nickName: '',
      userName: '',
      realName: '',
      userMode: '',

      userHost: '',
      connectHost: '',

      channels: [],
      channelStates: [],

      progVersion: '0.0.0',
      progName: '',

      times: {
        programRun: 0,
        ircConnect: 0
      },
      count: {
        ircConnect: 0,
        ircConnectError: 0
      },
      websocketCount: 0
    };

    // ---------------------------------------------------
    // webState represents state of web page in browser
    // ---------------------------------------------------
    window.globals.webState = {};
    window.globals.webState.loginUser = {};
    window.globals.webState.webConnectOn = true;
    window.globals.webState.webConnected = false;
    window.globals.webState.webConnecting = false;
    window.globals.webState.ircConnecting = false;
    window.globals.webState.ircServerEditOpen = false;
    window.globals.webState.websocketCount = 0;
    window.globals.webState.lastIrcServerIndex = -1;

    // Some IRC channel local variables (most in ircState)
    window.globals.webState.channels = [];
    window.globals.webState.channelStates = [];
    // Private message variables
    window.globals.webState.lastPMNick = '';
    window.globals.webState.activePrivateMessageNicks = [];
    window.globals.webState.times = { webConnect: 0 };
    window.globals.webState.count = {
      webConnect: 0,
      webStateCalls: 0
    };
    window.globals.webState.cacheReloadInProgress = false;

    //
    // Ping statistics
    //
    window.globals.webState.lag = {
      last: 0,
      min: 9999,
      max: 0
    };

    //
    // dynamic page layout, these values overwritten dynamically
    //
    window.globals.webState.dynamic = {
      inputAreaCharWidthPx: null,
      inputAreaSideWidthPx: null,
      sendButtonWidthPx: null,
      // commonMargin represents a space on iPHone right side thumb scroll area
      commonMargin: 50,
      lastDevicePixelRatio: 1,
      bodyClientWidth: document.querySelector('body').clientWidth,
      lastClientWidth: document.querySelector('body').clientWidth
    };
    // only if browser support devicePixelRatio
    if (window.devicePixelRatio) {
      window.globals.webState.dynamic.lastDevicePixelRatio = window.devicePixelRatio;
    }

    this.webServerUrl = 'https://';
    this.webSocketUrl = 'wss://';
    if (document.location.protocol === 'http:') {
      this.webServerUrl = 'http://';
      this.webSocketUrl = 'ws://';
    }
    this.webServerUrl += window.location.hostname + ':' + window.location.port;
    this.webSocketUrl += window.location.hostname + ':' + window.location.port;

    // -----------------------
    // WebSocket placeholder
    // -----------------------
    window.globals.wsocket = null;
  };

  // connectedCallback() {
  // }
});
