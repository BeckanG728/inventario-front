// src/app/features/reportes/reportes-nav.ts
import { PillNavItem } from '@shared/ui/pill-nav/pill-nav';

export const REPORTES_NAV_ITEMS: PillNavItem[] = [
  { label: 'Movimientos', route: '/reportes/movimientos' },
  { label: 'Consumo', route: '/reportes/consumo' },
  { label: 'Valor de inventario', route: '/reportes/valor-inventario' },
  { label: 'Bajo stock', route: '/reportes/bajo-stock' },
  { label: 'Estadísticas', route: '/reportes/estadisticas' }
];
