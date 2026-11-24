// src/app/features/admin/usuarios/usuario-edit-dialog.ts
import { ChangeDetectionStrategy, Component, effect, inject, input, model, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsuariosApi } from '@core/api/usuarios/usuarios-api';
import { UsuarioResponse } from '@core/api/usuarios/usuarios.models';
import { parseApiError } from '@core/api/api-error';
import { getRoleLabel, UserRole } from '@core/auth/roles';
import { getFirstErrorMessage } from '@shared/forms/error-messages';
import { Modal } from '@shared/ui/modal/modal';
import { Field } from '@shared/ui/field/field';
import { Button } from '@shared/ui/button/button';

@Component({
  selector: 'app-usuario-edit-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, Modal, Field, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './usuario-edit-dialog.html',
  styleUrl: './usuario-edit-dialog.css'
})
export class UsuarioEditDialog {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly usuariosApi = inject(UsuariosApi);

  readonly usuario = input<UsuarioResponse | null>(null);
  readonly isOpen = model<boolean>(false);
  readonly saved = output<UsuarioResponse>();

  readonly roles: UserRole[] = ['ADMIN', 'JEFE_TALLER', 'MECANICO'];
  readonly submitting = signal<boolean>(false);
  readonly generalError = signal<string | null>(null);

  readonly form = this.fb.group({
    role: ['MECANICO' as UserRole, [Validators.required]],
    activo: [true]
  });

  constructor() {
    effect(() => {
      const usuario = this.usuario();
      if (usuario) {
        this.form.patchValue({ role: usuario.role, activo: usuario.activo });
      }
      this.generalError.set(null);
    });
  }

  get roleError(): () => string | null {
    return () => {
      const ctrl = this.form.controls.role;
      return ctrl.touched ? getFirstErrorMessage(ctrl.errors) : null;
    };
  }

  roleLabel(role: UserRole): string {
    return getRoleLabel(role);
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

    const { role, activo } = this.form.getRawValue();
    this.usuariosApi.actualizar(usuario.id, { role, activo }).subscribe({
      next: resp => {
        this.submitting.set(false);
        this.saved.emit(resp);
        this.isOpen.set(false);
      },
      error: err => {
        this.submitting.set(false);
        const apiError = parseApiError(err);
        if (apiError.status === 400 && apiError.details.length > 0) {
          const roleReason = apiError.getFieldReason('role');
          if (roleReason) {
            this.form.controls.role.setErrors({ server: roleReason });
            return;
          }
        }
        this.generalError.set(apiError.message || 'No se pudo actualizar el usuario.');
      }
    });
  }
}
