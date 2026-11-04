// src/app/features/operaciones/operaciones.routes.ts
import { Routes } from '@angular/router';
import { roleGuard } from '@core/auth/role.guard';
import { unsavedChangesGuard } from '@core/router/unsaved-changes.guard';

export const OPERACIONES_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'consumo'
  },
  {
    path: 'consumo',
    title: 'Registrar consumo',
    canActivate: [roleGuard],
    canDeactivate: [unsavedChangesGuard],
    data: { roles: ['JEFE_TALLER', 'MECANICO'] },
    loadComponent: () => import('./consumo/consumo-page').then(m => m.ConsumoPage)
  },
  {
    path: 'entrada',
    title: 'Registrar entrada',
    canActivate: [roleGuard],
    data: { roles: ['JEFE_TALLER'] },
    loadComponent: () => import('./entrada/entrada-form-page').then(m => m.EntradaFormPage)
  },
  {
    path: 'ajuste',
    title: 'Registrar ajuste',
    canActivate: [roleGuard],
    data: { roles: ['JEFE_TALLER'] },
    loadComponent: () => import('./ajuste/ajuste-form-page').then(m => m.AjusteFormPage)
  }
];
