// src/app/core/api/api-error.ts
import { HttpErrorResponse } from '@angular/common/http';

export interface FieldDetail {
  field: string;
  reason: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
  details?: FieldDetail[];
  endpoint?: string;
  timestamp?: string;
}

export class ApiError {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly message: string,
    public readonly details: FieldDetail[] = [],
    public readonly raw?: unknown
  ) {}

  getFieldReason(fieldName: string): string | undefined {
    return this.details.find(d => d.field === fieldName)?.reason;
  }
}

/**
 * Parsea de forma segura cualquier error HTTP a una estructura homogénea ApiError
 */
export function parseApiError(err: unknown): ApiError {
  if (err instanceof HttpErrorResponse) {
    const status = err.status || 0;
    const body = err.error;

    if (body && typeof body === 'object') {
      const resp = body as Partial<ErrorResponse>;
      const code = resp.error || (status === 401 ? 'UNAUTHORIZED' : status === 403 ? 'FORBIDDEN' : 'SERVER_ERROR');
      const message = resp.message || err.message || 'Error en la petición';
      const details = Array.isArray(resp.details) ? resp.details : [];
      return new ApiError(status, code, message, details, body);
    }

    if (status === 0) {
      return new ApiError(0, 'NETWORK_ERROR', 'No se pudo conectar con el servidor. Revisa tu conexión a internet.');
    }

    return new ApiError(status, `HTTP_${status}`, err.statusText || 'Error desconocido');
  }

  if (err instanceof ApiError) {
    return err;
  }

  return new ApiError(0, 'UNKNOWN_ERROR', 'Ocurrió un error inesperado');
}
