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
import { PillNav, PillNavItem } from '@shared/ui/pill-nav/pill-nav';
import { Field } from '@shared/ui/field/field';
import { Button } from '@shared/ui/button/button';

@Component({
  selector: 'app-entrada-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, PageHeader, PillNav, Field, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="Registrar entrada de inventario"
      subtitle="Recepción de mercadería de compras a proveedores con actualización de costo unitario"
    />

    <app-pill-nav [items]="navItems" ariaLabel="Operaciones de inventario" />

    @if (errorAlert()) {
      <div class="inline-alert inline-alert--error alert-box" role="alert">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>{{ errorAlert() }}</span>
      </div>
    }

    @if (lastSuccess(); as s) {
      <div class="inline-alert inline-alert--success alert-box" role="status">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        <div>
          <strong>¡Entrada registrada con éxito!</strong>
          <p>
            Movimiento #{{ s.movimiento.id }}: Se sumaron <strong>+{{ s.movimiento.cantidad }}</strong> unidades
            al producto. Nuevo stock disponible: <strong>{{ s.movimiento.stockPosterior }}</strong>.
          </p>
        </div>
      </div>
    }

    <div class="entrada-layout">
      <div class="data-panel form-card">
        <div class="panel-head">
          <h2>Datos de la recepción</h2>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
          <!-- Producto fijado desde la tabla (acción "Actualizar stock") -->
          @if (productoFijoId() !== null) {
            <div class="fixed-field">
              <span class="fixed-field__label">Repuesto / Producto <span class="fixed-field__req">*</span></span>
              @if (selectedProducto(); as pf) {
                <div class="fixed-field__box">
                  <span><strong>{{ pf.codigo }}</strong> — {{ pf.nombre }}</span>
                  <button type="button" class="link-btn" (click)="liberarProducto()">Elegir otro producto</button>
                </div>
              } @else {
                <div class="fixed-field__box">Cargando producto…</div>
              }
            </div>
          } @else {
          <!-- Selector de producto -->
          <app-field
            label="Repuesto / Producto"
            forId="productoId"
            [required]="true"
            hint="Selecciona el producto recibido del catálogo"
            [error]="productoError()"
          >
            <select id="productoId" formControlName="productoId" (change)="onProductoChange()">
              <option [value]="0">-- Selecciona un producto --</option>
              @for (p of productos(); track p.id) {
                <option [value]="p.id">
                  {{ p.codigo }} — {{ p.nombre }} (Stock actual: {{ p.stockActual }})
                </option>
              }
            </select>
          </app-field>
          }

          <!-- Info rápida del producto seleccionado -->
          @if (selectedProducto(); as p) {
            <div class="product-preview">
              <div class="preview-item">
                <span class="preview-label">Stock actual:</span>
                <span class="preview-value"><strong>{{ p.stockActual }}</strong> {{ p.unidadMedida }}</span>
              </div>
              <div class="preview-item">
                <span class="preview-label">Último costo de compra:</span>
                <span class="preview-value">
                  {{ p.costoUltimaCompra ? (p.costoUltimaCompra | appCurrency) : 'Sin compras registradas' }}
                </span>
              </div>
            </div>
          }

          <!-- Selector de proveedor -->
          <app-field
            label="Proveedor distribuidor"
            forId="proveedorId"
            [required]="true"
            hint="Proveedor asociado al producto seleccionado (no editable)"
            [error]="proveedorError()"
          >
            <select id="proveedorId" formControlName="proveedorId">
              @if (proveedorDelProducto(); as prv) {
                <option [value]="prv.id">{{ prv.ruc ? prv.ruc + ' — ' : '' }}{{ prv.razonSocial }}</option>
              } @else {
                <option [value]="0">-- Selecciona primero un producto --</option>
              }
            </select>
          </app-field>

          <div class="form-row">
            <!-- Cantidad ingresada -->
            <app-field
              label="Cantidad recibida"
              forId="cantidad"
              [required]="true"
              hint="Unidades físicas verificadas"
              [error]="cantidadError()"
            >
              <input
                id="cantidad"
                type="number"
                min="1"
                step="1"
                formControlName="cantidad"
                placeholder="1"
              />
            </app-field>

            <!-- Costo unitario -->
            <app-field
              label="Costo unitario (S/)"
              forId="costoUnitario"
              [required]="true"
              hint="Precio unitario de compra sin IGV"
              [error]="costoError()"
            >
              <input
                id="costoUnitario"
                type="number"
                min="0.01"
                step="0.01"
                formControlName="costoUnitario"
                placeholder="0.00"
              />
            </app-field>
          </div>

          <!-- Total de compra calculado -->
          @if (costoTotalCalculado() > 0) {
            <div class="total-bar">
              <span>Importe total estimado de la entrada:</span>
              <strong>{{ costoTotalCalculado() | appCurrency }}</strong>
            </div>
          }

          <div class="form-actions">
            <app-button
              type="submit"
              variant="primary"
              [disabled]="form.invalid || submitting()"
              [loading]="submitting()"
            >
              Registrar entrada
            </app-button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .alert-box {
      margin-bottom: var(--space-4);
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
    }

    .alert-box p {
      margin: var(--space-1) 0 0 0;
      font-size: var(--text-sm);
    }

    .entrada-layout {
      max-width: 720px;
      margin: 0 auto;
    }

    .form-card {
      padding: var(--space-5);
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-4);
    }

    @media (min-width: 600px) {
      .form-row {
        grid-template-columns: 1fr 1fr;
      }
    }

    .product-preview {
      display: flex;
      gap: var(--space-4);
      padding: var(--space-3);
      background-color: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      margin-top: calc(-1 * var(--space-2));
      margin-bottom: var(--space-4);
      font-size: var(--text-sm);
    }

    .preview-item {
      display: flex;
      flex-direction: column;
    }

    .preview-label {
      font-size: var(--text-xs);
      color: var(--color-text-secondary);
    }

    /* Producto fijado desde la tabla */
    .fixed-field {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      margin-bottom: var(--space-4);
    }

    .fixed-field__label {
      font-size: var(--text-sm);
      font-weight: 500;
    }

    .fixed-field__req {
      color: var(--color-danger);
    }

    .fixed-field__box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      flex-wrap: wrap;
      padding: var(--space-3) var(--space-4);
      background-color: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-size: var(--text-sm);
    }

    .link-btn {
      padding: 0;
      border: none;
      background: none;
      font: inherit;
      font-size: var(--text-xs);
      color: var(--color-primary);
      cursor: pointer;
      text-decoration: underline;
    }

    .total-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-3) var(--space-4);
      background-color: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      margin: var(--space-4) 0;
      font-size: var(--text-sm);
    }

    .total-bar strong {
      font-size: var(--text-lg);
      color: var(--color-primary);
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: var(--space-4);
    }
  `]
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

  readonly navItems: PillNavItem[] = [
    { label: 'Registrar consumo', route: '/operaciones/consumo' },
    { label: 'Registrar entrada', route: '/operaciones/entrada' },
    { label: 'Registrar ajuste', route: '/operaciones/ajuste' }
  ];

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
