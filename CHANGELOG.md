# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Un-merged 2022-07-14

### Added (WORK IN PROGRESS)

This is a proof of concept edit to create an API for editing of the IRC server list from the web browser.

- Added new nodejs file server/irc/irc-serverlist-editor.js
  - Added route GET /irc/serverlist to retrieve array of IRC servers
  - Support query parameters GET/irc/serverlist?index=0&editlock=1 to open edit of specific server
  - Added route DELETE /etc/serverlist?index=0 to delete an IRC server from the list
- server/web-server.js - Added routes and authorization for server list edit API

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
