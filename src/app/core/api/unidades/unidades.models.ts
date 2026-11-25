// src/app/core/api/unidades/unidades.models.ts

/** Unidad de negocio expuesta por GET /api/unidades. */
export interface UnidadResponse {
  id: number;
  codigo: string;
  nombre: string;
  permiteFragmentacion: boolean;
}
