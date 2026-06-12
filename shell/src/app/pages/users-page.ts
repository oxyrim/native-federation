import { Component } from '@angular/core';
import { TableModule } from 'primeng/table';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';

interface PlatformUser {
  name: string;
  initials: string;
  email: string;
  role: string;
  status: 'Active' | 'Invited';
}

@Component({
  selector: 'app-users-page',
  imports: [TableModule, AvatarModule, ButtonModule],
  template: `
    <div class="page">
      <div class="header">
        <div>
          <h1 class="up-page-title">Users</h1>
          <p class="up-page-subtitle">Manage who can access the Unified Platform.</p>
        </div>
        <p-button label="Invite User" icon="pi pi-user-plus" size="small" />
      </div>

      <div class="up-card">
        <p-table [value]="users" styleClass="p-datatable-sm">
          <ng-template #header>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
            </tr>
          </ng-template>
          <ng-template #body let-u>
            <tr>
              <td>
                <span class="user-cell">
                  <p-avatar [label]="u.initials" shape="circle" />
                  {{ u.name }}
                </span>
              </td>
              <td>{{ u.email }}</td>
              <td>{{ u.role }}</td>
              <td>
                <span class="up-chip" [class.ready]="u.status === 'Active'" [class.neutral]="u.status !== 'Active'">
                  {{ u.status }}
                </span>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>
    </div>
  `,
  styles: [
    `
      .page {
        padding: var(--up-space-5) var(--up-space-6);
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: var(--up-space-5);
      }
      .user-cell {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        font-weight: var(--up-font-weight-medium);
      }
    `,
  ],
})
export class UsersPage {
  readonly users: PlatformUser[] = [
    { name: 'Jane Smith', initials: 'JS', email: 'jane.smith@unified.io', role: 'Trader', status: 'Active' },
    { name: 'Marcus Lee', initials: 'ML', email: 'marcus.lee@unified.io', role: 'Analyst', status: 'Active' },
    { name: 'Priya Patel', initials: 'PP', email: 'priya.patel@unified.io', role: 'Admin', status: 'Active' },
    { name: 'Tom Becker', initials: 'TB', email: 'tom.becker@unified.io', role: 'Analyst', status: 'Invited' },
  ];
}
