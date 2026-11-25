// src/app/core/api/productos/productos.models.ts

export interface CreateProductoRequest {
  nombre: string;
  descripcion?: string;
  unidadBaseId: number;
  unidadPresentacionId?: number;
  factorPresentacion?: number;
  stockMinimo: number;
  id_categoria: number;
  id_proveedor: number;
  // Aliases soportados por backend (§5.1)
  idCategoria?: number;
  idProveedor?: number;
}

export interface UpdateProductoRequest {
  nombre: string;
  descripcion?: string;
  unidadBaseId: number;
  unidadPresentacionId?: number;
  factorPresentacion?: number;
  stockMinimo: number;
  activo?: boolean;
  id_categoria: number;
  id_proveedor: number;
  // Aliases soportados por backend (§5.3)
  idCategoria?: number;
  idProveedor?: number;
}

export interface StockMinimoRequest {
  nuevoStockMinimo: number;
}

export interface ProductoResponse {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  stockActual: number;
  stockMinimo: number;
  stockCritico: boolean;
  costoUltimaCompra: number | null;
  activo: boolean;
  categoriaId: number;
  categoriaNombre: string;
  proveedorId: number;
  proveedorRazonSocial: string;
  unidadBaseId: number;
  unidadBaseCodigo: string;
  unidadBaseNombre: string;
  unidadPresentacionId?: number | null;
  unidadPresentacionCodigo?: string | null;
  factorPresentacion?: number | null;
  // Alias de conveniencia por si se accede como idCategoria o idProveedor
  idCategoria?: number;
  idProveedor?: number;
}
