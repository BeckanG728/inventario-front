import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { ApiError, describeApiError, parseApiError } from './api-error';

describe('parseApiError', () => {
  it('conserva el código, mensaje y detalles del catálogo del backend', () => {
    const err = new HttpErrorResponse({
      status: 409,
      error: {
        error: 'ULTIMO_ADMIN_ACTIVO',
        message: 'No se puede desactivar el último administrador activo',
        details: [{ field: 'activo', reason: 'Debe existir al menos un ADMIN activo' }]
      }
    });

    const parsed = parseApiError(err);

    expect(parsed).toBeInstanceOf(ApiError);
    expect(parsed.status).toBe(409);
    expect(parsed.code).toBe('ULTIMO_ADMIN_ACTIVO');
    expect(parsed.message).toBe('No se puede desactivar el último administrador activo');
    expect(parsed.getFieldReason('activo')).toBe('Debe existir al menos un ADMIN activo');
    expect(parsed.getFieldReason('role')).toBeUndefined();
  });

  it('lee Retry-After y marca el error como límite de peticiones', () => {
    const err = new HttpErrorResponse({
      status: 429,
      error: { error: 'RATE_LIMIT_EXCEEDED', message: 'Demasiados intentos' },
      headers: new HttpHeaders({ 'Retry-After': '30' })
    });

    const parsed = parseApiError(err);

    expect(parsed.isRateLimit).toBe(true);
    expect(parsed.retryAfterSeconds).toBe(30);
    expect(describeApiError(parsed, 'Demasiadas peticiones.')).toContain('30 s');
  });

  it('aplica el código del catálogo cuando el cuerpo no trae error', () => {
    const casos: Array<[number, string]> = [
      [400, 'VALIDATION_ERROR'],
      [401, 'UNAUTHORIZED'],
      [403, 'FORBIDDEN'],
      [404, 'NOT_FOUND'],
      [405, 'METHOD_NOT_ALLOWED'],
      [415, 'UNSUPPORTED_MEDIA_TYPE'],
      [429, 'RATE_LIMIT_EXCEEDED'],
      [500, 'INTERNAL_ERROR'],
      [418, 'HTTP_418']
    ];

    for (const [status, code] of casos) {
      expect(parseApiError(new HttpErrorResponse({ status, error: null })).code).toBe(code);
    }
  });

  it('distingue errores de red de errores inesperados', () => {
    const red = parseApiError(new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') }));
    expect(red.code).toBe('NETWORK_ERROR');
    expect(red.message).toContain('conectar');

    const otro = parseApiError('boom');
    expect(otro.code).toBe('UNKNOWN_ERROR');
    expect(describeApiError(otro)).toBe('Ocurrió un error inesperado');
  });
});
