// src/app/core/api/estadisticas/estadisticas.models.ts

/** Valores válidos para la granularidad de estadísticas — §10.1 */
export type Granularidad = 'DAY' | 'WEEK' | 'MONTH';

/** Parámetros de consulta para GET /api/estadisticas — §10.1 */
export interface EstadisticasParams {
  from: string;              // yyyy-MM-dd, obligatorio
  to: string;                // yyyy-MM-dd, obligatorio
  granularity: Granularidad; // obligatorio
}

/**
 * Respuesta de GET /api/estadisticas — §10.1
 * Mapa cuyas claves son la fecha de inicio del período (yyyy-MM-dd):
 *   - DAY   → el día mismo
 *   - WEEK  → el lunes de la semana
 *   - MONTH → el día 1 del mes
 * Los períodos sin movimientos se omiten; los conteos son el número de movimientos.
 * Los cortes se calculan en zona horaria America/Lima.
 *
 * Ejemplo: { "2026-10-01": 3, "2026-10-03": 5 }
 */
export type EstadisticasResponse = Record<string, number>;

/** Parámetros de `GET /api/estadisticas/por-tipo`. `productoId` es opcional. */
export interface EstadisticasPorTipoParams extends EstadisticasParams {
  productoId?: number | null;
}

/**
 * Un período de `GET /api/estadisticas/por-tipo`. Los valores son UNIDADES, no conteos:
 * `entrada` (unidades ingresadas), `consumo` (unidades retiradas) y `ajuste`
 * (valor absoluto de la variación). `fecha` es el inicio del período (`yyyy-MM-dd`).
 */
export interface EstadisticasTipoPunto {
  fecha: string;
  entrada: number;
  consumo: number;
  ajuste: number;
  /** Campos de costo incorporados por el backend. Opcionales por compatibilidad. */
  costoEntradas?: number;
  costoConsumos?: number;
  costoAjustes?: number;
}

