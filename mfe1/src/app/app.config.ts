import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { providePrimeNG } from 'primeng/config';

import { UP_DARK_MODE_SELECTOR } from '@loan/design-tokens';

import { routes } from './app.routes';
import { UpPreset } from './theme/up-preset';

/** Standalone-dev config — when MFE1 runs on :4201 outside the shell. */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    providePrimeNG({
      ripple: true,
      theme: {
        preset: UpPreset,
        options: { darkModeSelector: UP_DARK_MODE_SELECTOR, cssLayer: false },
      },
    }),
  ],
};
