// src/app/core/api/operaciones/operaciones.models.ts
import { EstadoStock } from '../inventario/inventario.models';
import { ProductoResponse } from '../productos/productos.models';

/** Fila de GET /api/consumos/productos-frecuentes (sin parámetros, máx. 5). */
export interface ProductoFrecuente {
  productoId: number;
  codigo: string;
  nombre: string;
  stockActual: number;
  stockMinimo: number;
  stockCritico: boolean;
  estadoStock: EstadoStock;
  categoriaNombre: string;
  vecesConsumido: number;
  unidadesConsumidas: number;
  unidadBaseCodigo?: string | null;
  unidadPresentacionCodigo?: string | null;
  factorPresentacion?: number | null;
}

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
  /** Snapshot de la unidad introducida por el usuario (V9). */
  unidadRegistro?: string | null;
  factorAplicado?: number | null;
  cantidadBase?: number | null;
}

export interface EntradaRequest {
  productoId: number;
  proveedorId: number;
  cantidad?: number;
  costoUnitario: number;
  unidadRegistro?: string;
  factorAplicado?: number;
  /** Decimal solo para longitud (se convierte a CM en el backend). */
  cantidadExacta?: number;
}

export interface EntradaResponse {
  movimiento: MovimientoResponse;
  producto: ProductoResponse;
}

export interface AjusteRequest {
  productoId: number;
  cantidadFisica?: number;
  cantidadFisicaExacta?: number;
  justificacion: string;
  unidadRegistro?: string;
  factorAplicado?: number;
}

export interface ConsumoItemRequest {
  productoId: number;
  cantidad?: number;
  unidadRegistro?: string;
  factorAplicado?: number;
  cantidadExacta?: number;
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
