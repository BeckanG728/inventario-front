// src/app/core/api/catalogo/catalogo.models.ts

export interface CategoriaRequest {
  nombre: string;
  descripcion?: string;
}

export interface CategoriaResponse {
  id: number;
  nombre: string;
  descripcion?: string | null;
  activo?: boolean;
  unidades?: { id: number; codigo: string; nombre: string; permiteFragmentacion: boolean }[];
}

export interface ProveedorRequest {
  ruc: string;
  razonSocial: string;
  contacto?: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
}

export interface ProveedorResponse {
  id: number;
  ruc: string;
  razonSocial: string;
  contacto?: string | null;
  telefono?: string | null;
  correo?: string | null;
  direccion?: string | null;
  activo?: boolean;
}
