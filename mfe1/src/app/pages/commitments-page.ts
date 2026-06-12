import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { AppId } from '@loan/bridge';
import { CommitmentsService, NewCommitmentInput } from '../core/commitments.service';
import { LoansService, PRODUCTS } from '../core/loans.service';
import { PipelineBridgeService } from '../core/bridge.service';

const EXPIRY_OPTIONS = [
  { label: '7 days', value: 7 },
  { label: '14 days', value: 14 },
  { label: '30 days', value: 30 },
  { label: '60 days', value: 60 },
];

@Component({
  selector: 'app-commitments-page',
  imports: [
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    FormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
  ],
  template: `
    <div class="page">
      <div class="header">
        <div>
          <h1 class="up-page-title">Commitment Pipeline</h1>
          <p class="up-page-subtitle">Track open commitments and propose new ones from selected loans.</p>
        </div>
        <p-button label="New Commitment" icon="pi pi-plus" (onClick)="openNewDialog()" />
      </div>

      <div class="cards">
        <div class="up-card stat">
          <span class="up-section-label">Open</span>
          <strong>{{ commitmentsService.openCount() | number }}</strong>
        </div>
        <div class="up-card stat">
          <span class="up-section-label">Pending</span>
          <strong>{{ commitmentsService.pendingCount() | number }}</strong>
        </div>
        <div class="up-card stat">
          <span class="up-section-label">Fulfilled</span>
          <strong>{{ commitmentsService.fulfilledCount() | number }}</strong>
        </div>
        <div class="up-card stat">
          <span class="up-section-label">Total Committed UPB</span>
          <strong>{{ commitmentsService.totalUpb() | currency: 'USD' : 'symbol' : '1.0-0' }}</strong>
        </div>
      </div>

      @if (loansService.selected().length > 0) {
        <div class="up-card selection-hint">
          <i class="pi pi-info-circle"></i>
          <span>
            <strong>{{ loansService.selected().length }}</strong> loans
            ({{ loansService.selectedUpb() | currency: 'USD' : 'symbol' : '1.0-0' }} UPB) are selected in the
            Loan Pipeline and ready to be committed.
          </span>
          <p-button label="Propose from Selection" size="small" [outlined]="true" (onClick)="proposeFromSelection()" />
        </div>
      }

      <div class="up-card up-table">
        <p-table [value]="commitmentsService.commitments()" dataKey="id" styleClass="p-datatable-sm">
          <ng-template #header>
            <tr>
              <th>Commitment ID</th>
              <th>Product</th>
              <th class="num">Loans</th>
              <th class="num">UPB</th>
              <th class="num">Commitment Price</th>
              <th>Expires</th>
              <th>Status</th>
              <th></th>
            </tr>
          </ng-template>
          <ng-template #body let-c>
            <tr>
              <td class="cell-id">{{ c.id }}</td>
              <td>{{ c.product }}</td>
              <td class="num">{{ c.loans | number }}</td>
              <td class="num">{{ c.upb | currency: 'USD' : 'symbol' : '1.0-0' }}</td>
              <td class="num">{{ c.price | number: '1.3-3' }}</td>
              <td class="cell-muted">{{ c.expires }}</td>
              <td>
                <span
                  class="up-chip"
                  [class.ready]="c.status === 'Fulfilled'"
                  [class.warn]="c.status === 'Pending'"
                  [class.neutral]="c.status === 'Open'"
                >
                  {{ c.status }}
                </span>
              </td>
              <td>
                @if (c.status !== 'Fulfilled') {
                  <p-button
                    [label]="c.status === 'Open' ? 'Mark Pending' : 'Mark Fulfilled'"
                    size="small"
                    [text]="true"
                    severity="secondary"
                    (onClick)="commitmentsService.advance(c.id)"
                  />
                }
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>

      <!-- ================= CROSS-APP MESSAGING DEMO ================= -->
      <div class="up-card bridge-messenger">
        <h3><i class="pi pi-send"></i> Pipeline &harr; Platform Messaging</h3>
        <p class="bm-hint">
          Same <code>&#64;loan/bridge</code> instance as the shell and Reports &amp; Analytics (MFE2).
          A message sent here reaches the shell (<strong>mfe&nbsp;&rarr;&nbsp;shell</strong>) and
          MFE2's Activity feed (<strong>mfe&nbsp;&rarr;&nbsp;mfe</strong>) instantly; messages from
          either of those land in this feed too.
        </p>
        <div class="bm-compose">
          <input
            pInputText
            type="text"
            placeholder="Message to Shell &amp; Analytics (MFE2)..."
            [(ngModel)]="draft"
            (keydown.enter)="send()"
          />
          <p-button label="Send" icon="pi pi-send" size="small" [disabled]="!draft().trim()" (onClick)="send()" />
        </div>
        <ul class="bm-feed">
          @for (m of bridge.messages(); track m.id) {
            <li [class]="m.level">
              <span class="bm-from">{{ appLabel(m.from) }}</span>
              <span class="bm-text">{{ m.message }}</span>
              <span class="bm-when">{{ m.asOf | date: 'HH:mm:ss' }}</span>
            </li>
          } @empty {
            <li class="bm-empty">No messages yet — send one, or trigger one from the Shell/MFE2.</li>
          }
        </ul>
      </div>
    </div>

    <!-- ================= NEW COMMITMENT DIALOG ================= -->
    <p-dialog
      header="New Commitment"
      [visible]="showNewDialog()"
      (visibleChange)="$event ? null : showNewDialog.set(false)"
      [modal]="true"
      [style]="{ width: '28rem' }"
    >
      <div class="form">
        <label>
          <span class="up-section-label">Product</span>
          <p-select [options]="productOptions" [(ngModel)]="form.product" [style]="{ width: '100%' }" />
        </label>
        <label>
          <span class="up-section-label">Loan count</span>
          <p-inputnumber [(ngModel)]="form.loans" [min]="1" [max]="500" [style]="{ width: '100%' }" />
        </label>
        <label>
          <span class="up-section-label">Total UPB</span>
          <p-inputnumber [(ngModel)]="form.upb" mode="currency" currency="USD" [min]="0" [style]="{ width: '100%' }" />
        </label>
        <label>
          <span class="up-section-label">Commitment price</span>
          <p-inputnumber [(ngModel)]="form.price" [minFractionDigits]="3" [maxFractionDigits]="3" [min]="90" [max]="110" [style]="{ width: '100%' }" />
        </label>
        <label>
          <span class="up-section-label">Expires in</span>
          <p-select [options]="expiryOptions" optionLabel="label" optionValue="value" [(ngModel)]="form.expiresInDays" [style]="{ width: '100%' }" />
        </label>
      </div>
      <ng-template #footer>
        <p-button label="Cancel" severity="secondary" [text]="true" size="small" (onClick)="showNewDialog.set(false)" />
        <p-button label="Create Commitment" size="small" (onClick)="createCommitment()" />
      </ng-template>
    </p-dialog>
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
      .cards {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
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
      .selection-hint {
        display: flex;
        align-items: center;
        gap: var(--up-space-3);
        padding: var(--up-space-3) var(--up-space-4);
        border-left: 3px solid var(--up-primary-500);

        i {
          color: var(--up-primary-600);
        }
        span {
          flex: 1;
          font-size: var(--up-font-size-sm);
          color: var(--up-text-secondary);
        }
      }
      .form {
        display: flex;
        flex-direction: column;
        gap: var(--up-space-4);

        label {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
      }
    `,
  ],
})
export class CommitmentsPage {
  protected readonly loansService = inject(LoansService);
  protected readonly commitmentsService = inject(CommitmentsService);
  protected readonly bridge = inject(PipelineBridgeService);

