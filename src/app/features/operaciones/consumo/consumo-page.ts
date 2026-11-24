// src/app/features/operaciones/consumo/consumo-page.ts
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ProductosApi } from '@core/api/productos/productos-api';
import { ProductoResponse } from '@core/api/productos/productos.models';
import { OperacionesApi } from '@core/api/operaciones/operaciones-api';
import { ConsumoRequest, ConsumoResponse, ProductoFrecuente } from '@core/api/operaciones/operaciones.models';
import { ToastService } from '@core/notifications/toast-service';
import { parseApiError } from '@core/api/api-error';
import { HasUnsavedChanges } from '@core/router/unsaved-changes.guard';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { Field } from '@shared/ui/field/field';
import { Button } from '@shared/ui/button/button';
import { Badge } from '@shared/ui/badge/badge';
import { Stepper } from '@shared/ui/stepper/stepper';
import { StockEstadoBadge } from '@shared/productos/stock-estado-badge';
import { ConsumoCartState, ProductoSelector } from './consumo-cart-state';
import { ConsumoResultadoDialog } from './consumo-resultado-dialog';

@Component({
  selector: 'app-consumo-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    PageHeader,
    Field,
    Button,
    Badge,
    Stepper,
    StockEstadoBadge,
    ConsumoResultadoDialog
  ],
  providers: [ConsumoCartState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './consumo-page.html',
  styleUrl: './consumo-page.css'
})
export class ConsumoPage implements OnInit, HasUnsavedChanges {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly productosApi = inject(ProductosApi);
  private readonly operacionesApi = inject(OperacionesApi);
  private readonly toast = inject(ToastService);
  readonly cart = inject(ConsumoCartState);

  // Buscador de repuestos
  readonly searchControl = new FormControl<string>('', { nonNullable: true });
  readonly availableProducts = signal<ProductoSelector[]>([]);
  readonly loadingProducts = signal<boolean>(false);
  /** Sin texto: preset de frecuentes; con texto: resultados de búsqueda. El buscador nunca se oculta. */
  readonly modoBusqueda = signal(false);

  // Formulario de consumo
  readonly form = this.fb.group({
    finalidad: ['', [Validators.required, Validators.maxLength(255)]],
    referenciaVehiculoCliente: ['', [Validators.maxLength(150)]]
  });

  // Versión reactiva del formulario para forzar re-evaluación en zoneless
  readonly formVersion = signal<number>(0);

  readonly submitting = signal<boolean>(false);
  readonly errorAlert = signal<string | null>(null);

  // Diálogo de resultado exitoso
  readonly resultadoConsumo = signal<ConsumoResponse | null>(null);
  readonly showResultadoDialog = signal<boolean>(false);
  private submittedSuccessfully = false;

  readonly canSubmit = computed(() => {
    return this.cart.hasItems() && !this.submitting();
  });

