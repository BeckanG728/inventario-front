// src/app/features/operaciones/consumo/consumo-cart-state.ts
import { computed, Injectable, signal } from '@angular/core';

/**
 * Modelo interno único del selector de productos de consumo.
 * Normaliza `productoId` (frecuentes) e `id` (búsqueda de /api/productos).
 */
export interface ProductoSelector {
  productoId: number;
  codigo: string;
  nombre: string;
  stockActual: number;
  stockMinimo: number;
  categoriaNombre: string;
  vecesConsumido?: number;
  unidadBaseCodigo?: string | null;
  unidadPresentacionCodigo?: string | null;
  factorPresentacion?: number | null;
}

export interface ConsumoCartItem {
  producto: ProductoSelector;
  cantidad: number;
  unidadRegistro: string;
  cantidadExacta: number;
}

@Injectable()
export class ConsumoCartState {
  private readonly _items = signal<ConsumoCartItem[]>([]);

  readonly items = this._items.asReadonly();

  readonly totalLines = computed(() => this._items().length);

  readonly totalUnits = computed(() =>
    this._items().reduce((acc, curr) => acc + this.cantidadEnBase(curr), 0)
  );

  readonly hasItems = computed(() => this.totalLines() > 0);

  readonly hasAnyStockExceeded = computed(() => {
    const totales = new Map<number, number>();
    for (const item of this._items()) {
      const base = this.cantidadEnBase(item);
      totales.set(item.producto.productoId, (totales.get(item.producto.productoId) ?? 0) + base);
    }
    return this._items().some(item =>
      (totales.get(item.producto.productoId) ?? 0) > item.producto.stockActual
    );
  });

  /** Cantidad convertida a unidad base (cajas y rollos se multiplican por su factor). */
  cantidadEnBase(item: ConsumoCartItem): number {
    const factorAplica = item.unidadRegistro === item.producto.unidadPresentacionCodigo;
    const factor = factorAplica ? (item.producto.factorPresentacion ?? 1) : 1;
    const exacta = item.cantidadExacta > 0 ? item.cantidadExacta * factor : item.cantidad * factor;
    return exacta;
  }

  addItem(producto: ProductoSelector, cantidad = 1): void {
    if (cantidad <= 0) return;

    this._items.update(current => {
      const index = current.findIndex(i => i.producto.productoId === producto.productoId);
      if (index >= 0) {
        const copy = [...current];
        copy[index] = {
          ...copy[index],
          cantidad: copy[index].cantidad + cantidad
        };
        return copy;
      }
      const base = producto.unidadBaseCodigo || '';
      return [...current, { producto, cantidad, unidadRegistro: base, cantidadExacta: 0 }];
    });
  }

  updateQuantity(productoId: number, nuevaCantidad: number): void {
    if (nuevaCantidad <= 0) {
      this.removeItem(productoId);
      return;
    }

    this._items.update(current =>
      current.map(i =>
        i.producto.productoId === productoId ? { ...i, cantidad: nuevaCantidad } : i
      )
    );
  }

  updateUnidad(productoId: number, unidadRegistro: string): void {
    this._items.update(current =>
      current.map(i =>
        i.producto.productoId === productoId
          ? { ...i, unidadRegistro, cantidadExacta: 0 }
          : i
      )
    );
  }

  updateCantidadExacta(productoId: number, cantidadExacta: number): void {
    this._items.update(current =>
      current.map(i =>
        i.producto.productoId === productoId ? { ...i, cantidadExacta } : i
      )
    );
  }

  unidadesDeRegistro(item: ConsumoCartItem): string[] {
    const base = item.producto.unidadBaseCodigo;
    const presentacion = item.producto.unidadPresentacionCodigo;
    if (presentacion && base && presentacion !== base) {
      return [base, presentacion];
    }
    return base ? [base] : [];
  }

  esLongitud(item: ConsumoCartItem): boolean {
    const u = item.unidadRegistro;
    return u === 'METRO' || u === 'ROLLO';
  }

  removeItem(productoId: number): void {
    this._items.update(current => current.filter(i => i.producto.productoId !== productoId));
  }

  clear(): void {
    this._items.set([]);
  }
}
