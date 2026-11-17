// src/app/layout/sidebar/nav-items.ts
import {
  LucideArrowLeftRight,
  LucideChartColumn,
  LucideChartLine,
  LucideChartNoAxesCombined,
  LucideCircleDollarSign,
  LucideLayoutDashboard,
  LucidePackage,
  LucidePackageMinus,
  LucidePackagePlus,
  LucideSlidersHorizontal,
  LucideTags,
  LucideTrendingDown,
  LucideTriangleAlert,
  LucideTruck,
  LucideUserPlus,
  LucideWarehouse
} from '@lucide/angular';
import type { LucideIconInput } from '@lucide/angular';
import { ROUTE_ROLES, UserRole } from '@core/auth/roles';

export interface NavLink {
  kind: 'link';
  id: string;
  label: string;
  route: string;
  icon: LucideIconInput;
}

export interface NavGroup {
  kind: 'group';
  id: string;
  label: string;
  icon: LucideIconInput;
  children: NavLink[];
}

export type NavEntry = NavLink | NavGroup;

export interface NavSection {
  id: string;
  title: string;
  entries: NavEntry[];
}

/**
 * Catálogo completo de navegación. Solo incluye rutas que existen en app.routes.
 * La visibilidad por rol NO se define aquí: se deriva de ROUTE_ROLES (misma fuente que roleGuard).
 */
const NAV_SECTIONS: NavSection[] = [
  {
    id: 'general',
    title: 'General',
    entries: [
      { kind: 'link', id: 'dashboard', label: 'Panel principal', route: '/dashboard', icon: LucideLayoutDashboard }
    ]
  },
  {
    id: 'catalogo',
    title: 'Catálogo',
    entries: [
      { kind: 'link', id: 'productos', label: 'Productos', route: '/catalogo/productos', icon: LucidePackage },
      { kind: 'link', id: 'categorias', label: 'Categorías', route: '/catalogo/categorias', icon: LucideTags },
      { kind: 'link', id: 'proveedores', label: 'Proveedores', route: '/catalogo/proveedores', icon: LucideTruck }
    ]
  },
  {
    id: 'inventario',
    title: 'Inventario',
    entries: [
      { kind: 'link', id: 'existencias', label: 'Existencias', route: '/inventario/existencias', icon: LucideWarehouse },
      { kind: 'link', id: 'alertas', label: 'Alertas de stock', route: '/inventario/alertas', icon: LucideTriangleAlert }
    ]
  },
  {
    id: 'operaciones',
    title: 'Operaciones',
    entries: [
      { kind: 'link', id: 'consumo', label: 'Registrar consumo', route: '/operaciones/consumo', icon: LucidePackageMinus },
      { kind: 'link', id: 'entrada', label: 'Registrar entrada', route: '/operaciones/entrada', icon: LucidePackagePlus },
      { kind: 'link', id: 'ajuste', label: 'Registrar ajuste', route: '/operaciones/ajuste', icon: LucideSlidersHorizontal }
    ]
  },
  {
    id: 'administracion',
    title: 'Administración',
    entries: [
      {
        kind: 'group',
        id: 'reportes',
        label: 'Reportes',
        icon: LucideChartNoAxesCombined,
        children: [
          { kind: 'link', id: 'rep-movimientos', label: 'Movimientos', route: '/reportes/movimientos', icon: LucideArrowLeftRight },
          { kind: 'link', id: 'rep-consumo', label: 'Consumo', route: '/reportes/consumo', icon: LucideChartColumn },
          { kind: 'link', id: 'rep-valor', label: 'Valor de inventario', route: '/reportes/valor-inventario', icon: LucideCircleDollarSign },
          { kind: 'link', id: 'rep-bajo-stock', label: 'Bajo stock', route: '/reportes/bajo-stock', icon: LucideTrendingDown },
          { kind: 'link', id: 'rep-estadisticas', label: 'Estadísticas', route: '/reportes/estadisticas', icon: LucideChartLine }
        ]
      },
      { kind: 'link', id: 'usuarios', label: 'Usuarios', route: '/admin/usuarios/nuevo', icon: LucideUserPlus }
    ]
  }
];

function canAccess(route: string, role: UserRole | null | undefined): boolean {
  return !!role && !!ROUTE_ROLES[route]?.includes(role);
}

/** Devuelve solo las secciones, grupos y enlaces autorizados para el rol (sin secciones vacías). */
export function getNavSectionsForRole(role: UserRole | null | undefined): NavSection[] {
  const sections: NavSection[] = [];

  for (const section of NAV_SECTIONS) {
    const entries: NavEntry[] = [];

    for (const entry of section.entries) {
      if (entry.kind === 'link') {
        if (canAccess(entry.route, role)) entries.push(entry);
      } else {
        const children = entry.children.filter(child => canAccess(child.route, role));
        if (children.length > 0) entries.push({ ...entry, children });
      }
    }

    if (entries.length > 0) sections.push({ ...section, entries });
  }

  return sections;
}
