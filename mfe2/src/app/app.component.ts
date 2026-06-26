import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TagModule } from 'primeng/tag';

/**
 * Root of the Angular 19 remote. Rendered either:
 *  - by bootstrapApplication (standalone dev on :4202), or
 *  - inside the <mfe2-analytics> custom element hosted by the Angular 21 shell.
 */
@Component({
  selector: 'mfe2-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TagModule],
  template: `
    <div class="p-4">
      <div class="flex justify-content-between align-items-start gap-3">
        <div>
          <h1 class="text-3xl font-bold m-0">Reports &amp; Analytics</h1>
          <p class="mt-1 mb-0 text-color-secondary">
            Pipeline insights powered by live, governed data from the Loan Pipeline MFE.
          </p>
        </div>
        <p-tag icon="pi pi-box" value="Angular 19 · Web Component" severity="info" />
      </div>

      <nav class="flex gap-1 mt-4 mb-4 border-bottom-1 surface-border">
        <a
          routerLink="/analytics"
          [routerLinkActiveOptions]="{ exact: true }"
          routerLinkActive="text-primary border-primary"
          class="inline-flex align-items-center gap-2 px-3 py-2 text-sm font-medium no-underline text-color-secondary border-bottom-2 border-transparent cursor-pointer"
          style="margin-bottom: -1px"
        >
          <i class="pi pi-chart-pie"></i> Dashboard
        </a>
        <a
          routerLink="/analytics/reports"
          routerLinkActive="text-primary border-primary"
          class="inline-flex align-items-center gap-2 px-3 py-2 text-sm font-medium no-underline text-color-secondary border-bottom-2 border-transparent cursor-pointer"
          style="margin-bottom: -1px"
        >
          <i class="pi pi-file"></i> Reports
        </a>
        <a
          routerLink="/analytics/quality"
          routerLinkActive="text-primary border-primary"
          class="inline-flex align-items-center gap-2 px-3 py-2 text-sm font-medium no-underline text-color-secondary border-bottom-2 border-transparent cursor-pointer"
          style="margin-bottom: -1px"
        >
          <i class="pi pi-verified"></i> Data Quality
        </a>
        <a
          routerLink="/analytics/activity"
          routerLinkActive="text-primary border-primary"
          class="inline-flex align-items-center gap-2 px-3 py-2 text-sm font-medium no-underline text-color-secondary border-bottom-2 border-transparent cursor-pointer"
          style="margin-bottom: -1px"
        >
          <i class="pi pi-history"></i> Activity
        </a>
      </nav>

      <router-outlet />
    </div>
  `,
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
