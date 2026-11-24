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
  templateUrl: './producto-form-dialog.html',
  styleUrl: './producto-form-dialog.css'
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
          nombre: prod.nombre,
          descripcion: prod.descripcion || '',
          idCategoria: prod.categoriaId ?? prod.idCategoria ?? 0,
          idProveedor: prod.proveedorId ?? prod.idProveedor ?? 0,
          stockMinimo: prod.stockMinimo,
          unidadMedida: prod.unidadMedida
        });
      } else {
        this.form.reset({
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

          if (apiErr.status === 400 && apiErr.details.length > 0) {
            for (const d of apiErr.details) {
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
