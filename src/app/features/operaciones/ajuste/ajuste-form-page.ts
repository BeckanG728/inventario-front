// src/app/features/operaciones/ajuste/ajuste-form-page.ts
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductosApi } from '@core/api/productos/productos-api';
import { ProductoResponse } from '@core/api/productos/productos.models';
import { OperacionesApi } from '@core/api/operaciones/operaciones-api';
import { AjusteRequest, MovimientoResponse } from '@core/api/operaciones/operaciones.models';
import { ToastService } from '@core/notifications/toast-service';
import { parseApiError } from '@core/api/api-error';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { PillNav, PillNavItem } from '@shared/ui/pill-nav/pill-nav';
import { Field } from '@shared/ui/field/field';
import { Button } from '@shared/ui/button/button';
import { Badge } from '@shared/ui/badge/badge';

@Component({
  selector: 'app-ajuste-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, PageHeader, PillNav, Field, Button, Badge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="Registrar ajuste de inventario"
      subtitle="Corrección por conteo físico real, mermas o diferencias de stock"
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

    @if (lastSuccess(); as m) {
      <div class="inline-alert inline-alert--success alert-box" role="status">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        <div>
          <strong>¡Ajuste de inventario registrado!</strong>
          <p>
            Movimiento #{{ m.id }}: Variación de <strong>{{ (m.variacion ?? 0) >= 0 ? '+' : '' }}{{ m.variacion ?? 0 }}</strong> unidades.
            Stock previo: {{ m.stockAnterior }} ➔ Stock posterior fijado: <strong>{{ m.stockPosterior }}</strong>.
          </p>
        </div>
      </div>
    }

    <div class="ajuste-layout">
      <div class="data-panel form-card">
        <div class="panel-head">
          <h2>Datos del ajuste físico</h2>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
          <!-- Selector de producto -->
          <app-field
            label="Repuesto / Producto a ajustar"
            forId="productoId"
            [required]="true"
            hint="Selecciona el producto a corregir en almacén"
            [error]="productoError()"
          >
            <select id="productoId" formControlName="productoId" (change)="onProductoChange()">
              <option [value]="0">-- Selecciona un producto --</option>
              @for (p of productos(); track p.id) {
                <option [value]="p.id">
                  {{ p.codigo }} — {{ p.nombre }} (Stock en sistema: {{ p.stockActual }})
                </option>
              }
            </select>
          </app-field>

          @if (selectedProducto(); as p) {
            <!-- Panel comparativo de stock -->
            <div class="stock-comparison">
              <div class="stock-box">
                <span class="stock-label">Stock en sistema</span>
                <span class="stock-value">{{ p.stockActual }}</span>
                <span class="stock-unit">{{ p.unidadMedida }}</span>
              </div>

              <div class="stock-arrow">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </div>

              <div class="stock-box highlight">
                <span class="stock-label">Nuevo conteo físico</span>
                <span class="stock-value">{{ form.controls.cantidadFisica.value }}</span>
                <span class="stock-unit">{{ p.unidadMedida }}</span>
              </div>

              <div class="stock-diff">
                <span class="stock-label">Variación resultante</span>
                @if (variacionCalculada() > 0) {
                  <app-badge variant="success">+{{ variacionCalculada() }} (Incremento)</app-badge>
                } @else if (variacionCalculada() < 0) {
                  <app-badge variant="danger">{{ variacionCalculada() }} (Disminución / Merma)</app-badge>
                } @else {
                  <app-badge variant="neutral">Sin variación (0)</app-badge>
                }
              </div>
            </div>
          }

          <!-- Cantidad física real -->
          <app-field
            label="Cantidad física verificada en taller"
            forId="cantidadFisica"
            [required]="true"
            hint="Número exacto de unidades contadas en la estantería o almacén"
            [error]="cantidadFisicaError()"
          >
            <input
              id="cantidadFisica"
              type="number"
              min="0"
              step="1"
              formControlName="cantidadFisica"
              placeholder="0"
            />
          </app-field>

          <!-- Justificación obligatoria -->
          <app-field
            label="Justificación del ajuste"
            forId="justificacion"
            [required]="true"
            hint="Explica el motivo del desbalance (conteo anual, pieza dañada, sobrante, etc.)"
            [error]="justificacionError()"
          >
            <textarea
              id="justificacion"
              rows="3"
              formControlName="justificacion"
              placeholder="Motivo detallado del ajuste..."
              maxlength="255"
            ></textarea>
          </app-field>

          <div class="form-actions">
            <app-button
              type="submit"
              variant="primary"
              [disabled]="form.invalid || submitting() || !selectedProducto()"
              [loading]="submitting()"
            >
              Aplicar ajuste de stock
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

    .ajuste-layout {
      max-width: 720px;
      margin: 0 auto;
    }

    .form-card {
      padding: var(--space-5);
    }

    .stock-comparison {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      padding: var(--space-4);
      background-color: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      margin-bottom: var(--space-4);
      flex-wrap: wrap;
    }

    .stock-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 110px;
    }

    .stock-box.highlight {
      background-color: var(--color-bg-primary);
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--color-border-hover);
      border-radius: var(--radius-sm);
    }

    .stock-label {
      font-size: var(--text-xs);
      color: var(--color-text-secondary);
      margin-bottom: 2px;
    }

    .stock-value {
      font-size: var(--text-xl);
      font-weight: var(--font-bold);
      color: var(--color-text-primary);
    }

    .stock-unit {
      font-size: var(--text-xs);
      color: var(--color-text-tertiary);
    }

    .stock-arrow {
      color: var(--color-text-tertiary);
    }

    .stock-diff {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-1);
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: var(--space-4);
    }
  `]
})
export class AjusteFormPage implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly productosApi = inject(ProductosApi);
  private readonly operacionesApi = inject(OperacionesApi);
  private readonly toast = inject(ToastService);

  readonly navItems: PillNavItem[] = [
    { label: 'Registrar consumo', route: '/operaciones/consumo' },
    { label: 'Registrar entrada', route: '/operaciones/entrada' },
    { label: 'Registrar ajuste', route: '/operaciones/ajuste' }
  ];

  readonly productos = signal<ProductoResponse[]>([]);
  readonly selectedProducto = signal<ProductoResponse | null>(null);

  readonly submitting = signal<boolean>(false);
  readonly errorAlert = signal<string | null>(null);
  readonly lastSuccess = signal<MovimientoResponse | null>(null);

  readonly form = this.fb.group({
    productoId: [0, [Validators.required, Validators.min(1)]],
    cantidadFisica: [0, [Validators.required, Validators.min(0)]],
    justificacion: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(255)]]
  });

  readonly variacionCalculada = computed(() => {
    const prod = this.selectedProducto();
    if (!prod) return 0;
    const fisica = this.form.controls.cantidadFisica.value;
    return fisica - prod.stockActual;
  });

  ngOnInit(): void {
    this.cargarProductos();
  }

  cargarProductos(): void {
    this.productosApi.listar({ page: 0, size: 100 }).subscribe({
      next: (resp) => {
        this.productos.set(resp.content.filter(p => p.activo));
      }
    });
  }

  onProductoChange(): void {
    const id = Number(this.form.controls.productoId.value);
    const prod = this.productos().find(p => p.id === id) || null;
    this.selectedProducto.set(prod);

    if (prod) {
      this.form.controls.cantidadFisica.setValue(prod.stockActual);
    }
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
    const req: AjusteRequest = {
      productoId: Number(raw.productoId),
      cantidadFisica: Number(raw.cantidadFisica),
      justificacion: raw.justificacion.trim()
    };

    this.operacionesApi.registrarAjuste(req).subscribe({
      next: (resp) => {
        this.submitting.set(false);
        this.lastSuccess.set(resp);
        this.toast.success(`Ajuste de inventario registrado con éxito.`);
        this.form.reset({
          productoId: 0,
          cantidadFisica: 0,
          justificacion: ''
        });
        this.selectedProducto.set(null);
        this.cargarProductos();
      },
      error: (err) => {
        this.submitting.set(false);
        const apiErr = parseApiError(err);
        this.errorAlert.set(apiErr.message || 'Error al registrar el ajuste de stock.');
      }
    });
  }

  productoError(): string | null {
    const ctrl = this.form.controls.productoId;
    if (ctrl.touched && ctrl.value < 1) return 'Debes seleccionar un producto válido.';
    return null;
  }

  cantidadFisicaError(): string | null {
    const ctrl = this.form.controls.cantidadFisica;
    if (ctrl.touched && ctrl.invalid) {
      if (ctrl.errors?.['required']) return 'La cantidad física es obligatoria.';
      if (ctrl.errors?.['min']) return 'La cantidad física no puede ser negativa.';
    }
    return null;
  }

  justificacionError(): string | null {
    const ctrl = this.form.controls.justificacion;
    if (ctrl.touched && ctrl.invalid) {
      if (ctrl.errors?.['required']) return 'La justificación es obligatoria.';
      if (ctrl.errors?.['minlength']) return 'Mínimo 5 caracteres de explicación.';
      if (ctrl.errors?.['maxlength']) return 'Máximo 255 caracteres.';
    }
    return null;
  }
}
