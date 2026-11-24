// src/app/features/reportes/reportes-nav.ts
import { PillNavItem } from '@shared/ui/pill-nav/pill-nav';

export const REPORTES_NAV_ITEMS: PillNavItem[] = [
  { label: 'Movimientos', route: '/inventario/movimientos' },
  { label: 'Valorización', route: '/reportes/valor-inventario' },
  { label: 'Estadísticas', route: '/reportes/estadisticas' }
];