  protected readonly draft = signal('');
  protected readonly showNewDialog = signal(false);

  protected readonly productOptions = PRODUCTS;
  protected readonly expiryOptions = EXPIRY_OPTIONS;

  protected form: { product: string; loans: number; upb: number; price: number; expiresInDays: number } = {
    product: PRODUCTS[0],
    loans: 10,
    upb: 3_000_000,
    price: 100.5,
    expiresInDays: 14,
  };

  protected openNewDialog(): void {
    this.form = { product: PRODUCTS[0], loans: 10, upb: 3_000_000, price: 100.5, expiresInDays: 14 };
    this.showNewDialog.set(true);
  }

  protected createCommitment(): void {
    const input: NewCommitmentInput = { ...this.form };
    const commitment = this.commitmentsService.add(input);
    this.showNewDialog.set(false);
    this.bridge.notify(
      `New commitment ${commitment.id} created for ${commitment.product} (${commitment.loans} loans).`,
      'success',
    );
  }

  protected proposeFromSelection(): void {
    const commitment = this.commitmentsService.proposeFromSelection();
    if (!commitment) return;
    this.bridge.notify(
      `New commitment ${commitment.id} proposed from ${commitment.loans} selected loans (${commitment.product}).`,
      'success',
    );
  }

  protected appLabel(appId: AppId): string {
    switch (appId) {
      case 'shell':
        return 'Shell';
      case 'mfe1-pipeline':
        return 'Pipeline (MFE1)';
      case 'mfe2-analytics':
        return 'Analytics (MFE2)';
    }
  }

  protected send(): void {
    const message = this.draft().trim();
    if (!message) return;
    this.bridge.notify(message, 'info');
    this.draft.set('');
  }
}
