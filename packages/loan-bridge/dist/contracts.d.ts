/**
 * =====================================================================
 * SHARED DATA CONTRACTS
 * =====================================================================
 * This file is the single source of truth for WHAT data may cross a
 * microfrontend boundary. If a type is not declared here, it cannot be
 * published on the bus — neither at compile time (the ChannelMap keys
 * are a closed union) nor at runtime (the governance registry rejects
 * unregistered channels).
 *
 * The library is intentionally framework-agnostic: no Angular, no RxJS,
 * no DOM-framework imports. Plain TypeScript + plain functions only,
 * so an Angular 21 shell, an Angular 19 web component, or even a React
 * remote can all consume the very same singleton instance.
 * =====================================================================
 */
/** Applications allowed to connect to the bus. Closed union = governance. */
export type AppId = 'shell' | 'mfe1-pipeline' | 'mfe2-analytics';
export type LoanSource = 'DU' | 'Imported';
export type LoanStatus = 'Ready for Pricing' | 'Missing Data' | 'Ineligible';
export type ServicingType = 'Retained' | 'Released';
export interface LoanSummary {
    readonly sellerLoanId: string;
    readonly source: LoanSource;
    readonly caseFileId: string | null;
    readonly productName: string;
    readonly servicing: ServicingType;
    readonly basePrice: number | null;
    readonly srp: number | null;
    readonly llpa: number | null;
    readonly allInPrice: number | null;
    readonly upb: number;
    readonly lastUpdated: string;
    readonly status: LoanStatus;
}
export interface PipelineSummaryUpdated {
    readonly totalLoans: number;
    readonly totalUpb: number;
    readonly readyForPricing: number;
    readonly readyUpb: number;
    readonly missingData: number;
    readonly missingUpb: number;
    readonly ineligible: number;
    readonly fromDesktopUnderwriter: number;
    readonly importedByUser: number;
    readonly asOf: string;
}
export interface LoanSelectionChanged {
    readonly selectedLoanIds: readonly string[];
    readonly totalSelectedUpb: number;
    readonly asOf: string;
}
export interface PricingRefreshRequested {
    readonly loanIds: readonly string[];
    readonly requestedBy: AppId;
    readonly reason: 'manual' | 'stale-data' | 'commitment-proposal';
}
export interface UserContextChanged {
    readonly userId: string;
    readonly displayName: string;
    readonly initials: string;
    readonly role: 'trader' | 'analyst' | 'admin';
    readonly organization: string;
}
export interface NavigationRequested {
    /** Absolute in-app path, e.g. `/pipeline/loans/CF-2024-00012345` */
    readonly path: string;
    readonly requestedBy: AppId;
}
export interface ThemePreferenceChanged {
    readonly theme: 'light' | 'dark';
    readonly setBy: AppId;
    readonly asOf: string;
}
/**
 * Ad-hoc, ephemeral cross-app message. Any connected app may publish or
 * subscribe — this is the "any-to-any" channel used to demonstrate
 * mfe-to-mfe, shell-to-mfe, and mfe-to-shell delivery over the same bus.
 */
export interface BroadcastNotification {
    readonly id: string;
    readonly from: AppId;
    readonly message: string;
    readonly level: 'info' | 'success' | 'warning';
    readonly asOf: string;
}
/**
 * The closed map of channels → payload types.
 * Adding a channel REQUIRES a code review of this file: that is the
 * governance gate for introducing new cross-MFE data flows.
 */
export interface ChannelMap {
    'pipeline/summary': PipelineSummaryUpdated;
    'pipeline/selection': LoanSelectionChanged;
    'pricing/refresh': PricingRefreshRequested;
    'session/user': UserContextChanged;
    'navigation/request': NavigationRequested;
    'ui/theme': ThemePreferenceChanged;
    'notifications/broadcast': BroadcastNotification;
}
export type ChannelName = keyof ChannelMap;
