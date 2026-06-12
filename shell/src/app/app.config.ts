import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { providePrimeNG } from 'primeng/config';

import { UP_DARK_MODE_SELECTOR } from '@loan/design-tokens';

import { routes } from './app.routes';
import { UpPreset } from './theme/up-preset';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    providePrimeNG({
      ripple: true,
      theme: {
        preset: UpPreset,
        options: {
          // One attribute on <html> switches tokens.css, PrimeNG 21 (here)
          // and PrimeNG 19 (inside the mfe2 web component) together.
          darkModeSelector: UP_DARK_MODE_SELECTOR,
          cssLayer: false,
        },
      },
    }),
  ],
};
