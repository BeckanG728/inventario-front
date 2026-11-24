// src/app/features/inventario/existencias/existencias-page.ts
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { ConsultarExistenciasParams, InventarioApi } from '@core/api/inventario/inventario-api';
import { EstadoStock, ExistenciaConsultaResponse } from '@core/api/inventario/inventario.models';
import { ProductoResponse } from '@core/api/productos/productos.models';
import { CatalogoLookup } from '@core/lookup/catalogo-lookup';
import { SessionStore } from '@core/auth/session-store';
import { parseApiError } from '@core/api/api-error';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { Button } from '@shared/ui/button/button';
import { Pagination } from '@shared/ui/pagination/pagination';
import { StockEstadoBadge } from '@shared/productos/stock-estado-badge';
import { ProductoDetalleDialog } from '@features/catalogo/productos/producto-detalle-dialog';

type EstadoFiltro = EstadoStock | 'TODOS';

interface OpcionEstado {
  value: EstadoFiltro;
  label: string;
}

@Component({
  selector: 'app-existencias-page',
  standalone: true,
  imports: [
    FormsModule,
    PageHeader,
    Button,
    Pagination,
    StockEstadoBadge,
    ProductoDetalleDialog
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './existencias-page.html',
  styleUrl: './existencias-page.css'
})
export class ExistenciasPage implements OnInit {
  private readonly inventarioApi = inject(InventarioApi);
  private readonly session = inject(SessionStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  readonly catalogoLookup = inject(CatalogoLookup);

  readonly estados: OpcionEstado[] = [
    { value: 'TODOS', label: 'Todos los niveles' },
    { value: 'SIN_STOCK', label: 'Sin stock' },
    { value: 'BAJO', label: 'Bajo stock' },
    { value: 'NORMAL', label: 'Normal' }
  ];

  readonly filtroNombre = signal('');
  readonly categoriaFiltro = signal(0);
  readonly proveedorFiltro = signal(0);
  readonly estadoFiltro = signal<EstadoFiltro>('TODOS');
  readonly page = signal(0);
  readonly size = signal(10);

  readonly productos = signal<ExistenciaConsultaResponse[]>([]);
  readonly totalElements = signal(0);
  readonly totalPages = signal(0);
  readonly cargando = signal(false);
  readonly errorMensaje = signal('');

  readonly esJefeTaller = computed(() => this.session.role() === 'JEFE_TALLER');
  readonly isDetalleOpen = signal(false);
  readonly selectedProducto = signal<ProductoResponse | null>(null);

  private readonly busqueda$ = new Subject<string>();

  constructor() {
    this.busqueda$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => {
        this.page.set(0);
        this.cargar();
      });
  }

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    this.filtroNombre.set(q.get('nombre') || '');
    this.categoriaFiltro.set(Number(q.get('categoria')) || 0);
    this.proveedorFiltro.set(Number(q.get('proveedor')) || 0);
    const estado = q.get('estado') as EstadoFiltro | null;
    if (estado && this.estados.some(op => op.value === estado)) {
      this.estadoFiltro.set(estado);
    }
    this.page.set(Number(q.get('page')) || 0);
    this.size.set(Number(q.get('size')) || 10);

    // Los selects de categoría/proveedor necesitan el catálogo completo.
    this.catalogoLookup.cargarFiltros().subscribe();
    this.cargar();
  }

  onNombreChange(value: string): void {
    this.filtroNombre.set(value);
    this.busqueda$.next(value);
  }

  onFiltroChange(): void {
    this.page.set(0);
    this.cargar();
  }

  onCategoriaChange(value: unknown): void {
    this.categoriaFiltro.set(Number(value) || 0);
    this.onFiltroChange();
  }

  onProveedorChange(value: unknown): void {
    this.proveedorFiltro.set(Number(value) || 0);
    this.onFiltroChange();
  }

  onEstadoChange(value: unknown): void {
    const estado = value as EstadoFiltro;
    if (this.estados.some(op => op.value === estado)) {
      this.estadoFiltro.set(estado);
      this.onFiltroChange();
    }
  }

  limpiarFiltros(): void {
    this.filtroNombre.set('');
    this.categoriaFiltro.set(0);
    this.proveedorFiltro.set(0);
    this.estadoFiltro.set('TODOS');
    this.page.set(0);
    this.cargar();
  }

  onPageChange(nuevaPagina: number): void {
    this.page.set(nuevaPagina);
    this.cargar();
  }

  abrirDetalle(producto: ExistenciaConsultaResponse): void {
    this.selectedProducto.set(producto);
    this.isDetalleOpen.set(true);
  }

  registrarEntrada(producto: ExistenciaConsultaResponse): void {
    this.router.navigate(['/operaciones/entrada'], {
      queryParams: { productoId: producto.id },
      state: { producto }
    });
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorMensaje.set('');

    const estado = this.estadoFiltro();
    const params: ConsultarExistenciasParams = {
      page: this.page(),
      size: this.size(),
      nombre: this.filtroNombre().trim() || undefined,
      categoria: this.categoriaFiltro() || undefined,
      proveedorId: this.proveedorFiltro() || undefined,
      estadoStock: estado === 'TODOS' ? undefined : estado
    };

    const url = this.router.createUrlTree([], {
      relativeTo: this.route,
      queryParams: {
        nombre: params.nombre || null,
        categoria: params.categoria || null,
        proveedor: params.proveedorId || null,
        estado: estado === 'TODOS' ? null : estado,
        page: params.page,
        size: params.size
      }
    });
    this.location.replaceState(url.toString());

    this.inventarioApi.consultar(params).subscribe({
      next: res => {
        this.productos.set(res.content);
        this.totalElements.set(res.totalElements);
        this.totalPages.set(res.totalPages);
        this.cargando.set(false);
      },
      error: err => {
        this.errorMensaje.set(parseApiError(err).message);
        this.productos.set([]);
        this.totalElements.set(0);
        this.totalPages.set(0);
        this.cargando.set(false);
      }
    });
  }
}
