import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  signal,
} from '@angular/core';
import { loadRemoteModule } from '@angular-architects/native-federation';
import { CardModule } from 'primeng/card';

/**
 * Hosts the Angular 19 remote as a WEB COMPONENT.
 * The shell never touches the remote's framework internals: the custom
 * element is the entire contract (plus @loan/bridge for data).
 */
@Component({
  selector: 'app-analytics-host',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [CardModule],
  template: `
    @if (error()) {
      <div class="p-4">
        <p-card>
          <div class="flex align-items-center gap-3 text-red-500">
            <i class="pi pi-exclamation-triangle text-2xl"></i>
            <div>
              <strong>Reports &amp; Analytics is unavailable.</strong>
              <p class="mt-1 mb-0 text-color-secondary text-sm">Could not load the remote (is mfe2 running on port 4202?).</p>
            </div>
          </div>
        </p-card>
      </div>
    } @else if (!loaded()) {
      <div class="p-4 text-color-secondary">Loading Reports &amp; Analytics…</div>
    }
    <div #host style="display: block; height: 100%"></div>
  `,
})
export class AnalyticsHost implements OnInit, OnDestroy {
  @ViewChild('host', { static: true }) hostRef!: ElementRef<HTMLDivElement>;

  readonly loaded = signal(false);
  readonly error = signal(false);
  private element: HTMLElement | null = null;

  async ngOnInit(): Promise<void> {
    try {
      // Side-effect import: registers <mfe2-analytics> exactly once per tab.
      const mod = await loadRemoteModule('mfe2', './web-component');
      await mod.registered;
      this.element = document.createElement('mfe2-analytics');
      this.hostRef.nativeElement.appendChild(this.element);
      this.loaded.set(true);
    } catch (err) {
      console.error('[shell] failed to load mfe2 web component', err);
      this.error.set(true);
    }
  }

  ngOnDestroy(): void {
    this.element?.remove();
  }
}
