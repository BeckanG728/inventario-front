import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AuthApi } from '@core/api/auth/auth-api';
import { SessionStore } from '@core/auth/session-store';
import { CambiarPasswordPage } from './cambiar-password-page';

describe('CambiarPasswordPage', () => {
  const cambiarPassword = vi.fn();
  const confirmarCambioPassword = vi.fn();
  const navigate = vi.fn();
  const navigateByUrl = vi.fn();
  const respuesta = {
    token: 'jwt',
    tokenType: 'Bearer',
    expiresIn: 3600,
    userId: 1,
    role: 'MECANICO',
    cambioPasswordPendiente: false
  } as const;

  beforeEach(async () => {
    cambiarPassword.mockReset();
    confirmarCambioPassword.mockReset();
    navigate.mockReset();
    navigateByUrl.mockReset();

    await TestBed.configureTestingModule({
      imports: [CambiarPasswordPage],
      providers: [
        { provide: AuthApi, useValue: { cambiarPassword } },
        { provide: SessionStore, useValue: { confirmarCambioPassword } },
        { provide: Router, useValue: { navigate, navigateByUrl } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParams: {} } } }
      ]
    }).compileComponents();
  });

  it('muestra el error en el campo si la contraseña actual es incorrecta', async () => {
    cambiarPassword.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 400,
      error: { error: 'PASSWORD_ACTUAL_INVALIDA', message: 'La contraseña actual no es correcta' }
    })));

    const fixture = TestBed.createComponent(CambiarPasswordPage);
    const page = fixture.componentInstance;
    page.form.setValue({
      passwordActual: 'Pass123!',
      nuevaPassword: 'NuevaClave456',
      confirmacion: 'NuevaClave456'
    });

    page.onSubmit();
    await fixture.whenStable();
    page.form.controls.passwordActual.markAsTouched();

    expect(page.passwordActualError()()).toBe('La contraseña actual no es correcta');
    expect(confirmarCambioPassword).not.toHaveBeenCalled();
    expect(page.submitting()).toBe(false);
  });

  it('renueva la sesión y navega a la home del rol tras el cambio', async () => {
    cambiarPassword.mockReturnValue(of(respuesta));

    const fixture = TestBed.createComponent(CambiarPasswordPage);
    const page = fixture.componentInstance;
    page.form.setValue({
      passwordActual: 'Pass123!',
      nuevaPassword: 'NuevaClave456',
      confirmacion: 'NuevaClave456'
    });

    page.onSubmit();
    await fixture.whenStable();

    expect(confirmarCambioPassword).toHaveBeenCalledWith(respuesta);
    expect(navigate).toHaveBeenCalledWith(['/operaciones/consumo']);
  });
});
