// src/app/features/operaciones/entrada/entrada-form-page.ts
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductosApi } from '@core/api/productos/productos-api';
import { ProductoResponse } from '@core/api/productos/productos.models';
import { OperacionesApi } from '@core/api/operaciones/operaciones-api';
import { EntradaRequest, EntradaResponse } from '@core/api/operaciones/operaciones.models';
import { CatalogoLookup } from '@core/lookup/catalogo-lookup';
import { ToastService } from '@core/notifications/toast-service';
import { parseApiError } from '@core/api/api-error';
import { CurrencyPipe } from '@shared/format/currency.pipe';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { Field } from '@shared/ui/field/field';
import { Button } from '@shared/ui/button/button';

@Component({
  selector: 'app-entrada-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, PageHeader, Field, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './entrada-form-page.html',
  styleUrl: './entrada-form-page.css'
})
export class EntradaFormPage implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly productosApi = inject(ProductosApi);
  private readonly operacionesApi = inject(OperacionesApi);
  private readonly catalogoLookup = inject(CatalogoLookup);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly productos = signal<ProductoResponse[]>([]);
  readonly selectedProducto = signal<ProductoResponse | null>(null);
  readonly proveedores = this.catalogoLookup.proveedores;

  /** Id del producto fijado desde la tabla (?productoId=). null = selección libre. */
  readonly productoFijoId = signal<number | null>(null);

  /** El proveedor siempre es el asociado al producto seleccionado. */
  readonly proveedorDelProducto = computed(() => {
    const p = this.selectedProducto();
    if (!p) return null;
    const id = p.proveedorId ?? p.idProveedor;
    if (!id) return null;
    const enLookup = this.proveedores().find(x => x.id === id);
    return {
      id,
      razonSocial: p.proveedorRazonSocial || enLookup?.razonSocial || `Proveedor #${id}`,
      ruc: enLookup?.ruc || ''
    };
  });

  readonly submitting = signal<boolean>(false);
  readonly errorAlert = signal<string | null>(null);
  readonly lastSuccess = signal<EntradaResponse | null>(null);

  readonly form = this.fb.group({
    productoId: [0, [Validators.required, Validators.min(1)]],
    proveedorId: [0, [Validators.required, Validators.min(1)]],
    cantidad: [1, [Validators.required, Validators.min(1)]],
    costoUnitario: [0, [Validators.required, Validators.min(0.01)]]
  });

  readonly costoTotalCalculado = computed(() => {
    const raw = this.form.getRawValue();
    if (raw.cantidad > 0 && raw.costoUnitario > 0) {
      return raw.cantidad * raw.costoUnitario;
    }
    return 0;
  });

  ngOnInit(): void {
    // El proveedor no se elige: se deriva del producto seleccionado.
    this.form.controls.proveedorId.disable();

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(qp => {
      const id = Number(qp.get('productoId'));
      if (id > 0) {
        this.fijarProducto(id);
      } else if (this.productoFijoId() !== null) {
        this.limpiarSeleccion();
      }
    });

    this.cargarProductos();
  }

  cargarProductos(): void {
    this.productosApi.listar({ page: 0, size: 100 }).subscribe({
      next: (resp) => {
        const activos = resp.content.filter(p => p.activo);
        this.productos.set(activos);

        // Producto fijado desde la tabla: refrescar con datos actuales o aplicarlo si aún no se pudo.
        const fijoId = this.productoFijoId();
        if (fijoId !== null) {
          const fresco = activos.find(p => p.id === fijoId);
          if (fresco && this.selectedProducto()) {
            this.selectedProducto.set(fresco);
          } else if (fresco) {
            this.aplicarProducto(fresco);
          } else if (!this.selectedProducto()) {
            // No está disponible (inactivo o fuera del listado): volver a selección libre.
            this.productoFijoId.set(null);
          }
        }
      }
    });
  }

  onProductoChange(): void {
    const id = Number(this.form.controls.productoId.value);
    const prod = this.productos().find(p => p.id === id) || null;
    if (prod) {
      this.aplicarProducto(prod);
    } else {
      this.limpiarSeleccion();
    }
  }

  /** Fija el producto recibido por query param (y por navigation state desde la tabla). */
  private fijarProducto(id: number): void {
    this.productoFijoId.set(id);
    const desdeTabla = history.state?.producto as ProductoResponse | undefined;
    const prod = desdeTabla?.id === id ? desdeTabla : this.productos().find(p => p.id === id);
    if (prod) {
      this.aplicarProducto(prod);
    }
  }

  /** Selecciona el producto, fija su proveedor y precarga el último costo. */
  private aplicarProducto(prod: ProductoResponse): void {
    this.selectedProducto.set(prod);
    this.form.controls.productoId.setValue(prod.id);
    this.form.controls.proveedorId.setValue(prod.proveedorId ?? prod.idProveedor ?? 0);

    if (prod.costoUltimaCompra && prod.costoUltimaCompra > 0) {
      this.form.controls.costoUnitario.setValue(prod.costoUltimaCompra);
    }
  }

  private limpiarSeleccion(): void {
    this.productoFijoId.set(null);
    this.selectedProducto.set(null);
    this.form.controls.productoId.setValue(0);
    this.form.controls.proveedorId.setValue(0);
  }

  /** Desde el producto fijado: volver al selector libre quitando el query param. */
  liberarProducto(): void {
    this.limpiarSeleccion();
    this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true, state: {} });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorAlert.set(null);
    this.lastSuccess.set(null);

    const raw = this.form.getRawValue();
    if (Number(raw.proveedorId) < 1) {
      this.submitting.set(false);
      this.errorAlert.set('El producto seleccionado no tiene un proveedor asociado.');
      return;
    }
    const req: EntradaRequest = {
      productoId: Number(raw.productoId),
      proveedorId: Number(raw.proveedorId),
      cantidad: Number(raw.cantidad),
      costoUnitario: Number(raw.costoUnitario)
    };

    this.operacionesApi.registrarEntrada(req).subscribe({
      next: (resp) => {
        this.submitting.set(false);
        this.lastSuccess.set(resp);
        this.toast.success(`Entrada registrada. Nuevo stock: ${resp.movimiento.stockPosterior}`);
        const prodActual = this.selectedProducto();
        if (this.productoFijoId() !== null && prodActual) {
          // Flujo desde la tabla: se mantiene el producto y se refleja el nuevo stock/costo.
          this.selectedProducto.set({
            ...prodActual,
            stockActual: resp.movimiento.stockPosterior,
            costoUltimaCompra: req.costoUnitario
          });
          this.form.patchValue({ cantidad: 1 });
        } else {
          this.form.reset({
            productoId: 0,
            proveedorId: 0,
            cantidad: 1,
            costoUnitario: 0
          });
          this.selectedProducto.set(null);
        }
        this.cargarProductos();
      },
      error: (err) => {
        this.submitting.set(false);
        const apiErr = parseApiError(err);
        this.errorAlert.set(apiErr.message || 'Error al registrar la entrada.');
      }
    });
  }

  productoError(): string | null {
    const ctrl = this.form.controls.productoId;
    if (ctrl.touched && ctrl.value < 1) return 'Debes seleccionar un producto válido.';
    return null;
  }

  proveedorError(): string | null {
    const ctrl = this.form.controls.proveedorId;
    if (ctrl.touched && ctrl.value < 1) return 'Debes seleccionar un proveedor.';
    return null;
  }

  cantidadError(): string | null {
    const ctrl = this.form.controls.cantidad;
    if (ctrl.touched && ctrl.invalid) {
      if (ctrl.errors?.['required']) return 'La cantidad es obligatoria.';
      if (ctrl.errors?.['min']) return 'La cantidad mínima es 1.';
    }
    return null;
  }

  costoError(): string | null {
    const ctrl = this.form.controls.costoUnitario;
    if (ctrl.touched && ctrl.invalid) {
      if (ctrl.errors?.['required']) return 'El costo unitario es obligatorio.';
      if (ctrl.errors?.['min']) return 'El costo debe ser mayor a 0,00.';
    }
    return null;
  }
}
