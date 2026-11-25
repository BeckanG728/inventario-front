// src/app/core/lookup/catalogo-lookup.ts
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, shareReplay, tap } from 'rxjs';
import { CatalogoApi } from '../api/catalogo/catalogo-api';
import { CategoriaResponse, ProveedorResponse } from '../api/catalogo/catalogo.models';
import { UnidadesApi } from '../api/unidades/unidades-api';
import { UnidadResponse } from '../api/unidades/unidades.models';

/**
 * Catálogo de categorías y proveedores en memoria.
 * La fuente son los endpoints `/api/{categorias,proveedores}/activos` (CATALOGO_ENDPOINTS §4.4):
 * listas ligeras, sin paginar, de solo registros activos, disponibles para JEFE_TALLER y MECANICO.
 * No se persiste en almacenamiento local ni se deriva de los productos.
 */
@Injectable({ providedIn: 'root' })
export class CatalogoLookup {
  private readonly catalogoApi = inject(CatalogoApi);
  private readonly unidadesApi = inject(UnidadesApi);

  private readonly _categorias = signal<CategoriaResponse[]>([]);
  private readonly _proveedores = signal<ProveedorResponse[]>([]);
  private readonly _unidades = signal<UnidadResponse[]>([]);
  private readonly _unidadesPorCategoria = signal<Map<number, UnidadResponse[]>>(new Map());
  private filtros$: Observable<void> | null = null;

  readonly categorias = this._categorias.asReadonly();
  readonly proveedores = this._proveedores.asReadonly();
  readonly unidades = this._unidades.asReadonly();

  readonly categoriasMap = computed(() => new Map(this._categorias().map(c => [c.id, c.nombre] as const)));
  readonly proveedoresMap = computed(() => new Map(this._proveedores().map(p => [p.id, p.razonSocial] as const)));

  /** Carga una vez por sesión ambas listas completas desde el backend. */
  cargarFiltros(): Observable<void> {
    if (!this.filtros$) {
      this.filtros$ = forkJoin({
        categorias: this.catalogoApi.listarCategoriasActivas(),
        proveedores: this.catalogoApi.listarProveedoresActivos(),
        unidades: this.unidadesApi.listar()
      }).pipe(
        tap(({ categorias, proveedores, unidades }) => {
          this._categorias.set(categorias);
          this._proveedores.set(proveedores);
          this._unidades.set(unidades);
        }),
        map(() => void 0),
        // Si falla, se conservan solo los datos ya cargados en memoria.
        catchError(() => of(void 0)),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.filtros$;
  }

  /** Invalida la caché en memoria y vuelve a consultar el backend. */
  recargarFiltros(): Observable<void> {
    this.filtros$ = null;
    return this.cargarFiltros();
  }

  registrarCategoria(categoria: CategoriaResponse): void {
    this._categorias.update(lista => lista.some(c => c.id === categoria.id)
      ? lista.map(c => (c.id === categoria.id ? categoria : c))
      : [...lista, categoria]);
  }

  registrarCategorias(categorias: CategoriaResponse[]): void {
    if (categorias.length === 0) return;
    this._categorias.update(lista => {
      const mapa = new Map(lista.map(c => [c.id, c]));
      for (const categoria of categorias) mapa.set(categoria.id, categoria);
      return Array.from(mapa.values());
    });
  }

  registrarProveedor(proveedor: ProveedorResponse): void {
    this._proveedores.update(lista => lista.some(p => p.id === proveedor.id)
      ? lista.map(p => (p.id === proveedor.id ? proveedor : p))
      : [...lista, proveedor]);
  }

  registrarProveedores(proveedores: ProveedorResponse[]): void {
    if (proveedores.length === 0) return;
    this._proveedores.update(lista => {
      const mapa = new Map(lista.map(p => [p.id, p]));
      for (const proveedor of proveedores) mapa.set(proveedor.id, proveedor);
      return Array.from(mapa.values());
    });
  }

  /** Carga (y cachea) las unidades válidas para una categoría; alimenta el combobox del producto. */
  cargarUnidadesPorCategoria(categoriaId: number): Observable<UnidadResponse[]> {
    if (categoriaId <= 0) {
      return of([]);
    }
    const cache = this._unidadesPorCategoria();
    if (cache.has(categoriaId)) {
      return of(cache.get(categoriaId)!);
    }
    return this.unidadesApi.listarPorCategoria(categoriaId).pipe(
      tap(unidades => {
        const nuevo = new Map(this._unidadesPorCategoria());
        nuevo.set(categoriaId, unidades);
        this._unidadesPorCategoria.set(nuevo);
      }),
      catchError(() => of([]))
    );
  }

  unidadesDe(categoriaId: number): UnidadResponse[] {
    return this._unidadesPorCategoria().get(categoriaId) ?? [];
  }

  unidadPorCodigo(codigo: string | null | undefined): UnidadResponse | undefined {
    if (!codigo) return undefined;
    return this._unidades().find(u => u.codigo === codigo);
  }

  permiteFragmentacion(codigo: string | null | undefined): boolean {
    return this.unidadPorCodigo(codigo)?.permiteFragmentacion ?? false;
  }

  getNombreCategoria(idCategoria: number | null | undefined): string {
    if (!idCategoria) return '—';
    return this.categoriasMap().get(idCategoria) || `Categoría #${idCategoria}`;
  }

  getNombreProveedor(idProveedor: number | null | undefined): string {
    if (!idProveedor) return '—';
    return this.proveedoresMap().get(idProveedor) || `Proveedor #${idProveedor}`;
  }
}
