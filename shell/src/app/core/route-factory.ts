import { Route, Routes, UrlMatcher, UrlSegment } from '@angular/router';
import { loadRemoteModule } from '@angular-architects/native-federation';
import { LOCAL_COMPONENTS, MfeRouteConfig } from './mfe-config';

/**
 * Matches every URL starting with `prefix` and consumes ALL segments — a
 * web-component remote runs its own router that interprets the rest of the URL.
 */
export function startsWith(prefix: string): UrlMatcher {
  return (url: UrlSegment[]) => (url[0]?.path === prefix ? { consumed: url } : null);
}

const errorComponent = () => import('../pages/remote-error-page').then((m) => m.RemoteErrorPage);

/**
 * Turns the platform config into a complete Angular route table at runtime.
 * No MFE route is hardcoded in the shell — everything here is derived from the
 * API response. Remote modules are referenced through lazy `loadChildren` /
 * `loadComponent`, so they are fetched only when their route is activated.
 */
export function buildRoutes(configs: readonly MfeRouteConfig[]): Routes {
  const routes: Routes = [];
  for (const cfg of configs) {
    const route = toRoute(cfg);
    if (route) routes.push(route);
  }

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

function toRoute(cfg: MfeRouteConfig): Route | null {
  // 1) Shell-local page (mfeConfig === null).
  if (cfg.mfeConfig === null) {
    const loader = LOCAL_COMPONENTS[cfg.localComponent ?? ''];
    if (!loader) {
      console.error(`[shell] no local component "${cfg.localComponent}" for ${cfg.routePath}`);
      return null;
    }
    return { path: cfg.routePath, loadComponent: loader };
  }

  const { remoteEntry, exposeModule, moduleName } = cfg.mfeConfig;

  // 2) Web-component remote (its own internal router) — match all sub-segments
  //    and render the generic host, passing the config through route data.
  if (cfg.elementId) {
    return {
      matcher: startsWith(cfg.routePath),
      loadComponent: () =>
        import('../remotes/remote-web-component-host').then((m) => m.RemoteWebComponentHost),
      data: { mfe: cfg },
    };
  }

  // 3) Route-table remote — load lazily and splice in its exposed Routes.
  return {
    path: cfg.routePath,
    loadChildren: () =>
      loadRemoteModule<Record<string, Routes>>({
        remoteEntry,
        remoteName: cfg.appName,
        exposedModule: exposeModule,
      })
        .then((module) => {
          const remoteRoutes = module[moduleName];
          if (!Array.isArray(remoteRoutes)) {
            throw new Error(
              `exposed module "${exposeModule}" of "${cfg.appName}" has no Routes export named "${moduleName}"`,
            );
          }
          return remoteRoutes;
        })
        .catch((err) => {
          console.error(`[shell] failed to load remote routes for "${cfg.appName}"`, err);
          // Keep the route alive with an error page rather than crashing nav.
          return [{ path: '**', loadComponent: errorComponent, data: { mfe: cfg } }] as Routes;
        }),
  };
}
