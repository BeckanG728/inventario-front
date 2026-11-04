// src/app/features/auth/login-page.ts
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthApi } from '@core/api/auth/auth-api';
import { SessionStore } from '@core/auth/session-store';
import { getRoleHome } from '@core/auth/roles';
import { parseApiError } from '@core/api/api-error';
import { Field } from '@shared/ui/field/field';
import { Button } from '@shared/ui/button/button';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, Field, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-screen">
      <div class="auth-card">
        <h1>Iniciar sesión</h1>
        <p class="subtitle">Sistema de Gestión de Inventario — Taller Mecánico</p>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-panel" novalidate>
          @if (errorMessage()) {
            <div class="inline-alert inline-alert--error" role="alert">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          <app-field
            label="Usuario"
            forId="username"
            [required]="true"
            variant="pill"
            [error]="usernameError()"
          >
            <input
              id="username"
              type="text"
              formControlName="username"
              autocomplete="username"
              placeholder="Ingresa tu nombre de usuario"
              [attr.aria-invalid]="!!usernameError()"
            />
          </app-field>

          <app-field
            label="Contraseña"
            forId="password"
            [required]="true"
            variant="pill"
            [error]="passwordError()"
          >
            <div class="password-wrap">
              <input
                id="password"
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="password"
                autocomplete="current-password"
                placeholder="Ingresa tu contraseña"
                [attr.aria-invalid]="!!passwordError()"
              />
              <button
                type="button"
                class="toggle-visibility"
                (click)="togglePasswordVisibility()"
                [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Ver contraseña'"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  @if (showPassword()) {
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  } @else {
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  }
                </svg>
              </button>
            </div>
          </app-field>

          <app-button
            type="submit"
            variant="primary"
            size="lg"
            [block]="true"
            [loading]="submitting()"
          >
            Ingresar al sistema
          </app-button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .password-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }

    .toggle-visibility {
      position: absolute;
      right: 14px;
      background: none;
      border: none;
      color: var(--color-text-secondary);
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .toggle-visibility:hover {
      color: var(--color-text-primary);
    }
  `]
})
export class LoginPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authApi = inject(AuthApi);
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly showPassword = signal<boolean>(false);

  readonly form = this.fb.group({
    username: ['', [Validators.required, Validators.maxLength(50)]],
    password: ['', [Validators.required]]
  });

  get usernameError(): () => string | null {
    return () => {
      const ctrl = this.form.controls.username;
      if (ctrl.touched && ctrl.invalid) {
        if (ctrl.errors?.['required']) return 'El usuario es obligatorio.';
        if (ctrl.errors?.['maxlength']) return 'Máximo 50 caracteres.';
      }
      return null;
    };
  }

  get passwordError(): () => string | null {
    return () => {
      const ctrl = this.form.controls.password;
      if (ctrl.touched && ctrl.invalid) {
        if (ctrl.errors?.['required']) return 'La contraseña es obligatoria.';
      }
      return null;
    };
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    const { username, password } = this.form.getRawValue();

    this.authApi.login({ username: username.trim(), password }).subscribe({
      next: (response) => {
        this.submitting.set(false);
        this.session.setSession(response, username.trim());

        // Redirección segura respetando returnUrl saneado
        const returnUrl = this.route.snapshot.queryParams['returnUrl'];
        const safeUrl = this.sanitizeReturnUrl(returnUrl);

        if (safeUrl) {
          this.router.navigateByUrl(safeUrl);
        } else {
          this.router.navigate([getRoleHome(response.role)]);
        }
      },
      error: (err) => {
        this.submitting.set(false);
        const apiError = parseApiError(err);

        if (apiError.status === 401) {
          this.errorMessage.set('Usuario o contraseña incorrectos.');
          this.form.controls.password.reset();
        } else if (apiError.status === 0) {
          this.errorMessage.set('No se puede conectar con el servidor. Revisa tu red.');
        } else {
          this.errorMessage.set(apiError.message || 'Error al iniciar sesión.');
        }
      }
    });
  }

  private sanitizeReturnUrl(url?: string): string | null {
    if (!url || typeof url !== 'string') return null;
    if (url.startsWith('//') || !url.startsWith('/') || url.includes(':')) {
      return null;
    }
    return url;
  }
}
