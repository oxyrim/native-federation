import { Routes, UrlMatcher, UrlSegment } from '@angular/router';
import { loadRemoteModule } from '@angular-architects/native-federation';

/**
 * Matches every URL that starts with the given prefix and consumes ALL
 * segments — the web-component remote runs its own Angular 19 router that
 * interprets the rest of the URL internally.
 */
export function startsWith(prefix: string): UrlMatcher {
  return (url: UrlSegment[]) => (url[0]?.path === prefix ? { consumed: url } : null);
}

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'pipeline' },

  // MFE1 — Angular 21 remote, loaded as ordinary lazy routes (shared framework).
  {
    path: 'pipeline',
    loadChildren: () =>
      loadRemoteModule('mfe1', './routes').then((m) => m.PIPELINE_ROUTES),
  },

  // MFE2 — Angular 19 remote wrapped in a web component with its OWN router.
  {
    matcher: startsWith('analytics'),
    loadComponent: () =>
      import('./remotes/analytics-host').then((m) => m.AnalyticsHost),
  },

  {
    path: 'admin',
    children: [
      {
        path: 'users',
        loadComponent: () => import('./pages/users-page').then((m) => m.UsersPage),
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings-page').then((m) => m.SettingsPage),
      },
      { path: '', pathMatch: 'full', redirectTo: 'users' },
    ],
  },

  { path: '**', redirectTo: 'pipeline' },
];
