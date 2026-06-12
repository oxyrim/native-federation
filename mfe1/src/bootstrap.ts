import { bootstrapApplication } from '@angular/platform-browser';
import { initTheme } from '@loan/design-tokens';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Standalone dev only — inside the shell, the shell owns the theme.
initTheme();

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
