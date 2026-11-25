// src/app/features/catalogo/categorias/categoria-form-page.ts
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { CatalogoApi } from '@core/api/catalogo/catalogo-api';
import { CategoriaResponse } from '@core/api/catalogo/catalogo.models';
import { CatalogoLookup } from '@core/lookup/catalogo-lookup';
import { parseApiError } from '@core/api/api-error';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { Button } from '@shared/ui/button/button';
import { Badge } from '@shared/ui/badge/badge';
import { Pagination } from '@shared/ui/pagination/pagination';
import { CategoriaFormDialog } from './categoria-form-dialog';

@Component({
  selector: 'app-categoria-form-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    PageHeader,
    Button,
    Badge,
    Pagination,
    CategoriaFormDialog
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './categoria-form-page.html',
  styleUrl: './categoria-form-page.css'
})
export class CategoriaFormPage implements OnInit {
  private readonly catalogoApi = inject(CatalogoApi);
  readonly catalogoLookup = inject(CatalogoLookup);

  // --- Modal de alta ---
  readonly isFormOpen = signal<boolean>(false);

  openCreateDialog(): void {
    this.isFormOpen.set(true);
  }

  onCategoriaSaved(): void {
    this.cargar();
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
    this.catalogoLookup.cargarFiltros().subscribe();
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
}