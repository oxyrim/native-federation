import { MfeRouteConfig } from './mfe-config';

/** Test helper: a route-table remote config with sensible defaults. */
export function routesMfe(overrides: Partial<MfeRouteConfig> = {}): MfeRouteConfig {
  return {
    elementId: '',
    appName: 'mfe1',
    displayName: 'Loan Pipeline',
    businessContext: ['Pipeline'],
    routePath: 'pipeline',
    mfeConfig: {
      remoteEntry: 'http://localhost:4201/remoteEntry.json',
      exposeModule: './routes',
      moduleName: 'PIPELINE_ROUTES',
    },
    ...overrides,
  };
}

/** Test helper: a web-component remote config. */
export function webComponentMfe(overrides: Partial<MfeRouteConfig> = {}): MfeRouteConfig {
  return {
    elementId: 'mfe2-analytics',
    appName: 'mfe2',
    displayName: 'Reports & Analytics',
    businessContext: ['Reports'],
    routePath: 'analytics',
    mfeConfig: {
      remoteEntry: 'http://localhost:4203/remoteEntry.json',
      exposeModule: './web-component',
      moduleName: 'registered',
    },
    ...overrides,
  };
}

/** Test helper: a shell-local page config. */
export function localMfe(overrides: Partial<MfeRouteConfig> = {}): MfeRouteConfig {
  return {
    elementId: '',
    appName: 'shell',
    displayName: 'Users',
    businessContext: ['Admin'],
    routePath: 'admin/users',
    mfeConfig: null,
    localComponent: 'users',
    ...overrides,
  };
}
