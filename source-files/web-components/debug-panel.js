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
// This web component is a developer interface used to debug the program.
//
// ------------------------------------------------------------------------------
'use strict';
window.customElements.define('debug-panel', class extends HTMLElement {
  constructor () {
    super();
    const template = document.getElementById('debugPanelTemplate');
    const templateContent = template.content;
    this.attachShadow({ mode: 'open' })
      .appendChild(templateContent.cloneNode(true));
  }

  showPanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDiv').setAttribute('visible', '');
  };

  // this panel does not collapse, so close it.
  collapsePanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDiv').removeAttribute('visible');
  };

  hidePanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDiv').removeAttribute('visible');
  };

  //
  // Console.log global events
  //
  _consoleLogGlobalEvents = () => {
    if (!this.loggingGlobalEvents) {
      this.loggingGlobalEvents = true;
      console.log('Logging global events to console.log');
      const eventList = [
        'collapse-all-panels',
        'color-theme-changed',
        'debounced-update-from-cache',
        'erase-before-reload',
        'global-scroll-to-top',
        'hide-all-panels',
        'irc-state-changed',
        'resize-custom-elements',
        'show-all-panels',
        'update-channel-count',
        'update-from-cache'
      ];
      eventList.forEach((eventTag) => {
        document.addEventListener(eventTag, (event) => {
          if ((event.detail) && (typeof event.detail === 'string')) {
            console.log('Event: ' + eventTag + ' ' + event.detail);
          } else if ((event.detail) && (typeof event.detail === 'object')) {
            console.log('Event: ' + eventTag + ' ' + JSON.stringify(event.detail));
          } else {
            console.log('Event: ' + eventTag);
          }
        });
      });
    }
  };

  // ------------------
  // Main entry point
  // ------------------
  initializePlugin = () => {
    // console.log('web-comp1 initializePlugin');
  };

  // -------------------------------------------
  // add event listeners to connected callback
  // -------------------------------------------
  connectedCallback () {
    // -------------------------------------
    // 1 of 3 Listeners on internal elements
    // -------------------------------------
    // -------------------------------------
    // Panel Close Button
    // -------------------------------------
    this.shadowRoot.getElementById('closePanelButton').addEventListener('click', () => {
      this.shadowRoot.getElementById('panelVisibilityDiv').removeAttribute('visible');
    });

    // -------------------------------------
    // 2 of 3 Listeners on global events
    // -------------------------------------

    /**
     * Event to collapse all panels. This panel does not collapse so it is hidden
     * @listens document:collapse-all-panels
     * @param {string|string[]} event.detail.except - No action if listed as exception
    */
    document.addEventListener('collapse-all-panels', (event) => {
      if ((event.detail) && (event.detail.except)) {
        if (typeof event.detail.except === 'string') {
          // this.id assigned in html/_index.html
          if (event.detail.except !== this.id) {
            this.collapsePanel();
          }
        } else if (Array.isArray(event.detail.except)) {
          if (event.detail.except.indexOf(this.id) < 0) {
            this.collapsePanel();
          }
        }
      } else {
        this.hidePanel();
      }
    });

    document.addEventListener('color-theme-changed', (event) => {
      if (event.detail.theme === 'light') {
        this.shadowRoot.getElementById('panelDivId')
          .classList.remove('debug-panel-theme-dark');
        this.shadowRoot.getElementById('panelDivId')
          .classList.add('debug-panel-theme-light');
      } else {
        this.shadowRoot.getElementById('panelDivId')
          .classList.remove('debug-panel-theme-light');
        this.shadowRoot.getElementById('panelDivId')
          .classList.add('debug-panel-theme-dark');
      }
    });

    /**
     * Hide panel (not visible)unless listed as exception.
     * @listens document:hide-all-panels
     * @param {string|string[]} event.detail.except - No action if listed as exception
     */
    document.addEventListener('hide-all-panels', (event) => {
      if ((event.detail) && (event.detail.except)) {
        if (typeof event.detail.except === 'string') {
          // this.id assigned in html/_index.html
          if (event.detail.except !== this.id) {
            this.hidePanel();
          }
        } else if (Array.isArray(event.detail.except)) {
          if (event.detail.except.indexOf(this.id) < 0) {
            this.hidePanel();
          }
        }
      } else {
        this.hidePanel();
      }
    });

    /**
     * Make panel visible unless listed as exception.
     * @listens document:show-all-panels
     * @param {string|string[]} event.detail.except - No action if listed as exception
     */
    document.addEventListener('show-all-panels', (event) => {
      if ((event.detail) && (event.detail.except)) {
        if (typeof event.detail.except === 'string') {
          // this.id assigned in html/_index.html
          if (event.detail.except !== this.id) {
            this.showPanel();
          }
        } else if (Array.isArray(event.detail.except)) {
          if (event.detail.except.indexOf(this.id) < 0) {
            this.showPanel();
          }
        }
      } else {
        this.showPanel();
      }
    });

    // -------------------------------------
    // 2 of 3 Debug Button Listeners
    // -------------------------------------

    // Show debug function buttons
    this.shadowRoot.getElementById('showDebugFunctionsButton').addEventListener('click', () => {
      this.shadowRoot.getElementById('showDebugFunctionsDiv').setAttribute('hidden', '');
      this.shadowRoot.getElementById('debugFunctionsDiv').removeAttribute('hidden');
    });

    this.shadowRoot.getElementById('button1').addEventListener('click', () => {
      window.globals.ircState.ircConnectOn = true;
      window.globals.ircState.ircConnecting = false;
      window.globals.ircState.ircConnected = true;
      window.globals.ircState.ircRegistered = true;

      window.globals.webState.webConnectOn = true;
      window.globals.webState.webConnected = true;
      window.globals.webState.webConnecting = false;
      window.globals.webState.ircConnecting = false;
      document.dispatchEvent(new CustomEvent('irc-state-changed'));
    });

    const newChannelName = '#myNewChannel';
    this.shadowRoot.getElementById('button2').addEventListener('click', () => {
      const newName = newChannelName + window.globals.ircState.channels.length.toString();
      if (window.globals.ircState.ircRegistered === true) {
        window.globals.ircState.channels.push(newName.toLowerCase());
        window.globals.ircState.channelStates.push({
          name: newName.toLowerCase(),
          csName: newName,
          topic: 'This is an example channel topic',
          names: [
            '#nick1',
            '+NickName2',
            'OtherNick3',
            'OtherNick4'
          ],
          joined: true,
          kicked: false
        });
        document.dispatchEvent(new CustomEvent('irc-state-changed'));
      }
    });

    this.shadowRoot.getElementById('button3').addEventListener('click', () => {
      window.globals.ircState.channels = [];
      window.globals.ircState.channelStates = [];
      document.dispatchEvent(new CustomEvent('irc-state-changed'));
    });

    this.shadowRoot.getElementById('button4').addEventListener('click', () => {
    });

    this.shadowRoot.getElementById('button5').addEventListener('click', () => {
      console.log('window.globals', JSON.stringify(window.globals, null, 2));
    });

    this.shadowRoot.getElementById('button6').addEventListener('click', () => {
      document.getElementById('activitySpinner').requestActivitySpinner();
      document.getElementById('headerBar')._icons({
        webConnect: 'connected',
        ircConnect: 'connected',
        wait: true,
        away: true,
        channelUnread: true,
        privMsgUnread: true,
        noticeUnread: true,
        nickRecovery: true,
        enableAudio: true
      });
      document.getElementById('headerBar')._updateDynamicElementTitles();
    });

    this.shadowRoot.getElementById('button7').addEventListener('click', () => {
      document.getElementById('displayUtils').manualRecalcPageWidth();
    });

    this.shadowRoot.getElementById('button8').addEventListener('click', () => {
      window.globals.ircState.channelList.push('#chan' +
        window.globals.ircState.channelList.length.toString());
      document.dispatchEvent(new CustomEvent('irc-state-changed'));
    });

    this.shadowRoot.getElementById('button9').addEventListener('click', () => {
      this._consoleLogGlobalEvents();
    });
    this.shadowRoot.getElementById('button10').addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('irc-state-changed'));
    });
    this.shadowRoot.getElementById('button11').addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('hide-all-panels', {
        detail: {
          except: ['debugPanel']
        }
      }));
    });
    this.shadowRoot.getElementById('button12').addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('collapse-all-panels', {
        detail: {
          except: ['debugPanel']
        }
      }));
    });
    this.shadowRoot.getElementById('button13').addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('show-all-panels', {
        detail: {
          except: [],
          debug: false
        }
      }));
    });
  }; // connectedCallback()
}); // customElements.define
