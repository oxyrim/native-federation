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
import {
  AuditEntry,
  CHANNEL_POLICIES,
  ChannelPolicy,
  GovernanceViolationError,
} from './governance.js';

export type Handler<C extends ChannelName> = (payload: ChannelMap[C]) => void;
export type Unsubscribe = () => void;

export interface PublishResult {
  readonly delivered: number;
  readonly channel: ChannelName;
}

interface Subscription {
  readonly appId: AppId;
  readonly handler: Handler<ChannelName>;
}

/** Deep-freeze so no consumer can mutate state owned by another MFE. */
function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.getOwnPropertyNames(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

export class LoanBridge {
  static readonly VERSION = '1.1.0';

  private readonly subscriptions = new Map<ChannelName, Set<Subscription>>();
  private readonly retainedValues = new Map<ChannelName, ChannelMap[ChannelName]>();
  private readonly audit: AuditEntry[] = [];
  private readonly auditListeners = new Set<(entry: AuditEntry) => void>();

  private policyOf<C extends ChannelName>(appId: AppId, channel: C): ChannelPolicy<C> {
    const policy = CHANNEL_POLICIES[channel] as ChannelPolicy<C> | undefined;
    if (!policy) {
      throw new GovernanceViolationError(
        appId,
        channel,
        'unknown-channel',
        'channel is not declared in the governance registry',
      );
    }
    return policy;
  }

  publish<C extends ChannelName>(appId: AppId, channel: C, payload: ChannelMap[C]): PublishResult {
    const policy = this.policyOf(appId, channel);

    if (!policy.allowedPublishers.includes(appId)) {
      this.record(appId, channel, 'denied', 'publish not permitted');
      throw new GovernanceViolationError(
        appId,
        channel,
        'publish-denied',
        `allowed publishers: ${policy.allowedPublishers.join(', ')}`,
      );
    }
    if (!policy.validate(payload)) {
      this.record(appId, channel, 'denied', 'payload failed contract validation');
      throw new GovernanceViolationError(
        appId,
        channel,
        'invalid-payload',
        'payload does not match the declared contract',
      );
    }

    const frozen = deepFreeze(payload);
    if (policy.retained) {
      this.retainedValues.set(channel, frozen);
    }
    this.record(appId, channel, 'publish');

    let delivered = 0;
    for (const sub of this.subscriptions.get(channel) ?? []) {
      try {
        sub.handler(frozen);
        delivered++;
      } catch (err) {
        // One faulty consumer must never break the producer or siblings.
        console.error(`[loan-bridge] handler error in "${sub.appId}" on "${channel}"`, err);
      }
    }
    return { delivered, channel };
  }

  subscribe<C extends ChannelName>(appId: AppId, channel: C, handler: Handler<C>): Unsubscribe {
    const policy = this.policyOf(appId, channel);

    if (policy.allowedSubscribers !== '*' && !policy.allowedSubscribers.includes(appId)) {
      this.record(appId, channel, 'denied', 'subscribe not permitted');
      throw new GovernanceViolationError(
        appId,
        channel,
        'subscribe-denied',
        `allowed subscribers: ${(policy.allowedSubscribers as readonly string[]).join(', ')}`,
      );
    }

    const sub: Subscription = { appId, handler: handler as Handler<ChannelName> };
    let set = this.subscriptions.get(channel);
    if (!set) {
      set = new Set();
      this.subscriptions.set(channel, set);
    }
    set.add(sub);
    this.record(appId, channel, 'subscribe');

    if (policy.retained && this.retainedValues.has(channel)) {
      handler(this.retainedValues.get(channel) as ChannelMap[C]);
    }
    return () => set.delete(sub);
  }

  /** Latest retained value, if the channel retains and one was published. */
  current<C extends ChannelName>(appId: AppId, channel: C): ChannelMap[C] | undefined {
    const policy = this.policyOf(appId, channel);
    if (policy.allowedSubscribers !== '*' && !policy.allowedSubscribers.includes(appId)) {
      throw new GovernanceViolationError(appId, channel, 'subscribe-denied', 'read denied');
    }
    return this.retainedValues.get(channel) as ChannelMap[C] | undefined;
  }

  auditLog(): readonly AuditEntry[] {
    return [...this.audit];
  }

  /** Live audit feed — lets a governance UI update without polling. */
  subscribeAudit(listener: (entry: AuditEntry) => void): Unsubscribe {
    this.auditListeners.add(listener);
    return () => this.auditListeners.delete(listener);
  }

  private record(appId: AppId, channel: string, action: AuditEntry['action'], detail?: string): void {
    const entry: AuditEntry = Object.freeze({
      at: new Date().toISOString(),
      appId,
      channel,
      action,
      ...(detail !== undefined ? { detail } : {}),
    });
    this.audit.push(entry);
    if (this.audit.length > 500) this.audit.shift();
    for (const listener of this.auditListeners) {
      try {
        listener(entry);
      } catch (err) {
        console.error('[loan-bridge] audit listener error', err);
      }
    }
  }
}

/* ------------------- per-app facade (ergonomic client) ------------------- */

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

/* --------------------- cross-bundle singleton anchor --------------------- */

const GLOBAL_KEY = Symbol.for('loan.unified-platform.bridge');

interface GlobalAnchor {
  version: string;
  instance: LoanBridge;
}

function acquireBridge(): LoanBridge {
  const g = globalThis as { [GLOBAL_KEY]?: GlobalAnchor };
  const existing = g[GLOBAL_KEY];
  if (existing) {
    const [major] = existing.version.split('.');
    if (major !== LoanBridge.VERSION.split('.')[0]) {
      throw new Error(
        `[loan-bridge] incompatible bridge versions loaded in one page: ` +
          `${existing.version} vs ${LoanBridge.VERSION}`,
      );
    }
    return existing.instance;
  }
  const instance = new LoanBridge();
  g[GLOBAL_KEY] = { version: LoanBridge.VERSION, instance };
  return instance;
}

/**
 * Entry point for every microfrontend.
 * The same tab always yields the same LoanBridge instance — even when the
 * callers were bundled by different builds / framework versions.
 */
export function connectToBridge(appId: AppId): BridgeClient {
  const bridge = acquireBridge();
  const owned = new Set<Unsubscribe>();

  const track = (unsub: Unsubscribe): Unsubscribe => {
    owned.add(unsub);
    return () => {
      owned.delete(unsub);
      unsub();
    };
  };

  return {
    appId,
    publish: (channel, payload) => bridge.publish(appId, channel, payload),
    subscribe: (channel, handler) => track(bridge.subscribe(appId, channel, handler)),
    current: (channel) => bridge.current(appId, channel),
    waitFor: <C extends ChannelName>(channel: C, timeoutMs = 10_000) =>
      new Promise<ChannelMap[C]>((resolve, reject) => {
        const timer = setTimeout(() => {
          unsub();
          reject(new Error(`[loan-bridge] timed out waiting for "${channel}" (${timeoutMs}ms)`));
        }, timeoutMs);
        const unsub = track(
          bridge.subscribe(appId, channel, (value) => {
            clearTimeout(timer);
            unsub();
            resolve(value);
          }),
        );
      }),
    auditLog: () => bridge.auditLog(),
    subscribeAudit: (listener) => track(bridge.subscribeAudit(listener)),
    dispose: () => {
      for (const unsub of owned) unsub();
      owned.clear();
    },
  };
}
