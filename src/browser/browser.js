/* @flow */

import {version} from "../../package.json";
import {Effects, html, forward, thunk} from "reflex";

import * as Shell from "./shell";
import * as Input from "./input";
import * as Assistant from "./assistant";

// import * as Updater from "./updater"
import * as Devtools from "../common/devtools";
import * as Runtime from "../common/runtime";
import * as URI from '../common/url-helper';
import * as WebViews from "./web-views";
import * as WebView from "./web-view";
import * as Unknown from "../common/unknown";
import {merge, always, batch} from "../common/prelude";
import {cursor} from "../common/cursor";
import * as Focusable from "../common/focusable";
import * as OS from '../common/os';
import * as Keyboard from '../common/keyboard';
import {Style, StyleSheet} from '../common/style';

import {identity, compose} from "../lang/functional";

import {onWindow} from "driver";

/*:: import * as type from "../../type/browser/browser" */

export const init/*:type.init*/ = () => {
  const [devtools, devtoolsFx] = Devtools.init();
  // const [updates, updaterFx] = Updater.init();
  const [input, inputFx] = Input.init(false, false, "");
  const [shell, shellFx] = Shell.init();
  const [webViews, viewsFx] = WebViews.init();

  const model = {
    version,
    shell: shell,
    input: input,
    suggestions: Assistant.initial,
    webViews: webViews,
    // updates: updates,
    devtools: devtools
  };

  const fx = Effects.batch([
    devtoolsFx.map(DevtoolsAction),
    inputFx.map(InputAction),
    shellFx.map(ShellAction),
    viewsFx.map(WebViewsAction)
    //updaterFx.map(UpdaterAction)
  ]);

  return [model, fx];
}


export const InputAction/*:type.InputAction*/ = action =>
    action.type === 'Submit'
  ? SubmitInput
  : action.type === 'Abort'
  ? ExitInput
  : {type: 'Input', action};

export const WebViewsAction/*:type.WebViewsAction*/ = action =>
  ( action.type === "ShowTabs"
  ? ShowTabs
  : action.type === "Create"
  ? CreateWebView
  : action.type === "Edit"
  ? EditWebView
  : { type: 'WebViews'
    , action
    }
  );

const ShellAction = action =>
  ({type: 'Shell', action});

const DevtoolsAction = action =>
  ({type: 'Devtools', action});

const updateInput = cursor({
  get: model => model.input,
  set: (model, input) => merge(model, {input}),
  update: Input.update,
  tag: InputAction
});

const updateWebViews = cursor({
  get: model => model.webViews,
  set: (model, webViews) => merge(model, {webViews}),
  update: WebViews.update,
  tag: WebViewsAction
});

const updateShell = cursor({
  get: model => model.shell,
  set: (model, shell) => merge(model, {shell}),
  update: Shell.update,
  tag: ShellAction
});

const updateDevtools = cursor({
  get: model => model.devtools,
  set: (model, devtools) => merge(model, {devtools}),
  update: Devtools.update,
  tag: DevtoolsAction
});

// Following Browser actions end up updating several components of the
// browser and there for they are defined separately.
export const CreateWebView = {type: 'CreateWebView'};
export const EditWebView = {type: 'EditWebView'};
export const ExitInput = {type: 'ExitInput'};

export const SubmitInput = {type: 'SubmitInput'};
export const Escape = {type: 'Escape'};
export const Unload = {type: 'Unload'};
export const ReloadRuntime = {type: 'ReloadRuntime'};
export const ShowWebView = {type: 'ShowWebView'};
export const ShowTabs = {type: 'ShowTabs'};
export const OpenWebView = {type: 'OpenWebView'};

// Following Browser actions directly delegate to a `WebViews` module, there for
// they are just tagged versions of `WebViews` actions, but that is Just an
// implementation detail.
export const ZoomIn = WebViewsAction(WebViews.ZoomIn);
export const ZoomOut = WebViewsAction(WebViews.ZoomOut);
export const ResetZoom = WebViewsAction(WebViews.ResetZoom);
export const Reload = WebViewsAction(WebViews.Reload);
export const CloseWebView = WebViewsAction(WebViews.CloseActive);
export const GoBack = WebViewsAction(WebViews.GoBack);
export const GoForward = WebViewsAction(WebViews.GoForward);
export const SelectNext = WebViewsAction(WebViews.SelectNext);
export const SelectPrevious = WebViewsAction(WebViews.SelectPrevious);
export const ActivateSeleted = WebViewsAction(WebViews.ActivateSelected);
export const FocusWebView = WebViewsAction(WebViews.Focus);
export const NavigateTo = compose(WebViewsAction, WebViews.NavigateTo);
const ExpandWebViews = WebViewsAction(WebViews.Expand);
const ShrinkWebViews = WebViewsAction(WebViews.Shrink);
const UnfoldWebViews = WebViewsAction(WebViews.Unfold);
const FoldWebViews = WebViewsAction(WebViews.Fold);
const Open = compose(WebViewsAction, WebViews.Open);

export const ActivateWebView = compose(WebViewsAction, WebViews.ActivateByID);

// Following browser actions directly delegate to one of the existing modules
// there for we define them by just wrapping actions from that module to avoid
// additional wiring (which is implementation detail that may change).
export const ToggleDevtools = DevtoolsAction(Devtools.Toggle);
export const Blur = ShellAction(Shell.Blur);
export const Focus = ShellAction(Shell.Focus);

const ShowInput = InputAction(Input.Show);
const HideInput = InputAction(Input.Hide);
const EnterInput = InputAction(Input.Enter);
const EnterInputSelection = compose(InputAction, Input.EnterSelection);

