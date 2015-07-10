/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define((require, exports, module) => {

  'use strict';

  const {Record, Union} = require('common/typed');

  const ZoomOut = Record({
    description: 'Zoom out gesture'
  });

  const ZoomIn = Record({
    description: 'Zoom in gesture'
  });

  const Action = Union({ZoomIn, ZoomOut});
  exports.Action = Action;

  const service = address => {

    var delta;
    var refSize;

    const checkScale = () => {
      const scale = (refSize + delta) / refSize;
      if (delta < 0 && scale < 0.5) {
        address.receive(ZoomOut());
      }
      if (delta > 0) {
        address.receive(ZoomIn());
      }
    }

    document.body.addEventListener('MozMagnifyGestureStart', (e) => {
      refSize = window.innerWidth / 2;
      delta = e.delta;
      checkScale();
    }, true);

    document.body.addEventListener('MozMagnifyGestureUpdate', (e) => {
      delta += e.delta;
      checkScale();
    }, true);

    document.body.addEventListener('MozMagnifyGesture', (e) => {
      delta += e.delta;
      checkScale();
    }, true);
  };

  exports.service = service;
});
