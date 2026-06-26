const { withNativeFederation, shareAll } = require('@angular-architects/native-federation/config');

module.exports = withNativeFederation({
  name: 'shell',

  shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
  },

  skip: [
    // Theme presets are imported via deep subpaths (@primeuix/themes/aura/...)
    // that the import map cannot resolve — bundle them instead of sharing.
    /^@primeuix\/themes/,
    // PrimeFlex is a CSS-only utility lib (loaded via angular.json styles);
    // it has no JS entry point, so federation must not try to share it.
    'primeflex',
    'rxjs/ajax',
    'rxjs/fetch',
    'rxjs/testing',
    'rxjs/webSocket',
    // Add further packages you don't need at runtime
  ],

  // Please read our FAQ about sharing libs:
  // https://shorturl.at/jmzH0

  features: {
    // New feature for more performance and avoiding
    // issues with node libs. Comment this out to
    // get the traditional behavior:
    ignoreUnusedDeps: true,
  },
});
