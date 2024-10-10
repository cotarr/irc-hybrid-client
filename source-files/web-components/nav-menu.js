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
//   handleChannelClick()
//   isMainNavMenuParsingKeystrokes()
//   openIfClosedNavMenu()
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
    this.arrayOfAllMenuElements = [];
    this.ircConnectedLast = null;
    this.webConnectedLast = null;
  }

  /**
   * Internal function to set focus to highest on page (lowest index) nav menu item
   */
  _setFocusTopAvailableItem = () => {
    if (this.arrayOfAllMenuElements.length > 0) {
      for (let i = 0; i < this.arrayOfAllMenuElements.length; i++) {
        if ((!this.arrayOfAllMenuElements[i].hasAttribute('unavailable')) &&
        (!this.arrayOfAllMenuElements[i].hasAttribute('collapsed'))) {
          this.arrayOfAllMenuElements[i].focus();
          break;
        }
      }
    }
  };

  /**
   * Internal function to get index value of menu item that currently has focus
   * @returns {Number} index into arrayOfAllMenuElements, else -1
   */
  _getMenuIndexWithFocus = () => {
    let index = -1;
    const activeElement = this.shadowRoot.activeElement;
    if ((activeElement) &&
      (this.shadowRoot.getElementById('navDropdownDivId')
        .classList.contains('nav-dropdown-div-show'))) {
      for (let i = 0; i < this.arrayOfAllMenuElements.length; i++) {
        if (activeElement.hasAttribute('id')) {
          if (activeElement.id === this.arrayOfAllMenuElements[i].id) {
            index = i;
          }
        }
        if (activeElement.hasAttribute('pm-panel-name')) {
          if (activeElement.getAttribute('pm-panel-name') ===
            this.arrayOfAllMenuElements[i].getAttribute('pm-panel-name')) {
            index = i;
          }
        }
        if (activeElement.hasAttribute('channel-name')) {
          if (activeElement.getAttribute('channel-name') ===
            this.arrayOfAllMenuElements[i].getAttribute('channel-name')) {
            index = i;
          }
        }
      }
    }
    return index;
  };

  /**
   * Internal function to make nav menu visible and set nav menu state
   */
  _openNavMenu = () => {
    if (!this.shadowRoot.getElementById('navDropdownDivId')
      .classList.contains('nav-dropdown-div-show')) {
      this.shadowRoot.getElementById('navDropdownDivId')
        .classList.add('nav-dropdown-div-show');
    }

    // Make sure dropdown menu is visible by scrolling to the top when opening menu
    // if (this.shadowRoot.getElementById('navDropdownDivId').classList.contains(
    //   'nav-dropdown-div-show')) {
    //   document.dispatchEvent(new CustomEvent('global-scroll-to-top'));
    // }

    // Call header-bar method, which calls hamburger-icon to set attributes
    document.getElementById('headerBar').updateMenuOpenState('open');
    // After open the dropdown, move focus to top visible item.
    if (window.innerWidth > 500) {
      // Case of Linux desktop browser, delay moving focus (workaround)
      setTimeout(() => {
        // Temporarily move focus to last menu element (trick browser, workaround)
        this.arrayOfAllMenuElements[this.arrayOfAllMenuElements.length - 1].focus();
      }, 10);
      setTimeout(() => {
        // Then move focus back to intended element
        this._setFocusTopAvailableItem();
      }, 20);
    } else {
      // Else Case of iPhone not accept focus without delay (workaround)
      setTimeout(() => {
        // Temporarily move focus to last menu element (trick browser, workaround)
        this.arrayOfAllMenuElements[this.arrayOfAllMenuElements.length - 1].focus();
      }, 110);
      setTimeout(() => {
        // Then move focus back to intended element
        this._setFocusTopAvailableItem();
      }, 120);
    }
  };

  /**
   * Return status of Nav Menu visibility and keystroke parser (Public method)
   * Used inside other web components to avoid keystroke event listener conflicts
   * @returns {Boolean} True if Nav menu visible parsing keystrokes
   */
  isMainNavMenuParsingKeystrokes = () => {
    if (this.shadowRoot.getElementById('navDropdownDivId')
      .classList.contains('nav-dropdown-div-show')) {
      return true;
    } else {
      return false;
    }
  };

  /**
   * Toggle Nav dropdown menu visibility (Public method)
   */
  toggleDropdownMenu = () => {
    this.shadowRoot.getElementById('navDropdownDivId').classList.toggle('nav-dropdown-div-show');
    if (this.shadowRoot.getElementById('navDropdownDivId')
      .classList.contains('nav-dropdown-div-show')) {
      this._openNavMenu();
    } else {
      // Call header-bar method, which calls hamburger-icon to set attributes
      document.getElementById('headerBar').updateMenuOpenState('closed');
    }
  };

  /**
   * Hide dropdown menu (public method)
   */
  closeDropdownMenu = () => {
    this.shadowRoot.getElementById('navDropdownDivId').classList.remove('nav-dropdown-div-show');
    // Call header-bar method, which calls hamburger-icon to set attributes
    document.getElementById('headerBar').updateMenuOpenState('closed');
  };

  /**
   * Nav menu method to open Nav menu from external call (public method)
   */
  openIfClosedNavMenu = () => {
    if (!(this.shadowRoot.getElementById('navDropdownDivId')
      .classList.contains('nav-dropdown-div-show'))) {
      this._openNavMenu();
    }
  };

  /**
   * Update icons to show or hide icon for unread Server messages (Public method)
   * @param {boolean} status - True will make icon visible
   */
  handleServerUnreadUpdate = (status) => {
    const itemEl = this.shadowRoot.getElementById('item3_3_Id');
    if (status) {
      itemEl.textContent = 'IRC Server (New Messages)';
    } else {
      itemEl.textContent = 'IRC Server (Alt-S)';
    }
  };

  /**
   * Update icons to show or hide icon for unread Notice messages (Public method)
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
   * Update icons to show or hide icon for unread Wallops messages (public method)
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
   * Called by a pm-panel element to update count of unread messages for a panel. (Public Method)
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
          const pmPanelMenuItem = document.createElement('button');
          pmPanelMenuItem.setAttribute('nav-group', '1');
          pmPanelMenuItem.setAttribute('nav-level', '1');
          pmPanelMenuItem.classList.add('nav-level1');
          pmPanelMenuItem.pmPanelName = pmPanels[i].toLowerCase();
          pmPanelMenuItem.setAttribute('title',
            'Open the private message panel for nickname: ' + pmPanels[i]);
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
      this.arrayOfAllMenuElements = this.shadowRoot.querySelectorAll('button');
    } // changed
  };

  /**
   * Called by pm-panel to clear unread message count (public method)
   * @param {Object} event.target.pmPanelName
   */
  handlePmPanelClick = (event) => {
    event.stopPropagation();
    const privmsgName = event.target.pmPanelName.toLowerCase();
    document.getElementById('privmsg:' + privmsgName).showAndScrollPanel();
    this.closeDropdownMenu();
  };

  /**
   * Show or Hide Nav Menu items based on IRC and Web Server connection status
   */
  _showHideItemsInMenu = () => {
    // Detect state change for IRC server connection. if changed, close the dropdown
    if ((window.globals.ircState.ircConnected !== this.ircConnectedLast) ||
      (window.globals.webState.webConnected !== this.webConnectedLast)) {
      this.ircConnectedLast = window.globals.ircState.ircConnected;
      this.webConnectedLast = window.globals.webState.webConnected;

      // visible menu items will change so close the menu
      this.closeDropdownMenu();

      // List of menu items to be hidden when not connected to IRC
      const ircMenuIdList = [
        'group01ButtonId',
        'group02ButtonId',
        'item3_4_Id',
        'item3_5_Id',
        'item4_2_Id',
        'item4_3_Id',
        'item4_4_Id'
      ];
      const webMenuIdList = [
        'group01ButtonId',
        'group02ButtonId',
        'group03ButtonId',
        'item4_1_Id',
        'item4_2_Id',
        'item4_3_Id',
        'item4_4_Id'
      ];
      // remove previous values
      webMenuIdList.forEach((menuId) => {
        this.shadowRoot.getElementById(menuId).removeAttribute('unavailable');
      });
      ircMenuIdList.forEach((menuId) => {
        this.shadowRoot.getElementById(menuId).removeAttribute('unavailable');
      });
      // Hide this if websocket disconnected from web server
      if (!window.globals.webState.webConnected) {
        webMenuIdList.forEach((menuId) => {
          this.shadowRoot.getElementById(menuId).setAttribute('unavailable', '');
        });
      }
      // hide these items if backend disconnected from IRC
      if (!window.globals.ircState.ircConnected) {
        ircMenuIdList.forEach((menuId) => {
          this.shadowRoot.getElementById(menuId).setAttribute('unavailable', '');
        });
      }
      // collapse all items, else state corruption
      this.arrayOfAllMenuElements.forEach((itemEl) => {
        if (itemEl.getAttribute('nav-level') === '1') {
          itemEl.setAttribute('collapsed', '');
        }
      });
    }
  };

  /**
   * Event handler called when web-connect-changed fires
   */
  _handleWebConnectChanged = () => {
    this._showHideItemsInMenu();
    if ((window.globals.webState.webConnected) || (window.globals.webState.webConnecting)) {
      this.shadowRoot.getElementById('item4_6_Id').textContent = 'Place web page in Standby';
    } else {
      this.shadowRoot.getElementById('item4_6_Id').textContent = 'Re-connect web page.';
    }
  };

  /**
   * Event handler called when irc-state-changed fires
   */
  _handleIrcStateChanged = () => {
    // console.log('navMenu irc-state-changed event');
    this._showHideItemsInMenu();

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
          const channelMenuItem = document.createElement('button');
          channelMenuItem.setAttribute('nav-group', '2');
          channelMenuItem.setAttribute('nav-level', '1');
          channelMenuItem.classList.add('nav-level1');
          channelMenuItem.channelName = channels[i].toLowerCase();
          channelMenuItem.setAttribute('channel-name', channels[i].toLowerCase());
          channelMenuItem.setAttribute('title', channels[i].toLowerCase());
          channelMenuItem.setAttribute('title',
            'Open the IRC channel panel for IRC channel: ' + channels[i]);
          // insert into the menu with same collapsed attribute as other menu members in same group
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
      this.arrayOfAllMenuElements = this.shadowRoot.querySelectorAll('button');
    } // changed
  };

  /**
   * Called by channel-panel to clear unread message count (Public Method)
   * @param {Object} event.target.channelName
   */
  handleChannelClick = (event) => {
    event.stopPropagation();
    const channelNameId = event.target.channelName;
    document.getElementById('channel:' + channelNameId).showAndScrollPanel();
    this.closeDropdownMenu();
  };

  /**
   * Handle Alt-M Keypress to open menu globally
   */
  _handleGlobalAltMKeypress = () => {
    if (!this.shadowRoot.getElementById('navDropdownDivId')
      .classList.contains('nav-dropdown-div-show')) {
      this._openNavMenu();
      return true;
    } else {
      return false;
    }
  };

  /**
   * Handle Escape Keypress,
   */
  _handleNavEscapeKeypress = () => {
    if (this.shadowRoot.getElementById('navDropdownDivId')
      .classList.contains('nav-dropdown-div-show')) {
      // Close menu
      if (this.shadowRoot.getElementById('navDropdownDivId')
        .classList.contains('nav-dropdown-div-show')) {
        this.closeDropdownMenu();
        document.getElementById('headerBar').giveNavMenuHamburgerIconFocus();
      }
      // Menu visible, return true to abort default keystroke behavior.
      return true;
    } else {
      // Menu not visible, abort, continue to keystroke default event handler
      return false;
    }
  };

  /**
   * Handle Home Keypress,
   */
  _handleNavHomeKeypress = () => {
    if (this.shadowRoot.getElementById('navDropdownDivId')
      .classList.contains('nav-dropdown-div-show')) {
      // Set focus to first navigation menu item
      // TODO not working, why?
      this._setFocusTopAvailableItem();
      // Menu visible, return true to abort default keystroke behavior.
      return true;
    } else {
      // Menu not visible, abort, continue to keystroke default event handler
      return false;
    }
  };

  /**
   * Handle ArrowLeft Keypress
   */
  _handleNavArrowLeftKeypress = () => {
    if (this.shadowRoot.getElementById('navDropdownDivId')
      .classList.contains('nav-dropdown-div-show')) {
      const activeElement = this.shadowRoot.activeElement;
      const activeElementIndex = this._getMenuIndexWithFocus();
      if (activeElement) {
        // Case 1 of 2, Level 0 Parent Menu item, collapse all and close nav menu
        if ((activeElement.getAttribute('nav-level') === '0') &&
          (activeElement.classList.contains('group-level0'))) {
          if (activeElementIndex >= 0) {
            const navGroup = activeElement.getAttribute('nav-group');
            let currentCollapsedState = false;
            this.arrayOfAllMenuElements.forEach((menuItemEl) => {
              if ((menuItemEl.getAttribute('nav-group') === navGroup) &&
                (menuItemEl.getAttribute('nav-level') === '1')) {
                if (menuItemEl.hasAttribute('collapsed')) currentCollapsedState = true;
              }
            });
            // Case of sub menu already collapsed,
            if (currentCollapsedState) {
              // Else case of sub menu already collapsed.
              this.closeDropdownMenu();
              document.getElementById('headerBar').giveNavMenuHamburgerIconFocus();
              return true;
            } else {
              // Close menu
              this.arrayOfAllMenuElements.forEach((navMenuEl) => {
                if ((navMenuEl.getAttribute('nav-level') === '1') &&
                  (navMenuEl.getAttribute('nav-group') === navGroup)) {
                  // Case of sub menu item, hide
                  navMenuEl.setAttribute('collapsed', '');
                }
              });
              // keep focus on active element
              activeElement.setAttribute('aria-expanded', 'false');
              activeElement.focus();
              return true;
            }
          }
        // Case 2 of 2, Level 1 sub-menu item, collapse just this group
        } else if (activeElement.getAttribute('nav-level') === '1') {
          if (activeElement.hasAttribute('nav-group')) {
            const navGroup = activeElement.getAttribute('nav-group');
            // Collapse all matching sub-men items
            this.arrayOfAllMenuElements.forEach((menuItemEl) => {
              if (menuItemEl.getAttribute('nav-group') === navGroup) {
                menuItemEl.setAttribute('collapsed', '');
              }
            });
            // After collapse submenu, set focus to parent item in Nav Menu
            this.arrayOfAllMenuElements.forEach((menuItemEl) => {
              if ((menuItemEl.getAttribute('nav-group') === navGroup) &&
                (menuItemEl.getAttribute('nav-level') === '0')) {
                menuItemEl.focus();
              }
            });
          }
          // True to disable further event processing
          return true;
        } else {
          // Else case level 0 individual items
          this.closeDropdownMenu();
          document.getElementById('headerBar').giveNavMenuHamburgerIconFocus();
          return true;
        }
      } // if (activeElement)
      return false;
    } // if visible
    // Menu not visible, abort, continue to keystroke default event handler
    return false;
  }; // handleNavArrowLeftKeypress()

  /**
   * Handle ArrowRight Keypress
   */
  _handleNavArrowRightKeypress = () => {
    if (this.shadowRoot.getElementById('navDropdownDivId')
      .classList.contains('nav-dropdown-div-show')) {
      const activeElementIndex = this._getMenuIndexWithFocus();
      if (activeElementIndex >= 0) {
        const activeElement = this.arrayOfAllMenuElements[activeElementIndex];
        if (activeElement) {
          // Level 0 Parent Menu item, expand group
          if ((activeElement.getAttribute('nav-level') === '0') &&
            (activeElement.classList.contains('group-level0'))) {
            const navGroup = activeElement.getAttribute('nav-group');
            // Expand all matching sub-men items
            this.arrayOfAllMenuElements.forEach((menuItemEl) => {
              if (menuItemEl.getAttribute('nav-group') === navGroup) {
                menuItemEl.removeAttribute('collapsed');
              }
            });
            if (activeElementIndex >= 0) {
              // Keep focus on clicked element
              activeElement.focus();
              activeElement.setAttribute('aria-expanded', 'true');
            }
          }
          return true;
        }
      }
    }
    // Menu not visible, abort, continue to keystroke default event handler
    return false;
  }; // handleNavArrowLeftKeypress()

  _handleNavArrowUpKeypress = () => {
    if (this.shadowRoot.getElementById('navDropdownDivId')
      .classList.contains('nav-dropdown-div-show')) {
      const index = this._getMenuIndexWithFocus();
      let nextIndex = -1;
      if ((this.arrayOfAllMenuElements.length > 0) &&
        (index >= 1) && (index < this.arrayOfAllMenuElements.length)) {
        for (let i = index - 1; i >= 0; i--) {
          if ((!this.arrayOfAllMenuElements[i].hasAttribute('collapsed')) &&
            (!this.arrayOfAllMenuElements[i].hasAttribute('unavailable'))) {
            nextIndex = i;
            break;
          }
        }
        if (nextIndex >= 0) {
          this.arrayOfAllMenuElements[nextIndex].focus();
        } else {
          // if no menu item have focus, then set to first menu item
          this._setFocusTopAvailableItem();
        }
      }
      // Menu visible, return true to abort default keystroke behavior.
      return true;
    } else {
      // Menu not visible, abort, continue to keystroke default event handler
      return false;
    }
  }; // handleNavArrowUpKeypress()

  _handleNavArrowDownKeypress = () => {
    if (this.shadowRoot.getElementById('navDropdownDivId')
      .classList.contains('nav-dropdown-div-show')) {
      const index = this._getMenuIndexWithFocus();

      let nextIndex = -1;
      if ((this.arrayOfAllMenuElements.length > 0) &&
        (index >= 0) && (index < this.arrayOfAllMenuElements.length - 1)) {
        for (let i = index + 1; i < this.arrayOfAllMenuElements.length; i++) {
          if ((!this.arrayOfAllMenuElements[i].hasAttribute('collapsed')) &&
            (!this.arrayOfAllMenuElements[i].hasAttribute('unavailable'))) {
            nextIndex = i;
            break;
          }
        }
        if (nextIndex >= 0) {
          this.arrayOfAllMenuElements[nextIndex].focus();
        } else {
          // if no menu item have focus, then set to first menu item
          this._setFocusTopAvailableItem();
        }
      }
      // Menu visible, return true to abort default keystroke behavior.
      return true;
    } else {
      // Menu not visible, abort, continue to keystroke default event handler
      return false;
    }
  }; // handleNavArrowDownKeypress()

  /**
   * Handle End Keypress,
   */
  _handleNavEndKeypress = () => {
    if (this.shadowRoot.getElementById('navDropdownDivId')
      .classList.contains('nav-dropdown-div-show')) {
      // Set focus to first navigation menu item
      const index = this.arrayOfAllMenuElements.length - 1;
      this.arrayOfAllMenuElements[index].focus();
      // Menu visible, return true to abort default keystroke behavior.
      return true;
    } else {
      // Menu not visible, abort, continue to keystroke default event handler
      return false;
    }
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
          this.shadowRoot.getElementById('item5_1_Id').textContent =
            'Logout (' + userinfo.name + ')';
        }
      })
      .catch((err) => {
        console.log(err);
      });
  };

  connectedCallback () {
    this.shadowRoot.getElementById('group01ButtonId').title = 'Expand list of IRC private message panels';
    this.shadowRoot.getElementById('group02ButtonId').title = 'Expand list of IRC channel panels';
    this.shadowRoot.getElementById('group03ButtonId').title = 'Expand list of panels related to IRC controls and IRC configuration changes';
    this.shadowRoot.getElementById('group04ButtonId').title = 'Expand list of miscellaneous panels that are less frequently used';
    this.shadowRoot.getElementById('item1_1_Id').title = 'Open private message management panel. Start new private message chat';
    this.shadowRoot.getElementById('item2_1_Id').title = 'Open IRC channel management panel. Join new IRC channels';
    this.shadowRoot.getElementById('item3_1_Id').title = 'Open IRC server list editor panel to add new IRC servers or modify IRC server list, requires IRC not connected';
    this.shadowRoot.getElementById('item3_2_Id').title = 'Open IRC Controls panel to connect or disconnect from the IRC network or to change away status';
    this.shadowRoot.getElementById('item3_3_Id').title = 'Open IRC Server panel to view IRC server messages and issue IRC text commands';
    this.shadowRoot.getElementById('item3_4_Id').title = 'Open Wallops Panel to view current IRC wallops messages';
    this.shadowRoot.getElementById('item3_5_Id').title = 'Open Notice panel to view current IRC notice messages';
    this.shadowRoot.getElementById('item3_6_Id').title = 'Open IRC help panel to show list of available IRC text commands and application keystroke shortcuts (hot keys)';
    this.shadowRoot.getElementById('item4_1_Id').title = 'Changes application color theme';
    this.shadowRoot.getElementById('item4_2_Id').title = 'Make all commonly used panels visible';
    this.shadowRoot.getElementById('item4_3_Id').title = 'Collapse all IRC channel panels and private message panels to a bar. New activity will activate counter icons, but panel remains closed';
    this.shadowRoot.getElementById('item4_4_Id').title = 'Hide all IRC panels. New activity in the panel will automatically re-open the panel from hidden.';
    this.shadowRoot.getElementById('item4_5_Id').title = 'Show debug panel, used to debug internal program variables in real time';
    this.shadowRoot.getElementById('item4_6_Id').title = 'Disconnect the browser web page from the web server. Your nickname will remain active on the IRC network';
    this.shadowRoot.getElementById('item5_0_Id').title = 'Show MIT open source license for the irc-hybrid-client application';
    this.shadowRoot.getElementById('item5_1_Id').title = 'Logout the web browser from the page. Your nickname will remain active on the IRC network';

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

    document.addEventListener('irc-state-changed', this._handleIrcStateChanged);

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

    document.addEventListener('web-connect-changed', this._handleWebConnectChanged);

    //
    // Build arrays of dropdown menu elements
    //
    this.arrayOfAllMenuElements = this.shadowRoot.querySelectorAll('button');

    /**
     * If click the superior button, open/close the dropdown, if expandable
     * @param {String} groupNumber, group number is string "0", "1"...
    */
    const _toggleDropdownMenuByGroup = (groupNumberStr) => {
      if (this.arrayOfAllMenuElements.length > 0) {
        let collapsedState = false;
        // First, toggle sub elements
        for (let i = 0; i < this.arrayOfAllMenuElements.length; i++) {
          if ((this.arrayOfAllMenuElements[i].getAttribute('nav-group') === groupNumberStr) &&
             (this.arrayOfAllMenuElements[i].getAttribute('nav-level') === '1')) {
            if (this.arrayOfAllMenuElements[i].hasAttribute('collapsed')) {
              this.arrayOfAllMenuElements[i].removeAttribute('collapsed');
              collapsedState = false;
            } else {
              this.arrayOfAllMenuElements[i].setAttribute('collapsed', '');
              collapsedState = true;
            }
          }
        } // next i
        // Next, based on last sub-element toggle, set aria attribute of parent
        let matchingGroupIndex = -1;
        for (let i = 0; i < this.arrayOfAllMenuElements.length; i++) {
          if ((this.arrayOfAllMenuElements[i].getAttribute('nav-group') === groupNumberStr) &&
          (this.arrayOfAllMenuElements[i].getAttribute('nav-level') === '0') &&
          (this.arrayOfAllMenuElements[i].classList.contains('group-level0'))) {
            matchingGroupIndex = i;
            if (collapsedState) {
              this.arrayOfAllMenuElements[i].setAttribute('aria-expanded', 'false');
            } else {
              this.arrayOfAllMenuElements[i].setAttribute('aria-expanded', 'true');
            }
          }
        } // next i
        // Keep focus on Parent menu item
        this.arrayOfAllMenuElements[matchingGroupIndex].focus();
      }
    }; // _toggleDropdownMenuByGroup()

    this.shadowRoot.getElementById('group01ButtonId').addEventListener('click', (event) => {
      event.stopPropagation();
      _toggleDropdownMenuByGroup('1');
    });
    this.shadowRoot.getElementById('group02ButtonId').addEventListener('click', (event) => {
      event.stopPropagation();
      _toggleDropdownMenuByGroup('2');
    });
    this.shadowRoot.getElementById('group03ButtonId').addEventListener('click', (event) => {
      event.stopPropagation();
      _toggleDropdownMenuByGroup('3');
    });
    this.shadowRoot.getElementById('group04ButtonId').addEventListener('click', (event) => {
      event.stopPropagation();
      _toggleDropdownMenuByGroup('4');
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
    this.shadowRoot.getElementById('item4_6_Id').addEventListener('click', (event) => {
      event.stopPropagation();
      if ((window.globals.webState.webConnected) || (window.globals.webState.webConnecting)) {
        document.getElementById('websocketPanel').webConnectNavBarMenuHandler('disconnect');
      } else {
        document.getElementById('websocketPanel').webConnectNavBarMenuHandler('connect');
      }
      this.closeDropdownMenu();
    });
    this.shadowRoot.getElementById('item5_0_Id').addEventListener('click', (event) => {
      event.stopPropagation();
      document.getElementById('licensePanel').showPanel();
      this.closeDropdownMenu();
    });
    this.shadowRoot.getElementById('item5_1_Id').addEventListener('click', (event) => {
      event.stopPropagation();
      document.getElementById('logoutPanel').handleLogoutRequest();
      this.closeDropdownMenu();
    });

    // ---------------------------
    // Keypress event handlers
    // ---------------------------

    //
    // Global event listener for Alt-M to open nav menu
    //
    window.addEventListener('keydown', (e) => {
      // console.log(e.code);
      if ((e.altKey) &&
        (!e.ctrlKey) &&
        (!e.shiftKey) &&
        (!e.metaKey) &&
        (e.code === 'KeyM')) {
        if (this._handleGlobalAltMKeypress()) {
          e.preventDefault();
        }
      };
    }, false);

    //
    // Detect keyboard keypress and use for Navigation of the dropdown Nav menu
    //
    this.shadowRoot.addEventListener('keydown', (e) => {
      // console.log(e.code);
      if (!(e.altKey) &&
        (!e.ctrlKey) &&
        (!e.shiftKey) &&
        (!e.metaKey)) {
        if (e.code === 'Escape') {
          if (this._handleNavEscapeKeypress()) {
            e.preventDefault();
          }
        }
        if ((e.code === 'Home') || (e.code === 'PageUp')) {
          if (this._handleNavHomeKeypress()) {
            e.preventDefault();
          }
        }
        if (e.code === 'ArrowRight') {
          if (this._handleNavArrowRightKeypress()) {
            e.preventDefault();
          }
        }
        if (e.code === 'ArrowLeft') {
          if (this._handleNavArrowLeftKeypress()) {
            e.preventDefault();
          }
        }
        if (e.code === 'ArrowUp') {
          if (this._handleNavArrowUpKeypress()) {
            e.preventDefault();
          }
        }
        if (e.code === 'ArrowDown') {
          if (this._handleNavArrowDownKeypress()) {
            e.preventDefault();
          }
        }
        if ((e.code === 'End') || (e.code === 'PageDown')) {
          if (this._handleNavEndKeypress()) {
            e.preventDefault();
          }
        }
      }
    }, false);
  }; // connectedCallback()
});
