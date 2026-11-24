// src/app/core/api/inventario/inventario.models.ts

/** Clasificación operativa del nivel de stock (RN309). */
export type EstadoStock = 'SIN_STOCK' | 'BAJO' | 'NORMAL';

/**
 * Fila de `GET /api/monitoreo/existencias` (CATALOGO_ENDPOINTS §6.1).
 * Incluye todos los campos de `ProductoResponse` más la valoración operativa calculada
 * por el backend (`estadoStock` y `cantidadSugerida`), por lo que puede pasarse directamente
 * al modal de detalle de catálogo.
 */
export interface ExistenciaConsultaResponse {
  id: number;
  codigo: string;
  sku: string;
  nombre: string;
  descripcion: string | null;
  unidadMedida: string;
  stockActual: number;
  stockMinimo: number;
  stockCritico: boolean;
  costoUltimaCompra: number | null;
  activo: boolean;
  categoriaId: number;
  categoriaNombre: string;
  proveedorId: number;
  proveedorRazonSocial: string;
  estadoStock: EstadoStock;
  cantidadSugerida: number;
}

/** Respuesta de `GET /api/monitoreo/alertas` — CATALOGO_ENDPOINTS §7.1. */
export interface AlertaResponse {
  codigo: string;
  nombre: string;
  stockActual: number;
  stockMinimo: number;
  cantidadSugerida: number;
  proveedor: string;
}
