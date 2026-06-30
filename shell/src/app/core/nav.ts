import { MfeRouteConfig } from './mfe-config';

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

/**
 * Builds the left-navigation model from the platform config:
 *  - every unique `businessContext` value becomes one group (deduped, in
 *    first-seen order);
 *  - each config is placed under EVERY group it lists;
 *  - a config with `children` contributes one nav item per child (the child
 *    whose `routePath` is `""` is the parent's index route); a config without
 *    children contributes a single item.
 */
export function buildNav(configs: readonly MfeRouteConfig[]): NavGroup[] {
  const order: string[] = [];
  const byContext = new Map<string, NavItem[]>();

  for (const cfg of configs) {
    const items = toNavItems(cfg);
    for (const context of cfg.businessContext) {
      let bucket = byContext.get(context);
      if (!bucket) {
        bucket = [];
        byContext.set(context, bucket);
        order.push(context);
      }
      bucket.push(...items);
    }
  }

  return order.map((label) => ({ label, items: byContext.get(label)! }));
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
