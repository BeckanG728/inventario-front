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
  templateUrl: './acceso-denegado-page.html',
  styleUrl: './acceso-denegado-page.css'
})
export class AccesoDenegadoPage {
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);

  goToHome(): void {
    const home = getRoleHome(this.session.role());
    this.router.navigate([home]);
  }
}
