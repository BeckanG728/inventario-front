// src/app/layout/sidebar/sidebar.ts
import { ChangeDetectionStrategy, Component, computed, effect, HostListener, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LucideChevronDown, LucideDynamicIcon } from '@lucide/angular';
import { filter, map } from 'rxjs';
import { SessionStore } from '@core/auth/session-store';
import { LayoutState } from '../layout-state';
import { getNavSectionsForRole, NavGroup } from './nav-items';

function pathOf(url: string): string {
  return url.split('?')[0].split('#')[0];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class Sidebar {
  readonly layout = inject(LayoutState);
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);

  protected readonly chevronIcon = LucideChevronDown;

  private readonly currentPath = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(event => pathOf(event.urlAfterRedirects))
    ),
    { initialValue: pathOf(this.router.url) }
  );

  protected readonly sections = computed(() => getNavSectionsForRole(this.session.role()));
  protected readonly compact = computed(() => this.layout.collapsed());

  // Grupos desplegados. Vive en el layout, así que se conserva al cambiar de página.
  private readonly openGroups = signal<ReadonlySet<string>>(new Set());

  constructor() {
    // Al navegar, despliega el grupo que contiene la ruta activa.
    effect(() => {
      const path = this.currentPath();
      for (const section of this.sections()) {
        for (const entry of section.entries) {
          if (entry.kind === 'group' && this.hasActiveChild(entry, path)) {
            this.openGroup(entry.id);
          }
        }
      }
    });
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.layout.isMobile() && this.layout.mobileOpen()) {
      this.layout.closeMobile();
    }
  }

  protected isOpen(group: NavGroup): boolean {
    return this.openGroups().has(group.id);
  }

  protected isGroupActive(group: NavGroup): boolean {
    return this.hasActiveChild(group, this.currentPath());
  }

  protected onGroupClick(group: NavGroup): void {
    if (this.compact()) {
      // En el riel no hay espacio para subopciones: se expande la Sidebar y se despliega el grupo.
      this.layout.expand();
      this.openGroup(group.id);
      return;
    }

    this.openGroups.update(current => {
      const next = new Set(current);
      if (next.has(group.id)) {
        next.delete(group.id);
      } else {
        next.add(group.id);
      }
      return next;
    });
  }

  protected onNavigate(): void {
    if (this.layout.isMobile()) {
      this.layout.closeMobile();
    }
  }

  private openGroup(id: string): void {
    this.openGroups.update(current => {
      if (current.has(id)) return current;
      return new Set(current).add(id);
    });
  }

  private hasActiveChild(group: NavGroup, path: string): boolean {
    return group.children.some(child => path === child.route || path.startsWith(child.route + '/'));
  }
}
