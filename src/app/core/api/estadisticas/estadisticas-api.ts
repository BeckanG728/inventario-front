// src/app/core/api/estadisticas/estadisticas-api.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-config';
import { EstadisticasParams, EstadisticasResponse } from './estadisticas.models';

@Injectable({ providedIn: 'root' })
export class EstadisticasApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /**
   * GET /api/estadisticas?from=...&to=...&granularity=...
   * Movimientos agrupados por período según granularidad (DAY, WEEK, MONTH) (§10.1).
   * Requiere rol JEFE_TALLER.
   */
  getEstadisticas(params: EstadisticasParams): Observable<EstadisticasResponse> {
    const httpParams = new HttpParams()
      .set('from', params.from)
      .set('to', params.to)
      .set('granularity', params.granularity);

    return this.http.get<EstadisticasResponse>(`${this.baseUrl}/estadisticas`, {
      params: httpParams
    });
  }
}
