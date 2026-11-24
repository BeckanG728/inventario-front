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
    data: { roles: ['JEFE_TALLER', 'MECANICO'] },
    loadComponent: () =>
      import('./existencias/existencias-page').then(m => m.ExistenciasPage)
  },
  {
    path: 'movimientos',
    title: 'Movimientos de Inventario',
    canActivate: [roleGuard],
    data: { roles: ['JEFE_TALLER'] },
    loadComponent: () =>
      import('./movimientos/reporte-movimientos-page').then(m => m.ReporteMovimientosPage)
  }
];
