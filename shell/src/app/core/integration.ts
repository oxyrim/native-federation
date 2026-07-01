import type { Route, Routes, UrlMatcher, UrlSegment } from '@angular/router';
import type { MfeKind, MfeRouteConfig } from './mfe-config';
import { LOCAL_COMPONENTS, resolveMfeKind } from './mfe-config';
import { loadExposedModule } from './remote-loader';

/**
 * One way of integrating an MFE into the shell's route table. Adding a NEW kind
 * of integration (e.g. an iframe host, or a server-driven page) means writing
 * one strategy and registering it in {@link INTEGRATION_STRATEGIES} — nothing
 * else in the pipeline changes. Adding a new *instance* of an existing kind is
 * a config entry only.
 */
export interface MfeIntegrationStrategy {
  readonly kind: MfeKind;
  /** Build the Angular route for one config entry of this kind. */
  buildRoute(cfg: MfeRouteConfig): Route;
}

/** Lazy loader for the shared error page (used as a per-MFE fallback). */
const errorComponent = () => import('../pages/remote-error-page').then((m) => m.RemoteErrorPage);

/**
 * Matches every URL starting with `prefix` and consumes ALL segments — a
 * web-component remote runs its own router that interprets the rest of the URL.
 */
export function startsWith(prefix: string): UrlMatcher {
  return (url: UrlSegment[]) => (url[0]?.path === prefix ? { consumed: url } : null);
}

/** Route-table remote: load the exposed `Routes` array as lazy child routes. */
const routesStrategy: MfeIntegrationStrategy = {
  kind: 'routes',
  buildRoute(cfg) {
    const federation = cfg.mfeConfig!;
    return {
      path: cfg.routePath,
      loadChildren: () =>
        loadExposedModule<Record<string, Routes>>(cfg.appName, federation)
          .then((module) => {
            const remoteRoutes = module[federation.moduleName];
            if (!Array.isArray(remoteRoutes)) {
              throw new Error(
                `exposed module "${federation.exposeModule}" of "${cfg.appName}" has no Routes export named "${federation.moduleName}"`,
              );
            }
            return remoteRoutes;
          })
          .catch((err) => {
            console.error(`[shell] failed to load remote routes for "${cfg.appName}"`, err);
            // Isolate the failure: this MFE shows an error page; the rest of the
            // platform keeps working.
            return [{ path: '**', loadComponent: errorComponent, data: { mfe: cfg } }] as Routes;
          }),
    };
  },
};

/** Web-component remote: match all sub-segments and mount the generic host. */
const webComponentStrategy: MfeIntegrationStrategy = {
  kind: 'web-component',
  buildRoute(cfg) {
    return {
      matcher: startsWith(cfg.routePath),
      loadComponent: () =>
        import('../remotes/remote-web-component-host').then((m) => m.RemoteWebComponentHost),
      data: { mfe: cfg },
    };
  },
};

/** Shell-local page: a component that ships with the shell. */
const localStrategy: MfeIntegrationStrategy = {
  kind: 'local',
  buildRoute(cfg) {
    const loader = LOCAL_COMPONENTS[cfg.localComponent ?? ''];
    // Validation guarantees the key exists, but guard for safety.
    return { path: cfg.routePath, loadComponent: loader ?? errorComponent };
  },
};

export const INTEGRATION_STRATEGIES: Record<MfeKind, MfeIntegrationStrategy> = {
  routes: routesStrategy,
  'web-component': webComponentStrategy,
  local: localStrategy,
};

/** Build the Angular route for a single config entry via its integration kind. */
export function routeForConfig(cfg: MfeRouteConfig): Route {
  return INTEGRATION_STRATEGIES[resolveMfeKind(cfg)].buildRoute(cfg);
}
