// src/app/features/catalogo/productos/producto-form-dialog.ts
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, model, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { startWith, switchMap, tap } from 'rxjs';
import { ProductosApi } from '@core/api/productos/productos-api';
import { CreateProductoRequest, ProductoResponse, UpdateProductoRequest } from '@core/api/productos/productos.models';
import { CatalogoLookup } from '@core/lookup/catalogo-lookup';
import { UnidadResponse } from '@core/api/unidades/unidades.models';
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
    unidadBaseId: [0, [Validators.required]],
    unidadPresentacionId: [0],
    factorPresentacion: [0]
  });

  readonly isEdit = computed(() => !!this.productoToEdit());
  readonly unidadesDisponibles = signal<UnidadResponse[]>([]);
  readonly unidadSeleccionada = computed(() =>
    this.unidadesDisponibles().find(u => u.id === this.form.controls.unidadBaseId.value));

  /** Las unidades fragmentables (CAJA, PAQUETE, JUEGO...) son presentaciones: no pueden ser unidad base (RN502). */
  readonly unidadesBase = computed(() => this.unidadesDisponibles().filter(u => !u.permiteFragmentacion));
  readonly unidadesPresentacion = computed(() => this.unidadesDisponibles().filter(u => u.permiteFragmentacion));
  readonly sinPresentaciones = computed(() =>
    this.unidadesDisponibles().length > 0 && this.unidadesPresentacion().length === 0);

  /** Unidad base que corresponde a cada presentación de longitud. */
  private static readonly BASE_POR_PRESENTACION: Record<string, string> = {
    METRO: 'CM',
    ROLLO: 'CM'
  };

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
          unidadBaseId: prod.unidadBaseId,
          unidadPresentacionId: prod.unidadPresentacionId ?? 0,
          factorPresentacion: prod.factorPresentacion ?? 0
        });
      } else {
        this.form.reset({
          nombre: '',
          descripcion: '',
          idCategoria: this.catalogoLookup.categorias()[0]?.id || 0,
          idProveedor: this.catalogoLookup.proveedores()[0]?.id || 0,
          stockMinimo: 5,
          unidadBaseId: 0,
          unidadPresentacionId: 0,
          factorPresentacion: 0
        });
      }
      this.generalError.set(null);
    });

    // El combobox de unidades solo ofrece las válidas para la categoría elegida.
    // Se usa valueChanges porque idCategoria.value no es una señal: un effect no se re-ejecutaría al cambiar de categoría.
    this.form.controls.idCategoria.valueChanges.pipe(
      startWith(this.form.controls.idCategoria.value),
      tap(() => {
        this.unidadesDisponibles.set([]);
        if (!this.isEdit()) {
          this.form.patchValue({
            unidadBaseId: 0,
            unidadPresentacionId: 0,
            factorPresentacion: 0
          });
        }
      }),
      switchMap(categoriaId => this.catalogoLookup.cargarUnidadesPorCategoria(Number(categoriaId))),
      takeUntilDestroyed()
    ).subscribe(unidades => {
      this.unidadesDisponibles.set(unidades);
      const idUnidad = Number(this.form.controls.unidadBaseId.value);
      if (idUnidad > 0 && !unidades.some(u => u.id === idUnidad)) {
        this.form.patchValue({
          unidadBaseId: 0,
          unidadPresentacionId: 0,
          factorPresentacion: 0
        });
      }
      this.actualizarEstadoPresentacion(unidades);
    });

    this.form.controls.unidadPresentacionId.valueChanges.pipe(takeUntilDestroyed())
      .subscribe(id => this.aplicarReglasPresentacion(Number(id)));
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

  get unidadBaseIdError(): () => string | null {
    return () => {
      const ctrl = this.form.controls.unidadBaseId;
      if (ctrl.touched && (!ctrl.value || ctrl.value <= 0)) {
        return 'Debes seleccionar una unidad base.';
      }
      return ctrl.touched ? getFirstErrorMessage(ctrl.errors) : null;
    };
  }

  get factorPresentacionError(): () => string | null {
    return () => {
      const ctrl = this.form.controls.factorPresentacion;
      if (!ctrl.touched) return null;
      if (ctrl.hasError('required') || ctrl.hasError('min')) {
        return 'Indica el factor de presentación (mayor a 0).';
      }
      return getFirstErrorMessage(ctrl.errors);
    };
  }

  /** Si la categoría no tiene presentaciones, se deshabilitan presentación y factor (solo al crear). */
  private actualizarEstadoPresentacion(unidades: UnidadResponse[]): void {
    const sinPresentaciones = !this.isEdit()
      && unidades.length > 0
      && !unidades.some(u => u.permiteFragmentacion);
    const controles = [this.form.controls.unidadPresentacionId];
    for (const ctrl of controles) {
      if (sinPresentaciones) {
        ctrl.disable({ emitEvent: false });
      } else {
        ctrl.enable({ emitEvent: false });
      }
    }
    this.sincronizarFactor();
  }

  /** El factor solo se habilita cuando hay una presentación elegida; sin presentación queda en 0 y deshabilitado. */
  private sincronizarFactor(): void {
    const factor = this.form.controls.factorPresentacion;
    if (this.isEdit()) {
      factor.enable({ emitEvent: false });
      return;
    }
    const presentacion = this.form.controls.unidadPresentacionId;
    if (presentacion.enabled && Number(presentacion.value) > 0) {
      factor.enable({ emitEvent: false });
    } else {
      factor.setValue(0, { emitEvent: false });
      factor.disable({ emitEvent: false });
    }
  }

  /** Factor obligatorio solo si hay presentación; la unidad base queda fijada según la presentación (solo al crear). */
  private aplicarReglasPresentacion(presentacionId: number): void {
    const base = this.form.controls.unidadBaseId;
    const factor = this.form.controls.factorPresentacion;

    if (this.isEdit() || presentacionId <= 0) {
      factor.clearValidators();
      base.enable({ emitEvent: false });
    } else {
      factor.setValidators([Validators.required, Validators.min(1)]);
      const presentacion = this.unidadesDisponibles().find(u => u.id === presentacionId);
      const codigoBase = presentacion ? ProductoFormDialog.BASE_POR_PRESENTACION[presentacion.codigo] : undefined;
      const unidadBase = codigoBase ? this.unidadesDisponibles().find(u => u.codigo === codigoBase) : undefined;
      if (unidadBase) {
        base.setValue(unidadBase.id);
        base.disable({ emitEvent: false });
      } else {
        base.enable({ emitEvent: false });
      }
    }
    factor.updateValueAndValidity({ emitEvent: false });
    this.sincronizarFactor();
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
    const prod = this.productoToEdit()!;
    const unidadBaseId = raw.unidadBaseId;
    const unidadPresentacionId = raw.unidadPresentacionId > 0 ? raw.unidadPresentacionId : undefined;
    const factorPresentacion = raw.factorPresentacion > 0 ? raw.factorPresentacion : undefined;

    if (this.isEdit()) {
      const updateReq: UpdateProductoRequest = {
        nombre: raw.nombre.trim(),
        descripcion: raw.descripcion.trim() || undefined,
        unidadBaseId,
        unidadPresentacionId,
        factorPresentacion,
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
        unidadBaseId,
        unidadPresentacionId,
        factorPresentacion,
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
              if (d.field === 'unidadBaseId') {
                this.form.controls.unidadBaseId.setErrors({ server: d.reason });
              }
              if (d.field === 'unidadPresentacionId') {
                this.form.controls.unidadPresentacionId.setErrors({ server: d.reason });
              }
              if (d.field === 'factorPresentacion') {
                this.form.controls.factorPresentacion.setErrors({ server: d.reason });
              }
            }
            return;
          }

          this.generalError.set(apiErr.message || 'Error al crear el producto.');
        }
      });
    }
  }
}
