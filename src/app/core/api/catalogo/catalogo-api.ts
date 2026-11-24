// src/app/core/api/catalogo/catalogo-api.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-config';
import { PaginaResponse } from '../pagina.models';
import {
  CategoriaRequest,
  CategoriaResponse,
  ProveedorRequest,
  ProveedorResponse
} from './catalogo.models';

export interface ListarCategoriasParams {
  page?: number;
  size?: number;
  nombre?: string;
  activo?: boolean;
}

export interface ListarProveedoresParams {
  page?: number;
  size?: number;
  razonSocial?: string;
  ruc?: string;
  activo?: boolean;
}

/** Arma los query params omitiendo valores vacíos (undefined, null o texto en blanco). */
function construirParams(valores: Record<string, string | number | boolean | undefined | null>): HttpParams {
  let params = new HttpParams();
  for (const [clave, valor] of Object.entries(valores)) {
    if (valor === undefined || valor === null) continue;
    const texto = String(valor).trim();
    if (texto === '') continue;
    params = params.set(clave, texto);
  }
  return params;
}

@Injectable({
  providedIn: 'root'
})
export class CatalogoApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  crearCategoria(body: CategoriaRequest): Observable<CategoriaResponse> {
    return this.http.post<CategoriaResponse>(`${this.baseUrl}/categorias`, body);
  }

  crearProveedor(body: ProveedorRequest): Observable<ProveedorResponse> {
    return this.http.post<ProveedorResponse>(`${this.baseUrl}/proveedores`, body);
  }

  /** GET /api/categorias/activos — lista ligera sin paginar (JEFE_TALLER, MECANICO). */
  listarCategoriasActivas(): Observable<CategoriaResponse[]> {
    return this.http.get<CategoriaResponse[]>(`${this.baseUrl}/categorias/activos`);
  }

  /** GET /api/proveedores/activos — lista ligera sin paginar (JEFE_TALLER, MECANICO). */
  listarProveedoresActivos(): Observable<ProveedorResponse[]> {
    return this.http.get<ProveedorResponse[]>(`${this.baseUrl}/proveedores/activos`);
  }

  /** GET /api/categorias — lista paginada (solo JEFE_TALLER). */
  listarCategorias(params: ListarCategoriasParams = {}): Observable<PaginaResponse<CategoriaResponse>> {
    return this.http.get<PaginaResponse<CategoriaResponse>>(`${this.baseUrl}/categorias`, {
      params: construirParams({
        page: params.page,
        size: params.size,
        nombre: params.nombre,
        activo: params.activo
      })
    });
  }

  /** GET /api/proveedores — lista paginada (solo JEFE_TALLER). */
  listarProveedores(params: ListarProveedoresParams = {}): Observable<PaginaResponse<ProveedorResponse>> {
    return this.http.get<PaginaResponse<ProveedorResponse>>(`${this.baseUrl}/proveedores`, {
      params: construirParams({
        page: params.page,
        size: params.size,
        razonSocial: params.razonSocial,
        ruc: params.ruc,
        activo: params.activo
      })
    });
  }
}