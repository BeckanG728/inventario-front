// src/app/core/api/dashboard/dashboard.models.ts
import { AlertaResponse } from '../inventario/inventario.models';

/** Resumen de inventario incluido en DashboardResponse — §8.1 */
export interface DashboardInventario {
  totalProductos: number;
  productosStockNormal: number;
  productosBajoStock: number;
  productosSinStock: number;
}

/** KPIs del mes incluidos en DashboardResponse — §8.1 */
export interface DashboardKpis {
  valorEstimadoInventario: number;
  productosSinCosto: number;
  entradasMes: number;
  consumosMes: number;
  ajustesMes: number;
}

/** Bloque de alertas del dashboard (máx. 5) — §8.1 */
export interface DashboardAlertas {
  total: number;
  masUrgentes: AlertaResponse[];
}

/**
 * Movimiento resumido para el widget de últimos movimientos del dashboard.
 * Distinto de MovimientoResponse: incluye `productoCodigo`, `productoNombre` y
 * `usuario` (string), pero no detalla todos los campos del movimiento.
 * Limitado a los 5 más recientes — §8.1
 */
export interface DashboardMovimientoResumen {
  id: number;
  fecha: string;
  tipo: 'ENTRADA' | 'CONSUMO' | 'AJUSTE';
  productoCodigo: string;
  productoNombre: string;
  cantidad: number;
  variacion: number;
  usuario: string;
}

/** Respuesta completa de GET /api/dashboard — §8.1 */
export interface DashboardResponse {
  inventario: DashboardInventario;
  kpis: DashboardKpis;
  alertas: DashboardAlertas;
  ultimosMovimientos: DashboardMovimientoResumen[];
}
