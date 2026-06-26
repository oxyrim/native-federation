import { Component, computed, inject, input } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { MenuItem } from 'primeng/api';
import { LoanSummary } from '@loan/bridge';
import { LoansService } from '../core/loans.service';

@Component({
  selector: 'app-loan-detail-page',
  imports: [CurrencyPipe, DecimalPipe, RouterLink, ButtonModule, CardModule, TagModule, BreadcrumbModule],
  template: `
    <div class="p-4" style="max-width: 980px">
      <p-breadcrumb [model]="crumbs()" [home]="home" styleClass="mb-3 border-none p-0" />

      @if (loan(); as l) {
        <div class="flex justify-content-between align-items-center mb-4">
          <div>
            <h1 class="text-3xl font-bold m-0">{{ l.sellerLoanId }}</h1>
            <p class="mt-1 mb-0 text-color-secondary">{{ l.productName }} · {{ l.servicing }} servicing</p>
          </div>
          <p-tag [value]="l.status" [severity]="statusSeverity(l)" />
        </div>

        <div class="grid">
          <div class="col-12 md:col-6">
            <p-card header="Identifiers">
              <div class="flex justify-content-between py-2 border-bottom-1 surface-border text-sm">
                <span class="text-color-secondary">Seller Loan ID</span><span class="font-medium">{{ l.sellerLoanId }}</span>
              </div>
              <div class="flex justify-content-between py-2 border-bottom-1 surface-border text-sm">
                <span class="text-color-secondary">Case File ID</span><span class="font-medium">{{ l.caseFileId ?? 'N/A — imported loan' }}</span>
              </div>
              <div class="flex justify-content-between py-2 border-bottom-1 surface-border text-sm">
                <span class="text-color-secondary">Source</span><span class="font-medium">{{ l.source === 'DU' ? 'Desktop Underwriter' : 'Imported by User' }}</span>
              </div>
              <div class="flex justify-content-between py-2 text-sm">
                <span class="text-color-secondary">Last Updated</span><span class="font-medium">{{ l.lastUpdated }}</span>
              </div>
            </p-card>
          </div>

          <div class="col-12 md:col-6">
            <p-card header="Pricing">
              <div class="flex justify-content-between py-2 border-bottom-1 surface-border text-sm">
                <span class="text-color-secondary">Base Price</span><span class="font-medium">{{ l.basePrice !== null ? (l.basePrice | number: '1.3-3') : '—' }}</span>
              </div>
              <div class="flex justify-content-between py-2 border-bottom-1 surface-border text-sm">
                <span class="text-color-secondary">SRP</span><span class="font-medium">{{ l.srp !== null ? (l.srp | number: '1.3-3') : 'N/A (Retained)' }}</span>
              </div>
              <div class="flex justify-content-between py-2 border-bottom-1 surface-border text-sm">
                <span class="text-color-secondary">LLPAs</span><span class="font-medium">{{ l.llpa !== null ? (l.llpa | number: '1.3-3') : '—' }}</span>
              </div>
              <div class="flex justify-content-between py-2 border-bottom-1 surface-border text-sm">
                <span class="text-color-secondary">All-in Price</span><span class="font-bold text-primary">{{ l.allInPrice !== null ? (l.allInPrice | number: '1.3-3') : '—' }}</span>
              </div>
              <div class="flex justify-content-between py-2 text-sm">
                <span class="text-color-secondary">UPB</span><span class="font-medium">{{ l.upb | currency: 'USD' : 'symbol' : '1.0-0' }}</span>
              </div>
            </p-card>
          </div>
        </div>

        <div class="flex justify-content-end gap-2 mt-4">
          <p-button label="Refresh Pricing" icon="pi pi-refresh" severity="secondary" [outlined]="true" />
          <p-button label="Propose Commitment" icon="pi pi-file-check" />
        </div>
      } @else {
        <p-card>
          <div class="flex flex-column align-items-center gap-2 text-center text-color-secondary py-4">
            <i class="pi pi-search text-2xl"></i>
            <p class="m-0">No loan found with identifier <strong>{{ id() }}</strong>.</p>
            <a [routerLink]="['../..']">Back to pipeline</a>
          </div>
        </p-card>
      }
    </div>
  `,
})
export class LoanDetailPage {
  /** Bound from the :id route param via withComponentInputBinding(). */
  readonly id = input.required<string>();

  private readonly loansService = inject(LoansService);
  protected readonly loan = computed(() => this.loansService.byId(this.id()));

  protected readonly home: MenuItem = { icon: 'pi pi-home', routerLink: ['../..'] };
  protected readonly crumbs = computed<MenuItem[]>(() => [
    { label: 'Loan Pipeline', routerLink: ['../..'] },
    { label: this.id() },
  ]);

  protected statusSeverity(l: LoanSummary): 'success' | 'warn' | 'secondary' {
    return l.status === 'Ready for Pricing' ? 'success' : l.status === 'Missing Data' ? 'warn' : 'secondary';
  }
}
