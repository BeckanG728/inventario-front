// src/app/core/api/inventario/inventario.models.ts

/** Respuesta de GET /api/existencias — §6.1 */
export interface ExistenciaResponse {
  productoId: number;
  codigo: string;
  nombre: string;
  stockActual: number;
  stockMinimo: number;
  stockCritico: boolean;
}

/** Respuesta de GET /api/alertas — §7.1 */
export interface AlertaResponse {
  codigo: string;
  nombre: string;
  stockActual: number;
  stockMinimo: number;
  cantidadSugerida: number;
  proveedor: string;
}
