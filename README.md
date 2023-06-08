# irc-hybrid-client

Single user hybrid IRC client using JavaScript frontend and Node.js/Express backend.

Documentation: https://cotarr.github.io/irc-hybrid-client

Screen capture images are available in the [documentation](https://cotarr.github.io/irc-hybrid-client)

[ChangeLog.md](https://github.com/cotarr/irc-hybrid-client/blob/master/CHANGELOG.md)

### Project Status (Work in Progress)

This IRC client is functional and mostly stable, but still evolving. 
New features are still being added from time to time.

### Repository Contents

HTML content is available in both the minified-bundled version and
the commented development version. HTML content is located in 
folders `secure-minify/` and `secure/`. Selection is determined by 
the NODE_ENV environment variable. The browser download is about 
37 kB for minify-bundled version with server compression, 
compared to about 338 kB serving from development folders without compression.

The server files are located in the `server/` folder. The server is launched
from the socket server in the `bin/` folder.

### Installation

There is a complete step by step installation instruction in the
[docmentation](https://cotarr.github.io/irc-hybrid-client).
The steps listed here are a minimal installation guide for
people very familiar with deploying Node.js/Express servers.
It is recommended to follow the documentation installation instructions instead.

- Backend web server requires Node v16 or greater.

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
```
There are two possible methods that may be used to define the
web server configuration settings. The settings may be stored as 
properties in the "credentials.json" file, or the settings may 
be defined as environment variables or entries in the .env file.

To use the credentials.json file:

```bash
# copy example-credentials.json and edit
cp -v example-credentials.json credentials.json
# If multi user system optionally change permission
chmod 600 credentials.json
```

To use environment variables:

Copy the "example-.env" file to a ".env" file or else 
use the "example-.env" file as a template for exporting 
environment variables to the app.

```bash
# copy example-credentials.json and edit
cp -v example-.env .env
# If multi user system optionally change permission
chmod 600 .env
```

- Set file path for TLS certs and tls:true ...or.. set tls=false
- Set a unique cookie secret as `"cookieSecret": "xxxxxxx"` or `SESSION_SECRET=xxxxx` (Required)

It is necessary to assign one web page username and password.
There is a detailed example in the documentation.

When using credentials.json file as configuration, this must be done after copying 
the example-credentials.json into the project folder

The user account used for web page login may be created using one of two 
javascript files in the tools/ folder. Either the "updateAuthForUser_1.mjs" script maybe
be used to add a user account to the credentials.json file, or the "genEnvVarAuthForUser_1.mjs"
script may be used to generate the user account for environment variable configuration.

To add a user account to the credentials.json file.

```bash
cd tools/
# fill in user and password when prompted.
node updateAuthForUser_1.mjs
# A revised copy of credentials.json will be displayed after password assignment
cd ..
```
To generate a user account when using environment variable configuration:
```bash
cd tools/
# fill in user and password when prompted.
node genEnvVarAuthForUser_1.mjs
# Copy/Paste the environment variable assignments as needed.
cd ..
```
IRC server configuration (TBD requires update)

```
# Copy example-servers.json file
cp -v example-servers.json servers.json
# If multi user system optionally change permissions
chmod 600 servers.json

# The following steps are the minimal setup of one IRC server definition.
# IRC server definitions can also be edited from the web interface.
# 1) Edit a short name for the server definition
# 2) IRC server host, port and TLS flags
# 3) IRC server password (if needed)
# 4) IRC nick name, user, real name.
# 5) Optional: Preferred list of channels for this server.
```

- Configure firewall ports as required.
- To start the app `node bin/www.mjs` or `npm start`

- Route on web page: `/irc/webclient.html`

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

### Multiple Instance Security Caution

A web browser does not consider the server port number when selecting session
cookies for HTTP server requests. Running multiple instances of irc-hybrid-client with the
same host name, but different server port numbers, can result in the browser submitting
multiple session cookies to the web server.
Although the instanceNumber configuration property is intended to implement unique
cookie names for each instance (port number), unique cookie names WILL NOT prevent the browser
from submitting multiple cookies for all sessions that matches the host name.
Therefore, it is not recommended to run multiple instances of irc-hybrid client on
the same host name unless you understand the security implications associated with
cookies and concurrent sessions. This caution does not apply to different users
who are connecting from different browser/computer. It does apply to multiple tabs in
a one web browser. This setup may be useful for one single user to use multiple
browser tabs for simultaneous connection to different IRC networks.

 See the
[login configuration docs](https://cotarr.github.io/irc-hybrid-client/login-config.html)
for information on use of the instanceNumber property.

### Optional socks5 proxy support 

The program includes limited support for socks5 proxy connections. See the
[login config](https://cotarr.github.io/irc-hybrid-client/login-config.html)
page of the irc-hybrid-client documentation for information.

### Optional remote login

The irc-hybrid-client program supports optional remote login capability using an external 
authorization server. An independent authorization server [collab-auth](https://github.com/cotarr/collab-auth)
was written in parallel with this irc-hybrid-client project. 
It uses a custom implementation of Oauth 2.0. 
Further description is available in the 
[Login Config](https://cotarr.github.io/irc-hybrid-client/login-config.html) 
page of the irc-hybrid-client documentation.
Only collab-auth is supported. Other generic Oauth 2.0 providers are not supported.

The default irc-hybrid-client configuration uses stand alone internal user authentication by password entry.

### eslint

```
# Run eslint as npm script defined package.json
npm run lint
```