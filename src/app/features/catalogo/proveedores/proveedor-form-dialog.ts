// src/app/features/catalogo/proveedores/proveedor-form-dialog.ts
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, model, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CatalogoApi } from '@core/api/catalogo/catalogo-api';
import { ProveedorRequest, ProveedorResponse } from '@core/api/catalogo/catalogo.models';
import { CatalogoLookup } from '@core/lookup/catalogo-lookup';
import { parseApiError } from '@core/api/api-error';
import { getFirstErrorMessage } from '@shared/forms/error-messages';
import { Modal } from '@shared/ui/modal/modal';
import { Field } from '@shared/ui/field/field';
import { Button } from '@shared/ui/button/button';

@Component({
  selector: 'app-proveedor-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, Modal, Field, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './proveedor-form-dialog.html',
  styleUrl: './proveedor-form-dialog.css'
})
export class ProveedorFormDialog {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly catalogoApi = inject(CatalogoApi);
  readonly catalogoLookup = inject(CatalogoLookup);

  readonly proveedorToEdit = input<ProveedorResponse | null>(null);
  readonly isOpen = model<boolean>(false);
  readonly saved = output<ProveedorResponse>();

  readonly submitting = signal<boolean>(false);
  readonly generalError = signal<string | null>(null);

  readonly form = this.fb.group({
    ruc: ['', [Validators.required, Validators.maxLength(20)]],
    razonSocial: ['', [Validators.required, Validators.maxLength(150)]],
    contacto: ['', [Validators.maxLength(100)]],
    telefono: ['', [Validators.maxLength(30)]],
    correo: ['', [Validators.email, Validators.maxLength(150)]],
    direccion: ['', [Validators.maxLength(255)]]
  });

  readonly isEdit = computed(() => !!this.proveedorToEdit());

  constructor() {
    effect(() => {
      const prv = this.proveedorToEdit();
      if (prv) {
        this.form.patchValue({
          ruc: prv.ruc,
          razonSocial: prv.razonSocial,
          contacto: prv.contacto || '',
          telefono: prv.telefono || '',
          correo: prv.correo || '',
          direccion: prv.direccion || ''
        });
      } else {
        this.form.reset({
          ruc: '',
          razonSocial: '',
          contacto: '',
          telefono: '',
          correo: '',
          direccion: ''
        });
      }
      this.generalError.set(null);
    });
  }

  get razonSocialError(): () => string | null {
    return () => {
      const ctrl = this.form.controls.razonSocial;
      if (ctrl.touched && ctrl.invalid) {
        if (ctrl.errors?.['required']) return 'La razón social es obligatoria.';
        if (ctrl.errors?.['maxlength']) return 'Máximo 150 caracteres.';
        return getFirstErrorMessage(ctrl.errors);
      }
      return null;
    };
  }

  get rucError(): () => string | null {
    return () => {
      const ctrl = this.form.controls.ruc;
      if (ctrl.touched && ctrl.invalid) {
        if (ctrl.errors?.['required']) return 'El número de RUC es obligatorio.';
        if (ctrl.errors?.['maxlength']) return 'Máximo 20 caracteres.';
        return getFirstErrorMessage(ctrl.errors);
      }
      return null;
    };
  }

  get contactoError(): () => string | null {
    return () => {
      const ctrl = this.form.controls.contacto;
      return ctrl.touched ? getFirstErrorMessage(ctrl.errors) : null;
    };
  }

  get telefonoError(): () => string | null {
    return () => {
      const ctrl = this.form.controls.telefono;
      return ctrl.touched ? getFirstErrorMessage(ctrl.errors) : null;
    };
  }

  get correoError(): () => string | null {
    return () => {
      const ctrl = this.form.controls.correo;
      return ctrl.touched ? getFirstErrorMessage(ctrl.errors) : null;
    };
  }

  get direccionError(): () => string | null {
    return () => {
      const ctrl = this.form.controls.direccion;
      return ctrl.touched ? getFirstErrorMessage(ctrl.errors) : null;
    };
  }

  onCancel(): void {
    this.isOpen.set(false);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.generalError.set(null);

    const raw = this.form.getRawValue();

    const req: ProveedorRequest = {
      ruc: raw.ruc.trim(),
      razonSocial: raw.razonSocial.trim(),
      contacto: raw.contacto.trim() || undefined,
      telefono: raw.telefono.trim() || undefined,
      correo: raw.correo.trim() || undefined,
      direccion: raw.direccion.trim() || undefined
    };

    this.catalogoApi.crearProveedor(req).subscribe({
      next: (resp) => {
        this.submitting.set(false);
        this.catalogoLookup.registrarProveedor(resp);
        this.saved.emit(resp);
        this.isOpen.set(false);
      },
      error: (err) => {
        this.submitting.set(false);
        const apiErr = parseApiError(err);

        if (apiErr.status === 409) {
          this.form.controls.ruc.setErrors({ server: 'Ya existe un proveedor registrado con ese RUC.' });
          return;
        }

        if (apiErr.status === 400 && apiErr.details.length > 0) {
          for (const d of apiErr.details) {
            if (d.field === 'razonSocial') this.form.controls.razonSocial.setErrors({ server: d.reason });
            if (d.field === 'ruc') this.form.controls.ruc.setErrors({ server: d.reason });
            if (d.field === 'contacto') this.form.controls.contacto.setErrors({ server: d.reason });
            if (d.field === 'telefono') this.form.controls.telefono.setErrors({ server: d.reason });
            if (d.field === 'correo') this.form.controls.correo.setErrors({ server: d.reason });
            if (d.field === 'direccion') this.form.controls.direccion.setErrors({ server: d.reason });
          }
          return;
        }

        this.generalError.set(apiErr.message || 'Error al registrar el proveedor.');
      }
    });
  }
}
