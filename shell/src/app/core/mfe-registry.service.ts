import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { UserContextChanged } from '@loan/bridge';
import { MfeRouteConfig, isEntitled, validateConfigs } from './mfe-config';
import { NavGroup, buildNav } from './nav';
import { buildRoutes } from './route-factory';
import { MfeConfigApiService } from './api/mfe-config-api.service';

/**
 * State holder for the dynamically-configured platform. Calls the config API
 * (scoped to the current user), validates + filters the response, then drives
 * BOTH the router table and the left-nav model from it.
 *
 * The startup sequence (user API → config API → routes) is orchestrated by
 * PlatformBootstrapService; this service owns the config → state/routes step.
 */
@Injectable({ providedIn: 'root' })
export class MfeRegistryService {
  private readonly configApi = inject(MfeConfigApiService);
  private readonly router = inject(Router);

  private readonly _configs = signal<MfeRouteConfig[]>([]);
  readonly configs = this._configs.asReadonly();

  /** Nav recomputes automatically whenever the config changes. */
  readonly navGroups = computed<NavGroup[]>(() => buildNav(this._configs()));

  /** Non-null when the config could not be loaded / is empty. */
  readonly loadError = signal<string | null>(null);

  /**
   * Fetch the user-scoped config, apply it to the router, and return it.
   * Resilient: on failure it sets `loadError` and applies an empty table so the
   * shell renders an error page instead of a blank screen.
   */
  async loadFor(user: UserContextChanged): Promise<MfeRouteConfig[]> {
    const configs = await this.fetch(user);
    this.router.resetConfig(buildRoutes(configs));
    return configs;
  }

  /** Runtime refresh for the same user — re-applies routes + nav, no page reload. */
  async reload(user: UserContextChanged): Promise<void> {
    await this.loadFor(user);
  }

  /** Record a fatal startup error (e.g. the user API failed) for the error page. */
  setFatal(message: string): void {
    this._configs.set([]);
    this.loadError.set(message);
  }

  private async fetch(user: UserContextChanged): Promise<MfeRouteConfig[]> {
    try {
      const raw = await firstValueFrom(this.configApi.getConfig(user));
      const entitled = validateConfigs(raw).filter((c) => isEntitled(c, user.role));
      this._configs.set(entitled);
      this.loadError.set(
        entitled.length === 0 ? 'No microfrontends are available for your account.' : null,
      );
      return entitled;
    } catch (err) {
      console.error('[shell] failed to load platform configuration', err);
      this.loadError.set('Could not load platform configuration.');
      this._configs.set([]);
      return [];
    }
  }
}
