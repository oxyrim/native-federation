import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimelineModule } from 'primeng/timeline';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { AppId } from '@loan/bridge';
import { AnalyticsBridgeService } from '../core/bridge.service';

interface ActivityEvent {
  title: string;
  detail: string;
  time: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'mfe2-activity-page',
  standalone: true,
  imports: [DatePipe, FormsModule, TimelineModule, ButtonModule, InputTextModule, CardModule, TagModule],
  template: `
    <div class="flex flex-column gap-4" style="max-width: 720px">
      <p-card header="Recent Activity">
        @if (bridge.user(); as u) {
          <p class="mt-0 mb-4 text-color-secondary text-sm">Showing activity visible to <strong>{{ u.displayName }}</strong> ({{ u.role }}).</p>
        }
        <p-timeline [value]="events" align="left">
          <ng-template #marker let-e>
            <span class="flex align-items-center justify-content-center border-circle text-white" [style.background]="e.color" style="width: 28px; height: 28px">
              <i [class]="e.icon" class="text-sm"></i>
            </span>
          </ng-template>
          <ng-template #content let-e>
            <div class="pb-4">
              <strong>{{ e.title }}</strong>
              <p class="my-1 text-color-secondary text-sm">{{ e.detail }}</p>
              <span class="text-color-secondary text-xs">{{ e.time }}</span>
            </div>
          </ng-template>
        </p-timeline>
      </p-card>

      <!-- ================= CROSS-APP MESSAGING DEMO ================= -->
      <p-card>
        <ng-template #header>
          <div class="flex align-items-center gap-2 px-3 pt-3 text-lg font-medium">
            <i class="pi pi-send text-primary"></i> Analytics &harr; Platform Messaging
          </div>
        </ng-template>
        <p class="mt-0 mb-3 text-color-secondary text-sm line-height-3">
          Same <code>&#64;loan/bridge</code> instance as the shell and the Loan Pipeline (MFE1, Angular
          21). A message sent here reaches the shell (<strong>mfe&nbsp;&rarr;&nbsp;shell</strong>)
          and MFE1's Commitment Pipeline feed (<strong>mfe&nbsp;&rarr;&nbsp;mfe</strong>) instantly;
          messages from either of those land in this feed too.
        </p>
        <div class="flex gap-2 mb-3">
          <input
            pInputText
            class="flex-1"
            type="text"
            placeholder="Message to Shell &amp; Pipeline (MFE1)..."
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
            <li class="text-color-secondary text-sm p-2">No messages yet — send one, or trigger one from the Shell/MFE1.</li>
          }
        </ul>
      </p-card>
    </div>
  `,
})
export class ActivityPageComponent {
  protected readonly bridge = inject(AnalyticsBridgeService);

  protected readonly draft = signal('');

  readonly events: ActivityEvent[] = [
    { title: 'Pricing refreshed', detail: '312 loans re-priced after rate sheet update.', time: 'Today, 9:15 AM', icon: 'pi pi-refresh', color: '#2f6fed' },
    { title: 'Loans imported', detail: '46 loans imported by Jane Smith (CSV upload).', time: 'Today, 8:05 AM', icon: 'pi pi-cloud-upload', color: '#8b5cf6' },
    { title: 'Commitment fulfilled', detail: 'CMT-2024-0088 delivered — $11.9M UPB across 25 loans.', time: 'Yesterday, 4:40 PM', icon: 'pi pi-check', color: '#16a34a' },
    { title: 'Missing data flagged', detail: '12 imported loans are missing appraisal values.', time: 'Yesterday, 2:18 PM', icon: 'pi pi-exclamation-triangle', color: '#f59e0b' },
    { title: 'Report failed', detail: 'Imported Loan Quality report failed — source timeout.', time: 'Yesterday, 7:31 AM', icon: 'pi pi-times', color: '#c0392b' },
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
