/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define((require, exports, module) => {
  'use strict';

  const {expandCustomTheme} = require('../theme.js');

  // Like `array.reduce` but for objects.
  const reducekv = (object, step, value) => {
    for (let key of Object.keys(object)) {
      value = step(value, key, object[key]);
    }
    return value;
  }

  const hardcodedThemes = {
    'default': {
      navigation: {
        backgroundColor: '#222',
        forgroundColor: '#fff',
        isDark: true,
      },
      wallpaper: {
        backgroundColor: '#222',
        forgroundColor: '#fff',
        posterImage: null
      }
    }
  };

  // Returns an object that can be used to patch `immutableState.dashboard` via
  // `merge`. We happen to use the same datastructure for our hardcoded themes.
  // If that changes, change this function.
  const getDashboardThemePatch = key => {
    const theme = hardcodedThemes[key] ?
      hardcodedThemes[key] : hardcodedThemes.default;
    const navigation = Object.assign({}, theme.navigation);
    const wallpaper = Object.assign({}, theme.wallpaper);
    return {navigation, wallpaper};
  }

  // Use to initialize wallpaper in `immutableState`.
  const init = options => Object.assign(
    getDashboardThemePatch('default'),
    options
  );

  const stepSwatch = (array, key, theme) => {
    array.push({key: key, backgroundColor: theme.wallpaper.backgroundColor});
    return array;
  }

  // Returns array of swatch objects, each representing a wallpaper.
  // Used for the wallpaper picker swatches.
  const getWallpaperSwatches = () => reducekv(hardcodedThemes, stepSwatch, []);

  // Returns a style object to be applied to Dashboard.
  const readDashboardTheme = (dashboard) => {
    const wallpaper = dashboard.get('wallpaper');
    const backgroundColor = wallpaper.get('backgroundColor');
    const backgroundImage = wallpaper.get('posterImage') || 'none';
    const forgroundColor = wallpaper.get('forgroundColor');
    return {
      backgroundColor,
      backgroundImage: `url(${backgroundImage})`,
      color: forgroundColor
    };
  }

  const readDashboardNavigationTheme = dashboard => {
    const navigation = dashboard.get('navigation');
    return expandCustomTheme(
      navigation.get('forgroundColor'),
      navigation.get('backgroundColor'),
      navigation.get('isDark')
    );
  }

  // Exports:

  exports.getDashboardThemePatch = getDashboardThemePatch;
  exports.getWallpaperSwatches = getWallpaperSwatches;
  exports.readDashboardTheme = readDashboardTheme;
  exports.readDashboardNavigationTheme = readDashboardNavigationTheme;
  exports.init = init;

});
