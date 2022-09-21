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
// ---------------------------------------------
// webclient08.js - Notice and WallOps functions
// ---------------------------------------------
'use strict';
// -------------------------------------
// Notice Close Buttons
// -------------------------------------
document.getElementById('closeNoticeButton').addEventListener('click', function () {
  webState.noticeOpen = false;
  updateDivVisibility();
});

// -------------------------
// Notice Erase button handler
// -------------------------
document.getElementById('noticeEraseButton').addEventListener('click', function () {
  document.getElementById('noticeSectionDiv').setAttribute('lastDate', '0000-00-00');
  document.getElementById('noticeMessageDisplay').setAttribute('rows', '5');

  const fetchURL = webServerUrl + '/irc/erase';
  const fetchOptions = {
    method: 'POST',
    headers: {
      'CSRF-Token': csrfToken,
      'Content-type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({ erase: 'NOTICE' })
  };
  fetch(fetchURL, fetchOptions)
    .then((response) => {
      // console.log(response.status);
      if (response.ok) {
        return response.json();
      } else {
        throw new Error('Fetch status ' + response.status + ' ' + response.statusText);
      }
    })
    .then((responseJson) => {
      if (responseJson.error) {
        showError(responseJson.message);
      }
    })
    .catch((error) => {
      // console.log(error);
      showError(error.toString());
    });
}); // notice erase button

// -------------------------
// Notice Taller button handler
// -------------------------
document.getElementById('noticeTallerButton').addEventListener('click', function () {
  const newRows =
    parseInt(document.getElementById('noticeMessageDisplay').getAttribute('rows')) + 5;
  document.getElementById('noticeMessageDisplay').setAttribute('rows', newRows.toString());
});

// -------------------------
// Notice Normal button handler
// -------------------------
document.getElementById('noticeNormalButton').addEventListener('click', function () {
  document.getElementById('noticeMessageDisplay').setAttribute('rows', '5');
});

// -------------------------------
// Clear message activity ICON by clickin gon the main
// notice window Section
// -------------------------------
document.getElementById('noticeSectionDiv').addEventListener('click', function () {
  resetNotActivityIcon();
});

// -------------------------------------
// Wallops Close Buttons
// -------------------------------------
document.getElementById('wallopsCloseButton').addEventListener('click', function () {
  webState.wallopsOpen = false;
  updateDivVisibility();
});

// -------------------------
// Wallops Erase button handler
// -------------------------
document.getElementById('wallopsEraseButton').addEventListener('click', function () {
  document.getElementById('wallopsSectionDiv').setAttribute('lastDate', '0000-00-00');
  document.getElementById('wallopsMessageDisplay').setAttribute('rows', '5');
  const fetchURL = webServerUrl + '/irc/erase';
  const fetchOptions = {
    method: 'POST',
    headers: {
      'CSRF-Token': csrfToken,
      'Content-type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({ erase: 'WALLOPS' })
  };
  fetch(fetchURL, fetchOptions)
    .then((response) => {
      // console.log(response.status);
      if (response.ok) {
        return response.json();
      } else {
        throw new Error('Fetch status ' + response.status + ' ' + response.statusText);
      }
    })
    .then((responseJson) => {
      if (responseJson.error) {
        showError(responseJson.message);
      }
    })
    .catch((error) => {
      // console.log(error);
      showError(error.toString());
    });
}); // wallops erase button

// -------------------------
// Wallops Taller button handler
// -------------------------
document.getElementById('wallopsTallerButton').addEventListener('click', function () {
  const newRows =
    parseInt(document.getElementById('wallopsMessageDisplay').getAttribute('rows')) + 5;
  document.getElementById('wallopsMessageDisplay').setAttribute('rows', newRows.toString());
});

// -------------------------
// Wallops Normal button handler
// -------------------------
document.getElementById('wallopsNormalButton').addEventListener('click', function () {
  document.getElementById('wallopsMessageDisplay').setAttribute('rows', '5');
});
