# irc-hybrid-client

Single user hybrid IRC client using JavaScript front end and Node/Express backend.

### Project Goals

- Single user web IRC client, Chrome IOS browser, for iPhone plus with 375 pixel screen width.
- Concurrent logins (desktop/tablet) with synchronized displays.

### Coding Goals

- Single HTML page
- Hybrid native JavaScript front end integrated to backend Node/Express server.
- Backend server manages IRC connections and IRC channel membership.
- Backend server manages HTTP Username/password login and session cookies internally.
- Front end browser manages IRC message display and parses user input, and IRC commands.
- Front end JavaScript limited to native JavaScript without web framework or external libraries.
- Browser Content Security Policy (CSP) "self" enforced. Policy "unsafe-inline" not allowed.
- Browser Same origin policy enforced.
- TLS support for both Web Server and IRC server. Works with Lets Encrypt certificates.

### Current Limitations

- Assumption that user is comfortable in SSH, starting node servers, and can edit a JSON file.
- This is a chat application, not a channel protection bot, and does not include kick/ban enforcement.
- Limited to one web login for one IRC user to one web server (i.e. Personal web hosted IRC client)
- Limited to one IRC network connection at a time (for now...)
- IRC Configuration JSON files located in backend server are not remotely configurable.

# Installation

```bash
git clone git@github.com:cotarr/irc-hybrid-client.git
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
folders as the base repository. The gulp script removed the individual
script tags from webclient.html an consolidates the tags
to a single javascript script tag.

It is necessary to install gulp-cli globally, as gulp-cli
is used by gulp to manage multiple gulp version. gulp-cli is not
listed in the pacakge.json

```
npm install -g gulp-cli

# bundle and minify to /build folder
gulp dist

# Deploy by any method

# In deployed version, create log folder `mkdir logs`
# In deployed shell, `export NODE_ENV=production`
# In deployed copy, then edit credentials.json and servers.json

# In deployed version, run:
npm ci

# To run
node bin/www
```
