import { describe, expect, it, vi } from 'vitest';
import { isEntitled, normalizeRoutePath, resolveMfeKind, validateConfigs } from './mfe-config';
import { localMfe, routesMfe, webComponentMfe } from './mfe-config.fixtures';

describe('resolveMfeKind', () => {
  it('classifies a route-table remote', () => {
    expect(resolveMfeKind(routesMfe())).toBe('routes');
  });
  it('classifies a web-component remote', () => {
    expect(resolveMfeKind(webComponentMfe())).toBe('web-component');
  });
  it('classifies a shell-local page', () => {
    expect(resolveMfeKind(localMfe())).toBe('local');
  });
});

describe('normalizeRoutePath', () => {
  it('strips leading/trailing slashes and whitespace', () => {
    expect(normalizeRoutePath(' /pipeline/ ')).toBe('pipeline');
    expect(normalizeRoutePath('admin/users')).toBe('admin/users');
    expect(normalizeRoutePath('')).toBe('');
  });
});

describe('isEntitled', () => {
  it('allows everyone when roles is absent or empty', () => {
    expect(isEntitled(routesMfe(), 'trader')).toBe(true);
    expect(isEntitled(routesMfe({ roles: [] }), 'trader')).toBe(true);
  });
  it('allows a matching role and denies others', () => {
    expect(isEntitled(localMfe({ roles: ['admin'] }), 'admin')).toBe(true);
    expect(isEntitled(localMfe({ roles: ['admin'] }), 'trader')).toBe(false);
  });
});

describe('validateConfigs', () => {
  it('returns [] for non-array input', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(validateConfigs(null)).toEqual([]);
    expect(validateConfigs({})).toEqual([]);
  });

  it('keeps valid entries of every kind', () => {
    const result = validateConfigs([routesMfe(), webComponentMfe(), localMfe()]);
    expect(result).toHaveLength(3);
  });

  it('drops entries missing required fields', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = validateConfigs([
      routesMfe(),
      { ...routesMfe({ routePath: 'x' }), displayName: '' },
      { ...routesMfe({ routePath: 'y' }), businessContext: [] },
    ]);
    expect(result.map((c) => c.appName)).toEqual(['mfe1']);
  });

  it('drops a route-table remote with no moduleName', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const bad = routesMfe({
      routePath: 'z',
      mfeConfig: { remoteEntry: 'http://x/r.json', exposeModule: './routes', moduleName: '' },
    });
    expect(validateConfigs([bad])).toEqual([]);
  });

  it('drops a local page with an unknown component key', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(validateConfigs([localMfe({ localComponent: 'does-not-exist' })])).toEqual([]);
  });

  it('normalizes routePath on the way through', () => {
    const [cfg] = validateConfigs([routesMfe({ routePath: '/pipeline/' })]);
    expect(cfg.routePath).toBe('pipeline');
  });

  it('drops a later entry that collides on routePath', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = validateConfigs([
      routesMfe({ appName: 'first', routePath: 'shared' }),
      webComponentMfe({ appName: 'second', routePath: '/shared/' }),
    ]);
    expect(result.map((c) => c.appName)).toEqual(['first']);
  });
});
