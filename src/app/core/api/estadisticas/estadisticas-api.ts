// src/app/core/api/estadisticas/estadisticas-api.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-config';
import {
  EstadisticasParams,
  EstadisticasPorTipoParams,
  EstadisticasResponse,
  EstadisticasTipoPunto
} from './estadisticas.models';

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

  /**
   * GET /api/estadisticas/por-tipo — unidades por período y tipo de movimiento.
   * Extensión incorporada en `ref/design`; no aparece aún en CATALOGO_ENDPOINTS §10.
   */
  getPorTipo(params: EstadisticasPorTipoParams): Observable<EstadisticasTipoPunto[]> {
    let httpParams = new HttpParams()
      .set('from', params.from)
      .set('to', params.to)
      .set('granularity', params.granularity);
    if (params.productoId) {
      httpParams = httpParams.set('productoId', params.productoId);
    }
    return this.http.get<EstadisticasTipoPunto[]>(`${this.baseUrl}/estadisticas/por-tipo`, {
      params: httpParams
    });
  }
}
