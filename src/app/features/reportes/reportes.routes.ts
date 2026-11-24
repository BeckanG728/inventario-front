// src/app/features/reportes/reportes.routes.ts
import { Routes } from '@angular/router';
import { roleGuard } from '@core/auth/role.guard';

export const REPORTES_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'valor-inventario'
  },
  {
    path: 'valor-inventario',
    title: 'Valor de Inventario',
    canActivate: [roleGuard],
    data: { roles: ['JEFE_TALLER'] },
    loadComponent: () =>
      import('./valor-inventario/valor-inventario-page').then(m => m.ValorInventarioPage)
  },
  {
    path: 'estadisticas',
    title: 'Estadísticas de Inventario',
    canActivate: [roleGuard],
    data: { roles: ['JEFE_TALLER'] },
    loadComponent: () =>
      import('./estadisticas/estadisticas-page').then(m => m.EstadisticasPage)
  }
];
