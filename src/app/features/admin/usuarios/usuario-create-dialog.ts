// src/app/features/admin/usuarios/usuario-create-dialog.ts
import { ChangeDetectionStrategy, Component, inject, model, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthApi } from '@core/api/auth/auth-api';
import { RegisterResponse } from '@core/api/auth/auth.models';
import { parseApiError } from '@core/api/api-error';
import { valUsr01Username, valUsr02Password, valUsr03Role } from '@shared/forms/validators';
import { getFirstErrorMessage } from '@shared/forms/error-messages';
import { Modal } from '@shared/ui/modal/modal';
import { Field } from '@shared/ui/field/field';
import { Button } from '@shared/ui/button/button';

@Component({
  selector: 'app-usuario-create-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, Modal, Field, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './usuario-create-dialog.html',
  styleUrl: './usuario-create-dialog.css'
})
export class UsuarioCreateDialog {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authApi = inject(AuthApi);

  readonly isOpen = model<boolean>(false);
  readonly created = output<RegisterResponse>();

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

  onCancel(): void {
    this.isOpen.set(false);
    this.resetForm();
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
        this.created.emit(resp);
        this.isOpen.set(false);
        this.resetForm();
      },
      error: (err) => {
        this.submitting.set(false);
        const apiError = parseApiError(err);

        if (apiError.status === 409 || apiError.code === 'USER_ALREADY_EXISTS') {
          this.form.controls.username.setErrors({
            server: 'Ya existe un usuario registrado con ese nombre de usuario.'
          });
          return;
        }

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

  private resetForm(): void {
    this.form.reset({ username: '', password: '', role: 'MECANICO' });
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.generalError.set(null);
    this.showPassword.set(false);
  }
}
