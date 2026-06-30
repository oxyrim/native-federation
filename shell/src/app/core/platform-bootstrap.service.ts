import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { UserApiService } from './api/user-api.service';
import { MfeRegistryService } from './mfe-registry.service';
import { ShellBridgeService } from './bridge.service';

/**
 * Orchestrates the shell's startup as a production-shaped, dependent sequence:
 *
 *   1. authenticate / load the current user        (user API)
 *   2. publish the user on the bridge for the MFEs  (session/user)
 *   3. load THAT user's platform config             (config API — depends on 1)
 *   4. build the route table from the config and run the first navigation
 *
 * Run from `provideAppInitializer`, so the first navigation only happens once
 * routes exist. Initial navigation is deferred via `withDisabledInitialNavigation`.
 */
@Injectable({ providedIn: 'root' })
export class PlatformBootstrapService {
  private readonly userApi = inject(UserApiService);
  private readonly registry = inject(MfeRegistryService);
  private readonly bridge = inject(ShellBridgeService);
  private readonly router = inject(Router);

  async start(): Promise<void> {
    try {
      // 1 + 2 — who is the user? Publish it so MFEs receive session context.
      const user = await firstValueFrom(this.userApi.getCurrentUser());
      this.bridge.setUser(user);

      // 3 + 4 — load the config scoped to that user, then build routes.
      await this.registry.loadFor(user);
    } catch (err) {
      // A failed user lookup is fatal to bootstrap — degrade to an error page
      // rather than a blank screen.
      console.error('[shell] platform bootstrap failed', err);
      this.registry.setFatal('Could not start the platform. Please sign in again.');
      this.router.resetConfig([
        { path: '**', loadComponent: () => import('../pages/remote-error-page').then((m) => m.RemoteErrorPage) },
      ]);
    } finally {
      await this.router.initialNavigation();
    }
  }
}
