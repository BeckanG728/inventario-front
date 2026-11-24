import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../api-config';
import { AuditoriaApi } from './auditoria-api';

describe('AuditoriaApi', () => {
  let api: AuditoriaApi;
  let requests: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' }
      ]
    });
    api = TestBed.inject(AuditoriaApi);
    requests = TestBed.inject(HttpTestingController);
  });

  afterEach(() => requests.verify());

  it('envía desde, hasta, actor, tipo y resultado en la consulta', () => {
    api.listar({
      page: 1,
      size: 15,
      desde: '2026-11-01',
      hasta: '2026-11-24',
      actor: ' admin ',
      tipo: 'AUTENTICACION',
      resultado: 'OK'
    }).subscribe();

    const request = requests.expectOne(req => req.url === '/api/auditoria');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('size')).toBe('15');
    expect(request.request.params.get('desde')).toBe('2026-11-01');
    expect(request.request.params.get('hasta')).toBe('2026-11-24');
    expect(request.request.params.get('actor')).toBe('admin');
    expect(request.request.params.get('tipo')).toBe('AUTENTICACION');
    expect(request.request.params.get('resultado')).toBe('OK');
    request.flush({ content: [], page: 1, size: 15, totalElements: 0, totalPages: 0 });
  });

  it('omite los filtros no proporcionados', () => {
    api.listar().subscribe();

    const request = requests.expectOne(req => req.url === '/api/auditoria');
    expect(request.request.params.keys()).toEqual([]);
    request.flush({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 });
  });
});
