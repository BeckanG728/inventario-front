// src/app/features/catalogo/productos/stock-minimo-dialog.ts
import { ChangeDetectionStrategy, Component, effect, inject, input, model, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductosApi } from '@core/api/productos/productos-api';
import { ProductoResponse } from '@core/api/productos/productos.models';
import { parseApiError } from '@core/api/api-error';
import { getFirstErrorMessage } from '@shared/forms/error-messages';
import { Modal } from '@shared/ui/modal/modal';
import { Field } from '@shared/ui/field/field';
import { Button } from '@shared/ui/button/button';

@Component({
  selector: 'app-stock-minimo-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, Modal, Field, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stock-minimo-dialog.html',
  styleUrl: './stock-minimo-dialog.css'
})
export class StockMinimoDialog {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly productosApi = inject(ProductosApi);

  readonly producto = input<ProductoResponse | null>(null);
  readonly isOpen = model<boolean>(false);
  readonly saved = output<ProductoResponse>();

  readonly submitting = signal<boolean>(false);
  readonly generalError = signal<string | null>(null);

  readonly form = this.fb.group({
    nuevoStockMinimo: [0, [Validators.required, Validators.min(0)]]
  });

  constructor() {
    effect(() => {
      const prod = this.producto();
      if (prod) {
        this.form.patchValue({
          nuevoStockMinimo: prod.stockMinimo
        });
      }
      this.generalError.set(null);
    });
  }

  get stockMinimoError(): () => string | null {
    return () => {
      const ctrl = this.form.controls.nuevoStockMinimo;
      return ctrl.touched ? getFirstErrorMessage(ctrl.errors) : null;
    };
  }

  onCancel(): void {
    this.isOpen.set(false);
  }

  onSubmit(): void {
    if (this.form.invalid || !this.producto()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.generalError.set(null);

    const prodId = this.producto()!.id;
    const { nuevoStockMinimo } = this.form.getRawValue();

    this.productosApi.actualizarStockMinimo(prodId, { nuevoStockMinimo }).subscribe({
      next: (resp) => {
        this.submitting.set(false);
        this.saved.emit(resp);
        this.isOpen.set(false);
      },
      error: (err) => {
        this.submitting.set(false);
        const apiErr = parseApiError(err);
        this.generalError.set(apiErr.message || 'Error al actualizar el stock mínimo.');
      }
    });
  }
}
