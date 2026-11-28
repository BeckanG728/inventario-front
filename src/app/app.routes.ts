// src/app/app.routes.ts
import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { authGuard } from '@core/auth/auth.guard';
import { guestGuard } from '@core/auth/guest.guard';
import { passwordChangeGuard } from '@core/auth/password-change.guard';
import { roleGuard } from '@core/auth/role.guard';
import { SessionStore } from '@core/auth/session-store';
import { getRoleHome } from '@core/auth/roles';

export const routes: Routes = [
  // 1. Ruta pública con AuthLayout
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('@layout/auth-layout/auth-layout').then(m => m.AuthLayout),
    children: [
      {
        path: '',
        title: 'Iniciar sesión',
        loadComponent: () => import('@features/auth/login-page').then(m => m.LoginPage)
      }
    ]
  },

  // 2. Cambio obligatorio de contraseña (sesión iniciada, sin acceso al resto)
  {
    path: 'cambiar-password',
    canActivate: [passwordChangeGuard],
    loadComponent: () => import('@layout/auth-layout/auth-layout').then(m => m.AuthLayout),
    children: [
      {
        path: '',
        title: 'Cambiar contraseña',
        loadComponent: () => import('@features/auth/cambiar-password-page').then(m => m.CambiarPasswordPage)
      }
    ]
  },

  // 3. Rutas autenticadas con MainLayout
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('@layout/main-layout/main-layout').then(m => m.MainLayout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: () => {
          const session = inject(SessionStore);
          return getRoleHome(session.role());
        }
      },
      {
        path: 'dashboard',
        title: 'Panel de Control',
        canActivate: [roleGuard],
        data: { roles: ['JEFE_TALLER'] },
        loadComponent: () => import('@features/dashboard/dashboard-page').then(m => m.DashboardPage)
      },
      {
        path: 'catalogo',
        canActivate: [roleGuard],
        data: { roles: ['JEFE_TALLER'], breadcrumb: 'Catálogo' },
        loadChildren: () => import('@features/catalogo/catalogo.routes').then(m => m.CATALOGO_ROUTES)
      },
      {
        path: 'inventario',
        canActivate: [roleGuard],
        data: { roles: ['JEFE_TALLER', 'MECANICO'], breadcrumb: 'Inventario' },
        loadChildren: () => import('@features/inventario/inventario.routes').then(m => m.INVENTARIO_ROUTES)
      },
      {
        path: 'operaciones',
        canActivate: [roleGuard],
        data: { roles: ['JEFE_TALLER', 'MECANICO'], breadcrumb: 'Operaciones' },
        loadChildren: () => import('@features/operaciones/operaciones.routes').then(m => m.OPERACIONES_ROUTES)
      },
      {
        path: 'reportes',
        canActivate: [roleGuard],
        data: { roles: ['JEFE_TALLER'], breadcrumb: 'Reportes' },
        loadChildren: () => import('@features/reportes/reportes.routes').then(m => m.REPORTES_ROUTES)
      },
      {
        path: 'admin',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'], breadcrumb: 'Administración' },
        loadChildren: () => import('@features/admin/admin.routes').then(m => m.ADMIN_ROUTES)
      },
      {
        path: 'acceso-denegado',
        title: 'Acceso denegado',
        loadComponent: () => import('@features/errores/acceso-denegado-page').then(m => m.AccesoDenegadoPage)
      },
      {
        path: '**',
        title: 'Página no encontrada',
        loadComponent: () => import('@features/errores/no-encontrada-page').then(m => m.NoEncontradaPage)
      }
    ]
  }
];
