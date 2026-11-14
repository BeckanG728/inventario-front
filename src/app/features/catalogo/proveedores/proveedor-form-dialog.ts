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
  template: `
    <app-modal
      [title]="isEdit() ? 'Modificar proveedor' : 'Registrar nuevo proveedor'"
      size="md"
      [(isOpen)]="isOpen"
      (closed)="onCancel()"
    >
      @if (generalError()) {
        <div class="inline-alert inline-alert--error form-alert" role="alert">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="8"></line>
            <line x1="12" y1="12" x2="12" y2="16"></line>
          </svg>
          <span>{{ generalError() }}</span>
        </div>
      }

      <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
        <app-field
          label="Razón social de la empresa"
          forId="razonSocial"
          [required]="true"
          hint="Nombre legal o comercial de la empresa distribuidora (máx. 150 caracteres)"
          [error]="razonSocialError()"
        >
          <input
            id="razonSocial"
            type="text"
            formControlName="razonSocial"
            autocomplete="organization"
            placeholder="Ej. Repuestos Andinos S.A."
            [attr.aria-invalid]="!!razonSocialError()"
          />
        </app-field>

        <app-field
          label="Número de RUC"
          forId="ruc"
          [required]="true"
          hint="Identificador tributario único (máx. 20 caracteres)"
          [error]="rucError()"
        >
          <input
            id="ruc"
            type="text"
            inputmode="numeric"
            maxlength="20"
            formControlName="ruc"
            autocomplete="off"
            placeholder="Ej. 1792345678001"
            [attr.aria-invalid]="!!rucError()"
          />
        </app-field>

        <app-field
          label="Persona de contacto (opcional)"
          forId="contacto"
          hint="Nombre del asesor comercial o ejecutivo de ventas"
          [error]="contactoError()"
        >
          <input
            id="contacto"
            type="text"
            formControlName="contacto"
            autocomplete="name"
            placeholder="Ej. María López"
          />
        </app-field>

        <div class="form-row">
          <app-field
            label="Teléfono (opcional)"
            forId="telefono"
            hint="Número telefónico de pedidos"
            [error]="telefonoError()"
          >
            <input
              id="telefono"
              type="tel"
              formControlName="telefono"
              autocomplete="tel"
              placeholder="Ej. 0998765432"
            />
          </app-field>

          <app-field
            label="Correo electrónico (opcional)"
            forId="correo"
            hint="Email de cotizaciones o facturas"
            [error]="correoError()"
          >
            <input
              id="correo"
              type="email"
              formControlName="correo"
              autocomplete="email"
              placeholder="Ej. ventas@repuestosandinos.com"
              [attr.aria-invalid]="!!correoError()"
            />
          </app-field>
        </div>

        <app-field
          label="Dirección fiscal / almacén (opcional)"
          forId="direccion"
          hint="Dirección física o sede del proveedor"
          [error]="direccionError()"
        >
          <input
            id="direccion"
            type="text"
            formControlName="direccion"
            autocomplete="street-address"
            placeholder="Ej. Av. Amazonas 123"
          />
        </app-field>
      </form>

      <div modal-footer class="dialog-actions">
        <app-button
          variant="secondary"
          [disabled]="submitting()"
          (btnClick)="onCancel()"
        >
          Cancelar
        </app-button>

        <app-button
          type="submit"
          variant="primary"
          [loading]="submitting()"
          (btnClick)="onSubmit()"
        >
          {{ isEdit() ? 'Guardar cambios' : 'Crear proveedor' }}
        </app-button>
      </div>
    </app-modal>
  `,
  styles: [`
    .form-alert {
      margin-bottom: var(--space-4);
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-3);
    }

    @media (min-width: 640px) {
      .form-row {
        grid-template-columns: 1fr 1fr;
      }
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-3);
      width: 100%;
    }
  `]
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
