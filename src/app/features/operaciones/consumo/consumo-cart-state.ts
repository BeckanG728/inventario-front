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
  unidadMedida: string;
  stockActual: number;
  stockMinimo: number;
  categoriaNombre: string;
  vecesConsumido?: number;
}

export interface ConsumoCartItem {
  producto: ProductoSelector;
  cantidad: number;
}

@Injectable()
export class ConsumoCartState {
  private readonly _items = signal<ConsumoCartItem[]>([]);

  readonly items = this._items.asReadonly();

  readonly totalLines = computed(() => this._items().length);

  readonly totalUnits = computed(() =>
    this._items().reduce((acc, curr) => acc + curr.cantidad, 0)
  );

  readonly hasItems = computed(() => this.totalLines() > 0);

  readonly hasAnyStockExceeded = computed(() =>
    this._items().some(item => item.cantidad > item.producto.stockActual)
  );

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
      return [...current, { producto, cantidad }];
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

  removeItem(productoId: number): void {
    this._items.update(current => current.filter(i => i.producto.productoId !== productoId));
  }

  clear(): void {
    this._items.set([]);
  }
}
