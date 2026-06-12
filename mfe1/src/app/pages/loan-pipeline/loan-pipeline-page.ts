import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { RadioButtonModule } from 'primeng/radiobutton';
import { SelectModule } from 'primeng/select';
import { ChartModule } from 'primeng/chart';
import { MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';
import { MultiSelectModule } from 'primeng/multiselect';
import { LoanSummary, LoanStatus } from '@loan/bridge';
import { upTokens } from '@loan/design-tokens';
import { LoansService } from '../../core/loans.service';

type IdentifierKind = 'case' | 'seller';

@Component({
  selector: 'app-loan-pipeline-page',
  imports: [
    CurrencyPipe,
    DecimalPipe,
    FormsModule,
    RouterLink,
    TableModule,
    ButtonModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    RadioButtonModule,
    SelectModule,
    ChartModule,
    MenuModule,
    TooltipModule,
    MultiSelectModule,
  ],
  templateUrl: './loan-pipeline-page.html',
  styleUrl: './loan-pipeline-page.scss',
})
export class LoanPipelinePage {
  protected readonly loansService = inject(LoansService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /* ------------------------------ filters ------------------------------ */
  protected readonly search = signal('');
  protected readonly identifierKind = signal<IdentifierKind>('case');
  protected readonly dateRange = signal('7d');
  protected readonly showFilters = signal(false);
  protected readonly statusFilter = signal<LoanStatus[]>([]);

  protected readonly dateOptions = [
    { label: 'Last 7 Days', value: '7d' },
    { label: 'Last 30 Days', value: '30d' },
    { label: 'Last 90 Days', value: '90d' },
    { label: 'All Time', value: 'all' },
  ];

  protected readonly statusOptions: { label: LoanStatus; value: LoanStatus }[] = [
    { label: 'Ready for Pricing', value: 'Ready for Pricing' },
    { label: 'Missing Data', value: 'Missing Data' },
    { label: 'Ineligible', value: 'Ineligible' },
  ];

  protected readonly servicingOptions = [
    { label: 'Retained', value: 'Retained' },
    { label: 'Released', value: 'Released' },
  ];

  protected readonly pageSizeOptions = [
    { label: '10 / page', value: 10 },
    { label: '25 / page', value: 25 },
    { label: '50 / page', value: 50 },
  ];
  protected pageSize = 25;

  protected readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const kind = this.identifierKind();
    const statuses = this.statusFilter();
    return this.loansService.loans().filter((l) => {
      if (statuses.length && !statuses.includes(l.status)) return false;
      if (!q) return true;
      const field = kind === 'case' ? (l.caseFileId ?? '') : l.sellerLoanId;
      return field.toLowerCase().includes(q);
    });
  });

  /* ----------------------------- selection ----------------------------- */
  protected selectedRows: LoanSummary[] = [];

  protected onSelectionChange(rows: LoanSummary[]): void {
    this.selectedRows = rows;
    this.loansService.selected.set(rows);
  }

  protected clearSelection(): void {
    this.onSelectionChange([]);
  }

  /* ------------------------------- chart ------------------------------- */
  protected readonly donutData = computed(() => ({
    labels: ['From Desktop Underwriter', 'Imported by User'],
    datasets: [
      {
        data: [this.loansService.duCount(), this.loansService.importedCount()],
        backgroundColor: [upTokens.chart[0], upTokens.chart[1]],
        borderWidth: 0,
      },
    ],
  }));

  protected readonly donutOptions = {
    cutout: '68%',
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    responsive: true,
    maintainAspectRatio: false,
  };

  /* ------------------------------ actions ------------------------------ */
  protected rowMenuItems(loan: LoanSummary) {
    return [
      {
        label: 'View Details',
        icon: 'pi pi-eye',
        command: () => this.router.navigate(['loans', loan.sellerLoanId], { relativeTo: this.route }),
      },
      { label: 'Refresh Pricing', icon: 'pi pi-refresh' },
      { label: 'Remove from Pipeline', icon: 'pi pi-trash' },
    ];
  }

  protected refreshPricing(): void {
    this.loansService.requestPricingRefresh();
  }

  protected proposeCommitment(): void {
    this.router.navigate(['commitments'], { relativeTo: this.route.parent ?? this.route });
  }

  /* ----------------------------- formatting ---------------------------- */
  protected millions(value: number): string {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }

  protected duPercent(): number {
    const total = this.loansService.totalLoans();
    return total ? Math.round((this.loansService.duCount() / total) * 100) : 0;
  }

  protected llpaLabel(llpa: number | null): string {
    if (llpa === null) return '—';
    const abs = Math.abs(llpa).toFixed(3);
    return llpa < 0 ? `(${abs})` : abs;
  }
}
