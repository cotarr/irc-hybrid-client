# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
