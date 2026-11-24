// src/app/core/lookup/catalogo-lookup.ts
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, shareReplay, tap } from 'rxjs';
import { CatalogoApi } from '../api/catalogo/catalogo-api';
import { CategoriaResponse, ProveedorResponse } from '../api/catalogo/catalogo.models';

/**
 * Catálogo de categorías y proveedores en memoria.
 * La fuente son los endpoints `/api/{categorias,proveedores}/activos` (CATALOGO_ENDPOINTS §4.4):
 * listas ligeras, sin paginar, de solo registros activos, disponibles para JEFE_TALLER y MECANICO.
 * No se persiste en almacenamiento local ni se deriva de los productos.
 */
@Injectable({ providedIn: 'root' })
export class CatalogoLookup {
  private readonly catalogoApi = inject(CatalogoApi);

  private readonly _categorias = signal<CategoriaResponse[]>([]);
  private readonly _proveedores = signal<ProveedorResponse[]>([]);
  private filtros$: Observable<void> | null = null;

  readonly categorias = this._categorias.asReadonly();
  readonly proveedores = this._proveedores.asReadonly();

  readonly categoriasMap = computed(() => new Map(this._categorias().map(c => [c.id, c.nombre] as const)));
  readonly proveedoresMap = computed(() => new Map(this._proveedores().map(p => [p.id, p.razonSocial] as const)));

  /** Carga una vez por sesión ambas listas completas desde el backend. */
  cargarFiltros(): Observable<void> {
    if (!this.filtros$) {
      this.filtros$ = forkJoin({
        categorias: this.catalogoApi.listarCategoriasActivas(),
        proveedores: this.catalogoApi.listarProveedoresActivos()
      }).pipe(
        tap(({ categorias, proveedores }) => {
          this._categorias.set(categorias);
          this._proveedores.set(proveedores);
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

  getNombreCategoria(idCategoria: number | null | undefined): string {
    if (!idCategoria) return '—';
    return this.categoriasMap().get(idCategoria) || `Categoría #${idCategoria}`;
  }

  getNombreProveedor(idProveedor: number | null | undefined): string {
    if (!idProveedor) return '—';
    return this.proveedoresMap().get(idProveedor) || `Proveedor #${idProveedor}`;
  }
}
