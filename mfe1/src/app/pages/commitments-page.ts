import { Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { AppId } from '@loan/bridge';
import { CommitmentsService, CommitmentStatus, NewCommitmentInput } from '../core/commitments.service';
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
    CardModule,
    TagModule,
  ],
  template: `
    <div class="p-4 flex flex-column gap-4">
      <div class="flex justify-content-between align-items-start">
        <div>
          <h1 class="text-3xl font-bold m-0">Commitment Pipeline</h1>
          <p class="mt-1 mb-0 text-color-secondary">Track open commitments and propose new ones from selected loans.</p>
        </div>
        <p-button label="New Commitment" icon="pi pi-plus" (onClick)="openNewDialog()" />
      </div>

      <div class="grid">
        <div class="col-12 md:col-6 lg:col-3">
          <p-card>
            <span class="text-xs font-semibold uppercase text-color-secondary">Open</span>
            <div class="text-2xl font-bold mt-1">{{ commitmentsService.openCount() | number }}</div>
          </p-card>
        </div>
        <div class="col-12 md:col-6 lg:col-3">
          <p-card>
            <span class="text-xs font-semibold uppercase text-color-secondary">Pending</span>
            <div class="text-2xl font-bold mt-1">{{ commitmentsService.pendingCount() | number }}</div>
          </p-card>
        </div>
        <div class="col-12 md:col-6 lg:col-3">
          <p-card>
            <span class="text-xs font-semibold uppercase text-color-secondary">Fulfilled</span>
            <div class="text-2xl font-bold mt-1">{{ commitmentsService.fulfilledCount() | number }}</div>
          </p-card>
        </div>
        <div class="col-12 md:col-6 lg:col-3">
          <p-card>
            <span class="text-xs font-semibold uppercase text-color-secondary">Total Committed UPB</span>
            <div class="text-2xl font-bold mt-1">{{ commitmentsService.totalUpb() | currency: 'USD' : 'symbol' : '1.0-0' }}</div>
          </p-card>
        </div>
      </div>

      @if (loansService.selected().length > 0) {
        <p-card>
          <div class="flex align-items-center gap-3">
            <i class="pi pi-info-circle text-primary"></i>
            <span class="flex-1 text-sm text-color-secondary">
              <strong>{{ loansService.selected().length }}</strong> loans
              ({{ loansService.selectedUpb() | currency: 'USD' : 'symbol' : '1.0-0' }} UPB) are selected in the
              Loan Pipeline and ready to be committed.
            </span>
            <p-button label="Propose from Selection" size="small" [outlined]="true" (onClick)="proposeFromSelection()" />
          </div>
        </p-card>
      }

      <p-card>
        <p-table [value]="commitmentsService.commitments()" dataKey="id" styleClass="p-datatable-sm">
          <ng-template #header>
            <tr>
              <th>Commitment ID</th>
              <th>Product</th>
              <th class="text-right">Loans</th>
              <th class="text-right">UPB</th>
              <th class="text-right">Commitment Price</th>
              <th>Expires</th>
              <th>Status</th>
              <th></th>
            </tr>
          </ng-template>
          <ng-template #body let-c>
            <tr>
              <td class="font-medium">{{ c.id }}</td>
              <td>{{ c.product }}</td>
              <td class="text-right">{{ c.loans | number }}</td>
              <td class="text-right">{{ c.upb | currency: 'USD' : 'symbol' : '1.0-0' }}</td>
              <td class="text-right">{{ c.price | number: '1.3-3' }}</td>
              <td class="text-color-secondary">{{ c.expires }}</td>
              <td>
                <p-tag [value]="c.status" [severity]="statusSeverity(c.status)" />
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
      </p-card>

      <!-- ================= CROSS-APP MESSAGING DEMO ================= -->
      <p-card>
        <ng-template #header>
          <div class="flex align-items-center gap-2 px-3 pt-3 text-lg font-medium">
            <i class="pi pi-send text-primary"></i> Pipeline &harr; Platform Messaging
          </div>
        </ng-template>
        <p class="mt-0 mb-3 text-color-secondary text-sm line-height-3">
          Same <code>&#64;loan/bridge</code> instance as the shell and Reports &amp; Analytics (MFE2).
          A message sent here reaches the shell (<strong>mfe&nbsp;&rarr;&nbsp;shell</strong>) and
          MFE2's Activity feed (<strong>mfe&nbsp;&rarr;&nbsp;mfe</strong>) instantly; messages from
          either of those land in this feed too.
        </p>
        <div class="flex gap-2 mb-3">
          <input
            pInputText
            class="flex-1"
            type="text"
            placeholder="Message to Shell &amp; Analytics (MFE2)..."
            [(ngModel)]="draft"
            (keydown.enter)="send()"
          />
          <p-button label="Send" icon="pi pi-send" size="small" [disabled]="!draft().trim()" (onClick)="send()" />
        </div>
        <ul class="list-none m-0 p-0 flex flex-column gap-2 overflow-y-auto" style="max-height: 220px">
          @for (m of bridge.messages(); track m.id) {
            <li class="flex align-items-center gap-2 p-2 surface-100 border-round text-sm">
              <p-tag [value]="appLabel(m.from)" [severity]="levelSeverity(m.level)" />
              <span class="flex-1 text-color-secondary">{{ m.message }}</span>
              <span class="text-color-secondary text-xs white-space-nowrap">{{ m.asOf | date: 'HH:mm:ss' }}</span>
            </li>
          } @empty {
            <li class="text-color-secondary text-sm p-2">No messages yet — send one, or trigger one from the Shell/MFE2.</li>
          }
        </ul>
      </p-card>
    </div>

    <!-- ================= NEW COMMITMENT DIALOG ================= -->
    <p-dialog
      header="New Commitment"
      [visible]="showNewDialog()"
      (visibleChange)="$event ? null : showNewDialog.set(false)"
      [modal]="true"
      [style]="{ width: '28rem' }"
    >
      <div class="flex flex-column gap-3">
        <label class="flex flex-column gap-2">
          <span class="text-xs font-semibold uppercase text-color-secondary">Product</span>
          <p-select [options]="productOptions" [(ngModel)]="form.product" [style]="{ width: '100%' }" />
        </label>
        <label class="flex flex-column gap-2">
          <span class="text-xs font-semibold uppercase text-color-secondary">Loan count</span>
          <p-inputnumber [(ngModel)]="form.loans" [min]="1" [max]="500" [style]="{ width: '100%' }" />
        </label>
        <label class="flex flex-column gap-2">
          <span class="text-xs font-semibold uppercase text-color-secondary">Total UPB</span>
          <p-inputnumber [(ngModel)]="form.upb" mode="currency" currency="USD" [min]="0" [style]="{ width: '100%' }" />
        </label>
        <label class="flex flex-column gap-2">
          <span class="text-xs font-semibold uppercase text-color-secondary">Commitment price</span>
          <p-inputnumber [(ngModel)]="form.price" [minFractionDigits]="3" [maxFractionDigits]="3" [min]="90" [max]="110" [style]="{ width: '100%' }" />
        </label>
        <label class="flex flex-column gap-2">
          <span class="text-xs font-semibold uppercase text-color-secondary">Expires in</span>
          <p-select [options]="expiryOptions" optionLabel="label" optionValue="value" [(ngModel)]="form.expiresInDays" [style]="{ width: '100%' }" />
        </label>
      </div>
      <ng-template #footer>
        <p-button label="Cancel" severity="secondary" [text]="true" size="small" (onClick)="showNewDialog.set(false)" />
        <p-button label="Create Commitment" size="small" (onClick)="createCommitment()" />
      </ng-template>
    </p-dialog>
  `,
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

  protected statusSeverity(status: CommitmentStatus): 'success' | 'warn' | 'secondary' {
    return status === 'Fulfilled' ? 'success' : status === 'Pending' ? 'warn' : 'secondary';
  }

  protected levelSeverity(level: 'info' | 'success' | 'warning'): 'info' | 'success' | 'warn' {
    return level === 'warning' ? 'warn' : level;
  }

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
