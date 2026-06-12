const { withNativeFederation, shareAll } = require('@angular-architects/native-federation/config');

module.exports = withNativeFederation({

  name: 'mfe2',

  exposes: {
    // Angular 19 remote exposed as a WEB COMPONENT. The shell (Angular 21)
    // cannot share @angular/* with this remote (different majors), so the
    // boundary is a custom element + the framework-agnostic @loan/bridge.
    './web-component': './src/app/web-component.ts',
  },

  shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
  },

  skip: [
    'primeicons',
    // Theme presets are imported via deep subpaths (@primeng/themes/aura/...)
    // that the import map cannot resolve — bundle them instead of sharing.
    /^@primeng\/themes/,
    'rxjs/ajax',
    'rxjs/fetch',
    'rxjs/testing',
    'rxjs/webSocket',
    // Add further packages you don't need at runtime
  ]

  // Please read our FAQ about sharing libs:
  // https://shorturl.at/jmzH0
  
});
