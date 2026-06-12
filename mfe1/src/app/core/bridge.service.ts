import { Injectable, signal } from '@angular/core';
import {
  BridgeClient,
  BroadcastNotification,
  UserContextChanged,
  connectToBridge,
} from '@loan/bridge';

/**
 * Angular adapter for MFE1 over the framework-agnostic @loan/bridge.
 * The underlying bus instance is the SAME object the shell and the
 * Angular 19 web component use (globalThis singleton).
 */
@Injectable({ providedIn: 'root' })
export class PipelineBridgeService {
  readonly client: BridgeClient = connectToBridge('mfe1-pipeline');

  readonly user = signal<UserContextChanged | null>(null);

  /** Rolling feed of cross-app broadcasts (mfe-mfe / shell-mfe / mfe-shell demo). */
  readonly messages = signal<readonly BroadcastNotification[]>([]);

  constructor() {
    this.client.subscribe('session/user', (u) => this.user.set(u));

    // Any-to-any demo channel: receives messages from the shell (shell-mfe)
    // and from mfe2 (mfe-mfe) over the same shared bus.
    this.client.subscribe('notifications/broadcast', (msg) => {
      this.messages.update((list) => [msg, ...list].slice(0, 8));
    });
  }

  /** Send an ad-hoc message to every other connected app (mfe-mfe / mfe-shell demo). */
  notify(message: string, level: BroadcastNotification['level'] = 'info'): void {
    this.client.publish('notifications/broadcast', {
      id: crypto.randomUUID(),
      from: 'mfe1-pipeline',
      message,
      level,
      asOf: new Date().toISOString(),
    });
  }
}
