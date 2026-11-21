// src/app/features/catalogo/productos/productos-page.ts
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { LucideBan, LucideEye, LucidePackagePlus, LucidePencil } from '@lucide/angular';
import { ListarProductosParams, ProductosApi } from '@core/api/productos/productos-api';
import { CatalogoApi } from '@core/api/catalogo/catalogo-api';
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
import { ProductoDetalleDialog } from './producto-detalle-dialog';
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
    ProductoDetalleDialog,
    StockMinimoDialog,
    LucideEye,
    LucidePencil,
    LucidePackagePlus,
    LucideBan
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

      <div class="filter-bar data-panel">
      <div class="filter-inputs">
        <input
          type="search"
          class="search-input search-input--plain"
          placeholder="Código (ej. PRD-0001)"
          aria-label="Filtrar por código"
          [formControl]="codigoControl"
        />

        <select
          class="category-select"
          [formControl]="proveedorControl"
          aria-label="Filtrar por proveedor"
        >
          <option value="0">Todos los proveedores</option>
          @for (prv of catalogoLookup.proveedores(); track prv.id) {
            <option [value]="prv.id">{{ prv.razonSocial }}</option>
          }
        </select>

        <select
          class="category-select"
          [formControl]="unidadControl"
          aria-label="Filtrar por unidad de medida"
        >
          <option value="">Todas las unidades</option>
          @for (u of unidades; track u) {
            <option [value]="u">{{ u }}</option>
          }
        </select>

        <select
          class="category-select"
          [formControl]="estadoControl"
          aria-label="Filtrar por estado del producto"
        >
          <option value="">Activos e inactivos</option>
          <option value="true">Solo activos</option>
          <option value="false">Solo inactivos</option>
        </select>

        <select
          class="category-select"
          [formControl]="stockControl"
          aria-label="Filtrar por nivel de stock"
        >
          <option value="">Cualquier stock</option>
          <option value="true">Stock crítico</option>
          <option value="false">Stock normal</option>
        </select>
      </div>

      <div class="filter-actions">
        <app-button variant="outline" size="sm" (btnClick)="limpiarFiltros()">
          Limpiar filtros
        </app-button>
      </div>
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
      <table class="productos-table">
        <thead>
          <tr>
            <th>Código SKU</th>
            <th>Producto</th>
            <th>Categoría</th>
            <th class="text-right">Stock</th>
            <th>Estado del stock</th>
            <th>Estado</th>
            @if (isJefeTaller()) {
              <th class="text-right">Último costo</th>
            }
            <th class="action-cell">Acciones</th>
          </tr>
        </thead>
        <tbody>
          @if (loading() && productos().length === 0) {
            @for (s of [1, 2, 3, 4, 5]; track s) {
              <tr class="product-row">
                <td><div class="skeleton" style="width: 90px; height: 16px;"></div></td>
                <td><div class="skeleton" style="width: 180px; height: 16px;"></div></td>
                <td><div class="skeleton" style="width: 100px; height: 16px;"></div></td>
                <td class="text-right"><div class="skeleton" style="width: 40px; height: 16px; margin-left: auto;"></div></td>
                <td><div class="skeleton" style="width: 70px; height: 20px;"></div></td>
                <td><div class="skeleton" style="width: 60px; height: 20px;"></div></td>
                @if (isJefeTaller()) {
                  <td class="text-right"><div class="skeleton" style="width: 70px; height: 16px; margin-left: auto;"></div></td>
                }
                <td class="action-cell"><div class="skeleton" style="width: 36px; height: 36px; margin: 0 auto;"></div></td>
              </tr>
            }
          } @else if (productos().length === 0) {
            <tr>
              <td [attr.colspan]="isJefeTaller() ? 8 : 7">
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
              <tr class="product-row" [class.row-inactive]="!p.activo">
                <td class="cell-sku font-mono">
                  <strong>{{ p.codigo }}</strong>
                </td>

                <td>
                  <div class="cell-product">
                    <button
                      type="button"
                      class="name-link"
                      [title]="p.nombre"
                      [attr.aria-label]="'Ver detalle de ' + p.nombre"
                      (click)="openDetalleDialog(p)"
                    >
                      {{ p.nombre }}
                    </button>
                  </div>
                </td>

                <td>
                  <div
                    class="cell-truncate cell-category"
                    [title]="p.categoriaNombre || catalogoLookup.getNombreCategoria(p.categoriaId)"
                  >
                    {{ p.categoriaNombre || catalogoLookup.getNombreCategoria(p.categoriaId) }}
                  </div>
                </td>

                <td class="text-right">
                  <div class="stock-cell">
                    <span class="stock-cell__actual font-mono">{{ p.stockActual }}</span>
                    <span class="stock-cell__min font-mono">Mín. {{ p.stockMinimo }}</span>
                  </div>
                </td>

                <td>
                  <app-stock-estado-badge
                    [stockActual]="p.stockActual"
                    [stockMinimo]="p.stockMinimo"
                  />
                </td>

                <td>
                  @if (p.activo) {
                    <app-badge variant="neutral" size="sm">Activo</app-badge>
                  } @else {
                    <app-badge variant="danger" size="sm">Inactivo</app-badge>
                  }
                </td>

                @if (isJefeTaller()) {
                  <td class="text-right font-mono cell-cost">
                    {{ p.costoUltimaCompra | appCurrency }}
                  </td>
                }

                <td class="action-cell">
                  <div class="row-actions">
                    <button
                      type="button"
                      class="row-btn"
                      title="Ver detalle"
                      [attr.aria-label]="'Ver detalle de ' + p.nombre"
                      (click)="openDetalleDialog(p)"
                    >
                      <svg lucideEye [size]="17" aria-hidden="true"></svg>
                    </button>

                    @if (isJefeTaller()) {
                      <button
                        type="button"
                        class="row-btn"
                        title="Editar producto"
                        [attr.aria-label]="'Editar ' + p.nombre"
                        (click)="openEditDialog(p)"
                      >
                        <svg lucidePencil [size]="17" aria-hidden="true"></svg>
                      </button>

                      <button
                        type="button"
                        class="row-btn row-btn--success"
                        [title]="p.activo ? 'Actualizar stock (registrar entrada)' : 'No disponible: el producto está inactivo'"
                        [attr.aria-label]="'Actualizar stock de ' + p.nombre"
                        [disabled]="!p.activo"
                        (click)="goActualizarStock(p)"
                      >
                        <svg lucidePackagePlus [size]="17" aria-hidden="true"></svg>
                      </button>

                      <button
                        type="button"
                        class="row-btn row-btn--danger"
                        [title]="p.activo ? 'Desactivar producto' : 'El producto ya está inactivo'"
                        [attr.aria-label]="'Desactivar ' + p.nombre"
                        [disabled]="!p.activo"
                        (click)="confirmDesactivar(p)"
                      >
                        <svg lucideBan [size]="17" aria-hidden="true"></svg>
                      </button>
                    }
                  </div>
                </td>
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
    <app-producto-detalle-dialog
      [(isOpen)]="isDetalleOpen"
      [producto]="selectedProducto()"
      [showCompras]="isJefeTaller()"
      [canAdjustStockMinimo]="isJefeTaller()"
      (stockMinimoClick)="onDetalleStockMinimo()"
    />

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
      flex-wrap: wrap;
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

    .search-input--plain {
      width: auto;
      flex: 1 1 180px;
      padding-left: 14px;
    }

    .table-loading {
      opacity: 0.6;
      transition: opacity var(--duration-fast) var(--easing-out);
    }

    /* Tabla compacta: 8 columnas, filas de altura constante */
    .productos-table {
      min-width: 980px;
    }

    .productos-table th,
    .productos-table td {
      padding-left: 14px;
      padding-right: 14px;
    }

    .product-row {
      height: 68px;
    }

    .product-row td {
      padding-top: 8px;
      padding-bottom: 8px;
      vertical-align: middle;
      font-size: 13.5px;
    }

    .row-inactive td:not(.action-cell) {
      opacity: 0.65;
    }

    /* SKU: completo y en una sola línea */
    .cell-sku {
      white-space: nowrap;
    }

    /* Producto: nombre truncado + estado administrativo debajo */
    .cell-product {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      max-width: 280px;
      min-width: 0;
    }

    .name-link {
      display: block;
      max-width: 100%;
      padding: 0;
      border: none;
      background: none;
      font: inherit;
      font-weight: 600;
      color: var(--color-text-primary);
      text-align: left;
      cursor: pointer;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .name-link:hover {
      color: var(--color-blue-text);
      text-decoration: underline;
    }

    .name-link:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
      border-radius: var(--radius-sm);
    }

    .cell-truncate {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .cell-category {
      max-width: 180px;
    }

    /* Stock: actual (principal) + mínimo (secundario) */
    .stock-cell {
      display: inline-flex;
      flex-direction: column;
      align-items: flex-end;
      line-height: 1.25;
    }

    .stock-cell__actual {
      font-size: 15px;
      font-weight: 700;
      color: var(--color-text-primary);
      font-variant-numeric: tabular-nums;
    }

    .stock-cell__min {
      font-size: 11.5px;
      color: var(--color-text-muted);
      font-variant-numeric: tabular-nums;
    }

    .cell-cost {
      white-space: nowrap;
    }

    /* Acciones: 4 botones cuadrados de 36 px, separación de 8 px */
    .action-cell {
      white-space: nowrap;
      width: 200px;
      text-align: center;
    }

    .row-actions {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .row-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 36px;
      height: 36px;
      padding: 0;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background-color: var(--color-surface);
      color: var(--color-text-primary);
      cursor: pointer;
      transition: background-color var(--duration-fast) var(--easing-out),
                  color var(--duration-fast) var(--easing-out);
    }

    .row-btn svg {
      display: block;
    }

    .row-btn:hover:not(:disabled) {
      background-color: var(--color-surface-hover);
    }

    .row-btn:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }

    .row-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .row-btn--success {
      color: var(--color-success);
    }

    .row-btn--success:hover:not(:disabled) {
      background-color: var(--color-success-tint);
    }

    .row-btn--danger {
      color: var(--color-danger);
    }

    .row-btn--danger:hover:not(:disabled) {
      background-color: var(--color-danger-tint);
    }
  `]
})
export class ProductosPage implements OnInit {
  private readonly productosApi = inject(ProductosApi);
  private readonly catalogoApi = inject(CatalogoApi);
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
  readonly codigoControl = new FormControl('', { nonNullable: true });
  readonly proveedorControl = new FormControl('0', { nonNullable: true });
  readonly unidadControl = new FormControl('', { nonNullable: true });
  readonly estadoControl = new FormControl('', { nonNullable: true });   
  readonly stockControl = new FormControl('', { nonNullable: true });    
  readonly unidades = ['UNIDAD', 'CAJA', 'GALON', 'JUEGO', 'KIT', 'KILOGRAMO', 'LITRO', 'METRO', 'PAR'];

  readonly productos = signal<ProductoResponse[]>([]);
  readonly currentPage = signal<number>(0);
  readonly pageSize = signal<number>(10);
  readonly totalElements = signal<number>(0);
  readonly totalPages = signal<number>(0);
  readonly loading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Estados de modales
  readonly isDetalleOpen = signal<boolean>(false);
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
    // Solo el jefe puede consultar los listados de catálogo: se usan para llenar los selectores.
    if (this.isJefeTaller()) {
      this.catalogoApi.listarCategorias({ size: 100 }).subscribe({
        next: resp => this.catalogoLookup.registrarCategorias(resp.content),
        error: () => { /* los selectores usan lo que ya se conoce */ }
      });
      this.catalogoApi.listarProveedores({ size: 100 }).subscribe({
        next: resp => this.catalogoLookup.registrarProveedores(resp.content),
        error: () => { /* los selectores usan lo que ya se conoce */ }
      });
    }

    // Sincronizar query params iniciales
    this.route.queryParams.subscribe(params => {
      const page = params['page'] !== undefined ? parseInt(params['page'], 10) : 0;
      const size = params['size'] !== undefined ? parseInt(params['size'], 10) : 10;
      const nombre = params['nombre'] || '';
      const categoria = params['categoria'] !== undefined ? parseInt(params['categoria'], 10) : 0;
      const codigo = params['codigo'] || '';
      const proveedor = String(parseInt(params['proveedor'], 10) || 0);
      const unidadMedida = params['unidadMedida'] || '';
      const activo = params['activo'] === 'true' || params['activo'] === 'false' ? params['activo'] : '';
      const stockCritico = params['stockCritico'] === 'true' || params['stockCritico'] === 'false'
        ? params['stockCritico']
        : '';

      this.currentPage.set(page);
      this.pageSize.set(size);
      if (this.searchControl.value !== nombre) {
        this.searchControl.setValue(nombre, { emitEvent: false });
      }
      if (this.categoryControl.value !== categoria) {
        this.categoryControl.setValue(categoria, { emitEvent: false });
      }
      if (this.codigoControl.value !== codigo) {
        this.codigoControl.setValue(codigo, { emitEvent: false });
      }
      if (this.proveedorControl.value !== proveedor) {
        this.proveedorControl.setValue(proveedor, { emitEvent: false });
      }
      if (this.unidadControl.value !== unidadMedida) {
        this.unidadControl.setValue(unidadMedida, { emitEvent: false });
      }
      if (this.estadoControl.value !== activo) {
        this.estadoControl.setValue(activo, { emitEvent: false });
      }
      if (this.stockControl.value !== stockCritico) {
        this.stockControl.setValue(stockCritico, { emitEvent: false });
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

    // Filtro por código (texto, con debounce)
    this.codigoControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(text => {
      this.updateQueryParams({ codigo: text.trim() || null, page: 0 });
    });

    // Filtros por selección
    this.proveedorControl.valueChanges.pipe(distinctUntilChanged()).subscribe(id => {
      this.updateQueryParams({ proveedor: Number(id) > 0 ? id : null, page: 0 });
    });
    this.unidadControl.valueChanges.pipe(distinctUntilChanged()).subscribe(unidad => {
      this.updateQueryParams({ unidadMedida: unidad || null, page: 0 });
    });
    this.estadoControl.valueChanges.pipe(distinctUntilChanged()).subscribe(valor => {
      this.updateQueryParams({ activo: valor || null, page: 0 });
    });
    this.stockControl.valueChanges.pipe(distinctUntilChanged()).subscribe(valor => {
      this.updateQueryParams({ stockCritico: valor || null, page: 0 });
    });
  }

  loadProductos(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const proveedorId = Number(this.proveedorControl.value);

    const params: ListarProductosParams = {
      page: this.currentPage(),
      size: this.pageSize(),
      nombre: this.searchControl.value.trim() || undefined,
      categoria: this.categoryControl.value > 0 ? this.categoryControl.value : undefined,
      codigo: this.codigoControl.value.trim() || undefined,
      proveedor: proveedorId > 0 ? proveedorId : undefined,
      unidadMedida: this.unidadControl.value || undefined,
      activo: this.estadoControl.value === '' ? undefined : this.estadoControl.value === 'true',
      stockCritico: this.stockControl.value === '' ? undefined : this.stockControl.value === 'true'
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

  /** Quita todos los filtros (y vuelve a la primera página). */
  limpiarFiltros(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        nombre: null,
        categoria: null,
        codigo: null,
        proveedor: null,
        unidadMedida: null,
        activo: null,
        stockCritico: null,
        page: 0
      },
      queryParamsHandling: 'merge'
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

  openDetalleDialog(p: ProductoResponse): void {
    this.selectedProducto.set(p);
    this.isDetalleOpen.set(true);
  }

  openEditDialog(p: ProductoResponse): void {
    this.selectedProducto.set(p);
    this.isFormOpen.set(true);
  }

  /** El stock se modifica registrando un movimiento: se reutiliza el formulario de entrada existente. */
  goActualizarStock(p: ProductoResponse): void {
    this.router.navigate(['/operaciones/entrada'], {
      queryParams: { productoId: p.id },
      state: { producto: p }
    });
  }

  /** Desde el detalle (solo consulta) se deriva al formulario de stock mínimo ya existente. */
  onDetalleStockMinimo(): void {
    this.isDetalleOpen.set(false);
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
