/**
 * =====================================================================
 * TYPED, GOVERNED EVENT BUS — framework-agnostic core
 * =====================================================================
 * Why not an Angular injectable singleton?
 *  - The shell (Angular 21) and MFE2 (Angular 19 web component) are two
 *    separate Angular platforms with two separate injector trees. An
 *    @Injectable({providedIn:'root'}) service would be instantiated
 *    once PER PLATFORM → two "singletons", no shared state.
 *  - @angular/core cannot be shared across major versions via the
 *    federation import map, so even module-level state inside an
 *    Angular library is duplicated per bundle.
 * Therefore the singleton is anchored on `globalThis` under a
 * versioned Symbol key — one instance per browser tab, regardless of
 * framework, framework version, or bundler that loaded it.
 * =====================================================================
 */
import type { AppId, ChannelMap, ChannelName } from './contracts.js';
import { AuditEntry } from './governance.js';
export type Handler<C extends ChannelName> = (payload: ChannelMap[C]) => void;
export type Unsubscribe = () => void;
export interface PublishResult {
    readonly delivered: number;
    readonly channel: ChannelName;
}
export declare class LoanBridge {
    static readonly VERSION = "1.1.0";
    private readonly subscriptions;
    private readonly retainedValues;
    private readonly audit;
    private readonly auditListeners;
    private policyOf;
    publish<C extends ChannelName>(appId: AppId, channel: C, payload: ChannelMap[C]): PublishResult;
    subscribe<C extends ChannelName>(appId: AppId, channel: C, handler: Handler<C>): Unsubscribe;
    /** Latest retained value, if the channel retains and one was published. */
    current<C extends ChannelName>(appId: AppId, channel: C): ChannelMap[C] | undefined;
    auditLog(): readonly AuditEntry[];
    /** Live audit feed — lets a governance UI update without polling. */
    subscribeAudit(listener: (entry: AuditEntry) => void): Unsubscribe;
    private record;
}
/** What each MFE actually uses: appId is bound once, then type-safe pub/sub. */
export interface BridgeClient {
    readonly appId: AppId;
    publish<C extends ChannelName>(channel: C, payload: ChannelMap[C]): PublishResult;
    subscribe<C extends ChannelName>(channel: C, handler: Handler<C>): Unsubscribe;
    current<C extends ChannelName>(channel: C): ChannelMap[C] | undefined;
    /** Resolves with the next value (or the retained one). Rejects on timeout. */
    waitFor<C extends ChannelName>(channel: C, timeoutMs?: number): Promise<ChannelMap[C]>;
    auditLog(): readonly AuditEntry[];
    /** Live audit feed (auto-removed by dispose()). */
    subscribeAudit(listener: (entry: AuditEntry) => void): Unsubscribe;
    /**
     * Removes every subscription this client created. Call from the host
     * framework's teardown (ngOnDestroy / disconnectedCallback) so a removed
     * micro frontend cannot leak handlers into the long-lived page.
     */
    dispose(): void;
}
/**
 * Entry point for every microfrontend.
 * The same tab always yields the same LoanBridge instance — even when the
 * callers were bundled by different builds / framework versions.
 */
export declare function connectToBridge(appId: AppId): BridgeClient;
