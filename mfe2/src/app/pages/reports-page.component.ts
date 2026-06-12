import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { AuditEntry } from '@loan/bridge';
import { AnalyticsBridgeService } from '../core/bridge.service';

interface ReportRow {
  name: string;
  type: string;
  schedule: string;
  lastRun: string;
  durationSec: number;
  rows: number;
  status: 'Completed' | 'Running' | 'Failed';
}

@Component({
  selector: 'mfe2-reports-page',
  standalone: true,
  imports: [DatePipe, TableModule, ButtonModule, TagModule, DialogModule, ToastModule, TooltipModule],
  providers: [MessageService],
  templateUrl: './reports-page.component.html',
  styleUrls: ['./reports-page.component.scss'],
})
export class ReportsPageComponent {
  private readonly bridge = inject(AnalyticsBridgeService);
  private readonly messages = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly violation = signal<string | null>(null);
  protected readonly auditEntries = signal<readonly AuditEntry[]>([]);
  protected readonly selectedReport = signal<ReportRow | null>(null);

  readonly reports: ReportRow[] = [
    { name: 'Daily Pipeline Snapshot', type: 'Pipeline', schedule: 'Daily, 6:00 AM', lastRun: 'Today, 6:00 AM', durationSec: 42, rows: 1245, status: 'Completed' },
    { name: 'Pricing Exceptions', type: 'Pricing', schedule: 'Hourly', lastRun: 'Today, 9:00 AM', durationSec: 18, rows: 37, status: 'Running' },
    { name: 'Commitment Fulfillment', type: 'Commitments', schedule: 'Weekly, Mon', lastRun: 'Jun 9, 7:00 AM', durationSec: 95, rows: 412, status: 'Completed' },
    { name: 'Imported Loan Quality', type: 'Data Quality', schedule: 'Daily, 7:30 AM', lastRun: 'Today, 7:30 AM', durationSec: 31, rows: 233, status: 'Failed' },
    { name: 'UPB Concentration', type: 'Risk', schedule: 'Monthly', lastRun: 'Jun 1, 5:00 AM', durationSec: 240, rows: 5012, status: 'Completed' },
  ];

  constructor() {
    // Live audit feed (bridge 1.1): no polling, updates as ANY app publishes.
    this.auditEntries.set(this.bridge.client.auditLog().slice(-12).reverse());
    const unsubscribe = this.bridge.client.subscribeAudit((entry) => {
      this.auditEntries.update((list) => [entry, ...list].slice(0, 12));
    });
    this.destroyRef.onDestroy(unsubscribe);
  }

  protected attempt(): void {
    this.violation.set(this.bridge.tryForbiddenPublish());
  }

  protected runNow(report: ReportRow, event: Event): void {
    event.stopPropagation();
    this.messages.add({
      severity: 'info',
      summary: 'Report queued',
      detail: `"${report.name}" was queued for an ad-hoc run.`,
      life: 3000,
    });
  }
}
