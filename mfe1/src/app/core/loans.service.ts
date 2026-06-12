import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { LoanSummary, LoanSource, LoanStatus, ServicingType } from '@loan/bridge';
import { PipelineBridgeService } from './bridge.service';

/** The 8 rows visible in the reference design — kept verbatim. */
const REFERENCE_LOANS: LoanSummary[] = [
  { sellerLoanId: 'SL-78912345', source: 'DU', caseFileId: 'CF-2024-00012345', productName: '30YR Fixed Standard', servicing: 'Retained', basePrice: 100.25, srp: null, llpa: null, allInPrice: 101.5, upb: 325000, lastUpdated: 'Today, 9:15 AM', status: 'Ready for Pricing' },
  { sellerLoanId: 'SL-78912346', source: 'DU', caseFileId: 'CF-2024-00012346', productName: '15YR Fixed Standard', servicing: 'Released', basePrice: 99.875, srp: 100.625, llpa: 0.0, allInPrice: 100.6, upb: 215000, lastUpdated: 'Today, 8:42 AM', status: 'Ready for Pricing' },
  { sellerLoanId: 'SL-78912347', source: 'DU', caseFileId: 'CF-2024-00012347', productName: '30YR Fixed Standard', servicing: 'Released', basePrice: 100.125, srp: 101.25, llpa: 0.125, allInPrice: 101.25, upb: 305000, lastUpdated: '2h ago', status: 'Ready for Pricing' },
  { sellerLoanId: 'SL-IMP-0000567', source: 'Imported', caseFileId: null, productName: '15YR Fixed High Balance', servicing: 'Released', basePrice: 99.95, srp: 100.9, llpa: -0.1, allInPrice: 100.9, upb: 425000, lastUpdated: '1h ago', status: 'Missing Data' },
  { sellerLoanId: 'SL-78912348', source: 'DU', caseFileId: 'CF-2024-00012348', productName: '30YR Fixed Standard', servicing: 'Retained', basePrice: 99.625, srp: null, llpa: null, allInPrice: 100.625, upb: 278000, lastUpdated: 'Yesterday, 5:21 PM', status: 'Ready for Pricing' },
  { sellerLoanId: 'SL-IMP-0000568', source: 'Imported', caseFileId: null, productName: '30YR Fixed Jumbo', servicing: 'Retained', basePrice: 100.25, srp: 100.85, llpa: 0.75, allInPrice: 100.85, upb: 612000, lastUpdated: 'Yesterday, 4:05 PM', status: 'Missing Data' },
  { sellerLoanId: 'SL-78912349', source: 'DU', caseFileId: 'CF-2024-00012349', productName: '30YR Fixed Standard', servicing: 'Released', basePrice: 100.125, srp: null, llpa: null, allInPrice: 101.125, upb: 192000, lastUpdated: 'Yesterday, 3:11 PM', status: 'Ready for Pricing' },
  { sellerLoanId: 'SL-IMP-0000569', source: 'Imported', caseFileId: null, productName: '30YR Fixed Standard', servicing: 'Retained', basePrice: 100.25, srp: 101.125, llpa: 0.125, allInPrice: 101.63, upb: 236000, lastUpdated: 'Yesterday, 2:18 PM', status: 'Missing Data' },
];

export const PRODUCTS = [
  '30YR Fixed Standard',
  '15YR Fixed Standard',
  '30YR Fixed Jumbo',
  '15YR Fixed High Balance',
  '20YR Fixed Standard',
  '30YR Fixed High Balance',
];

/** Deterministic pseudo-random — same pipeline on every load. */
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateLoans(): LoanSummary[] {
  const rnd = mulberry32(20240612);
  const loans: LoanSummary[] = [...REFERENCE_LOANS];

  // Targets so the KPI cards match the reference design:
  // total 1,245 · DU 1,012 / Imported 233 · ready 980 / missing 120 / ineligible 145
  const remaining = 1245 - REFERENCE_LOANS.length;
  let importedLeft = 233 - 3;
  let missingLeft = 120 - 3;
  let ineligibleLeft = 145;

  for (let i = 0; i < remaining; i++) {
    const imported = importedLeft > 0 && rnd() < importedLeft / (remaining - i);
    if (imported) importedLeft--;

    let status: LoanStatus = 'Ready for Pricing';
    const slotsLeft = remaining - i;
    if (missingLeft > 0 && rnd() < missingLeft / slotsLeft) {
      status = 'Missing Data';
      missingLeft--;
    } else if (ineligibleLeft > 0 && rnd() < ineligibleLeft / (slotsLeft - missingLeft)) {
      status = 'Ineligible';
      ineligibleLeft--;
    }

    const source: LoanSource = imported ? 'Imported' : 'DU';
    const servicing: ServicingType = rnd() < 0.45 ? 'Retained' : 'Released';
    const basePrice = Math.round((99.25 + rnd() * 1.5) * 1000) / 1000;
    const srp = servicing === 'Released' ? Math.round((basePrice + 0.4 + rnd() * 0.8) * 1000) / 1000 : null;
    const llpa = servicing === 'Released' ? Math.round((rnd() * 0.9 - 0.15) * 1000) / 1000 : null;
    const allIn = Math.round((basePrice + (srp ? 0.4 : 1.0) + rnd() * 0.4) * 1000) / 1000;
    const upb = Math.round((150000 + rnd() * 530000) / 1000) * 1000;
    const daysAgo = Math.floor(rnd() * 6) + 1;

    loans.push({
      sellerLoanId: imported ? `SL-IMP-${String(600 + i).padStart(7, '0')}` : `SL-789${String(12350 + i)}`,
      source,
      caseFileId: imported ? null : `CF-2024-${String(12350 + i).padStart(8, '0')}`,
      productName: PRODUCTS[Math.floor(rnd() * PRODUCTS.length)],
      servicing,
      basePrice: status === 'Ineligible' ? null : basePrice,
      srp,
      llpa,
      allInPrice: status === 'Ready for Pricing' ? allIn : status === 'Missing Data' ? allIn : null,
      upb,
      lastUpdated: `${daysAgo}d ago`,
      status,
    });
  }
  return loans;
}

