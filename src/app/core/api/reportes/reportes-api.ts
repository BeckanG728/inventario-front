// src/app/core/api/reportes/reportes-api.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-config';
import {
  ExportValorInventarioParams,
  ReporteMovimientosParams,
  ReporteMovimientosResponse,
  ValorInventarioParams,
  ValorInventarioResponse
} from './reportes.models';

@Injectable({ providedIn: 'root' })
export class ReportesApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /**
   * GET /api/movimientos
   * Reporte paginado de movimientos con totales globales por tipo (§9.1).
   * Requiere rol JEFE_TALLER.
   */
  getMovimientos(params: ReporteMovimientosParams): Observable<ReporteMovimientosResponse> {
    let httpParams = new HttpParams()
      .set('desde', params.desde)
      .set('hasta', params.hasta);

    if (params.tipo) {
      httpParams = httpParams.set('tipo', params.tipo);
    }
    if (params.page !== undefined && params.page !== null) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params.size !== undefined && params.size !== null) {
      httpParams = httpParams.set('size', params.size.toString());
    }

    return this.http.get<ReporteMovimientosResponse>(`${this.baseUrl}/movimientos`, {
      params: httpParams
    });
  }

  /**
   * GET /api/reportes/valor-inventario
   * Valor estimado del inventario activo y detalle por producto (§9.2).
   * Requiere rol JEFE_TALLER.
   */
  getValorInventario(params: ValorInventarioParams = {}): Observable<ValorInventarioResponse> {
    let httpParams = new HttpParams();
    if (params.page !== undefined && params.page !== null) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params.size !== undefined && params.size !== null) {
      httpParams = httpParams.set('size', params.size.toString());
    }

    return this.http.get<ValorInventarioResponse>(`${this.baseUrl}/reportes/valor-inventario`, {
      params: httpParams
    });
  }

  /**
   * GET /api/reportes/valor-inventario/exportar
   * Exporta el reporte de valorización en PDF o Excel (§9.5).
   * Requiere rol JEFE_TALLER.
   */
  exportarValorInventario(params: ExportValorInventarioParams): Observable<HttpResponse<Blob>> {
    const httpParams = new HttpParams().set('formato', params.formato);

    return this.http.get(`${this.baseUrl}/reportes/valor-inventario/exportar`, {
      params: httpParams,
      observe: 'response',
      responseType: 'blob'
    });
  }
}
