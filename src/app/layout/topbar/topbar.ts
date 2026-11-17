// src/app/layout/topbar/topbar.ts
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  LucideChevronDown,
  LucideDynamicIcon,
  LucideLogOut,
  LucideMenu,
  LucideMoon,
  LucidePanelLeftClose,
  LucidePanelLeftOpen,
  LucideSun,
  LucideWrench,
  LucideX
} from '@lucide/angular';
import { getRoleLabel } from '@core/auth/roles';
import { SessionStore } from '@core/auth/session-store';
import { ThemeService } from '@core/theme/theme.service';
import { Badge } from '@shared/ui/badge/badge';
import { LayoutState } from '../layout-state';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [RouterLink, Badge, LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="topbar">
      <div class="topbar__start">
        <!-- Control de Sidebar -->
        <button
          type="button"
          class="topbar__icon-btn"
          (click)="layout.toggle()"
          [attr.aria-label]="toggleLabel()"
          [attr.title]="toggleLabel()"
          [attr.aria-expanded]="sidebarExpanded()"
          aria-controls="app-sidebar"
        >
          <svg [lucideIcon]="toggleIcon()" [size]="20" [strokeWidth]="1.75"></svg>
        </button>

        <!-- Identidad del sistema -->
        <a routerLink="/" class="topbar__brand" aria-label="Taller Mecánico, ir al inicio">
          <svg [lucideIcon]="icons.wrench" [size]="22" [strokeWidth]="1.75"></svg>
          <span class="topbar__brand-text">Taller Mecánico</span>
        </a>
      </div>

      <div class="topbar__end">
        <!-- Selector de tema -->
        <button
          type="button"
          class="topbar__icon-btn topbar__icon-btn--bordered"
          (click)="theme.toggleTheme()"
          [attr.title]="themeLabel()"
          [attr.aria-label]="themeLabel()"
        >
          <svg [lucideIcon]="theme.currentTheme() === 'light' ? icons.moon : icons.sun" [size]="18" [strokeWidth]="1.75"></svg>
        </button>

        <!-- Perfil de usuario -->
        <div class="user-menu">
          <button
            #trigger
            type="button"
            class="user-menu__trigger"
            (click)="toggleMenu()"
            [attr.aria-expanded]="menuOpen()"
            aria-controls="user-menu-panel"
            aria-label="Menú de usuario"
          >
            <span class="user-menu__avatar" aria-hidden="true">{{ initial() }}</span>
            <span class="user-menu__name">{{ session.username() }}</span>
            <span class="user-menu__caret">
              <svg [lucideIcon]="icons.chevronDown" [size]="16" [strokeWidth]="1.75"></svg>
            </span>
          </button>

          @if (menuOpen()) {
            <div id="user-menu-panel" class="user-menu__panel">
              <div class="user-menu__header">
                <span class="user-menu__header-name">{{ session.username() }}</span>
                <app-badge [variant]="roleBadgeVariant()" size="sm">{{ roleLabel() }}</app-badge>
              </div>
              <button type="button" class="user-menu__item" (click)="logout()">
                <svg [lucideIcon]="icons.logOut" [size]="18" [strokeWidth]="1.75"></svg>
                Cerrar sesión
              </button>
            </div>
          }
        </div>
      </div>
    </header>
  `,
  styles: [`
    :host {
      display: block;
      position: sticky;
      top: 0;
      z-index: var(--z-sticky);
    }

    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      height: var(--topbar-height);
      padding: 0 var(--space-4);
      background-color: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
    }

    .topbar__start,
    .topbar__end {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      min-width: 0;
    }

    .topbar__brand {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      min-width: 0;
      color: var(--color-text-primary);
      font-size: 1rem;
      font-weight: 700;
      text-decoration: none;
    }

    .topbar__brand:hover {
      color: var(--color-text-primary);
    }

    .topbar__brand svg {
      flex: none;
      color: var(--color-primary);
    }

    .topbar__brand-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .topbar__icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: none;
      width: 36px;
      height: 36px;
      border: 1px solid transparent;
      border-radius: var(--radius-md);
      background: transparent;
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: background-color var(--duration-fast) var(--easing-out),
                  color var(--duration-fast) var(--easing-out);
    }

    .topbar__icon-btn--bordered {
      border-color: var(--color-border);
    }

    .topbar__icon-btn:hover {
      background-color: var(--color-surface-hover);
      color: var(--color-text-primary);
    }

    .user-menu {
      position: relative;
    }

    .user-menu__trigger {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      height: 36px;
      padding: 0 var(--space-2);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: transparent;
      color: var(--color-text-primary);
      font-size: var(--font-size-label);
      font-weight: 600;
      cursor: pointer;
      transition: background-color var(--duration-fast) var(--easing-out);
    }

    .user-menu__trigger:hover {
      background-color: var(--color-surface-hover);
    }

    .user-menu__avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: var(--radius-pill);
      background-color: var(--color-primary-tint);
      color: var(--color-primary);
      font-size: 12px;
      font-weight: 700;
    }

    .user-menu__name {
      max-width: 160px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .user-menu__caret {
      display: inline-flex;
      color: var(--color-text-muted);
    }

    .user-menu__panel {
      position: absolute;
      top: calc(100% + var(--space-2));
      right: 0;
      z-index: var(--z-dropdown);
      min-width: 220px;
      padding: var(--space-2);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background-color: var(--color-surface);
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
    }

    .user-menu__header {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-1);
      padding: var(--space-2) var(--space-3) var(--space-3);
      margin-bottom: var(--space-1);
      border-bottom: 1px solid var(--color-border-soft);
    }

    .user-menu__header-name {
      font-size: var(--font-size-label);
      font-weight: 600;
      color: var(--color-text-primary);
      word-break: break-word;
    }

    .user-menu__item {
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
      font-size: var(--font-size-label);
      font-weight: 500;
      text-align: left;
      cursor: pointer;
      transition: background-color var(--duration-fast) var(--easing-out),
                  color var(--duration-fast) var(--easing-out);
    }

    .user-menu__item:hover {
      background-color: var(--color-danger-tint);
      color: var(--color-danger);
    }

    @media (max-width: 767px) {
      .topbar {
        padding: 0 var(--space-3);
      }

      .user-menu__name,
      .user-menu__caret {
        display: none;
      }

      .user-menu__trigger {
        padding: 0 var(--space-1);
      }
    }

    @media (max-width: 420px) {
      .topbar__brand-text {
        display: none;
      }
    }
  `]
})
export class Topbar {
  readonly layout = inject(LayoutState);
  readonly session = inject(SessionStore);
  readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');

  protected readonly icons = {
    wrench: LucideWrench,
    moon: LucideMoon,
    sun: LucideSun,
    chevronDown: LucideChevronDown,
    logOut: LucideLogOut
  };

  readonly menuOpen = signal(false);

  protected readonly initial = computed(() => (this.session.username() ?? '?').trim().charAt(0).toUpperCase() || '?');
  protected readonly roleLabel = computed(() => getRoleLabel(this.session.role()));

  protected readonly roleBadgeVariant = computed(() => {
    switch (this.session.role()) {
      case 'ADMIN': return 'accent';
      case 'JEFE_TALLER': return 'primary';
      case 'MECANICO': return 'success';
      default: return 'neutral';
    }
  });

  protected readonly sidebarExpanded = computed(() =>
    this.layout.isMobile() ? this.layout.mobileOpen() : !this.layout.collapsed()
  );

  protected readonly toggleIcon = computed(() => {
    if (this.layout.isMobile()) {
      return this.layout.mobileOpen() ? LucideX : LucideMenu;
    }
    return this.layout.collapsed() ? LucidePanelLeftOpen : LucidePanelLeftClose;
  });

  protected readonly toggleLabel = computed(() => {
    if (this.layout.isMobile()) {
      return this.layout.mobileOpen() ? 'Cerrar menú de navegación' : 'Abrir menú de navegación';
    }
    return this.layout.collapsed() ? 'Expandir barra lateral' : 'Contraer barra lateral';
  });

  protected readonly themeLabel = computed(() =>
    this.theme.currentTheme() === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'
  );

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (this.menuOpen() && !this.host.nativeElement.contains(event.target as Node)) {
      this.menuOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.menuOpen()) {
      this.menuOpen.set(false);
      this.trigger()?.nativeElement.focus();
    }
  }

  toggleMenu(): void {
    this.menuOpen.update(open => !open);
  }

  logout(): void {
    this.menuOpen.set(false);
    this.session.clear();
    this.router.navigate(['/login']);
  }
}
