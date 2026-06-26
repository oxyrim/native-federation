import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MeterGroupModule } from 'primeng/metergroup';
import { CardModule } from 'primeng/card';
import { AccordionModule } from 'primeng/accordion';
import { ProgressBarModule } from 'primeng/progressbar';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import { AnalyticsBridgeService } from '../core/bridge.service';

type IssueSeverity = 'critical' | 'warning' | 'info';

interface QualityIssue {
  field: string;
  rule: string;
  affected: number;
  severity: IssueSeverity;
}

interface IssueCategory {
  key: string;
  title: string;
  icon: string;
  completeness: number;
  issues: QualityIssue[];
}

@Component({
  selector: 'mfe2-quality-page',
  standalone: true,
  imports: [
    DecimalPipe,
    FormsModule,
    MeterGroupModule,
    CardModule,
    AccordionModule,
    ProgressBarModule,
    ButtonModule,
    DialogModule,
    ToastModule,
    SelectModule,
    TagModule,
    SkeletonModule,
  ],
  providers: [MessageService],
  templateUrl: './quality-page.component.html',
})
export class QualityPageComponent {
  protected readonly bridge = inject(AnalyticsBridgeService);
  private readonly messages = inject(MessageService);

  protected readonly severityFilter = signal<IssueSeverity | 'all'>('all');
  protected readonly severityOptions = [
    { label: 'All severities', value: 'all' },
    { label: 'Critical', value: 'critical' },
    { label: 'Warning', value: 'warning' },
    { label: 'Info', value: 'info' },
  ];

  protected readonly validationVisible = signal(false);
  protected readonly validating = signal(false);

  /** Data-completeness meters fed by the governed pipeline summary. */
  protected readonly meters = computed(() => {
    const s = this.bridge.summary();
    const total = s?.totalLoans ?? 0;
    const ready = s?.readyForPricing ?? 0;
    const missing = s?.missingData ?? 0;
    const ineligible = s?.ineligible ?? 0;
    const pct = (n: number) => (total ? Math.round((n / total) * 1000) / 10 : 0);
    return [
      { label: 'Complete', color: 'var(--up-status-ready)', value: pct(ready) },
      { label: 'Missing fields', color: 'var(--up-chart-3)', value: pct(missing) },
      { label: 'Ineligible', color: 'var(--up-status-error)', value: pct(ineligible) },
    ];
  });

  protected readonly categories: IssueCategory[] = [
    {
      key: 'collateral',
      title: 'Collateral & Appraisal',
      icon: 'pi pi-home',
      completeness: 91,
      issues: [
        { field: 'appraisedValue', rule: 'Required for imported loans', affected: 12, severity: 'critical' },
        { field: 'propertyType', rule: 'Must match agency code list', affected: 7, severity: 'warning' },
        { field: 'appraisalDate', rule: 'Older than 120 days', affected: 19, severity: 'info' },
      ],
    },
    {
      key: 'borrower',
      title: 'Borrower & Credit',
      icon: 'pi pi-user',
      completeness: 96,
      issues: [
        { field: 'creditScore', rule: 'Missing co-borrower score', affected: 9, severity: 'warning' },
        { field: 'dtiRatio', rule: 'Exceeds 50% — verify income docs', affected: 4, severity: 'critical' },
      ],
    },
    {
      key: 'pricing',
      title: 'Pricing Inputs',
      icon: 'pi pi-dollar',
      completeness: 88,
      issues: [
        { field: 'noteRate', rule: 'Outside rate-sheet bounds', affected: 6, severity: 'critical' },
        { field: 'escrowWaiver', rule: 'Flag missing for released servicing', affected: 23, severity: 'warning' },
        { field: 'lockExpiration', rule: 'Expires within 48 hours', affected: 31, severity: 'info' },
      ],
    },
  ];

  protected issuesFor(category: IssueCategory): QualityIssue[] {
    const f = this.severityFilter();
    return f === 'all' ? category.issues : category.issues.filter((i) => i.severity === f);
  }

  protected severityTag(s: IssueSeverity): 'danger' | 'warn' | 'info' {
    return s === 'critical' ? 'danger' : s === 'warning' ? 'warn' : 'info';
  }

  protected openValidation(): void {
    this.validationVisible.set(true);
  }

  protected runValidation(): void {
    this.validationVisible.set(false);
    this.validating.set(true);
    setTimeout(() => {
      this.validating.set(false);
      this.messages.add({
        severity: 'success',
        summary: 'Validation complete',
        detail: '1,245 loans checked — 111 issues across 8 rules.',
        life: 4000,
      });
    }, 1600);
  }
}
