/* @flow */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {merge, always} from '../../common/prelude';
import {ok, error} from '../../common/result';
import {Effects, Task} from 'reflex';
import * as Unknown from '../../common/unknown'

/*::
import type {Never} from "reflex";
import type {Result} from '../../common/result';
import type {ID, URI, Time, Model, Action} from "./navigation";
*/


// User interaction interaction may also triggered following actions:
export const Stop/*:Action*/ = {type: "Stop"};
export const Reload/*:Action*/ = {type: "Reload"};
export const GoBack/*:Action*/ = {type: "GoBack"};
export const GoForward/*:Action*/ = {type: "GoForward"};

const NoOp = always({type: "NoOp"});
export const Load =
  (uri/*:URI*/)/*:Action*/ =>
  ({type: "Load", uri});

export const LocationChanged =
  (uri/*:URI*/, canGoBack/*:bool*/, canGoForward/*:bool*/)/*:Action*/ =>
  ({type: "LocationChanged", uri, canGoBack, canGoForward});

const CanGoBackChanged =
  result =>
  ({type: "CanGoBackChanged", result});

const CanGoForwardChanged =
  result =>
  ({type: "CanGoForwardChanged", result});

const Stopped =
  result =>
  ({type: "Stopped", stopResult: result});

const Reloaded =
  result =>
  ({type: "Reloaded", reloadResult: result});

const WentBack = result =>
  ({type: "WentBack", goBackResult: result});

const WentForward = result =>
  ({type: "WentForward", goForwardResult: result});

export const canGoBack =
  (id/*:ID*/)/*:Task<Never, Result<Error, boolean>>*/ =>
  new Task((succeed, fail) => {
    const target = document.getElementById(`web-view-${id}`);
    if (target == null) {
      succeed(error(Error(`WebView with id web-view-${id} not found`)));
    }

    else if (target.getCanGoBack == null) {
      succeed(error(Error(`.getCanGoBack is not supported by runtime`)));
    }

    else {
      target.getCanGoBack().onsuccess = request => {
        succeed(ok(request.target.result));
      };
    }
  });

export const canGoForward =
  (id/*:ID*/)/*:Task<Never, Result<Error, boolean>>*/ =>
  new Task((succeed, fail) => {
    const target = document.getElementById(`web-view-${id}`);
    if (target == null) {
      succeed(error(Error(`WebView with id web-view-${id} not found`)));
    }

    else if (target.getCanGoForward == null) {
      succeed(error(Error(`.getCanGoForward is not supported by runtime`)))
    }

    else {
      target.getCanGoForward().onsuccess = request => {
        succeed(ok(request.target.result));
      }
    }
  });


const invoke = name =>
  (id/*:ID*/)/*:Task<Never, Result<Error, void>>*/ =>
  new Task((succeed, fail) => {
    const target = document.getElementById(`web-view-${id}`);
    if (target == null) {
      succeed(error(Error(`WebView with id web-view-${id} not found`)))
    }
    else {
      try {
        // @FlowIgnore: We know that method may not exist.
        target[name]();
        succeed(ok());
      } catch (exception) {
        succeed(error(exception))
      }
    }
  })

export const stop = invoke('stop');
export const reload = invoke('reload');
export const goBack = invoke('goBack');
export const goForward = invoke('goForward');

const report =
  error =>
  new Task((succeed, fail) => {
    console.warn(error);
  });

export const init =
  (id/*:ID*/, uri/*:URI*/)/*:[Model, Effects<Action>]*/ =>
  [ { id
    , canGoBack: false
    , canGoForward: false
    , initiatedURI: uri
    , currentURI: uri
    }
  , Effects.none
  ]

const updateResponse = (model, result) =>
  ( result.isOk
  ? [model, Effects.none]
  : [model, Effects.task(report(result.error)).map(NoOp)]
  );

export const update =
  (model/*:Model*/, action/*:Action*/)/*:[Model, Effects<Action>]*/ =>
  ( action.type === "CanGoForwardChanged"
  ? ( action.result.isOk
    ? [ merge(model, {canGoForward: action.result.value})
      , Effects.none
      ]
    : [ model, Effects.task(report(action.result.error)) ]
    )
  : action.type === "CanGoBackChanged"
  ? ( action.result.isOk
    ? [ merge(model, {canGoBack: action.result.value})
      , Effects.none
      ]
    : [ model, Effects.task(report(action.result.error)) ]
    )
  : action.type === "LocationChanged"
  ? [ merge
      ( model
      , { currentURI: action.uri
        , canGoBack: action.canGoBack
        , canGoForward: action.canGoForward
        }
      )
    , Effects.batch
      ( [ Effects
            .task(canGoBack(model.id))
            .map(CanGoBackChanged)
        , Effects
            .task(canGoForward(model.id))
            .map(CanGoForwardChanged)
        ]
      )
    ]
  : action.type === "Load"
  ? [ merge
      ( model
      , { initiatedURI: action.uri
        , currentURI: action.uri
        }
      ),
      Effects.none
    ]
  : action.type === "Stop"
  ? [ model
    , Effects
        .task(stop(model.id))
        .map(Stopped)
    ]
  : action.type === "Reload"
  ? [ model
    , Effects
        .task(reload(model.id))
        .map(Reloaded)
    ]
  : action.type === "GoBack"
  ? [ model
    , Effects
        .task(goBack(model.id))
        .map(WentBack)
    ]
  : action.type === "GoForward"
  ? [ model
    , Effects
        .task(goForward(model.id))
        .map(WentForward)
    ]
  : action.type === "Stopped"
  ? updateResponse(model, action.stopResult)
  : action.type === "Reloaded"
  ? updateResponse(model, action.reloadResult)
  : action.type === "WentBack"
  ? updateResponse(model, action.goBackResult)
  : action.type === "WentForward"
  ? updateResponse(model, action.goForwardResult)
  : Unknown.update(model, action)
  );
