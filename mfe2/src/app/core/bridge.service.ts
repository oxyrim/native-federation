import { Injectable, signal } from '@angular/core';
import {
  BridgeClient,
  BroadcastNotification,
  GovernanceViolationError,
  LoanSelectionChanged,
  PipelineSummaryUpdated,
  UserContextChanged,
  connectToBridge,
} from '@loan/bridge';
import { UpTheme, getActiveTheme } from '@loan/design-tokens';

/**
 * Angular 19 adapter over the framework-agnostic bridge.
 * Because the bus instance lives on globalThis, this Angular 19 app reads
 * the SAME retained values MFE1 (Angular 21) published — across framework
 * versions and across the web-component boundary.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsBridgeService {
  readonly client: BridgeClient = connectToBridge('mfe2-analytics');

  readonly summary = signal<PipelineSummaryUpdated | null>(null);
  readonly selection = signal<LoanSelectionChanged | null>(null);
  readonly user = signal<UserContextChanged | null>(null);
  /**
   * Theme for JS consumers (chart.js cannot read CSS custom properties).
   * Initialised from the <html> attribute so it is correct even when this
   * remote boots before the shell publishes — then kept in sync via the
   * retained governed channel.
   */
  readonly theme = signal<UpTheme>(getActiveTheme());

  /** Rolling feed of cross-app broadcasts (mfe-mfe / shell-mfe / mfe-shell demo). */
  readonly messages = signal<readonly BroadcastNotification[]>([]);

  constructor() {
    this.client.subscribe('pipeline/summary', (s) => this.summary.set(s));
    this.client.subscribe('pipeline/selection', (s) => this.selection.set(s));
    this.client.subscribe('session/user', (u) => this.user.set(u));
    this.client.subscribe('ui/theme', (t) => this.theme.set(t.theme));

    // Any-to-any demo channel: receives messages from the shell (shell-mfe)
    // and from mfe1 (mfe-mfe) over the same shared bus.
    this.client.subscribe('notifications/broadcast', (msg) => {
      this.messages.update((list) => [msg, ...list].slice(0, 8));
    });
  }

  /** Send an ad-hoc message to every other connected app (mfe-mfe / mfe-shell demo). */
  notify(message: string, level: BroadcastNotification['level'] = 'info'): void {
    this.client.publish('notifications/broadcast', {
      id: crypto.randomUUID(),
      from: 'mfe2-analytics',
      message,
      level,
      asOf: new Date().toISOString(),
    });
  }

  /**
   * GOVERNANCE DEMO — analytics is not an allowed publisher on
   * 'pricing/refresh'. The bus rejects this at runtime with a typed error.
   */
  tryForbiddenPublish(): string {
    try {
      this.client.publish('pricing/refresh', {
        loanIds: ['SL-78912345'],
        requestedBy: 'mfe2-analytics',
        reason: 'manual',
      });
      return 'Unexpectedly allowed!';
    } catch (err) {
      return err instanceof GovernanceViolationError ? err.message : String(err);
    }
  }

  /** Allowed: ask the shell to navigate (governed command channel). */
  requestNavigation(path: string): void {
    this.client.publish('navigation/request', { path, requestedBy: 'mfe2-analytics' });
  }
}
