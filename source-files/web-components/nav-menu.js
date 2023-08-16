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
// This web component contains inserts a simple dropdown menu.
//
//   * Navigation: clicking menu items will run assigned functions
//   * List of active Private Message PM panels dynamically generated
//   * List of active IRC channels dynamically generated
//   * IRC channel includes count of unread messages
//
// ------------------------------------------------------------------------------
'use strict';
customElements.define('nav-menu', class extends HTMLElement {
  constructor () {
    super();
    const template = document.getElementById('navMenuTemplate');
    const templateContent = template.content;
    this.attachShadow({ mode: 'open' })
      .appendChild(templateContent.cloneNode(true));
    this.previousChannels = [];
    this.arrayOfMenuElements = [];
  }

  handleChannelClick = (event) => {
    event.stopPropagation();
    const channelName = event.target.id
      .replace('channelMenu1', '').replace('channelMenu2', '').replace('channelMenu3', '');
    document.getElementById('channel' + channelName).showPanel();
    this.closeDropdownMenu();
  };

  _handleIrcStateChanged = () => {
    console.log('navMenu irc-state-changed event');
    // Channel list
    const channels = Array.from(window.globals.ircState.channels);

    let changed = false;
    if (channels.length !== this.previousChannels.length) {
      changed = true;
    } else {
      // channels array same number of elements
      if (channels.length > 0) {
        for (let i = 0; i < channels.length; i++) {
          if (channels[i] !== this.previousChannels[i]) changed = true;
        }
      }
    }
    if (changed) {
      console.log('navMenu channel list changed, updating menu');
      // remove previous elements
      const parentEl = this.shadowRoot.getElementById('dropdownMenuChannelContainer');
      while (parentEl.firstChild) {
        // 1 - Remove event listener
        console.log('removing event listener', parentEl.firstChild.id);
        parentEl.firstChild.removeEventListener('click', this.handleChannelClick);
        // 2 - Then delete the element from the menu
        parentEl.removeChild(parentEl.firstChild);
      }
      this.previousChannels = [];
      if (channels.length > 0) {
        for (let i = 0; i < channels.length; i++) {
          // Since there are 3 layered elements here, and event.stopPropagation() is called.
          // It is necessary to add an ID to each element, but id must be unique
          console.log('adding channel', channels[i]);
          const channelMenuItem = document.createElement('div');
          channelMenuItem.id = 'channelMenu1' + channels[i];
          channelMenuItem.classList.add('nav-group01');
          channelMenuItem.classList.add('nav-level1');
          channelMenuItem.setAttribute('channel', channels[i]);
          // insert into the menu with same collapsed attribute as other menu members in same grop
          if (this.shadowRoot.getElementById('item1_1').hasAttribute('collapsed')) {
            channelMenuItem.setAttribute('collapsed', '');
          }
          const channelNameSpan = document.createElement('span');
          channelNameSpan.id = 'channelMenu2' + channels[i];
          channelNameSpan.classList.add('mr10');
          channelNameSpan.textContent = channels[i];
          channelNameSpan.setAttribute('channel', channels[i]);
          channelMenuItem.appendChild(channelNameSpan);

          const channelMessageCount = document.createElement('div');
          channelMessageCount.id = 'channelMenu3' + channels[i];
          channelMessageCount.classList.add('global-count');
          channelMessageCount.classList.add('global-text-theme-inv-dark');
          channelMessageCount.setAttribute('title', 'Unread Message Count');
          if (document.querySelector('body').getAttribute('theme') === 'light') {
            channelMessageCount.classList.add('global-border-theme-light');
          } else {
            channelMessageCount.classList.add('global-border-theme-dark');
          }
          channelMessageCount.textContent = '0';
          channelMessageCount.setAttribute('channel', channels[i]);
          channelMenuItem.appendChild(channelMessageCount);

          this.previousChannels.push(channels[i]);
          console.log('adding event listener');
          this.shadowRoot.getElementById('dropdownMenuChannelContainer')
            .appendChild(channelMenuItem);
          channelMenuItem.addEventListener('click', this.handleChannelClick);
        }
      }
      // Used to iterate menu items to show or hide visibility
      this.arrayOfMenuElements = this.shadowRoot.querySelectorAll('.nav-level1');
    } // changed
  };

  toggleDropdownMenu = () => {
    this.shadowRoot.getElementById('navDropdownDiv').classList.toggle('nav-dropdown-div-show');
    // Make sure dropdown menu is visible by scrolling to the top when opening menu
    // if (this.shadowRoot.getElementById('navDropdownDiv').classList.contains(
    //   'nav-dropdown-div-show')) {
    //   document.dispatchEvent(new CustomEvent('global-scroll-to-top', { bubbles: true }));
    // }
  };

  closeDropdownMenu = () => {
    this.shadowRoot.getElementById('navDropdownDiv').classList.remove('nav-dropdown-div-show');
  };

  // ------------------
  // Main entry point
  // ------------------
  initializePlugin = () => {
    const redirectFlag = false;
    document.getElementById('userInfo').getLoginInfo(redirectFlag)
      .then((userinfo) => {
        // console.log('userinfo', JSON.stringify(window.globals.userinfo, null, 2));
        if ((Object.hasOwn(userinfo, 'user')) && (userinfo.user.length > 0)) {
          // Update user real name in menu header bar
          this.shadowRoot.getElementById('item5_0').textContent =
            'Logout (' + userinfo.name + ')';
        }
      })
      .catch((err) => {
        console.log(err);
      });
  };

  connectedCallback () {
    //
    // listen for global click outside the dropdown menu and close the menu
    //
    document.addEventListener('click', (event) => {
    // document.getElementById('scrollableDivId').addEventListener('click', (event) => {
      this.closeDropdownMenu();
    });
    document.addEventListener('color-theme-changed', (event) => {
      if (event.detail.theme === 'light') {
        this.shadowRoot.getElementById('navDropdownDiv').classList.remove('nav-menu-theme-dark');
        this.shadowRoot.getElementById('navDropdownDiv').classList.add('nav-menu-theme-light');
      } else {
        this.shadowRoot.getElementById('navDropdownDiv').classList.remove('nav-menu-theme-light');
        this.shadowRoot.getElementById('navDropdownDiv').classList.add('nav-menu-theme-dark');
      }
    });

    document.addEventListener('irc-state-changed', this._handleIrcStateChanged.bind(this));

    //
    // Build arrays of page elements
    //
    this.arrayOfMenuElements = this.shadowRoot.querySelectorAll('.nav-level1');

    // if click the superior button, open/close the dropdown, if expandable
    const _toggleDropdownOnMenuClick = (groupName) => {
      if (this.arrayOfMenuElements.length > 0) {
        for (let i = 0; i < this.arrayOfMenuElements.length; i++) {
          if (this.arrayOfMenuElements[i].classList.contains(groupName)) {
            if (this.arrayOfMenuElements[i].hasAttribute('collapsed')) {
              this.arrayOfMenuElements[i].removeAttribute('collapsed');
            } else {
              this.arrayOfMenuElements[i].setAttribute('collapsed', '');
            }
          }
        } // next i
      }
    };
    this.shadowRoot.getElementById('group01Button').addEventListener('click', (event) => {
      event.stopPropagation();
      _toggleDropdownOnMenuClick('nav-group01');
    });
    this.shadowRoot.getElementById('group02Button').addEventListener('click', (event) => {
      event.stopPropagation();
      _toggleDropdownOnMenuClick('nav-group02');
    });
    this.shadowRoot.getElementById('group03Button').addEventListener('click', (event) => {
      event.stopPropagation();
      _toggleDropdownOnMenuClick('nav-group03');
    });
    this.shadowRoot.getElementById('group04Button').addEventListener('click', (event) => {
      event.stopPropagation();
      _toggleDropdownOnMenuClick('nav-group04');
    });

    // --------------------------------
    // Menu functional Assignments
    // --------------------------------
    this.shadowRoot.getElementById('item1_1').addEventListener('click', (event) => {
      event.stopPropagation();
      document.getElementById('manageChannelsPanel').showPanel();
      this.closeDropdownMenu();
    });

    this.shadowRoot.getElementById('item3_1').addEventListener('click', (event) => {
      event.stopPropagation();
      document.getElementById('noticePanel').showPanel();
      this.closeDropdownMenu();
    });
    this.shadowRoot.getElementById('item4_1').addEventListener('click', (event) => {
      event.stopPropagation();
      document.getElementById('displayUtils').toggleColorTheme();
      this.closeDropdownMenu();
    });
    this.shadowRoot.getElementById('item4_2').addEventListener('click', (event) => {
      event.stopPropagation();
      document.dispatchEvent(new CustomEvent('show-all-panels', {
        detail: {
          except: [],
          debug: false
        }
      }));
      this.closeDropdownMenu();
    });
    this.shadowRoot.getElementById('item4_3').addEventListener('click', (event) => {
      event.stopPropagation();
      document.dispatchEvent(new CustomEvent('collapse-all-panels', {
        detail: {
          except: []
        }
      }));
      this.closeDropdownMenu();
    });
    this.shadowRoot.getElementById('item4_4').addEventListener('click', (event) => {
      event.stopPropagation();
      document.getElementById('debugPanel').showPanel();
      this.closeDropdownMenu();
    });
    this.shadowRoot.getElementById('item4_5').addEventListener('click', (event) => {
      // AdHoc function
      event.stopPropagation();
      const parentEl = this.shadowRoot.getElementById('dropdownMenuChannelContainer');
      if (parentEl.firstChild) {
        parentEl.firstChild.removeEventListener('click', this.handleChannelClick);
      }

      // this.closeDropdownMenu();
    });
    this.shadowRoot.getElementById('item5_0').addEventListener('click', (event) => {
      event.stopPropagation();
      window.localStorage.clear();
      window.location = '/logout';
    });
  }; // connectedCallback()
});
