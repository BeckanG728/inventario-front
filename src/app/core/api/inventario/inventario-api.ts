// src/app/core/api/inventario/inventario-api.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-config';
import { PaginaResponse } from '../pagina.models';
import { EstadoStock, ExistenciaConsultaResponse } from './inventario.models';

export interface ConsultarExistenciasParams {
  page?: number;
  size?: number;
  nombre?: string;
  categoria?: number;
  proveedorId?: number;
  estadoStock?: EstadoStock;
}

@Injectable({ providedIn: 'root' })
export class InventarioApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /**
   * GET /api/monitoreo/existencias — CATALOGO_ENDPOINTS §6.1.
   * Listado paginado de productos activos con su valoración de stock.
   * Roles: JEFE_TALLER, MECANICO. No acepta filtro `activo`.
   */
  consultar(params: ConsultarExistenciasParams = {}): Observable<PaginaResponse<ExistenciaConsultaResponse>> {
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
    if (params.proveedorId !== undefined && params.proveedorId !== null && params.proveedorId > 0) {
      httpParams = httpParams.set('proveedorId', params.proveedorId.toString());
    }
    if (params.estadoStock) {
      httpParams = httpParams.set('estadoStock', params.estadoStock);
    }

    return this.http.get<PaginaResponse<ExistenciaConsultaResponse>>(
      `${this.baseUrl}/monitoreo/existencias`,
      { params: httpParams }
    );
  }
}
