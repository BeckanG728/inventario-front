import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../api-config';
import { UsuariosApi } from './usuarios-api';

describe('UsuariosApi', () => {
  let api: UsuariosApi;
  let requests: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' }
      ]
    });
    api = TestBed.inject(UsuariosApi);
    requests = TestBed.inject(HttpTestingController);
  });

  afterEach(() => requests.verify());

  it('envía todos los filtros de listado como parámetros de consulta', () => {
    api.listar({ page: 2, size: 20, username: ' juan ', role: 'ADMIN', activo: false }).subscribe();

    const request = requests.expectOne(req => req.url === '/api/usuarios');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('size')).toBe('20');
    expect(request.request.params.get('username')).toBe('juan');
    expect(request.request.params.get('role')).toBe('ADMIN');
    expect(request.request.params.get('activo')).toBe('false');
    request.flush({ content: [], page: 2, size: 20, totalElements: 0, totalPages: 0 });
  });

  it('omite los filtros vacíos', () => {
    api.listar({ username: '   ', role: undefined, activo: undefined }).subscribe();

    const request = requests.expectOne(req => req.url === '/api/usuarios');
    expect(request.request.params.keys()).toEqual([]);
    request.flush({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 });
  });

  it('usa PUT para actualizar rol y estado, y PATCH para restablecer la contraseña', () => {
    api.actualizar(7, { role: 'MECANICO', activo: false }).subscribe();
    api.resetPassword(7, { password: 'Clave1234', cambioPasswordPendiente: true }).subscribe();

    const update = requests.expectOne('/api/usuarios/7');
    expect(update.request.method).toBe('PUT');
    expect(update.request.body).toEqual({ role: 'MECANICO', activo: false });
    update.flush({ id: 7, username: 'juan', role: 'MECANICO', activo: false, createdAt: '2026-01-01T00:00:00Z' });

    const password = requests.expectOne('/api/usuarios/7/password');
    expect(password.request.method).toBe('PATCH');
    expect(password.request.body).toEqual({ password: 'Clave1234' });
    password.flush({ id: 7, username: 'juan', role: 'MECANICO', activo: false, createdAt: '2026-01-01T00:00:00Z' });
  });
});
