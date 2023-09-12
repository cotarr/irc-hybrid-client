# irc-hybrid-client

Single user hybrid IRC client using JavaScript frontend and Node.js/Express backend.

Documentation: https://cotarr.github.io/irc-hybrid-client

Screen capture images are available in the [documentation](https://cotarr.github.io/irc-hybrid-client)

[ChangeLog.md](https://github.com/cotarr/irc-hybrid-client/blob/master/CHANGELOG.md)

## Version v2 Upgrade Notes

The frontend browser code was completely rewritten and merged into the 
master branch as Version V2.0.0 on Sept 12, 2023. 
For a detail description of the changes see the CHANGELOG.md file.

The new version is intended be fully backward compatible. 
Performing a `git pull` on irc-hybrid-client master branch will update both 
frontend and backend NodeJs files.

There are no changes to the configuration files on the backend server, so previous 
configuration should work as-is. There are no changes to the format of the
"servers.json" database of IRC server definitions. However, the file location
of the root directory of the web server has changed (see CHANGELOG.md).
Version 2 contains a bundled and minified version in the repository.

Installations that use custom mp3 sound files will need to move the sound 
files to the build-prod/sounds/ folder.

The previous version v0.2.53 of the web browser frontend will no longer be maintained.
It has been tagged as v1.0.0 to place a clean version boundary to the new version.
The upgraded version will begin at Version v2.0.0.

If any problems are experienced with Version 2, you can revert the 
GitHub master branch to the last Version 0.2.53 commit from Aug 07, 2023 commit hash f87c3d4.
If the Gulp bundler is used, the irc-hybrid-client-dev-tools repository must 
also be rolled back as described in it's README.md file.

### Project Status

The upgrade of the web browser frontend to Version v2 has brought the 
project back into a period of rapid changes to optimize the user interface.
The backend core IRC client and web server did not change in the v2 upgrade
and is mostly stable.

The /docs/ folder has not been upgraded and it still contains Version 0.2.53
screen capture images. New screen captures are deferred until last minute
user interface adjustments have been comleted. In general, the /docs/ instructions 
mostly refer to the backend web server and are still applicable to the new version.

### Repository Contents

HTML, CSS, and JavaScript content is available in both the minified-bundled version and
the commented development version. HTML source files are located in the 
folder `source-files/`. The production minified build is located 
in the folder `build-prod/`. Selection is determined by 
the NODE_ENV environment variable. A development folder `build-dev`
will not be committed to avoid duplication of source files.

The server files are located in the `server/` folder. The server is launched
from the socket server in the `bin/` folder.

The repository contains a /docs/ folder with HTML help documentation for the project.
The /docs/ web pages can be enabled in the web server configuration.
(The /docs/ are not updated for V2 TBD)

# Installation

There are complete step by step installation instructions in the
[docmentation](https://cotarr.github.io/irc-hybrid-client).
The steps listed here in the README.md are a minimal installation guide for
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

# Web Server Configuration

## Choose a configuration method

There are two possible methods that may be used to define the
web server configuration settings. The settings may be stored as 
properties in the "credentials.json" file, or the settings may 
be defined as environment variables or entries in the .env file.
Only one method can be used at a time. If the credentials.json 
file exists, it will be parsed for settings, otherwise 
the environment variables will be parsed for settings.

In the case where someone may want to try the irc-hybrid-client in a 
virtual machine on a private network, it is possible to setup 
a minimal configuration. This should only be used for testing.

Most of the configuration settings can be allowed to fall back to the configuration defaults. 
At minimum, the configuration needs these items:

* A defined user login account
* The web server port number
* A cookie secret. 
* If using TLS, the full path names to the certificate files.


### Option 1 - Bare minimum settings using credentials.json file

To create a minimal configuration that uses the credentials.json,
copy the following JSON object, then paste it into a "credentials.json" file
in the base folder of the repository.
Protect file permissions using `chmod 600 credentials.json`

```json
{
  "configVersion": 2,
  "loginUsers": [
    {
      "userid": 1,
      "user": "user1",
      "name": "Bob Smith",
      "hash": "---BCRYPT-HASH-GOES-HERE---"
    }
  ],
  "serverTlsKey": "/home/user1/tls/privkey.pem",
  "serverTlsCert": "/home/user1/tls/fullchain.pem",
  "tls": true,
  "port": 3003,
  "cookieSecret": "---COOKIE-SECRET-GOES-HERE---"
}
```

### Option 2 - Bare minimum settings using environment variables

To make a minimal configuration that uses environment variables,
copy the following environment variables, then paste them into a .env file
in the base folder of the repository.
Protect file permissions using `chmod 600 .env`.
To use environment variables as the configuration, make sure the 
credentials.json file does not exist in the base folder of the repository.

```
ENV_VAR_CONFIG_VERSION=2
LOGIN_USER_USERID=1
LOGIN_USER_USER="user1"
LOGIN_USER_NAME="Bob Smith"
LOGIN_USER_HASH="---BCRYPT-HASH-GOES-HERE---"
SERVER_TLS_KEY=/home/user/tls/privkey.pem
SERVER_TLS_CERT=/home/user/tls/fullchain.pem
SERVER_TLS=true
SERVER_PORT=3003
SESSION_SECRET="---COOKIE-SECRET-GOES-HERE---"
```

### Option 3 - Create configuration.json using template

To create a new credentials.json file from a full settings template:

```bash
# copy example-credentials.json and edit
cp -v example-credentials.json credentials.json
# If multi user system optionally change permission
chmod 600 credentials.json
```

### Option 4 - Create example .env file using template:


If you are using an external method to manage environment variables,
such as running irc-hybrid-client in a container, then
use the environment variable template as a guide.

To use environment variables as the configuration, make sure the 
credentials.json file does not exist in the base folder of the repository.

For configuration using a full settings template:

```bash
# copy example-credentials.json and edit
cp -v example-.env .env
# If multi user system optionally change permission
chmod 600 .env
```

## Customize web server settings

- Enter the full file path for TLS certificates. If not using TLS, the file path lines may be omitted and set `tls: false` or `SERVER_TLS=false`. 
- Set the port number to a valid integer value. This is the listening port of the web server.
- Set a unique cookie secret to a unique random string (Required).

## Assign one user login password

It is necessary to assign one web page username and password.
There is a detailed example in the documentation.

When using credentials.json file or .env file as configuration, this must be done after copying 
the example-credentials.json into the project folder

The user account used for web page login may be created using one of two 
javascript files in the tools/ folder. Either the "updateAuthForUser_1.mjs" script maybe
be used to add a user account to the credentials.json file, or the "genEnvVarAuthForUser_1.mjs"
script may be used to generate the user account for environment variable configuration.
The generated environment variables can be copy / paste into the .env file using a text editor.

Option 1 of 2: To add a user account to the credentials.json file.

```bash
cd tools/
# fill in user and password when prompted.
node updateAuthForUser_1.mjs
# A revised copy of credentials.json will be displayed after password assignment
cd ..
```
Option 2 of 2: To generate a user account when using environment variable configuration:
```bash
cd tools/
# fill in user and password when prompted.
node genEnvVarAuthForUser_1.mjs
# Copy/Paste the environment variable assignments as needed.
cd ..
```
# IRC server configuration

The first time the web server is started, an empty IRC server list will be created 
automatically as "servers.json" in the base folder of the repository.

Upon the first login to the web page at `/irc/webclient.html`, the 
browser will automatically display an IRC server edit form. 
The form is used to define the first IRC server.
Required fields are marked with a colored dot.
Instruction related to the form's fields is located in the form itself using help buttons.

After at least one IRC server has been created, the user may initiate a "Connect"
to the IRC network using buttons on the web page. To anyone familiar with IRC, 
the interface should be familiar. Additionally, there is a server list panel
capable to show and edit IRC server definitions.

Optionally, you may edit the IRC server list manually. A file "example-servers.json" 
can act as a template. The IRC Config section of the documentation (/docs/) includes 
detail explanation related to manual edit of the server list.

## Related setup

- Configure firewall ports as required.

## Start the app

- To start the app `node bin/www.mjs` or `npm start`

- Route on web page: `/irc/webclient.html`

### Minify and bundle for deployment

This section is optional. This repository contains both minified and
original un-minified files.
The repository can be cloned and deployed as-is,
requiring only editing of the configurations files.

In the case where the web page files have been edited, you may want
to regenerate a new folder containing replacement minified files for the web page.
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
