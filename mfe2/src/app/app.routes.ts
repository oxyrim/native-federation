import { Routes } from '@angular/router';
import { Component } from '@angular/core';

/** Swallows URLs owned by other MFEs while this app is alive but hidden. */
@Component({ standalone: true, template: '' })
export class NoopComponent {}

/**
 * MFE2's INTERNAL route table. The shell only knows the '/analytics' prefix;
 * everything below it is private to this Angular 19 application and is
 * resolved by MFE2's own router instance running inside the web component.
 */
export const routes: Routes = [
  {
    path: 'analytics',
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./pages/dashboard-page.component').then((m) => m.DashboardPageComponent),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./pages/reports-page.component').then((m) => m.ReportsPageComponent),
      },
      {
        path: 'quality',
        loadComponent: () =>
          import('./pages/quality-page.component').then((m) => m.QualityPageComponent),
      },
      {
        path: 'activity',
        loadComponent: () =>
          import('./pages/activity-page.component').then((m) => m.ActivityPageComponent),
      },
    ],
  },
  // Standalone dev entry: '/' should land on the dashboard.
  { path: '', pathMatch: 'full', redirectTo: 'analytics' },
  // Any URL owned by the shell or MFE1 — render nothing, do not error.
  { path: '**', component: NoopComponent },
];
