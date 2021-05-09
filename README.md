# irc-hybrid-client

Single user hybrid IRC client using JavaScript front end and Node.js/Express backend.

Documentation: https://cotarr.github.io/irc-hybrid-client

Screen capture images are available in the [documentation](https://cotarr.github.io/irc-hybrid-client)

### Project Status (Work in Progress)

This project is still under development and changes frequently.
At this time, no formal release has been issued.

### Project Goals

- Single user web IRC client for iPhone plus with 375 pixel screen and Chrome IOS browser.
- Concurrent logins (mobile/desktop/tablet) with synchronized displays.

### Coding Goals

- Single HTML page
- Hybrid native JavaScript front end integrated to Node.js/Express backend server.
- Backend server controls IRC connections and IRC channel membership.
- Backend server manages HTTP Username/password login and session cookies.
- Web browser displays IRC messages, touch controls, and IRC text commands.
- Compatible with voice dictation on smartphone (IOS).
- Front end JavaScript limited to native JavaScript without web framework or external libraries.
- Browser Content Security Policy (CSP) "self" enforced and without needing "unsafe-inline".
- TLS support for both Web Server and IRC server. Works with Lets Encrypt certificates.
- Reference RFC 2812 However, not all features are implemented.

### Current Limitations

- User should be comfortable in SSH, starting node servers, and editing a custom JSON configuration files.
- Limited to one IRC user per nodejs/express instance. (i.e. Personal web hosted IRC client).
- This is a chat application, not a channel protection bot, and does not include kick/ban enforcement.
- IRC configuration JSON files are not remotely configurable from the web interface.
- Development done in Chrome for Linux, and Chrome for IOS. Other browsers not tested.
- Development performed on DALnet, other IRC networks not tested.
- No automated tests are included.

# Installation

There is a complete step by step installation instruction in the
[docmentation](https://cotarr.github.io/irc-hybrid-client).
The steps listed here are a minimal installation guide for
people very familiar with deploying Node.js/Express servers.
It is recommended to follow the documentation installation instructions instead.

```bash
# clone the github repository
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

# A revised copy of credentials.json will be displayed after password assignment

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

# route on your server: /irc/webclient.html
```

# Minify and bundle for deployment

The steps in this section are optional is not required.
The repository can be cloned and deployed "as-is",
requiring only editing of the configurations files.

However, running the gulp script will concatenate 10 of the JavaScript
files into 1 bundled/minified JavaScript file.
It will remove comments and whitespace from the javascript code.
This will significantly reduce the download size of the files
and reduce bandwidth used by smartphones.

After running `gulp dist`, a build folder will be created in the main project folder.
The build folder will contain the same folder structure as the base repository.
The gulp script will modify the individual script tags in webclient.html to
replace multiple script tags with a single javascript script tag.

Configuration for the minify and bundle process is stored in "Gulpfile.js"

The configuration JSON files and the /docs folder are not included in the bundle.
The build folder is erased during the build process.
This would remove any configuration if it were added manually.
Typically, the contents of the build folder would be copied to the
eventual server by some type of deployment script, which is beyond the scope of
these instructions. I use a bash script using the secure copy `scp`
command to push the build image to the server.

It is necessary to install gulp-cli globally, as gulp-cli
is used by gulp to manage multiple gulp versions. gulp-cli is not
listed in the pacakge.json. It is not necessary to install gulp-cli
unless you plan to minify and bundle the files.

Some of this would vary depending on the specific deployment environments.
The following commands should be able to produce a minified version.
The deployment itself is left to you.

```
# Install the gulp command line client globally using npm
npm install -g gulp-cli

# bundle and minify to /build folder
gulp dist

# You can deploy by any method

# Configuration requires copy and edit of credentials.json and servers.json

# Commands similar to these are needed
mkdir logs
export NODE_ENV=production

# Install node packages by running:
npm ci

# To run
node bin/www

# route on your server: /irc/webclient.html
```
