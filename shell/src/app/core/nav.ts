import type { MfeRouteConfig } from './mfe-config';

export interface NavItem {
  readonly label: string;
  readonly icon: string;
  /** Absolute router link, e.g. `/pipeline/commitments`. */
  readonly link: string;
  /** `routerLinkActiveOptions.exact` — true only for an index/leaf link. */
  readonly exact: boolean;
}

export interface NavGroup {
  readonly label: string;
  readonly items: NavItem[];
}

const DEFAULT_ICON = 'pi pi-circle-fill';
const DEFAULT_ORDER = Number.MAX_SAFE_INTEGER;

interface OrderedItem {
  readonly item: NavItem;
  readonly order: number;
  readonly seq: number;
}

/**
 * Builds the left-navigation model from the platform config:
 *  - every unique `businessContext` value becomes one group (deduped);
 *  - each config is placed under EVERY group it lists;
 *  - a config with `children` contributes one nav item per child (the child
 *    whose `routePath` is `""` is the parent's index route); a config without
 *    children contributes a single item;
 *  - groups and items are ordered by the optional `order` weight, falling back
 *    to config order — so the menu is deterministic as MFEs scale. When no
 *    `order` is set anywhere, the result is plain config order.
 */
export function buildNav(configs: readonly MfeRouteConfig[]): NavGroup[] {
  const groups = new Map<string, OrderedItem[]>();
  const groupOrder = new Map<string, number>();
  const groupSeq = new Map<string, number>();
  let seq = 0;

  configs.forEach((cfg, cfgIndex) => {
    const order = cfg.order ?? DEFAULT_ORDER;
    const items = toNavItems(cfg);

    for (const context of cfg.businessContext) {
      if (!groups.has(context)) {
        groups.set(context, []);
        groupOrder.set(context, order);
        groupSeq.set(context, cfgIndex);
      } else {
        // A group inherits the smallest order among its members.
        groupOrder.set(context, Math.min(groupOrder.get(context)!, order));
      }
      const bucket = groups.get(context)!;
      for (const item of items) bucket.push({ item, order, seq: seq++ });
    }
  });

  return [...groups.keys()]
    .sort((a, b) => groupOrder.get(a)! - groupOrder.get(b)! || groupSeq.get(a)! - groupSeq.get(b)!)
    .map((label) => ({
      label,
      items: groups
        .get(label)!
        .sort((a, b) => a.order - b.order || a.seq - b.seq)
        .map((o) => o.item),
    }));
}

function toNavItems(cfg: MfeRouteConfig): NavItem[] {
  const base = '/' + cfg.routePath;

  if (cfg.children && cfg.children.length > 0) {
    return cfg.children.map((child) => ({
      label: child.displayName,
      icon: child.icon ?? cfg.icon ?? DEFAULT_ICON,
      link: child.routePath ? `${base}/${child.routePath}` : base,
      // The index child (routePath "") must match exactly, otherwise it would
      // stay highlighted on every nested route.
      exact: child.routePath === '',
    }));
  }

  return [{ label: cfg.displayName, icon: cfg.icon ?? DEFAULT_ICON, link: base, exact: false }];
}
