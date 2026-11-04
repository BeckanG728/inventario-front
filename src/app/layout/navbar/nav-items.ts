// src/app/layout/navbar/nav-items.ts
import { UserRole } from '@core/auth/roles';

export interface NavItem {
  label: string;
  route: string;
}

export function getNavItemsForRole(role: UserRole | null | undefined): NavItem[] {
  switch (role) {
    case 'JEFE_TALLER':
      return [
        { label: 'Dashboard', route: '/dashboard' },
        { label: 'Catálogo', route: '/catalogo/productos' },
        { label: 'Inventario', route: '/inventario/existencias' },
        { label: 'Operaciones', route: '/operaciones/consumo' },
        { label: 'Reportes', route: '/reportes/movimientos' }
      ];

    case 'MECANICO':
      return [
        { label: 'Consumo', route: '/operaciones/consumo' },
        { label: 'Productos', route: '/catalogo/productos' },
        { label: 'Existencias', route: '/inventario/existencias' },
        { label: 'Alertas', route: '/inventario/alertas' }
      ];

    case 'ADMIN':
      return [
        { label: 'Usuarios', route: '/admin/usuarios/nuevo' }
      ];

    default:
      return [];
  }
}
