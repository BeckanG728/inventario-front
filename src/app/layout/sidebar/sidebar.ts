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
  template: `
    @if (layout.isMobile() && layout.mobileOpen()) {
      <div class="sidebar-backdrop" (click)="layout.closeMobile()" aria-hidden="true"></div>
    }

    <aside
      id="app-sidebar"
      class="sidebar"
      [class.sidebar--compact]="compact()"
      [class.sidebar--mobile]="layout.isMobile()"
      [class.sidebar--open]="layout.mobileOpen()"
    >
      <nav class="sidebar__nav" aria-label="Navegación principal">
        @for (section of sections(); track section.id) {
          <div class="sidebar__section" role="group" [attr.aria-label]="section.title">
            @if (compact()) {
              <div class="sidebar__divider"></div>
            } @else {
              <div class="sidebar__section-title">{{ section.title }}</div>
            }

            <ul class="sidebar__list">
              @for (entry of section.entries; track entry.id) {
                <li>
                  @if (entry.kind === 'link') {
                    <a
                      class="sidebar__item"
                      [routerLink]="entry.route"
                      routerLinkActive="sidebar__item--active"
                      ariaCurrentWhenActive="page"
                      [attr.title]="compact() ? entry.label : null"
                      [attr.aria-label]="compact() ? entry.label : null"
                      (click)="onNavigate()"
                    >
                      <svg [lucideIcon]="entry.icon" [size]="18" [strokeWidth]="1.75"></svg>
                      <span class="sidebar__label">{{ entry.label }}</span>
                    </a>
                  } @else {
                    <button
                      type="button"
                      class="sidebar__item"
                      [class.sidebar__item--active-group]="isGroupActive(entry)"
                      [attr.aria-expanded]="isOpen(entry) && !compact()"
                      [attr.aria-controls]="'sidebar-group-' + entry.id"
                      [attr.title]="compact() ? entry.label : null"
                      [attr.aria-label]="compact() ? entry.label : null"
                      (click)="onGroupClick(entry)"
                    >
                      <svg [lucideIcon]="entry.icon" [size]="18" [strokeWidth]="1.75"></svg>
                      <span class="sidebar__label">{{ entry.label }}</span>
                      <span class="sidebar__chevron" [class.sidebar__chevron--open]="isOpen(entry)">
                        <svg [lucideIcon]="chevronIcon" [size]="16" [strokeWidth]="1.75"></svg>
                      </span>
                    </button>

                    @if (isOpen(entry) && !compact()) {
                      <ul class="sidebar__sublist" [id]="'sidebar-group-' + entry.id">
                        @for (child of entry.children; track child.id) {
                          <li>
                            <a
                              class="sidebar__item sidebar__item--child"
                              [routerLink]="child.route"
                              routerLinkActive="sidebar__item--active"
                              ariaCurrentWhenActive="page"
                              (click)="onNavigate()"
                            >
                              <span class="sidebar__label">{{ child.label }}</span>
                            </a>
                          </li>
                        }
                      </ul>
                    }
                  }
                </li>
              }
            </ul>
          </div>
        }
      </nav>
    </aside>
  `,
  styles: [`
    :host {
      display: block;
      flex: none;
    }

    .sidebar {
      position: sticky;
      top: var(--topbar-height);
      width: var(--sidebar-width);
      height: calc(100vh - var(--topbar-height));
      height: calc(100dvh - var(--topbar-height));
      overflow-x: hidden;
      overflow-y: auto;
      background-color: var(--color-surface);
      border-right: 1px solid var(--color-border);
      transition: width var(--duration-normal) var(--easing-out);
    }

    .sidebar--compact {
      width: var(--sidebar-width-collapsed);
    }

    .sidebar__nav {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      padding: var(--space-4) var(--space-3);
    }

    .sidebar--compact .sidebar__nav {
      gap: var(--space-2);
    }

    .sidebar__section-title {
      padding: 0 var(--space-3) var(--space-1);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--color-text-muted);
      white-space: nowrap;
    }

    .sidebar__divider {
      height: 1px;
      margin: 0 var(--space-2) var(--space-2);
      background-color: var(--color-border-soft);
    }

    .sidebar__section:first-child .sidebar__divider {
      display: none;
    }

    .sidebar__list,
    .sidebar__sublist {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .sidebar__sublist {
      margin: var(--space-1) 0 0 var(--space-5);
      padding-left: var(--space-2);
      border-left: 1px solid var(--color-border-soft);
    }

    .sidebar__item {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      width: 100%;
      min-height: 36px;
      padding: 0 var(--space-3);
      border: 0;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--color-text-secondary);
      font-family: inherit;
      font-size: 13px;
      font-weight: 500;
      line-height: 1.2;
      text-align: left;
      text-decoration: none;
      white-space: nowrap;
      cursor: pointer;
      transition: background-color var(--duration-fast) var(--easing-out),
                  color var(--duration-fast) var(--easing-out);
    }

    .sidebar__item svg {
      flex: none;
    }

    .sidebar__item:hover {
      background-color: var(--color-surface-hover);
      color: var(--color-text-primary);
    }

    .sidebar__item--active {
      background-color: var(--color-primary-tint);
      color: var(--color-primary);
      font-weight: 600;
      box-shadow: inset 3px 0 0 var(--color-primary);
    }

    .sidebar__item--active:hover {
      background-color: var(--color-primary-tint);
      color: var(--color-primary);
    }

    .sidebar__item--active-group {
      color: var(--color-primary);
      font-weight: 600;
    }

    .sidebar__item--child {
      min-height: 32px;
    }

    .sidebar__label {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sidebar__chevron {
      display: inline-flex;
      transition: transform var(--duration-fast) var(--easing-out);
    }

    .sidebar__chevron--open {
      transform: rotate(180deg);
    }

    /* Riel contraído: solo iconos */
    .sidebar--compact .sidebar__item {
      justify-content: center;
      padding: 0;
    }

    .sidebar--compact .sidebar__label,
    .sidebar--compact .sidebar__chevron {
      display: none;
    }

    /* Móvil: menú lateral superpuesto bajo la Topbar */
    .sidebar--mobile {
      position: fixed;
      top: var(--topbar-height);
      left: 0;
      z-index: 90;
      width: min(280px, 85vw);
      transform: translateX(-100%);
      visibility: hidden;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18);
      transition: transform var(--duration-normal) var(--easing-out),
                  visibility 0s linear var(--duration-normal);
    }

    .sidebar--mobile.sidebar--open {
      transform: translateX(0);
      visibility: visible;
      transition-delay: 0s;
    }

    .sidebar-backdrop {
      position: fixed;
      inset: var(--topbar-height) 0 0 0;
      z-index: 89;
      background-color: rgba(15, 23, 42, 0.45);
    }
  `]
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
