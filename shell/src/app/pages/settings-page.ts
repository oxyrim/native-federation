import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AppId } from '@loan/bridge';
import { ShellBridgeService } from '../core/bridge.service';

@Component({
  selector: 'app-settings-page',
  imports: [DatePipe, FormsModule, ToggleSwitchModule, SelectModule, ButtonModule, InputTextModule],
  template: `
    <div class="page">
      <h1 class="up-page-title">Settings</h1>
      <p class="up-page-subtitle">Platform-wide preferences (shell-owned).</p>

      <div class="up-card panel">
        <div class="row">
          <div>
            <strong>Auto-refresh pricing</strong>
            <p>Re-price the visible pipeline every 15 minutes.</p>
          </div>
          <p-toggleswitch [(ngModel)]="autoRefresh" />
        </div>
        <div class="row">
          <div>
            <strong>Email notifications</strong>
            <p>Send a digest when loans change status.</p>
          </div>
          <p-toggleswitch [(ngModel)]="notifications" />
        </div>
        <div class="row">
          <div>
            <strong>Default landing page</strong>
            <p>Shown after sign-in.</p>
          </div>
          <p-select [(ngModel)]="landing" [options]="landingOptions" optionLabel="label" optionValue="value" />
        </div>
        <div class="actions">
          <p-button label="Save Changes" size="small" />
        </div>
      </div>

      <!-- ================= CROSS-APP MESSAGING DEMO ================= -->
      <div class="up-card bridge-messenger">
        <h3><i class="pi pi-send"></i> Platform Messaging Console</h3>
        <p class="bm-hint">
          The shell, the Loan Pipeline (MFE1, Angular 21) and Reports &amp; Analytics (MFE2,
          Angular 19) all share one <code>&#64;loan/bridge</code> instance. A message sent from here
          reaches both remotes instantly (<strong>shell&nbsp;&rarr;&nbsp;mfe</strong>); messages
          sent from a remote land here too (<strong>mfe&nbsp;&rarr;&nbsp;shell</strong>) and on
          the other remote's feed (<strong>mfe&nbsp;&rarr;&nbsp;mfe</strong>) — open the
          Commitment Pipeline and Reports &amp; Analytics &rarr; Activity pages to watch it live.
        </p>
        <div class="bm-compose">
          <input
            pInputText
            type="text"
            placeholder="Message to Pipeline (MFE1) &amp; Analytics (MFE2)..."
            [(ngModel)]="draft"
            (keydown.enter)="send()"
          />
          <p-button label="Send" icon="pi pi-send" size="small" [disabled]="!draft().trim()" (onClick)="send()" />
        </div>
        <ul class="bm-feed">
          @for (m of bridge.messages(); track m.id) {
            <li [class]="m.level">
              <span class="bm-from">{{ appLabel(m.from) }}</span>
              <span class="bm-text">{{ m.message }}</span>
              <span class="bm-when">{{ m.asOf | date: 'HH:mm:ss' }}</span>
            </li>
          } @empty {
            <li class="bm-empty">No messages yet — send one, or trigger one from MFE1/MFE2.</li>
          }
        </ul>
      </div>
    </div>
  `,
  styles: [
    `
      .page {
        padding: var(--up-space-5) var(--up-space-6);
        max-width: 720px;
        display: flex;
        flex-direction: column;
        gap: var(--up-space-5);
      }
      .panel {
        padding: var(--up-space-5);
      }
      .row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--up-space-5);
        padding: var(--up-space-4) 0;
        border-bottom: 1px solid var(--up-border);

        p {
          margin: 4px 0 0;
          color: var(--up-text-secondary);
          font-size: var(--up-font-size-sm);
        }
      }
      .actions {
        padding-top: var(--up-space-4);
        display: flex;
        justify-content: flex-end;
      }
    `,
  ],
})
export class SettingsPage {
  protected readonly bridge = inject(ShellBridgeService);

  protected readonly draft = signal('');

  autoRefresh = true;
  notifications = false;
  landing = '/pipeline';
  readonly landingOptions = [
    { label: 'Loan Pipeline', value: '/pipeline' },
    { label: 'Reports & Analytics', value: '/analytics' },
  ];

  protected appLabel(appId: AppId): string {
    switch (appId) {
      case 'shell':
        return 'Shell';
      case 'mfe1-pipeline':
        return 'Pipeline (MFE1)';
      case 'mfe2-analytics':
        return 'Analytics (MFE2)';
    }
  }

  protected send(): void {
    const message = this.draft().trim();
    if (!message) return;
    this.bridge.notify(message, 'info');
    this.draft.set('');
  }
}
