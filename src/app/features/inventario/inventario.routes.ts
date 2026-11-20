// src/app/features/inventario/inventario.routes.ts
import { Routes } from '@angular/router';
import { roleGuard } from '@core/auth/role.guard';

export const INVENTARIO_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'existencias'
  },
  {
    path: 'existencias',
    title: 'Existencias',
    canActivate: [roleGuard],
    data: { roles: ['JEFE_TALLER'] },
    loadComponent: () =>
      import('./existencias/existencias-page').then(m => m.ExistenciasPage)
  },
  {
    path: 'alertas',
    title: 'Alertas de bajo stock',
    canActivate: [roleGuard],
    data: { roles: ['JEFE_TALLER', 'MECANICO'] },
    loadComponent: () =>
      import('./alertas/alertas-page').then(m => m.AlertasPage)
  }
];
