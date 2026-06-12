import { Injectable, inject, signal } from '@angular/core';
import {
  BridgeClient,
  BroadcastNotification,
  LoanSelectionChanged,
  PipelineSummaryUpdated,
  UserContextChanged,
  connectToBridge,
} from '@loan/bridge';
import { UpTheme, applyTheme, initTheme } from '@loan/design-tokens';
import { Router } from '@angular/router';

/**
 * Thin ANGULAR ADAPTER around the framework-agnostic bridge.
 * The singleton lives on globalThis (inside @loan/bridge) — this service is
 * merely an ergonomic, signal-based facade for the shell's injector tree.
 */
@Injectable({ providedIn: 'root' })
export class ShellBridgeService {
  private readonly client: BridgeClient = connectToBridge('shell');
  private readonly router = inject(Router);

  readonly user = signal<UserContextChanged | null>(null);
  readonly selection = signal<LoanSelectionChanged | null>(null);
  readonly summary = signal<PipelineSummaryUpdated | null>(null);
  readonly theme = signal<UpTheme>('light');

  /** Rolling feed of cross-app broadcasts (mfe-mfe / shell-mfe / mfe-shell demo). */
  readonly messages = signal<readonly BroadcastNotification[]>([]);

  constructor() {
    // The shell owns the theme: resolve stored/system preference, apply the
    // <html> attribute, and broadcast on the retained governed channel so
    // chart-rendering MFEs (which cannot read CSS vars from chart.js) follow.
    this.publishTheme(initTheme());

    // The shell owns the session: publish the authenticated user once.
    const user: UserContextChanged = {
      userId: 'u-1001',
      displayName: 'Jane Smith',
      initials: 'JS',
      role: 'trader',
      organization: 'Unified Platform',
    };
    this.client.publish('session/user', user);
    this.user.set(user);

    this.client.subscribe('pipeline/selection', (sel) => this.selection.set(sel));
    this.client.subscribe('pipeline/summary', (sum) => this.summary.set(sum));

    // MFEs may request app-level navigation but never touch the URL directly.
    this.client.subscribe('navigation/request', (nav) => {
      this.router.navigateByUrl(nav.path);
    });

    // Any-to-any demo channel: mfe1 and mfe2 can reach the shell (mfe-shell)
    // and each other (mfe-mfe) over the same bus the shell uses (shell-mfe).
    this.client.subscribe('notifications/broadcast', (msg) => {
      this.messages.update((list) => [msg, ...list].slice(0, 8));
    });
  }

  refreshPricing(loanIds: readonly string[]): void {
    this.client.publish('pricing/refresh', {
      loanIds,
      requestedBy: 'shell',
      reason: 'manual',
    });
  }

  toggleTheme(): void {
    this.publishTheme(applyTheme(this.theme() === 'dark' ? 'light' : 'dark'));
  }

  /** Send an ad-hoc message to every other connected app (shell-mfe demo). */
  notify(message: string, level: BroadcastNotification['level'] = 'info'): void {
    this.client.publish('notifications/broadcast', {
      id: crypto.randomUUID(),
      from: 'shell',
      message,
      level,
      asOf: new Date().toISOString(),
    });
  }

  private publishTheme(theme: UpTheme): void {
    this.theme.set(theme);
    this.client.publish('ui/theme', {
      theme,
      setBy: 'shell',
      asOf: new Date().toISOString(),
    });
  }
}
