import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { AppId } from '@loan/bridge';
import { ShellBridgeService } from '../core/bridge.service';

@Component({
  selector: 'app-settings-page',
  imports: [DatePipe, FormsModule, ToggleSwitchModule, SelectModule, ButtonModule, InputTextModule, CardModule, TagModule],
  template: `
    <div class="p-4 flex flex-column gap-4" style="max-width: 720px">
      <div>
        <h1 class="text-3xl font-bold m-0">Settings</h1>
        <p class="mt-1 mb-0 text-color-secondary">Platform-wide preferences (shell-owned).</p>
      </div>

      <p-card>
        <div class="flex justify-content-between align-items-center gap-4 py-3 border-bottom-1 surface-border">
          <div>
            <strong>Auto-refresh pricing</strong>
            <p class="mt-1 mb-0 text-color-secondary text-sm">Re-price the visible pipeline every 15 minutes.</p>
          </div>
          <p-toggleswitch [(ngModel)]="autoRefresh" />
        </div>
        <div class="flex justify-content-between align-items-center gap-4 py-3 border-bottom-1 surface-border">
          <div>
            <strong>Email notifications</strong>
            <p class="mt-1 mb-0 text-color-secondary text-sm">Send a digest when loans change status.</p>
          </div>
          <p-toggleswitch [(ngModel)]="notifications" />
        </div>
        <div class="flex justify-content-between align-items-center gap-4 py-3">
          <div>
            <strong>Default landing page</strong>
            <p class="mt-1 mb-0 text-color-secondary text-sm">Shown after sign-in.</p>
          </div>
          <p-select [(ngModel)]="landing" [options]="landingOptions" optionLabel="label" optionValue="value" />
        </div>
        <div class="flex justify-content-end pt-3">
          <p-button label="Save Changes" size="small" />
        </div>
      </p-card>

      <!-- ================= CROSS-APP MESSAGING DEMO ================= -->
      <p-card>
        <ng-template #header>
          <div class="flex align-items-center gap-2 px-3 pt-3 text-lg font-medium">
            <i class="pi pi-send text-primary"></i> Platform Messaging Console
          </div>
        </ng-template>
        <p class="mt-0 mb-3 text-color-secondary text-sm line-height-3">
          The shell, the Loan Pipeline (MFE1, Angular 21) and Reports &amp; Analytics (MFE2,
          Angular 19) all share one <code>&#64;loan/bridge</code> instance. A message sent from here
          reaches both remotes instantly (<strong>shell&nbsp;&rarr;&nbsp;mfe</strong>); messages
          sent from a remote land here too (<strong>mfe&nbsp;&rarr;&nbsp;shell</strong>) and on
          the other remote's feed (<strong>mfe&nbsp;&rarr;&nbsp;mfe</strong>) — open the
          Commitment Pipeline and Reports &amp; Analytics &rarr; Activity pages to watch it live.
        </p>
        <div class="flex gap-2 mb-3">
          <input
            pInputText
            class="flex-1"
            type="text"
            placeholder="Message to Pipeline (MFE1) &amp; Analytics (MFE2)..."
            [(ngModel)]="draft"
            (keydown.enter)="send()"
          />
          <p-button label="Send" icon="pi pi-send" size="small" [disabled]="!draft().trim()" (onClick)="send()" />
        </div>
        <ul class="list-none m-0 p-0 flex flex-column gap-2 overflow-y-auto" style="max-height: 220px">
          @for (m of bridge.messages(); track m.id) {
            <li class="flex align-items-center gap-2 p-2 surface-100 border-round text-sm">
              <p-tag [value]="appLabel(m.from)" [severity]="levelSeverity(m.level)" />
              <span class="flex-1 text-color-secondary">{{ m.message }}</span>
              <span class="text-color-secondary text-xs white-space-nowrap">{{ m.asOf | date: 'HH:mm:ss' }}</span>
            </li>
          } @empty {
            <li class="text-color-secondary text-sm p-2">No messages yet — send one, or trigger one from MFE1/MFE2.</li>
          }
        </ul>
      </p-card>
    </div>
  `,
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

  protected levelSeverity(level: 'info' | 'success' | 'warning'): 'info' | 'success' | 'warn' {
    return level === 'warning' ? 'warn' : level;
  }

  protected send(): void {
    const message = this.draft().trim();
    if (!message) return;
    this.bridge.notify(message, 'info');
    this.draft.set('');
  }
}
