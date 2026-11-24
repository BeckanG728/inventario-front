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

function parseRetryAfter(err: HttpErrorResponse): number | undefined {
  const raw = err.headers?.get('Retry-After');
  if (!raw) return undefined;
  const seconds = Number(raw);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
}

/**
 * Códigos de fallback alineados con el catálogo único del backend. El cuerpo de error
 * siempre trae `error`; estos valores solo se usan cuando la respuesta no es JSON o
 * viene de un proxy/interceptor.
 */
function fallbackCode(status: number): string {
  if (status >= 500) return 'INTERNAL_ERROR';
  switch (status) {
    case 400:
      return 'VALIDATION_ERROR';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 405:
      return 'METHOD_NOT_ALLOWED';
    case 415:
      return 'UNSUPPORTED_MEDIA_TYPE';
    case 429:
      return 'RATE_LIMIT_EXCEEDED';
    default:
      return `HTTP_${status}`;
  }
}

export class ApiError {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly message: string,
    public readonly details: FieldDetail[] = [],
    public readonly raw?: unknown,
    public readonly retryAfterSeconds?: number
  ) {}

  get isRateLimit(): boolean {
    return this.status === 429 || this.code === 'RATE_LIMIT_EXCEEDED';
  }

  getFieldReason(fieldName: string): string | undefined {
    return this.details.find(d => d.field === fieldName)?.reason;
  }
}

/** Texto listo para mostrar en pantalla, incluido el tiempo de espera del 429. */
export function describeApiError(error: ApiError, fallback = 'Error en la petición'): string {
  const mensaje = error.message || fallback;
  if (error.isRateLimit && error.retryAfterSeconds !== undefined && error.retryAfterSeconds > 0) {
    return `${mensaje} Puedes intentarlo nuevamente en ${error.retryAfterSeconds} s.`;
  }
  return mensaje;
}

/**
 * Parsea de forma segura cualquier error HTTP a una estructura homogénea ApiError.
 */
export function parseApiError(err: unknown): ApiError {
  if (err instanceof HttpErrorResponse) {
    const status = err.status || 0;
    const retryAfterSeconds = parseRetryAfter(err);
    const body = err.error;

    // Una respuesta con status 0 es un fallo de red/cors, no un cuerpo JSON:
    // Angular suele entregar aquí un ProgressEvent.
    if (status === 0) {
      return new ApiError(0, 'NETWORK_ERROR', 'No se pudo conectar con el servidor. Revisa tu conexión a internet.');
    }

    if (body && typeof body === 'object') {
      const resp = body as Partial<ErrorResponse>;
      const code = resp.error || fallbackCode(status);
      const message = resp.message
        || err.message
        || (status === 429 ? 'Demasiadas peticiones; intente nuevamente más tarde' : 'Error en la petición');
      const details = Array.isArray(resp.details) ? resp.details : [];
      return new ApiError(status, code, message, details, body, retryAfterSeconds);
    }

    return new ApiError(status, fallbackCode(status), err.statusText || 'Error desconocido', [], undefined, retryAfterSeconds);
  }

  if (err instanceof ApiError) {
    return err;
  }

  return new ApiError(0, 'UNKNOWN_ERROR', 'Ocurrió un error inesperado');
}
