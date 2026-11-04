// src/app/core/api/productos/productos.models.ts

export interface CreateProductoRequest {
  codigo: string;
  nombre: string;
  descripcion?: string;
  unidadMedida: string;
  stockMinimo: number;
  id_categoria: number;
  id_proveedor: number;
  // Aliases soportados por backend (§5.1)
  idCategoria?: number;
  idProveedor?: number;
}

export interface UpdateProductoRequest {
  codigo: string;
  nombre: string;
  descripcion?: string;
  unidadMedida: string;
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
  // Alias de conveniencia por si se accede como idCategoria o idProveedor
  idCategoria?: number;
  idProveedor?: number;
}
