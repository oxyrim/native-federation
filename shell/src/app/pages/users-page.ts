import { Component } from '@angular/core';
import { TableModule } from 'primeng/table';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';

interface PlatformUser {
  name: string;
  initials: string;
  email: string;
  role: string;
  status: 'Active' | 'Invited';
}

@Component({
  selector: 'app-users-page',
  imports: [TableModule, AvatarModule, ButtonModule, CardModule, TagModule],
  template: `
    <div class="p-4 flex flex-column gap-4">
      <div class="flex justify-content-between align-items-start">
        <div>
          <h1 class="text-3xl font-bold m-0">Users</h1>
          <p class="mt-1 mb-0 text-color-secondary">Manage who can access the Unified Platform.</p>
        </div>
        <p-button label="Invite User" icon="pi pi-user-plus" size="small" />
      </div>

      <p-card>
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
                <span class="inline-flex align-items-center gap-2 font-medium">
                  <p-avatar [label]="u.initials" shape="circle" />
                  {{ u.name }}
                </span>
              </td>
              <td>{{ u.email }}</td>
              <td>{{ u.role }}</td>
              <td>
                <p-tag
                  [value]="u.status"
                  [severity]="u.status === 'Active' ? 'success' : 'secondary'"
                />
              </td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>
    </div>
  `,
})
export class UsersPage {
  readonly users: PlatformUser[] = [
    { name: 'Jane Smith', initials: 'JS', email: 'jane.smith@unified.io', role: 'Trader', status: 'Active' },
    { name: 'Marcus Lee', initials: 'ML', email: 'marcus.lee@unified.io', role: 'Analyst', status: 'Active' },
    { name: 'Priya Patel', initials: 'PP', email: 'priya.patel@unified.io', role: 'Admin', status: 'Active' },
    { name: 'Tom Becker', initials: 'TB', email: 'tom.becker@unified.io', role: 'Analyst', status: 'Invited' },
  ];
}
