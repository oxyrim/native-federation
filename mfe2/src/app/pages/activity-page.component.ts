import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimelineModule } from 'primeng/timeline';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
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
  imports: [DatePipe, FormsModule, TimelineModule, ButtonModule, InputTextModule],
  template: `
    <div class="up-card panel">
      <h3>Recent Activity</h3>
      @if (bridge.user(); as u) {
        <p class="hint">Showing activity visible to <strong>{{ u.displayName }}</strong> ({{ u.role }}).</p>
      }
      <p-timeline [value]="events" align="left">
        <ng-template #marker let-e>
          <span class="marker" [style.background]="e.color">
            <i [class]="e.icon"></i>
          </span>
        </ng-template>
        <ng-template #content let-e>
          <div class="event">
            <strong>{{ e.title }}</strong>
            <p>{{ e.detail }}</p>
            <span class="time">{{ e.time }}</span>
          </div>
        </ng-template>
      </p-timeline>
    </div>

    <!-- ================= CROSS-APP MESSAGING DEMO ================= -->
    <div class="up-card bridge-messenger">
      <h3><i class="pi pi-send"></i> Analytics &harr; Platform Messaging</h3>
      <p class="bm-hint">
        Same <code>&#64;loan/bridge</code> instance as the shell and the Loan Pipeline (MFE1, Angular
        21). A message sent here reaches the shell (<strong>mfe&nbsp;&rarr;&nbsp;shell</strong>)
        and MFE1's Commitment Pipeline feed (<strong>mfe&nbsp;&rarr;&nbsp;mfe</strong>) instantly;
        messages from either of those land in this feed too.
      </p>
      <div class="bm-compose">
        <input
          pInputText
          type="text"
          placeholder="Message to Shell &amp; Pipeline (MFE1)..."
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
          <li class="bm-empty">No messages yet — send one, or trigger one from the Shell/MFE1.</li>
        }
      </ul>
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }
      .panel {
        padding: 1.25rem 1.5rem;
        max-width: 720px;

        h3 {
          margin: 0 0 0.25rem;
        }
      }
      .hint {
        color: var(--up-text-muted, #8a909b);
        font-size: 0.8125rem;
        margin: 0 0 1.25rem;
      }
      .marker {
        display: grid;
        place-items: center;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        color: #fff;

        i {
          font-size: 0.8rem;
        }
      }
      .event {
        padding-bottom: 1.25rem;

        p {
          margin: 2px 0;
          color: var(--up-text-secondary, #5d6470);
          font-size: 0.875rem;
        }

        .time {
          color: var(--up-text-muted, #8a909b);
          font-size: 0.75rem;
        }
      }
      .bridge-messenger {
        max-width: 720px;
      }
    `,
  ],
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

  protected send(): void {
    const message = this.draft().trim();
    if (!message) return;
    this.bridge.notify(message, 'info');
    this.draft.set('');
  }
}
