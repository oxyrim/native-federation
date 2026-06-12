import { Routes } from '@angular/router';

/**
 * EXPOSED via native federation as './routes'.
 * MFE1 owns everything below /pipeline — the shell only knows the prefix.
 */
export const PIPELINE_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./pages/loan-pipeline/loan-pipeline-page').then((m) => m.LoanPipelinePage),
  },
  {
    path: 'commitments',
    loadComponent: () =>
      import('./pages/commitments-page').then((m) => m.CommitmentsPage),
  },
  {
    path: 'pricing',
    loadComponent: () =>
      import('./pages/pricing-results-page').then((m) => m.PricingResultsPage),
  },
  {
    path: 'loans/:id',
    loadComponent: () =>
      import('./pages/loan-detail-page').then((m) => m.LoanDetailPage),
  },
  { path: '**', redirectTo: '' },
];
