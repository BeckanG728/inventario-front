import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { throwError } from 'rxjs';
import { vi } from 'vitest';
import { AuthApi } from '@core/api/auth/auth-api';
import { SessionStore } from '@core/auth/session-store';
import { LoginPage } from './login-page';

describe('LoginPage', () => {
  const login = vi.fn();
  const navigate = vi.fn();
  const navigateByUrl = vi.fn();
  const setSession = vi.fn();

  beforeEach(async () => {
    login.mockReset();
    navigate.mockReset();
    navigateByUrl.mockReset();
    setSession.mockReset();

    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        { provide: AuthApi, useValue: { login } },
        { provide: SessionStore, useValue: { setSession } },
        { provide: Router, useValue: { navigate, navigateByUrl } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParams: {} } } }
      ]
    }).compileComponents();
  });

  it('muestra el tiempo de espera y el estilo de aviso cuando el login tiene límite de peticiones', async () => {
    login.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 429,
      error: { error: 'RATE_LIMIT_EXCEEDED', message: 'Demasiados intentos de inicio de sesión' },
      headers: new HttpHeaders({ 'Retry-After': '45' })
    })));

    const fixture = TestBed.createComponent(LoginPage);
    const page = fixture.componentInstance;
    page.form.setValue({ username: 'admin', password: 'Clave1234' });
    page.onSubmit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(page.errorCode()).toBe('RATE_LIMIT_EXCEEDED');
    expect(page.errorMessage()).toContain('45 s');
    expect(page.submitting()).toBe(false);
    expect(setSession).not.toHaveBeenCalled();

    const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;
    expect(alert.classList.contains('inline-alert--warning')).toBe(true);
    expect(alert.classList.contains('inline-alert--error')).toBe(false);
  });

  it('limpia el aviso anterior antes de reintentar', async () => {
    login.mockReturnValueOnce(throwError(() => new HttpErrorResponse({
      status: 429,
      error: { error: 'RATE_LIMIT_EXCEEDED', message: 'Demasiados intentos' }
    })));
    login.mockReturnValueOnce(throwError(() => new HttpErrorResponse({
      status: 401,
      error: { error: 'INVALID_CREDENTIALS', message: 'Credenciales inválidas' }
    })));

    const fixture = TestBed.createComponent(LoginPage);
    const page = fixture.componentInstance;
    page.form.setValue({ username: 'admin', password: 'Clave1234' });

    page.onSubmit();
    await fixture.whenStable();
    expect(page.errorCode()).toBe('RATE_LIMIT_EXCEEDED');

    page.onSubmit();
    await fixture.whenStable();
    expect(page.errorCode()).toBe('INVALID_CREDENTIALS');
    expect(page.errorMessage()).toBe('Usuario o contraseña incorrectos.');
  });
});
