// src/app/features/catalogo/categorias/categoria-form-page.ts
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CatalogoApi } from '@core/api/catalogo/catalogo-api';
import { CatalogoLookup } from '@core/lookup/catalogo-lookup';
import { ToastService } from '@core/notifications/toast-service';
import { parseApiError } from '@core/api/api-error';
import { getFirstErrorMessage } from '@shared/forms/error-messages';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { PillNav, PillNavItem } from '@shared/ui/pill-nav/pill-nav';
import { Field } from '@shared/ui/field/field';
import { Button } from '@shared/ui/button/button';

@Component({
  selector: 'app-categoria-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, PageHeader, PillNav, Field, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="Categorías de productos"
      subtitle="Registro de familias y clasificaciones de repuestos para el taller"
    />

    <app-pill-nav [items]="navItems" ariaLabel="Secciones de catálogo" />

    <div class="category-layout">
      <div class="data-panel form-card">
        <div class="panel-head">
          <h2>Registrar nueva categoría</h2>
          <span class="panel-meta">Catálogo</span>
        </div>

        @if (generalError()) {
          <div class="inline-alert inline-alert--error form-alert" role="alert">
            <span>{{ generalError() }}</span>
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
          <app-field
            label="Nombre de la categoría"
            forId="nombre"
            [required]="true"
            hint="De 3 a 50 caracteres (ej. Frenos, Motor, Suspensión, Eléctrico)"
            [error]="nombreError()"
          >
            <input
              id="nombre"
              type="text"
              formControlName="nombre"
              autocomplete="off"
              placeholder="Ej. Sistema de Frenos"
              [attr.aria-invalid]="!!nombreError()"
            />
          </app-field>

          <div class="form-actions">
            <app-button
              type="submit"
              variant="primary"
              size="lg"
              [loading]="submitting()"
            >
              Registrar categoría
            </app-button>
          </div>
        </form>
      </div>

      <!-- Categorías conocidas en la sesión -->
      <div class="data-panel list-card">
        <div class="panel-head">
          <h3>Categorías activas</h3>
          <span class="panel-meta font-mono">{{ catalogoLookup.categorias().length }} registradas</span>
        </div>

        @if (catalogoLookup.categorias().length === 0) {
          <div class="empty-state">
            <p class="empty-state__description">
              No se han registrado categorías en esta sesión. Los productos que crees se agruparán bajo las nuevas que registres.
            </p>
          </div>
        } @else {
          <div class="category-list">
            @for (cat of catalogoLookup.categorias(); track cat.id) {
              <div class="data-row">
                <span class="label">{{ cat.nombre }}</span>
                <span class="value font-mono">ID: {{ cat.id }}</span>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .category-layout {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-6);
      max-width: 960px;
    }

    @media (min-width: 768px) {
      .category-layout {
        grid-template-columns: 3fr 2fr;
      }
    }

    .form-card {
      display: flex;
      flex-direction: column;
    }

    .form-alert {
      margin-bottom: var(--space-4);
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: var(--space-4);
      padding-top: var(--space-4);
      border-top: 1px solid var(--color-border-soft);
    }

    .list-card {
      height: fit-content;
    }

    .category-list {
      display: flex;
      flex-direction: column;
    }
  `]
})
export class CategoriaFormPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly catalogoApi = inject(CatalogoApi);
  readonly catalogoLookup = inject(CatalogoLookup);
  private readonly toast = inject(ToastService);

  readonly navItems: PillNavItem[] = [
    { label: 'Productos', route: '/catalogo/productos' },
    { label: 'Categorías', route: '/catalogo/categorias' },
    { label: 'Proveedores', route: '/catalogo/proveedores' }
  ];

  readonly submitting = signal<boolean>(false);
  readonly generalError = signal<string | null>(null);

  readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50), Validators.pattern(/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_ -]{3,50}$/)]]
  });

  get nombreError(): () => string | null {
    return () => {
      const ctrl = this.form.controls.nombre;
      return ctrl.touched ? getFirstErrorMessage(ctrl.errors) : null;
    };
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.generalError.set(null);

    const { nombre } = this.form.getRawValue();

    this.catalogoApi.crearCategoria({ nombre: nombre.trim() }).subscribe({
      next: (resp) => {
        this.submitting.set(false);
        this.catalogoLookup.registrarCategoria(resp);
        this.toast.success(`Categoría "${resp.nombre}" registrada correctamente.`);
        this.form.reset({ nombre: '' });
      },
      error: (err) => {
        this.submitting.set(false);
        const apiErr = parseApiError(err);

        if (apiErr.status === 409) {
          this.form.controls.nombre.setErrors({ server: 'Ya existe una categoría registrada con ese nombre.' });
          return;
        }

        this.generalError.set(apiErr.message || 'Error al registrar la categoría.');
      }
    });
  }
}
