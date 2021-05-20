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

The development npm dependencies are only required for the minify process.
Development dependencies are not needed unless you plan to edit the JavaScript.

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

# Choose 1 of the following 3 options

# Option 1 Run local to try it out. (development --> log to console)
export NODE_ENV=development
npm install --only=prod

# Option 2 Run local development environment with development dependencies
export NODE_ENV=development
npm install

# Option 3 Typical for server installation, log output to files.
export NODE_ENV=production
npm ci

# copy example-credentials.json and edit
cp example-credentials.json credentials.json
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
cp example-servers.json servers.json
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

See [documentation](https://cotarr.github.io/irc-hybrid-client)
