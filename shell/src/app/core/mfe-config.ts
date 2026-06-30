import { Type } from '@angular/core';

/**
 * Shape of one entry in the platform configuration returned by the API
 * (`GET mfe-config.json` in this POC). The shell builds ALL of its routing and
 * left-navigation from an array of these — there are no hardcoded routes,
 * remotes or menu items in the shell.
 *
 * Adding / removing / re-pathing a microfrontend is a config change only.
 */
export interface MfeRouteConfig {
  /**
   * Custom-element tag for a **web-component** remote (e.g. `"mfe2-analytics"`).
   * Empty string ⇒ the remote exposes an Angular `Routes` table instead (it is
   * loaded as ordinary lazy child routes). This is the discriminator between
   * the two integration styles.
   */
  readonly elementId: string;

  /** Remote name (used as the federation remote key). */
  readonly appName: string;

  /** Human label shown in the left nav. */
  readonly displayName: string;

  /**
   * Parent menu group(s). An app may appear under several groups — every
   * unique value across all configs becomes one (deduped) nav section.
   */
  readonly businessContext: readonly string[];

  /** Angular route path this app mounts at (e.g. `"pipeline"`, `"admin/users"`). */
  readonly routePath: string;

  /**
   * PROPOSED ADDITION: roles allowed to see/use this app. Absent or empty ⇒
   * available to everyone. The config API is expected to scope by identity
   * server-side; the shell re-checks this client-side as defence-in-depth.
   */
  readonly roles?: readonly string[];

  /**
   * PROPOSED ADDITION (not in the original API contract): optional PrimeIcons
   * class for the nav item. Purely cosmetic; falls back to a generic icon.
   */
  readonly icon?: string;

  /**
   * Federation coordinates. `null` marks a **shell-local** page (not a remote)
   * — see {@link localComponent}. This keeps locally-owned pages (Users,
   * Settings) flowing through the same config-driven routing/nav pipeline.
   */
  readonly mfeConfig: {
    readonly remoteEntry: string;
    readonly exposeModule: string;
    readonly moduleName: string;
  } | null;

  /**
   * PROPOSED ADDITION: when {@link mfeConfig} is `null`, the key of a
   * shell-owned component in {@link LOCAL_COMPONENTS}. The component code
   * necessarily lives in the shell, but its route + nav placement is still
   * 100% config-driven.
   */
  readonly localComponent?: string;

  /**
   * PROPOSED ADDITION (Requirement 4): internal sub-routes of a remote that
   * should appear as their own left-nav items. The remote owns the actual
   * routing for these (e.g. mfe1's `/pipeline/**` route table); these entries
   * are nav-only. `routePath` is RELATIVE to the parent's `routePath`
   * (`""` = the parent's index route).
   */
  readonly children?: readonly MfeNavChild[];
}

export interface MfeNavChild {
  readonly displayName: string;
  readonly routePath: string;
  readonly icon?: string;
}

/**
 * Registry of shell-owned page components, keyed by {@link MfeRouteConfig.localComponent}.
 * This is the one necessary binding for local pages: their code lives in the
 * shell, so they can't be fetched as remotes — but the config still decides
 * their path and menu position. Adding a *remote* needs no change here.
 */
export const LOCAL_COMPONENTS: Record<string, () => Promise<Type<unknown>>> = {
  users: () => import('../pages/users-page').then((m) => m.UsersPage),
  settings: () => import('../pages/settings-page').then((m) => m.SettingsPage),
};

/** True when `role` may access this app (no `roles` ⇒ unrestricted). */
export function isEntitled(cfg: MfeRouteConfig, role: string): boolean {
  return !Array.isArray(cfg.roles) || cfg.roles.length === 0 || cfg.roles.includes(role);
}

/** Narrow + drop invalid entries so one bad config can't break the whole shell. */
export function validateConfigs(raw: unknown): MfeRouteConfig[] {
  if (!Array.isArray(raw)) {
    console.error('[shell] platform config is not an array — got', raw);
    return [];
  }
  const valid: MfeRouteConfig[] = [];
  raw.forEach((entry, i) => {
    const problem = configProblem(entry);
    if (problem) {
      console.error(`[shell] dropping invalid MFE config at index ${i}: ${problem}`, entry);
      return;
    }
    valid.push(entry as MfeRouteConfig);
  });
  return valid;
}

/** Returns a human-readable reason the entry is invalid, or `null` if it's OK. */
function configProblem(c: unknown): string | null {
  if (!c || typeof c !== 'object') return 'not an object';
  const cfg = c as Record<string, unknown>;

  if (typeof cfg['displayName'] !== 'string' || !cfg['displayName']) return 'missing displayName';
  if (typeof cfg['routePath'] !== 'string') return 'missing routePath';
  if (!Array.isArray(cfg['businessContext']) || cfg['businessContext'].length === 0)
    return 'businessContext must be a non-empty array';

  // Shell-local page.
  if (cfg['mfeConfig'] === null) {
    const key = cfg['localComponent'];
    if (typeof key !== 'string' || !(key in LOCAL_COMPONENTS))
      return `local page needs a known "localComponent" (got ${String(key)})`;
    return null;
  }

  // Remote.
  const m = cfg['mfeConfig'];
  if (!m || typeof m !== 'object') return 'mfeConfig must be an object or null';
  const mfe = m as Record<string, unknown>;
  if (typeof mfe['remoteEntry'] !== 'string' || !mfe['remoteEntry']) return 'mfeConfig.remoteEntry missing';
  if (typeof mfe['exposeModule'] !== 'string' || !mfe['exposeModule']) return 'mfeConfig.exposeModule missing';

  // Web-component remotes are keyed by elementId; route-table remotes by moduleName.
  if (typeof cfg['elementId'] === 'string' && cfg['elementId']) return null;
  if (typeof mfe['moduleName'] !== 'string' || !mfe['moduleName'])
    return 'route-table remote needs mfeConfig.moduleName (or set elementId for a web component)';
  return null;
}
