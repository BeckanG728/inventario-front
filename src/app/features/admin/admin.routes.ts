// src/app/features/admin/admin.routes.ts
import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'usuarios',
    pathMatch: 'full'
  },
  {
    path: 'usuarios',
    title: 'Usuarios',
    pathMatch: 'full',
    loadComponent: () => import('./usuarios/usuarios-page').then(m => m.UsuariosPage)
  },
  {
    path: 'auditoria',
    title: 'Auditoría de operaciones',
    pathMatch: 'full',
    loadComponent: () => import('./auditoria/auditoria-page').then(m => m.AuditoriaPage)
  }
];
