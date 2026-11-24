// src/app/core/api/auditoria/auditoria-api.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-config';
import { PaginaResponse } from '../pagina.models';
import { AuditoriaResponse, AuditoriaTipo } from './auditoria.models';

export interface ListarAuditoriaParams {
  page?: number;
  size?: number;
  desde?: string;
  hasta?: string;
  actor?: string;
  tipo?: AuditoriaTipo;
  resultado?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuditoriaApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  listar(params: ListarAuditoriaParams = {}): Observable<PaginaResponse<AuditoriaResponse>> {
    let httpParams = new HttpParams();

    if (params.page !== undefined && params.page !== null) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params.size !== undefined && params.size !== null) {
      httpParams = httpParams.set('size', params.size.toString());
    }
    if (params.desde?.trim()) {
      httpParams = httpParams.set('desde', params.desde.trim());
    }
    if (params.hasta?.trim()) {
      httpParams = httpParams.set('hasta', params.hasta.trim());
    }
    if (params.actor?.trim()) {
      httpParams = httpParams.set('actor', params.actor.trim());
    }
    if (params.tipo) {
      httpParams = httpParams.set('tipo', params.tipo);
    }
    if (params.resultado?.trim()) {
      httpParams = httpParams.set('resultado', params.resultado.trim());
    }

    return this.http.get<PaginaResponse<AuditoriaResponse>>(`${this.baseUrl}/auditoria`, {
      params: httpParams
    });
  }
}
