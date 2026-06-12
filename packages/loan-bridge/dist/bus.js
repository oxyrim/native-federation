import { CHANNEL_POLICIES, GovernanceViolationError, } from './governance.js';
/** Deep-freeze so no consumer can mutate state owned by another MFE. */
function deepFreeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
        Object.freeze(value);
        for (const key of Object.getOwnPropertyNames(value)) {
            deepFreeze(value[key]);
        }
    }
    return value;
}
export class LoanBridge {
    constructor() {
        this.subscriptions = new Map();
        this.retainedValues = new Map();
        this.audit = [];
        this.auditListeners = new Set();
    }
    policyOf(appId, channel) {
        const policy = CHANNEL_POLICIES[channel];
        if (!policy) {
            throw new GovernanceViolationError(appId, channel, 'unknown-channel', 'channel is not declared in the governance registry');
        }
        return policy;
    }
    publish(appId, channel, payload) {
        const policy = this.policyOf(appId, channel);
        if (!policy.allowedPublishers.includes(appId)) {
            this.record(appId, channel, 'denied', 'publish not permitted');
            throw new GovernanceViolationError(appId, channel, 'publish-denied', `allowed publishers: ${policy.allowedPublishers.join(', ')}`);
        }
        if (!policy.validate(payload)) {
            this.record(appId, channel, 'denied', 'payload failed contract validation');
            throw new GovernanceViolationError(appId, channel, 'invalid-payload', 'payload does not match the declared contract');
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
            }
            catch (err) {
                // One faulty consumer must never break the producer or siblings.
                console.error(`[loan-bridge] handler error in "${sub.appId}" on "${channel}"`, err);
            }
        }
        return { delivered, channel };
    }
    subscribe(appId, channel, handler) {
        const policy = this.policyOf(appId, channel);
        if (policy.allowedSubscribers !== '*' && !policy.allowedSubscribers.includes(appId)) {
            this.record(appId, channel, 'denied', 'subscribe not permitted');
            throw new GovernanceViolationError(appId, channel, 'subscribe-denied', `allowed subscribers: ${policy.allowedSubscribers.join(', ')}`);
        }
        const sub = { appId, handler: handler };
        let set = this.subscriptions.get(channel);
        if (!set) {
            set = new Set();
            this.subscriptions.set(channel, set);
        }
        set.add(sub);
        this.record(appId, channel, 'subscribe');
        if (policy.retained && this.retainedValues.has(channel)) {
            handler(this.retainedValues.get(channel));
        }
        return () => set.delete(sub);
    }
    /** Latest retained value, if the channel retains and one was published. */
    current(appId, channel) {
        const policy = this.policyOf(appId, channel);
        if (policy.allowedSubscribers !== '*' && !policy.allowedSubscribers.includes(appId)) {
            throw new GovernanceViolationError(appId, channel, 'subscribe-denied', 'read denied');
        }
        return this.retainedValues.get(channel);
    }
    auditLog() {
        return [...this.audit];
    }
    /** Live audit feed — lets a governance UI update without polling. */
    subscribeAudit(listener) {
        this.auditListeners.add(listener);
        return () => this.auditListeners.delete(listener);
    }
    record(appId, channel, action, detail) {
        const entry = Object.freeze({
            at: new Date().toISOString(),
            appId,
            channel,
            action,
            ...(detail !== undefined ? { detail } : {}),
        });
        this.audit.push(entry);
        if (this.audit.length > 500)
            this.audit.shift();
        for (const listener of this.auditListeners) {
            try {
                listener(entry);
            }
            catch (err) {
                console.error('[loan-bridge] audit listener error', err);
            }
        }
    }
}
LoanBridge.VERSION = '1.1.0';
/* --------------------- cross-bundle singleton anchor --------------------- */
const GLOBAL_KEY = Symbol.for('loan.unified-platform.bridge');
function acquireBridge() {
    const g = globalThis;
    const existing = g[GLOBAL_KEY];
    if (existing) {
        const [major] = existing.version.split('.');
        if (major !== LoanBridge.VERSION.split('.')[0]) {
            throw new Error(`[loan-bridge] incompatible bridge versions loaded in one page: ` +
                `${existing.version} vs ${LoanBridge.VERSION}`);
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
export function connectToBridge(appId) {
    const bridge = acquireBridge();
    const owned = new Set();
    const track = (unsub) => {
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
        waitFor: (channel, timeoutMs = 10000) => new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                unsub();
                reject(new Error(`[loan-bridge] timed out waiting for "${channel}" (${timeoutMs}ms)`));
            }, timeoutMs);
            const unsub = track(bridge.subscribe(appId, channel, (value) => {
                clearTimeout(timer);
                unsub();
                resolve(value);
            }));
        }),
        auditLog: () => bridge.auditLog(),
        subscribeAudit: (listener) => track(bridge.subscribeAudit(listener)),
        dispose: () => {
            for (const unsub of owned)
                unsub();
            owned.clear();
        },
    };
}
