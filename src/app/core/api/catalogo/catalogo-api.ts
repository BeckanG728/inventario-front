// src/app/core/api/catalogo/catalogo-api.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-config';
import {
  CategoriaRequest,
  CategoriaResponse,
  ProveedorRequest,
  ProveedorResponse
} from './catalogo.models';

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
}
