// src/app/core/api/productos/productos-api.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-config';
import { PaginaResponse } from '../pagina.models';
import {
  CreateProductoRequest,
  ProductoResponse,
  StockMinimoRequest,
  UpdateProductoRequest
} from './productos.models';

export interface ListarProductosParams {
  page?: number;
  size?: number;
  nombre?: string;
  categoria?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProductosApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  listar(params: ListarProductosParams = {}): Observable<PaginaResponse<ProductoResponse>> {
    let httpParams = new HttpParams();

    if (params.page !== undefined && params.page !== null) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params.size !== undefined && params.size !== null) {
      httpParams = httpParams.set('size', params.size.toString());
    }
    if (params.nombre && params.nombre.trim()) {
      httpParams = httpParams.set('nombre', params.nombre.trim());
    }
    if (params.categoria !== undefined && params.categoria !== null && params.categoria > 0) {
      httpParams = httpParams.set('categoria', params.categoria.toString());
    }

    return this.http.get<PaginaResponse<ProductoResponse>>(`${this.baseUrl}/productos`, {
      params: httpParams
    });
  }

  crear(body: CreateProductoRequest): Observable<ProductoResponse> {
    return this.http.post<ProductoResponse>(`${this.baseUrl}/productos`, body);
  }

  actualizar(id: number, body: UpdateProductoRequest): Observable<ProductoResponse> {
    return this.http.put<ProductoResponse>(`${this.baseUrl}/productos/${id}`, body);
  }

  actualizarStockMinimo(id: number, body: StockMinimoRequest): Observable<ProductoResponse> {
    return this.http.put<ProductoResponse>(`${this.baseUrl}/productos/${id}/stock-minimo`, body);
  }

  desactivar(id: number): Observable<ProductoResponse> {
    return this.http.patch<ProductoResponse>(`${this.baseUrl}/productos/${id}/desactivar`, {});
  }
}
