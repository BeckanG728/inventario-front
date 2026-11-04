// src/app/features/catalogo/proveedores/proveedor-form-page.ts
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CatalogoApi } from '@core/api/catalogo/catalogo-api';
import { ProveedorRequest } from '@core/api/catalogo/catalogo.models';
import { CatalogoLookup } from '@core/lookup/catalogo-lookup';
import { ToastService } from '@core/notifications/toast-service';
import { parseApiError } from '@core/api/api-error';
import { getFirstErrorMessage } from '@shared/forms/error-messages';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { PillNav, PillNavItem } from '@shared/ui/pill-nav/pill-nav';
import { Field } from '@shared/ui/field/field';
import { Button } from '@shared/ui/button/button';

@Component({
  selector: 'app-proveedor-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, PageHeader, PillNav, Field, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="Proveedores de repuestos"
      subtitle="Registro de empresas distribuidoras y contactos comerciales"
    />

    <app-pill-nav [items]="navItems" ariaLabel="Secciones de catálogo" />

    <div class="provider-layout">
      <div class="data-panel form-card">
        <div class="panel-head">
          <h2>Registrar nuevo proveedor</h2>
          <span class="panel-meta">Catálogo</span>
        </div>

        @if (generalError()) {
          <div class="inline-alert inline-alert--error form-alert" role="alert">
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

          <div class="form-actions">
            <app-button
              type="submit"
              variant="primary"
              size="lg"
              [loading]="submitting()"
            >
              Registrar proveedor
            </app-button>
          </div>
        </form>
      </div>

      <!-- Proveedores conocidos en sesión -->
      <div class="data-panel list-card">
        <div class="panel-head">
          <h3>Proveedores activos</h3>
          <span class="panel-meta font-mono">{{ catalogoLookup.proveedores().length }} registrados</span>
        </div>

        @if (catalogoLookup.proveedores().length === 0) {
          <div class="empty-state">
            <p class="empty-state__description">
              No se han registrado proveedores en esta sesión. Los proveedores registrados estarán disponibles para asociar repuestos y recepcionar compras de almacén.
            </p>
          </div>
        } @else {
          <div class="provider-list">
            @for (prv of catalogoLookup.proveedores(); track prv.id) {
              <div class="data-row">
                <div>
                  <div class="provider-name">{{ prv.razonSocial }}</div>
                  <div class="provider-ruc font-mono">
                    RUC: {{ prv.ruc }}
                    @if (prv.telefono) {
                      <span> • Tel: {{ prv.telefono }}</span>
                    }
                  </div>
                </div>
                <span class="value font-mono">ID: {{ prv.id }}</span>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .provider-layout {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-6);
      max-width: 960px;
    }

    @media (min-width: 768px) {
      .provider-layout {
        grid-template-columns: 3fr 2fr;
      }
    }

    .form-card {
      display: flex;
      flex-direction: column;
    }

    .form-alert {
      margin-bottom: var(--space-4);
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

    .form-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: var(--space-4);
      padding-top: var(--space-4);
      border-top: 1px solid var(--color-border);
    }

    .list-card {
      height: fit-content;
    }

    .provider-list {
      display: flex;
      flex-direction: column;
    }

    .provider-name {
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .provider-ruc {
      font-size: 12px;
      color: var(--color-text-secondary);
      margin-top: 2px;
    }
  `]
})
export class ProveedorFormPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly catalogoApi = inject(CatalogoApi);
  readonly catalogoLookup = inject(CatalogoLookup);
  private readonly toast = inject(ToastService);

  readonly navItems: PillNavItem[] = [
    { label: 'Productos', route: '/catalogo/productos' },
    { label: 'Categorías', route: '/catalogo/categorias' },
    { label: 'Proveedores', route: '/catalogo/proveedores' }
  ];

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
        this.toast.success(`Proveedor "${resp.razonSocial}" registrado correctamente.`);
        this.form.reset({
          ruc: '',
          razonSocial: '',
          contacto: '',
          telefono: '',
          correo: '',
          direccion: ''
        });
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
