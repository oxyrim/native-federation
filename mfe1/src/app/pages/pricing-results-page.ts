import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { LoansService } from '../core/loans.service';

@Component({
  selector: 'app-pricing-results-page',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, TableModule, ButtonModule, CardModule],
  template: `
    <div class="p-4 flex flex-column gap-4">
      <div class="flex justify-content-between align-items-start">
        <div>
          <h1 class="text-3xl font-bold m-0">Pricing Results</h1>
          <p class="mt-1 mb-0 text-color-secondary">Latest pricing run across loans that are ready for pricing.</p>
        </div>
        <div class="flex align-items-center gap-3">
          @if (lastRun()) {
            <span class="text-sm text-color-secondary">Last run {{ lastRun() | date: 'HH:mm:ss' }}</span>
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

      <div class="grid">
        <div class="col-12 md:col-4">
          <p-card>
            <span class="text-xs font-semibold uppercase text-color-secondary">Loans Priced</span>
            <div class="text-2xl font-bold mt-1">{{ loansService.ready().length | number }}</div>
          </p-card>
        </div>
        <div class="col-12 md:col-4">
          <p-card>
            <span class="text-xs font-semibold uppercase text-color-secondary">Priced UPB</span>
            <div class="text-2xl font-bold mt-1">{{ loansService.readyUpb() | currency: 'USD' : 'symbol' : '1.0-0' }}</div>
          </p-card>
        </div>
        <div class="col-12 md:col-4">
          <p-card>
            <span class="text-xs font-semibold uppercase text-color-secondary">Avg. All-in Price</span>
            <div class="text-2xl font-bold mt-1">{{ avgAllIn() | number: '1.3-3' }}</div>
            @if (avgDelta() !== null) {
              <span
                class="text-xs inline-flex align-items-center gap-1 mt-1"
                [class.text-green-500]="avgDelta()! > 0"
                [class.text-red-500]="avgDelta()! < 0"
              >
                <i class="pi text-xs" [class.pi-arrow-up]="avgDelta()! > 0" [class.pi-arrow-down]="avgDelta()! < 0"></i>
                {{ avgDelta()! > 0 ? '+' : '' }}{{ avgDelta() | number: '1.3-3' }} vs. last run
              </span>
            }
          </p-card>
        </div>
      </div>

      <p-card>
        <p-table [value]="topPriced()" styleClass="p-datatable-sm" [paginator]="true" [rows]="15">
          <ng-template #header>
            <tr>
              <th>Seller Loan ID</th>
              <th>Product</th>
              <th class="text-right">Base Price</th>
              <th class="text-right">All-in Price</th>
              <th class="text-right">UPB</th>
              <th>Last Updated</th>
            </tr>
          </ng-template>
          <ng-template #body let-l>
            <tr>
              <td class="font-medium">{{ l.sellerLoanId }}</td>
              <td>{{ l.productName }}</td>
              <td class="text-right">{{ l.basePrice !== null ? (l.basePrice | number: '1.3-3') : '—' }}</td>
              <td class="text-right font-semibold">{{ l.allInPrice !== null ? (l.allInPrice | number: '1.3-3') : '—' }}</td>
              <td class="text-right">{{ l.upb | currency: 'USD' : 'symbol' : '1.0-0' }}</td>
              <td
                [class.text-color-secondary]="l.lastUpdated !== 'Just now'"
                [class.text-primary]="l.lastUpdated === 'Just now'"
                [class.font-medium]="l.lastUpdated === 'Just now'"
              >
                {{ l.lastUpdated }}
              </td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>
    </div>
  `,
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
