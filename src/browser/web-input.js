/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define((require, exports, module) => {

  'use strict';

  const {Record, Union, List, Maybe, Any} = require('common/typed');
  const Editable = require('common/editable');
  const Focusable = require('common/focusable');

  // Model
  exports.Model = Editable.Model;


  // Action

  const Enter = Record({
    id: '@selected',
  }, 'WebView.Input.Enter');

  const Focus = Record({
    id: '@selected',
  }, 'WebView.Input.Focus');

  const Blur = Record({
    id: '@selected'
  }, 'WebView.Input.Blur');


  const Action = Union({Enter, Focus, Blur,
                        Edit: Editable.Action});
  exports.Action = Action;

  // Update

  const {focus, blur} = Focusable;
  const {selectAll} = Editable;

  const update = (state, action) =>
    action instanceof Focus ? Focusable.focus(state) :
    action instanceof Blur ? Focusable.blur(state) :
    action instanceof Enter ? Editable.selectAll(focus(state)) :
    Editable.Action.isTypeOf(action) ? Editable.update(state, action) :
    state;

  exports.update = update;

});
