import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { OverlayBadgeModule } from 'primeng/overlaybadge';
import { ShellBridgeService } from './core/bridge.service';

interface NavItem {
  label: string;
  icon: string;
  link: string;
  exact: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ButtonModule, AvatarModule, OverlayBadgeModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly bridge = inject(ShellBridgeService);
  protected readonly collapsed = signal(false);

  protected readonly sections: NavSection[] = [
    {
      label: 'Pipeline',
      items: [
        { label: 'Loan Pipeline', icon: 'pi pi-table', link: '/pipeline', exact: true },
        { label: 'Commitment Pipeline', icon: 'pi pi-plus-circle', link: '/pipeline/commitments', exact: false },
        { label: 'Pricing Results', icon: 'pi pi-dollar', link: '/pipeline/pricing', exact: false },
      ],
    },
    {
      label: 'Reports',
      items: [
        { label: 'Reports & Analytics', icon: 'pi pi-chart-bar', link: '/analytics', exact: false },
      ],
    },
    {
      label: 'Admin',
      items: [
        { label: 'Users', icon: 'pi pi-users', link: '/admin/users', exact: false },
        { label: 'Settings', icon: 'pi pi-cog', link: '/admin/settings', exact: false },
      ],
    },
  ];

  protected toggleSidebar(): void {
    this.collapsed.update((c) => !c);
  }
}
