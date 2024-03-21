# API Tests for irc-hybrid-client

The purpose of these tests is to exercise the
general functionality backend API for the irc-hybrid-client web server.

To run these tests it is necessary to install the VSCode text editor.
The VSCode extension Thunder Client must be loaded into VSCode to run these tests.

## Legacy postman collections

The legacy postman collections can be found in the "postman/" folder in commit 
ca1bec034ca2500251bd67387d94c650b3620db1 from 2023-07-17.

## API Documentation

This docs page contains further instructions related to testing of the API
in combination with the websocket.

[cotarr.github.io/irc-hybrid-client/api.html](https://cotarr.github.io/irc-hybrid-client/api.html)

## Warning

Running the tests individually can cause the web server to initiate IRC 
connections and issue IRC commands WITHOUT display of the IRC server responses.
This is because IRC server responses are returned asynchronously 
in the websocket stream which is not visible in Thunder Client.
In most cases, the API response is limited to a true/false error flag 
showing initialization of an asynchronous request, not subsequent completion or data.

The collections include tests defined in a specific order such that interaction between the
web server and IRC server are blocked as authorization failures. Should you choose to run
the API requests individually, it is recommended to use a dedicated IRC server.

## IRC server setup

It is recommended to install a temporary IRC server to perform these tests.
The irc-hybrid-client was developed using the Debian apt package "ngircd".
Performing these tests can submit multiple IRC messages in rapid succession.
Running this on a public IRC server may get the IP addressed banned.

It is recommended to run the entire test on an isolated network or 
inside a virtual machine. In an isolated environment TLS and TLS certificates are not required.
Development testing was performed using a ngirc IRC server on a raspberry pi
on segregated network behind a NAT router.

The temporary IRC server that we just created must be added to the irc-hybrid-client server list.
If you prefer to use the internal server list editor web page, you can skip the next part 
and use the server list editor web page after the app is running.

- In the base folder of the repository, copy the example IRC server file to servers.json

```
cp -v example-servers.json servers.json
```

The File will look like this. Setup the servers.json to match the test IRC server you just installed.
The file is in JSON format. Use caution to use quotes and commas in the proper syntax.
The important values are marked with arrows.

```
{
  "configVersion": 2,
  "ctcpTimeLocale": ["en-US", "UTC"],
  "serverArray": [
    {
      "disabled": false,
      "name": "Test IRC Server",    <------
      "host": "127.0.0.1",          <------
      "port": 6667,                 <------
      "tls": false,
      "verify": false,
      "proxy": false,
      "reconnect": false,
      "logging": false,
      "password": "",
      "saslUsername": "",
      "saslPassword": "",
      "identifyNick": "",
      "identifyCommand": "",
      "nick": "Bob",                <------
      "altNick": "",
      "recoverNick": false,
      "user": "user",               <------
      "real": "Bob Smith",          <------
      "modes": "+i",
      "channelList": ["#test"]
    }
  ]
}
```

## irc-hybrid-client setup

The /docs/ folder folder has detailed instructions for install and setup of irc-hybrid-client.
The /docs/ folder is also available on GitHub at https://cotarr.github.io/irc-hybrid-client/. 
The repository README.md has abbreviated instructions.
The following steps assume a temporary setup in an insulated environment
such as a virtual machine.

- Clone the irc-hybrid-client and install NPM dependencies.

```bash
# clone the github repository
git clone https://github.com/cotarr/irc-hybrid-client.git
cd irc-hybrid-client

export NODE_ENV=development
npm install
```

- Make sure credentials.json does not exist, this demo will use a .env file for configuration.
- In the base repository folder, create a .env file. The following minimum configuration copied from the repository main README.md:

```
ENV_VAR_CONFIG_VERSION=2
LOGIN_USER_USERID=1
LOGIN_USER_USER="user1"
LOGIN_USER_NAME="Bob Smith"
LOGIN_USER_HASH="---BCRYPT-HASH-GOES-HERE---"
SERVER_TLS=false
SERVER_PORT=3003
SERVER_INSTANCE_NUMBER=0
SESSION_SECRET="---COOKIE-SECRET-GOES-HERE---"
```

- The SERVER_INSTANCE must be set to 0 (zero) to setup a unique cookie name.

- Use a password random generator like `pwgen` to generate an insert SESSION_SECRET.

- Generate a user account bcrypt hash using the following tool. To match the Thunder Client environment variables use the following:
  - user: "user1"
  - name: "Bob Smith"
  - password: "mysecret"

```bash
cd tools/
# fill in user and password when prompted.
node genEnvVarAuthForUser_1.mjs
# Copy/Paste the environment variable assignments as needed.
cd ..
```

- Example

```
$node genEnvVarAuthForUser_1.mjs

User up to 16 characters a-z,A-Z,0-9
Enter new user:user1

Name up to 32 characters a-z,A-Z,0-9 and spaces
Enter new name (user1):Bob Smith

Enter new password:mysecret

You may copy/paste these environment variables

LOGIN_USER_USERID=1
LOGIN_USER_USER="user1"
LOGIN_USER_NAME="Bob Smith"
LOGIN_USER_HASH="$2a$10$ZHsiE/MOCJbOsr1kBRotZONBTmNjxPdeMXuU3XxmOzM1FfcXX5.I6"
```

- Copy and paste the generated login credentials to the .env file.
- You can use different username and password but the values much match the Thunder Client environment variables and the .env file values.
- Start the web server

```
npm start
```

- Direct the web browser to http://localhost:3003/irc/webclient.html


## Thunder Client Settings

This must be done **BEFORE** importing the collection. Otherwise, tests 
using the COPY method will be imported as GET requests.

- In Thunder Client: Disable the functionality to follow redirects (302)

Settings > User > Extensions > Thunder Client > Follow Redirects (Uncheck)

- In Thunder Client: Add "COPY" as a custom HTTP method.

Settings > User > Extensions > Thunder Client > Custom Methods: COPY

## Thunder Client Environment Variables

A local environment is required to save interim data. In the Thunder Client "Env" tab, if "(Local Env)" does not show in the list of environments. it must be created by selecting "Local Environment" in dropdown.

The following environment variables may be imported into Thunder Client from: `thunderclient/thunder-environment_irc-hybrid-client.json`. The first 6 environment variables listed below are used for the main IRC test collection.

- The server_URL is the web server, not the IRC server.
- The server_user1 and server_password1 values are for the web page login, not IRC.
- The irc_nickname and irc_channel will be used for the tests.

The remaining 7 environment variables that begin with "auth_" are only required if remote authentication is used. 
The may be omitted for this part of the test.

```
server_URL:          "http://localhost:3003"
server_user1:        "user1"
server_password1:    "mysecret"
irc_nickname:        "myNick"
irc_channel":        "#test"
server_die:          "NO"

auth_host:           "http://127.0.0.1:3500"
auth_redirect_uri:   "http://localhost:3003/login/callback"
auth_username:       "bob"
auth_password:       "bobssecret"
auth_client_id:      "irc_client_1"
auth_client_secret:  "ssh-secret"
auth_scopes:         "irc.all"
```

## Thunder Client Collections

In the Thunder Client extension in VSCode, there are 4 test collections.
These test collections can be imported into VSCode ThunderClient as needed.

```
thunder-collection_irc-hybrid-client-tests-1.json (Folder: Auth tests)
thunder-collection_irc-hybrid-client-tests-2.json (Folder: Websocket Auth Test)
thunder-collection_irc-hybrid-client-tests-3.json (Folder: Message Debug)
thunder-collection_irc-hybrid-client-tests-4.json (Folders: Server Config, Response Headers) 
```

There is a separate collection in the thunderclient/remote-login/ folder 
that is only used with remote authentication. A README file in that folder
includes instructions for use of that collection.

# Tests 

## Auth Tests 1.1 to 4.20

This is a general demonstration of the user password login process
and route authorization.

List of tests

* 1.1 Call /logout, delete cookie, clear variables
* 1.2 Confirm server is running
* 1.3 Confirm one secure route is blocked
* 2.1-2.18 User login requests that are expected to fail.
* 3.1 Request the login HTML form. Extract the login nonce and CSRF token.
* 3.2 Use POST request to submit username and password. The login nonce will timeout after a short delay.
* 4.1-4.20 Logout, then confirm authorization blocks access to each API route.

# Websocket Auth Test 5.1 to 5.16

The irc-hybrid-client web server includes 2 different TCP socket servers.
A standard HTTP web server is used to load the web page and javascript to the web browser.
A second server is used to listen for websocket connection upgrade requests.
The websocket is used to receive a UNIX stream containing IRC messages.

In order to initiate a websocket connection, the browser must obtain a valid cookie 
using the normal user password login process.
The browser must extract a valid CSRF token from the HTML on the main page.
Using the same cookie as the seb server and a valid CSRF token,
the browser performs a POST request to the /irc/wsauth route.
The cookie is validated. The CSRF token is validated.
The cookie will be remembered. A 10 second timer is started.
Within the 10 second time window, the browser submits a connection 
upgrade request to the /irc/ws route including the same cookie. 
Unauthorized connection upgrade requests will return a status 401 Unauthorized error. 

The Thunder Client API testing capabilities are not capable to open a websocket 
to receive IRC messages as a UNIX stream. A GET request to /irc/ws with 
connection upgrade headers issued on a standard API call would return an 
error status 400 Bad Request "Missing or invalid Sec-WebSocket-Key header".
However, Thunder Client does have the capability to perform a limited set of 
tests to confirm access is blocked without having to actually open the websocket.
The tests in this folder do this.

Independent of Thunder Client, it is possible to show functionality 
of the websocket using a custom test page included in the repository.
In the file /server/web-server.mjs, perform a text search for "/testws/test-websocket.html".
This section includes instructions to temporarily remove comments to 
enable the custom websocket testing web page. When finished, remember to disable the test.

List of tests

* 5.1 /logout delete cookie, clear variables
* 5.2 GET /login Load login form, extract login nonce and CSRF token to a local variable for use in POST requests
* 5.3 POST /login Successful user login
* 5.4 /irc/wsauth Enable websocket, start 10 second timer, remember cookie
* 5.5 Delay timer 12 seconds, wait timer to expire.
* 5.6 /irc/ws Websocket fail 401 due to timer exceeded.
* 5.7 /irc/wsauth Enable websocket, start timer, remember cookie
* 5.8 /irc/not-found Websocket fail 404 due to not /irc/ws (Check log for: "websocket-path-not-found /irc/not-found")
* 5.9 /irc/ws Success, expected result status 400 Bad request "Missing or invalid Sec-WebSocket-Key header"
* 5.10 /irc/ws Socket listener only valid one time. Repeat request, expect fail 401.
* 5.11 /irc/wsauth Enable websocket, start timer, remember cookie
* 5.12-5.13 Logout, login, request will now have a different cookie, different CSRF secret in session
* 5.14 Attempt to open websocket upgrade request in case of cookie hash does not match previously saved value, expect fail 401.
* 5.15 Attempt to enable websocket using initial CSRF token (first_csrf_token) from step 5.2, now invalid, expect fail 403
* 5.16 Attempt to open websocket upgrade request, no auth scheduled due to 5.15, expect fail 401.

## Message Debug 7.1 to 8.16

These requests were used during manual debugging to exercise different POST 
requests for the purpose of manually checking API function and data validation.

In most cases, the response to the request is returned asynchronously as 
stream data via the web-socket. In order to view the IRC server response, use a 
web browser and log into the web server using the same user account as 
used in these API tests. Using Server --> Tools, select the View-Raw 
and View-Comms checkboxes to see the responses within the websocket stream.

To get a valid cookie, run selection 7.1, 7.2, and 7.3. 
After a valid cookie is present, the remainder of POST requests can be 
performed individually.

RECOMMEND DEDICATED IRC SERVER FOR TESTING

If the tests are executed in order, the follow will be exercised:

* 7.1-7.3 Login to web server
* 8.1 Selects server index 0 in the IRC server list
* 8.2 Download IRC client state object, confirm server index=0
* 8.3 Connect backend to IRC server (be careful here)
* Timer 5 seconds. If your IRC server needs more time for domain lookup and identd lookup, you can extend this longer.
* 8.4 Download IRC client state object, confirm connected to IRC.
* 8.5 JOIN an IRC channel
* Timer 1 second (for IRC server latency)
* 8.6 Download IRC client state, confirm join in channel
* 8.7 Send a channel message (PRIVMSG)
* 8.8 PART or leave the channel.
* Timer 1 second (for IRC server latency)
* 8.9 Download IRC client state, confirm part
* 8.10 Remove (prune) the channel data from backend.
* 8.11 Download IRC client state, confirm channel pruned
* 8.12 Retrieve message cache
* 8.13 Disconnect backend from IRC
* 8.14 Clear the message cache.
* 8.15 Confirm empty cache.
* 8.16 Terminate (Die) the backend web server (This will show a message, but not die unless environment variable server_die is set to "YES").

## Server Config 9.1 to 9.19

This is a series of tests that will use the /irc/serverlist API to edit
the list of available IRC servers. The server list is stored in the base 
folder of the repository in a file servers.json.
The /irc/serverlist interface accepts REST API type commands to
create, modify and delete IRC server list entries.

When run in sequence a new server will be created (POST), modified (PATCH), 
removed (DELETE), and duplicated (COPY). These are intended test functionality, 
not access control which is tested in another sequence.

## Response Headers (not numbered)

The web server uses the NPM middleware "helmet" to insert some security headers and 
a Content Security Policy (CSP). Occasionally helmet is upgraded. This is a 
quick check to look for changes.

# Remote Login Collection

Remote login is an optional irc-hybrid-client configuration 
that can use a remote Oauth 2.0 authorization server. 
Remote login Thunder Client exports are in a separate folder `thunderclient/remote-login/`.
See:  thunderclient/remote-login/README.md


