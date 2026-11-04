// src/app/core/api/inventario/inventario-api.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-config';
import { ExistenciaResponse, AlertaResponse } from './inventario.models';

@Injectable({ providedIn: 'root' })
export class InventarioApi {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /**
   * GET /api/existencias?ids=1&ids=2
   * Consulta el stock de uno o varios productos activos por sus IDs (§6.1).
   * Los IDs repetidos se ignoran en el backend (RN212).
   */
  getExistencias(ids: number[]): Observable<ExistenciaResponse[]> {
    let params = new HttpParams();
    for (const id of ids) {
      params = params.append('ids', id);
    }
    return this.http.get<ExistenciaResponse[]>(`${this.baseUrl}/existencias`, { params });
  }

  /**
   * GET /api/alertas
   * Lista productos activos con stockActual <= stockMinimo,
   * ordenados por cantidadSugerida desc y nombre asc (§7.1).
   */
  getAlertas(): Observable<AlertaResponse[]> {
    return this.http.get<AlertaResponse[]>(`${this.baseUrl}/alertas`);
  }
}
