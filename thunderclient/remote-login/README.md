# Thunder Client Tests for irc-hybrid-client - Remote Login

The purpose of the Remote Auth collection in this folder is to exercise the 
optional remote login workflow using the 
[collab-auth](https://github.com/cotarr/collab-auth) authorization server
as an OAuth 2.0 remote login server for irc-hybrid-client program.

This test collection can then be used to debug the authorization workflow step by step.
It is not intended comprehensive test for security vulnerabilities.

These instructions use temporary passwords that are not 
intended for use in a server that is visible on the internet.

## Thunder Client Environment Variables 

The following environment variables may be imported into Thunder Client from: `thunderclient/thunder-environment_irc-hybrid-client.json`.
The same environment variable file has been used for both the primary irc-hybrid-client collection and the remote-login collection.
The variables that begin with "auth_" are unique to the remote-login collection. The other variables are used in both for parallel tests.

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

## Thunder Client Collection

The remote-login collection is located in a separate "remote-login" folder of the git repository, along with this README.md file.
In VSCode, import the "irc-hybrid-client Remote Auth" collection from `thunderclient/remote-login/thunder-collection_irc-hybrid-client Remote Auth.json` in the git repository.

## irc-hybrid-client configuration

This assumes the irc-hybrid-client ad been previously configured for the 
normal Thunder Client API tests using internal password login.
All testing using the internal password login worked properly before trying this.
This configuration change substitutes a different user password 
authentication service.

For the cookies to work properly, the domain name of the irc web server and 
the authorization server must be different. One uses "127.0.0.1" the other "localhost".

Add this configuration to the .env file:

```bash
OAUTH2_ENABLE_REMOTE_LOGIN=true
OAUTH2_REMOTE_AUTH_HOST=http://127.0.0.1:3500
OAUTH2_REMOTE_CALLBACK_HOST=http://localhost:3003
OAUTH2_REMOTE_CLIENT_ID=irc_client_1
OAUTH2_REMOTE_CLIENT_SECRET="ssh-secret"
OAUTH2_REMOTE_SCOPE=irc.all
```

The variable OAUTH2_ENABLE_REMOTE_LOGIN will switch back and forth between
internal password login and external OAuth2 login.

## collab-auth configuration

Install a copy of the collab-auth server in a protected development environment
that does not have access to the internet, such as a virtual machine or behind a NAT router.

Follow the instructions in the documentation for collab-auth to configure
collab-auth in demonstration mode. After it is up and running,
make the following changes:

* Locate the users-db.json file. 
* Locate the user with username "bob"
* Add the role `irc.all` as shown below (note comma after user.admin)
* Save the file.

users-db.json
```json
  {
    "id": "05d3649f-2bdc-4e0e-aaf7-848dd1516ca0",
    "number": 1,
    "username": "bob",
    "password": "bobssecret",
    "name": "Bob Smith",
    "loginDisabled": false,
    "role": [
      "auth.token",
      "api.write",
      "user.admin",
      "irc.all"
    ],
    "lastLogin": null,
    "createdAt": "2021-08-22T18:38:29.250Z",
    "updatedAt": "2021-08-22T18:38:29.250Z"
  }
```

* Locate the client-db.json file
* Add a comma after the curly brace in the last client definition `},`
* Copy/paste the following temporary client definition into client-db-json.
* Save the file

client-db.json
```json
  {
    "id": "73cf2ee6-308e-4be5-ac1f-37ba73e214cd",
    "name": "irc-hybrid-client 1",
    "clientId": "irc_client_1",
    "clientSecret": "ssh-secret",
    "trustedClient": false,
    "allowedScope": [
      "auth.token",
      "irc.all"
    ],
    "allowedRedirectURI": [
      "http://localhost:3003/login/callback"
    ],
    "createdAt": "2021-08-22T18:38:29.250Z",
    "updatedAt": "2021-08-22T18:38:29.250Z"
  }
```

Open a separate terminal window for collab-auth. Start collab-auth using `npm start`

Open a separate terminal window for irc-hybrid-client. Start irc-hybrid-client using `npm start`

The servers may be stopped in each terminal window by using Ctrl-C.


# Request Descriptions

The authorization server client account provides credentials for the web server 
to interact directly with the authorization server, independent of any user's permissions.
For the case where a client account is configured with `trustedClient": false`, 
the authorization server will present the user with a access decision form in 10.6 and accept 
a POST request in 10.7 for the user to "Accept" or "Deny" the permission to access the resource.
In this case 10.7 will redirect back to the web server with an authorization code.
In the case of `trustedClient: true`, the decision form is skipped, and 10.6 will 
redirect browser immediately back to the web server with an authorization code.

The login process involves two different browser cookies, one for the IRC client web server
and the other for the authorization server login/password form.
During normal login with no valid cookies, first the browser obtains a cookie from 
the web server, then after redirect to the authorization server, a second cookie is obtained.
It is possible to be logged out (no cookie) of the IRC client web server, but still
have an unexpired cookie for the authorization server. In this case, password entry
is not required, and the authorization code grant workflow will return immediately
with an authorization code. For the case where the web server is logged out (invalid cookie), 
but the user still has a valid cookie to the authorization server, 
steps 10.3, 10.4 adn 10.5 will be skipped.

To accommodate all 4 of these situations, there are some differences in the way values 
are parsed from each response and saved into local variables for use in subsequent 
requests. The ThunderClient "irc-hybrid-client Remote Auth" collection contains
duplicate requests in 4 different folders. Each folder may be selected run depending on the 
configuration. Running the entire collection will generate errors where configuration 
does not match some folders.

| Folder Name                         | Trusted | Auth Cookie | Skipped Requests       |
| ----------------------------------- | ------- | ----------- | ---------------------- |
| Untrusted Client Login              | False   |             | None skipped           |
| Untrusted Client (with auth cookie) | False   | Valid       | 10.3 to 10.5           | 
| Trusted Client Login                | True    |             | 10.7                   |
| Trusted Client (with auth cookie)   | True    | Valid       | 10.3 to 10.5, and 10.7 |

Description of ThunderClient requests for remote authentication

- The first two tests logout sessions on both servers and clear environment variables
- 10.1 Main page at /irc/webclient.html is not authorized, redirects to /login on web server
- 10.2 The /login route redirects the browser to the authorization server /dialog/authorize route with OAuth2 values as URL query parameters.
- 10.3 The authorization server does not recognize a cookie. The query parameters are remembered. A redirect 302 sends the browser to the login form.
- 10.4 The login HTML form is loaded, including a CSRF token, the CSRF value is set into an environment variable.
- 10.5 The use's identity is authenticated using username and password. The browser is redirected (302) back to the /dialog authorize route.
- 10.6 The /dialog/authorize returns a decision HTML form requesting permission to use the resource. The user needs to submit "YES"
- 10.7 The user's YES acknowledgement is received by the /dialog/authorize/decision route. A random authorization code is generated and returned to the browser as a query parameter in the URL of the location header of a 302 redirect request.
- 10.8 The browser submits the authorization code to the irc-hybrid-client web server and waits for a response. The web server sends code to the authorization server for validation. The web server returns a cookie to the browser.
- 10.9 The main page at /irc/webclient.html is loaded to confirm access.
- 10.10 The user is logged out.
- 10.11 The main page at /irc/webclient.html will fail to load confirming logout.

