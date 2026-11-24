// src/app/core/api/usuarios/usuarios-api.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-config';
import { PaginaResponse } from '../pagina.models';
import { UserRole } from '../auth/auth.models';
import { ActualizarUsuarioRequest, ResetPasswordRequest, UsuarioResponse } from './usuarios.models';

export interface ListarUsuariosParams {
  page?: number;
  size?: number;
  username?: string;
  role?: UserRole;
  activo?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UsuariosApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  listar(params: ListarUsuariosParams = {}): Observable<PaginaResponse<UsuarioResponse>> {
    let httpParams = new HttpParams();

    if (params.page !== undefined && params.page !== null) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params.size !== undefined && params.size !== null) {
      httpParams = httpParams.set('size', params.size.toString());
    }
    if (params.username?.trim()) {
      httpParams = httpParams.set('username', params.username.trim());
    }
    if (params.role) {
      httpParams = httpParams.set('role', params.role);
    }
    if (params.activo !== undefined && params.activo !== null) {
      httpParams = httpParams.set('activo', String(params.activo));
    }

    return this.http.get<PaginaResponse<UsuarioResponse>>(`${this.baseUrl}/usuarios`, {
      params: httpParams
    });
  }

  obtener(id: number): Observable<UsuarioResponse> {
    return this.http.get<UsuarioResponse>(`${this.baseUrl}/usuarios/${id}`);
  }

  actualizar(id: number, body: ActualizarUsuarioRequest): Observable<UsuarioResponse> {
    return this.http.put<UsuarioResponse>(`${this.baseUrl}/usuarios/${id}`, body);
  }

  resetPassword(id: number, body: ResetPasswordRequest): Observable<UsuarioResponse> {
    return this.http.patch<UsuarioResponse>(`${this.baseUrl}/usuarios/${id}/password`, body);
  }
}
