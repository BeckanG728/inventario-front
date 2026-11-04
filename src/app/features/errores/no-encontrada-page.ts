// src/app/features/errores/no-encontrada-page.ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SessionStore } from '@core/auth/session-store';
import { getRoleHome } from '@core/auth/roles';
import { Button } from '@shared/ui/button/button';

@Component({
  selector: 'app-no-encontrada-page',
  standalone: true,
  imports: [Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="error-container">
      <div class="data-panel error-card">
        <div class="error-card__code font-mono">404</div>

        <h1 class="error-card__title">Página no encontrada</h1>
        <p class="error-card__message">
          La ruta solicitada no existe o ha sido reubicada.
        </p>

        <div class="error-card__actions">
          <app-button variant="primary" (btnClick)="goToHome()">
            Volver al inicio
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

    .error-card__code {
      font-size: 3.5rem;
      font-weight: 800;
      color: var(--color-primary);
      line-height: 1;
      margin-bottom: var(--space-2);
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
export class NoEncontradaPage {
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);

  goToHome(): void {
    const home = getRoleHome(this.session.role());
    this.router.navigate([home]);
  }
}
