// src/app/features/auth/cambiar-password-page.ts
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthApi } from '@core/api/auth/auth-api';
import { parseApiError } from '@core/api/api-error';
import { SessionStore } from '@core/auth/session-store';
import { getRoleHome } from '@core/auth/roles';
import { getFirstErrorMessage } from '@shared/forms/error-messages';
import { valUsr02Password } from '@shared/forms/validators';
import { Field } from '@shared/ui/field/field';
import { Button } from '@shared/ui/button/button';

const passwordsMatch: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const nuevaPassword = control.get('nuevaPassword')?.value;
  const confirmacion = control.get('confirmacion')?.value;
  return nuevaPassword === confirmacion ? null : { passwordMatch: 'Las contraseñas no coinciden' };
};

@Component({
  selector: 'app-cambiar-password-page',
  standalone: true,
  imports: [ReactiveFormsModule, Field, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cambiar-password-page.html',
  styleUrl: './login-page.css'
})
export class CambiarPasswordPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authApi = inject(AuthApi);
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly submitting = signal(false);
  readonly generalError = signal<string | null>(null);
  readonly showPassword = signal(false);

  readonly form = this.fb.group({
    passwordActual: ['', [Validators.required]],
    nuevaPassword: ['', [Validators.required, valUsr02Password()]],
    confirmacion: ['', [Validators.required]]
  }, { validators: passwordsMatch });

  get passwordActualError(): () => string | null {
    return () => {
      const ctrl = this.form.controls.passwordActual;
      return ctrl.touched ? getFirstErrorMessage(ctrl.errors) : null;
    };
  }

  get nuevaPasswordError(): () => string | null {
    return () => {
      const ctrl = this.form.controls.nuevaPassword;
      return ctrl.touched ? getFirstErrorMessage(ctrl.errors) : null;
    };
  }

  get confirmacionError(): () => string | null {
    return () => {
      const ctrl = this.form.controls.confirmacion;
      if (ctrl.touched && ctrl.errors) {
        return getFirstErrorMessage(ctrl.errors);
      }
      if (ctrl.touched && this.form.errors?.['passwordMatch']) {
        return this.form.errors['passwordMatch'] as string;
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
    this.generalError.set(null);

    const { passwordActual, nuevaPassword } = this.form.getRawValue();

    this.authApi.cambiarPassword({ passwordActual, nuevaPassword }).subscribe({
      next: (response) => {
        this.submitting.set(false);
        this.session.confirmarCambioPassword(response);

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

        if (apiError.code === 'PASSWORD_ACTUAL_INVALIDA') {
          this.form.controls.passwordActual.setErrors({ server: apiError.message });
          return;
        }
        if (apiError.status === 400 && apiError.details.length > 0) {
          const reason = apiError.getFieldReason('nuevaPassword');
          if (reason) {
            this.form.controls.nuevaPassword.setErrors({ server: reason });
            return;
          }
        }

        this.generalError.set(apiError.message || 'No se pudo cambiar la contraseña.');
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
