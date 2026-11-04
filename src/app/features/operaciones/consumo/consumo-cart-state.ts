// src/app/features/operaciones/consumo/consumo-cart-state.ts
import { computed, Injectable, signal } from '@angular/core';
import { ProductoResponse } from '@core/api/productos/productos.models';

export interface ConsumoCartItem {
  producto: ProductoResponse;
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

  addItem(producto: ProductoResponse, cantidad = 1): void {
    if (cantidad <= 0) return;

    this._items.update(current => {
      const index = current.findIndex(i => i.producto.id === producto.id);
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
        i.producto.id === productoId ? { ...i, cantidad: nuevaCantidad } : i
      )
    );
  }

  removeItem(productoId: number): void {
    this._items.update(current => current.filter(i => i.producto.id !== productoId));
  }

  clear(): void {
    this._items.set([]);
  }
}
