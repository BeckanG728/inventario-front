// src/app/core/api/operaciones/operaciones-api.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { defer, Observable, tap } from 'rxjs';
import { SessionStore } from '../../auth/session-store';
import { API_BASE_URL } from '../api-config';
import {
  AjusteRequest,
  ConsumoRequest,
  ConsumoResponse,
  EntradaRequest,
  EntradaResponse,
  MovimientoResponse,
  ProductoFrecuente
} from './operaciones.models';

@Injectable({
  providedIn: 'root'
})
export class OperacionesApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly session = inject(SessionStore);
  private readonly clavesPendientes = new Map<string, string>();

  /**
   * Productos más consumidos por el usuario (GET /api/consumos/productos-frecuentes).
   * Sin parámetros; devuelve hasta 5 filas listas para agregar al carrito.
   */
  getProductosFrecuentes(): Observable<ProductoFrecuente[]> {
    return this.http.get<ProductoFrecuente[]>(`${this.baseUrl}/consumos/productos-frecuentes`);
  }

  /**
   * Registra el consumo de materiales (POST /api/consumos).
   * Descuenta stock atómicamente. Retorna 409 STOCK_INSUFICIENTE si falta inventario.
   */
  registrarConsumo(body: ConsumoRequest): Observable<ConsumoResponse> {
    return this.registrarMovimiento<ConsumoResponse>('/consumos', body);
  }

  /**
   * Registra una entrada por compra a proveedor (POST /api/movimientos/entrada).
   * Incrementa stock y actualiza costo de última compra.
   */
  registrarEntrada(body: EntradaRequest): Observable<EntradaResponse> {
    return this.registrarMovimiento<EntradaResponse>('/movimientos/entrada', body);
  }

  /**
   * Registra un ajuste de stock fijando cantidad física real (POST /api/movimientos/ajuste).
   */
  registrarAjuste(body: AjusteRequest): Observable<MovimientoResponse> {
    return this.registrarMovimiento<MovimientoResponse>('/movimientos/ajuste', body);
  }

  private registrarMovimiento<T>(
    ruta: string,
    body: ConsumoRequest | EntradaRequest | AjusteRequest
  ): Observable<T> {
    return defer(() => {
      const operacion = JSON.stringify([this.session.userId(), ruta, body]);
      const clave = this.clavesPendientes.get(operacion) ?? this.crearClave();
      this.clavesPendientes.set(operacion, clave);

      return this.http.post<T>(this.baseUrl + ruta, body, {
        headers: { 'Idempotency-Key': clave }
      }).pipe(
        tap(() => {
          if (this.clavesPendientes.get(operacion) === clave) {
            this.clavesPendientes.delete(operacion);
          }
        })
      );
    });
  }

  private crearClave(): string {
    // También funciona en instalaciones locales que sirven Angular por HTTP.
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
  }
}
