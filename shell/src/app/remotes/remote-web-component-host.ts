import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { loadRemoteModule } from '@angular-architects/native-federation';
import { CardModule } from 'primeng/card';
import { MfeRouteConfig } from '../core/mfe-config';

/**
 * Generic host for ANY web-component remote. Reads the MFE config from the
 * route's `data.mfe`, loads the remote module (which registers the custom
 * element), then mounts `<elementId>`. The shell never touches the remote's
 * framework internals — the custom element is the entire contract.
 */
@Component({
  selector: 'app-remote-web-component-host',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CardModule],
  template: `
    @if (error()) {
      <div class="p-4">
        <p-card>
          <div class="flex align-items-center gap-3 text-red-500">
            <i class="pi pi-exclamation-triangle text-2xl"></i>
            <div>
              <strong>{{ mfe?.displayName ?? 'This area' }} is unavailable.</strong>
              <p class="mt-1 mb-0 text-color-secondary text-sm">{{ error() }}</p>
            </div>
          </div>
        </p-card>
      </div>
    } @else if (!loaded()) {
      <div class="p-4 text-color-secondary">Loading {{ mfe?.displayName ?? 'module' }}…</div>
    }
    <div #host style="display: block; height: 100%"></div>
  `,
})
export class RemoteWebComponentHost implements OnInit, OnDestroy {
  @ViewChild('host', { static: true }) hostRef!: ElementRef<HTMLDivElement>;

  protected readonly mfe = inject(ActivatedRoute).snapshot.data['mfe'] as MfeRouteConfig | undefined;
  protected readonly loaded = signal(false);
  protected readonly error = signal<string | null>(null);
  private element: HTMLElement | null = null;

  async ngOnInit(): Promise<void> {
    const mfe = this.mfe;
    if (!mfe?.mfeConfig || !mfe.elementId) {
      this.error.set('Invalid web-component configuration.');
      return;
    }

    try {
      const module = await loadRemoteModule<Record<string, unknown>>({
        remoteEntry: mfe.mfeConfig.remoteEntry,
        remoteName: mfe.appName,
        exposedModule: mfe.mfeConfig.exposeModule,
      });

      // The exposed module registers the element as a side effect; if it also
      // exports a registration promise (moduleName), await it before mounting.
      const registration = mfe.mfeConfig.moduleName ? module[mfe.mfeConfig.moduleName] : undefined;
      if (registration && typeof (registration as PromiseLike<unknown>).then === 'function') {
        await registration;
      }
      await customElements.whenDefined(mfe.elementId);

      this.element = document.createElement(mfe.elementId);
      this.hostRef.nativeElement.appendChild(this.element);
      this.loaded.set(true);
    } catch (err) {
      console.error(`[shell] failed to load web-component remote "${mfe.appName}"`, err);
      this.error.set(`Could not load the remote (is ${mfe.appName} running?).`);
    }
  }

  ngOnDestroy(): void {
    this.element?.remove();
  }
}
