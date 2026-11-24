// src/app/core/api/reportes/reportes.models.ts
// ─── §9.1 GET /api/movimientos ────────────────────────────────────────────────

/** Parámetros de consulta para el reporte de movimientos — §9.1 */
export interface ReporteMovimientosParams {
  desde: string;        // yyyy-MM-dd, obligatorio
  hasta: string;        // yyyy-MM-dd, obligatorio
  tipo?: 'ENTRADA' | 'CONSUMO' | 'AJUSTE';
  page?: number;
  size?: number;
}

/** Fila de GET /api/movimientos — 15 campos del contrato. */
export interface MovimientoReporteResponse {
  id: number;
  fecha: string;
  tipo: 'ENTRADA' | 'CONSUMO' | 'AJUSTE';
  cantidad: number | null;
  variacion: number | null;
  stockAnterior: number;
  stockPosterior: number;
  costoUnitario: number | null;
  motivo: string;
  productoId: number;
  productoCodigo: string;
  productoNombre: string;
  consumoId: number | null;
  usuarioId: number;
  usuarioUsername: string;
}

/**
 * Respuesta de GET /api/movimientos — §9.1
 * Paginado: ambas respuestas de reportes incluyen metadatos de página.
 * Los totales (totalEntradas, totalConsumos, totalAjustes) reflejan TODOS los
 * movimientos del filtro, no solo la página actual.
 */
export interface ReporteMovimientosResponse {
  totalEntradas: number;
  totalConsumos: number;
  totalAjustes: number;
  movimientos: MovimientoReporteResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// ─── §9.2 GET /api/reportes/valor-inventario ──────────────────────────────────

/** Parámetros de paginación para el reporte de valoración — §9.2 */
export interface ValorInventarioParams {
  page?: number;
  size?: number;
}

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
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// ─── §9.5 Exportaciones ───────────────────────────────────────────────────────

/** Parámetros de exportación de valor-inventario — §9.5 */
export interface ExportValorInventarioParams {
  formato: 'pdf' | 'excel';
}

