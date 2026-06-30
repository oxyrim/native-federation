import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { OverlayBadgeModule } from 'primeng/overlaybadge';
import { ToolbarModule } from 'primeng/toolbar';
import { ShellBridgeService } from './core/bridge.service';
import { MfeRegistryService } from './core/mfe-registry.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ButtonModule, AvatarModule, OverlayBadgeModule, ToolbarModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly bridge = inject(ShellBridgeService);
  protected readonly registry = inject(MfeRegistryService);
  protected readonly collapsed = signal(false);

  /** Left-nav is generated entirely from the API config (deduped groups). */
  protected readonly sections = this.registry.navGroups;

  protected toggleSidebar(): void {
    this.collapsed.update((c) => !c);
  }
}
