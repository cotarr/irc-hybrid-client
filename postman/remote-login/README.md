# Postman Tests for irc-hybrid-client - Remote Login

The primary purpose of the test collection in this folder is to exercise the 
optional remote login workflow using the 
[collab-auth](https://github.com/cotarr/collab-auth) authorization server
as a remote login server for irc-hybrid-client program.

This test collection can then be used to debug the authorization workflow step by step.
It is not intended to test security vulnerabilities.

These instructions use temporary passwords that are not 
intended for use in a server that is visible on the internet.

# Postman Environment Variables 

The following environment variables may be imported into postman from: `postman/remote-login/irc-hybrid-client-remote.postman_environment.json`

- auth_host        (http://127.0.0.1:3500)
- redirect_uri     (http://localhost:3003/login/callback)
- user_username    (bob)
- user_password    (bobssecret)
- client_id        (irc_client_1)
- client_secret    (ssh-secret)
- scopes           (irc.all)
- server_URL       ("http://localhost:3003")
- server_user1     ("user1")
- server_password1 ("mysecret")
- irc_nickname     ("myNick")
- irc_channel      ("#test")
- sever_die ("YES" or "NO")

# Postman collection

Import the postman collection: `postman/remote-login/irc-hybrid-client remote.postman_collection`

# Postman config
* Postman settings: General: automatically follow redirects = OFF

# irc-hybrid-client configuration

Install a copy of the irc-hybrid-client in a protected development environment
that does not have access to the internet, such as a virtual machine or behind a NAT router.

Copy the example credentials to a working copies

```bash
cp example-credentials.json credentials.json
cp example-servers.json servers.json
```

It is not necessary to configure a user login because this test will use remote login.

Configure the following lines into the credentials.json file

```json
  "enableRemoteLogin": true,
  "remoteAuthHost": "http://127.0.0.1:3500",
  "remoteCallbackHost": "http://localhost:3003",
  "remoteClientId": "irc_client_1",
  "remoteClientSecret": "ssh-secret",
  "remoteScope":  "irc.all"
```

# collab-auth configuration

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

The entire test collection may then be run in Postman as a collection or run step by step.

The servers may be stopped in each terminal window by using Ctrl-C.


