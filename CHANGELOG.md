`# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

- To view notes on v2 major upgrade, scroll to Version v2.0.0 2023-09-12

## [v2.0.9](https://github.com/cotarr/irc-hybrid-client/releases/tag/v2.0.9) 2024-01-30

### Fixed

This applies only to the optional use of the remote authentication server for web page login.
There are no changes to the default internal password login involved in this update.

In the case where the authorization server callback redirect includes an 
error message as a URL query parameter, such as "Client account disabled" 
as the URL query parameter "error_description=Client%20account%20disabled", 
irc-hybrid-client blocked the error response as an input validation error.

Fixed: Parse the login callback redirect to see if includes an error message.
If present, log the error and forward to the browser for display. Example:

```
502 Bad Gateway, Client account disabled
```

## [v2.0.8](https://github.com/cotarr/irc-hybrid-client/releases/tag/v2.0.8) 2023-12-19

### Changes

- Added:  Display some hotkey values in main dropdown menu
- Minor update to /docs

### Security improvement

This applies only to the optional use of the remote authentication server for web page login.
There are no changes to the default internal password login involved in this update.

An additional URL query parameter 'state' was added to 
the OAuth 2.0 authorization code grant workflow. 
The intent is to reduce CSRF risks during browser redirects back and 
forth between the main web server and the remote authorization server.
If using collab-auth as referenced in the /docs/, the change
requires collab-auth v0.0.20 or later pushed 2023-11-05.

Use of the "state" value is referenced in RFC-6749.
A simple explanation of this implementation is as follows:

The "state" URL query parameter is a random nonce that is generated
by the irc-hybrid-client web server when handling the /login route.
The nonce is stored in the users session by the /login route handler.
The web server adds the state parameter to the 302 redirect going 
to the authorization server as a OAuth 2.0 URL query parameter. 
After the user authenticates their identity by password, user's browser is 
returned back to the IRC client web server with a second 302 redirect.
The returning 302 redirect URL query parameters contain both an 
authorization code and the previous value of the state nonce. 
The value of the state nonce previously stored in the user's session 
from the first 302 redirect to the authorization server must match 
the value in the returning 302 redirect back to the irc-hybrid-client web server.

All changes are in in the file "server/middlewares/remote-authentication.mjs".

- Added code in the /login route handler to generate nonce, save in user's session, and append to the 302 redirect.
- Added new function for input validation of GET /login/callback URL query parameters.
- Added new function to extract and compare the state nonce for the GET /login/callback handler.
- Improved code related to extraction of authorization code for the GET /login/callback handler.
- Update and improve some error status codes and error messages
- Update comments and remove some console.log

Updated ThunderClient collection for testing remote authorization to accommodate 
the state parameter implemented with this change. Updated README in ThunderClient folder.

## [v2.0.7](https://github.com/cotarr/irc-hybrid-client/releases/tag/v2.0.7) 2023-11-15

### Critical Bug Fix

IRC channel messages can be sent to wrong channel after 
pruning unused channels from the message cache.

Example:  

- Join 4 IRC channels, "#Chan0", "#Chan1", "#Chan2", "#Chan3".
- Select the panel for Chan1, press buttons [Leave] followed by [Prune].
- Type a message in #Chan2, the message is sent to #Chan3 (Wrong channel)

Change:

source-files/web-components/channel-panel.js

For each channel-panel web component that is inserted into the DOM,
upon receipt of a global "irc-state-changed" event, 
reset local index variables to the proper values.

### Feature

In the backend web server, upgrade the message cache so that private messages (PM)
have a dedicated message array. The purpose of this change is to prevent private messages
that are received in the web server (from IRC network) from being scrolled out of the 
default message buffer by multiple IRC server disconnects. In other words, if you are 
away and receive a PM, you could miss the message if the default buffer turns over.

- Default buffer: 100 lines
- PM Cache buffer: 100 lines
- Each IRC channel up to 5 channels: 100 lines each
- IRC channel 6 or higher, share default cache buffer of 100 lines.

## [v2.0.6](https://github.com/cotarr/irc-hybrid-client/releases/tag/v2.0.6) 2023-11-07

### Fixed

Issue: In the case where private messages start with blank spaces, such as copy paste computer code
with indent block using space characters, the PM Erase button did not remove the PM lines from the 
IRC message cache.

Fix: In server/irc/irc-client-cache.mjs, update function eraseCacheUserPM() to include this edge case.

### Changed

GitHub CodeQL convert .github/workflows/codeql-analysis.yml from v1 to v2

## [v2.0.5](https://github.com/cotarr/irc-hybrid-client/releases/tag/v2.0.5) 2023-09-28

- Added HotKey Alt-V used to show bottom area of Channel panel and PM panel. Cursor must be in text input area for Alt-V to function.
- Update /docs/ and help panel for Alt-V

- Added show/collapse button to show-raw panel, hides bottom section containing message parser debug tools.

Issue: Due to filters on the server, IRC server PING and PONG commands were not echoed to the browser and were not visible in the raw message display.

- In server/irc-client-parse.mjs, reconfigured PING and PONG handlers so the messages are sent to browser for use in raw message display, but PING and PONG are not logged to log file nor added to IRC message cache.
- In server/irc-client-vars.mjs, removed excludedCommands array. It had contained only PING and PONG and is no longer needed.

## [v2.0.4](https://github.com/cotarr/irc-hybrid-client/releases/tag/v2.0.4) 2023-09-19

- Fixed header bar status R icon for nickname recovery not activating during recovery.

## [v2.0.3](https://github.com/cotarr/irc-hybrid-client/releases/tag/v2.0.3) 2023-09-16

- In channel-panel.js, fixed TypeError when channel topic is un-set, causing old topic to remain.
- In local-command-parser.js, Added -delete argument to TOPIC command to un-set the channel topic, example: `/TOPIC #channel -delete`
- server/irc-client.mjs correction of error message.
- In pm-panel, remove extraneous console.log

## [v2.0.2](https://github.com/cotarr/irc-hybrid-client/releases/tag/v2.0.2) 2023-09-16

- Updated /docs/ folder using new screen captures and other content from the v2.0.0 upgrade (no code changes)

## [v2.0.1](https://github.com/cotarr/irc-hybrid-client/releases/tag/v2.0.1) 2023-09-14

Changed behavior of header-bar collapse all button "[-]" at upper right. 
First click will show active panels as collapsed bars, further clicks 
within 3 seconds will toggle between hide all panels and collapsed bars.

Other changes;

- Added user's mode IRC message 221 formatted response to irc-server-panel. Was showing raw IRC server message.
- User entry of text /MODE command will show either channel-panel or irc-server-panel to view response, if panel is hidden or collapsed.
- User entry of text /AWAY command or AWAY buttons will show irc-server-panel to view response to away request.

## [v2.0.0](https://github.com/cotarr/irc-hybrid-client/releases/tag/v2.0.0) 2023-09-12

- Major upgrade: version v2.0.0 merged into master branch to replace v0.2.53 2023-09-12

### Version v2 Description

This is a reorganization of the frontend web browser HTML and JavaScript into multiple web components.

Motivation: The previous web browser code consisted of a web page based on
a single block of HTML code and a single block of JavaScript.
As the program evolved and increased in size, it has become difficult to maintain. 
The HTML code was within a single scope with all HTML element id, class, 
and css style declarations inside one single web page DOM. 
Although the web browser JavaScript was split to 11 files, this was simply 
an editing convenience. All the JavaScript files were concatenated together 
for execution as a single script with one namespace. Splitting the web 
browser into separate web component files will allow each panel in the user interface to 
have it's own shadow DOM where the scope of element tags, classes, styles and JavaScript 
are isolated inside the shadow DOM of the web component.

### Post upgrade user actions:

- After pulling changes from GitHub, a fresh `npm install` or `npm ci` is required.
- Installations that use custom mp3 sound files will need to move the custom sound files to the build-prod/sounds/ folder.

### Coding notes

- No web component framework has been used. Chrome supports v1 web components using native code.
- The build process will continue to use gulp to bundle and minify, similar to the previous version.
- The gulp build tools are located in a separate repository "irc-hybrid-client-dev-tools".
- Web component HTML template files will be concatenated into a single HTML file in both dev and prod builds.
- CSS style names inside each web component will be prefixed with a unique string identifier. All CSS will be concatenated into a single css style file.
- In the dev build, all JavaScript files will remain separate to allow js error message line numbers to match in both editor and web browser.
- In the prod build, all JavaScript will be bundled into a single file and minified.
- The gulp script will modify javascript file URLs in the HTML source files in both dev and prod to match the bundling configuration.
- The previous frontend web browser code and folders was deleted at the start of the edit. This is to avoid text editor global text search hits on the old version.
- To avoid duplication of source files, the "build-dev" folder will be cleaned during build and build-dev files will not be committed to git.
- Step by step notes of changes recorded into the CHANGELOG.md file.

### Approach

As much as possible, existing IRC client code will be used as-is. Extensive variable name substitutions 
were necessary to reference functions, variables and attributes across different web components.

To simplify things, no significant changes were made to the backend NodeJs server except for file location of 
web server root directory location to accommodate the build-dev and build-prod folders.
A few other minor backend edits were not significant and they are listed in the changelog.

New features:

- New integrated IRC server list capable to /JOIN an IRC server directly from buttons in the table of server definitions.
- New IRC server definition editor panel that can be invoked from the server list.
- New Keyboard Hotkeys to show or hide various panels and step through IRC channels. The list of hotkeys is in the help panel.
- New status bar at top of page with improved icons. Unread message icons will auto-open panels when clicked or tapped.
- New "Zoom" mode in channel panel sets rows and cols of textarea to fill screen and blocks other panels from opening when zoom is active.
- The web browser websocket connection has been redefined as 'web page Standby'.
- Added a new dropdown navigation menu with IRC channel panels and PM panels dynamically inserted into the dropdown menu.
- Unread message indicators displayed in the drop down menu.

### Project File Structure

Before (V0.2.53)

