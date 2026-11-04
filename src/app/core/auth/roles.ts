// src/app/core/auth/roles.ts
import { UserRole } from '../api/auth/auth.models';

export type { UserRole };

/**
 * Matriz única de permisos por ruta según POLITICAS_DE_SEGURIDAD y MAPA_NAVEGACION.
 * Utilizada por roleGuard y la navegación de la barra de menú.
 */
export const ROUTE_ROLES: Record<string, UserRole[]> = {
  '/dashboard': ['JEFE_TALLER'],
  '/catalogo/productos': ['JEFE_TALLER', 'MECANICO'],
  '/catalogo/categorias': ['JEFE_TALLER'],
  '/catalogo/proveedores': ['JEFE_TALLER'],
  '/inventario/existencias': ['JEFE_TALLER', 'MECANICO'],
  '/inventario/alertas': ['JEFE_TALLER', 'MECANICO'],
  '/operaciones/consumo': ['JEFE_TALLER', 'MECANICO'],
  '/operaciones/entrada': ['JEFE_TALLER'],
  '/operaciones/ajuste': ['JEFE_TALLER'],
  '/reportes/movimientos': ['JEFE_TALLER'],
  '/reportes/consumo': ['JEFE_TALLER'],
  '/reportes/valor-inventario': ['JEFE_TALLER'],
  '/reportes/bajo-stock': ['JEFE_TALLER'],
  '/reportes/estadisticas': ['JEFE_TALLER'],
  '/admin/usuarios/nuevo': ['ADMIN']
};

/**
 * Ruta de inicio predeterminada (Home) según el rol autenticado
 */
export function getRoleHome(role: UserRole | null | undefined): string {
  switch (role) {
    case 'ADMIN':
      return '/admin/usuarios/nuevo';
    case 'JEFE_TALLER':
      return '/dashboard';
    case 'MECANICO':
      return '/operaciones/consumo';
    default:
      return '/login';
  }
}

/**
 * Nombre descriptivo del rol para mostrar en interfaz de usuario
 */
export function getRoleLabel(role: UserRole | null | undefined): string {
  switch (role) {
    case 'ADMIN':
      return 'Administrador';
    case 'JEFE_TALLER':
      return 'Jefe de Taller';
    case 'MECANICO':
      return 'Mecánico';
    default:
      return '';
  }
}
