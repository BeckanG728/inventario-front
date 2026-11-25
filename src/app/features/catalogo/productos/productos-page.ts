// src/app/features/catalogo/productos/productos-page.ts
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { LucideBan, LucideEye, LucidePencil } from '@lucide/angular';
import { ListarProductosParams, ProductosApi } from '@core/api/productos/productos-api';
import { ProductoResponse } from '@core/api/productos/productos.models';
import { CatalogoLookup } from '@core/lookup/catalogo-lookup';
import { SessionStore } from '@core/auth/session-store';
import { ToastService } from '@core/notifications/toast-service';
import { parseApiError } from '@core/api/api-error';
import { CurrencyPipe } from '@shared/format/currency.pipe';
import { StockEstadoBadge } from '@shared/productos/stock-estado-badge';
import { PageHeader } from '@shared/ui/page-header/page-header';
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
    Button,
    Badge,
    Pagination,
    ConfirmDialog,
    ProductoFormDialog,
    ProductoDetalleDialog,
    StockMinimoDialog,
    LucideEye,
    LucidePencil,
    LucideBan
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './productos-page.html',
  styleUrl: './productos-page.css'
})
export class ProductosPage implements OnInit {
  private readonly productosApi = inject(ProductosApi);
  readonly catalogoLookup = inject(CatalogoLookup);
  private readonly session = inject(SessionStore);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly isJefeTaller = computed(() => this.session.role() === 'JEFE_TALLER');

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly categoryControl = new FormControl(0, { nonNullable: true });
  readonly unidadControl = new FormControl(0, { nonNullable: true });
  readonly estadoControl = new FormControl('', { nonNullable: true });
  /** Catálogo de unidades obtenido de GET /api/unidades (sin lista hardcodeada). */
  readonly unidades = computed(() => this.catalogoLookup.unidades());

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
    // Los selectores se llenan desde /api/{categorias,proveedores}/activos (accesibles a ambos roles).
    this.catalogoLookup.cargarFiltros().subscribe();

    // Sincronizar query params iniciales
    this.route.queryParams.subscribe(params => {
      const page = params['page'] !== undefined ? parseInt(params['page'], 10) : 0;
      const size = params['size'] !== undefined ? parseInt(params['size'], 10) : 10;
      const nombre = params['nombre'] || '';
      const categoria = params['categoria'] !== undefined ? parseInt(params['categoria'], 10) : 0;
      const unidadBaseId = params['unidadBaseId'] !== undefined ? parseInt(params['unidadBaseId'], 10) : 0;
      const activo = params['activo'] === 'true' || params['activo'] === 'false' ? params['activo'] : '';

      this.currentPage.set(page);
      this.pageSize.set(size);
      if (this.searchControl.value !== nombre) {
        this.searchControl.setValue(nombre, { emitEvent: false });
      }
      if (this.categoryControl.value !== categoria) {
        this.categoryControl.setValue(categoria, { emitEvent: false });
      }
      if (this.unidadControl.value !== unidadBaseId) {
        this.unidadControl.setValue(unidadBaseId, { emitEvent: false });
      }
      if (this.estadoControl.value !== activo) {
        this.estadoControl.setValue(activo, { emitEvent: false });
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

    // Filtros por selección
    this.unidadControl.valueChanges.pipe(distinctUntilChanged()).subscribe(unidad => {
      this.updateQueryParams({ unidadBaseId: unidad > 0 ? unidad : null, page: 0 });
    });
    this.estadoControl.valueChanges.pipe(distinctUntilChanged()).subscribe(valor => {
      this.updateQueryParams({ activo: valor || null, page: 0 });
    });
  }

  loadProductos(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const params: ListarProductosParams = {
      page: this.currentPage(),
      size: this.pageSize(),
      nombre: this.searchControl.value.trim() || undefined,
      categoria: this.categoryControl.value > 0 ? this.categoryControl.value : undefined,
      unidadBaseId: this.unidadControl.value > 0 ? this.unidadControl.value : undefined,
      activo: this.estadoControl.value === '' ? undefined : this.estadoControl.value === 'true'
    };

    this.productosApi.listar(params).subscribe({
      next: (resp) => {
        this.loading.set(false);
        this.productos.set(resp.content);
        this.totalElements.set(resp.totalElements);
        this.totalPages.set(resp.totalPages);
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
        unidadBaseId: null,
        activo: null,
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
