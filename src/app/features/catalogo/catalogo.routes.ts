// src/app/features/catalogo/catalogo.routes.ts
import { Routes } from '@angular/router';
import { roleGuard } from '@core/auth/role.guard';

export const CATALOGO_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'productos'
  },
  {
    path: 'productos',
    title: 'Productos',
    canActivate: [roleGuard],
    data: { roles: ['JEFE_TALLER', 'MECANICO'] },
    loadComponent: () => import('./productos/productos-page').then(m => m.ProductosPage)
  },
  {
    path: 'categorias',
    title: 'Categorías',
    canActivate: [roleGuard],
    data: { roles: ['JEFE_TALLER'] },
    loadComponent: () => import('./categorias/categoria-form-page').then(m => m.CategoriaFormPage)
  },
  {
    path: 'proveedores',
    title: 'Proveedores',
    canActivate: [roleGuard],
    data: { roles: ['JEFE_TALLER'] },
    loadComponent: () => import('./proveedores/proveedor-form-page').then(m => m.ProveedorFormPage)
  }
];
