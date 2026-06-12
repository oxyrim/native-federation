/**
 * =====================================================================
 * GOVERNANCE REGISTRY
 * =====================================================================
 * Declares, per channel: who may publish, who may subscribe, whether the
 * last value is retained for late subscribers, and a runtime validator
 * that re-checks payload shape at the boundary (defence in depth — the
 * remote may have been built against an older contract version).
 * =====================================================================
 */
import type { AppId, ChannelMap, ChannelName } from './contracts.js';

export interface ChannelPolicy<C extends ChannelName = ChannelName> {
  /** Team/app owning the contract — used in error messages and audits. */
  readonly owner: AppId;
  readonly description: string;
  readonly allowedPublishers: readonly AppId[];
  /** '*' = any connected app may subscribe. */
  readonly allowedSubscribers: readonly AppId[] | '*';
  /** Replay last value to late subscribers (state-like channels). */
  readonly retained: boolean;
  /** Runtime structural validation of the payload. */
  readonly validate: (payload: unknown) => payload is ChannelMap[C];
}

const isString = (v: unknown): v is string => typeof v === 'string';
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isNumberOrNull = (v: unknown): v is number | null => v === null || isNumber(v);
const isStringArray = (v: unknown): v is readonly string[] =>
  Array.isArray(v) && v.every(isString);
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;

export const CHANNEL_POLICIES: { [C in ChannelName]: ChannelPolicy<C> } = {
  'pipeline/summary': {
    owner: 'mfe1-pipeline',
    description: 'Aggregated loan-pipeline KPIs (totals, UPB, status breakdown).',
    allowedPublishers: ['mfe1-pipeline'],
    allowedSubscribers: '*',
    retained: true,
    validate: (p): p is ChannelMap['pipeline/summary'] =>
      isObject(p) &&
      isNumber(p['totalLoans']) &&
      isNumber(p['totalUpb']) &&
      isNumber(p['readyForPricing']) &&
      isNumber(p['readyUpb']) &&
      isNumber(p['missingData']) &&
      isNumber(p['missingUpb']) &&
      isNumber(p['ineligible']) &&
      isNumber(p['fromDesktopUnderwriter']) &&
      isNumber(p['importedByUser']) &&
      isString(p['asOf']),
  },
  'pipeline/selection': {
    owner: 'mfe1-pipeline',
    description: 'Currently selected loans in the pipeline grid.',
    allowedPublishers: ['mfe1-pipeline'],
    allowedSubscribers: '*',
    retained: true,
    validate: (p): p is ChannelMap['pipeline/selection'] =>
      isObject(p) &&
      isStringArray(p['selectedLoanIds']) &&
      isNumber(p['totalSelectedUpb']) &&
      isString(p['asOf']),
  },
  'pricing/refresh': {
    owner: 'shell',
    description: 'Command: re-price the given loans. Analytics may NOT trigger pricing.',
    allowedPublishers: ['shell', 'mfe1-pipeline'],
    allowedSubscribers: ['shell', 'mfe1-pipeline'],
    retained: false,
    validate: (p): p is ChannelMap['pricing/refresh'] =>
      isObject(p) &&
      isStringArray(p['loanIds']) &&
      isString(p['requestedBy']) &&
      (p['reason'] === 'manual' ||
        p['reason'] === 'stale-data' ||
        p['reason'] === 'commitment-proposal'),
  },
  'session/user': {
    owner: 'shell',
    description: 'Authenticated user context. Only the shell owns the session.',
    allowedPublishers: ['shell'],
    allowedSubscribers: '*',
    retained: true,
    validate: (p): p is ChannelMap['session/user'] =>
      isObject(p) &&
      isString(p['userId']) &&
      isString(p['displayName']) &&
      isString(p['initials']) &&
      (p['role'] === 'trader' || p['role'] === 'analyst' || p['role'] === 'admin') &&
      isString(p['organization']),
  },
  'navigation/request': {
    owner: 'shell',
    description: 'Ask the shell to navigate to an app-level route.',
    allowedPublishers: ['mfe1-pipeline', 'mfe2-analytics'],
    allowedSubscribers: ['shell'],
    retained: false,
    validate: (p): p is ChannelMap['navigation/request'] =>
      isObject(p) && isString(p['path']) && isString(p['requestedBy']),
  },
  'ui/theme': {
    owner: 'shell',
    description: 'Active color scheme. Only the shell owns the theme switch.',
    allowedPublishers: ['shell'],
    allowedSubscribers: '*',
    retained: true,
    validate: (p): p is ChannelMap['ui/theme'] =>
      isObject(p) &&
      (p['theme'] === 'light' || p['theme'] === 'dark') &&
      isString(p['setBy']) &&
      isString(p['asOf']),
  },
  'notifications/broadcast': {
    owner: 'shell',
    description:
      'Ad-hoc cross-app message. Any app may publish or subscribe — used to demonstrate ' +
      'mfe-to-mfe, shell-to-mfe, and mfe-to-shell delivery over the shared bus.',
    allowedPublishers: ['shell', 'mfe1-pipeline', 'mfe2-analytics'],
    allowedSubscribers: '*',
    retained: false,
    validate: (p): p is ChannelMap['notifications/broadcast'] =>
      isObject(p) &&
      isString(p['id']) &&
      isString(p['from']) &&
      isString(p['message']) &&
      (p['level'] === 'info' || p['level'] === 'success' || p['level'] === 'warning') &&
      isString(p['asOf']),
  },
};

/** Raised whenever a publish/subscribe violates the registry. */
export class GovernanceViolationError extends Error {
  constructor(
    readonly appId: AppId,
    readonly channel: string,
    readonly kind: 'publish-denied' | 'subscribe-denied' | 'invalid-payload' | 'unknown-channel',
    detail: string,
  ) {
    super(`[loan-bridge] ${kind} — app "${appId}" on channel "${channel}": ${detail}`);
    this.name = 'GovernanceViolationError';
  }
}

export interface AuditEntry {
  readonly at: string;
  readonly appId: AppId;
  readonly channel: string;
  readonly action: 'publish' | 'subscribe' | 'denied';
  readonly detail?: string;
}
