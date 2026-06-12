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

/**
 * Hosts the Angular 19 remote as a WEB COMPONENT.
 * The shell never touches the remote's framework internals: the custom
 * element is the entire contract (plus @loan/bridge for data).
 */
@Component({
  selector: 'app-analytics-host',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    @if (error()) {
      <div class="remote-error up-card">
        <i class="pi pi-exclamation-triangle"></i>
        <div>
          <strong>Reports &amp; Analytics is unavailable.</strong>
          <p>Could not load the remote (is mfe2 running on port 4202?).</p>
        </div>
      </div>
    } @else if (!loaded()) {
      <div class="remote-loading">Loading Reports &amp; Analytics…</div>
    }
    <div #host class="remote-host"></div>
  `,
  styles: [
    `
      .remote-host {
        display: block;
        height: 100%;
      }
      .remote-loading {
        padding: var(--up-space-6);
        color: var(--up-text-muted);
      }
      .remote-error {
        margin: var(--up-space-6);
        padding: var(--up-space-5);
        display: flex;
        gap: var(--up-space-4);
        align-items: center;
        color: var(--up-status-error);
      }
    `,
  ],
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
