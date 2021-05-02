# irc-hybrid-client

Single user hybrid IRC client using JavaScript front end and Node/Express backend.

### Project Goals

- Single user web IRC client for iPhone plus with 375 pixel screen and Chrome IOS browser.
- Concurrent logins (mobile/desktop/tablet) with synchronized displays.

### Coding Goals

- Single HTML page
- Hybrid native JavaScript front end integrated to Node/Express backend server.
- Backend server controls IRC connections and IRC channel membership.
- Backend server manages HTTP Username/password login and session cookies.
- Web browser displays IRC messages, touch controls, and IRC text commands.
- Front end JavaScript limited to native JavaScript without web framework or external libraries.
- Browser Content Security Policy (CSP) "self" enforced. Policy "unsafe-inline" not allowed.
- TLS support for both Web Server and IRC server. Works with Lets Encrypt certificates.

### Current Limitations

- User should be comfortable in SSH, starting node servers, and editing a custom JSON configuration files.
- Limited to one IRC user per to node/express instance. (i.e. Personal web hosted IRC client).
- This is a chat application, not a channel protection bot, and does not include kick/ban enforcement.
- Limited to one IRC network connection at a time (for now...)
- IRC configuration JSON files are not remotely configurable from the web interface.
- No automated tests are included.

# Installation

```bash
git clone https://github.com/cotarr/irc-hybrid-client.git
cd irc-hybrid-client

# make log directory
mkdir logs

# Choose one...development or production, development redirects logging to console.
export NODE_ENV=development
export NODE_ENV=production

# install packages
npm install

# copy example credentials and edit
cp example-credentials.json credentials.json

# 1) file path for TLS certs and tls:true ...or.. set tls=false
# 2) Set a unique cookie secret
# 3) set .well-known/security.txt data, or empty string.
# 4) file path for PID file

# It is necessary to assign one web page username and password.
# This must be done after copying the
# example-credentials.json into the project folder

cd tools

# fill in user and password when prompted.
node updateAuthForUser_1.js

# recommend review credentials.json after password assignment

cd ..

# Copy example server file
cp example-servers.json servers.json

# 1) Edit a short name for the server
# 2) host/port and TLS true/false
# 3) IRC server password (if needed)
# 4) Initial nick name, user, real name and initial user modes.
# 5) Preferred list of channels for this server.

# To start the app
node bin/www
```

# Minify and bundle for deployment

This is not required. The repository can be cloned and run as-is.

However, running the gulp script will concatenate 9 of the JavaScript
files into 1 bundled/minified JavaScript file.
This will reduce the  download size by about half.

After running `gulp dist`, a build folder will be created with same
folders as the base repository. The gulp script will edit the individual
script tags in webclient.html to replace multiple script tags
with a single javascript script tag.

It is necessary to install gulp-cli globally, as gulp-cli
is used by gulp to manage multiple gulp version. gulp-cli is not
listed in the pacakge.json

```
npm install -g gulp-cli

# bundle and minify to /build folder
gulp dist

# You can deploy by any method

# In deployed version, create log folder `mkdir logs`
# For deployment environment, `export NODE_ENV=production`
# Configuration requires copy and edit of credentials.json and servers.json

# Install node packages by running:
npm ci

# To run
node bin/www
```

# List of supported IRC text commands

```
/ADMIN [server]
/AWAY [away-message]
/CTCP <nickname> <ctcp-command>
/JOIN <#channel>
/LIST [#channel-mask]
/ME <action-message>
/MODE <#channel> [channel-mode(s)]
/MODE <nickname> [user-mode(s)]
/MOTD [server]
/MSG <nickname> <private-message>
/NICK <new-nickname>
/NOP ...inert testing command...
/NOTICE <nickname> <notice-message>
/PART <#channel> [Optional part message]
/QUERY <nickname> <private-message>
/QUIT [optional quit message]
/QUOTE <IRC server raw command>
/TOPIC <#channel> <new-topic>
/VERSION [server]
/WHOIS <nickname>
```
