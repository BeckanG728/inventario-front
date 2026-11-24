import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SessionStore } from '../../auth/session-store';
import { API_BASE_URL } from '../api-config';
import { OperacionesApi } from './operaciones-api';

describe('OperacionesApi', () => {
  it('reutiliza la clave al reintentar y crea otra después de confirmar', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
        { provide: SessionStore, useValue: { userId: () => 1 } }
      ]
    });
    const api = TestBed.inject(OperacionesApi);
    const requests = TestBed.inject(HttpTestingController);
    const cuerpo = { productoId: 8, cantidadFisica: 2, justificacion: 'Conteo físico' };
    const ruta = '/api/movimientos/ajuste';

    api.registrarAjuste(cuerpo).subscribe({ error: () => {} });
    const inicial = requests.expectOne(ruta);
    const clave = inicial.request.headers.get('Idempotency-Key');
    expect(clave).toMatch(/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
    inicial.error(new ProgressEvent('error'));

    api.registrarAjuste({ ...cuerpo }).subscribe();
    const reintento = requests.expectOne(ruta);
    expect(reintento.request.headers.get('Idempotency-Key')).toBe(clave);
    reintento.flush({});

    api.registrarAjuste(cuerpo).subscribe();
    const nuevaOperacion = requests.expectOne(ruta);
    expect(nuevaOperacion.request.headers.get('Idempotency-Key')).not.toBe(clave);
    nuevaOperacion.flush({});
    requests.verify();
  });
});