export const AttachSidebar =
  { type: "AttachSidebar"
  };

export const DetachSidebar =
  { type: "DetachSidebar"
  };


const modifier = OS.platform() == 'linux' ? 'alt' : 'accel';
const decodeKeyDown = Keyboard.bindings({
  'accel l': always(EditWebView),
  'accel t': always(CreateWebView),
  'accel 0': always(ResetZoom),
  'accel -': always(ZoomOut),
  'accel =': always(ZoomIn),
  'accel shift =': always(ZoomIn),
  'accel w': always(CloseWebView),
  'accel shift ]': always(SelectNext),
  'accel shift [': always(SelectPrevious),
  'control tab': always(SelectNext),
  'control shift tab': always(SelectPrevious),
  // 'accel shift backspace':  always(ResetBrowserSession),
  // 'accel shift s': always(SaveBrowserSession),
  'accel r': always(Reload),
  'escape': always(Escape),
  [`${modifier} left`]: always(GoBack),
  [`${modifier} right`]: always(GoForward),

  // TODO: `meta alt i` generates `accel alt i` on OSX we need to look
  // more closely into this but so declaring both shortcuts should do it.
  'accel alt i': always(ToggleDevtools),
  'accel alt ˆ': always(ToggleDevtools),
  'F12': always(ToggleDevtools),
  'F5': always(ReloadRuntime),
  'meta control r': always(ReloadRuntime)
});

const decodeKeyUp = Keyboard.bindings({
  'control': always(ActivateSeleted),
  'accel': always(ActivateSeleted)
});

const showWebView = model =>
  batch
  ( update
  , model
  , [ HideInput
    , FoldWebViews
    , FocusWebView
    ]
  );



const submitInput = model =>
  batch
  ( update
  , model
  , [ InputAction(Input.Submit)
    , NavigateTo(URI.read(model.input.value))
    , ShowWebView
    ]
  );

const openWebView = model =>
  batch
  ( update
  , model
  , [ Open
      ( { uri: URI.read(model.input.value)
        , inBackground: false
        , name: ''
        , features: ''
        }
      )
    , ShowWebView
    ]
  );

const focusWebView = model =>
  update(model, FocusWebView)

const exitInput = model =>
  batch
  ( update
  , model
  , [ InputAction(Input.Abort)
    , FocusWebView
    ]
  );

const createWebView = model =>
  batch
  ( update
  , model
  , [ ShowInput
    , EnterInput
    ]
  );

const editWebView = model =>
  batch
  ( update
  , model
  , [ ShowInput
    , EnterInputSelection(WebViews.getActiveURI(model.webViews, ''))
    ]
  );

const showTabs = model =>
  batch
  ( update
  , model
  , [ HideInput
    , UnfoldWebViews
    ]
  );

const attachSidebar = model =>
  update(model, ShrinkWebViews);

const detachSidebar = model =>
  update(model, ExpandWebViews);

const reloadRuntime = model =>
  [ model, Effects.task(Runtime.reload) ];



// Unbox For actions and route them to their location.
export const update/*:type.update*/ = (model, action) =>
  ( action.type === 'SubmitInput'
  ? submitInput(model)
  : action.type === 'OpenWebView'
  ? openWebView(model)
  : action.type === 'ExitInput'
  ? exitInput(model)
  : action.type === 'CreateWebView'
  ? createWebView(model)
  : action.type === 'EditWebView'
  ? editWebView(model)
  : action.type === 'ShowWebView'
  ? showWebView(model)
  : action.type === 'ShowTabs'
  ? showTabs(model)
  // @TODO Change this to toggle tabs instead.
  : action.type === 'Escape'
  ? showTabs(model)
  : action.type === 'AttachSidebar'
  ? attachSidebar(model)
  : action.type === 'DetachSidebar'
  ? detachSidebar(model)
  : action.type === 'ReloadRuntime'
  ? reloadRuntime(model)


  // Delegate to the appropriate module
  : action.type === 'Input'
  ? updateInput(model, action.action)
  : action.type === 'WebViews'
  ? updateWebViews(model, action.action)
  : action.type === 'Shell'
  ? updateShell(model, action.action)
  : action.type === 'Devtools'
  ? updateDevtools(model, action.action)

  : Unknown.update(model, action)
  );

const styleSheet = StyleSheet.create({
  root: {
    background: '#24303D',
    perspective: '1000px',
    // @TODO this isn't actually doing what we want (centering the webviews
    // in the available space). We need to do some 3d space math.
    perspectiveOrigin: 'calc(50% - 380px)',
    // These styles prevent scrolling with the arrow keys in the root window
    // when elements move outside of viewport.
    // @WORKAROUND Use percent, not vw and vh to work around
    // https://github.com/servo/servo/issues/8754
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    position: 'absolute',
    MozWindowDragging: 'drag',
  }
});

export const view/*:type.view*/ = (model, address, children) =>
  html.div
  ( { className: 'root'
    , style: styleSheet.root
    , tabIndex: 1
    , onKeyDown: onWindow(address, decodeKeyDown)
    , onKeyUp: onWindow(address, decodeKeyUp)
    , onBlur: onWindow(address, always(Blur))
    , onFocus: onWindow(address, always(Focus))
    , onUnload: onWindow(address, always(Unload))
    }
  , [ ...children
    , thunk
      ( 'devtools'
      , Devtools.view
      , model.devtools
      , forward(address, DevtoolsAction)
      )
    , thunk
      ( 'shell'
      , Shell.view
      , model.shell
      , forward(address, ShellAction)
      )
    ]
  );
