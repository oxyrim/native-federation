import type { Routes } from '@angular/router';
import type { MfeRouteConfig } from './mfe-config';
import { routeForConfig } from './integration';

const errorComponent = () => import('../pages/remote-error-page').then((m) => m.RemoteErrorPage);

/**
 * Turns the platform config into a complete Angular route table at runtime.
 * No MFE route is hardcoded in the shell — every entry is mapped to a route by
 * its integration strategy (see `integration.ts`). Remote modules are
 * referenced through lazy `loadChildren` / `loadComponent`, so they are fetched
 * only when their route is activated.
 */
export function buildRoutes(configs: readonly MfeRouteConfig[]): Routes {
  const routes: Routes = configs.map(routeForConfig);

  const home = configs.find((c) => c.routePath)?.routePath;
  if (home) {
    routes.unshift({ path: '', pathMatch: 'full', redirectTo: home });
    routes.push({ path: '**', redirectTo: home });
  } else {
    // No usable config — render a friendly error instead of a blank page.
    routes.push({ path: '**', loadComponent: errorComponent });
  }
  return routes;
}
