import { describe, expect, it } from 'vitest';
import { buildNav } from './nav';
import { localMfe, routesMfe, webComponentMfe } from './mfe-config.fixtures';

describe('buildNav', () => {
  it('creates one deduped group per unique businessContext, in config order', () => {
    const groups = buildNav([routesMfe(), webComponentMfe(), localMfe()]);
    expect(groups.map((g) => g.label)).toEqual(['Pipeline', 'Reports', 'Admin']);
  });

  it('places a config under every businessContext it lists', () => {
    const groups = buildNav([
      routesMfe({ businessContext: ['Pipeline', 'Favorites'] }),
    ]);
    expect(groups.map((g) => g.label)).toEqual(['Pipeline', 'Favorites']);
    expect(groups[0].items[0].link).toBe('/pipeline');
    expect(groups[1].items[0].link).toBe('/pipeline');
  });

  it('expands children into nav items with the index child marked exact', () => {
    const groups = buildNav([
      routesMfe({
        children: [
          { displayName: 'Loan Pipeline', routePath: '' },
          { displayName: 'Commitments', routePath: 'commitments' },
        ],
      }),
    ]);
    const items = groups[0].items;
    expect(items.map((i) => i.link)).toEqual(['/pipeline', '/pipeline/commitments']);
    expect(items[0].exact).toBe(true);
    expect(items[1].exact).toBe(false);
  });

  it('emits a single non-exact item when there are no children', () => {
    const [group] = buildNav([webComponentMfe()]);
    expect(group.items).toHaveLength(1);
    expect(group.items[0]).toMatchObject({ link: '/analytics', exact: false });
  });

  it('orders groups and items by the optional order weight', () => {
    const groups = buildNav([
      localMfe({ businessContext: ['Admin'], order: 30 }),
      routesMfe({ businessContext: ['Pipeline'], order: 10 }),
      webComponentMfe({ businessContext: ['Reports'], order: 20 }),
    ]);
    expect(groups.map((g) => g.label)).toEqual(['Pipeline', 'Reports', 'Admin']);
  });
});
