// src/app/features/catalogo/productos/productos-page.ts
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ProductosApi } from '@core/api/productos/productos-api';
import { ProductoResponse } from '@core/api/productos/productos.models';
import { CatalogoLookup } from '@core/lookup/catalogo-lookup';
import { SessionStore } from '@core/auth/session-store';
import { ToastService } from '@core/notifications/toast-service';
import { parseApiError } from '@core/api/api-error';
import { CurrencyPipe } from '@shared/format/currency.pipe';
import { StockEstadoBadge } from '@shared/productos/stock-estado-badge';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { PillNav, PillNavItem } from '@shared/ui/pill-nav/pill-nav';
import { Button } from '@shared/ui/button/button';
import { Badge } from '@shared/ui/badge/badge';
import { Pagination } from '@shared/ui/pagination/pagination';
import { ConfirmDialog } from '@shared/ui/confirm-dialog/confirm-dialog';
import { ProductoFormDialog } from './producto-form-dialog';
import { StockMinimoDialog } from './stock-minimo-dialog';

@Component({
  selector: 'app-productos-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    StockEstadoBadge,
    PageHeader,
    PillNav,
    Button,
    Badge,
    Pagination,
    ConfirmDialog,
    ProductoFormDialog,
    StockMinimoDialog
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="Catálogo de repuestos y productos"
      subtitle="Consulta de inventario, existencias en almacén y niveles de reposición"
    >
      @if (isJefeTaller()) {
        <app-button variant="primary" (btnClick)="openCreateDialog()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Nuevo producto
        </app-button>
      }
    </app-page-header>

    @if (isJefeTaller()) {
      <app-pill-nav [items]="navItems" ariaLabel="Secciones de catálogo" />
    }

    <!-- Barra de filtros reactiva -->
    <div class="filter-bar data-panel">
      <div class="filter-inputs">
        <div class="search-input-wrap">
          <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="search"
            class="search-input"
            placeholder="Buscar por nombre de producto..."
            [formControl]="searchControl"
          />
        </div>

        <select
          class="category-select"
          [formControl]="categoryControl"
          aria-label="Filtrar por categoría"
        >
          <option [value]="0">Todas las categorías</option>
          @for (cat of catalogoLookup.categorias(); track cat.id) {
            <option [value]="cat.id">{{ cat.nombre }}</option>
          }
        </select>
      </div>

      <div class="filter-actions">
        <app-button variant="outline" size="sm" (btnClick)="loadProductos()">
          Actualizar listado
        </app-button>
      </div>
    </div>

    @if (errorMessage()) {
      <div class="inline-alert inline-alert--error" role="alert">
        <span>{{ errorMessage() }}</span>
        <app-button variant="secondary" size="sm" (btnClick)="loadProductos()">
          Reintentar
        </app-button>
      </div>
    }

    <!-- Tabla de resultados -->
    <div class="table-wrapper" [class.table-loading]="loading() && productos().length > 0">
      <table>
        <thead>
          <tr>
            <th>Código SKU</th>
            <th>Nombre y descripción</th>
            <th>Categoría</th>
            <th class="text-right">Stock actual</th>
            <th class="text-right">Stock mín.</th>
            <th>Estado</th>
            @if (isJefeTaller()) {
              <th class="text-right">Última compra</th>
            }
            <th>Disponibilidad</th>
            @if (isJefeTaller()) {
              <th class="text-right">Acciones</th>
            }
          </tr>
        </thead>
        <tbody>
          @if (loading() && productos().length === 0) {
            @for (s of [1, 2, 3, 4, 5]; track s) {
              <tr>
                <td><div class="skeleton" style="width: 80px; height: 16px;"></div></td>
                <td><div class="skeleton" style="width: 180px; height: 16px;"></div></td>
                <td><div class="skeleton" style="width: 100px; height: 16px;"></div></td>
                <td class="text-right"><div class="skeleton" style="width: 40px; height: 16px; margin-left: auto;"></div></td>
                <td class="text-right"><div class="skeleton" style="width: 40px; height: 16px; margin-left: auto;"></div></td>
                <td><div class="skeleton" style="width: 70px; height: 20px;"></div></td>
                @if (isJefeTaller()) {
                  <td class="text-right"><div class="skeleton" style="width: 60px; height: 16px; margin-left: auto;"></div></td>
                }
                <td><div class="skeleton" style="width: 60px; height: 20px;"></div></td>
                @if (isJefeTaller()) {
                  <td class="text-right"><div class="skeleton" style="width: 90px; height: 28px; margin-left: auto;"></div></td>
                }
              </tr>
            }
          } @else if (productos().length === 0) {
            <tr>
              <td [attr.colspan]="isJefeTaller() ? 9 : 7">
                <div class="empty-state">
                  <div class="empty-state__icon">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                    </svg>
                  </div>
                  <h3 class="empty-state__title">No se encontraron repuestos</h3>
                  <p class="empty-state__description">
                    No hay productos que coincidan con los filtros seleccionados o el catálogo está vacío.
                  </p>
                  @if (isJefeTaller()) {
                    <app-button variant="primary" size="sm" (btnClick)="openCreateDialog()">
                      Crear primer producto
                    </app-button>
                  }
                </div>
              </td>
            </tr>
          } @else {
            @for (p of productos(); track p.id) {
              <tr [class.row-inactive]="!p.activo">
                <td class="font-mono">
                  <strong>{{ p.codigo }}</strong>
                </td>
                <td>
                  <div class="product-title">{{ p.nombre }}</div>
                  @if (p.descripcion) {
                    <div class="product-desc">{{ p.descripcion }}</div>
                  }
                  <div class="product-unit font-mono">Unidad: {{ p.unidadMedida }}</div>
                </td>
                <td>
                  {{ p.categoriaNombre || catalogoLookup.getNombreCategoria(p.categoriaId) }}
                </td>
                <td class="text-right font-mono">
                  <strong>{{ p.stockActual }}</strong>
                </td>
                <td class="text-right font-mono">
                  {{ p.stockMinimo }}
                </td>
                <td>
                  <app-stock-estado-badge
                    [stockActual]="p.stockActual"
                    [stockMinimo]="p.stockMinimo"
                  />
                </td>
                @if (isJefeTaller()) {
                  <td class="text-right font-mono">
                    {{ p.costoUltimaCompra | appCurrency }}
                  </td>
                }
                <td>
                  @if (p.activo) {
                    <app-badge variant="neutral" size="sm">Activo</app-badge>
                  } @else {
                    <app-badge variant="danger" size="sm">Inactivo</app-badge>
                  }
                </td>
                @if (isJefeTaller()) {
                  <td class="text-right action-cell">
                    <button
                      type="button"
                      class="row-btn"
                      title="Editar datos del producto"
                      (click)="openEditDialog(p)"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      class="row-btn"
                      title="Actualizar stock mínimo"
                      (click)="openStockMinimoDialog(p)"
                    >
                      Stock mín.
                    </button>

                    @if (p.activo) {
                      <button
                        type="button"
                        class="row-btn row-btn--danger"
                        title="Desactivar producto"
                        (click)="confirmDesactivar(p)"
                      >
                        Desactivar
                      </button>
                    }
                  </td>
                }
              </tr>
            }
          }
        </tbody>
      </table>
    </div>

    <!-- Paginador -->
    <app-pagination
      [page]="currentPage()"
      [size]="pageSize()"
      [totalElements]="totalElements()"
      [totalPages]="totalPages()"
      (pageChange)="onPageChange($event)"
    />

    <!-- Diálogos modales -->
    <app-producto-form-dialog
      [(isOpen)]="isFormOpen"
      [productoToEdit]="selectedProducto()"
      (saved)="onProductoSaved($event)"
    />

    <app-stock-minimo-dialog
      [(isOpen)]="isStockMinimoOpen"
      [producto]="selectedProducto()"
      (saved)="onProductoSaved($event)"
    />

    <app-confirm-dialog
      [(isOpen)]="isConfirmOpen"
      title="Desactivar producto"
      [message]="confirmMessage()"
      confirmText="Sí, desactivar"
      confirmVariant="destructive"
      [submitting]="actionSubmitting()"
      (confirmed)="executeDesactivar()"
    />
  `,
  styles: [`
    .filter-inputs {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      flex: 1;
    }

    @media (min-width: 768px) {
      .filter-inputs {
        flex-direction: row;
        align-items: center;
      }
    }

    .search-input-wrap {
      position: relative;
      flex: 1;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--color-text-secondary);
      pointer-events: none;
    }

    .search-input {
      width: 100%;
      padding: 10px 14px 10px 38px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background-color: var(--color-input-bg);
      color: var(--color-text-primary);
      font-size: var(--font-size-body);
      min-height: var(--touch-target-min);
    }

    .category-select {
      padding: 10px 14px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background-color: var(--color-input-bg);
      color: var(--color-text-primary);
      font-size: var(--font-size-body);
      min-height: var(--touch-target-min);
    }

    .table-loading {
      opacity: 0.6;
      transition: opacity var(--duration-fast) var(--easing-out);
    }

    .product-title {
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .product-desc {
      font-size: 12px;
      color: var(--color-text-secondary);
      margin-top: 2px;
    }

    .product-unit {
      font-size: 11px;
      color: var(--color-text-muted);
      margin-top: 2px;
    }

    .row-inactive {
      opacity: 0.6;
    }

    .action-cell {
      white-space: nowrap;
    }

    .row-btn {
      display: inline-flex;
      align-items: center;
      padding: 4px 8px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background-color: var(--color-surface);
      color: var(--color-text-primary);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      margin-left: 4px;
      transition: background-color var(--duration-fast) var(--easing-out);
    }

    .row-btn:hover {
      background-color: var(--color-surface-hover);
    }

    .row-btn--danger {
      color: var(--color-danger);
    }

    .row-btn--danger:hover {
      background-color: var(--color-danger-tint);
    }
  `]
})
export class ProductosPage implements OnInit {
  private readonly productosApi = inject(ProductosApi);
  readonly catalogoLookup = inject(CatalogoLookup);
  private readonly session = inject(SessionStore);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly isJefeTaller = computed(() => this.session.role() === 'JEFE_TALLER');

  readonly navItems: PillNavItem[] = [
    { label: 'Productos', route: '/catalogo/productos' },
    { label: 'Categorías', route: '/catalogo/categorias' },
    { label: 'Proveedores', route: '/catalogo/proveedores' }
  ];

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly categoryControl = new FormControl(0, { nonNullable: true });

  readonly productos = signal<ProductoResponse[]>([]);
  readonly currentPage = signal<number>(0);
  readonly pageSize = signal<number>(10);
  readonly totalElements = signal<number>(0);
  readonly totalPages = signal<number>(0);
  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Estados de modales
  readonly isFormOpen = signal<boolean>(false);
  readonly isStockMinimoOpen = signal<boolean>(false);
  readonly isConfirmOpen = signal<boolean>(false);
  readonly selectedProducto = signal<ProductoResponse | null>(null);
  readonly actionSubmitting = signal<boolean>(false);
  readonly confirmMessage = computed(() => {
    const p = this.selectedProducto();
    return p ? `¿Estás seguro de que deseas desactivar el repuesto "${p.codigo} — ${p.nombre}"?` : '';
  });

  ngOnInit(): void {
    // Sincronizar query params iniciales
    this.route.queryParams.subscribe(params => {
      const page = params['page'] !== undefined ? parseInt(params['page'], 10) : 0;
      const size = params['size'] !== undefined ? parseInt(params['size'], 10) : 10;
      const nombre = params['nombre'] || '';
      const categoria = params['categoria'] !== undefined ? parseInt(params['categoria'], 10) : 0;

      this.currentPage.set(page);
      this.pageSize.set(size);
      if (this.searchControl.value !== nombre) {
        this.searchControl.setValue(nombre, { emitEvent: false });
      }
      if (this.categoryControl.value !== categoria) {
        this.categoryControl.setValue(categoria, { emitEvent: false });
      }

      this.loadProductos();
    });

    // Debounce en búsqueda de texto a 300 ms
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(text => {
      this.updateQueryParams({ nombre: text.trim() || null, page: 0 });
    });

    // Filtro por categoría
    this.categoryControl.valueChanges.pipe(
      distinctUntilChanged()
    ).subscribe(catId => {
      this.updateQueryParams({ categoria: catId > 0 ? catId : null, page: 0 });
    });
  }

  loadProductos(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const params = {
      page: this.currentPage(),
      size: this.pageSize(),
      nombre: this.searchControl.value.trim() || undefined,
      categoria: this.categoryControl.value > 0 ? this.categoryControl.value : undefined
    };

    this.productosApi.listar(params).subscribe({
      next: (resp) => {
        this.loading.set(false);
        this.productos.set(resp.content);
        this.totalElements.set(resp.totalElements);
        this.totalPages.set(resp.totalPages);
        this.catalogoLookup.extraerCategoriasDeProductos(resp.content);
      },
      error: (err) => {
        this.loading.set(false);
        const apiErr = parseApiError(err);
        this.errorMessage.set(apiErr.message || 'Error al cargar el listado de productos.');
      }
    });
  }

  onPageChange(newPage: number): void {
    this.updateQueryParams({ page: newPage });
  }

  private updateQueryParams(newParams: Record<string, unknown>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: newParams,
      queryParamsHandling: 'merge'
    });
  }

  openCreateDialog(): void {
    this.selectedProducto.set(null);
    this.isFormOpen.set(true);
  }

  openEditDialog(p: ProductoResponse): void {
    this.selectedProducto.set(p);
    this.isFormOpen.set(true);
  }

  openStockMinimoDialog(p: ProductoResponse): void {
    this.selectedProducto.set(p);
    this.isStockMinimoOpen.set(true);
  }

  confirmDesactivar(p: ProductoResponse): void {
    this.selectedProducto.set(p);
    this.isConfirmOpen.set(true);
  }

  executeDesactivar(): void {
    const prod = this.selectedProducto();
    if (!prod) return;

    this.actionSubmitting.set(true);
    this.productosApi.desactivar(prod.id).subscribe({
      next: (updated) => {
        this.actionSubmitting.set(false);
        this.isConfirmOpen.set(false);
        this.toast.success(`Producto "${updated.codigo}" desactivado correctamente.`);
        this.onProductoSaved(updated);
      },
      error: (err) => {
        this.actionSubmitting.set(false);
        const apiErr = parseApiError(err);
        this.toast.error(apiErr.message || 'Error al desactivar el producto.');
      }
    });
  }

  onProductoSaved(savedProd: ProductoResponse): void {
    this.productos.update(list => {
      const idx = list.findIndex(p => p.id === savedProd.id);
      if (idx >= 0) {
        const copy = [...list];
        copy[idx] = savedProd;
        return copy;
      }
      return [savedProd, ...list];
    });
    this.toast.success(`Producto "${savedProd.codigo}" guardado correctamente.`);
  }
}
