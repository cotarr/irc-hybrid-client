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
//     Play Audio "beep" sounds
//
// ------------------------------------------------------------------------------
//
//  Public methods
//    inhibitBeep()
//    playBeep1Sound()
//    playBeep2Sound()
//    playBeep3Sound()
//    userInitiatedAudioPlay()
//    testPlayBeepSound1()
//    testPlayBeepSound2()
//    testPlayBeepSound3()
//
// ------------------------------------------------------------------------------
'use strict';
window.customElements.define('beep-sounds', class extends HTMLElement {
  constructor () {
    super();
    // -------------------------------------------
    // Default beep sound (Max 1 per 5 seconds)
    // -------------------------------------------
    //
    // Place holder
    this.beep1 = null;
    this.beep2 = null;
    this.beep3 = null;

    this.beep1InhibitTimer = 0;
    this.beep2InhibitTimer = 0;
    this.beep3InhibitTimer = 0;
  }

  _beepTimerTick = () => {
    if (this.beep1InhibitTimer > 0) this.beep1InhibitTimer--;
    if (this.beep2InhibitTimer > 0) this.beep2InhibitTimer--;
    if (this.beep3InhibitTimer > 0) this.beep3InhibitTimer--;
  };

  inhibitBeep = (seconds) => {
    // used for reload/update
    this.beep1InhibitTimer = seconds;
    this.beep2InhibitTimer = seconds;
    this.beep3InhibitTimer = seconds;
  };

  audioPromiseErrorStr =
    'Browser policy has blocked Audio.play() ' +
    'because user must interact with page or manually play sound first.';

  /**
   * Play audio beep sound #1
   */
  playBeep1Sound = () => {
    if (!this.beep1) {
      // `new Audio` returns a Promise
      //
      if (window.globals.ircState.customBeepSounds) {
        this.beep1 = new Audio('sounds/custom-beep1.mp3');
      } else {
        // 1300 Hz 0.20 Amplitude 0.250 sec
        this.beep1 = new Audio('sounds/short-beep1.mp3');
      }
    }
    if (this.beep1InhibitTimer === 0) {
      // Note: Chrome requires user interact with page before playing media
      // Chrome on IOS requires manually selecting button to play sound first time.
      // Else throws a DOMException violating media policy
      this.beep1.play()
        .then(() => {
          // upon successful play sound, then hide the button
          document.getElementById('headerBar').removeAttribute('beepicon');
        })
        .catch((error) => {
          if (error.name === 'NotAllowedError') {
            console.info('playBeep1Sound() ' + this.audioPromiseErrorStr);
          } else if (error.name === 'NotSupportedError') {
            console.log('Audio download not available.');
          } else {
            console.error(error);
          }
        });
      this.beep1InhibitTimer = 5;
    }
  };

  /**
   * Play audio beep sound #2
   */
  playBeep2Sound = () => {
    if (!this.beep2) {
      if (window.globals.ircState.customBeepSounds) {
        this.beep2 = new Audio('sounds/custom-beep2.mp3');
      } else {
        // 850 Hz 0.20 Amplitude 0.400 Sec
        this.beep2 = new Audio('sounds/short-beep2.mp3');
      }
    }
    if (this.beep2InhibitTimer === 0) {
      this.beep2.play().catch((error) => {
        if (error.name === 'NotAllowedError') {
          // Duplicate: use error message from beep1
          // console.info('playBeep2Sound() ' + this.audioPromiseErrorStr);
        } else if (error.name === 'NotSupportedError') {
          console.log('Audio download not available.');
        } else {
          console.error(error);
        }
      });
      this.beep2InhibitTimer = 5;
    }
  };

  /**
   * Play audio beep sound #3
   */
  playBeep3Sound = () => {
    if (!this.beep3) {
      if (window.globals.ircState.customBeepSounds) {
        this.beep3 = new Audio('sounds/custom-beep3.mp3');
      } else {
        // 1175 Hz 0.20 Amplitude 0.250 Sec
        this.beep3 = new Audio('sounds/short-beep3.mp3');
      }
    }
    if (this.beep3InhibitTimer === 0) {
      this.beep3.play()
        .then(() => {
          // upon successful play sound, then hide the button
          document.getElementById('headerBar').removeAttribute('beepicon');
        })
        .catch((error) => {
          if (error.name === 'NotAllowedError') {
            console.info('playBeep3Sound() ' + this.audioPromiseErrorStr);
          } else if (error.name === 'NotSupportedError') {
            console.log('Audio download not available.');
          } else {
            console.error(error);
          }
        });
      this.beep3InhibitTimer = 5;
    }
  };

  //
  // Check if browser localStorage contains
  // at lease 1 enabled audio beep for channel text
  // return true = Enabled
  //
  _areBeepsConfigured = () => {
    let isAnyBeepEnabled = false;
    // Beeps in channel windows
    let beepEnableChanArray = null;
    beepEnableChanArray = JSON.parse(window.localStorage.getItem('beepEnableChanArray'));
    if ((beepEnableChanArray) &&
      (Array.isArray(beepEnableChanArray))) {
      if (beepEnableChanArray.length > 0) {
        for (let i = 0; i < beepEnableChanArray.length; i++) {
          if (beepEnableChanArray[i].beep1) isAnyBeepEnabled = true;
          if (beepEnableChanArray[i].beep2) isAnyBeepEnabled = true;
          if (beepEnableChanArray[i].beep3) isAnyBeepEnabled = true;
        }
      }
    }
    // Beeps in private message windows
    let beepEnableObj = null;
    beepEnableObj = JSON.parse(window.localStorage.getItem('privMsgBeep'));
    if ((beepEnableObj) &&
      (typeof beepEnableObj === 'object')) {
      if (beepEnableObj.beep) {
        isAnyBeepEnabled = true;
      }
    }
    return isAnyBeepEnabled;
  }; // _areBeepsConfigured()

  // ---------------------------------------------------------------------------------------
  // This is to address the case of audio beep previously enabled before page load.
  // The checkbox state for channel beep messages is restored from browser localStorage.
  // However, the browser will not play audio media unless audio is initiated by a user event.
  // The following function is called by a user interaction event.
  // The function plays the audio in direct response to user interaction to enable the audio.
  // This result of this function is to leave channel message beep sounds capable of function.
  // ---------------------------------------------------------------------------------------

  /**
   * Accepts User's event driven action to activate media play in browser.
   */
  userInitiatedAudioPlay = () => {
    document.getElementById('headerBar').removeAttribute('beepicon');
    // check if beep enabled in window.localStorage
    if (this._areBeepsConfigured()) {
      setTimeout(this.playBeep2Sound, 100);
      setTimeout(this.playBeep3Sound, 600);
      setTimeout(this.playBeep1Sound, 950);
    }
  }; // userInitiatedAudioPlay()

  // ----------------------------------------
  // Manually play sound for setting volume
  // ----------------------------------------
  // Note: after playing a sound it is inhibited for a short delay timer.
  testPlayBeepSound1 = () => {
    this.beep1InhibitTimer = 0;
    this.playBeep1Sound();
  };

  testPlayBeepSound2 = () => {
    this.beep2InhibitTimer = 0;
    this.playBeep2Sound();
  };

  testPlayBeepSound3 = () => {
    this.beep3InhibitTimer = 0;
    this.playBeep3Sound();
  };

  /**
   * Called once per second as task scheduler, called from js/_afterLoad.js
   */
  timerTickHandler = () => {
    this._beepTimerTick();
  };

  initializePlugin = () => {
    // Show button to enable sound in case browser localStorage has enabled beeps
    if (this._areBeepsConfigured()) {
      document.getElementById('headerBar').setAttribute('beepicon', '');
    }
  };

  // connectedCallback() {
  // }
});
