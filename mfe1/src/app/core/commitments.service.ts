import { Injectable, computed, inject, signal } from '@angular/core';
import { LoansService } from './loans.service';

export type CommitmentStatus = 'Open' | 'Pending' | 'Fulfilled';

export interface Commitment {
  readonly id: string;
  readonly product: string;
  readonly loans: number;
  readonly upb: number;
  readonly price: number;
  readonly expires: string;
  readonly status: CommitmentStatus;
}

/** The 5 rows visible in the reference design — kept verbatim as seed data. */
const REFERENCE_COMMITMENTS: Commitment[] = [
  { id: 'CMT-2024-0091', product: '30YR Fixed Standard', loans: 42, upb: 14250000, price: 101.125, expires: 'Jun 21, 2026', status: 'Open' },
  { id: 'CMT-2024-0090', product: '15YR Fixed Standard', loans: 18, upb: 4820000, price: 100.5, expires: 'Jun 18, 2026', status: 'Pending' },
  { id: 'CMT-2024-0089', product: '30YR Fixed Jumbo', loans: 9, upb: 6480000, price: 100.875, expires: 'Jun 14, 2026', status: 'Open' },
  { id: 'CMT-2024-0088', product: '30YR Fixed High Balance', loans: 25, upb: 11930000, price: 101.25, expires: 'Jun 12, 2026', status: 'Fulfilled' },
  { id: 'CMT-2024-0087', product: '20YR Fixed Standard', loans: 12, upb: 3270000, price: 100.375, expires: 'Jun 10, 2026', status: 'Fulfilled' },
];

const STATUS_ORDER: readonly CommitmentStatus[] = ['Open', 'Pending', 'Fulfilled'];

export interface NewCommitmentInput {
  readonly product: string;
  readonly loans: number;
  readonly upb: number;
  readonly price: number;
  readonly expiresInDays: number;
}

/**
 * Stateful, signal-based store for the Commitment Pipeline page. Decoupled
 * from LoansService so a commitment can be created either from a manual
 * form ("New Commitment") or derived from the current pipeline selection
 * ("Propose from Selection").
 */
@Injectable({ providedIn: 'root' })
export class CommitmentsService {
  private readonly loansService = inject(LoansService);
  private nextSeq = 92;

  readonly commitments = signal<Commitment[]>(REFERENCE_COMMITMENTS);

  readonly openCount = computed(() => this.commitments().filter((c) => c.status === 'Open').length);
  readonly pendingCount = computed(() => this.commitments().filter((c) => c.status === 'Pending').length);
  readonly fulfilledCount = computed(() => this.commitments().filter((c) => c.status === 'Fulfilled').length);
  readonly totalUpb = computed(() => this.commitments().reduce((sum, c) => sum + c.upb, 0));

  /** Builds a commitment from the loans currently selected in the pipeline, and clears the selection. */
  proposeFromSelection(): Commitment | null {
    const selected = this.loansService.selected();
    if (!selected.length) return null;

    const upb = selected.reduce((sum, l) => sum + l.upb, 0);
    const priced = selected.filter((l) => l.allInPrice !== null);
    const avgPrice = priced.length
      ? priced.reduce((sum, l) => sum + (l.allInPrice ?? 0), 0) / priced.length
      : 100;

    const productCounts = new Map<string, number>();
    for (const l of selected) {
      productCounts.set(l.productName, (productCounts.get(l.productName) ?? 0) + 1);
    }
    const [product] = [...productCounts.entries()].sort((a, b) => b[1] - a[1])[0];

    const commitment = this.add({
      product,
      loans: selected.length,
      upb,
      price: Math.round(avgPrice * 1000) / 1000,
      expiresInDays: 14,
    });

    this.loansService.selected.set([]);
    return commitment;
  }

  /** Builds a commitment from manually entered values ("New Commitment" dialog). */
  add(input: NewCommitmentInput): Commitment {
    const commitment: Commitment = {
      id: `CMT-2024-${String(this.nextSeq++).padStart(4, '0')}`,
      product: input.product,
      loans: input.loans,
      upb: input.upb,
      price: input.price,
      expires: formatExpiry(input.expiresInDays),
      status: 'Open',
    };
    this.commitments.update((list) => [commitment, ...list]);
    return commitment;
  }

  /** Cycles Open -> Pending -> Fulfilled (terminal). */
  advance(id: string): void {
    this.commitments.update((list) =>
      list.map((c) => {
        if (c.id !== id) return c;
        const next = STATUS_ORDER[Math.min(STATUS_ORDER.indexOf(c.status) + 1, STATUS_ORDER.length - 1)];
        return { ...c, status: next };
      }),
    );
  }
}

function formatExpiry(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
