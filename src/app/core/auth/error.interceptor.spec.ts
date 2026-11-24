import { HttpClient, HttpHeaders, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { ToastService } from '../notifications/toast-service';
import { authInterceptor } from './auth.interceptor';
import { errorInterceptor } from './error.interceptor';
import { SessionStore } from './session-store';

describe('errorInterceptor', () => {
  const token = signal<string | null>(null);
  const clear = vi.fn(() => token.set(null));
  const navigate = vi.fn();
  const warning = vi.fn();
  const error = vi.fn();
  let http: HttpClient;
  let requests: HttpTestingController;

  beforeEach(() => {
    token.set('token-anterior');
    clear.mockClear();
    navigate.mockClear();
    warning.mockClear();
    error.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
        { provide: SessionStore, useValue: { token, clear } },
        { provide: Router, useValue: { url: '/inventario', navigate } },
        { provide: ToastService, useValue: { warning, error } }
      ]
    });
    http = TestBed.inject(HttpClient);
    requests = TestBed.inject(HttpTestingController);
  });

  afterEach(() => requests.verify());

  it('conserva la sesión cuando falla una petición con el token anterior', () => {
    http.get('/api/productos').subscribe({ error: () => {} });
    const request = requests.expectOne('/api/productos');
    expect(request.request.headers.get('Authorization')).toBe('Bearer token-anterior');

    token.set('token-nuevo');
    request.flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(clear).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(token()).toBe('token-nuevo');
  });

  it('limpia la sesión una sola vez cuando fallan dos peticiones del token activo', () => {
    http.get('/api/productos').subscribe({ error: () => {} });
    http.get('/api/existencias').subscribe({ error: () => {} });

    requests.expectOne('/api/productos').flush(null, { status: 401, statusText: 'Unauthorized' });
    requests.expectOne('/api/existencias').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(clear).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('avisa del límite de peticiones con el tiempo de Retry-After', () => {
    http.get('/api/productos').subscribe({ error: () => {} });
    requests.expectOne('/api/productos').flush(
      { error: 'RATE_LIMIT_EXCEEDED', message: 'Demasiadas peticiones' },
      {
        status: 429,
        statusText: 'Too Many Requests',
        headers: new HttpHeaders({ 'Retry-After': '12' })
      }
    );

    expect(warning).toHaveBeenCalledTimes(1);
    expect(warning.mock.calls[0][0]).toContain('12 s');
    expect(clear).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('no duplica el aviso del límite en el formulario de login', () => {
    http.post('/api/auth/login', {}).subscribe({ error: () => {} });
    requests.expectOne('/api/auth/login').flush(
      { error: 'RATE_LIMIT_EXCEEDED', message: 'Demasiados intentos' },
      {
        status: 429,
        statusText: 'Too Many Requests',
        headers: new HttpHeaders({ 'Retry-After': '60' })
      }
    );

    expect(warning).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
