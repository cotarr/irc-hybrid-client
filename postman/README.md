# Postman Tests for irc-hybrid-client

The primary purpose of these tests is limited to confirming there are no open unprotected API routes.
It is not intended to comprehensively test overall API functionality.

To run these tests it is necessary to install [Postman](https://www.postman.com/downloads/).
The test collections can be imported from the postman folder in the cloned git repository.
These tests were written using Postman v7.28.0., later used with Postman v8.6.2/

The "_postman_id" property has been removed from the exported JSON object, because this value
changes after inport/export, even if there is no change to the tests.

# API Documentation

[cotarr.github.io/irc-hybrid-client/api.html](https://cotarr.github.io/irc-hybrid-client/api.html)

# Warning

Running the tests individually can cause the web server to initiate IRC connections and issue
IRC commands WITHOUT display of the IRC server responses.
This is because IRC server responses are returned asynchronously in the websocket stream
which is not visible in postman.
In most cases, the API response is limited to a true/false error flag showing initialization
of an asynchronous request, not subsequent completion or data.

The collections include tests defined in a specific order such that interaction between the
web server and IRC server are blocked as authorization failures. Should you choose to run
the API requests individually, it is recommended to use a dedicated IRC test server such as ngircd.

# Postman Enviornment Varialbes

- server_URL (Example: "http://localhost:3003")
- server_user1
- server_password1
- irc_nickname
- irc_channel
- sever_die ("YES" or "NO")

# Postman config
* Postman settings: General: automatically follow redirects = OFF

# Setup
* There are three collections:
  * API authorization testing.
  * Websocket authorization testing.
  * Manual debug of POST requests.
* Assign a temporary user/password in the web server for testing.
* In Postman, create a environment with the variables listed above. Set values to the temporary user/password and server URL.
* Suggest manual delete irc-hybrid-client cookie from postman before running tests.
* The tests are time dependent so it is recommended to run the entire collection using the runner.

# 1 irc-hybrid-client API authorization tests

This is a collection of postman tests associated with the
conventional GET and POST methods used to issue IRC client
commands, messages, and user login.

The entire set of tests can be run using the runner. To test various API individually,
the previous session can be cleared by running 1.1.
Assuming the temporary username and password are present in the postman environment variables,
a valid cookie can be obtained by running 3.1 followed immediately by 3.2 within 10 seconds.

List of tests

* 1.1 Clear old sessions
* 1.2 Confirm server is running
* 1.3 Confirm one secure route is blocked
* 2.1-2.12 User login requests that are expected to fail.
* 3.1-3.3 Successful user web login
* 4.1-4.12 Logout, then confirm authorization blocks access to each API route.

# 2 irc-hybrid-client websocket auth tests

Postman is not capable to open a websocket. Attempting to perform a standard API request
on a websocket connection will therefore return a status 400 bad request.
The tests in this section are intended to check authorization of the
websocket connection upgrade request. A blocked connection upgrade request should be
expected to return a status 401 Unauthorized. A successful connection upgrade request
is expected to return status 400 Bad Request.

List of tests

* 5.1 Clear old sessions.
* 5.2-5.3 Successful user login
* 5.4 Tell server to expect websocket connection (hash + expiration time)
* 5.5 Attempt to open websocket upgrade request as GET request expected to return 400 Bad Request (successful authorization)
* 6.1 Tell server to expect a new websocket connection (hash + expiration time)
* 6.2-6.4 Logout, login, postman now has different cookie.
* 6.5 Attempt to open websocket upgrade request in case of cookie hash does not match previously saved value (failed authorization)

# 3 Manual Debug
This collection was used during manual debugging to exercise different POST requests for the purpose of manually checking API function and data validation.

In most cases, the response to the request is returned asynchronously as stream data via the web-socket. The web browser should be simultaneously logged into the server. Some of the GET requests are not included in this collection.

To get a valid cookie, run selection 7.1, 7.2, and 7.3. After a valid cookie is present, the remainder of POST requests can be performed manually. Open a web browser concurrently with postman. Using Server --> Tools, select the View-Raw and View-Comms checkboxes to see the responses within the websocket stream.

RECOMMEND DEDICATED IRC SERVER FOR TESTING

If the tests are executed in order, the follow will be exercised:

* 7.1-7.3 Login to web sevrver
* 8.1 Selects server index
* 8.3 Connect backend to IRC
* 8.5 JOIN an IRC channel
* 8.7 Send a channel message (PRIVMSG)
* 8.8 PART or leave the channel.
* 8.10 Remove (prune) the channel data from backend.
* 8.12 Retrieve message cache
* 8.13 Disconnect backend from IRC
* 8.14 Clear the message cache.
* 8.16 Terminate (Die) the backend web server.
