// src/app/layout/auth-layout/auth-layout.ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from '@core/theme/theme.service';
import { ToastHost } from '../toast-host/toast-host';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet, ToastHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-layout">
      <header class="auth-topbar">
        <button
          type="button"
          class="auth-theme-btn"
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
      </header>
      <router-outlet />
      <app-toast-host />
    </div>
  `,
  styles: [`
    .auth-layout {
      min-height: 100vh;
      background-color: var(--color-bg);
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .auth-topbar {
      position: absolute;
      top: var(--space-4);
      right: var(--space-4);
      z-index: var(--z-sticky);
    }

    .auth-theme-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border: 1px solid var(--color-border);
      background-color: var(--color-surface);
      color: var(--color-text-secondary);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: background-color var(--duration-fast) var(--easing-out),
                  color var(--duration-fast) var(--easing-out);
    }

    .auth-theme-btn:hover {
      background-color: var(--color-surface-hover);
      color: var(--color-text-primary);
    }
  `]
})
export class AuthLayout {
  readonly theme = inject(ThemeService);
}
