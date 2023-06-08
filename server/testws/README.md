# Test Websocket

This is a temporary testing web page.

The purpose of this page is to challenge the authorization
of the websocket server connection request. This web page can also
be used in combination with postman to view API responses as described
in the API section of the /docs.

Caution, when enabled, this test page is publicly visible and does not require
authentication to load the page. Therefore, the route handler
is disabled with commenting in web-server.js. It should only
be temporarily enabled for testing purposes.

The irc-hybrid-client application has two separate web servers: 1) express HTML/API server, 2) websocket server.
The websocket server does not have access to express (req, res, next) objects,
and websocket requests do not have access to express-session data or authentication status.
Therefore, the websocket server must validate the websocket connection request independently.
This temporary web page is intended to be used to confirm the websocket server is properly secured.

### Normal connect sequence description

* Browser attempts POST request to /irc/wsauth
* Session cookie validated by express-session.
* Cookie value and +10 second expiry setup for subsequent websocket connection.
* Browser attempts wss:// websocket request containing valid cookie.
* Cookie from wss:// websocket upgrade request is validated.
* Timer is checked for expiration.
* NodeJs web server handles UPDATE request (from header) and establishes websocket.

### Recommend test procedure

* Stop the web server (if running). This removes any active user login status.
* Remove comment the route `app.use('/testws', module1.testWsRouter);` in file web-server.js to temporarily enable the test page
* Set environment `export NODE_ENV=development`
* Start web server
* Set browser to test page: http://localhost:3003/testws/test-websocket.html
* 1) Select the [Connect Websocket] button
* Expected response:  "websocket: error event fired", "websocket: close event fired"
* 2) Select the [Schedule Connect] button
* Expected response: "Error: Fetch status 403 Forbidden"
* 3) Within 10 seconds, select the [Connect Websocket] button
* Expected response:  "websocket: error event fired", "websocket: close event fired"
* The above three tests show the websocket is properly protected.
* Stop the server.
* Disable the test page by replacing source code comments on route handler at `app.use('/testws', testWs);` in file web-server.js.

### Open websocket with valid login

If you wish to connect the websocket for testing purposes, the browser must obtain a valid session
cookie. This is done by using the [login] button. Upon successful login,
the irc-hybrid-client page will open normally. To return to the test page use the browser back arrow.
Select first the [Schedule Auth] button, then immediately select [Connect Websocket] button.
The server will respond with "websocket: open event fired". In the message window, a "HEARTBEAT"
message will be displayed at 10 second intervals. The "HEARTBEAT" messages indicates the web socket is connected.
Alternately, the [login] and [logout] buttons can be used to add or remove valid cookie from session.

During general debugging, this test page may be useful. Multiple browsers are allowed to connect concurrently.
This is one way to observe the raw websocket stream, such as when using postman for API testing.
Equivalent content is echoed to all connected websockets.
