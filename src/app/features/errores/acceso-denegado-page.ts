// src/app/features/errores/acceso-denegado-page.ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SessionStore } from '@core/auth/session-store';
import { getRoleHome } from '@core/auth/roles';
import { Button } from '@shared/ui/button/button';

@Component({
  selector: 'app-acceso-denegado-page',
  standalone: true,
  imports: [Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="error-container">
      <div class="data-panel error-card">
        <div class="error-card__icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>

        <h1 class="error-card__title">Acceso denegado</h1>
        <p class="error-card__message">
          No tienes permisos suficientes para acceder a esta sección con tu rol actual.
        </p>

        <div class="error-card__actions">
          <app-button variant="primary" (btnClick)="goToHome()">
            Volver a la pantalla principal
          </app-button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .error-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 50vh;
      padding: var(--space-4);
    }

    .error-card {
      max-width: 480px;
      width: 100%;
      text-align: center;
      padding: var(--space-8) var(--space-6);
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .error-card__icon {
      color: var(--color-danger);
      margin-bottom: var(--space-4);
    }

    .error-card__title {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: var(--space-2);
      color: var(--color-text-primary);
    }

    .error-card__message {
      color: var(--color-text-secondary);
      font-size: var(--font-size-body);
      margin-bottom: var(--space-6);
    }

    .error-card__actions {
      display: flex;
      justify-content: center;
    }
  `]
})
export class AccesoDenegadoPage {
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);

  goToHome(): void {
    const home = getRoleHome(this.session.role());
    this.router.navigate([home]);
  }
}
