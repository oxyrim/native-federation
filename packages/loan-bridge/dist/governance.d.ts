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
export declare const CHANNEL_POLICIES: {
    [C in ChannelName]: ChannelPolicy<C>;
};
/** Raised whenever a publish/subscribe violates the registry. */
export declare class GovernanceViolationError extends Error {
    readonly appId: AppId;
    readonly channel: string;
    readonly kind: 'publish-denied' | 'subscribe-denied' | 'invalid-payload' | 'unknown-channel';
    constructor(appId: AppId, channel: string, kind: 'publish-denied' | 'subscribe-denied' | 'invalid-payload' | 'unknown-channel', detail: string);
}
export interface AuditEntry {
    readonly at: string;
    readonly appId: AppId;
    readonly channel: string;
    readonly action: 'publish' | 'subscribe' | 'denied';
    readonly detail?: string;
}
