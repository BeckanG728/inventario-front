// src/app/features/admin/admin.routes.ts
import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'usuarios/nuevo',
    pathMatch: 'full'
  },
  {
    path: 'usuarios/nuevo',
    title: 'Registrar usuario',
    loadComponent: () => import('./usuario-form-page').then(m => m.UsuarioFormPage)
  }
];
