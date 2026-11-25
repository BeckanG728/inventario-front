// src/app/features/catalogo/categorias/categoria-form-dialog.ts
import { ChangeDetectionStrategy, Component, effect, inject, model, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CatalogoApi } from '@core/api/catalogo/catalogo-api';
import { CategoriaResponse } from '@core/api/catalogo/catalogo.models';
import { CatalogoLookup } from '@core/lookup/catalogo-lookup';
import { ToastService } from '@core/notifications/toast-service';
import { parseApiError } from '@core/api/api-error';
import { getFirstErrorMessage } from '@shared/forms/error-messages';
import { Modal } from '@shared/ui/modal/modal';
import { Field } from '@shared/ui/field/field';
import { Button } from '@shared/ui/button/button';

@Component({
  selector: 'app-categoria-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, Modal, Field, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './categoria-form-dialog.html',
  styleUrl: './categoria-form-dialog.css'
})
export class CategoriaFormDialog {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly catalogoApi = inject(CatalogoApi);
  private readonly catalogoLookup = inject(CatalogoLookup);
  private readonly toast = inject(ToastService);

  readonly isOpen = model<boolean>(false);
  readonly saved = output<CategoriaResponse>();

  readonly submitting = signal<boolean>(false);
  readonly generalError = signal<string | null>(null);

  readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50), Validators.pattern(/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_ -]{3,50}$/)]]
  });

  constructor() {
    // Cada vez que se abre el modal el formulario arranca limpio.
    effect(() => {
      if (this.isOpen()) {
        this.form.reset({ nombre: '' });
        this.generalError.set(null);
      }
    });
  }

  get nombreError(): () => string | null {
    return () => {
      const ctrl = this.form.controls.nombre;
      return ctrl.touched ? getFirstErrorMessage(ctrl.errors) : null;
    };
  }

  onCancel(): void {
    this.isOpen.set(false);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.generalError.set(null);

    const { nombre } = this.form.getRawValue();

    // Las unidades válidas vienen de la semilla de negocio de V10; el backend asigna UND por defecto.
    this.catalogoApi.crearCategoria({ nombre: nombre.trim() }).subscribe({
      next: (resp) => {
        this.submitting.set(false);
        this.catalogoLookup.registrarCategoria(resp);
        this.toast.success(`Categoría "${resp.nombre}" registrada correctamente.`);
        this.saved.emit(resp);
        this.isOpen.set(false);
      },
      error: (err) => {
        this.submitting.set(false);
        const apiErr = parseApiError(err);
        if (apiErr.status === 409) {
          this.form.controls.nombre.setErrors({ server: 'Ya existe una categoría registrada con ese nombre.' });
          this.form.controls.nombre.markAsTouched();
          return;
        }
        this.generalError.set(apiErr.message || 'Error al registrar la categoría.');
      }
    });
  }
}
