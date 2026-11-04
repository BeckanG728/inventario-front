// src/app/features/operaciones/consumo/consumo-page.ts
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ProductosApi } from '@core/api/productos/productos-api';
import { ProductoResponse } from '@core/api/productos/productos.models';
import { OperacionesApi } from '@core/api/operaciones/operaciones-api';
import { ConsumoRequest, ConsumoResponse } from '@core/api/operaciones/operaciones.models';
import { CatalogoLookup } from '@core/lookup/catalogo-lookup';
import { SessionStore } from '@core/auth/session-store';
import { ToastService } from '@core/notifications/toast-service';
import { parseApiError } from '@core/api/api-error';
import { HasUnsavedChanges } from '@core/router/unsaved-changes.guard';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { PillNav, PillNavItem } from '@shared/ui/pill-nav/pill-nav';
import { Field } from '@shared/ui/field/field';
import { Button } from '@shared/ui/button/button';
import { Badge } from '@shared/ui/badge/badge';
import { Stepper } from '@shared/ui/stepper/stepper';
import { StockEstadoBadge } from '@shared/productos/stock-estado-badge';
import { ConsumoCartState } from './consumo-cart-state';
import { ConsumoResultadoDialog } from './consumo-resultado-dialog';

@Component({
  selector: 'app-consumo-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    PageHeader,
    PillNav,
    Field,
    Button,
    Badge,
    Stepper,
    StockEstadoBadge,
    ConsumoResultadoDialog
  ],
  providers: [ConsumoCartState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="Registrar consumo de repuestos"
      subtitle="Registro rápido de piezas, lubricantes y materiales para órdenes de trabajo"
    />

    @if (navItems().length > 1) {
      <app-pill-nav [items]="navItems()" ariaLabel="Operaciones de inventario" />
    }

    <!-- Alerta de error del backend (ej. 409 Stock insuficiente) -->
    @if (errorAlert()) {
      <div class="inline-alert inline-alert--error alert-box" role="alert">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <div>
          <strong>No se pudo procesar el consumo:</strong>
          <p>{{ errorAlert() }}</p>
        </div>
      </div>
    }

    <div class="consumo-layout">
      <!-- Columna izquierda: Buscador y selección rápida de repuestos -->
      <section class="catalog-column" aria-labelledby="catalog-heading">
        <div class="data-panel picker-panel">
          <div class="panel-head">
            <h2 id="catalog-heading">Seleccionar repuestos</h2>
            <span class="text-sm text-secondary">Disponibles en taller</span>
          </div>

          <!-- Buscador -->
          <div class="search-box">
            <label for="productoSearch" class="sr-only">Buscar por nombre o código</label>
            <div class="input-with-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-icon">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                id="productoSearch"
                type="search"
                class="field-input search-input"
                placeholder="Buscar por código o nombre..."
                [formControl]="searchControl"
                autocomplete="off"
              />
            </div>
          </div>

          <!-- Lista de productos buscados -->
          <div class="product-list" role="region" aria-live="polite">
            @if (loadingProducts()) {
              <div class="loading-state">
                <div class="skeleton-line" style="width: 100%; height: 50px;"></div>
                <div class="skeleton-line" style="width: 100%; height: 50px;"></div>
                <div class="skeleton-line" style="width: 100%; height: 50px;"></div>
              </div>
            } @else if (availableProducts().length === 0) {
              <div class="empty-state">
                <p>No se encontraron repuestos activos con el criterio ingresado.</p>
              </div>
            } @else {
              <div class="product-cards">
                @for (prod of availableProducts(); track prod.id) {
                  <article class="product-card" [class.is-out-of-stock]="prod.stockActual <= 0">
                    <div class="product-main">
                      <div class="product-meta">
                        <span class="code-badge">{{ prod.codigo }}</span>
                        <app-stock-estado-badge
                          [stockActual]="prod.stockActual"
                          [stockMinimo]="prod.stockMinimo"
                        />
                      </div>
                      <h3 class="product-name">{{ prod.nombre }}</h3>
                      <div class="product-stock-info">
                        <span>Stock disponible: <strong>{{ prod.stockActual }} {{ prod.unidadMedida }}</strong></span>
                        @if (prod.categoriaNombre || prod.categoriaId) {
                          <span class="text-secondary text-xs">• {{ prod.categoriaNombre || catalogoLookup.getNombreCategoria(prod.categoriaId) }}</span>
                        }
                      </div>
                    </div>

                    <div class="product-action">
                      <app-button
                        variant="secondary"
                        size="sm"
                        [disabled]="prod.stockActual <= 0"
                        (btnClick)="addToCart(prod)"
                        [attr.aria-label]="'Agregar ' + prod.nombre + ' al consumo'"
                      >
                        + Agregar
                      </app-button>
                    </div>
                  </article>
                }
              </div>
            }
          </div>
        </div>
      </section>

      <!-- Columna derecha: Formulario de consumo y lista de materiales seleccionados (Carrito) -->
      <section class="cart-column" aria-labelledby="cart-heading">
        <div class="data-panel cart-panel">
          <div class="panel-head">
            <h2 id="cart-heading">Materiales a retirar</h2>
            <app-badge variant="neutral">
              {{ cart.totalLines() }} {{ cart.totalLines() === 1 ? 'ítem' : 'ítems' }}
            </app-badge>
          </div>

          <!-- Formulario de datos generales -->
          <form [formGroup]="form" class="consumo-form" novalidate>
            <app-field
              label="Finalidad / Motivo del trabajo"
              forId="finalidad"
              [required]="true"
              hint="Ej. Mantenimiento 10.000 km, reparación de frenos, etc."
              [error]="finalidadError()"
            >
              <input
                id="finalidad"
                type="text"
                formControlName="finalidad"
                placeholder="Descripción del trabajo..."
                autocomplete="off"
                maxlength="255"
              />
            </app-field>

            <app-field
              label="Referencia de vehículo / cliente (Opcional)"
              forId="referenciaVehiculoCliente"
              hint="Placa o nombre (Ej. ABC-123 / Juan Pérez)"
              [error]="referenciaError()"
            >
              <input
                id="referenciaVehiculoCliente"
                type="text"
                formControlName="referenciaVehiculoCliente"
                placeholder="Placa o referencia..."
                autocomplete="off"
                maxlength="150"
              />
            </app-field>
          </form>

          <!-- Advertencia preventiva de sobregiro de stock -->
          @if (cart.hasAnyStockExceeded()) {
            <div class="inline-alert inline-alert--warning" role="alert">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span>Uno o más repuestos superan el stock registrado en el sistema.</span>
            </div>
          }

          <!-- Lista de ítems en el carrito -->
          <div class="cart-items-container">
            @if (!cart.hasItems()) {
              <div class="empty-cart">
                <div class="empty-cart-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="9" cy="21" r="1"></circle>
                    <circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                  </svg>
                </div>
                <p class="empty-cart-text">No has seleccionado ningún repuesto aún.</p>
                <span class="text-xs text-secondary">Usa el buscador para añadir piezas a la orden.</span>
              </div>
            } @else {
              <ul class="cart-list" role="list">
                @for (item of cart.items(); track item.producto.id) {
                  <li class="cart-item" [class.item-exceeded]="item.cantidad > item.producto.stockActual">
                    <div class="item-info">
                      <div class="item-header">
                        <span class="code-badge">{{ item.producto.codigo }}</span>
                        @if (item.cantidad > item.producto.stockActual) {
                          <app-badge variant="danger">Excede stock ({{ item.producto.stockActual }})</app-badge>
                        }
                      </div>
                      <h4 class="item-name">{{ item.producto.nombre }}</h4>
                      <span class="text-xs text-secondary">
                        Disponible: {{ item.producto.stockActual }} {{ item.producto.unidadMedida }}
                      </span>
                    </div>

                    <div class="item-controls">
                      <!-- Stepper táctil (min 44px) -->
                      <app-stepper
                        [value]="item.cantidad"
                        [min]="1"
                        [max]="9999"
                        [step]="1"
                        (valueChange)="onQuantityChange(item.producto.id, $event)"
                      />

                      <button
                        type="button"
                        class="remove-btn"
                        (click)="cart.removeItem(item.producto.id)"
                        [attr.aria-label]="'Eliminar ' + item.producto.nombre"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                  </li>
                }
              </ul>
            }
          </div>

          <!-- Barra de acción en escritorio -->
          <div class="desktop-actions">
            <div class="cart-summary">
              <span>Total de unidades: <strong>{{ cart.totalUnits() }}</strong></span>
            </div>
            <div class="action-buttons">
              @if (cart.hasItems()) {
                <app-button
                  variant="ghost"
                  (btnClick)="cart.clear()"
                  [disabled]="submitting()"
                >
                  Vaciar
                </app-button>
              }
              <app-button
                variant="primary"
                [disabled]="!canSubmit()"
                [loading]="submitting()"
                (btnClick)="onSubmit()"
              >
                Confirmar consumo
              </app-button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Barra fija inferior para dispositivos móviles (< 1024 px) -->
    <aside class="mobile-bottom-bar" aria-label="Resumen de consumo en móvil">
      <div class="mobile-bar-content">
        <div class="mobile-summary">
          <span class="mobile-items-count">{{ cart.totalLines() }} ítems</span>
          <span class="mobile-units-count">({{ cart.totalUnits() }} unid.)</span>
        </div>
        <app-button
          variant="primary"
          size="md"
          [disabled]="!canSubmit()"
          [loading]="submitting()"
          (btnClick)="onSubmit()"
        >
          Confirmar consumo
        </app-button>
      </div>
    </aside>

    <!-- Modal con el resultado del consumo procesado -->
    <app-consumo-resultado-dialog
      [consumo]="resultadoConsumo()"
      [(isOpen)]="showResultadoDialog"
      (closed)="onResultadoClosed()"
    />
  `,
  styles: [`
    .alert-box { margin-bottom: var(--space-4); display: flex; align-items: flex-start; gap: var(--space-3); }
    .alert-box p { margin: var(--space-1) 0 0 0; font-size: var(--text-sm); }
    .consumo-layout { display: grid; grid-template-columns: 1fr; gap: var(--space-6); margin-bottom: 80px; }
    @media (min-width: 1024px) {
      .consumo-layout { grid-template-columns: 1fr 1fr; margin-bottom: var(--space-6); }
    }
    .picker-panel, .cart-panel { display: flex; flex-direction: column; height: 100%; }
    .search-box { margin-bottom: var(--space-4); }
    .input-with-icon { position: relative; display: flex; align-items: center; }
    .search-icon { position: absolute; left: var(--space-3); color: var(--color-text-secondary); pointer-events: none; }
    .search-input { width: 100%; padding-left: calc(var(--space-3) + 24px); }
    .product-list { max-height: 520px; overflow-y: auto; padding-right: var(--space-1); }
    .product-cards, .cart-list { display: flex; flex-direction: column; gap: var(--space-2); list-style: none; padding: 0; margin: 0; }
    .product-card {
      display: flex; align-items: center; justify-content: space-between; gap: var(--space-3);
      padding: var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-md);
      background-color: var(--color-bg-primary); transition: border-color var(--duration-fast);
    }
    .product-card:hover { border-color: var(--color-border-hover); }
    .product-card.is-out-of-stock { opacity: 0.6; background-color: var(--color-bg-secondary); }
    .product-main, .item-info { flex: 1; min-width: 0; }
    .product-meta, .item-header { display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-1); }
    .code-badge {
      font-family: var(--font-mono); font-size: var(--text-xs); font-weight: var(--font-semibold);
      background-color: var(--color-bg-secondary); border: 1px solid var(--color-border);
      padding: 1px 6px; border-radius: var(--radius-sm);
    }
    .product-name, .item-name {
      margin: 0 0 2px 0; font-size: var(--text-sm); font-weight: var(--font-semibold);
      color: var(--color-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .product-stock-info { font-size: var(--text-xs); color: var(--color-text-primary); display: flex; gap: var(--space-2); }
    .consumo-form { display: flex; flex-direction: column; gap: var(--space-3); margin-bottom: var(--space-4); }
    .cart-items-container { flex: 1; min-height: 200px; max-height: 420px; overflow-y: auto; margin-bottom: var(--space-4); }
    .empty-cart {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: var(--space-8) var(--space-4); text-align: center; border: 2px dashed var(--color-border);
      border-radius: var(--radius-md);
    }
    .empty-cart-icon { color: var(--color-text-tertiary); margin-bottom: var(--space-2); }
    .empty-cart-text { font-weight: var(--font-medium); color: var(--color-text-secondary); margin: 0 0 var(--space-1) 0; }
    .cart-item {
      display: flex; flex-direction: column; gap: var(--space-2); padding: var(--space-3);
      border: 1px solid var(--color-border); border-radius: var(--radius-md); background-color: var(--color-bg-secondary);
    }
    @media (min-width: 480px) {
      .cart-item { flex-direction: row; align-items: center; justify-content: space-between; }
    }
    .cart-item.item-exceeded { border-color: var(--color-warning-border); background-color: var(--color-warning-subtle); }
    .item-controls { display: flex; align-items: center; gap: var(--space-2); justify-content: flex-end; }
    .remove-btn {
      display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px;
      border: 1px solid transparent; border-radius: var(--radius-md); background: none;
      color: var(--color-danger); cursor: pointer; transition: background-color var(--duration-fast);
    }
    .remove-btn:hover { background-color: var(--color-danger-subtle); }
    .desktop-actions {
      display: none; align-items: center; justify-content: space-between;
      border-top: 1px solid var(--color-border); padding-top: var(--space-4); margin-top: auto;
    }
    @media (min-width: 1024px) { .desktop-actions { display: flex; } }
    .cart-summary { font-size: var(--text-sm); color: var(--color-text-secondary); }
    .cart-summary strong { color: var(--color-text-primary); font-size: var(--text-base); }
    .action-buttons { display: flex; gap: var(--space-2); }
    .mobile-bottom-bar {
      position: fixed; bottom: 0; left: 0; right: 0; background-color: var(--color-bg-primary);
      border-top: 1px solid var(--color-border); box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.08);
      padding: var(--space-3) var(--space-4); z-index: 100;
    }
    @media (min-width: 1024px) { .mobile-bottom-bar { display: none; } }
    .mobile-bar-content { display: flex; align-items: center; justify-content: space-between; max-width: 1200px; margin: 0 auto; }
    .mobile-summary { display: flex; flex-direction: column; }
    .mobile-items-count { font-size: var(--text-base); font-weight: var(--font-bold); color: var(--color-text-primary); }
    .mobile-units-count { font-size: var(--text-xs); color: var(--color-text-secondary); }
  `]
})
export class ConsumoPage implements OnInit, HasUnsavedChanges {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly productosApi = inject(ProductosApi);
  private readonly operacionesApi = inject(OperacionesApi);
  private readonly session = inject(SessionStore);
  private readonly toast = inject(ToastService);
  readonly catalogoLookup = inject(CatalogoLookup);
  readonly cart = inject(ConsumoCartState);

  // Navegación en pestañas según rol
  readonly navItems = computed<PillNavItem[]>(() => {
    const role = this.session.role();
    if (role === 'JEFE_TALLER') {
      return [
        { label: 'Registrar consumo', route: '/operaciones/consumo' },
        { label: 'Registrar entrada', route: '/operaciones/entrada' },
        { label: 'Registrar ajuste', route: '/operaciones/ajuste' }
      ];
    }
    return [{ label: 'Registrar consumo', route: '/operaciones/consumo' }];
  });

  // Buscador de repuestos
  readonly searchControl = new FormControl<string>('', { nonNullable: true });
  readonly availableProducts = signal<ProductoResponse[]>([]);
  readonly loadingProducts = signal<boolean>(false);

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
    this.cargarProductos();

    // Búsqueda reactiva con debounce de 300ms
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((query) => {
        this.cargarProductos(query);
      });
  }

  cargarProductos(query = ''): void {
    this.loadingProducts.set(true);
    this.productosApi.listar({ page: 0, size: 20, nombre: query }).subscribe({
      next: (resp) => {
        this.loadingProducts.set(false);
        // Filtrar solo productos activos
        this.availableProducts.set(resp.content.filter(p => p.activo));
      },
      error: () => {
        this.loadingProducts.set(false);
        this.availableProducts.set([]);
      }
    });
  }

  addToCart(prod: ProductoResponse): void {
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
        productoId: i.producto.id,
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
        // Recargar productos para reflejar stocks descontados
        this.cargarProductos(this.searchControl.value);
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
