# irc-hybrid-client

Single user hybrid IRC client using JavaScript frontend and Node.js/Express backend.

Documentation: https://cotarr.github.io/irc-hybrid-client

Screen capture images are available in the [documentation](https://cotarr.github.io/irc-hybrid-client)

### Project Status (Work in Progress)

This project is still under development and changes frequently.
At this time, no formal release has been issued.

### Repository Contents

HTML content is available in both the minified-bundled version and
the commented development files. HTML content is located in folders `secure-minify/` and `secure/`.
Selection is determined by the NODE_ENV environment variable.
The browser download is about 31 kB for minify-bundled version
with server compression, compared to about 240 kB serving
from development folders without compression.

The server files are located in the `server/` folder. The server is launched
from the socket server in the `bin/` folder.

### Multiple Instance Security Caution

A web browser does not consider the server port number when selecting session
cookies for HTTP server requests. Running multiple instances of irc-hybrid-client with the
same host name, but different server port numbers, can result in the browser submitting
multiple session cookies to the web server.
Although the instanceNumber configuration property is intended to implement unique
cookie names for each instance (port number), unique cookie names WILL NOT prevent the browser
from submitting multiple cookies for all sessions that matches the host name.
Therefore, it is not recommended to run multiple instances of irc-hybrid client on
the same hostname unless you understand the security implications associated with
cookies and concurrent sessions. This caution does not apply to different users
who are connecting from different browser/computer. It does apply to multiple tabs in
a one web browser. This setup may be useful for one single user to use multiple
browser tabs for simultaneous connection to different IRC networks.

 See the
[login configuration docs](https://cotarr.github.io/irc-hybrid-client/login-config.html)
for information on use of the instanceNumber property.

### Installation

There is a complete step by step installation instruction in the
[docmentation](https://cotarr.github.io/irc-hybrid-client).
The steps listed here are a minimal installation guide for
people very familiar with deploying Node.js/Express servers.
It is recommended to follow the documentation installation instructions instead.

```bash
# clone the github repository
git clone https://github.com/cotarr/irc-hybrid-client.git
cd irc-hybrid-client

# Choose 1 of the following 2 options

# Option 1 Run local to try it out. (development --> log to console)
export NODE_ENV=development
npm install

# Option 2 Typical for server installation, use minified files, log output to files.
export NODE_ENV=production
npm ci

# copy example-credentials.json and edit
cp -v example-credentials.json credentials.json
# If multi user system optionally change permission
chmod 600 credentials.json

# 1) Set file path for TLS certs and tls:true ...or.. set tls=false
# 2) Set a unique cookie secret
# 3) Set .well-known/security.txt data, or empty string.
# 4) Set writable file path for PID file, or empty string to disable PDF file.

# It is necessary to assign one web page username and password.
# This must be done after copying the example-credentials.json into the project folder
# There is a detailed example in the documentation.

cd tools

# fill in user and password when prompted.
node updateAuthForUser_1.js

# A revised copy of credentials.json will be displayed after password assignment

cd ..

# Copy example-servers.json file
cp -v example-servers.json servers.json
# If multi user system optionally change permissions
chmod 600 servers.json

# 1) Edit a short name for the server
# 2) host/port and TLS true/false
# 3) IRC server password (if needed)
# 4) Initial nick name, user, real name and initial user modes.
# 5) Preferred list of channels for this server.

# Configure firewall ports as required.

# To start the app
node bin/www

# route on web page: /irc/webclient.html
```

### Minify and bundle for deployment

This section is optional. This repository contains both minified and
original un-minified files.
The repository can be cloned and deployed as-is,
requiring only editing of the configurations files.

In the case where the web page files have been edited, you may want
to regenrate a new folder containing replacement minified files for the web page.
The there is a separate repository for this called
[irc-hybrid-client-dev-tools](https://github.com/cotarr/irc-hybrid-client-dev-tools).
There are complete instructions for use of this utility in the
[irc-hybrid-client-dev-tools](https://github.com/cotarr/irc-hybrid-client-dev-tools) repository.

### eslint

```
# Lint browser JavaScript
npx eslint secure/js/*.js

# Lint server JavaScript
npx eslint server/*/*.js server/*.js bin/www

```
