/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define((require, exports, module) => {
  'use strict';

  const {main} = require('reflex');
  const Model = require('./browser');
  //const {readSession, resetSession} = require('./actions');
  const {appUpdateAvailable} = require('./github');

  window.main = main(document.body, Model());

  appUpdateAvailable.then(() => {

    dispatchEvent(new CustomEvent('app-update-available'));
  }, () => {
    console.log('Not checking for updates');
  });

});