  constructor() {
    this.form.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.formVersion.update(v => v + 1);
      });

    this.form.statusChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.formVersion.update(v => v + 1);
      });
  }

  ngOnInit(): void {
    // Preset inicial: los productos frecuentes del usuario.
    this.cargarFrecuentes();

    // El buscador nunca se oculta: al escribir se consulta el catálogo completo.
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(query => {
        const texto = query.trim();
        this.modoBusqueda.set(texto.length > 0);
        if (texto) {
          this.buscarProductos(texto);
        } else {
          this.cargarFrecuentes();
        }
      });
  }

  /** GET /api/consumos/productos-frecuentes — sin parámetros, hasta 5 productos. */
  cargarFrecuentes(): void {
    this.loadingProducts.set(true);
    this.operacionesApi.getProductosFrecuentes().subscribe({
      next: data => {
        this.availableProducts.set(data.map(p => this.deFrecuente(p)));
        this.loadingProducts.set(false);
      },
      error: () => {
        this.availableProducts.set([]);
        this.loadingProducts.set(false);
      }
    });
  }

  /** GET /api/productos?page=0&size=20&nombre=<texto> — cualquier otro producto. */
  buscarProductos(query: string): void {
    this.loadingProducts.set(true);
    this.productosApi.listar({ page: 0, size: 20, nombre: query }).subscribe({
      next: resp => {
        // El backend incluye inactivos; el consumo los rechazaría con 400.
        this.availableProducts.set(resp.content
          .filter(p => p.activo)
          .map(p => this.deBusqueda(p)));
        this.loadingProducts.set(false);
      },
      error: () => {
        this.availableProducts.set([]);
        this.loadingProducts.set(false);
      }
    });
  }

  /** Normaliza la respuesta de frecuentes (productoId). */
  private deFrecuente(p: ProductoFrecuente): ProductoSelector {
    return {
      productoId: p.productoId,
      codigo: p.codigo,
      nombre: p.nombre,
      unidadMedida: p.unidadMedida,
      stockActual: p.stockActual,
      stockMinimo: p.stockMinimo,
      categoriaNombre: p.categoriaNombre,
      vecesConsumido: p.vecesConsumido
    };
  }

  /** Normaliza la respuesta de búsqueda (id) al mismo modelo interno. */
  private deBusqueda(p: ProductoResponse): ProductoSelector {
    return {
      productoId: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      unidadMedida: p.unidadMedida,
      stockActual: p.stockActual,
      stockMinimo: p.stockMinimo,
      categoriaNombre: p.categoriaNombre
    };
  }

  addToCart(prod: ProductoSelector): void {
    this.cart.addItem(prod, 1);
    this.errorAlert.set(null);
  }

  onQuantityChange(productoId: number, qty: number): void {
    this.cart.updateQuantity(productoId, qty);
    this.errorAlert.set(null);
  }

  onSubmit(): void {
    if (!this.canSubmit()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formVersion.update(v => v + 1);
      this.toast.warning('Por favor completa la finalidad o motivo del trabajo.');
      return;
    }

    const raw = this.form.getRawValue();
    const finalidadTrimmed = raw.finalidad.trim();
    if (!finalidadTrimmed) {
      this.form.controls.finalidad.setErrors({ required: true });
      this.form.markAllAsTouched();
      this.formVersion.update(v => v + 1);
      this.toast.warning('La finalidad no puede consistir únicamente en espacios en blanco.');
      return;
    }

    this.submitting.set(true);
    this.errorAlert.set(null);

    const payload: ConsumoRequest = {
      finalidad: finalidadTrimmed,
      referenciaVehiculoCliente: raw.referenciaVehiculoCliente.trim() || null,
      items: this.cart.items().map(i => ({
        productoId: i.producto.productoId,
        cantidad: i.cantidad
      }))
    };

    this.operacionesApi.registrarConsumo(payload).subscribe({
      next: (resp) => {
        this.submitting.set(false);
        this.submittedSuccessfully = true;
        this.resultadoConsumo.set(resp);
        this.showResultadoDialog.set(true);
        this.cart.clear();
        this.form.reset();
        this.formVersion.update(v => v + 1);
        this.toast.success(`Consumo #${resp.id} registrado correctamente.`);
        // Recargar el modo activo para reflejar los stocks descontados.
        if (this.modoBusqueda()) {
          this.buscarProductos(this.searchControl.value.trim());
        } else {
          this.cargarFrecuentes();
        }
      },
      error: (err) => {
        this.submitting.set(false);
        const apiErr = parseApiError(err);

        // En caso de 409 STOCK_INSUFICIENTE o 400, preservamos el carrito intacto
        this.errorAlert.set(apiErr.message || 'Error al procesar el consumo.');
        this.toast.error(apiErr.message || 'Stock insuficiente o error de validación.');
      }
    });
  }

  onResultadoClosed(): void {
    this.showResultadoDialog.set(false);
    this.submittedSuccessfully = false;
  }

  finalidadError(): string | null {
    this.formVersion();
    const ctrl = this.form.controls.finalidad;
    if (ctrl.touched && ctrl.invalid) {
      if (ctrl.errors?.['required']) return 'La finalidad o trabajo es obligatoria.';
      if (ctrl.errors?.['maxlength']) return 'Máximo 255 caracteres.';
    }
    return null;
  }

  referenciaError(): string | null {
    this.formVersion();
    const ctrl = this.form.controls.referenciaVehiculoCliente;
    if (ctrl.touched && ctrl.invalid) {
      if (ctrl.errors?.['maxlength']) return 'Máximo 150 caracteres.';
    }
    return null;
  }

  hasUnsavedChanges(): boolean {
    return this.cart.hasItems() && !this.submittedSuccessfully;
  }
}
