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
  templateUrl: './no-encontrada-page.html',
  styleUrl: './no-encontrada-page.css'
})
export class NoEncontradaPage {
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);

  goToHome(): void {
    const home = getRoleHome(this.session.role());
    this.router.navigate([home]);
  }
}
