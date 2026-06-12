import { bootstrapApplication } from '@angular/platform-browser';
import { initTheme } from '@loan/design-tokens';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Standalone dev only — inside the shell, the shell owns the theme.
initTheme();

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
