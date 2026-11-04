// src/app/features/catalogo/productos/producto-form-dialog.ts
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, model, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductosApi } from '@core/api/productos/productos-api';
import { CreateProductoRequest, ProductoResponse, UpdateProductoRequest } from '@core/api/productos/productos.models';
import { CatalogoLookup } from '@core/lookup/catalogo-lookup';
import { parseApiError } from '@core/api/api-error';
import { getFirstErrorMessage } from '@shared/forms/error-messages';
import { Modal } from '@shared/ui/modal/modal';
import { Field } from '@shared/ui/field/field';
import { Button } from '@shared/ui/button/button';

@Component({
  selector: 'app-producto-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, Modal, Field, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal
      [title]="isEdit() ? 'Modificar repuesto / producto' : 'Registrar nuevo repuesto / producto'"
      size="md"
      [(isOpen)]="isOpen"
      (closed)="onCancel()"
    >
      @if (generalError()) {
        <div class="inline-alert inline-alert--error form-alert" role="alert">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{{ generalError() }}</span>
        </div>
      }

      <form [formGroup]="form" (ngSubmit)="onSubmit()" id="productoForm" novalidate>
        @if (!isEdit()) {
          <app-field
            label="Código / SKU"
            forId="codigo"
            [required]="true"
            hint="De 3 a 50 caracteres alfanuméricos o guiones (único)"
            [error]="codigoError()"
          >
            <input
              id="codigo"
              type="text"
              formControlName="codigo"
              autocomplete="off"
              placeholder="Ej. PAST-DEL-01"
              [attr.aria-invalid]="!!codigoError()"
            />
          </app-field>
        }

        <app-field
          label="Nombre del repuesto"
          forId="nombre"
          [required]="true"
          hint="De 3 a 150 caracteres descriptivos"
          [error]="nombreError()"
        >
          <input
            id="nombre"
            type="text"
            formControlName="nombre"
            autocomplete="off"
            placeholder="Ej. Pastillas de freno delanteras"
            [attr.aria-invalid]="!!nombreError()"
          />
        </app-field>

        <app-field
          label="Descripción (opcional)"
          forId="descripcion"
          hint="Detalles técnicos o compatibilidad (máximo 500 caracteres)"
          [error]="descripcionError()"
        >
          <textarea
            id="descripcion"
            rows="2"
            formControlName="descripcion"
            placeholder="Detalles sobre marca, compatibilidad vehicular, etc."
          ></textarea>
        </app-field>

        @if (!isEdit()) {
          <div class="form-row">
            <app-field
              label="Categoría"
              forId="idCategoria"
              [required]="true"
              hint="Familia o clasificación del repuesto"
              [error]="categoriaError()"
            >
              <select
                id="idCategoria"
                formControlName="idCategoria"
                [attr.aria-invalid]="!!categoriaError()"
              >
                <option [value]="0" disabled>Selecciona una categoría...</option>
                @for (cat of catalogoLookup.categorias(); track cat.id) {
                  <option [value]="cat.id">{{ cat.nombre }}</option>
                }
              </select>
            </app-field>

            <app-field
              label="Proveedor distribuidor"
              forId="idProveedor"
              [required]="true"
              hint="Proveedor principal del repuesto"
              [error]="proveedorError()"
            >
              <select
                id="idProveedor"
                formControlName="idProveedor"
                [attr.aria-invalid]="!!proveedorError()"
              >
                <option [value]="0" disabled>Selecciona un proveedor...</option>
                @for (prv of catalogoLookup.proveedores(); track prv.id) {
                  <option [value]="prv.id">{{ prv.razonSocial }}</option>
                }
              </select>
            </app-field>
          </div>

          <div class="form-row">
            <app-field
              label="Stock mínimo"
              forId="stockMinimo"
              [required]="true"
              hint="Nivel que activa alertas de reposición"
              [error]="stockMinimoError()"
            >
              <input
                id="stockMinimo"
                type="number"
                min="0"
                step="1"
                formControlName="stockMinimo"
                [attr.aria-invalid]="!!stockMinimoError()"
              />
            </app-field>

            <app-field
              label="Unidad de medida"
              forId="unidadMedida"
              [required]="true"
              hint="Ej. UNIDAD, JUEGO, LITRO, KIT (máx. 30 caracteres)"
              [error]="unidadMedidaError()"
            >
              <input
                id="unidadMedida"
                type="text"
                formControlName="unidadMedida"
                placeholder="Ej. UNIDAD"
                [attr.aria-invalid]="!!unidadMedidaError()"
              />
            </app-field>
          </div>
        } @else {
          <app-field
            label="Unidad de medida"
            forId="unidadMedida"
            [required]="true"
            hint="Ej. UNIDAD, JUEGO, LITRO, KIT (máx. 30 caracteres)"
            [error]="unidadMedidaError()"
          >
            <input
              id="unidadMedida"
              type="text"
              formControlName="unidadMedida"
              placeholder="Ej. UNIDAD"
              [attr.aria-invalid]="!!unidadMedidaError()"
            />
          </app-field>
        }
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
          {{ isEdit() ? 'Guardar cambios' : 'Crear producto' }}
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
export class ProductoFormDialog {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly productosApi = inject(ProductosApi);
  readonly catalogoLookup = inject(CatalogoLookup);

  readonly productoToEdit = input<ProductoResponse | null>(null);
  readonly isOpen = model<boolean>(false);
  readonly saved = output<ProductoResponse>();

  readonly submitting = signal<boolean>(false);
  readonly generalError = signal<string | null>(null);

  readonly form = this.fb.group({
    codigo: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50), Validators.pattern(/^[a-zA-Z0-9_-]{3,50}$/)]],
    nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
    descripcion: ['', [Validators.maxLength(500)]],
    idCategoria: [0, [Validators.required, Validators.min(1)]],
    idProveedor: [0, [Validators.required, Validators.min(1)]],
    stockMinimo: [5, [Validators.required, Validators.min(0)]],
    unidadMedida: ['UNIDAD', [Validators.required, Validators.maxLength(30)]]
  });

  readonly isEdit = computed(() => !!this.productoToEdit());

  constructor() {
    effect(() => {
      const prod = this.productoToEdit();
      if (prod) {
        this.form.patchValue({
          codigo: prod.codigo,
          nombre: prod.nombre,
          descripcion: prod.descripcion || '',
          idCategoria: prod.categoriaId ?? prod.idCategoria ?? 0,
          idProveedor: prod.proveedorId ?? prod.idProveedor ?? 0,
          stockMinimo: prod.stockMinimo,
          unidadMedida: prod.unidadMedida
        });
      } else {
        this.form.reset({
          codigo: '',
          nombre: '',
          descripcion: '',
          idCategoria: this.catalogoLookup.categorias()[0]?.id || 0,
          idProveedor: this.catalogoLookup.proveedores()[0]?.id || 0,
          stockMinimo: 5,
          unidadMedida: 'UNIDAD'
        });
      }
      this.generalError.set(null);
    });
  }

  get codigoError(): () => string | null {
    return () => {
      const ctrl = this.form.controls.codigo;
      return ctrl.touched ? getFirstErrorMessage(ctrl.errors) : null;
    };
  }

  get nombreError(): () => string | null {
    return () => {
      const ctrl = this.form.controls.nombre;
      return ctrl.touched ? getFirstErrorMessage(ctrl.errors) : null;
    };
  }

  get descripcionError(): () => string | null {
    return () => {
      const ctrl = this.form.controls.descripcion;
      return ctrl.touched ? getFirstErrorMessage(ctrl.errors) : null;
    };
  }

  get categoriaError(): () => string | null {
    return () => {
      const ctrl = this.form.controls.idCategoria;
      return ctrl.touched ? (ctrl.value <= 0 ? 'Debes seleccionar una categoría.' : getFirstErrorMessage(ctrl.errors)) : null;
    };
  }

  get proveedorError(): () => string | null {
    return () => {
      const ctrl = this.form.controls.idProveedor;
      return ctrl.touched ? (ctrl.value <= 0 ? 'Debes seleccionar un proveedor.' : getFirstErrorMessage(ctrl.errors)) : null;
    };
  }

  get stockMinimoError(): () => string | null {
    return () => {
      const ctrl = this.form.controls.stockMinimo;
      return ctrl.touched ? getFirstErrorMessage(ctrl.errors) : null;
    };
  }

  get unidadMedidaError(): () => string | null {
    return () => {
      const ctrl = this.form.controls.unidadMedida;
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

    if (this.isEdit()) {
      const prod = this.productoToEdit()!;
      const updateReq: UpdateProductoRequest = {
        codigo: prod.codigo,
        nombre: raw.nombre.trim(),
        descripcion: raw.descripcion.trim() || undefined,
        unidadMedida: raw.unidadMedida.trim(),
        stockMinimo: prod.stockMinimo,
        activo: prod.activo,
        id_categoria: prod.categoriaId ?? prod.idCategoria ?? raw.idCategoria,
        id_proveedor: prod.proveedorId ?? prod.idProveedor ?? raw.idProveedor,
        idCategoria: prod.categoriaId ?? prod.idCategoria ?? raw.idCategoria,
        idProveedor: prod.proveedorId ?? prod.idProveedor ?? raw.idProveedor
      };

      this.productosApi.actualizar(prod.id, updateReq).subscribe({
        next: (resp) => {
          this.submitting.set(false);
          this.saved.emit(resp);
          this.isOpen.set(false);
        },
        error: (err) => {
          this.submitting.set(false);
          const apiErr = parseApiError(err);
          this.generalError.set(apiErr.message || 'Error al actualizar el producto.');
        }
      });
    } else {
      const createReq: CreateProductoRequest = {
        codigo: raw.codigo.trim(),
        nombre: raw.nombre.trim(),
        descripcion: raw.descripcion.trim() || undefined,
        unidadMedida: raw.unidadMedida.trim(),
        stockMinimo: raw.stockMinimo,
        id_categoria: raw.idCategoria,
        id_proveedor: raw.idProveedor,
        idCategoria: raw.idCategoria,
        idProveedor: raw.idProveedor
      };

      this.productosApi.crear(createReq).subscribe({
        next: (resp) => {
          this.submitting.set(false);
          this.saved.emit(resp);
          this.isOpen.set(false);
        },
        error: (err) => {
          this.submitting.set(false);
          const apiErr = parseApiError(err);

          if (apiErr.status === 409 || apiErr.code === 'PRODUCTO_ALREADY_EXISTS') {
            this.form.controls.codigo.setErrors({ server: 'Ya existe un producto registrado con ese código SKU.' });
            return;
          }

          if (apiErr.status === 400 && apiErr.details.length > 0) {
            for (const d of apiErr.details) {
              if (d.field === 'codigo') this.form.controls.codigo.setErrors({ server: d.reason });
              if (d.field === 'nombre') this.form.controls.nombre.setErrors({ server: d.reason });
              if (d.field === 'idCategoria' || d.field === 'id_categoria' || d.field === 'categoriaId') {
                this.form.controls.idCategoria.setErrors({ server: d.reason });
              }
              if (d.field === 'idProveedor' || d.field === 'id_proveedor' || d.field === 'proveedorId') {
                this.form.controls.idProveedor.setErrors({ server: d.reason });
              }
              if (d.field === 'stockMinimo') this.form.controls.stockMinimo.setErrors({ server: d.reason });
              if (d.field === 'unidadMedida') this.form.controls.unidadMedida.setErrors({ server: d.reason });
            }
            return;
          }

          this.generalError.set(apiErr.message || 'Error al crear el producto.');
        }
      });
    }
  }
}
