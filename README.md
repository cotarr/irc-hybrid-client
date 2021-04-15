# irc-hybrid-client

Single user hybrid IRC client using JavaScript front end and Node/Express back end.

### Project Goals

- Single user web IRC client, Chrome IOS browser, for iPhone plus with 375 pixel screen width.
- Concurrent logins (desktop/tablet) with synchronized displays.

### Coding Goals

- Single HTML page
- Hybrid native JavaScript front end integrated to back end Node/Express server.
- Back end server manages IRC connections and IRC channel membership.
- Back end server manages HTTP Username/password login and session cookies internally.
- Front end browser manages IRC message display and parses user input, and IRC commands.
- Front end JavaScript limited to native JavaScript without web framework or external libraries.
- Front end JavaScript coded to enforce Content Security Policy (CSP) "self" only.
- Limit IRC and API connections to one address/port (Same origin policy enforced).
- TLS support both to browser and IRC server.

### Current Limitations

- This is a chat application, not a channel protection bot, and does not include kick/ban enforcement.
- Limited to one web login for one IRC user to one server (i.e. personal web hosted IRC client)
- Limited to one IRC network at a time (for now...)
- IRC Configuration files located in back end server are not remotely configurable.

# Installation

```bash
git clone git@github.com:cotarr/irc-hybrid-client.git
cd irc-hybrid-client

# make log directory
mkdir logs

# install packages
npm install

# copy example credentials and edit
cp example-credentials.json credentials.json

# 1) file path for TLS certs and tls:true ...or.. set tls=false
# 2) Set a unique cookie secret
# 3) set .well-known/security.txt data, or empty string.
# 4) file path for PID file

# It is necessary to assign one username and password.
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
```

# To use gulp
```
npm install -g gulp-cli
gulp dist
```
