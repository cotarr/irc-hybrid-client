# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## Untagged 2022-01-16

### Changed

* web-server.js - Remove package bodyparser, instead use express.json() and express.urlencoded()
* web-server.js - Upgrade helmet from v4 to v5.0.1, changes to match new version
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
