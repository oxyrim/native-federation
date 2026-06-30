import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withDisabledInitialNavigation,
} from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';

import { UP_DARK_MODE_SELECTOR } from '@loan/design-tokens';

import { UpPreset } from './theme/up-preset';
import { PlatformBootstrapService } from './core/platform-bootstrap.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),

    // Start with NO routes and defer the first navigation: the real route table
    // is built at runtime from the API config in the app initializer below.
    provideRouter([], withComponentInputBinding(), withDisabledInitialNavigation()),

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

    // Bootstrap: load the user, then the user's config, then build routes and
    // run the first navigation. See PlatformBootstrapService.
    provideAppInitializer(() => inject(PlatformBootstrapService).start()),
  ],
};
