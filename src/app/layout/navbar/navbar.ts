// src/app/layout/navbar/navbar.ts
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { SessionStore } from '@core/auth/session-store';
import { ThemeService } from '@core/theme/theme.service';
import { getRoleLabel } from '@core/auth/roles';
import { Badge } from '@shared/ui/badge/badge';
import { getNavItemsForRole } from './nav-items';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, Badge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="navbar">
      <div class="navbar__brand">
        <a routerLink="/" class="navbar__logo">
          <svg class="navbar__logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
          </svg>
          <span class="navbar__logo-text">Taller Mecánico</span>
        </a>
      </div>

      <!-- Enlaces de navegación principal -->
      <nav class="nav-links" [attr.data-open]="isMenuOpen()">
        @for (item of navItems(); track item.route) {
          <a
            [routerLink]="item.route"
            routerLinkActive="nav-item--active"
            class="nav-item"
            (click)="closeMenu()"
          >
            {{ item.label }}
          </a>
        }
      </nav>

      <!-- Perfil de usuario y Logout -->
      <div class="navbar__user">
        <div class="navbar__user-info">
          <span class="navbar__username">{{ session.username() }}</span>
          <app-badge [variant]="roleBadgeVariant()" size="sm">
            {{ roleLabel() }}
          </app-badge>
        </div>

        <!-- Selector de tema (Claro principal / Oscuro) -->
        <button
          type="button"
          class="navbar__theme-btn"
          (click)="theme.toggleTheme()"
          [title]="theme.currentTheme() === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'"
          [attr.aria-label]="theme.currentTheme() === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'"
        >
          @if (theme.currentTheme() === 'light') {
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          } @else {
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
          }
        </button>

        <button
          type="button"
          class="navbar__logout-btn"
          (click)="logout()"
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>

        <!-- Toggle móvil -->
        <button
          type="button"
          class="nav-toggle"
          [attr.aria-expanded]="isMenuOpen()"
          aria-label="Alternar menú de navegación"
          (click)="toggleMenu()"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            @if (isMenuOpen()) {
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            } @else {
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            }
          </svg>
        </button>
      </div>
    </header>
  `,
  styles: [`
    .navbar {
      background-color: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
      box-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.05);
      padding: var(--space-2) var(--container-padding);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      position: relative;
      z-index: var(--z-sticky);
    }

    .navbar__brand {
      display: flex;
      align-items: center;
    }

    .navbar__logo {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      text-decoration: none;
      color: var(--color-text-primary);
      font-weight: 700;
      font-size: 1.125rem;
    }

    .navbar__logo-icon {
      width: 24px;
      height: 24px;
      color: var(--color-primary);
    }

    .nav-links {
      display: none;
      gap: var(--space-1);
    }

    .nav-item {
      display: inline-flex;
      align-items: center;
      padding: 8px 14px;
      border-radius: var(--radius-md);
      color: var(--color-text-secondary);
      text-decoration: none;
      font-size: var(--font-size-body);
      font-weight: 500;
      transition: background-color var(--duration-fast) var(--easing-out),
                  color var(--duration-fast) var(--easing-out);
    }

    .nav-item:hover {
      background-color: var(--color-surface-hover);
      color: var(--color-text-primary);
    }

    .nav-item--active {
      color: var(--color-primary);
      background-color: var(--color-primary-tint);
      font-weight: 600;
    }

    .navbar__user {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }

    .navbar__user-info {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .navbar__username {
      font-size: var(--font-size-label);
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .navbar__theme-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: 1px solid var(--color-border);
      background-color: transparent;
      color: var(--color-text-secondary);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: background-color var(--duration-fast) var(--easing-out),
                  color var(--duration-fast) var(--easing-out);
    }

    .navbar__theme-btn:hover {
      background-color: var(--color-surface-hover);
      color: var(--color-text-primary);
    }

    .navbar__logout-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: 1px solid var(--color-border);
      background-color: transparent;
      color: var(--color-text-secondary);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: background-color var(--duration-fast) var(--easing-out),
                  color var(--duration-fast) var(--easing-out);
    }

    .navbar__logout-btn:hover {
      background-color: var(--color-danger-tint);
      color: var(--color-danger);
      border-color: var(--color-danger-tint);
    }

    .nav-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: transparent;
      color: var(--color-text-primary);
      cursor: pointer;
    }

    /* Comportamiento responsivo desktop >= 1024px */
    @media (min-width: 1024px) {
      .nav-links {
        display: flex;
        align-items: center;
      }
      .nav-toggle {
        display: none;
      }
    }

    /* Menú móvil < 1024px */
    @media (max-width: 1023px) {
      .nav-links[data-open="true"] {
        display: flex;
        flex-direction: column;
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background-color: var(--color-surface);
        border-bottom: 1px solid var(--color-border);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        padding: var(--space-3);
        gap: var(--space-1);
        z-index: var(--z-dropdown);
      }
      .navbar__username {
        display: none;
      }
    }
  `]
})
export class Navbar {
  readonly session = inject(SessionStore);
  readonly theme = inject(ThemeService);
  private readonly router = inject(Router);

  readonly isMenuOpen = signal<boolean>(false);

  readonly navItems = computed(() => getNavItemsForRole(this.session.role()));
  readonly roleLabel = computed(() => getRoleLabel(this.session.role()));

  readonly roleBadgeVariant = computed(() => {
    switch (this.session.role()) {
      case 'ADMIN': return 'accent';
      case 'JEFE_TALLER': return 'primary';
      case 'MECANICO': return 'success';
      default: return 'neutral';
    }
  });

  toggleMenu(): void {
    this.isMenuOpen.update(open => !open);
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  logout(): void {
    this.session.clear();
    this.router.navigate(['/login']);
  }
}
