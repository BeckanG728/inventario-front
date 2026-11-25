// src/app/core/api/operaciones/unidad-registro.ts
import { ProductoResponse } from '../productos/productos.models';

/** Parte del payload de entrada/consumo/ajuste relativa a la unidad de registro (V9). */
export interface RegistroUnidadPayload {
  unidadRegistro?: string;
  factorAplicado?: number;
  cantidad?: number;
  cantidadExacta?: number;
  cantidadFisica?: number;
  cantidadFisicaExacta?: number;
}

/**
 * Construye el bloque de unidad para una operación.
 * -Si se elige la unidad base, no se envía factor.
 * -Si se elige una presentación, se envía su factor por defecto.
 * -Si se informa cantidadExacta (decimal, p. ej. 1.5 m), prevalece sobre la cantidad entera.
 */
export function construirRegistroUnidad(
  producto: ProductoResponse | null,
  codigo: string,
  cantidad: number,
  cantidadExacta?: number | null,
  prefijoCantidad: 'cantidad' | 'cantidadFisica' = 'cantidad'
): RegistroUnidadPayload {
  const exacta = cantidadExacta != null && cantidadExacta > 0 ? cantidadExacta : null;
  const payload: RegistroUnidadPayload = {};
  if (codigo) {
    payload.unidadRegistro = codigo;
    const base = producto?.unidadBaseCodigo;
    if (codigo !== base && codigo === producto?.unidadPresentacionCodigo) {
      payload.factorAplicado = producto.factorPresentacion ?? undefined;
    }
  }
  if (prefijoCantidad === 'cantidadFisica') {
    if (exacta !== null) {
      payload.cantidadFisicaExacta = exacta;
    } else {
      payload.cantidadFisica = cantidad;
    }
  } else {
    if (exacta !== null) {
      payload.cantidadExacta = exacta;
    } else {
      payload.cantidad = cantidad;
    }
  }
  return payload;
}

/** Opciones de unidad que el usuario puede elegir para registrar una operación. */
export function unidadesDeRegistro(producto: ProductoResponse | null): string[] {
  if (!producto) return [];
  const base = producto.unidadBaseCodigo;
  const presentacion = producto.unidadPresentacionCodigo;
  return presentacion && presentacion !== base ? [base, presentacion] : [base];
}
