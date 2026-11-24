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
    Field,
    Button,
    Badge,
    Pagination
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './categoria-form-page.html',
  styleUrl: './categoria-form-page.css'
})
export class CategoriaFormPage implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly catalogoApi = inject(CatalogoApi);
  readonly catalogoLookup = inject(CatalogoLookup);
  private readonly toast = inject(ToastService);

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