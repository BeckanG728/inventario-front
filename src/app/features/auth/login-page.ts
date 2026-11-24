// src/app/features/auth/login-page.ts
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthApi } from '@core/api/auth/auth-api';
import { SessionStore } from '@core/auth/session-store';
import { getRoleHome } from '@core/auth/roles';
import { describeApiError, parseApiError } from '@core/api/api-error';
import { Field } from '@shared/ui/field/field';
import { Button } from '@shared/ui/button/button';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, Field, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login-page.html',
  styleUrl: './login-page.css'
})
export class LoginPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authApi = inject(AuthApi);
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly errorCode = signal<string | null>(null);
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
    this.errorCode.set(null);

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
        this.errorCode.set(apiError.code);

        if (apiError.status === 401) {
          this.errorMessage.set('Usuario o contraseña incorrectos.');
          this.form.controls.password.reset();
        } else if (apiError.status === 0) {
          this.errorMessage.set('No se puede conectar con el servidor. Revisa tu red.');
        } else if (apiError.isRateLimit) {
          this.errorMessage.set(describeApiError(apiError, 'Demasiadas peticiones.'));
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
