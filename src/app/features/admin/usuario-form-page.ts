// src/app/features/admin/usuario-form-page.ts
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthApi } from '@core/api/auth/auth-api';
import { ToastService } from '@core/notifications/toast-service';
import { parseApiError } from '@core/api/api-error';
import { getRoleLabel } from '@core/auth/roles';
import { valUsr01Username, valUsr02Password, valUsr03Role } from '@shared/forms/validators';
import { getFirstErrorMessage } from '@shared/forms/error-messages';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { Field } from '@shared/ui/field/field';
import { Button } from '@shared/ui/button/button';

@Component({
  selector: 'app-usuario-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, PageHeader, Field, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './usuario-form-page.html',
  styleUrl: './usuario-form-page.css'
})
export class UsuarioFormPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authApi = inject(AuthApi);
  private readonly toast = inject(ToastService);

  readonly submitting = signal<boolean>(false);
  readonly generalError = signal<string | null>(null);
  readonly showPassword = signal<boolean>(false);

  readonly form = this.fb.group({
    username: ['', [Validators.required, valUsr01Username()]],
    password: ['', [Validators.required, valUsr02Password()]],
    role: ['MECANICO' as 'JEFE_TALLER' | 'MECANICO', [Validators.required, valUsr03Role()]]
  });

  get usernameError(): () => string | null {
    return () => {
      const ctrl = this.form.controls.username;
      return ctrl.touched ? getFirstErrorMessage(ctrl.errors) : null;
    };
  }

  get passwordError(): () => string | null {
    return () => {
      const ctrl = this.form.controls.password;
      return ctrl.touched ? getFirstErrorMessage(ctrl.errors) : null;
    };
  }

  get roleError(): () => string | null {
    return () => {
      const ctrl = this.form.controls.role;
      return ctrl.touched ? getFirstErrorMessage(ctrl.errors) : null;
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

    const raw = this.form.getRawValue();

    this.authApi.register({
      username: raw.username.trim(),
      password: raw.password,
      role: raw.role
    }).subscribe({
      next: (resp) => {
        this.submitting.set(false);
        const roleText = getRoleLabel(raw.role);
        this.toast.success(`Usuario "${resp.username}" registrado correctamente como ${roleText}.`);
        this.form.reset({
          username: '',
          password: '',
          role: 'MECANICO'
        });
      },
      error: (err) => {
        this.submitting.set(false);
        const apiError = parseApiError(err);

        // Conflicto de usuario existente (409)
        if (apiError.status === 409 || apiError.code === 'USER_ALREADY_EXISTS') {
          this.form.controls.username.setErrors({
            server: 'Ya existe un usuario registrado con ese nombre de usuario.'
          });
          return;
        }

        // Errores de validación de campo desde el backend
        if (apiError.status === 400 && apiError.details.length > 0) {
          for (const d of apiError.details) {
            if (d.field === 'username') {
              this.form.controls.username.setErrors({ server: d.reason });
            } else if (d.field === 'password') {
              this.form.controls.password.setErrors({ server: d.reason });
            } else if (d.field === 'role') {
              this.form.controls.role.setErrors({ server: d.reason });
            }
          }
          return;
        }

        this.generalError.set(apiError.message || 'No se pudo completar el registro del usuario.');
      }
    });
  }
}
