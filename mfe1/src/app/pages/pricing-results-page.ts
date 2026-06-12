import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { LoansService } from '../core/loans.service';

@Component({
  selector: 'app-pricing-results-page',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, TableModule, ButtonModule],
  template: `
    <div class="page">
      <div class="header">
        <div>
          <h1 class="up-page-title">Pricing Results</h1>
          <p class="up-page-subtitle">Latest pricing run across loans that are ready for pricing.</p>
        </div>
        <div class="header-actions">
          @if (lastRun()) {
            <span class="last-run">Last run {{ lastRun() | date: 'HH:mm:ss' }}</span>
          }
          <p-button
            label="Re-run Pricing"
            icon="pi pi-refresh"
            size="small"
            [outlined]="true"
            severity="secondary"
            [loading]="running()"
            (onClick)="rerun()"
          />
        </div>
      </div>

      <div class="cards">
        <div class="up-card stat">
          <span class="up-section-label">Loans Priced</span>
          <strong>{{ loansService.ready().length | number }}</strong>
        </div>
        <div class="up-card stat">
          <span class="up-section-label">Priced UPB</span>
          <strong>{{ loansService.readyUpb() | currency: 'USD' : 'symbol' : '1.0-0' }}</strong>
        </div>
        <div class="up-card stat">
          <span class="up-section-label">Avg. All-in Price</span>
          <strong>{{ avgAllIn() | number: '1.3-3' }}</strong>
          @if (avgDelta() !== null) {
            <span class="delta" [class.up]="avgDelta()! > 0" [class.down]="avgDelta()! < 0">
              <i class="pi" [class.pi-arrow-up]="avgDelta()! > 0" [class.pi-arrow-down]="avgDelta()! < 0"></i>
              {{ avgDelta()! > 0 ? '+' : '' }}{{ avgDelta() | number: '1.3-3' }} vs. last run
            </span>
          }
        </div>
      </div>

      <div class="up-card up-table">
        <p-table [value]="topPriced()" styleClass="p-datatable-sm" [paginator]="true" [rows]="15">
          <ng-template #header>
            <tr>
              <th>Seller Loan ID</th>
              <th>Product</th>
              <th class="num">Base Price</th>
              <th class="num">All-in Price</th>
              <th class="num">UPB</th>
              <th>Last Updated</th>
            </tr>
          </ng-template>
          <ng-template #body let-l>
            <tr>
              <td class="cell-id">{{ l.sellerLoanId }}</td>
              <td>{{ l.productName }}</td>
              <td class="num">{{ l.basePrice !== null ? (l.basePrice | number: '1.3-3') : '—' }}</td>
              <td class="num strong">{{ l.allInPrice !== null ? (l.allInPrice | number: '1.3-3') : '—' }}</td>
              <td class="num">{{ l.upb | currency: 'USD' : 'symbol' : '1.0-0' }}</td>
              <td class="cell-muted" [class.fresh]="l.lastUpdated === 'Just now'">{{ l.lastUpdated }}</td>
            </tr>
          </ng-template>
        </p-table>
      </div>
    </div>
  `,
  styles: [
    `
      .page {
        padding: var(--up-space-5) var(--up-space-6);
        display: flex;
        flex-direction: column;
        gap: var(--up-space-4);
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }
      .header-actions {
        display: flex;
        align-items: center;
        gap: var(--up-space-3);
      }
      .last-run {
        font-size: var(--up-font-size-sm);
        color: var(--up-text-muted);
      }
      .cards {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--up-space-4);
      }
      .stat {
        padding: var(--up-space-4) var(--up-space-5);
        display: flex;
        flex-direction: column;
        gap: 6px;

        strong {
          font-size: 1.5rem;
        }
      }
      .delta {
        font-size: var(--up-font-size-xs);
        color: var(--up-text-muted);
        display: inline-flex;
        align-items: center;
        gap: 4px;

        i {
          font-size: 0.65rem;
        }

        &.up {
          color: var(--up-status-ready);
        }
        &.down {
          color: var(--up-status-error);
        }
      }
      .fresh {
        color: var(--up-primary-600);
        font-weight: var(--up-font-weight-medium);
      }
    `,
  ],
})
export class PricingResultsPage {
  protected readonly loansService = inject(LoansService);

  protected readonly lastRun = signal<Date | null>(null);
  protected readonly running = signal(false);
  protected readonly avgDelta = signal<number | null>(null);

  protected avgAllIn(): number {
    const priced = this.loansService.ready().filter((l) => l.allInPrice !== null);
    if (!priced.length) return 0;
    return priced.reduce((s, l) => s + (l.allInPrice ?? 0), 0) / priced.length;
  }

  protected topPriced() {
    return this.loansService
      .ready()
      .slice()
      .sort((a, b) => (b.allInPrice ?? 0) - (a.allInPrice ?? 0));
  }

  protected rerun(): void {
    const before = this.avgAllIn();
    this.running.set(true);
    setTimeout(() => {
      this.loansService.rerunPricing();
      this.avgDelta.set(Math.round((this.avgAllIn() - before) * 1000) / 1000);
      this.lastRun.set(new Date());
      this.running.set(false);
    }, 400);
  }
}
