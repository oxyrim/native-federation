import {
  ApplicationConfig,
  provideExperimentalZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';

import { UP_DARK_MODE_SELECTOR } from '@loan/design-tokens';

import { routes } from './app.routes';
import { UpPreset } from './theme/up-preset';

/**
 * Shared by BOTH bootstrap paths:
 *  - standalone dev on :4202 (bootstrapApplication)
 *  - web-component mode inside the shell (createApplication + createCustomElement)
 *
 * Zoneless on purpose: the Angular 21 shell is zoneless, so MFE2 must not
 * drag zone.js into the page and monkey-patch globals for everyone.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideExperimentalZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideAnimationsAsync(),
    providePrimeNG({
      ripple: true,
      theme: {
        preset: UpPreset,
        options: { darkModeSelector: UP_DARK_MODE_SELECTOR, cssLayer: false },
      },
    }),
  ],
};
