// src/app/core/api/reportes/reportes-api.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-config';
import {
  BajoStockResponse,
  ExportBajoStockParams,
  ExportConsumoParams,
  ExportMovimientosParams,
  ReporteConsumoParams,
  ReporteConsumoResponse,
  ReporteMovimientosParams,
  ReporteMovimientosResponse,
  ValorInventarioResponse
} from './reportes.models';

@Injectable({ providedIn: 'root' })
export class ReportesApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /**
   * GET /api/reportes/movimientos
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

    return this.http.get<ReporteMovimientosResponse>(`${this.baseUrl}/reportes/movimientos`, {
      params: httpParams
    });
  }

  /**
   * GET /api/reportes/valor-inventario
   * Valor estimado del inventario activo y detalle por producto (§9.2).
   * Requiere rol JEFE_TALLER.
   */
  getValorInventario(): Observable<ValorInventarioResponse> {
    return this.http.get<ValorInventarioResponse>(`${this.baseUrl}/reportes/valor-inventario`);
  }

  /**
   * GET /api/reportes/bajo-stock
   * Lista de productos con bajo stock agrupados por proveedor (§9.3).
   * Requiere rol JEFE_TALLER.
   */
  getBajoStock(): Observable<BajoStockResponse> {
    return this.http.get<BajoStockResponse>(`${this.baseUrl}/reportes/bajo-stock`);
  }

  /**
   * GET /api/reportes/consumo
   * Reporte de consumo agrupado por producto y mecánico (§9.4).
   * Requiere rol JEFE_TALLER.
   */
  getConsumo(params: ReporteConsumoParams): Observable<ReporteConsumoResponse> {
    const httpParams = new HttpParams()
      .set('desde', params.desde)
      .set('hasta', params.hasta);

    return this.http.get<ReporteConsumoResponse>(`${this.baseUrl}/reportes/consumo`, {
      params: httpParams
    });
  }

  /**
   * GET /api/reportes/movimientos/exportar
   * Exporta reporte de movimientos completo en formato PDF o Excel (§9.5).
   * Requiere rol JEFE_TALLER.
   */
  exportarMovimientos(params: ExportMovimientosParams): Observable<HttpResponse<Blob>> {
    let httpParams = new HttpParams()
      .set('formato', params.formato)
      .set('desde', params.desde)
      .set('hasta', params.hasta);

    if (params.tipo) {
      httpParams = httpParams.set('tipo', params.tipo);
    }

    return this.http.get(`${this.baseUrl}/reportes/movimientos/exportar`, {
      params: httpParams,
      observe: 'response',
      responseType: 'blob'
    });
  }

  /**
   * GET /api/reportes/consumo/exportar
   * Exporta reporte de consumo completo en formato PDF o Excel (§9.5).
   * Requiere rol JEFE_TALLER.
   */
  exportarConsumo(params: ExportConsumoParams): Observable<HttpResponse<Blob>> {
    const httpParams = new HttpParams()
      .set('formato', params.formato)
      .set('desde', params.desde)
      .set('hasta', params.hasta);

    return this.http.get(`${this.baseUrl}/reportes/consumo/exportar`, {
      params: httpParams,
      observe: 'response',
      responseType: 'blob'
    });
  }

  /**
   * GET /api/reportes/bajo-stock/exportar
   * Exporta reporte de bajo stock completo en formato PDF o Excel (§9.5).
   * Requiere rol JEFE_TALLER.
   */
  exportarBajoStock(params: ExportBajoStockParams): Observable<HttpResponse<Blob>> {
    const httpParams = new HttpParams().set('formato', params.formato);

    return this.http.get(`${this.baseUrl}/reportes/bajo-stock/exportar`, {
      params: httpParams,
      observe: 'response',
      responseType: 'blob'
    });
  }
}
