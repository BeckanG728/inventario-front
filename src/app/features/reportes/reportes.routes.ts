// src/app/features/reportes/reportes.routes.ts
import { Routes } from '@angular/router';
import { roleGuard } from '@core/auth/role.guard';

export const REPORTES_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'movimientos'
  },
  {
    path: 'movimientos',
    title: 'Reporte de Movimientos',
    canActivate: [roleGuard],
    data: { roles: ['JEFE_TALLER'] },
    loadComponent: () =>
      import('./movimientos/reporte-movimientos-page').then(m => m.ReporteMovimientosPage)
  },
  {
    path: 'consumo',
    title: 'Reporte de Consumo',
    canActivate: [roleGuard],
    data: { roles: ['JEFE_TALLER'] },
    loadComponent: () =>
      import('./consumo/reporte-consumo-page').then(m => m.ReporteConsumoPage)
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
    path: 'bajo-stock',
    title: 'Reporte de Bajo Stock',
    canActivate: [roleGuard],
    data: { roles: ['JEFE_TALLER'] },
    loadComponent: () =>
      import('./bajo-stock/reporte-bajo-stock-page').then(m => m.ReporteBajoStockPage)
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
