// src/app/features/catalogo/proveedores/proveedor-form-page.ts
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { CatalogoApi } from '@core/api/catalogo/catalogo-api';
import { ProveedorResponse } from '@core/api/catalogo/catalogo.models';
import { CatalogoLookup } from '@core/lookup/catalogo-lookup';
import { SessionStore } from '@core/auth/session-store';
import { ToastService } from '@core/notifications/toast-service';
import { parseApiError } from '@core/api/api-error';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { Button } from '@shared/ui/button/button';
import { Badge } from '@shared/ui/badge/badge';
import { Pagination } from '@shared/ui/pagination/pagination';
import { ProveedorFormDialog } from './proveedor-form-dialog';

@Component({
  selector: 'app-proveedor-form-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    PageHeader,
    Button,
    Badge,
    Pagination,
    ProveedorFormDialog
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './proveedor-form-page.html',
  styleUrl: './proveedor-form-page.css'
})
export class ProveedorFormPage implements OnInit {
  private readonly catalogoApi = inject(CatalogoApi);
  readonly catalogoLookup = inject(CatalogoLookup);
  private readonly session = inject(SessionStore);
  private readonly toast = inject(ToastService);

  readonly isJefeTaller = computed(() => this.session.role() === 'JEFE_TALLER');

  readonly isProveedorFormOpen = signal<boolean>(false);
  readonly selectedProveedor = signal<ProveedorResponse | null>(null);

  // --- Listado paginado ---
  readonly razonSocialControl = new FormControl('', { nonNullable: true });
  readonly rucControl = new FormControl('', { nonNullable: true });
  /** '' = todos, 'true' = solo activos, 'false' = solo inactivos */
  readonly estadoControl = new FormControl('', { nonNullable: true });

  readonly proveedores = signal<ProveedorResponse[]>([]);
  readonly currentPage = signal<number>(0);
  readonly pageSize = signal<number>(10);
  readonly totalElements = signal<number>(0);
  readonly totalPages = signal<number>(0);
  readonly loading = signal<boolean>(false);
  readonly listError = signal<string | null>(null);

  ngOnInit(): void {
    this.cargar();

    this.razonSocialControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => this.reiniciarYCargar());

    this.rucControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => this.reiniciarYCargar());

    this.estadoControl.valueChanges
      .pipe(distinctUntilChanged())
      .subscribe(() => this.reiniciarYCargar());
  }

  cargar(): void {
    this.loading.set(true);
    this.listError.set(null);

    const estado = this.estadoControl.value;

    this.catalogoApi
      .listarProveedores({
        page: this.currentPage(),
        size: this.pageSize(),
        razonSocial: this.razonSocialControl.value.trim() || undefined,
        ruc: this.rucControl.value.trim() || undefined,
        activo: estado === '' ? undefined : estado === 'true'
      })
      .subscribe({
        next: resp => {
          this.loading.set(false);
          this.proveedores.set(resp.content);
          this.totalElements.set(resp.totalElements);
          this.totalPages.set(resp.totalPages);
          // Los selectores del formulario de productos leen del lookup.
          this.catalogoLookup.registrarProveedores(resp.content);
        },
        error: err => {
          this.loading.set(false);
          this.listError.set(parseApiError(err).message || 'Error al cargar los proveedores.');
        }
      });
  }

  onPageChange(nuevaPagina: number): void {
    this.currentPage.set(nuevaPagina);
    this.cargar();
  }

  private reiniciarYCargar(): void {
    this.currentPage.set(0);
    this.cargar();
  }

  openCreateDialog(): void {
    this.selectedProveedor.set(null);
    this.isProveedorFormOpen.set(true);
  }

  onProveedorSaved(savedPrv: ProveedorResponse): void {
    this.toast.success(`Proveedor "${savedPrv.razonSocial}" guardado correctamente.`);
    this.cargar();
  }
}