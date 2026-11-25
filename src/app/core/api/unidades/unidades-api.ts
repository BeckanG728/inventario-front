// src/app/core/api/unidades/unidades-api.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-config';
import { UnidadResponse } from './unidades.models';

@Injectable({ providedIn: 'root' })
export class UnidadesApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /** Catálogo completo de unidades activas (semilla de negocio de V9). */
  listar(): Observable<UnidadResponse[]> {
    return this.http.get<UnidadResponse[]>(`${this.baseUrl}/unidades`);
  }

  /** Unidades válidas para una categoría (combobox del formulario de producto). */
  listarPorCategoria(categoriaId: number): Observable<UnidadResponse[]> {
    return this.http.get<UnidadResponse[]>(`${this.baseUrl}/categorias/${categoriaId}/unidades`);
  }
}
