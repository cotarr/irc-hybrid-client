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
    this.shadowRoot.getElementById('panelVisibilityDivId').setAttribute('visible', '');
  };

  // this panel does not collapse, so close it.
  collapsePanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible');
  };

  hidePanel = () => {
    this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible');
  };

  //
  // Console.log global events
  //
  _consoleLogGlobalEvents = () => {
    if (!this.loggingGlobalEvents) {
      this.loggingGlobalEvents = true;
      console.log('Logging global events to console.log');
      const eventList = [
        'cache-reload-done',
        'cache-reload-error',
        'cancel-beep-sounds',
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
        'update-from-cache',
        'web-connect-changed'
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
  // initializePlugin = () => {
  // };

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
    this.shadowRoot.getElementById('closePanelButtonId').addEventListener('click', () => {
      this.shadowRoot.getElementById('panelVisibilityDivId').removeAttribute('visible');
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
        this.collapsePanel();
      }
    });

    document.addEventListener('color-theme-changed', (event) => {
      const panelDivEl = this.shadowRoot.getElementById('panelDivId');
      if (event.detail.theme === 'light') {
        panelDivEl.classList.remove('debug-panel-theme-dark');
        panelDivEl.classList.add('debug-panel-theme-light');
      } else {
        panelDivEl.classList.remove('debug-panel-theme-light');
        panelDivEl.classList.add('debug-panel-theme-dark');
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
     * Special case, only open panel if debug === true
     * @listens document:show-all-panels
     * @param {string|string[]} event.detail.except - No action if listed as exception
     */
    document.addEventListener('show-all-panels', (event) => {
      if ((event.detail) && (event.detail.except)) {
        if (typeof event.detail.except === 'string') {
          // this.id assigned in html/_index.html
          if ((event.detail.except !== this.id) && (event.detail.debug)) {
            this.showPanel();
          }
        } else if (Array.isArray(event.detail.except)) {
          if ((event.detail.except.indexOf(this.id) < 0) && (event.detail.debug)) {
            this.showPanel();
          }
        }
      } else {
        if ((event.detail) && (event.detail.debug)) this.showPanel();
      }
    });

    // -------------------------------------
    // 3 of 3 Debug Button Listeners
    // -------------------------------------

    // Show debug function buttons
    this.shadowRoot.getElementById('showDebugFunctionsButtonId').addEventListener('click', () => {
      this.shadowRoot.getElementById('showdebugFunctionsDivId').setAttribute('hidden', '');
      this.shadowRoot.getElementById('debugFunctionsDivId').removeAttribute('hidden');
    });

    this.shadowRoot.getElementById('button01Id').addEventListener('click', () => {
    });

    this.shadowRoot.getElementById('button02Id').addEventListener('click', () => {
    });

    this.shadowRoot.getElementById('button03Id').addEventListener('click', () => {
    });

    this.shadowRoot.getElementById('button04Id').addEventListener('click', () => {
    });

    this.shadowRoot.getElementById('button05Id').addEventListener('click', () => {
      // returns promise
      document.getElementById('ircControlsPanel').getIrcState()
        .catch(() => {
        });
    });

    this.shadowRoot.getElementById('button06Id').addEventListener('click', () => {
      document.getElementById('activitySpinner').requestActivitySpinner();
      document.getElementById('headerBar').setHeaderBarIcons({
        hideNavMenu: false,
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

    this.shadowRoot.getElementById('button07Id').addEventListener('click', () => {
      console.log('Adhoc Function Here');
    });

    this.shadowRoot.getElementById('button08Id').addEventListener('click', () => {
    });

    this.shadowRoot.getElementById('button09Id').addEventListener('click', () => {
      this._consoleLogGlobalEvents();
    });
    this.shadowRoot.getElementById('button10Id').addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('irc-state-changed'));
    });
    this.shadowRoot.getElementById('button11Id').addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('hide-all-panels', {
        detail: {
          except: []
        }
      }));
    });
    this.shadowRoot.getElementById('button12Id').addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('collapse-all-panels', {
        detail: {
          except: []
        }
      }));
    });
    this.shadowRoot.getElementById('button13Id').addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('show-all-panels', {
        detail: {
          except: [],
          debug: true
        }
      }));
    });
    this.shadowRoot.getElementById('button14Id').addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('web-connect-changed'));
    });
    this.shadowRoot.getElementById('button17Id').addEventListener('click', () => {
      document.getElementById('showRaw').showPanel();
    });
    this.shadowRoot.getElementById('button23Id').addEventListener('click', () => {
      document.getElementById('showIrcState').showPanel();
    });
    this.shadowRoot.getElementById('button24Id').addEventListener('click', () => {
      document.getElementById('showWebState').showPanel();
    });
  }; // connectedCallback()
}); // customElements.define
