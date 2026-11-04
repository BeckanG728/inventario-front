// src/app/layout/toast-host/toast-host.ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '@core/notifications/toast-service';

@Component({
  selector: 'app-toast-host',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-container" aria-live="polite" aria-atomic="true">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast toast--{{ toast.type }}" role="status">
          <div class="toast__icon">
            @switch (toast.type) {
              @case ('success') {
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              }
              @case ('error') {
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              }
              @case ('warning') {
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              }
              @case ('info') {
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              }
            }
          </div>

          <div class="toast__message">{{ toast.message }}</div>

          <button
            type="button"
            class="toast__close"
            (click)="toastService.dismiss(toast.id)"
            aria-label="Cerrar notificación"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: var(--space-5);
      right: var(--space-5);
      z-index: var(--z-toast);
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      max-width: min(420px, 92vw);
      pointer-events: none;
    }

    .toast {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      color: var(--color-text-primary);
      font-size: var(--font-size-body);
      pointer-events: auto;
      animation: toast-in var(--duration-fast) var(--easing-out);
    }

    .toast--success {
      border-left: 4px solid var(--color-success);
    }
    .toast--success .toast__icon {
      color: var(--color-success);
    }

    .toast--error {
      border-left: 4px solid var(--color-danger);
    }
    .toast--error .toast__icon {
      color: var(--color-danger);
    }

    .toast--warning {
      border-left: 4px solid var(--color-warning);
    }
    .toast--warning .toast__icon {
      color: var(--color-warning);
    }

    .toast--info {
      border-left: 4px solid var(--color-info);
    }
    .toast--info .toast__icon {
      color: var(--color-info);
    }

    .toast__icon {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    .toast__message {
      flex: 1;
      line-height: 1.4;
    }

    .toast__close {
      border: none;
      background: transparent;
      color: var(--color-text-secondary);
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      border-radius: var(--radius-sm);
    }

    .toast__close:hover {
      color: var(--color-text-primary);
      background-color: var(--color-surface-hover);
    }

    @keyframes toast-in {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class ToastHost {
  readonly toastService = inject(ToastService);
}