@Injectable({ providedIn: 'root' })
export class LoansService {
  private readonly bridge = inject(PipelineBridgeService);

  readonly loans = signal<LoanSummary[]>(generateLoans());
  readonly selected = signal<LoanSummary[]>([]);

  readonly totalLoans = computed(() => this.loans().length);
  readonly totalUpb = computed(() => this.loans().reduce((s, l) => s + l.upb, 0));
  readonly ready = computed(() => this.loans().filter((l) => l.status === 'Ready for Pricing'));
  readonly missing = computed(() => this.loans().filter((l) => l.status === 'Missing Data'));
  readonly ineligible = computed(() => this.loans().filter((l) => l.status === 'Ineligible'));
  readonly duCount = computed(() => this.loans().filter((l) => l.source === 'DU').length);
  readonly importedCount = computed(() => this.loans().filter((l) => l.source === 'Imported').length);

  readonly readyUpb = computed(() => this.ready().reduce((s, l) => s + l.upb, 0));
  readonly missingUpb = computed(() => this.missing().reduce((s, l) => s + l.upb, 0));

  readonly selectedUpb = computed(() => this.selected().reduce((s, l) => s + l.upb, 0));

  constructor() {
    // GOVERNED DATA OUT — pipeline summary (retained channel, mfe1 is owner).
    effect(() => {
      this.bridge.client.publish('pipeline/summary', {
        totalLoans: this.totalLoans(),
        totalUpb: this.totalUpb(),
        readyForPricing: this.ready().length,
        readyUpb: this.ready().reduce((s, l) => s + l.upb, 0),
        missingData: this.missing().length,
        missingUpb: this.missing().reduce((s, l) => s + l.upb, 0),
        ineligible: this.ineligible().length,
        fromDesktopUnderwriter: this.duCount(),
        importedByUser: this.importedCount(),
        asOf: new Date().toISOString(),
      });
    });

    // GOVERNED DATA OUT — selection (retained).
    effect(() => {
      this.bridge.client.publish('pipeline/selection', {
        selectedLoanIds: this.selected().map((l) => l.sellerLoanId),
        totalSelectedUpb: this.selectedUpb(),
        asOf: new Date().toISOString(),
      });
    });

    // GOVERNED COMMAND IN — pricing refresh requests (from shell or mfe1).
    this.bridge.client.subscribe('pricing/refresh', (req) => {
      this.loans.update((all) =>
        all.map((l) =>
          req.loanIds.includes(l.sellerLoanId) ? { ...l, lastUpdated: 'Just now' } : l,
        ),
      );
    });
  }

  byId(id: string): LoanSummary | undefined {
    return this.loans().find((l) => l.sellerLoanId === id || l.caseFileId === id);
  }

  requestPricingRefresh(): void {
    this.bridge.client.publish('pricing/refresh', {
      loanIds: this.selected().map((l) => l.sellerLoanId),
      requestedBy: 'mfe1-pipeline',
      reason: 'manual',
    });
  }

  /**
   * Simulates a pricing-engine run: nudges every priced loan's all-in price
   * by a small random delta and marks it freshly updated, then announces
   * the refresh on the governed `pricing/refresh` channel (visible in the
   * bridge audit log in Reports & Analytics).
   */
  rerunPricing(): void {
    const repriced: string[] = [];
    this.loans.update((all) =>
      all.map((l) => {
        if (l.allInPrice === null) return l;
        const jitter = Math.round((Math.random() - 0.5) * 0.25 * 1000) / 1000;
        repriced.push(l.sellerLoanId);
        return {
          ...l,
          allInPrice: Math.round((l.allInPrice + jitter) * 1000) / 1000,
          lastUpdated: 'Just now',
        };
      }),
    );

    this.bridge.client.publish('pricing/refresh', {
      loanIds: repriced,
      requestedBy: 'mfe1-pipeline',
      reason: 'stale-data',
    });
  }
}
