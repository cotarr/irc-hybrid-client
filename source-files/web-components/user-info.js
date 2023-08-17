// MIT License
//
// Copyright (c) 2021 Dave Bolenbaugh
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
// ------------------------------------------------------------------------------
//
// This web component performs a network fetch request to /userinfo
//
// Example response object:
//
//   user {
//     "user": "user1",
//     "name": "Bob Smith",
//     "userid": 1
//   }
//
//
// ------------------------------------------------------------------------------
'use strict';
window.customElements.define('user-info', class extends HTMLElement {
  getLoginInfo = () => {
    return new Promise((resolve, reject) => {
      const fetchController = new AbortController();
      const fetchOptions = {
        method: 'GET',
        cache: 'no-store',
        redirect: 'error',
        signal: fetchController.signal,
        headers: {
          Accept: 'application/json'
        }
      };
      const fetchURL = '/userinfo';

      document.getElementById('activitySpinner').requestActivitySpinner();
      const fetchTimerId = setTimeout(() => fetchController.abort(),
        document.getElementById('globVars').constants('fetchTimeout'));

      fetch(fetchURL, fetchOptions)
        .then((response) => {
          if (response.status === 200) {
            return response.json();
          } else {
            // Retrieve error message from remote web server and pass to error handler
            return response.text()
              .then((remoteErrorText) => {
                const err = new Error('HTTP status error');
                err.status = response.status;
                err.statusText = response.statusText;
                err.remoteErrorText = remoteErrorText;
                throw err;
              });
          }
        })
        .then((responseJson) => {
          // console.log(JSON.stringify(responseJson, null, 2));
          if (fetchTimerId) clearTimeout(fetchTimerId);
          document.getElementById('activitySpinner').cancelActivitySpinner();
          if (!('user' in responseJson)) {
            throw new Error('Token validation failed.');
          }
          window.globals.webState.loginUser = responseJson;
          // ------------------------------------------------------------
          // Retrieve last web userid from local storage
          // If current web userid does not match, clear local data
          // Save current userid to localStorage.
          // Note: userid is an integer number assigned in credentials.js
          // ------------------------------------------------------------
          let lastLoginUser = null;
          lastLoginUser = JSON.parse(window.localStorage.getItem('lastLoginUser'));
          if ((lastLoginUser) &&
            (lastLoginUser.userid) &&
            (lastLoginUser.userid !== responseJson.userid)) {
            console.log('User id changed, clearing local storage');
            window.localStorage.clear();
          }
          const newLoginTimestamp = Math.floor(Date.now() / 1000);
          const newLoginUser = {
            timestamp: newLoginTimestamp,
            userid: responseJson.userid
          };
          window.localStorage.setItem('lastLoginUser', JSON.stringify(newLoginUser));
          // deep copy
          resolve(JSON.parse(JSON.stringify(responseJson)));
        })
        .catch((err) => {
          if (fetchTimerId) clearTimeout(fetchTimerId);
          document.getElementById('activitySpinner').cancelActivitySpinner();
          // Build generic error message to catch network errors
          let message = ('Fetch error, ' + fetchOptions.method + ' ' + fetchURL + ', ' +
            (err.message || err.toString() || 'Error'));
          if (err.status) {
            // Case of HTTP status error, build descriptive error message
            message = ('HTTP status error, ') + err.status.toString() + ' ' +
              err.statusText + ', ' + fetchOptions.method + ' ' + fetchURL;
          }
          if (err.remoteErrorText) {
            message += ', ' + err.remoteErrorText;
          }
          const error = new Error(message);
          // limit to 1 line
          message = message.split('\n')[0];
          document.getElementById('errorPanel').showError('Error retrieving user info: ' + message);
          reject(error);
        }); // fetch
    }); // promise
  }; // getLoginInfo

  // initializePlugin () {
  // }

  // connectedCallback() {
  // }
});
