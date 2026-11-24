// src/app/features/operaciones/ajuste/ajuste-form-page.ts
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductosApi } from '@core/api/productos/productos-api';
import { ProductoResponse } from '@core/api/productos/productos.models';
import { OperacionesApi } from '@core/api/operaciones/operaciones-api';
import { AjusteRequest, MovimientoResponse } from '@core/api/operaciones/operaciones.models';
import { ToastService } from '@core/notifications/toast-service';
import { parseApiError } from '@core/api/api-error';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { Field } from '@shared/ui/field/field';
import { Button } from '@shared/ui/button/button';
import { Badge } from '@shared/ui/badge/badge';

@Component({
  selector: 'app-ajuste-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, PageHeader, Field, Button, Badge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ajuste-form-page.html',
  styleUrl: './ajuste-form-page.css'
})
export class AjusteFormPage implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly productosApi = inject(ProductosApi);
  private readonly operacionesApi = inject(OperacionesApi);
  private readonly toast = inject(ToastService);

  readonly productos = signal<ProductoResponse[]>([]);
  readonly selectedProducto = signal<ProductoResponse | null>(null);

  readonly submitting = signal<boolean>(false);
  readonly errorAlert = signal<string | null>(null);
  readonly lastSuccess = signal<MovimientoResponse | null>(null);

  readonly form = this.fb.group({
    productoId: [0, [Validators.required, Validators.min(1)]],
    cantidadFisica: [0, [Validators.required, Validators.min(0)]],
    justificacion: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(255)]]
  });

  readonly variacionCalculada = computed(() => {
    const prod = this.selectedProducto();
    if (!prod) return 0;
    const fisica = this.form.controls.cantidadFisica.value;
    return fisica - prod.stockActual;
  });

  ngOnInit(): void {
    this.cargarProductos();
  }

  cargarProductos(): void {
    this.productosApi.listar({ page: 0, size: 100 }).subscribe({
      next: (resp) => {
        this.productos.set(resp.content.filter(p => p.activo));
      }
    });
  }

  onProductoChange(): void {
    const id = Number(this.form.controls.productoId.value);
    const prod = this.productos().find(p => p.id === id) || null;
    this.selectedProducto.set(prod);

    if (prod) {
      this.form.controls.cantidadFisica.setValue(prod.stockActual);
    }
  }

  onSubmit(): void {
    if (this.submitting()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorAlert.set(null);
    this.lastSuccess.set(null);

    const raw = this.form.getRawValue();
    const req: AjusteRequest = {
      productoId: Number(raw.productoId),
      cantidadFisica: Number(raw.cantidadFisica),
      justificacion: raw.justificacion.trim()
    };

    this.operacionesApi.registrarAjuste(req).subscribe({
      next: (resp) => {
        this.submitting.set(false);
        this.lastSuccess.set(resp);
        this.toast.success(`Ajuste de inventario registrado con éxito.`);
        this.form.reset({
          productoId: 0,
          cantidadFisica: 0,
          justificacion: ''
        });
        this.selectedProducto.set(null);
        this.cargarProductos();
      },
      error: (err) => {
        this.submitting.set(false);
        const apiErr = parseApiError(err);
        this.errorAlert.set(apiErr.message || 'Error al registrar el ajuste de stock.');
      }
    });
  }

  productoError(): string | null {
    const ctrl = this.form.controls.productoId;
    if (ctrl.touched && ctrl.value < 1) return 'Debes seleccionar un producto válido.';
    return null;
  }

  cantidadFisicaError(): string | null {
    const ctrl = this.form.controls.cantidadFisica;
    if (ctrl.touched && ctrl.invalid) {
      if (ctrl.errors?.['required']) return 'La cantidad física es obligatoria.';
      if (ctrl.errors?.['min']) return 'La cantidad física no puede ser negativa.';
    }
    return null;
  }

  justificacionError(): string | null {
    const ctrl = this.form.controls.justificacion;
    if (ctrl.touched && ctrl.invalid) {
      if (ctrl.errors?.['required']) return 'La justificación es obligatoria.';
      if (ctrl.errors?.['minlength']) return 'Mínimo 5 caracteres de explicación.';
      if (ctrl.errors?.['maxlength']) return 'Máximo 255 caracteres.';
    }
    return null;
  }
}
