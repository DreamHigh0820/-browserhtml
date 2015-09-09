/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
  'use strict';

  const {Application, Address} = require('reflex');
  const Browser = require('./browser');
  const Thumbnail = require('../service/thumbnail');
  const Pallet = require('../service/pallet');
  const Update = require('../service/update');
  const Session = require('./session');
  const Runtime = require('../common/runtime');
  const History = require('../service/history');
  const Search = require('../service/search');
  const Suggestion = require('../service/suggestion');
  const Keyboard = require('../common/keyboard');
  const Settings = require('../service/settings');
  const Scraper = require('../service/scraper');
  const Gesture = require('../service/gesture');
  const SynthesisUI = require('./synthesis-ui');
  const Force = require('../service/force');

  // Set up a address (message bus if you like) that will be used
  // as an address for all application components / services. This
  // address is going to receive action and then pass it on to each
  // application component for it handle it.
  const mailbox = {
    receive(action) {
      // This is unfortunate hack to workaround gecko issues: #566, #565, #564
      // Basic idea is that actions that need to happen in the same tick are
      // boxed with `Force({action})`. Such actions are unboxed and render
      // is forced at the end of the receive. This is likey to introduce some
      // race conditions but for now that's the best we can do.
      const isForced = action instanceof Force.Action;
      if (isForced) {
        action = action.action;
      }

      application.receive(action);
      thumbnail(action);
      pallet(action);
      runtime(action);
      suggestion(action);
      keyboard(action);
      settings(action);
      scraper(action);
      synthesis(action);

      // We cancel scheduled render on next animation frame as we are
      // forceing render to happen right away.
      if (isForced) {
        cancelAnimationFrame(application.version);
        application.render();
      }
    }
  };

  const address = new Address(mailbox);
  const thumbnail = Thumbnail.service(address);
  const pallet = Pallet.service(address);
  const updater = Update.service(address);
  const runtime = Runtime.service(address);
  const suggestion = Suggestion.service(address);
  const keyboard = Keyboard.service(address);
  const settings = Settings.service(address);
  const scraper = Scraper.service(address);
  const gesture = Gesture.service(address);
  const synthesis = SynthesisUI.service(address);
  const application = window.application != null ? window.application :
  new Application({
    target: document.body,
    state: Browser.Model(),
    update: Browser.update,
    view: Browser.view,
    address: address
  });
  window.application = application;


  // If hotswap change address so it points to a new mailbox &
  // re-render.
  if (window.address) {
    window.address.mailbox = mailbox;
    application.state = Browser.Model(window.application.state)
    application.update = Browser.update;
    application.view = Browser.view;

    application.render();
  } else {
    window.address = address;
    // Restore application state.
    address.receive(Session.RestoreSession());

    // Trigger a forced update check after 5s to not slow down startup.
    // TODO: delay until we're online if needed.
    window.setTimeout(address.pass(Runtime.CheckUpdate), 500);
  }
