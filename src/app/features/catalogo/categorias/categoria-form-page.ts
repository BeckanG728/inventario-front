// src/app/features/catalogo/categorias/categoria-form-page.ts
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { CatalogoApi } from '@core/api/catalogo/catalogo-api';
import { CategoriaResponse } from '@core/api/catalogo/catalogo.models';
import { CatalogoLookup } from '@core/lookup/catalogo-lookup';
import { ToastService } from '@core/notifications/toast-service';
import { parseApiError } from '@core/api/api-error';
import { getFirstErrorMessage } from '@shared/forms/error-messages';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { PillNav, PillNavItem } from '@shared/ui/pill-nav/pill-nav';
import { Field } from '@shared/ui/field/field';
import { Button } from '@shared/ui/button/button';
import { Badge } from '@shared/ui/badge/badge';
import { Pagination } from '@shared/ui/pagination/pagination';

@Component({
  selector: 'app-categoria-form-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    PageHeader,
    PillNav,
    Field,
    Button,
    Badge,
    Pagination
  ],
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

      <!-- Listado paginado (viene del servidor) -->
      <div class="data-panel list-card">
        <div class="panel-head">
          <h3>Categorías registradas</h3>
          <span class="panel-meta font-mono">{{ totalElements() }} en total</span>
        </div>

        <div class="list-filters">
          <input
            type="search"
            class="list-input"
            placeholder="Buscar por nombre..."
            aria-label="Buscar categorías por nombre"
            [formControl]="searchControl"
          />
          <select class="list-select" [formControl]="estadoControl" aria-label="Filtrar por estado">
            <option value="">Todas</option>
            <option value="true">Solo activas</option>
            <option value="false">Solo inactivas</option>
          </select>
        </div>

        @if (listError()) {
          <div class="inline-alert inline-alert--error list-alert" role="alert">
            <span>{{ listError() }}</span>
            <app-button variant="secondary" size="sm" (btnClick)="cargar()">Reintentar</app-button>
          </div>
        }

        <div class="table-wrapper" [class.table-loading]="loading() && categorias().length > 0">
          <table class="data-table" aria-label="Categorías registradas">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Descripción</th>
                <th class="text-right">ID</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              @if (loading() && categorias().length === 0) {
                @for (s of [1, 2, 3, 4, 5]; track s) {
                  <tr>
                    <td><div class="skeleton" style="width: 140px; height: 16px;"></div></td>
                    <td><div class="skeleton" style="width: 180px; height: 16px;"></div></td>
                    <td class="text-right"><div class="skeleton" style="width: 30px; height: 16px; margin-left: auto;"></div></td>
                    <td><div class="skeleton" style="width: 60px; height: 20px;"></div></td>
                  </tr>
                }
              } @else if (categorias().length === 0) {
                <tr>
                  <td colspan="4">
                    <div class="empty-state">
                      <p class="empty-state__description">
                        No se encontraron categorías con los filtros seleccionados.
                      </p>
                    </div>
                  </td>
                </tr>
              } @else {
                @for (cat of categorias(); track cat.id) {
                  <tr [class.row-inactive]="!cat.activo">
                    <td>{{ cat.nombre }}</td>
                    <td class="cell-desc">{{ cat.descripcion || '—' }}</td>
                    <td class="text-right font-mono">{{ cat.id }}</td>
                    <td>
                      <app-badge [variant]="cat.activo ? 'neutral' : 'danger'" size="sm">
                        {{ cat.activo ? 'Activa' : 'Inactiva' }}
                      </app-badge>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        <app-pagination
          [page]="currentPage()"
          [size]="pageSize()"
          [totalElements]="totalElements()"
          [totalPages]="totalPages()"
          (pageChange)="onPageChange($event)"
        />
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

    .list-filters {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      margin-bottom: var(--space-4);
    }

    @media (min-width: 640px) {
      .list-filters {
        flex-direction: row;
      }
    }

    .list-input,
    .list-select {
      padding: 10px 14px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background-color: var(--color-input-bg);
      color: var(--color-text-primary);
      font-size: var(--font-size-body);
      min-height: var(--touch-target-min);
    }

    .list-input {
      flex: 1;
    }

    .list-alert {
      margin-bottom: var(--space-4);
    }

    .table-wrapper {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    .table-loading {
      opacity: 0.6;
      transition: opacity var(--duration-fast) var(--easing-out);
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--font-size-body);
    }

    .data-table th, .data-table td {
      padding: var(--space-3) var(--space-4);
      text-align: left;
      border-bottom: 1px solid var(--color-border);
    }

    .data-table th {
      font-weight: 600;
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      background: var(--color-surface-raised);
    }

    .data-table tr:last-child td {
      border-bottom: none;
    }

    .data-table tbody tr:hover {
      background: var(--color-surface-raised);
    }

    .cell-desc {
      color: var(--color-text-secondary);
      max-width: 320px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .row-inactive {
      opacity: 0.6;
    }

    .text-right { text-align: right; }

    .font-mono { font-family: var(--font-family-mono); }

    .empty-state {
      padding: var(--space-8);
      text-align: center;
    }

    .empty-state__description {
      color: var(--color-text-secondary);
    }
  `]
})
export class CategoriaFormPage implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly catalogoApi = inject(CatalogoApi);
  readonly catalogoLookup = inject(CatalogoLookup);
  private readonly toast = inject(ToastService);

  readonly navItems: PillNavItem[] = [
    { label: 'Productos', route: '/catalogo/productos' },
    { label: 'Categorías', route: '/catalogo/categorias' },
    { label: 'Proveedores', route: '/catalogo/proveedores' }
  ];

  // --- Formulario de alta ---
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

  // --- Listado paginado ---
  readonly searchControl = new FormControl('', { nonNullable: true });
  /** '' = todas, 'true' = solo activas, 'false' = solo inactivas */
  readonly estadoControl = new FormControl('', { nonNullable: true });

  readonly categorias = signal<CategoriaResponse[]>([]);
  readonly currentPage = signal<number>(0);
  readonly pageSize = signal<number>(10);
  readonly totalElements = signal<number>(0);
  readonly totalPages = signal<number>(0);
  readonly loading = signal<boolean>(false);
  readonly listError = signal<string | null>(null);

  ngOnInit(): void {
    this.cargar();

    // Búsqueda por nombre con retardo de 300 ms; al cambiar un filtro se vuelve a la primera página.
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.currentPage.set(0);
        this.cargar();
      });

    this.estadoControl.valueChanges.pipe(distinctUntilChanged()).subscribe(() => {
      this.currentPage.set(0);
      this.cargar();
    });
  }

  cargar(): void {
    this.loading.set(true);
    this.listError.set(null);

    const estado = this.estadoControl.value;

    this.catalogoApi
      .listarCategorias({
        page: this.currentPage(),
        size: this.pageSize(),
        nombre: this.searchControl.value.trim() || undefined,
        activo: estado === '' ? undefined : estado === 'true'
      })
      .subscribe({
        next: resp => {
          this.loading.set(false);
          this.categorias.set(resp.content);
          this.totalElements.set(resp.totalElements);
          this.totalPages.set(resp.totalPages);
          // Los selectores del formulario de productos leen del lookup.
          this.catalogoLookup.registrarCategorias(resp.content);
        },
        error: err => {
          this.loading.set(false);
          this.listError.set(parseApiError(err).message || 'Error al cargar las categorías.');
        }
      });
  }

  onPageChange(nuevaPagina: number): void {
    this.currentPage.set(nuevaPagina);
    this.cargar();
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
        this.cargar();
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