// src/app/core/api/operaciones/operaciones.models.ts
import { ProductoResponse } from '../productos/productos.models';

export type TipoMovimiento = 'ENTRADA' | 'CONSUMO' | 'AJUSTE';

export interface MovimientoResponse {
  id: number;
  fecha: string;
  tipo: TipoMovimiento;
  /** Unidades descontadas (CONSUMO) o ingresadas (ENTRADA); null en AJUSTE */
  cantidad: number | null;
  /** Diferencia neta al stock: null en CONSUMO, con signo en AJUSTE, == cantidad en ENTRADA */
  variacion: number | null;
  stockAnterior: number;
  stockPosterior: number;
  costoUnitario: number | null;
  motivo: string;
  productoId: number;
  consumoId: number | null;
  usuarioId: number;
}

export interface EntradaRequest {
  productoId: number;
  proveedorId: number;
  cantidad: number;
  costoUnitario: number;
}

export interface EntradaResponse {
  movimiento: MovimientoResponse;
  producto: ProductoResponse;
}

export interface AjusteRequest {
  productoId: number;
  cantidadFisica: number;
  justificacion: string;
}

export interface ConsumoItemRequest {
  productoId: number;
  cantidad: number;
}

export interface ConsumoRequest {
  finalidad: string;
  items: ConsumoItemRequest[];
  referenciaVehiculoCliente?: string | null;
}

export interface ConsumoResponse {
  id: number;
  fecha: string;
  finalidad: string;
  referenciaVehiculoCliente: string | null;
  usuarioId: number;
  movimientos: MovimientoResponse[];
}
