import { Component, computed, inject, input } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { LoansService } from '../core/loans.service';

@Component({
  selector: 'app-loan-detail-page',
  imports: [CurrencyPipe, DecimalPipe, RouterLink, ButtonModule],
  template: `
    <div class="page">
      <nav class="breadcrumb">
        <a [routerLink]="['../..']">Loan Pipeline</a>
        <i class="pi pi-angle-right"></i>
        <span>{{ id() }}</span>
      </nav>

      @if (loan(); as l) {
        <div class="header">
          <div>
            <h1 class="up-page-title">{{ l.sellerLoanId }}</h1>
            <p class="up-page-subtitle">{{ l.productName }} · {{ l.servicing }} servicing</p>
          </div>
          <span
            class="up-chip"
            [class.ready]="l.status === 'Ready for Pricing'"
            [class.warn]="l.status === 'Missing Data'"
            [class.neutral]="l.status === 'Ineligible'"
          >
            {{ l.status }}
          </span>
        </div>

        <div class="grid">
          <div class="up-card panel">
            <h3>Identifiers</h3>
            <dl>
              <div><dt>Seller Loan ID</dt><dd>{{ l.sellerLoanId }}</dd></div>
              <div><dt>Case File ID</dt><dd>{{ l.caseFileId ?? 'N/A — imported loan' }}</dd></div>
              <div><dt>Source</dt><dd>{{ l.source === 'DU' ? 'Desktop Underwriter' : 'Imported by User' }}</dd></div>
              <div><dt>Last Updated</dt><dd>{{ l.lastUpdated }}</dd></div>
            </dl>
          </div>

          <div class="up-card panel">
            <h3>Pricing</h3>
            <dl>
              <div><dt>Base Price</dt><dd>{{ l.basePrice !== null ? (l.basePrice | number: '1.3-3') : '—' }}</dd></div>
              <div><dt>SRP</dt><dd>{{ l.srp !== null ? (l.srp | number: '1.3-3') : 'N/A (Retained)' }}</dd></div>
              <div><dt>LLPAs</dt><dd>{{ l.llpa !== null ? (l.llpa | number: '1.3-3') : '—' }}</dd></div>
              <div class="highlight"><dt>All-in Price</dt><dd>{{ l.allInPrice !== null ? (l.allInPrice | number: '1.3-3') : '—' }}</dd></div>
              <div><dt>UPB</dt><dd>{{ l.upb | currency: 'USD' : 'symbol' : '1.0-0' }}</dd></div>
            </dl>
          </div>
        </div>

        <div class="actions">
          <p-button label="Refresh Pricing" icon="pi pi-refresh" severity="secondary" [outlined]="true" />
          <p-button label="Propose Commitment" icon="pi pi-file-check" />
        </div>
      } @else {
        <div class="up-card missing">
          <i class="pi pi-search"></i>
          <p>No loan found with identifier <strong>{{ id() }}</strong>.</p>
          <a [routerLink]="['../..']">Back to pipeline</a>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .page {
        padding: var(--up-space-5) var(--up-space-6);
        max-width: 980px;
      }
      .breadcrumb {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: var(--up-font-size-sm);
        margin-bottom: var(--up-space-4);
        color: var(--up-text-muted);

        a {
          color: var(--up-primary-600);
          text-decoration: none;
        }
        i {
          font-size: 0.7rem;
        }
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--up-space-5);
      }
      .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--up-space-4);
      }
      .panel {
        padding: var(--up-space-4) var(--up-space-5);

        h3 {
          margin: 0 0 var(--up-space-3);
          font-size: var(--up-font-size-lg);
        }

        dl {
          margin: 0;

          > div {
            display: flex;
            justify-content: space-between;
            padding: 9px 0;
            border-bottom: 1px solid var(--up-border);
            font-size: var(--up-font-size-sm);

            &:last-child {
              border-bottom: none;
            }

            &.highlight dd {
              color: var(--up-primary-600);
              font-weight: var(--up-font-weight-bold);
            }
          }

          dt {
            color: var(--up-text-secondary);
          }

          dd {
            margin: 0;
            font-weight: var(--up-font-weight-medium);
          }
        }
      }
      .actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--up-space-2);
        margin-top: var(--up-space-5);
      }
      .missing {
        padding: var(--up-space-6);
        text-align: center;
        color: var(--up-text-secondary);

        i {
          font-size: 1.5rem;
          color: var(--up-text-muted);
        }
        a {
          color: var(--up-primary-600);
        }
      }
    `,
  ],
})
export class LoanDetailPage {
  /** Bound from the :id route param via withComponentInputBinding(). */
  readonly id = input.required<string>();

  private readonly loansService = inject(LoansService);
  protected readonly loan = computed(() => this.loansService.byId(this.id()));
}
