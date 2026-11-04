// src/app/core/api/reportes/reportes.models.ts
import { MovimientoResponse } from '../operaciones/operaciones.models';

// ─── §9.1 GET /api/reportes/movimientos ───────────────────────────────────────

/** Parámetros de consulta para el reporte de movimientos — §9.1 */
export interface ReporteMovimientosParams {
  desde: string;        // yyyy-MM-dd, obligatorio
  hasta: string;        // yyyy-MM-dd, obligatorio
  tipo?: 'ENTRADA' | 'CONSUMO' | 'AJUSTE';
  page?: number;
  size?: number;
}

/**
 * Respuesta de GET /api/reportes/movimientos — §9.1
 * Paginado: solo esta respuesta de reportes usa paginación.
 * Los totales (totalEntradas, totalConsumos, totalAjustes) reflejan TODOS los
 * movimientos del filtro, no solo la página actual.
 */
export interface ReporteMovimientosResponse {
  totalEntradas: number;
  totalConsumos: number;
  totalAjustes: number;
  movimientos: MovimientoResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// ─── §9.2 GET /api/reportes/valor-inventario ──────────────────────────────────

/** Ítem de detalle por producto en el reporte de valor — §9.2 */
export interface ValorInventarioItem {
  codigo: string;
  nombre: string;
  stockActual: number;
  costoUltimaCompra: number | null;
  valorEstimadoProducto: number;
}

/** Respuesta de GET /api/reportes/valor-inventario — §9.2 */
export interface ValorInventarioResponse {
  totalGeneral: number;
  totalProductosConCosto: number;
  productosSinCosto: number;
  detalle: ValorInventarioItem[];
}

// ─── §9.3 GET /api/reportes/bajo-stock ────────────────────────────────────────

/** Ítem por producto dentro de un grupo de proveedor en bajo-stock — §9.3 */
export interface BajoStockProductoItem {
  codigo: string;
  nombre: string;
  stockActual: number;
  stockMinimo: number;
  sugerido: number;         // nota: campo "sugerido", NO "cantidadSugerida"
}

/**
 * Grupo agrupado por proveedor en el reporte de bajo stock — §9.3.
 * Ordenados alfabéticamente por proveedor.
 */
export interface BajoStockGrupoProveedor {
  proveedor: string;
  productos: BajoStockProductoItem[];
}

/** Respuesta de GET /api/reportes/bajo-stock — §9.3 (array completo sin paginar) */
export type BajoStockResponse = BajoStockGrupoProveedor[];

// ─── §9.4 GET /api/reportes/consumo ───────────────────────────────────────────

/** Parámetros de consulta para el reporte de consumo — §9.4 */
export interface ReporteConsumoParams {
  desde: string;   // yyyy-MM-dd, obligatorio
  hasta: string;   // yyyy-MM-dd, obligatorio
}

/**
 * Ítem del reporte de consumo agrupado por producto + mecánico — §9.4.
 * Ordenado por nombre de producto y luego por mecánico.
 */
export interface ReporteConsumoItem {
  productoId: number;
  productoCodigo: string;
  productoNombre: string;
  mecanico: string;
  finalidades: string[];   // finalidades distintas declaradas
  cantidadTotal: number;
  fechas: string[];        // Instant UTC de cada movimiento agrupado
}

/** Respuesta de GET /api/reportes/consumo — §9.4 (array completo sin paginar) */
export type ReporteConsumoResponse = ReporteConsumoItem[];

// ─── §9.5 Exportaciones ───────────────────────────────────────────────────────

/** Parámetro `formato` para todos los endpoints de exportación — §9.5 */
export type FormatoExportacion = 'pdf' | 'excel' | 'xlsx';

/** Parámetros de exportación de movimientos — §9.5 */
export interface ExportMovimientosParams {
  formato: FormatoExportacion;
  desde: string;
  hasta: string;
  tipo?: 'ENTRADA' | 'CONSUMO' | 'AJUSTE';
}

/** Parámetros de exportación de consumo — §9.5 */
export interface ExportConsumoParams {
  formato: FormatoExportacion;
  desde: string;
  hasta: string;
}

/** Parámetros de exportación de bajo-stock — §9.5 */
export interface ExportBajoStockParams {
  formato: FormatoExportacion;
}
