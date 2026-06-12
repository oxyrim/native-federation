import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

/**
 * Root of the Angular 19 remote. Rendered either:
 *  - by bootstrapApplication (standalone dev on :4202), or
 *  - inside the <mfe2-analytics> custom element hosted by the Angular 21 shell.
 */
@Component({
  selector: 'mfe2-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="analytics-shell">
      <div class="analytics-header">
        <div>
          <h1 class="up-page-title">Reports &amp; Analytics</h1>
          <p class="up-page-subtitle">
            Pipeline insights powered by live, governed data from the Loan Pipeline MFE.
          </p>
        </div>
        <span class="runtime-badge" title="This area is an independently deployed remote">
          <i class="pi pi-box"></i> Angular 19 · Web Component
        </span>
      </div>

      <nav class="analytics-tabs">
        <a routerLink="/analytics" [routerLinkActiveOptions]="{ exact: true }" routerLinkActive="active">
          <i class="pi pi-chart-pie"></i> Dashboard
        </a>
        <a routerLink="/analytics/reports" routerLinkActive="active">
          <i class="pi pi-file"></i> Reports
        </a>
        <a routerLink="/analytics/quality" routerLinkActive="active">
          <i class="pi pi-verified"></i> Data Quality
        </a>
        <a routerLink="/analytics/activity" routerLinkActive="active">
          <i class="pi pi-history"></i> Activity
        </a>
      </nav>

      <router-outlet />
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .analytics-shell {
        padding: 1.5rem 2rem;
      }
      .analytics-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
      }
      .runtime-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 999px;
        background: var(--ds-color-info-bg, #eff6ff);
        color: var(--ds-color-info-text, #1e40af);
        border: 1px solid var(--ds-color-info-border, #bfdbfe);
        font-size: 0.75rem;
        font-weight: 600;
        white-space: nowrap;
      }
      .analytics-tabs {
        display: flex;
        gap: 4px;
        margin: 1.25rem 0 1.5rem;
        border-bottom: 1px solid var(--up-border, #e3e5e9);

        a {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 16px;
          color: var(--up-text-secondary, #5d6470);
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;

          &:hover {
            color: var(--up-text-primary, #1b1e24);
          }

          &.active {
            color: var(--ds-text-link, #2563eb);
            border-bottom-color: var(--ds-color-primary-500, #3b82f6);
          }
        }
      }
    `,
  ],
})
export class AppComponent implements OnInit {
  private readonly router = inject(Router);

  ngOnInit(): void {
    // In web-component mode there is no ApplicationRef.bootstrap(), so the
    // router never runs its initial navigation — and after the element is
    // detached/re-attached the internal router state can be stale. Resync
    // with the real browser URL every time the element (re)connects.
    const current = location.pathname + location.search;
    this.router.navigateByUrl(current, { replaceUrl: true });
  }
}
