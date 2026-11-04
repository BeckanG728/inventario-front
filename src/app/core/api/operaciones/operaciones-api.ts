// src/app/core/api/operaciones/operaciones-api.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-config';
import {
  AjusteRequest,
  ConsumoRequest,
  ConsumoResponse,
  EntradaRequest,
  EntradaResponse,
  MovimientoResponse
} from './operaciones.models';

@Injectable({
  providedIn: 'root'
})
export class OperacionesApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /**
   * Registra el consumo de materiales (POST /api/consumos).
   * Descuenta stock atómicamente. Retorna 409 STOCK_INSUFICIENTE si falta inventario.
   */
  registrarConsumo(body: ConsumoRequest): Observable<ConsumoResponse> {
    return this.http.post<ConsumoResponse>(`${this.baseUrl}/consumos`, body);
  }

  /**
   * Registra una entrada por compra a proveedor (POST /api/movimientos/entrada).
   * Incrementa stock y actualiza costo de última compra.
   */
  registrarEntrada(body: EntradaRequest): Observable<EntradaResponse> {
    return this.http.post<EntradaResponse>(`${this.baseUrl}/movimientos/entrada`, body);
  }

  /**
   * Registra un ajuste de stock fijando cantidad física real (POST /api/movimientos/ajuste).
   */
  registrarAjuste(body: AjusteRequest): Observable<MovimientoResponse> {
    return this.http.post<MovimientoResponse>(`${this.baseUrl}/movimientos/ajuste`, body);
  }
}
