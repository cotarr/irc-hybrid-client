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
//    Dropdown navigation menu
//
// ------------------------------------------------------------------------------
//
//   * Navigation: clicking menu items will run assigned functions
//   * List of active Private Message PM panels dynamically generated
//   * List of active IRC channels dynamically generated
//   * IRC channel includes count of unread messages
//
// Public Methods:
//   toggleDropdownMenu()
//   closeDropdownMenu()
//   handleServerUnreadUpdate(status)
//   handleNoticeUnreadUpdate(status)
//   handleWallopsUnreadUpdate(status)
//   handlePmListUpdate()
//   handlePmPanelClick()
//    handleChannelClick()
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
    this.previousPmPanels = [];
    this.arrayOfMenuElements = [];
    this.ircConnectedLast = null;
  }

  /**
   * Make dropdown menu visible
   */
  toggleDropdownMenu = () => {
    this.shadowRoot.getElementById('navDropdownDivId').classList.toggle('nav-dropdown-div-show');
    // Make sure dropdown menu is visible by scrolling to the top when opening menu
    // if (this.shadowRoot.getElementById('navDropdownDivId').classList.contains(
    //   'nav-dropdown-div-show')) {
    //   document.dispatchEvent(new CustomEvent('global-scroll-to-top', { bubbles: true }));
    // }
  };

  /**
   * Hide dropdown menu
   */
  closeDropdownMenu = () => {
    this.shadowRoot.getElementById('navDropdownDivId').classList.remove('nav-dropdown-div-show');
  };

  /**
   * Update icons to show or hide icon for unread Server messages
   * @param {boolean} status - True will make icon visible
   */
  handleServerUnreadUpdate = (status) => {
    const itemEl = this.shadowRoot.getElementById('item3_3_Id');
    if (status) {
      itemEl.textContent = 'IRC Server (New Messages)';
    } else {
      itemEl.textContent = 'IRC Server';
    }
  };

  /**
   * Update icons to show or hide icon for unread Notice messages
   * @param {boolean} status - True will make icon visible
   */
  handleNoticeUnreadUpdate = (status) => {
    const itemEl = this.shadowRoot.getElementById('item3_5_Id');
    if (status) {
      itemEl.textContent = 'Notices (New Messages)';
    } else {
      itemEl.textContent = 'Notices';
    }
  };

  /**
   * Update icons to show or hide icon for unread Wallops messages
   * @param {boolean} status - True will make icon visible
   */
  handleWallopsUnreadUpdate = (status) => {
    const itemEl = this.shadowRoot.getElementById('item3_4_Id');
    if (status) {
      itemEl.textContent = 'Wallops (New Messages)';
    } else {
      itemEl.textContent = 'Wallops';
    }
  };

  /**
   * Called by a pm-panel element to update count of unread messages for a panel.
   */
  handlePmListUpdate = () => {
    // list of PM panels list
    const pmPanels = Array.from(window.globals.webState.activePrivateMessageNicks);
    let changed = false;
    if (pmPanels.length !== this.previousPmPanels.length) {
      changed = true;
    } else {
      // pmPanels array same number of elements
      if (pmPanels.length > 0) {
        for (let i = 0; i < pmPanels.length; i++) {
          if (pmPanels[i].toLowerCase() !== this.previousPmPanels[i].toLowerCase()) changed = true;
        }
      }
    }
    if (changed) {
      // console.log('navMenu pmPanels, array changed, updating menu');
      // remove previous elements
      const parentEl = this.shadowRoot.getElementById('dropdownMenuPrivMsgContainerId');
      while (parentEl.firstChild) {
        // 1 - Remove event listener
        parentEl.firstChild.removeEventListener('click', this.handlePmPanelClick);
        // 2 - Then delete the element from the menu
        parentEl.removeChild(parentEl.firstChild);
      }
      this.previousPmPanels = [];
      if (pmPanels.length > 0) {
        for (let i = 0; i < pmPanels.length; i++) {
          // Since there are 3 layered elements here, and event.stopPropagation() is called.
          // It is necessary to add an ID to each element, but id must be unique
          // console.log('navMenu pmPanels adding pm panel', pmPanels[i]);
          const pmPanelMenuItem = document.createElement('div');
          pmPanelMenuItem.classList.add('nav-group01');
          pmPanelMenuItem.classList.add('nav-level1');
          pmPanelMenuItem.pmPanelName = pmPanels[i].toLowerCase();
          pmPanelMenuItem.setAttribute('pm-panel-name', pmPanels[i].toLowerCase());
          // insert into the menu with same collapsed attribute as other menu members in same grop
          if (this.shadowRoot.getElementById('item1_1_Id').hasAttribute('collapsed')) {
            pmPanelMenuItem.setAttribute('collapsed', '');
          }
          const pmPanelNameSpan = document.createElement('span');
          pmPanelNameSpan.classList.add('mr10');
          // Get case sensitive pm panel name, else use lower case.
          if (pmPanels[i].toLowerCase() ===
            window.globals.webState.activePrivateMessageCsNicks[i].toLowerCase()) {
            pmPanelNameSpan.textContent =
              window.globals.webState.activePrivateMessageCsNicks[i];
          } else {
            pmPanelNameSpan.textContent = pmPanels[i];
          }
          pmPanelNameSpan.pmPanelName = pmPanels[i].toLowerCase();
          pmPanelNameSpan.setAttribute('pm-panel-name', pmPanels[i].toLowerCase());
          pmPanelMenuItem.appendChild(pmPanelNameSpan);

          const pmPanelMessageCount = document.createElement('div');
          pmPanelMessageCount.classList.add('global-count');
          pmPanelMessageCount.setAttribute('title', 'Unread Message Count');
          if (document.querySelector('body').getAttribute('theme') === 'light') {
            pmPanelMessageCount.classList.add('global-text-theme-light');
            pmPanelMessageCount.classList.add('global-border-theme-light');
          } else {
            pmPanelMessageCount.classList.add('global-text-theme-dark');
            pmPanelMessageCount.classList.add('global-border-theme-dark');
          }
          pmPanelMessageCount.textContent = '0';
          pmPanelMessageCount.setAttribute('hidden', '');
          pmPanelMessageCount.pmPanelName = pmPanels[i].toLowerCase();
          pmPanelMessageCount.setAttribute('pm-panel-name', pmPanels[i].toLowerCase());
          pmPanelMenuItem.appendChild(pmPanelMessageCount);

          this.previousPmPanels.push(pmPanels[i].toLowerCase());
          parentEl.appendChild(pmPanelMenuItem);
          pmPanelMenuItem.addEventListener('click', this.handlePmPanelClick);
        }
      }
      // Used to iterate menu items to show or hide visibility
      this.arrayOfMenuElements = this.shadowRoot.querySelectorAll('.nav-level1');
    } // changed
  };

  /**
   * Called by pm-panel to clear unread message count
   * @param {Object} event.target.pmPanelName
   */
  handlePmPanelClick = (event) => {
    event.stopPropagation();
    const privmsgName = event.target.pmPanelName.toLowerCase();
    document.getElementById('privmsg:' + privmsgName).showPanel();
    this.closeDropdownMenu();
  };

  /**
   * Event handler called when irc-state-changed fires
   */
  _handleIrcStateChanged = () => {
    // console.log('navMenu irc-state-changed event');
    // Detect state change for IRC server connection. if changed, close the dropdown
    if (window.globals.ircState.ircConnected !== this.ircConnectedLast) {
      this.ircConnectedLast = window.globals.ircState.ircConnected;
      // visible menu items will change so close the menu
      this.closeDropdownMenu();
      // List of menu items to be hidden when not connected to IRC
      const menuIdList = [
        'group01ButtonId',
        'group02ButtonId',
        'group04ButtonId',
        'item3_4_Id',
        'item3_5_Id'
      ];
      if (window.globals.ircState.ircConnected) {
        menuIdList.forEach((menuId) => {
          this.shadowRoot.getElementById(menuId).removeAttribute('unavailable');
        });
      } else {
        menuIdList.forEach((menuId) => {
          this.shadowRoot.getElementById(menuId).setAttribute('unavailable', '');
        });
      }
    }

    // Channel list
    const channels = Array.from(window.globals.ircState.channels);

    let changed = false;
    if (channels.length !== this.previousChannels.length) {
      changed = true;
    } else {
      // channels array same number of elements
      if (channels.length > 0) {
        for (let i = 0; i < channels.length; i++) {
          if (channels[i].toLowerCase() !== this.previousChannels[i].toLowerCase()) changed = true;
        }
      }
    }
    if (changed) {
      // console.log('navMenu channels channel list changed, updating menu');
      // remove previous elements
      const parentEl = this.shadowRoot.getElementById('dropdownMenuChannelContainerId');
      while (parentEl.firstChild) {
        // 1 - Remove event listener
        parentEl.firstChild.removeEventListener('click', this.handleChannelClick);
        // 2 - Then delete the element from the menu
        parentEl.removeChild(parentEl.firstChild);
      }
      this.previousChannels = [];
      if (channels.length > 0) {
        for (let i = 0; i < channels.length; i++) {
          // Since there are 3 layered elements here, and event.stopPropagation() is called.
          // It is necessary to add an ID to each element, but id must be unique
          // console.log('navMenu channels adding channel', channels[i]);
          const channelMenuItem = document.createElement('div');
          channelMenuItem.classList.add('nav-group02');
          channelMenuItem.classList.add('nav-level1');
          channelMenuItem.channelName = channels[i].toLowerCase();
          channelMenuItem.setAttribute('channel-name', channels[i].toLowerCase());
          // insert into the menu with same collapsed attribute as other menu members in same grop
          if (this.shadowRoot.getElementById('item2_1_Id').hasAttribute('collapsed')) {
            channelMenuItem.setAttribute('collapsed', '');
          }
          const channelNameSpan = document.createElement('span');
          channelNameSpan.classList.add('mr10');
          // Get case sensitive channel name
          channelNameSpan.textContent = window.globals.ircState.channelStates[i].csName;
          channelNameSpan.channelName = channels[i].toLowerCase();
          channelNameSpan.setAttribute('channel-name', channels[i].toLowerCase());
          channelMenuItem.appendChild(channelNameSpan);

          const channelMessageCount = document.createElement('div');
          channelMessageCount.classList.add('global-count');
          channelMessageCount.setAttribute('title', 'Unread Message Count');
          if (document.querySelector('body').getAttribute('theme') === 'light') {
            channelMessageCount.classList.add('global-border-theme-light');
            channelMessageCount.classList.add('global-text-theme-light');
          } else {
            channelMessageCount.classList.add('global-border-theme-dark');
            channelMessageCount.classList.add('global-text-theme-dark');
          }
          channelMessageCount.textContent = '0';
          channelMessageCount.setAttribute('hidden', '');
          channelMessageCount.channelName = channels[i].toLowerCase();
          channelMessageCount.setAttribute('channel-name', channels[i].toLowerCase());
          channelMenuItem.appendChild(channelMessageCount);

          this.previousChannels.push(channels[i].toLowerCase());
          parentEl.appendChild(channelMenuItem);
          channelMenuItem.addEventListener('click', this.handleChannelClick);
        }
      }
      // Used to iterate menu items to show or hide visibility
      this.arrayOfMenuElements = this.shadowRoot.querySelectorAll('.nav-level1');
    } // changed
  };

  /**
   * Called by channel-panel to clear unread message count
   * @param {Object} event.target.channelName
   */
  handleChannelClick = (event) => {
    event.stopPropagation();
    const channelNameId = event.target.channelName;
    document.getElementById('channel:' + channelNameId).showPanel();
    this.closeDropdownMenu();
  };

  // ------------------
  // Main entry point
  // ------------------
  initializePlugin = () => {
    // Set initial menu visibility
    this._handleIrcStateChanged();
    // Update user login ID into the dropdown menu text for logout selection
    document.getElementById('userInfo').getLoginInfo()
      .then((userinfo) => {
        // console.log('userinfo', JSON.stringify(userinfo, null, 2));
        if ((Object.hasOwn(userinfo, 'user')) && (userinfo.user.length > 0)) {
          // Update user real name in menu header bar
          this.shadowRoot.getElementById('item5_0_Id').textContent =
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
        this.shadowRoot.getElementById('navDropdownDivId').classList.remove('nav-menu-theme-dark');
        this.shadowRoot.getElementById('navDropdownDivId').classList.add('nav-menu-theme-light');
      } else {
        this.shadowRoot.getElementById('navDropdownDivId').classList.remove('nav-menu-theme-light');
        this.shadowRoot.getElementById('navDropdownDivId').classList.add('nav-menu-theme-dark');
      }
    });

    document.addEventListener('irc-state-changed', this._handleIrcStateChanged.bind(this));

    document.addEventListener('update-channel-count', (event) => {
      const channelMenuItemElements =
        this.shadowRoot.getElementById('dropdownMenuChannelContainerId');
      const menuItemEls = Array.from(channelMenuItemElements.children);
      menuItemEls.forEach((itemEl) => {
        const channelStr = itemEl.channelName;
        const channelEl = document.getElementById('channel:' + channelStr);
        const count = channelEl.unreadMessageCount;
        if (count > 0) {
          itemEl.lastChild.textContent = channelEl.unreadMessageCount.toString();
          itemEl.lastChild.removeAttribute('hidden');
        } else {
          itemEl.lastChild.textContent = '0';
          itemEl.lastChild.setAttribute('hidden', '');
        }
      });
    }); // addEventListener('update-channel-count

    document.addEventListener('update-privmsg-count', (event) => {
      const privmsgMenuItemElements =
        this.shadowRoot.getElementById('dropdownMenuPrivMsgContainerId');
      const menuItemEls = Array.from(privmsgMenuItemElements.children);
      menuItemEls.forEach((itemEl) => {
        const privmsgStr = itemEl.pmPanelName.toLowerCase();
        const privmsgEl = document.getElementById('privmsg:' + privmsgStr);
        const count = privmsgEl.unreadMessageCount;
        if (count > 0) {
          itemEl.lastChild.textContent = privmsgEl.unreadMessageCount.toString();
          itemEl.lastChild.removeAttribute('hidden');
        } else {
          itemEl.lastChild.textContent = '0';
          itemEl.lastChild.setAttribute('hidden', '');
        }
      });
    }); // addEventListener('update-channel-count

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
    this.shadowRoot.getElementById('group01ButtonId').addEventListener('click', (event) => {
      event.stopPropagation();
      _toggleDropdownOnMenuClick('nav-group01');
    });
    this.shadowRoot.getElementById('group02ButtonId').addEventListener('click', (event) => {
      event.stopPropagation();
      _toggleDropdownOnMenuClick('nav-group02');
    });
    this.shadowRoot.getElementById('group03ButtonId').addEventListener('click', (event) => {
      event.stopPropagation();
      _toggleDropdownOnMenuClick('nav-group03');
    });
    this.shadowRoot.getElementById('group04ButtonId').addEventListener('click', (event) => {
      event.stopPropagation();
      _toggleDropdownOnMenuClick('nav-group04');
    });

    // --------------------------------
    // Menu functional Assignments
    // --------------------------------
    this.shadowRoot.getElementById('item1_1_Id').addEventListener('click', (event) => {
      event.stopPropagation();
      document.getElementById('managePmPanels').showPanel();
      this.closeDropdownMenu();
    });
    this.shadowRoot.getElementById('item2_1_Id').addEventListener('click', (event) => {
      event.stopPropagation();
      document.getElementById('manageChannelsPanel').showPanel();
      this.closeDropdownMenu();
    });
    this.shadowRoot.getElementById('item3_1_Id').addEventListener('click', (event) => {
      event.stopPropagation();
      document.getElementById('serverListPanel').showPanel();
      this.closeDropdownMenu();
    });
    this.shadowRoot.getElementById('item3_2_Id').addEventListener('click', (event) => {
      event.stopPropagation();
      document.getElementById('ircControlsPanel').showPanel();
      this.closeDropdownMenu();
    });
    this.shadowRoot.getElementById('item3_3_Id').addEventListener('click', (event) => {
      event.stopPropagation();
      document.getElementById('ircServerPanel').showPanel();
      this.closeDropdownMenu();
    });
    this.shadowRoot.getElementById('item3_4_Id').addEventListener('click', (event) => {
      event.stopPropagation();
      document.getElementById('wallopsPanel').showPanel();
      this.closeDropdownMenu();
    });
    this.shadowRoot.getElementById('item3_5_Id').addEventListener('click', (event) => {
      event.stopPropagation();
      document.getElementById('noticePanel').showPanel();
      this.closeDropdownMenu();
    });
    this.shadowRoot.getElementById('item3_6_Id').addEventListener('click', (event) => {
      event.stopPropagation();
      document.getElementById('helpPanel').showPanel();
      document.dispatchEvent(new CustomEvent('global-scroll-to-top'));
      this.closeDropdownMenu();
    });

    this.shadowRoot.getElementById('item4_1_Id').addEventListener('click', (event) => {
      event.stopPropagation();
      document.getElementById('displayUtils').toggleColorTheme();
      this.closeDropdownMenu();
    });
    this.shadowRoot.getElementById('item4_2_Id').addEventListener('click', (event) => {
      event.stopPropagation();
      document.dispatchEvent(new CustomEvent('show-all-panels'));
      document.dispatchEvent(new CustomEvent('cancel-zoom'));
      this.closeDropdownMenu();
    });
    this.shadowRoot.getElementById('item4_3_Id').addEventListener('click', (event) => {
      event.stopPropagation();
      document.dispatchEvent(new CustomEvent('collapse-all-panels'));
      document.dispatchEvent(new CustomEvent('cancel-zoom'));
      this.closeDropdownMenu();
    });
    this.shadowRoot.getElementById('item4_4_Id').addEventListener('click', (event) => {
      event.stopPropagation();
      document.dispatchEvent(new CustomEvent('hide-all-panels'));
      this.closeDropdownMenu();
    });
    this.shadowRoot.getElementById('item4_5_Id').addEventListener('click', (event) => {
      event.stopPropagation();
      document.getElementById('debugPanel').showPanel();
      this.closeDropdownMenu();
    });
    this.shadowRoot.getElementById('item5_0_Id').addEventListener('click', (event) => {
      event.stopPropagation();
      document.getElementById('logoutPanel').handleLogoutRequest();
      this.closeDropdownMenu();
    });
  }; // connectedCallback()
});
