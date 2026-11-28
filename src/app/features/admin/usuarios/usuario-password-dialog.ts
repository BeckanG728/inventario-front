// src/app/features/admin/usuarios/usuario-password-dialog.ts
import { ChangeDetectionStrategy, Component, effect, inject, input, model, output, signal } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { UsuariosApi } from '@core/api/usuarios/usuarios-api';
import { UsuarioResponse } from '@core/api/usuarios/usuarios.models';
import { parseApiError } from '@core/api/api-error';
import { getFirstErrorMessage } from '@shared/forms/error-messages';
import { valUsr02Password } from '@shared/forms/validators';
import { Modal } from '@shared/ui/modal/modal';
import { Field } from '@shared/ui/field/field';
import { Button } from '@shared/ui/button/button';

const passwordsMatch: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password')?.value;
  const confirmacion = control.get('confirmacion')?.value;
  return password === confirmacion ? null : { passwordMatch: 'Las contraseñas no coinciden' };
};

@Component({
  selector: 'app-usuario-password-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, Modal, Field, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './usuario-password-dialog.html',
  styleUrl: './usuario-password-dialog.css'
})
export class UsuarioPasswordDialog {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly usuariosApi = inject(UsuariosApi);

  readonly usuario = input<UsuarioResponse | null>(null);
  readonly isOpen = model<boolean>(false);
  readonly saved = output<UsuarioResponse>();

  readonly submitting = signal<boolean>(false);
  readonly generalError = signal<string | null>(null);
  readonly showPassword = signal<boolean>(false);

  readonly form = this.fb.group({
    password: ['', [Validators.required, valUsr02Password()]],
    confirmacion: ['', [Validators.required]],
    cambioPasswordPendiente: [true]
  }, { validators: passwordsMatch });

  constructor() {
    effect(() => {
      this.usuario();
      this.form.reset({ password: '', confirmacion: '', cambioPasswordPendiente: true });
      this.generalError.set(null);
    });
  }

  get passwordError(): () => string | null {
    return () => {
      const ctrl = this.form.controls.password;
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

  onCancel(): void {
    this.isOpen.set(false);
  }

  onSubmit(): void {
    const usuario = this.usuario();
    if (!usuario || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.generalError.set(null);

    const { password } = this.form.getRawValue();
    this.usuariosApi.resetPassword(usuario.id, {
      password,
      cambioPasswordPendiente: this.form.getRawValue().cambioPasswordPendiente
    }).subscribe({
      next: resp => {
        this.submitting.set(false);
        this.saved.emit(resp);
        this.isOpen.set(false);
      },
      error: err => {
        this.submitting.set(false);
        const apiError = parseApiError(err);
        if (apiError.status === 400 && apiError.details.length > 0) {
          const reason = apiError.getFieldReason('password');
          if (reason) {
            this.form.controls.password.setErrors({ server: reason });
            return;
          }
        }
        this.generalError.set(apiError.message || 'No se pudo restablecer la contraseña.');
      }
    });
  }
}