| Source Files                            | Minified files (3 files)           |
| --------------------------------------- | ---------------------------------- |
| secure/webclient.html  (single file)    | secure-minify/webclient.html       |
| secure/css/styles.css  (single file)    | secure-minify/css/styles.css       |
| secure/js/*.js    (multiple --> single) | secure-minify/js/webclient.js      |

After (V2.0.0-dev)

| Source Files                                  | Development Build (multiple js)    |Bundled, Minified (3 files) |
| --------------------------------------------- | ---------------------------------- | -------------------------- |
| source-files/html/*.html                      | build-dev/webclient.html           | build-prod/webclient.html  |
| source-files/css/*.css (shared css)           | build-dev/css/styles.css           | build-prod/css/styles.css  |
| source-files/js/*.js (loads page)             | build-dev/js/(*multiple files*).js | build-prod/js/webclient.js |
| source-files/web-components/*.html,*.css,*.js |                                    |                            |

---

### Changelog of Version v2 upgrade commit history

Commit ec1d225 

- Add handlers so header bar unread message icons now open the associated panel to view message when clicked
- Change CSS styles of flashing unread message icons detect clicks when flash is transparent.
- If multiple channel panels each have unread messages, show 1 panel for each icon click
- If multiple PM panels each have unread messages, show 1 panel for each icon click
- Fixed dropdown menu not scroll channel panel, or cancel unread, if already open when clicked.
- Fixed dropdown menu not scroll pm panel, or cancel unread, if already open when clicked.
- On new wallops message, open panel only if closed, else set unread message icon
- On new notice message, open panel only if closed, else set unread message icon

Commit 0386e81

- Change description of websocket disconnect to "Web page Standby"
- Add web socket connection (Standby) to dropdown menu (Already a header bar icon)

Commit 9c76d4f

HTML Browser side changes
- Update button 'title' attributes for buttons on many panels to serve as mouse-over tooltips.
- Fix channel panel continuing to show nicknames in list after being kicked or /part command
- Additional description added to web logout panel

Backend server changes

- Backend, upgrade packages: express-rate-limit@6.11.1, ws@8.14.1, redis@4.6.8
- Upgrade dev dependency eslint@8.49.0 and it'd dependencies to latest

Commit 6a4b062

- Fixed, user MODE not display correctly, with multiple different nickname in cache.

Commit 25ef608

- Rewrite of message routing function in manage-channels-panel for channel messages.
- New: Added 324, 329 routing to channel-panel to display channel modes
- New: Added 367, 368 routing to channel-panel to display channel ban list
- Fixed MODE response for user not routing to server panel.
- Fixed QUIT response not routing to channel-panel
- Fixed NICK response not routing to channel-panel (channel modes)
- Fixed NICK response not routing to irc-server-panel (user modes)
- Fixed HotKey Alt-N not scrolling to channel panel if already visible
- Fixed activity icon for CTCP request shown as notice.

Commit 0bdb8e1

- Clean up typing errors on page text (no code change)

Commit 2c3fdda

- Fixed server-list-panel was not showing mobile screen width after page refresh on iPhone
- CSS/HTML adjust height of several panels using textarea and margins
- manage-channels-panel: added 3 checkboxes for default media beep sounds
- manage-channels-panel: default media beep setting persisted to local storage
- When creating new channel, use preset media beep sound enable flags from manage-channel-panel
- channel-panel: hidden panel becomes visible for KICK, JOIN, NOTICE, PRIVMSG, and TOPIC
- channel-panel: media beep sounds for KICK, JOIN, NOTICE, PRIVMSG, TOPIC
- Add panel behavior description to help panel
- channel-panel and manage-channels-panel scroll to top of viewport instead of bottom

Commit 45914df

- Remove temporary visibility attribute from show-raw.

Commit 5603d70

- Fixed DALnet server originated NOTICE message was not showing

Commit b605e36

Added more debug tools

- In raw-message panel, added checkbox to view both raw IRC server message as text and parsed message object as JSON.
- In raw-message panel, added feature to submit a sample IRC server message to the IRC message parser while observing browser dev tools console.

Commit d170d18

- Fixed button on server list form call wrong function (copy/paste error)

Commit ae3f665

- Shorten message to fit smartphone screen

Commit de71534

- header-bar, the hamburger icon for dropdown menu is always visible, no longer hide on websocket disconnect
- nav-menu listens to web-connect-changed event and hides various menu items when websocket is disconnected.
- websocket-panel, added checkbox to persist websocket auto-reconnect disabled in future page loads using localStorage.
- websocket-panel, added help info button and some collapsible information section.
- irc-controls-panel added some title attributes to buttons as popup tooltip messages
- Various HTML/CSS adjustments.

Commit d70d73e

Issue - iPhone with channel-panel zoom 

When viewing an IRC channel on an iPhone and the zoom is activate for the panel,
each time the input textarea is touched and the textarea element grabs the focus, 
the Apple screen keyboard pops up covering the lower half of the page.
The triggers the browser resize event, which in turn causes the web page to 
recalculate the proper number of col and row attribute integer values for
the main channel textarea elements. THe result is a jittering of the page in a
recursive series of resize events as the screen is scrolled.

Fix (for now)

For now, the dynamic resize of the textarea elements is disabled after
one initial dynamic resize. When the zoom is cancelled, the dynamic resize is re-enabled.
This seem workable for now. Therefore, if the browser is resized while zoom is active,
it will be necessary to un-zoom, then zoom again to fit the new viewport dimensions.
Otherwise dynamic resize is always active on all panels when not zoom mode active on a channel-panel element.

Commit 6cb3d57

- Hotkey Alt-I will cycle show, collapse, and hide for the irc-controls-panel. (collapse is new)
- Added link to /docs/ folder in help panel, includes test if /docs/ is enabled on remote server.
- Updated README.md to show status of the new version, with drift README changes.
- Added upgrade disclaimer to /docs/ folder warning of legacy screenshots.

Commit 2e69648

- Mute header bar status icons, (IRC message related only) when disconnected
- Comments

Commit 61a2e7b

- Fixed: disconnect from IRC, then reconnect, open channel, message cache was not loading.
- Fixed: disconnect from IRC, then reconnect, private chat message cache not loading from cache.
- Moved Erase Cache button from irc-server-panel to debug-panel.
- Changed behavior of channel panel and private message panels, visibility and unread message counter:
  - If a channel or PM panel is hidden and a message arrives it will open, scroll into position, place focus on text input area
  - If a channel or PM panel is collapsed to a bar and a message arrives, the panel will remain collapsed, but unread message counter will increment and display in dropdown menu, collapsed bar, and show header bar icon
  - If a channel or PM panel is open, but does not have the focus, and a message arrives, the open panel will display message, but not scroll and not grab focus. The unread message counter will increment and display in dropdown menu, collapsed bar, and show header bar icon
  - If a channel is in zoom mode and a message arrives for another panel, no other windows or bar will open. The unread message counter will increment and display in dropdown menu, collapsed bar, and show header bar icon

Commit 0f980d4

- Fixed hotkey Alt-N not show channel panel when only 1 channel is joined.

Changes for irc-server-panel

- Removed IRC server panel auto-close 3.5 second after connect, (annoying behavior)
- Removed irc-server-panel auto-open on IRC server raw messages, rely on activity icons.
- Specific user text commands that return an IRC message, such as /ADMIN, will show irc-server-panel and cancel zoom.
- The irc-server-panel will show temporarily when ircState.ircConnecting is true (connect in progress), then auto-hide.
- The irc-server-panel activity icon is cancelled after an IRC connect/disconnect
- Fixed normal/taller button handlers were missing, added them.

Commit d5092be

- Committed the bundled and minified folder "build-prod" to the repository. All future commits will include this folder.

Commit fefb4a2

- Disable certain hotkeys when not connected to IRC

Commit 7007a5e

- When opening channel-panel, pm-panel, or irc-server-panel set focus to input textarea element.
- Fixed channel-panel, eventListener still active after element removed from DOM
- Upgraded auto-complete to replace deprecated `event.keyCode` property with `event.code` for keydown events.
- Added (experimental) hotkey assignments to show/hide panels. This was developed using Chrome/Linux, unknown if hotkey assignments will conflict with other browser/OS.

```
Alt-B - Bars, collapse panels to bars
Alt-C - Channel Panels (Show/Hide)
Alt-H - Help, IRC commands (Show/Hide)
Alt-I - IRC Connect/Disconnect Controls
Alt-L - List of IRC Servers (Show/Hide)
ALT-X - Next, Cycle IRC channel panels
Alt-P - Private Message Panels (Show/Hide)
Alt-S - Server Messages (Show/Hide)
Alt-X - Hide all panels.
Alt-Z - Zoom, (Channel panel only)
```

Commit 19a5aec

- Added inhibit-auto-scroll checkbox to channel-panel. This is used to prevent scroll when trying to Edit-Copy to clipboard.
- More adjustments to panel visibility

Commit b20cd28

- Fixed navigation dropdown menu corruption when IRC connect state changes with menu expanded.
- Setup channel panel visibility from new channel, page refresh, websocket auto-reconnect, IRC auto-reconnect, incoming message
- Setup manage-channel-panels to hide itself after page reload and auto-reconnect for case of no IRC channels are joined, else show it.
- irc-server-panel will hide itself 3.5 seconds after a new connection to IRC network.

Commit 874f59b

Issue:

When using the irc-controls-panel as the screen panel from which to connect to IRC,
there is a button for Edit Selected Server. If this is used, and the edit is successfully 
saved, then the 'selected' server will revert to index 0. This could cause a user to connect to the 
wrong server after an edit, if the change in selection is not noticed in the panel.

This behavior is controlled in the backend web server. In the previous version, the 
server list editor was an independent web page (serverlist.html). Changes to the
server list required disconnect from IRC, exit the IRC client page, and navigation to a different editing page.
Upon re-open of the IRC client page, the user was required to select a server before connecting.

At a higher level this is actually a desired behavior because changes to the list 
can involve deleting, inserting, and re-ordering the list of servers.
After an edit, a given server server may be at a different index than before the edit.
Although this could be solved with complex logic in the backend, such a change would create a breaking
change for anyone using the backend with alternate HTML frontend browser.

The problem is compounded because a user can have multiple browsers connected simultaneously, 
like desktop, tablet, and smartphone. Each of these concurrent connections can 
display simultaneously the irc-controls-panel, server-list-panel, and the server-form-panel.

Solution:

For the case where a given IRC server is edited, which does not reorder the list, the selected index number
is saved before edit and restored after the edit by code in the browser in the server-form-panel web component. 
An edit workflow would be as follows:

- Server form opens in edit mode, the previous selected index number is saved.
- User enters changes and then presses the SAVE button
- Changes are submitted to the backend database and the selected server index is reverted to 0
- Upon successful HTTP response from the POST request, a second POST request is sent to select the previous server index number.
- When the backend changes the selection index number, the backend sends a "UPDATE" command to all connected browsers.
- Each browser performs getIrcState() call and then updates all browsers to the correct index number.
- The server-list-panel highlights the proper server in the list as 'selected'
- The irc-controls-panel change the panel content to show the selected server.

To address changes on the server-list-panel that could change the order of the server list, such as Delete,
a text warning was added to the panel below the server table. Such a change can not be initiated from any other panels.

Other change:

- Added check to server list Connect button handler to make sure the index encoded as attribute of the button matches currently selected index.
- A new web component 'show-events' was added selectable from the debug panel to display global javascript events as they occur. (needed for debugging)

Commit 7151bde

- Add Socks5 Proxy address info to irc-controls-panel, server-list-panel and server-form-panel.
- Split help-panel into 2 panel, help-panel and license-panel
- Improvements to debug panel

Commit d6c3685

- Made a pass through the javascript files updating comments.
- Clean up CSS and HTML files (remove extra blank lines, etc)
- Removed temp-placeholder web component (contained ghost functions to avoid build errors)

Commit 7a74411

- Adjusted zoom and un-zooomed dynamic screen size to better fit iPhone screen.
- Fixed Channel topic not updating when changed.

Commit fbf5ea8

- Fixed server-list-panel connect button used wrong nickname from other panel.
- More debugging and adjustment unread message activity icons

Commit 9eb8d8b

This commit is a deep dive into panel visibility and scroll panel position 
in response to state changes. The behavior for panels differs depending on
the trigger action (new page load, page reload, message-cache reload, 
incoming IRC messages, or user activation of page elements).

This is expected to evolve further after some experience, but some initial comments:

- Both manage-channels-panel and created channel-panel elements will always scroll to the bottom of the viewport.
- Other panels, including private message PM, notice, and wallops will scroll to the top fo the viewport.
- Refreshing the page will show the irc-controls-panel and each active channel-panel or pm-panel as a collapsed bar.
- If a window is 'zoomed', then no other windows will open, but activity icons will show.

Changes:

- Added default attribute to activity-spinner web component so initial state can be specified 'show' or 'hide'
- Added activity irc-server-panel unread message status icon to header bar
- Dropdown navigation menu added unread message indicator for server panel in menu
- server-list-panel in the HTML table, fixed CSS for 'disabled' table td row, text color and background-color were same (invisible)

Commit 145d1f9

- On first page load, automatically display IRC server edit form to create new server during first page load when no servers have been defined.
- On each websocket (re)connect show irc-controls-panel, as bar if IRC connected, else show full panel if not connected.
- On page refresh, active channels and active PM panels are collapsed into bar display.
- Added flashing timer to message activity icons

- Fixed: Server edit form not closing when web socket disconnected.
- Fixed: Private message panel not closed on IRC disconnect
- Fixed: Manage PM panel not closed on IRC disconnect
- Fixed: When creating new IRC server configuration, the Save button has wrong event listener.

Commit e6ab5a0

- Removed legacy _styles-old.css, the CSS file from previous version. Only new CSS is now included in the build.
- Copied in remote server debug API calls into debug-panel.
- Cleaned up the CSS layout of the debug-panel
- Removed temporary functions from debug panel

### Server change

Code to assign the root directory of the web server was changed to avoid duplication of code in the git repository.

- Changed code (server/web-server.mjs) used to assign the root folder of the web server.
  * The source files are located in the "source-files" folder.
  * A 2nd folder "build-prod" with bundled and minified files will commit to git.
  * A 3rd folder "build-dev" is used in development for line number debugging of javascript.
  * The "build-dev" folder will be cleaned before git commit to avoid a third copy.
  * In the case where the server is started with NODE_ENV==='development' and the "build-dev" folder is empty, the web server will fall back to the "build-prod" folder as root directory for the web server.
  * When NODE_ENV is "production", the "build-prod" folder will always be used.

- Removed to code to dynamically generate serverlist.html because the server list editor is now included in the main page.
- Added websocket ping capability using /irc/test3 test route, responding by sending DEBUGPONG over websocket stream.

Commit ba25442

- Added getter and setter for headerBar status icons
- Status bar unread message icons working for channel, pm, notice, and wallops
- Unread message count display in dropdown menu for channel and PM messages
- Unread message status for notice and wallops working in dropdown menu
- The manage-channels-panel shows unread channel message count
- The manage-pm-panels shows unread PM message count
- Kicked and not in channel icons for channel window.

Commit bc82646

- Added message handling code to private message panel.

Commit ea919a7

- Added Private Message PM panel, open, close, message processing TBD.
- Debugging channel-panel
- Fixed, unable to save server edit after input validation fail
- Added fetch server message cache display to raw message display

Commit 113fe64

This is a major rewrite of the channel panel "zoom" button code.
Now it is more useful, especially on a smart phone.

- Hides all other panels
- Inhibits other channel and notice panels from automatically opening if new text arrives (server and wallops still open automatically.)
- Set's channel panel textarea column and row heights to fill the entire browser window.
- Set's a "zoom" icon in the header that if clicked will unzoom any zoomed window.

Commit 2318a29

- Added media playback for audio "beep" sounds in web component beep-sounds.
- Hooked media sounds into channel panel and header bar.

Commit 14ba60c

- Added websocket will auto-reconnect if browser disconnected.
- Added API handler for route /terminate
- Added API handler for route /irc/erase
- Added API handler for route /irc/cache
- Added and debugged cache reload to server panel, notice panel, and wallops panel

Commit c743ea8

- Debug HTML and CSS in irc-controls-panel, server-list-panel, server-form-panel, irc-server-panel

Commit 24687fa

This is another large commit that includes 
the new server-list-panel web component.
The irc-controls-panel, server-list-panel, server-form-panel 
and the irc-server-panel web components are now 
interconnected and functioning.
Additional edit and debug still required.

### Server change

- server/web-server.mjs, permission change, API route /irc/serverlist/ method GET is now readable even if server list editor is disabled in config.

Commit f144aef

- renamed server-form.css server-form-panel.css
- renamed server-form.html server-form-panel.html
- renamed server-form.js server-form-panel.js (updated references)

Created new web component server-list-panel, blank template for now.

Commit 8b63dca

The IRC server list editor was previous an independent 
web page at /irc/serverlist.html. 
It is being integrated to the main app.
The IRC server configuration editor HTML form and JavaScript
was copied to the server-form web component.
Temporary buttons were added to the irc-controls-panel
to perform an edit of the IRC server at index 0.
There is no capability change index at this time.

Commit 02240fb

The local command parser for commands entering from user input was 
copied to the local-command-parser web component.
Text input from the channel-panel and the irc-server-panel was 
setup with the auto-complete functions and tested to issue commands.
This has now reached the point to interact in both directions with the IRC server.

Commit a9d9765

This was a large commit. The remote IRC command parser for commands entering 
from the websocket was copied into the web component 
remote-command-parser. Function calls into the channel-panel, 
notice-panel, wallops-panel, and irc-server-panel were setup 
to pass messages to the panels for display after parsing.
More debugging is needed. New web components:

- show-raw
- ctcp-parser

Commit d956971

- Debugged irc-controls-panel interface to: channel-panel, manage-channel-panel and header-bar 

Commit 788dd0b

In irc-controls-panel.js, added network request handlers
for minimal control of IRC server connection.
This includes getting ircStte object after web socket initialized,
then to connect,send message "/QUIT" or forcibly close the socket.

```
POST /irc/connect
GET  /irc/ircstate
POST /irc/message
POST /irc/disconnect
```

Commit d34a8a6

- Added code to hide dropdown menu items based on ircState flags
- UI panels detect state change and self hide themselves.

Commit - 9d51b6d

This commit added a large number of UI web component files.
The goal was to create all the anticipated UI panels as empty templates.
The panels have some basic functionality, such as close button
and color theme selection, but no IRC controls or javascript has been included.
The minimum functionality is operable from buttons in the the debug-panel.

- help-panel
- irc-controls-panel
- irc-server-panel
- logout-panel
- server-form
- show-irc-state
- show-web-state
- wallops-panel

Several web components files for JavaScript functionality were added.
These are empty at this time, serving as code placeholders.

- beep-sounds
- local-command-parser
- remote-command-parser

- Updated the gulp build file Gulpfile.js located in irc-hybrid-client-dev-tools, branch: web-components to include these files in the build.

Commit 0123237

- Renamed some variables and element id using common name conventions

Commit 03f8cca

- Copied previous code from webclient06.js into channel-panel.js and manage-channels-panel.js. Refactored variables name and element ID. Emulated creation of a new IRC channel and IRC channel messages using debug-panel functions.
- Added temporary web component temp-placeholder.js. This has temporary functions used to avoid reference errors when debugging channel panel stand alone.

Commit 2b393fd

- Added websocket panel, websocket connection active, initial debug successful.

Commit 10efde0

- Added error panel, updated existing showError() calls.
- Added scheduler to js/_afterLoad.js to call list of functions at 1 second interval.
- Fixed activitySpinner for /userinfo

Commit 24253fa

This is a preliminary POC (proof of concept) experiment. The purpose of 
this commit is to setup several UI panels using web components.
It is used to dynamically insert UI panels, manage eventListener functions, and
access data variables globally and inside the shadowDOM elements.
There is no IRC code at this stage.

- Header bar panel with status icons
- Drop down navigation menu
- Prototype IRC notice UI panel
- Prototype IRC channel UI panels
- User web page login and user login status
- Debug toolbox panel

Changes to file from previous version v0.2.53

- Added error panel, updated existing showError() calls.
- Added scheduler to js/_afterLoad.js to call list of functions at 1 second interval.
- Fixed activitySpinner for /userinfo

Commit be2e610

- Deleted source files `secure/*`
- Deleted build folder `secure-minify/*`

Commit d55fd57

- Created branch "web-components" to write and debug web component version of new browser code.
- Added branch description notes to top of README.md
- Bumped version to v2.0.0-dev to mark start of development for new web browser version.

## [v1.0.0](https://github.com/cotarr/irc-hybrid-client/releases/tag/v1.0.0) 2023-08-21

Starting with this commit, a major upgrade to the web browser code has been started.
The version number has been bumped from v0.2.53 to v1.0.0 to mark the end of active development 
on the current v0 web browser code. A new version v2.0.0 will be created to begin development
of upgraded web browser code.

The goal of the upgrade will be to modularize the web browser code by dividing the existing 
HTML and JavaScript into individual custom web components. A new branch "web-components"
will be used to develop the web component version.

## [v0.2.53](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.53) 2023-08-07

- IRC server list editor, renamed button "Copy" to "Duplicate"
- When duplicating an existing IRC server definition, the copy is inserted immediately following the source IRC server, rather than append to the end of the list as before.
- When duplicating an IRC server definition, the name (label) of the copy is appended with "-0", "-1", "-2", "-3" ... "-9", "-dup".
- Updated Thunder Client tests for changes to IRC server list editor.
- Updated /docs/ for changes to IRC server list editor.
- Additional Thunder Client API tests to include tests with expired CSRF tokens.
- Improve explanation of CSRF token use in the API Examples section of the /docs/.

## [v0.2.52](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.52) 2023-07-29

### Fixed

Issue: When using Socks5 proxy, an IPV6 numeric IRC server address was
attempting domain name lookup causing IRC server connection failure via proxy.
IRC servers using domain names that resolve to IPV6 addresses did not have this problem.
It was specific to IRC server numeric address in the form "a123:45bc::6def" 
passing through the socks5 proxy.

Fixed: The NPM package socks5-client accepts 3 options: host, hostname, and port.
For socks5 proxy connections the options were changed from host, port to hostname, port.
Combinations of IRC server address: IPV4, IPV6, FQDN, TLS, non-TLS, and 
username/password were tested with socks5 proxy server addresses: IPV4 and IPV6.

### Fixed

Issue: The IRC server list editor could become responsive when irc-hybrid-client is 
configured to redirect log file output to stdout using console.log() statements.
The faulty server list edit logger was added in v0.2.49, disabled in v0.2.50.

Fixed: Fixed unresolved promise in server list edit logger by adding resolve() statement.
Re-enabled the server list edit logging feature for v0.2.52.

### Upgrade NPM dependencies 

express-rate-limit@6.8.1, node-fetch@3.3.2, rotating-file-stream@3.1.1, eslint@8.46.0, eslint-plugin-import@2.28.0

## [v0.2.51](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.51) 2023-07-28

There are no code changes in this commit.

The Postman desktop client has deprecated the scratch pad feature. It is no longer possible to operate Postman using local files.

The VSCode extension Thunder Client was selected as a replacement. The postman collections have been converted to Thunder Client format. Instructions for the new collections are in thunderclient/README.md

The legacy postman collections can be found in the "postman/" folder in commit 
ca1bec034ca2500251bd67387d94c650b3620db1 from 2023-07-17.

## [v0.2.50](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.50) 2023-07-25

## Removed

Backed out changes from v0.2.49. The server list editor page can become 
unresponsive after posting a server edit to the API. This was a 
feature to add edit history to the log files.

## [v0.2.49](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.49) 2023-07-20

### Added

This is a minor log update. Changes to the IRC server list that are entered 
using the web server API at "/irc/serverlist" will be logged to the file logs/auth.log.
Log data includes IP address, web login username, IRC server address, and port as shown below

```
2023-07-20T14:03:05.663Z 192.168.0.100 user1 EDITSERVERLIST POST irc.dal.net 6697
2023-07-20T14:03:09.801Z 192.168.0.100 user1 EDITSERVERLIST PATCH irc.dal.net 6697
2023-07-20T14:03:12.442Z 192.168.0.100 user1 EDITSERVERLIST COPY irc.dal.net 6697
2023-07-20T14:03:13.688Z 192.168.0.100 user1 EDITSERVERLIST DELETE irc.dal.net 6697
```

- Added server list events logger in server/irc/serverlist-editor.mjs
- Updated /docs/ to explain logging of IRC server list changes

### Added (for previous edit)

- Update FAQ include colorTheme as localStorage property in privacy description.

## [v0.2.48](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.48) 2023-07-17

The goal of this change is to add color themes, light and dark.

Approach: In order to minimize the risk of breaking existing HTML/CSS,
for each colored panel, the "color" and "background-color" styles were removed 
from the existing CSS class definitions, leaving previous margin, padding, etc.
New CSS class definitions were created for each colored panel 
using "xxx-theme-light" and "xxx-theme-dark" containing only "color" 
and "background-color" styles. Javascript could then use .classList.add() 
or .classList.remove() to switch between light and dark.

### Added

- Added 2 buttons to the "IRC Controls" panel that when checked will select dark theme or light theme.
- At the top level, added attribute "theme" to the body element with possible values "light" and "dark". Any elements can get this value.
- Added web browser localStorage property "colorTheme" with values "light" and "dark" to persist color theme when the page is reloaded.
- Added global event "color-theme-changed" so that channel panel elements and private message elements can listen for color theme changes.
- Created multiple new CSS class styles for light theme color and dark theme colors.
- Added javascript to exchange CSS class names for light theme and dark theme.
- Reorganized the layout of the "IRC Controls" panel. It was cluttered, confusing, and show too many read only values by default.
- Updated /docs/ folder with new screen captures of the IRC Controls panel.
- Update package dependencies @dr.pogodin/csurf, dotenv, express-rate-limit, eslint

## [v0.2.47](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.47) 2023-06-29

Run npm audit fix to clear audit violation on regular expression DOS for package word-wrap.

## [v0.2.46](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.46) 2023-06-27

This issue involves playing audio beep sounds in response to IRC channel messages using 
the default mp3 audio files included in the repository. 

Issue: Following a long period of silence. with some audio devices the 
first beep is not heard on the speakers. Subsequent beeps immediately after play correctly.
This has been observed when using HDMI audio as the Linux audio output device.
This does not occur with internal laptop speakers.

The default channel message "short-beep1.mp3" was previously 1300 Hz at 0.20 Amplitude and duration 0.250 seconds.
If the audio device takes more than 0.25 seconds to connect/initialize, then the initial beep is missed.
As a work around, the default sound files have been regenerated to include 
0.75 seconds of silence prior to the start of the tone. The slight audio delay seems to fix the problem.

### Changed

- Regenerate audio files short-beep1.mp3, short-beep2.mp3, and short-beep3.mp3.
- Add 3 buttons to the hidden section ("More..." button) of the Server panel to manually play the beep sounds (useful to set speaker volume)
- Bump eslint to current version.
- Manual edit package-lock.json set semver to semver@7.5.3 to clear npm audit notification for eslint-plugin-import.

## [v0.2.45](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.45) 2023-06-18

The goal of v0.2.45 is to simplify the setup of IRC server settings during a new installation.

* On launch, the web server will automatically create a new empty server list.
* On opening the IRC client page, the page automatically redirects to the server list editor page.
* The server list editor form has help buttons to explain and provide instructions for each IRC server setting.

### Browser Changes (webclient.html)

- Detect empty IRC server list or detect all servers disabled, then browser auto-redirects to server list editor "irc/serverlist.html"
- Detect empty IRC server list when server list editor is disabled and show pop-up panel with instructions.
- Added additional info buttons (?) to the server panel showing field descriptions and data entry instructions.
- Add event listener to show popup panel warning when clicking on read radio buttons
- If /docs/ folder is enabled in the web server, [view /docs/] button moved to top bar of License/Info tab.

### Brewser changes (serverlist.html)

- If /docs/ folder is enabled in the web server, show [Help] button with link in the server list edit form page.
- Detect empty IRC server list, show pop-up panel with instruction, hide IRC return button.
- Detect condition were all IRC servers are disabled, open pop-up panel with instructions, hide IRC return button.
- Added additional info buttons (?) to the server edit form showing field descriptions and data entry instructions.
- Added icon showing required fields on IRC server form.
- Added [Web logout] button to server list editor page.

### Server changes

- In server/irc/irc-client.mjs, on program start, if the "servers.json" (server list) file does not exist, create a new empty server list automatically.
- In server/irc/irc-client-log.mjs, edit startup message for auto-created logs/ folder to match auto-create server list message.
- In server/web-server.mjs, change /irc/serverlist.html authorization failure action from redirect to 403 forbidden.

### /docs/ changes

- Update general instructions for IRC server configuration.
- In server-config.html, update some individual server field instructions to match pop-up help in server list editor.
- Update screen shots showing IRC Controls and server list form editor.

## [v0.2.44](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.44) 2023-06-13

Version v0.2.44 changed only the backend server. 
No browser code was changed. In v0.2.44 there were 2 primary goals:

- 1 Convert the Node web server from CommonJS modules to ECMAScript modules.

The motivation for converting server package format to ES Modules is to 
allow import of NPM modules that no longer publish a CommonJS package format.

The direct dependencies were checked one by one. The following NPM repositories appear to
provide specific ES Modules packages: connect-redis, dotenv, express-rate-limit, helmet, 
node-fetch, rotating-file-stream, and ws. The remainder of the dependencies 
were CommonJS modules. All modules imported without issue except ws which has 
different exports for the ESM version. 

- 2 Add new capability to manage web server configuration using UNIX environment variables.

The motivation for use of environment variables is to simplify configuration where the 
web server is deployed in a container. 

No configuration changes will be needed for this upgrade.

The introduction of two concurrent configuration schemes may introduce 
some security questions. Configuration of security related properties
could contain ambiguous conflicting values between the two configuration methods.
To minimize risk of ambiguous configuration, only one method is used at one time.
In the case where the file "credentials.json" exists then configuration 
will be parsed from the credentials.json file in the base repository folder.
This is the established configuration method up until this release.
In case case where the file "credentials.json" does not exist then
the configuration will be parsed from UNIX environment variables.
For configuration properties that have not been defined, then the
server/config/index.mjs module will define fallback default values.
In the long term, the credentials.json config file may be deprecated (breaking change)
to standardize all of the server configuration with environment variables.

This also helps debugging. Since environment variables can be specified in the command line, 
using the terminal, it makes it easy to rapidly switch between server configuration 
options using the up arrow with different command lines.

### Changes (Long list, from here down to previous git tag number)

After commit ee0a0c2 ( previous version v0.2.43)

Several existing backend modules are wrapped in functions.
In order to upgrade to ES Modules, the function wrappers will be removed.
This is a large text edit with no code changes.
This is being done before code changes so the actual changes to 
convert CommonJS to ES modules can be more easily seen in the diffs.

After commit eab9e51

- Rename .eslintrc.js to .eslintrc.cjs (CommonJS format) and set lint configuration for ES Modules
- Edit package.json, set `"type":"module"`, change some script filenames from .js to .mjs
- Add ".env" to .gitignore file
- Install NPM package: dotenv to allow use of .env file
- Create new ES module server/config/index.mjs. Function: 1 - Parse credentials.json, or 2 = Parse environment variables, then 3 - Export config.
- Rename bin/www to bin/www.mjs, convert to ES Module, temporarily disable websocket
- Rename server/irc/irc-client-log.js to irc-client-log.mjs, convert to ES Module.
- Rename server/middlewares/user-authenticate.js to user-authenticate.mjs, convert to ES module.
- Main server/web-server.js, renamed to web-serve.mjs, and ...
  - Convert module import statements to ES format
  - Import configuration from server/config/index.mjs instead of credentials.js
  - Temporarily comment out IRC client modules and routes
  - Temporarily comment out IRC server list editor routes
  - Temporarily comment out /doc help page routes
  - Temporarily comment out web socket authorization routes and modules
  - Refactor express-session, memorystore and redis for alternate configuration
  - ES modules load asynchronously. They can not be loaded conditionally. Therefore both internal and remote authorization modules needed to be loaded concurrently, then select the proper auth module later after the configuration loads.
  - Reconfigure morgan logger to use imported log file configuration from irc-client-log.mjs
  - Created example .env file "example-.env"
  - Updated example-credentials.json

Initial test: Successfully started web server using internal local user authentication 
and morgan logger with all custom routes disabled.

- Debug/Fixed: server/irc/irc-client-log.mjs, in new clone of repository, NODE_ENV=development, write to log file before "logs" folder created.
- Rename tools/updateAuthForUser_1.js to updateAuthForUser_1.mjs and convert to ES Module
- Create new tool script tools/genEnvVarAuthForUser_1.mjs to generate environment variables for copy/paste when using local authentication.

After commit f9de974

- Rename server/middlewares/remote-authenticate.js remote-authenticate.mjs, convert to ES modules, alternate configuration index.mjs

After commit ba9e578

- Removed comments used to disable IRC client in web-server.mjs and bin/www.mjs
- Converted the following additional IRC client backend server modules to ES Modules, and updated configuration source.

```
server/ws-server.mjs
server/irc/irc-client-cache.mjs
server/irc/irc-client-cap.mjs
server/irc/irc-client-command.mjs
server/irc/irc-client-ctcp.mjs
server/irc/irc-client-parse.mjs
server/irc/irc-client-vars.mjs
server/irc/irc-client-write.mjs
server/irc/irc-client.mjs
server/irc/irc-serverlist-editor.mjs
server/irc/irc-serverlist-validations.mjs
server/middlewares/validation-error.mjs
server/middlewares/ws-authorize.mjs
server/testws/testws.mjs
tools/showIrcLog.mjs
```

- Debug: NPM package 'ws' for websocket server loads differently in ESM than CommonJS, requiring some minor code change in ws-server.mjs.
- Debug: Edited server/testws/testws.mjs to dynamically load debugging module for websocket authorization test, if uncommented in web-server.mjs
- Address various eslint linting errors in backend server
- Preliminary test: limited trial in dev virtual machine was able to successfully connect to IRC server.
- This is ready to debug.

After commit 543db92

- Removed nodeEnv and NODE_ENV from server/config.index.mjs as export/import. Put NODE_ENV back in individual files where it was originally.
- Setup config and successfully ran postman tests, no issues
- Added version identifier to configuration when using environment variables, set to 2 to match credentials.json
- Add node version check requiring node 16 or greater, else exit with error.
- Update filenames in restart.sh. The restart.sh script will only work using credentials.json as configuration source.
- Created alternate restart2.sh script for use in a server configured with environment variables.
- Add configuration validation that cookie secret has been defined and user account has been configured.
- Updated README.md for dual configuration.
- Log files change permission from 644 to 600 when creating new log files
- Fixed env variable SITE_SECURITY_CONTACT omitted the "mailto:"
- Update /docs web page to explain dual configuration options with examples.

After commit 52e5cd3

- Bump redis to redis@4.6.7
- Bump node-fetch from v2.6.11 to v3.3.1, checked for breaking changes.
- Set node-fetch module replacement conditional when remote login selected.

The legacy node-fetch v2 package had previously generated 
an NPM outdated package warning when using CommonJS modules. 
The upgrade to ES modules has allowed upgrade to the current 
version of node-fetch v3, which has removed the outdated package warning.
Considering that node v18 and greater supports fetch API natively, 
in the future the node-fetch package may be eliminated by 
setting minimum node version to node >= 18.
This only impacts remote login. Instances that use local login 
do not perform any backend fetch requests.
This clears all npm outdated package warnings.

After commit d796fd2

- Fixed: utilities to generate user login would not accept space characters in user's name.
- Debug and edit: configuration parsing, example configuration files.
- Update to /docs and README.md
- Added "custom*" to .gitignore so custom bash script can be created without git conflict.
- Add table of configuration properties and default values to /docs/
- Parse missing instanceNumber as null.

After commit e8c4c73

- In server/web-server.js, re-coded the previous express error handler. New custom error handler smaller and simpler.
- In case of remote login, file server/middlewares/remote-authenticate.mjs, updated fetch() code used to exchange auth code for access token, and submit access token to get token meta-data.

This is a case where a fetch in the browser causes a second fetch inside the web server.
Previously, if the authorization server fetch request did not return status 200, 
the fetch was aborted inside the web server and an error thrown, returning 500 to the browser. 
This does not provide any information on the cause of the authorization error.
The fetch code was extended so the web server will request a content response 
from the authorization server following a status NOT 200 error, the error response 
text message indicating the reason for the error is added to the error when thrown.
If the OAuth2 error response included a WWW-Authenticate header with error description, the message 
it is also appended. With this change, when remote login fails, the error in the
authorization server is sent to web server and in turn forwarded to the browser.
This has no impact when configured for local login.

Example remote auth error:

500 Internal Server Error, HTTP status error, 403 Forbidden, POST http://127.0.0.1:3500/oauth/token, {"error":"invalid_grant","error_description":"Invalid authorization code"}

- Fixed: unclosed input tag in html fragment file

- Fixed: detection of browser disabled cookies when using browser local login.

It appears that the blocked cookie detector was a working feature 
that was later broken by adding CSRF token middleware.
If an expected cookie is not present, the CSRF validation fails prior to the cookie check.
Therefore a missing cookie will generate an incorrect (CSRF) error message 
rather than the expected cookie disabled message.
To mitigate this issue, a new cookie check was added to user-authenticate.mjs.
The new middleware is called in web-server.mjs prior to the the CSRF token check.
First a request to GET "/login" initializes the session triggering express-session to
create a new cookie returned to the browser with the blank HTML login form.
Second the password submission to POST "/login-authorize" checks that a valid cookie exists.
If no cookie is found, the browser is redirected to the "/blocked" route so
the user will be properly informed of disabled cookies in the browser.

- General edit of program startup console.log() messages. Due to ES modules import prior to code running, start up messages are in different order.

- Fixed: in server/irc/irc-client-log.mjs, log file rotation parameters size and interval not parsed from config object.

- Fixed: Detection of disabled cookies when using remote login.

For the case of remote login enabled, a new cookie check was 
added to remote-authenticate.mjs that works as follows:
Remote login uses the OAuth2 authorization code grant workflow.
Unauthorized HTTP requests to GET "/irc/webclient.html" 
will redirect to GET "/login" route that calls loginRedirect 
in remote-authenticate.mjs. This will initialize the session 
which will trigger express-session middleware to  
create a new cookie, returned to the browser with the 302 
redirect response to the remote OAuth2 server's address.
After password entry, the OAuth server redirects back to the 
GET "/login/callback" route with an auth code, at which point 
existence of the cookie is checked before proceeding 
to submit the authorization code to the web server.
If no cookie is found, the browser is redirected to the "/blocked" 
route to display the proper message.
However, the external authorization server may fail 
independently of irc-hybrid-client if cookies are disabled, 
but that is outside scope of this code.


## [v0.2.43](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.43) 2023-05-28

### Updated

- Updated helmet from v6 to helmet@7.0.0 with edits in server/web-server.js
- Bumped versions connect-redis@7.1.0, node-fetch@2.6.11
- Bumped dev dependency eslint and it's dependents to current version

### Changed

The log file rotation introduced in v0.2.38 did not work out as planned.
Although minutes and hours are based on a time divisor, intervals specified in days 
are based on a simple timer that is re-initialized each time 
the server is restarted. Unfortunately, if the server is restarted 
more frequently than the rotation period, then no rotation will occur.
For more information on rotation, refer to the NPM package README
for [rotating-file-stream](https://github.com/iccicci/rotating-file-stream#readme).

To address this file size was added as a rotation property.
The configuration now supports optional properties for
"logRotationInterval" and "logRotationSize".
The file size allowable units are ("B", "K", "M", "G"), 
example: "1M" to limit each rotated file to 1 megabyte.
Configuration may use interval, size, both, 
or neither. The example-credentials.json and /docs have been 
updated with revised instructions.

## [v0.2.42](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.42) 2023-05-01

- Node v16 or greater is now required for the web server backend.

Changes in v0.2.41 broke Node v14. The package.json was updated to specify Node >=16.
The README and /docs were updated to specify Node v16 as minimum version.

### Changed

In followup to the express-validator v7 upgrade in v0.2.41, a custom validation error was updated
so the schema of the error object will match express-validator v7 format.

## [v0.2.41](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.41) 2023-04-28

### Changed (web server)

Performed a general code clean up in the web server login authentication
modules: 

- server/middlewares/remote-authentication.js
- server/middlewares/user-authenticate.js
- server/middlewares/ws-authorize.js.

### Changed (web server with remote login)

This change refers only to the optional remote login (oauth2) configuration.
The default internal web login (user/password) does not use 
the node-fetch module so therefore not impacted.

When configured for remote login, HTTP requests are issued to 
exchange authorization codes and validate access tokens. 
This program has been using an older legacy version 2 of "node-fetch"
because the current version of the "node-fetch" has dropped 
support for CommonJs modules. 

Starting with Node v18.0.0 a new fetch() API
was added to NodeJs, similar to the browser window.fetch() API.

As of this upgrade, when configured for remote login,
the program will check if the new fetch() api is available.
If available it will be used, otherwise the legacy 
node-fetch version 2 NPM module will be loaded automatically.
In the future, node v18 or greater may be required for remote login
and "node-fetch" may be dropped from package.json.
This would clear node-fetch outdated package messages.

### Tests update

Postman tests were run to make sure they still worked properly.
Updated postman collection "irc-hybrid-client API auth tests"
to provide more descriptive error when a postman global variable is 
missing and how to fix it.

### Upgraded (web server)

The package "express-validator" was upgraded from v6 to v7.
The express-validator is used to perform input validation
when submitting data from the server list editor.
Various syntax changes were required in irc-server-list-validations.js
in order to accommodate breaking changes in v6 to v7 change.
The schema of the error messages was changed by the upgrade to v7. 
These error changes do not impact the IRC web frontend.
If you are using the backend web server independent 
of the web frontend, this could be an issue, so refer to
the express-validator docs.

Minor version upgrades on packages eslint@8.39.0, redis@4.6.6

### Changed (Browser)

Removed `credentials: include` from fetch() options in 
the server list editor secure/js/serverlist.js. This was a 
copy paste error. The web browser will now fall back to 
the browser default value `credentials: same-origin`. 
This was not likely an issue because the Content Security 
Policy (CSP) prevents cross origin requests altogether.

## [v0.2.40](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.40) 2023-04-12

### Fixed

In browser, fixed error where clipboard multi-line copy/paste into 
a private message panel would not be sent for the case where the 
PM nickname contains upper case characters. This issue did not 
impact channel panel copy/paste functionality.

### Changed

As security improvement in the web server, the javascript object 
used to hold the IRC message cache is now created 
using `Object.create(null)` rather than assignment to an 
object literal so the object will not have a prototype 
that could be modified. (Note: strings obtained externally from the 
IRC server containing channel names are being used to create keys 
in the IRC message cache object. This was unlikely to have been a 
significant risk because `__proto__` would not be a valid
IRC channel name which must begin with "#" or "@" characters. 
It is safer practice to create the object this way.)

- Updated npm packages.
- Erase and regenerate package-lock.json

## [v0.2.39](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.39) 2023-04-05

### Fixed

Issue: In the case were the redis server is configured to require a
password with `requirepass xxxxxxx` in /etc/redis/redis.conf and
a redis password is set in credentials.json (sessionRedisPassword),
the web server would return status 500. The browser would display
"NOAUTH Authentication required".

Fixed: 
A password string length check was fixed in web-server.js.
This bug prevented the npm package "redis" from connecting 
to the redis server. All routes would return status 500.

### Changed

- Upgrade connect-redis@7.0.1. The upgrade from connect-redis v6 required code changes in web-server.js to fix breaking changes in connect-redis v7.

- Upgrade npm packages: @dr.pogodin/csurf cookie-signature node-fetch ws

- Erase and regenerate new package-lock.json in npm lock file version 3 format.

### Added

Issue: The "/docs" folder of the git repository can be optionally
served in the "/irc/docs/" route of the web server if
configured in the credentials.json file. However, there are no 
links on the irc client web page that can be used to view the documentation.

Browser Change: Added an irc-hybrid-client "View Documentation" button to the Info/License 
section of the web page. The button is a link to /irc/docs/index.html.
Upon the first time the Info/License section is un-collapsed,
a test HTTP fetch request is performed to determine if /irc/docs/ is
available on the web server. The visibility of the 
documentation button set accordingly.

## [v0.2.38](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.38) 2023-03-25

### Added

Added log file rotation using npm package rotating-file-stream.
This will allow log file rotation similar to Linux system files.
For example: irc.log will be rotated to irc.log.1, irc.log.2 up to irc.log.5,
Older files will be discarded during rotation.
File rotation applies to the HTTP access log (access.log) and 
the raw message IRC log (irc.log). The file auth.log where 
user login history is recorded is not rotated.

Log file rotation is enabled assigning the "logRotationInterval"
property in credentials.json to the proper string value.
Log rotate available time units (s, m, h, d) are used to specify the interval 
string. (Example: '5m', '2h', '1d').

For backward compatibility, if the logRotationInterval is missing, 
the program will write log files without filename rotation, consistent with 
logging functionality in the previous version.

## [v0.2.37](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.37) 2023-03-01

### Changed

Following on to the previous change yesterday, in v0.2.36, this will persist
the collapsed or expanded state of each channel panel during an 
API cache reload.

## [v0.2.36](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.36) 2023-02-28

Overview

In a previous upgrade, the operation of /JOIN an IRC channel 
now triggers a API call for an API cache reload.
The cache reload had the unintended consequence of causing 
various hidden panels to become visible.
This in turn caused the page to scroll and show extraneous panels.
The general intention of this change is to keep hidden panels
hidden during API cache reload. This includes 
Server, Wallops, Notice and Private-Message (PM) panels.

Reminder, the [+All] button can be pressed any time to show all hidden panels.

### Changed
 
- Inhibit both hide and un-hide of Notice panel during cache reload.
- Inhibit both hide and un-hide of Wallops panel during cache reload.
- Close Wallops panel after erase.
- Close Notice panel after erase.
- Inhibit un-hide of server panel when receiving channel name not matching a channel. This is to address an asynchronous timing issue caused when DALnet XFLAG AUTOMSG messages arrive and are parsed before channel creation has been completed.
- Auto-hide IRC Channels panel after joining at least 1 channel.
- Renamed "IRC Channels" panel to "Join IRC Channels".

- Collapse Private Message whois/send panel after sending initial PM, or expanding any collapsed PM panel.
- Added: the API cache reload will temporarily create an array of nicknames of open PM panels, then set visibility of PM panels during cache reload based on stored array nicknames. 
- The [Erase All PM] button is visible only if at least 1 private message panel exists
- Pressing the [+] button on the Private Message whois/send panel will make all existing PM panels visible.
- Pressing the [-] button on the Private Message whois/send panel will make all PM panels hidden.
- Remove the [Clear] button from individual PM panel. This was a local DOM clear and did not change cache. Use the [Erase All PM] button instead to erase PM messages from cache.

### Fixed

Issue: CTCP requests are sent as a PRIVMSG, but the CTCP 
responses are returned to the user as a NOTICE. 
Function buttons used to erase NOTICE messages were leaving 
the CTCP request in the PM cache.
Function buttons to erase all PM messages also erased 
CTCP response NOTICE messages.

Fixed: On the server side in irc-client-cache.js, filters were added
to the NOTICE and PRIVMSG erase API request to properly 
select erase messages.

### Dependencies

- Upgrade dependencies: express-validator@6.15.0 node-fetch@2.6.9 redis@4.6.5 utf-8-validate@6.0.3 ws@8.12.1

## [v0.2.35](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.35) 2023-01-16

### Added

This change added the capability to use an alternate set of custom sound 
files to provide beep sounds that are different from those included in the repository.
Use of custom files is optional.

- Define 3 new filenames `custom-beep1.mp3`, `custom-beep2.mp3` and `custom-beep3.mp3`.
- Added `custom-beep*` to .gitignore so optional custom sound files (if present) do not impact with git pull/merge operations when updating cloned deployments.
- Added new boolean property `customBeepSounds` to credentials.json.
- Added new boolean property `customBeepSounds` to the ircState object. 
- Modified browser code so that if property `customBeepSounds` set to true, then short-beep1.mp3, short-beep2.mp3 and short-beep3.mp3 will be replaced with custom-beep1.mp3, custom-beep2.mp3 and custom-beep3.mp3. Either /secure/sounds/ or /secure-minify/sounds/ may contain custom files depending on environment.
- Modified browser code so that sound files do not load from server unless sounds are configured and requested.
- The related repository irc-hybrid-client-dev-tools was updated to exclude the custom sound filenames from the build minify process.

## [v0.2.34](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.34) 2023-01-01

### Changed

Replaced deprecated package csurf with forked repository @dr.pogodin/csurf. This package is used to validate CSRF tokens included with POST requests to reduce risk of cross site request forgery attempts.

The forked version is a direct replacement for csurf@1.11.0. No code changes were required.

## [v0.2.33](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.33) 2022-12-31

### Changed

Updated npm module redis from v3 to v4. Redis is an optional key/value store that can be used to 
persist login session cookie data across server restarts.
The package connect-redis supports both redis versions v3 and v4, however since redis v4 is promise based
some code changes were required in web-server.js.

Updated npm dependencies: express-rate-limit@6.7.0, helmet@6.0.1, utf-8-validate@5.0.10, ws@8.11.0

## [v0.2.32](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.32) 2022-12-30

- Eslint - Completely removed eslint and reinstalled eslint from scratch. Bumped json5@1.0.1 to json5@1.0.2 which was just released today as version 1 backport to fix the prototype pollution security issue with json5@1.0.1. This will reverse the previous commit (v0.2.31) that manually installed json5@2.2.2 over 1.0.1 to clear the alert. Again, eslint is a development dependency that does not load in production.

## [v0.2.31](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.31) 2022-12-29

### Changed

- package-lock.json - Manually edited package-lock.json to bump eslint dependency json5@1.0.1 to json5@2.2.2 to address github dependabot security alert. Eslint is a development dependency. The json5 dependency upgrade does not appear to impact linting functionality.

## [v0.2.30](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.30) 2022-12-29

### Fixed

This patch is to fix 2 issues with nickname recovery after disconnect

Issue 1

This client has the capability to respond to a server disconnect with 
automated IRC server reconnect and automated re-join of IRC channels. 
If the primary nickname is still connected as a ghost, the program includes 
nickname recovery (when free) and NickServ IDENTIFY after /NICK command.

On DALnet, it was observed that the irc-hybrid-client would occasionally abort the 
nickname recovery prior to issuing the NickServ IDENTIFY causing a 
forced nickname change to GUEST12345.

On DALnet, there is a ChanServ xflag to restrict a user from talking 
for a specified period of time after /JOINing a channel. 
It appears that during this delay, user /NICK requests will cause in the following DALnet error: 

`437 MyNick #MyChannel :Cannot change nickname while banned or moderated on channel`

The RFC Error 437 definition:

`437 ERR_UNAVAILRESOURCE <nick/channel> :Nick/channel is temporarily unavailable`

File: server/irc-client-parse.js - During nickname recovery /NICK requests 
are initiated by either a /QUIT of the primary nickname or the /NICK is issued 
periodically by a timer. There is are 2 counter variables to monitor 1 to 1 correspondence 
between /NICK requests for the primary nickname and 433 responses to /NICK requests.
Therefore on DALnet the unexpected and unhandled  437 response caused the 
counter to go out of synchronization causing cancelling of the nickname auto-recovery.

Changes: Added 437 message handler. The 437 code is a copy/paste of code from the 433 message handler
to increment and check the /NICK response counters to keep in sync with the /NICK request counter.
The /QUIT message handler was modified by adding code to increment the counter so both 
the timer loop and then /QUIT events will both increment the counter prior to issuing a /NICK request.
This way, if either the /QUIT event or the timer event generates a blocked /NICK request, 
the timer loop will remain active issuing future /NICK requests to recover the primary nickname.

Some related variables were also renamed to more descriptive names.

Issue 2

Recently, DALnet has implemented a user privacy IP address +H flag. This results in a 
user having 2 userHost values, one for the actual IP address or hostname, and a second 
for the privacy IP address.

File: server/irc-client-parse.js - The userHost value is used as part of the nickname recovery 
to confirm the alternate nickname belongs to this instance. Previously the userHost was 
parsed from the initial 001 message. Not all IRC server software includes the host 
in the 001 message, so if blank, alternately the host was parsed from the first NICK message 
that match a valid nickname. Once parsed, the value was static. This broke the automatic NickServ IDENTIFY feature 
when a DALnet user was set to +H privacy address, because the 001 message included the actual IP/host 
and the later NICK message included the privacy address. This mis-match blocked the NickServ 
IDENTIFY handler.

Changes:

- Code used to parse the user host address was removed from the initial server 001 message.
- Added new property `ircState.connectHost`. In the case where the 001 message contained a client IP addrress or hostname, the value is saved to the ircState property userHost. The value is not currently used, but it may be useful in the future for cases where actual IP is different from privacy IP.
- Code was added to the JOIN command handler to check if ircState.userHost is blank, and if blank parse the userHost for the case where nickname matches current value. This was an add-on, and there were no changes to the existing /JOIN handler functionality.
- server/irc-client.js - multiple places, clear userHost and connectHost property upon disconnect or start new connections.
- server/irc-client-parse.js - multiple places, clear userHost and connectHost property upon disconnect or start new connections.

## [v0.2.29](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.29) 2022-11-18

### Added

- Added 5 second web server timeout for new connections to perform TLS handshake
- Added 5 second web server timeout for web browser to complete the initial HTTP request.

Discussion: This is an update to the Node/Express HTTP server configuration
to address the case where a web browser TCP connection to the web server 
could wait indefinitely for a valid http request.
If no http request were to sent to the web server, the connection 
could be held open without a time limit. This could use system resources
posing a potential denial of service risk. This risk should be mitigated by this patch.

However, the socket server is dual purpose, listening for both traditional http requests
and also listening for websocket connection requests in order to pass
real time IRC server messages to the web browser over the websocket as a stream.

Lack of a timeout does not appear to have been a risk for the websocket server.
The connection sequence is explained in the comments in server/middlewares/ws-authorize.js module. An authorized http request must be issued prior to attempting a web socket 
connection. This schedules a 10 second connection window for the websocket server.
When the websocket connection request is initiated, if the cookie of the 
websocket request not match the cookie that scheduled the request,
or the 10 second time limit has been exceeded, the websocket request is immediately 
disconnected, closing the TCP socket from the server end.

The alternate question, can changing the socket server timeout or the TLS handshake timeout
adversely impact the websocket connections? An instance of irc-hybrid-client
with timeout patch has been use on DALnet for 24 hours.
No unusual websocket issues have been seen in the logs.

### Changed

- Fixed typo in restart.sh, was not tailing log file
- Full proof read of the /docs web page content with numerous minor corrections and additions. 

## [v0.2.28](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.28) 2022-11-16

### Changed

- Added an IRC command filter to inhibit the server window from auto-opening when a user in an IRC channel changes their name with the 'NICK' command. This is address an annoying situation occurring when a user changes their nickname, causing the browser to scroll the page.

- restart.sh script - Change: Extract optional property 'instanceNumber' from credentials.json. The instance number is added to the command line used to start the server as a command line argument. The irc-hybrid-client program does not accept any command line arguments, so placing the optional argument in the command line will be ignored. This is useful with the 'ps' command when multiple instances of irc-hybrid-client are run on the same server.

## [v0.2.27](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.27) 2022-11-15

### Changed

- webclient06.js - The _splitMultiLinePaste() function used to split clipboard content into an array of strings was rewritten to better address mixed Unix and MS Windows end of line characters (LF) and (CR+LF). This is an improved fix to GitHub CodeQL warning in v0.2.25.

### Added

- Added new property `serveHtmlHelpDocs` to the configuration file credentials.json. If this property exists and is set to true, the help documentation in the repository /docs folder will be included in the web server at path /irc/docs/. User login is required to view the help pages. This is completely optional. To save disk space, it is not necessary to include the /docs folder in web server deployment, nor is it necessary to serve the folder, even if present. Upgrade note: No configuration change is necessary. If the property is not present due to older configuration format, no error will be issued and the pages will not be served.

- Added bash script restart.sh. The script is intended for use after changes to credentials.json. The script is run manually to kill the previous instance by PID and restart the NodeJs instance of irc-hybrid-client. Instructions for restart.sh added to /doc.

## [v0.2.26](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.26) 2022-11-14

### Changed 

- Fix to v0.2.25 - In webclient06.js, replaced string '\r' with String.fromCharCode(13) to address GitHub CodeQL warning.

## [v0.2.25](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.25) 2022-11-14

### Added

- Added multi-line clipboard paste to IRC channel and private messages. When a multi-line clipboard paste is detected, a confirmation dialog is made visible. A dedicated button labeled [Send as multi-line] appears. Activating this button will queue the waiting message for transmission to the IRC server, 1 line each 2 seconds, maximum 100 lines. Each line is previewed in the input textarea before sending. Any IRC commands such as /QUIT from the clipboard will be sent as text and not parsed as commands. Various events will abort the multi-line send, including hide the channel/PM window, disconnect from IRC server, leave IRC channel. This is implemented entirely in the browser, so if an issue arises during a paste, simply refresh the browser page to clear everything related to multi-line paste.

## [v0.2.24](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.24) 2022-11-02

### Added

(Optional) For host machines with multiple IP addresses, the outbound IRC socket may now
be bound to a specific local IP address. This will be the IP address shown
to other IRC users who use the /WHOIS command on your nickname.

The intention of this changes is to allow multiple IRC clients on 
the same server to each use different unique IPV6 address.
Many commercial VPS servers are capable of multiple IPV6 addresses within a specified range.
Multiple IPV4 address are less common, but IPV4 will work if configured.

Change:

* Added new property "ircSocketLocalAddress" of type string to credentials.json.
* To disable the local address, set the property to an empty string.

Comments:

Backward compatibility: No configuration changes are required unless you 
choose to optionally bind an IP address. If the new property does not exist, outbound IRC socket
connection will use the interface and IP address provided by the operating system.

Address Family Issue: When an IPV4 or IPV6 address is specified as the IRC socket local address, 
all connections to IRC servers must use the same IPV4 or IPV6 family.
Example: an IPV4 local socket may not connect to an IPV6 IRC server.
Additionally, this may cause an issue for domain names that resolve to both IPV4 and IPV6 addresses.
Many IRC networks provide family specific IRC domain names, such as `ipv6.dal.net` on DALnet.

Scope:

This change applies to IRC socket connections, both normal (6667) and TLS (6697) that directly 
connect to IRC servers without using the socks5 proxy configuration. In the case where 
the socks5 proxy is configured, the local address configuration property is ignored.

This change does not impact the NodeJs web server. When the web server and 
websocket server are started, they will listen on all configured interfaces.
Example: A web browser with an IPV4 connection to the irc-hybrid-client can be 
connected to an IPV6 IRC server using a local IPV6 address bound to the interface.

Updated /docs with configuration instructions.

### Changed

For TLS connections to IRC server that do not user the socks5 proxy,
the minimum TLS version has been set to `minVersion: 'TLSv1.2'`. 
TLS connections using the socks5 proxy were already set to 1.2.
This was an omission, and it was set to be consistent with TLS minimum version options 
at other places in this program. If you are connecting to an IRC server
with TLS 1.1 or earlier, this might be a breaking change.

Code clean up: Removed an extraneous hard coded hostname in the IRC socket TLS options for
the case where TLS is enabled connecting through a socks5 proxy connection.
This should not be a functional change, because the TLS option had been assigned twice, 
with the correct value from the server configuration used to replace the erroneous 
hardcoded value before the TLS socket was connected.

## [v0.2.23](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.23) 2022-10-31

### Added

The purpose of this change is to provide capability for an audio beep sound when
a new private message is received prior to opening a private message window.

Previously, the line-beep checkbox in a private message element was initialized to 
not checked when a new PM was started, or when the cache was reloaded.
A new checkbox was added to the private message parent element to 
provide a global setting for the line-beep setting for new private message windows.
This global setting is persisted to the web browser localStorage.

Note: Refreshing data from message cache will destroy and re-create new PM elements.
Therefore the line beep will revert to the global setting on reload. This is not optimal.
However, simply saving a list of private message nick names to the browser localStorage
may be a privacy issue, and was not implemented intentionally.

The +Audio button which is used as the specified user interaction to enable audio playback 
was updated to include the private message beep. Otherwise, audio playback is 
blocked by browser policy until a user interaction occurs.

The /docs folder was updated with screenshot and description.

## [v0.2.22](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.22) 2022-10-22

### Changed

The keyboard keys to trigger auto-complete for IRC channel text input has been changed.
In the case of smartphone mode where the "Brief" checkbox is checked, auto-complete 
can be triggered by either (tab) or (space-space). In the case of desktop browser mode 
where the "Brief" is not checked, double space is disabled and auto-complete is 
triggered only by the (tab) key.

## [v0.2.21](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.21) 2022-10-16

### Fixed

- On DALnet, fixed auto-restart after net-split was not properly detecting the nick collision.

### Changed

- Update dependencies: helmet@6.0.0, express@4.18.2, express-rate-limit@6.6.0, ws@8.9.0
- Update dev dependencies: eslint@8.25.0 including eslint dependencies

## [v0.2.20](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.20) 2022-09-23

### Changed

- Increased maximum value of credentials.instanceNumber from 100 to 65535. No configuration changes are needed for this change. 

This is not intended to increase the number of concurrent servers, but rather to allow the option for the instanceNumber to match the port number. This will make debugging of multiple servers easier. The instanceNumber is a positive integer of type Number. The instanceNumber is converted to a string and appended to the cookie name. For example, if you are using multiple servers on ports 3801 and 3802, you can set the instanceNumbers to 3801 and 3802, then during debugging the cookie names would easy to identify by server by observing the cookie name in the web browser, "irc-hybrid-client-3801". This is optional, and instanceNumber may remain sequential as (1, 2, 3 ... ).

## [v0.2.19](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.19) 2022-09-21

The general intent of this change is to reduce the number of extraneous panels 
displayed in the web browser by providing a mechanism to delete old content from the IRC message cache.

In the previous versions, the wallops, notice, and private message panels included "Clear" buttons used to temporarily blank the content of textarea elements. However refreshing the cache would restore the previous content, causing multiple panels to open. The labels of the buttons have been changed. The [Clear] buttons simply blank content temporarily. The [Erase] buttons send a request to the web server to find and clear related IRC server messages from the message cache, then request all connected web browsers to update the display accordingly.

### Changed

- API Change - The request to erase the entire memory cache using route /irc/erase has changed the value of the body property from YES to `CACHE`, body contents: {"erase": "CACHE"}. The purpose of the change is for compatibility with additional granular erase requests.
- API Change - New target `NOTICE` for /irc/erase endpoint to find and delete NOTICE messages from the default cache.
- API Change - New target `WALLOPS` for /irc/erase endpoint to find and delete NOTICE messages from the default cache.
- A new websocket command `CACHEPULL` was defined for transmission over the websocket connection. The web server will send the CACHEPULL command to all connected web browsers each time the cache is modified by erasing portions of the cache. In response, all browsers will refresh the cache and update the display textarea elements.
- API Change - New target `PRIVMSG` for /irc/erase endpoint to find and delete all user PRMVMSG messages from the default cache. IRC channel PRIVMSG messages are not erased.
- Update the /irc/prune function. In the case where number of individual channel cache buffers is exceeded, IRC channel messages are now pruned from the default IRC message cache by the /irc/prune route.
- Update some of the postman tests to reflect API changes listed here.

## [v0.2.18](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.18) 2022-09-19

### Changed

Note: This may increase the size of the log files.

- Added new property `accessLogOnlyErrors` to credentials.json. If property is false or property does not exist the http access log (logs/access.log) will include all HTTP requests, else the access log will include only HTTP errors (status >= 400). Previously, only errors were logged by default.

- server/irc-client-cache.js - Added IRC message 328 RPL_CHANNEL_URL to message cache exclude filter.

## [v0.2.17](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.17) 2022-09-13

### Fixed

- server/irc-client-cache.js - Fixed fatal error when starting server for the first time with persistent cache enabled when `logs/savedMessageCache.json` does not exist. Fixed by ignoring ENOENT error and leaving cache empty.

## [v0.2.16](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.16) 2022-09-11

### Fixed

- Fixed: User nickname changes using NICK command were not parsed into the correct IRC channel cache buffer. Other users could be seen JOINing and PARTing a channel, but reloading the message cache would move these messages to the server window. This was fixed by caching a pseudo-command `cachedNICK`. This included some general cleanup of message cache parsing code.

### Added

- Added simple command line utility `tools/showIrcLog.js` to view the log file filtered by channel
- Added property `datestamp` to parsedMessage object for use in displaying date of a message.
- New feature, when date changes between the previous message timestamp and the current message timestamp, print the calendar date as a text divider in the server, wallops, notice, private message, and IRC channel windows. Currently, a newline character is added before and after the line with the date, but this may be changed depending how it looks.

### Changed
- tools/updateAuthForUser_1.js - Added check to utility script to produce error message when credentials.json is configured for external login.
- server/irc-client-cache.js - Add filter so IRC channel buffers that have been "pruned" will not be returned with a cache update.
- server/irc-client-cache.js - API call to POST /irc/prune will now delete IRC channel cache buffer if exists.

## [v0.2.15](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.15) 2022-09-07

Removed debug console.log() in server code.
## [v0.2.14](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.14) 2022-09-06

This change is a complete rewrite of the IRC message cache module.

Before Change:

The purpose of the IRC message cache is to refresh the browser content on request.
This is necessary with iPhones due to battery power concerns.
The network and radio disconnect during the screen lock. 
Upon reconnecting the browser, the message cache is used to replace any previous 
content that is displayed in the web browser textarea elements.

Issues with previous version.

1) The message cache was limited to the last 100 IRC server messages in chronological order. 
In the case where the browser has joined more than one channel, a conversation in one channel can 
exceed the 100 line cache buffer size, causing older messages in other channels to exit the 
message cache without being viewed.

2) In the IRC protocol, the QUIT messages do not include the IRC channel name. It is up to the
IRC client to maintain a list of channel members and apply the QUIT message to the proper channel(s).
With a chronological linear message cache, orphan QUIT messages in the cache belonging
to an IRC user who has left before the cache was restored were not able to be 
matched to the any active channel windows, and by default were previously displayed to the server window.
Thus after reloading the cache, it was possible to see some users JOIN but with PART messages omitted 
and deferred to the server window.

New IRC message cache module:

1) The cache is now segmented into different cache buffers. There is one default message buffer for server
messages, those messages that are not related to a specific IRC channel. 
An independent cache buffer is now created to each 
IRC channel up to a maximum limit. When the limit is reached, messages 
from any additional IRC channels will share the default message cache with server messages.

2) The maximum limits are 100 IRC messages per cache buffer with 6 cache buffers, one for 
the default and one for each of 5 IRC channels. Therefore upon reloading the message cache, 
up to 600 messages can be returned.

3) A new IRC message type was created as `cachedQUIT`. The format is similar to the standard QUIT message 
except a field has been added for the IRC channel name. This allows a method to select the proper IRC channel window when adding cached QUIT messages. Various code was updated to address concurrent use of live QUIT and cachedQUIT messages. Examples:

```
Real-time QUIT:  nick!user@host QUIT :Reason for quitting

Cached QUIT:    nick!user@host cachedQUIT #channel :Reason for quitting
Cached QUIT:    nick!user@host cachedQUIT #otherChannel :Reason for quitting
                                          ^^^^^^^^^^^^^
```

4) When viewing the server window in "Raw Message" format, a simple sort function was added
to re-sequence the raw IRC server messages in chronological order in the server window.
This is needed because the raw IRC server messages are combined
from several different IRC cache buffers. This leaves messages out of chronological order.

5) The message cache includes a filter than will block listed message types from being added to the cache. 
Currently, messages related to /ADMIN /LIST /WHO /WHOIS /LINKS NAMES and MOTD 372 are filtered to save space in the cache (Others may be added as observed).

6) The persist file cache function which saves the message cache to a disk file was updated to support multiple cache buffers.

7) The [Erase Cache] button on the server window may now be used while the IRC server is connected to the IRC network. This will clear content on all windows on all connected browsers.


Server files changed:

- server/irc-client-cache.js - This is a complete rewrite of the cache utility including persisting contents to disk file across server restarts (described above).
- server/irc-client-parse.js - Added new property to ircState.channelStates[index].csName to contain a case sensitive copy of the IRC channel name obtained from the 353 NAMES response.
- Other minor changes area not listed.

Browser files changed:

- secure/js/webclient02.js - Added `cachedQUIT` to the `ircMessageCommandDisplayFilter` to prevent display in server window. They are instead display in the channel windows.
- secure/js/webclient02.js - Remove special code to format QUIT messages in the server window when reloading cache. Both QUIT and cachedQUIT message are sent to the channel window for parsing.
- secure/js/webclient06.js - Add separate event handlers for QUIT and cachedQUIT messages.
- secure/js/webclient06.js - IRC channel window, channel name now displays case sensitive csName property from ircState.channelStates[].csName.
- secure/js/webclient06.js - Opening a new IRC channel no longer automatically closes the server (raw message) window.
- secure/js/webclient09.js - Remove QUIT handler from server window display.
- secure/js/webclient09.js - Added a sort routine to re-order strings displayed in the server window when viewed in raw server message mode. This is necessary because when refreshing cache to raw display, several cache buffers are combined, out of chronological order. The raw HEX display is not sorted due to mixed content.
- secure/js/webclient10.js - Added new debounce delay event handler `debounced-update-from-cache`. This is used when creating new channel windows in webclient06.js to call updateCache to pre-fill the IRC channel textarea.
- Other minor changes are not listed.

## [v0.2.13](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.13) 2022-09-01

This is a bug fix patch.

Previously in tag v0.1.12, a code change was intended to clear the IRC message cache
when changing from one IRC network to a different IRC network. The change in 
IRC network is detected on the server by detecting changes in the server list group numbers.
This caused 2 issues: First, when using the [prev] and [next] buttons to step 
through an IRC server list that contains only servers assigned to a single group number 
of 1 or greater, the entire message cache was being sent for each
use of the [Prev]/[Next] button.
Second, an edge case was found where the WallOps window and Notice window 
were not properly cleared after changing between different IRC networks with different 
group numbers. This patch takes a different approach to address the issue.

Server Changes:

- server/irc/irc-client.js - A new prefix command `CACHERESET` was defined for transmission over the websocket connection. The web server will send the CACHERESET command to all connected web browsers each time a non-empty message cache is cleared.

Browser Changes

- secure/js/webclient02.js - The _parseBufferMessage() function parses the new CACHERESET command from the websocket stream and fires a browser global `erase-before-reload` event.
- secure/js/webclient02.js - Event handler for `erase-before-reload` event clears textarea elements for the WallOps window and the Notice window and alters window visibility.
- secure/js/webclient06.js - Event handler for `erase-before-reload` event clears input elements and alter element visibility in the IRC channel window.
- secure/js/webclient07.js - Event handler for `erase-before-reload` event clears input elements and alter element visibility in the private message window.
- secure/js/webclient09.js - Event handler for `erase-before-reload` event clears textarea elements for the server (raw display) window.
- secure/js/webclient04.js - In event handlers for the [Prev] button and the [Next] button, code to manually initiate a cache reload was removed because this is handled elsewhere in response to CACHERESET websocket commands.
- secure/js/webclient09.js - In event handlers for the [Erase Cache] button and the [Refresh] button, code to manually clear the textarea elements was removed because this is handled elsewhere in response to CACHERESET websocket commands.
- docs/API.html - API documentation updated to include the CACHERESET command and related operation.

## [v0.2.12](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.12) 2022-08-31

This is a feature update to add IRC server SASL authentication. 
At this time, SASL mechanism will be limited to `PLAIN`. 
Adding SASL required adding IRCv3 CAP negotiation.
The scope of the CAP negotiation will be limited to SASL authentication.

Use of SASL authentication was added specifically to use with libera.chat.
Other IRC networks have not been tested.

### Added

- Configuration changes
  - Added new string property `saslUsername` to server definition in servers.json
  - Added new string property `saslPassword` to server definition in servers.json
  - If new properties are not present in servers.json, they will default to empty strings without error.

- Browser changes
  - secure/js/webclient.js - New custom notify messages for 900 and 903 SASL messages from IRC server

- Server
  - server/irc-client-cap.js - New file created to handle IRCv3 `CAP LS` and sasl `AUTHENTICATE` commands.
  - server/irc-client-parse.js - Added IRC server message handlers for CAP, AUTHENTICATE, and numeric messages 900 to 908. These handlers make subroutine call functions in the irc-client-cap.js module.
  - server/irc-client-write.js - Add log file filter for AUTHENTICATE commands to filter sasl passwords from the log file.

- API changes
  - Update routes and input validations to handle new properties `saslUsername` and `saslPassword`.
  - Update postman collection for new properties in server list editor

- Server list editor
  - Update form to edit new properties `saslUsername` and `saslPassword`.

- /docs - Update screen captures and help files.

### Dependencies

- express-rate-limit bump 6.5.1 to 6.5.2
- helmet bump 5.1.0 to 5.1.1
- ws 8.8.0 bump to 8.8.1

### Fixed

- Server
  - Several places the IRC socket was destroyed without destroying the socks5 socket when using proxy.
  - Fixed channel list edit API. When no channels were specified for a server definition, the PATCH and POST routes were adding one empty string to the channelList array, causing an extraneous IRC channel join button to be displayed. Re-saving an IRC server definition will remove the extraneous button.
  - Fixed /NICK command not working properly in IRC network where 001 message ended in nick, rather than nick!user@host. Yes, the RFC says the 001 string is non-standard and should not be parsed for values, my mistake. In this case, the nick would change on IRC server side but not change on the client side, breaking nickname recovery (and other things) on some IRC networks.

- Browser
  - secure/js/webclient10.js - In 2 places, function update-from-cache event handler and [Erase cache] button event handler, extraneous call removeChild() to remove dynamically generated private message windows. These have been removed. The html elements and associated event listeners are properly removed in another file webclient07.html in response to global event erase-before-reload.

- Fixed an issue where message the cache was not cleared when changing IRC networks. If you join an IRC channel on one network, then change to different IRC network, messages from the previous channel (if still in cache) would be visible when you open the same channel name in the different network. The same issue exists for private messages with the same nickname. Fixed as follows:
  - server/irc/irc-client.js - API POST /irc/server/ - When changing servers, checks for change in server group number. If the group changes, then clear the message cache.
  - server/irc/irc-client.js - API POST /irc/serverlist/ - When changes are written to servers.json file and the server index is changed to server index 0 (existing code), then (added new code) if this results in a server group change, then the message cache is cleared.
  - secure/js/webclient04.js - Browser change, using the [Prev] / [Next] buttons which send an API fetch request, upon http response, emit event update-from-cache to reload cache. This will update textarea elements to reflect the message cache changes on the backend following a group change.
  - secure/js/webclient10.js - Browser change, fixed, after fetching a replacement cache array from the POST /irc/cache endpoint, if the returned array was empty, i.e. emptied cache, it was previously ignored, leaving previous existing content displayed.

## [v0.2.11](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.11) 2022-08-25

### Changed

- Server API

Previously an IRC server definition object sent from the server to the the 
web browser did not contain a `password` property or an `identifyCommand` property. 
After this change, in the case where no password has been set, and empty 
string is returned `{password: ''}`. 
In the case where a password has been set, the password property will 
be set to null by the API `{password: null}`. 
This is to differentiate if a password has been set or not, without returning 
the actual password value.
The `identifyCommand` uses the same behavior

- Web Browser

In the IRC server list editing form, when viewing an IRC server definition, the 
previous IRC server password will be displayed as `(blank)` or `(hidden)` to indicate 
if a password has been set or not. The NickServ identify command behaves the same 
displaying `(blank)` or `(hidden)`. Editing is the same as before. 
Replacement values may be entered using the [Replace] button.

## [v0.2.10](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.10) 2022-08-22

This is a feature upgrade. Counter icons have been added to the top 
of several windows to show a count of unread messages in each window.

In the process of incrementing counters inside event listeners for 
dynamically generated html elements, it became apparent that 
duplicate event listeners were being created.
After the code changes in this edit, opening the web page to an IRC connected
backend shows 83 event listeners plus one for each channel button.
Thus with 4 channel buttons, the base number of event listeners is 87.
Each IRC channel /JOIN increases the count by 29 event listeners.
Each private message window increases the count by 21 event listeners.
After closing windows or reconnecting to IRC, after a short time,
the total count of event listeners in Chrome dev tools performance tab 
appears to properly garbage collect back to the base number of 87. This appears to be 
addressed, but hopefully didn't introduce any unrelated new issues.

### Added

- Private message launch window (parent window)
  - Added count icon showing the number of private message windows that exist
  - Added count icon showing the total sum of unread private messages in all windows
- Individual private message window
  - Added count icon showing the number of unread messages in the private message window.
- IRC channel launch window (menu window)
  - Added count icon showing the the number of joined channel windows that exist
  - Added count icon showing the total number of unread messages in all channel windows
- Individual IRC channel window
  - Added count icon showing number of nicknames present in the IRC channel
  - Added count icon showing number of unread IRC messages in the IRC channel window
  - Added red kicked icon in place of string appended to channel name.
- Main page title bar
  - The icon for unread private messages (P) updated to show icon if private message count is > 0
  - The icon for unread channel messages (C) updated to show icon if private message count is > 0

### Fixed

- Fixed - Use of [Prune] button to remove channel not mirrored to concurrent browser connections.
- Fixed - After selecting the [erase cache] button, private message windows could not be opened.
- Fixed - Addressed several global event listeners that were being duplicated when refreshing the message cache or reconnecting to the IRC network.
- Fixed - Several setInterval timers were being duplicated when reloading cache.
- General code cleanup  of browser code in webclient06.js (IRC Channel) and webclient07.js (Private messages)

### Changed

- server/irc-client.js - API change. In the NodeJs backend, previously, the arrays ircState.channels[] and ircState.channelStates[] are initialized (empty) during the IRC connection process. Now these arrays are also cleared upon IRC disconnect. This change was needed for logic in the browser to properly parse the ircState object to release resources for destroyed windows.
- Extend channel disconnect and re-join timer from 2.5 to 3.0 seconds. Sequence: nickserv identify at 1.5 follow by join at 3.0 seconds.

## [v0.2.9](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.9) 2022-08-16

This is a feature upgrade to add automatic IRC server rotation. Previously, each different server definition was a stand alone configuration containing only one single IRC server address. This upgrade introduces a new integer group number property to the server definition. Group 0 is reserved for stand alone servers.
In the case where the group is 1 or greater, the group property defines a group of servers. If more than 2 server in a group are 
not disabled and have reconnect enabled, then upon disconnect the client will automatically rotate different IRC server definitions within a server group.

### Added

- servers.json configuration changes:
  - Added new integer property `group` to IRC the server definition object, including server list editor form, server list API and API data validation. To handle upgrade from version v0.2.8 and before, the group property will default to 0 when the new property is not present in the config file. The value 0 defines individual servers that do not rotate addresses. There should be no issue using the old config.
- Additions to ircState object:
  - Added integer property `ircServerGroup` to show current server group number.
  - Added boolean property `ircServerRotation` to tell browser if automatic rotation of server definitions is enabled in the configuration
- server/irc/irc-client.js includes multiple changes
  - New function onDisconnectRotateNextServer() to manage substitution of alternate server definitions
  - Population of server properties into ircState object recoded into common function.
  - Minor logic changes for reset of primary nickname on disconnect
- server/irc/irc-client-vars - Modified array containing list of reconnect time intervals.
- docs/ - Update instructions for server list rotation and added new screen capture images.

### Changed

- Server list table the [ ] disabled checkboxes are now clickable within the main table. Disabled rows show gray background color.
- API change: to move records up one position uses different method/route (needed for new features in future)
  - Old: COPY method /irc/serverlist with body {action: 'move-up'}
  - New: POST method /irc/serverlist/tools with body {action: 'move-up'}

- server/web-server.js - Added route POST /irc/serverlist/tools
- server/irc/irc-serverlist-validations.js
  - update validations for COPY /irc/serverlist and POST /irc/serverlist/tools.
- server/irc/irc-serverlist-editor.js Changes:
  - Added generic tools route at /irc/serverlist/tools, selector is `action` property.
  - Removed `action` property from body in COPY method. Records can be duplicated by COPY method using only `index` property.
  - Added action `move-up` to tools route to move record up by 1 at specified index.
  - Moving record up now returns index number of new position in database.
  - Deleting record up now returns index number last record in database.
  - Added action `toggle-disabled` to tools API /irc/serverlist/tools
  secure/js/serverlist.js
  - Minor update to method and url of move-up to use tools API
  - Event handlers for checkbox in main serverlist using tools API.
  - Custom background color for server group 1 to 5 in group column TD element.
- docs/api.html - updated for API changes

- User interface changes
  - IRC controls tab, user name, real name, mode are now printed in text as readonly information.
  - New form layout for server rotation status display (new screen capture in /docs)
  - Replace readonly checkboxes with true/false color icons using CSS

## [v0.2.8](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.8) 2022-08-11

### Changed

- Regenerate sound beep files with lower volume (short-beep1.mp3, short-beep2.mp3, short-beep3.mp3)

## [v0.2.7](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.7) 2022-08-10

### Fixed

- server/irc-client.js - Fixed crash that occurred when disconnecting from IRC network when altNick and recoverNick properties are missing in the servers.json file. These are set to default values if absent.

## [v0.2.6](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.6) 2022-08-10

### Changed

- Added button to the IRC server list to expand the table to show all server definition properties for all defined IRC servers in one large table.
- The list of IRC servers may now be opened when connected to the IRC network. The list may be viewed as read-only, but the client must disconnect from IRC to edit the IRC server definitions.
- Changed to the API to allow GET request /irc/serverlist while connected to the IRC network provided the database "lock" parameter is not included as a URL query parameter.

## [v0.2.5](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.5) 2022-08-08

This is a feature update. New functionality has been added to use an alternate nickname when the primary nickname is in use.
Later, when the desired nickname becomes available, the nickname can be auto-recovered to it's primary value. Nickserv IDENTIFY commands 
are issued during nickname recovery if configured in the server setup.

No changes to previous configuration from v0.2.4 are necessary unless it is desired to used the alternate nickname.

### Changed

Configuration:

- example-servers.json - Added new server properties "altNick" and "recoverNick". For older version of servers.json files, these will be updated automatically without error to values with new features disabled.

Server:

- server/irc/irc-client.js - Added existing `servers` object to global `vars` object to allow global access to the server list. Instances of servers.xxxxx are now `vars.servers.xxxxx`. Before this change, scope of servers object was local to irc-client.js.
- server/irc/irc-client.js - Add new boolean property `nickRecoveryActive` to ircState object;
- server/irc/irc-client.js - Added recoverNickTimerTick(ircSocket) to the global multi-task timer event, passing in the current TCP socket object.
- server/irc/irc-client.js - On disconnect alternate nickname reset to primary nickname, other values not changed.
- server/irc/irc-client.js - On disconnect DALnet services forced rename Guest12345 (Guest*) reset to primary nickname, unless set as primary.
- server/irc/irc-serverlist-editor.js - Added new server properties "altNick" and "recoverNick" to server list editing API.
- server/irc/irc-serverlist-validations.js - Add input validation for new properties "altNick" and "recoverNick"
- server/irc/irc-parse.js - Multiple changes as follows
  - Message 001 RPL_WELCOME - Update conditions for automatically sending nickserv IDENTIFY command on initial connect to IRC.
  - Message 432 ERR_ERONEUSNICKNAME - (432 add new handler) - During initial IRC connect, before nickname registration, add functionality to send alternate nickname to IRC sever using /NICK command. Nickname auto-recovery is not enabled, because user's command for nickserv RELEASE password is required manually before attempting to user primary nickname.
  - Message 433 ERR_NICKNAMEINUSE - During initial IRC connect, before nickname registration, add functionality to send alternate nickname to IRC sever using /NICK command. Sets variables used to enable auto-recovery of primary nickname.
  - Message NICK - Add functionality to automatically send the nickserv IDENTIFY command if nickname auto-recovery is enabled and the user is currently using the configured alternate nickname.
  - Message QUIT - Added functionality to detect a match between the QUIT nickname and the user's primary nickname. If match then automatically recover the primary nickname by sending a /NICK command to the server.
  - Added timer tick handler to manage auto-recovery of nickname by incrementing timers, and periodically issuing /NICK commands for the primary nickname to detect availability. This is called globally from timer loop in irc-client.js to include scope of IRC TCP socket object.

Browser:

- secure/serverlist.html - Added input element and checkbox element for new properties "altNick" and "recoverNick"
- secure/js/serverlist.js - Added value parsing for new server properties "altNick" and "recoverNick"
- secure/js/webclient.js - On change in ircState object, nickname input element updates from state object even if not connected to IRC. This is 
necessary for alternate nickname rotation and nickname recovery. However, a change in state could possibly revert the nickname input element to current value on the web server. 
- secure/js/webclient.html - Added (R) icon to show auto-Recovery of nickname is active.
- secure/js/webclient.js - Added code to control visibility of (R) icon for nickname recovery.

## [v0.2.4](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.4) 2022-08-04

### Changed

- server/irc/irc-client-vars.js - Change global `ircRegistrationTimeout` from 30 seconds to 55 seconds.

 During the initial stages of establishing an IRC server connection, the IRC server may issue an IDENT request to the client on TCP port 113. In the case where a firewall on the client side is dropping the packet without any reply, the IRC server must wait for the TCP request to TCP 113 to time out. On DALnet this seems to be taking 33 to 39 seconds. This is causing nickname registration timeout error. To address this issue, the timeout has been increased from 30 seconds to 50 seconds.

## [v0.2.3](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.3) 2022-08-03

This is a feature upgrade. Optional functionality has been added to automatically 
save and restore the IRC message cache across web server restarts.
Independently includes minor code debug and security improvements as listed below.

### Added

Server:

- server/irc/irc-client-cache.js - Added function triggered by SIGINT and SIGTERM that asynchronously writes the cache file, then process.exit(0). The JSON encoded cache includes timestamp, cache pointer, and message data converted to an array of type utf-8 String to file `logs/savedMessageCache.json`. 
- server/irc/irc-client-cache.js - Added javascript to run on web server restart to asynchronously read the cache file. If the timestamp age is
300 seconds or less, the cache pointer and cache data is restored as Array of type Buffer. Cache data is then removed from the file.
- example-credentials.json - Added new property `persistIrcMessageCache: false` used to enable auto-save and restore of message cache across web server restarts. In the case of version upgrade, if the new property is missing from the configuration, the auto-save will not be enabled, but no errors are thrown for missing property.
- docs/login-config.html updated help files.

Browser:

- secure/js/webclient06.js - During creation of new IRC channel element, added delay timer to request entire message cache be re-sent and parsed for IRC messages associated with the selected IRC channel, then add matching messages to the channel textarea element.

### Changed
- server/irc/irc-client-log.js (+others), all log files change permission from 644 to 600 when creating new log files.
- secure/serverlist.html - Add in-form instructions for use of form.
- secure/serverlist.html - Add text warning notice that passwords will stored in clear text to IRC server list editing form.
- secure/js/serverlist.js - Set visibility of div elements to show password warning.
- secure/js/serverlist.js - For data validation errors on IRC server list editor page, page automatically scrolls to bottom to see the error message.
- secure/css/serverlist.css - Misc style classes
- package.json, .eslintrc.js - Upgrade eslint to Version 8 due to deprecated dependencies in older version of eslint.
- package.json - add `tools/*.js` to .eslintrc.js (was omitted by mistake)
- tools/updateAuthForUser_1.js - Syntax linting, no code changes.

## [v0.2.2](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.2) 2022-08-01

- server/web-server.js - Add express-rate-limit set initially to 100 request per 10 seconds per IP address. This was added to address a GitHub CodeQL security issue.
- server/web-server.js - Added CSRF protection to server list editor API for conditional response in the case of disabled API. This was added to address a GitHub CodeQL security issue.

## [v0.2.1](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.1) 2022-07-31

- webclient.js, serverlist.js - Minor changes in minified code due to changes in bundler repository irc-hybrid-client-dev-tools.
- There are no changes to the base code in the un-minified files in the is commit.

Github dependabot identified some dependency security issues in gulp-minify in the alternate tools repository. 
This required bumping terser from version 3.7.6 to 4.8.1 (See changelog for irc-hybrid-client-dev-tools)
This has produced some minor differences in the minified code in webclient.js and serverlist.js in irc-hybrid-client.
This commit is to update the minified code from this change in the other repository.

## [v0.2.0](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.2.0) 2022-07-30

This is a feature upgrade. An independent web page was added to view and edit the list of IRC server definitions.
An API was added to service the web page for adding, modifying, copying, and deleting IRC servers.

### Upgrade Notes

Upgrade from version 0.1.44 to 0.2.x requires changes to existing configuration 
files `credentials.json` and `servers.json`.
The template files example-credentials.json, example-servers.json have been updated.

- credentials.json - New boolean property `disableServerListEditor` to disable the /irc/serverlist API routes
- servers.json - Bumped servers.json file format to: `"configVersion": 2`
- servers.json - Eliminated global property `ircAutoReconnect`
- servers.json - Eliminated global property `rawMessageLog`
- servers.json - New boolean property `disabled` to disable/hide a server entry from the IRC client [next] and [prev] buttons
- servers.json - New boolean property `proxy` for a server to enable Socks5 Proxy if available (previously a global setting)
- servers.json - New boolean property `reconnect` for a server to enable automatic reconnection (previously a global setting)
- servers.json - New boolean property `logging` for a server to enable write of raw IRC messages to log file (previously a global setting)

### Added

Server: 

- Added new nodejs file: server/irc/irc-serverlist-editor.js
  - Added route GET/irc/serverlist?index=0&lock=1 to retrieve array of IRC servers
  - Added route POST /irc/serverlist to create new IRC servers
  - Added route PATCH /irc/serverlist?index=0 to edit and modify existing server
  - Added route COPY /etc/serverlist?index=0 to copy an existing IRC server to the end of the list
  - Added route DELETE /irc/serverlist?index=0 to delete an IRC server from the list
- Added new nodejs file: server/irc/irc-serverlist-validations.js
  - Input validation for GET, POST, PATCH, COPY, and DELETE methods on /irc/serverlist API

Browser:

- Added new file /irc/serverlist.html (IRC server editor interface)
  - HTML table with list of servers
  - Form for editing a specific server properties
  - Support for new IRC server properties `disabled`, `proxy`, `reconnect`, and `logging`.
- Added new file /irc/css/serverlist.css (styles)
- Added new file /irc/js/serverlist.js (Code to perform API calls and edit server list)
  - Functions for IRC server list editing: GET, POST, PATCH, COPY, DELETE

### Changed

Server:

- server/web-server.js - Environment variable NODE_DEBUG_LOG=1 will force all log output to console during NODE_ENV=production.
- server/web-server.js - Added routes, authorization and CSRF token validation for /irc/serverlist API
- server/web-server.js - Modified code for CSRF tokens /irc/webclient.html and /irc/serverlist.html
- server/web-server.js - Web connections no longer logged in 'production' node environment
- server/irc-client.js - Added global event for IRC client to reload server list after edit.
- server/irc-client.js - On loading servers.json file, remove error for empty server list.
- server/irc-client.js - On loading servers.json file, default values are null for empty server list.
- server/irc-client.js - ircState.ircServerIndex uses value -1 to indicate empty server list
- server/irc-client.js - Route /irc/server body param {index: -2} = previous, -1 = next (rotate servers)
- server/irc-client.js - Individual irc server definition - new boolean property `proxy` to use socks5 if enabled globally
- server/irc-client.js - New ircState boolean property `ircProxy` selected IRC server uses socks5 proxy if enabled globally.
- server/irc-client.js - Network socket to IRC server uses socks5 proxy only if both global and selected IRC server enables socks5.
- server/irc-client.js - Individual irc server definition - new boolean property `disabled` added to hide an entry.
- server/irc-client.js - Code to select initial server, next server modified to skip disabled servers.
- server/irc-client.js - Individual IRC server definition - new boolean property `reconnect` replace global `ircAutoReconnect` setting.
- server/irc-client.js - Individual IRC server definition - new boolean property `logging` replace global `ircRawMessage` setting.
- server/irc-client.js - Require servers.json version 2, else exit with upgrade instructions.
- server/irc-client-log.js - Added new function getRawMessageLogEnabled()

Browser:

- secure/webclient.html - Added 'Prev' button to select both next and previous server from IRC server list
- secure/webclient.html - Added 'Edit' button as link `<a href='/irc/serverlist.html'>`
- secure/webclient.html - Added read only input element for server index number.
- secure/webclient.html - Added hidden div for message to indicate empty IRC server list
- secure/css/styles.css - Add new styles for empty server list message
- secure/js/webclient.js - Various disabled attributes to new 'Prev' button
- secure/js/webclient.js - Various disabled attributes to new 'Edit' button
- secure/js/webclient.js - Added code to show/hide empty server list error message div
- secure/js/webclient.js - Socks5 proxy info is hidden unless both global and selected IRC server enables socks5.
- secure/js/webclient04.js - On state change update value of new index input element
- secure/js/webclient04.js - Added button handler for 'Prev' button
- secure/js/webclient04.js - Added Connect Button Error when ircServerIndex = -1 on empty serverlist

## [v0.1.44](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.1.44) 2022-07-13

### Changed

- server/middlewares/remote-authenticate.js - When using remote auth, authorization callback generates a new session
- server/middlewares/user-authentication.js - When using local auth, submission of user password generates a new session

Discussion: This is a security enhancement. It is a recommended practice to generate new session upon change in user permissions.
This can mitigate the risk of session fixation attack.

### Changed

- package.json - update express 4.17.3 to 4.18.1, express-session 1.17.1 to 1.17.3
- package.json - update helmet 5.0.2 to 5.1.0, ws 8.5.0 to 8.8.0

## [v0.1.43](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.1.43) 2022-04-28

### Added

- Added: New "PONG" response handler for client-to-server PING requests. IRC server lag time is determined. If the lag is over a specified limit, it is treated as a disconnect. The lag value is added to the ircState object as a string. Lag time is sent to the browser through the socket stream using string format: "LAG=1.234\r\n".

- server/irc-client-vars.js - Additional timer variables added for client PING.
- server/irc-client-parse.js - Add new PONG message handler, measure lag, send to browser.
- server/irc.client.js - Modify client-to-server PING timer tick handler to detect client-to-server timeout and initialize timestamps for new PING messages.
- secure/js/webclient02.js - Parse "LAG=x.xxx" message from socket stream. Show on raw message display. Save value, minimum, maximum in webState object.
- secure/js/webclient.js - Additional timer properties added in webState. Display IRC server lag, minimum, maximum in server panel, press more button to see. Tracking of minimum and maximum are local to browser.

### Changed

- package.json - Update npm package cookie@0.5.0

## [v0.1.42](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.1.42) 2022-03-31

### Changed

- package.json, .eslintrc.js - Downgrade eslint to 7.32.0 due to dependency conflicts. There are no code changes.

## [v0.1.41](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.1.41) 2022-03-30

### Changed

- npm audit fix - minimist 1.2.5 to 1.2.6 to fix github dependabot advisory for polluted prototype
- package.json - Update connect-redis 6.1.3 bug fix to 6.1.2

## [v0.1.40](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.1.40) 2022-03-17

### Changed

* package.json - update dependencies: express@4.17.3, connect-redis@6.1.2, cookie-signature@1.2.0, utf-8-validate@5.0.9
* .github/codeql-analysis.yml - removed cron schedule

## [v0.1.39](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.1.39) 2022-02-12

### Fixed

* server/irc/irc-client.js - Fix bug, during auto-reconnect, the list of irc channels was being cleared causing channels to be not re-joined after disconnect.
* server/irc/irc-client-parse.js - Clear list of previous channels after auto re-join channels after disconnect.

### Changed

* server/irc/irc-client.js - Abort auto-reconnect after all scheduled attempts have failed.
* server/irc/irc-client-vars.js - Extend auto-reconnect schedule up to 4 hours.
* Upgrade npm packages: connect-redis, cookie, memorystore, ws
* Upgrade eslint dev dependency to newer version

## [v0.1.38](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.1.38) 2022-02-02

### Fixed

* server/irc/irc-client-parse.js - Fixed server TypeError caused when receiving empty string for channel `"PRIVMSG #Channel :\r\n"`
* server/irc/irc-client-parse.js - Fixed server TypeError caused receiving empty string to set channel topic `"TOPIC #Channel :\r\n"`
* secure/js/webclient06.js - In Browser, fixed display of "null" when channel topic is cleared.
### Changed

- Update helmet v5.0.2

## [v0.1.37](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.1.37) 2022-01-22

### Fixed

Issue: When using socks5 proxy, during auto-reconnect after IRC server disconnect,
with recurring errors, the browser page could become stuck, 
with buttons grayed and disabled, unable to clear the error.
This is caused by browser receiving socket connection events out of order.
This was addressed by adding a timer so the web server will send the browser
a second UPDATE message to insure state variables in browser are up to date.
These were all server changes, no browser code was changed.

* server/irc/irc-client.js - Multiple changes:
  - On IRC server socket error, added timer to send 1 additional UPDATE request message to browser
  - On various errors, if socks5 proxy socket exists then call Socket.destroy()
  - On various errors, when socket errors occur without previous successfully connect at least 1 time, re-connect is aborted.
  - Function disconnectHandler(), used with Force Disconnect button, did not properly set state variables if socket already closed.

### Changed

* server/irc/irc-client.js - Removed multiple debug console.log() previously left in code.
* Improve socket connect logging messages.

## [v0.1.36](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.1.36) 2022-01-20

### Feature update

In v0.1.36 functionality has been added to use a socks5 proxy for IRC server connections, 
including both non-encrypted and TLS encrypted proxy connections over socks5.

### Changed

* server/irc/irc-client.js - Major recode of function connectIRC() to implement socks5 proxy support.
  * Case 1 - Standard TCP socket for connect to IRC server
  * Case 2 - TLS encrypted socket for connect to IRC server
  * Case 3 - Socks5 proxy for connect remote socket to IRC server, no encryption
  * Case 4 - Socks5 proxy to IRC server, wrapped in TLS encryption 
  * Update socket event listeners, error handlers, logging, and auto-reconnect features
  * Rename function _readyEventHandler to _connectEventHandler (socket ready event eliminated)
  * Update /docs/login-config.html

### Added

* sample-credentials.json - Added property: enableSocks5Proxy: false 
* server/irc/irc-client-vars.js - Add new global variables: socks5Username, socks5Password
* server/irc/irc.client.js - Added parse of socks5 configuration from credentials.js file.
  * For backward compatibility, new properties are optional (Socks5 disabled without config)
  * Added multiple socks5 properties to ircState object
* secure/webclient.html - Add checkbox and input elements for socks5 state
* secure/js/webclient.js - Code to update sock5 enabled state, address, and port (read only)

## [v0.1.35](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.1.35) 2022-01-16

### Changed

* server/web-server.js - Remove package body-parser (deprecated), instead use express.json() and express.urlencoded()
* server/web-server.js - Upgrade helmet from v4 to v5.0.1, changes to match new version
* Upgrade packages express@4.17.2, express-session@1.17.2, node-fetch@2.6.7, utf-8-validate@5.0.8, ws@8.4.2

## [v0.1.34](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.1.34) 2022-01-01

The history tab from the /docs was removed and added to base repository as CHANGELOG.md

### Added

* remote-authorize.js Added input validation to query parameters for GET /login/callback?code=xxxx

## [v0.1.33](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.1.33) 2021-12-31

This upgrade adds optional remote login capability using an external authorization server
<a href="https://github.com/cotarr/collab-auth">collab-auth</a>
Although there are significant changes to the authorization middleware, 
the functionality of the default local login (password entry) should not be impacted.
To continue using local login no configuration changes are needed.
Developed in branch remote-login-draft 2021-12-03 from v0.1.29 and merged back to master 
as v0.1.33 2021-12-31.

* Added module server/middlewares/remote-authenticate.js.
* In web-server.js, rewrite all authorization middleware functions to make them selectable between local login and remote login. 
* Update /docs to include remote login setup.
* Added node-fetch 2.x to package.json, used for fetching access_tokens. 
* Update example-credentials.json
* Add new Postman collection and environment for remote login workflow.

## [v0.1.32](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.1.32) 2021-12-18

### Changed

Update security headers and CSP (Content security policy)

## [v0.1.31](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.1.31) 2021-12-15

### Added

  Added csurf middleware for CSRF protection on POST routes.

## [v0.1.30](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.1.30) 2021-12-03

### Fixed

* Wrong cookie name in user-authenticate.js.
* Fixed expiration of rolling cookie.

## [V0.1.29](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.1.29) 2021-12-02

### Added 

* Add support for redis for session storage.
* Update /docs.

## [v0.1.28](https://github.com/cotarr/irc-hybrid-client/releases/tag/v0.1.28) 2021-12-01

### Changed

* Upgrade npm package versions.

## v0.1.27 2021-10-18

* Upgrade npm package versions.
* Change cookie.sameSite=Lax to fix persistent cookie on iPhone.
* Fix prune time for session memorystore database.

## v0.1.26 2021-09-02

* Disable channel window zoom state from being saving to localStorage to address scrolling issues during reload.

## v0.1.25 2021-07-30

* Temporary fix for audio beeps in IRC channel blocked by browser policy.
* On page load, the browser may block the Audio.play() request pending user interaction.
* Added new button marked [+Audio] that will appear if the header bar when enabled audio media may be blocked by browser.
* Selecting button will manually play audio, which is detected by browser. This only applies to audio IRC channel beep tone checkboxes. This is an interim fix. A more elegant long term solution is needed.

## v0.1.24 2021-07-24

* In-progress, debugging IOS audio disabled before user intereaction.
* Fix unresolved promise when audio beep blocked by browser policy.
* Fix bug where legacy channel actions show as private message.

## v0.1.23 2021-07-23

* Storage of data in browser localStorage was added to the program.
* The web userid and web login timestamp are saved to localStorage.
* The userid is an integer number starting at 1 that is assigned in the credentials.js file.
* The userid number is used to delete localStorage when a change in userid is detected.
* The string value of the username is not saved.
* Recode the IRC channel zoom/unzoom view mode functionality.
* Channel zoom buttons always visible when window collapsed.
* When an IRC channel is placed into zoom view mode, the IRC channel name is saved to the browsers localStorage API.
* When zoom is cancelled, the localStorage channel name is removed.
* When opening the web page, if a previous zoom was active, the browser will open in IRC channel zoom mode.
* The audio beep enable status for an IRC channel is saved to localStorage.
* When reloading the page, matching IRC channels will enable audio beep based on data from previous settings in browser localStorage.

## v0.1.22 2021-07-19

* Fix extraneous irc connect error message on page reload.
* Update Docs to explain use of postman to perform API tests.


## v0.1.21 2021-07-17

* Added server configuration property "verify" to indicate if the IRC server hostname should be verified for TLS connections.
* This change will require update of servers.json configuration files
* Fixed error where previously IRC server hostname was not verified for TLS connections.

## v0.1.20 2021-07-16

* Taller buttons increase height of input to 3 lines for channel and PM.
* Fixed outgoing IRC messages not added to irc.log.
* Fixed browser Forced Reflow violation caused during message cache reload.
* This included inhibit textarea auto scroll during message cache reload and re-sequence of cache reload events.

## v0.1.19 2021-07-14

* Set document.title to server name to display value in browser tab.
* Add configuration property instanceNumber used to make cookie name unique for the case of running multiple instances with same hostname.
* Add security caution related to multiple instances to docs.
* Set cookie property sameSite to strict.

## v0.1.18 2021-07-12

* Update postman tests and re-export.
* Add temporary development web page with browser javascript to test websocket authorization.

## v0.1.17 2021-07-11

* Change irc-hybrid-client-deb-tools to maintain original quote style (single quote) with gulp-minify javascript.
* Browser, case of receive channel message when not in the channel then show channel message (PRIVMSG) in the server window.
* Update ws dependency to new version on backend.

## v0.1.16 2021-07-10

* Fix CodeQL warning in previous edits removing \n from string.

## v0.1.15 2021-07-10

* Add autocomplete attributes to user login form.
* Recode dynamic resizing of textarea elements to accommodate changes in browser zoom
* and presence of vertical slider after window hide/visible updates.

## v0.1.14 2021-07-0-08

* Fix text input when cursor mid-line.

## 0.1.13 2021-07-05

* Reconfigured eslint as npm development dependency.
* Created new eslist configuration using eslint standard style definitions.
* Edit browser code and nodejs backend code to address new linter errors.

## v0.1.12 2021-07-01

* Recode IRC auto-reconnect login.
* Detection of KILL and K-Line will cancel reconnect timer.
* Disconnect IRC button will cancel reconnect timer.
* The IRC server select next button disabled while reconnect timer.
* Add additional logging for IRC server TCP socket errors, Kill and K-Line detection.

## v0.1.11 2021-06-30

* Added text command /OP /DEOP /VOICE /DEVOICE commands.
* Auto cancel away on channel message, fix away WHOIS message.
* Changing channel zoom scroll window to most recent message.

## v0.1.10 2021-06-27

* Rewrite browser javascript used to dynamically resize textarea elements.
* Move channel dynamic element resize from global to channel element and PM element.
* Change visibility and order of windows, first join IRC channel at bottom.
* Add zoom button to channel window.
* Updated screen capture images in the docs/ folder.

## v0.1.9 2021-06-24

* Added program version message QUIT and PART buttons.
* Add cache reload marker to text windows.
* Add postman collections.
* Add API examples to the docs.

## v0.1.8 2021-06-19

* Update and extend data validation of all API routes using POST method.
* Fixed error during injection of error messages to websocket stream.
* Added validation /message not multiple line string.

## v0.1.7 2021-06-12

* Extend auto complete PART and QUIT to add program version message.
* Fix uninitialized channel name after browser back arrow.
* Add configurable time zone (locale) for CTCP TIME reply.
* Add sound beep and sound enable checkbox to private message window.
* Channel window auto complete now either tab or space-space.
* Channel window auto complete includes supported text commands.
* Add raw server text commands to auto complete.
* Add auto complete to server window.

## v0.1.6 2021-06-01

* Update ws (websocket) package to 7.4.6
* Fixed missing /whois messages.
* Fixed issue where server messages with non UTF-8 characters were discarded. Some channels did not show in /LIST.

## v0.1.5 2021-05-28

* Fixed server crash in websocket upgrade request.
* Fixed uninitialized textarea after browser back arrow.
* Remove extraneous trailing space in text command parser.
* Auto-close server message window on page reload when in channel.

## v0.1.4 2021-05-22

Created a separate git repository to hold the
development tools used to minify the web page files.
[irc-hybrid-client-dev-tools](https://github.com/cotarr/irc-hybrid-client-dev-tools)
The package-lock.json was erased and regenerated.
It is recommended to re-install the npm dependencies for the main program.

## v0.1.3 2021-05-20

* Fixed hardcoded file path for PID file causing crash at startup.
* Update express-session version.
* Fix null in wallops from dalnet services server.
* Improve display format of WALLOPS and NOTICE message.
* Add text command /WHO.
* Improve message handlers for /WHOIS /LIST.
* Rewrite of color code filter.
* New logic so nickname changes appear in proper channel window.

## v0.1.2 2021-05-17 (0.1.2)

* Requires fresh npm install.
* Changed back to utf-8-validate due to errors with is-utf8.

## v0.1.1 2021-05-17

* Requires fresh npm install.
* Changed utf-8 validation library from utf-8-validate to is-utf8. 
* Multiple minor changes to improve type validation on POST requests and general clean up of POST request logic.

## v0.1.0 2021-05-16 (0.1.0) BREAKING CHANGE

Web user password hash function was updated from sha256 to bcrypt
It will be necessary for version 0.0.2 users to regenerate the web site password hash.
See [Login Config](https://cotarr.github.io/irc-hybrid-client/login-config.html)
This change was necessary to clear github CodeQL warning that was visible after
making repository public.

* Type checking of request properties was added to address CodeQL warnings.
* Replace logic for QUIT message handling. 
* Alternate channel window creation and pruning.
* Minor bug fixes and comments.

## v0.0.1 2021-05-12

* Git repository status changed from private to public. This is not considered a release. The project is still a work in progress.

## v0.0.1 2021-04-08 

* Move to irc-hybrid-client repository set to private.

## (no version) 2021-03-25

* Start concept repository.
`