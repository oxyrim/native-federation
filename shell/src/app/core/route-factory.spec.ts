import { describe, expect, it } from 'vitest';
import { buildRoutes } from './route-factory';
import { localMfe, routesMfe, webComponentMfe } from './mfe-config.fixtures';

describe('buildRoutes', () => {
  it('renders an error catch-all when there is no config', () => {
    const routes = buildRoutes([]);
    expect(routes).toHaveLength(1);
    expect(routes[0].path).toBe('**');
    expect(routes[0].loadComponent).toBeTypeOf('function');
    expect(routes[0].redirectTo).toBeUndefined();
  });

  it('adds a home redirect and a wildcard redirect around the MFE routes', () => {
    const routes = buildRoutes([routesMfe()]);
    expect(routes[0]).toMatchObject({ path: '', pathMatch: 'full', redirectTo: 'pipeline' });
    expect(routes[routes.length - 1]).toMatchObject({ path: '**', redirectTo: 'pipeline' });
  });

  it('maps a route-table remote to a lazy loadChildren route', () => {
    const [, route] = buildRoutes([routesMfe()]);
    expect(route.path).toBe('pipeline');
    expect(route.loadChildren).toBeTypeOf('function');
  });

  it('maps a web-component remote to a matcher + host with config in data', () => {
    const [, route] = buildRoutes([webComponentMfe()]);
    expect(route.matcher).toBeTypeOf('function');
    expect(route.loadComponent).toBeTypeOf('function');
    expect(route.data?.['mfe']).toMatchObject({ appName: 'mfe2', elementId: 'mfe2-analytics' });
  });

  it('maps a shell-local page to a loadComponent route at its path', () => {
    const [, route] = buildRoutes([localMfe()]);
    expect(route.path).toBe('admin/users');
    expect(route.loadComponent).toBeTypeOf('function');
  });

  it('produces one route per config plus the two redirects', () => {
    const routes = buildRoutes([routesMfe(), webComponentMfe(), localMfe()]);
    expect(routes).toHaveLength(3 + 2);
  });
});
