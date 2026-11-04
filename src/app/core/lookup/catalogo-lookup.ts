// src/app/core/lookup/catalogo-lookup.ts
import { computed, Injectable, signal } from '@angular/core';
import { CategoriaResponse, ProveedorResponse } from '../api/catalogo/catalogo.models';
import { ProductoResponse } from '../api/productos/productos.models';

const STORAGE_CAT_KEY = 'taller_catalogo_categorias';
const STORAGE_PRV_KEY = 'taller_catalogo_proveedores';

@Injectable({
  providedIn: 'root'
})
export class CatalogoLookup {
  private readonly _categorias = signal<CategoriaResponse[]>([]);
  private readonly _proveedores = signal<ProveedorResponse[]>([]);

  readonly categorias = this._categorias.asReadonly();
  readonly proveedores = this._proveedores.asReadonly();

  readonly categoriasMap = computed(() => {
    const map = new Map<number, string>();
    for (const c of this._categorias()) {
      map.set(c.id, c.nombre);
    }
    return map;
  });

  readonly proveedoresMap = computed(() => {
    const map = new Map<number, string>();
    for (const p of this._proveedores()) {
      map.set(p.id, p.razonSocial);
    }
    return map;
  });

  constructor() {
    this.hydrateFromStorage();
  }

  registrarCategoria(cat: CategoriaResponse): void {
    this._categorias.update(list => {
      const exists = list.some(c => c.id === cat.id);
      const updated = exists ? list.map(c => c.id === cat.id ? cat : c) : [...list, cat];
      this.saveToStorage(STORAGE_CAT_KEY, updated);
      return updated;
    });
  }

  registrarProveedor(prv: ProveedorResponse): void {
    this._proveedores.update(list => {
      const exists = list.some(p => p.id === prv.id);
      const updated = exists ? list.map(p => p.id === prv.id ? prv : p) : [...list, prv];
      this.saveToStorage(STORAGE_PRV_KEY, updated);
      return updated;
    });
  }

  extraerDeProductos(productos: ProductoResponse[]): void {
    if (!productos || productos.length === 0) return;

    // 1. Extraer categorías
    this._categorias.update(list => {
      let changed = false;
      const currentMap = new Map(list.map(c => [c.id, c]));

      for (const prod of productos) {
        const catId = prod.categoriaId ?? prod.idCategoria;
        if (catId && !currentMap.has(catId)) {
          currentMap.set(catId, {
            id: catId,
            nombre: prod.categoriaNombre || `Categoría #${catId}`,
            activo: true
          });
          changed = true;
        }
      }

      if (changed) {
        const result = Array.from(currentMap.values());
        this.saveToStorage(STORAGE_CAT_KEY, result);
        return result;
      }
      return list;
    });

    // 2. Extraer proveedores
    this._proveedores.update(list => {
      let changed = false;
      const currentMap = new Map(list.map(p => [p.id, p]));

      for (const prod of productos) {
        const prvId = prod.proveedorId ?? prod.idProveedor;
        if (prvId && !currentMap.has(prvId)) {
          currentMap.set(prvId, {
            id: prvId,
            ruc: '',
            razonSocial: prod.proveedorRazonSocial || `Proveedor #${prvId}`,
            activo: true
          });
          changed = true;
        }
      }

      if (changed) {
        const result = Array.from(currentMap.values());
        this.saveToStorage(STORAGE_PRV_KEY, result);
        return result;
      }
      return list;
    });
  }

  extraerCategoriasDeProductos(productos: ProductoResponse[]): void {
    this.extraerDeProductos(productos);
  }

  getNombreCategoria(idCategoria: number | null | undefined): string {
    if (!idCategoria) return '—';
    return this.categoriasMap().get(idCategoria) || `Categoría #${idCategoria}`;
  }

  getNombreProveedor(idProveedor: number | null | undefined): string {
    if (!idProveedor) return '—';
    return this.proveedoresMap().get(idProveedor) || `Proveedor #${idProveedor}`;
  }

  private saveToStorage(key: string, data: unknown): void {
    try {
      sessionStorage.setItem(key, JSON.stringify(data));
    } catch {
      // Ignorar
    }
  }

  private hydrateFromStorage(): void {
    try {
      const catData = sessionStorage.getItem(STORAGE_CAT_KEY);
      if (catData) {
        this._categorias.set(JSON.parse(catData));
      }
      const prvData = sessionStorage.getItem(STORAGE_PRV_KEY);
      if (prvData) {
        this._proveedores.set(JSON.parse(prvData));
      }
    } catch {
      // Ignorar
    }
  }
}
