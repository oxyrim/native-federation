import { createApplication } from '@angular/platform-browser';
import { ApplicationRef } from '@angular/core';
import { createCustomElement } from '@angular/elements';

import { appConfig } from './app.config';
import { AppComponent } from './app.component';

/**
 * EXPOSED via native federation as './web-component'.
 *
 * Importing this module has exactly one side effect: it registers the
 * <mfe2-analytics> custom element backed by a private Angular 19 platform.
 * The shell (Angular 21) never sees Angular 19 APIs — the DOM element IS
 * the integration contract. Data flows exclusively through @loan/bridge.
 */
let appRefPromise: Promise<ApplicationRef> | null = null;

function ensureRegistered(): Promise<ApplicationRef> {
  if (!appRefPromise) {
    appRefPromise = createApplication(appConfig).then((appRef) => {
      if (!customElements.get('mfe2-analytics')) {
        const element = createCustomElement(AppComponent, { injector: appRef.injector });
        customElements.define('mfe2-analytics', element);
      }
      return appRef;
    });
  }
  return appRefPromise;
}

export const registered = ensureRegistered();
