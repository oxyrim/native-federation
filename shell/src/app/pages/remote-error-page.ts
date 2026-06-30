import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CardModule } from 'primeng/card';
import { MfeRouteConfig } from '../core/mfe-config';
import { MfeRegistryService } from '../core/mfe-registry.service';

/**
 * Shown when a remote route fails to load, or when the platform config itself
 * could not be fetched (the catch-all route). Reads optional `data.mfe` to
 * name the failing area.
 */
@Component({
  selector: 'app-remote-error-page',
  imports: [CardModule],
  template: `
    <div class="p-4" style="max-width: 640px">
      <p-card>
        <div class="flex align-items-start gap-3">
          <i class="pi pi-exclamation-triangle text-2xl text-red-500"></i>
          <div>
            <strong class="text-lg">{{ title }}</strong>
            <p class="mt-2 mb-0 text-color-secondary">{{ detail }}</p>
          </div>
        </div>
      </p-card>
    </div>
  `,
})
export class RemoteErrorPage {
  private readonly mfe = inject(ActivatedRoute).snapshot.data['mfe'] as MfeRouteConfig | undefined;
  private readonly registry = inject(MfeRegistryService);

  protected readonly title = this.mfe
    ? `${this.mfe.displayName} is unavailable`
    : 'Platform unavailable';

  protected readonly detail =
    this.registry.loadError() ??
    (this.mfe
      ? `Could not load the "${this.mfe.appName}" remote. Check that it is running and that its remoteEntry URL is reachable.`
      : 'No microfrontends are configured. Check the platform configuration endpoint.');
}
