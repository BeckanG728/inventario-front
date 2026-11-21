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
import { PillNav, PillNavItem } from '@shared/ui/pill-nav/pill-nav';
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
    PillNav,
    Button,
    Badge,
    Pagination,
    ProveedorFormDialog
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="Proveedores de repuestos"
      subtitle="Registro de empresas distribuidoras y contactos comerciales"
    >
      @if (isJefeTaller()) {
        <app-button variant="primary" (btnClick)="openCreateDialog()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Nuevo proveedor
        </app-button>
      }
    </app-page-header>

    <app-pill-nav [items]="navItems" ariaLabel="Secciones de catálogo" />

    <!-- Listado paginado (viene del servidor) -->
    <div class="data-panel list-card">
      <div class="panel-head">
        <h3>Proveedores registrados</h3>
        <span class="panel-meta font-mono">{{ totalElements() }} en total</span>
      </div>

      <div class="list-filters">
        <input
          type="search"
          class="list-input"
          placeholder="Buscar por razón social..."
          aria-label="Buscar proveedores por razón social"
          [formControl]="razonSocialControl"
        />
        <input
          type="search"
          class="list-input list-input--ruc"
          placeholder="Buscar por RUC..."
          aria-label="Buscar proveedores por RUC"
          [formControl]="rucControl"
        />
        <select class="list-select" [formControl]="estadoControl" aria-label="Filtrar por estado">
          <option value="">Todos</option>
          <option value="true">Solo activos</option>
          <option value="false">Solo inactivos</option>
        </select>
      </div>

      @if (listError()) {
        <div class="inline-alert inline-alert--error list-alert" role="alert">
          <span>{{ listError() }}</span>
          <app-button variant="secondary" size="sm" (btnClick)="cargar()">Reintentar</app-button>
        </div>
      }

      <div class="table-wrapper" [class.table-loading]="loading() && proveedores().length > 0">
        <table class="data-table" aria-label="Proveedores registrados">
          <thead>
            <tr>
              <th>Razón social</th>
              <th>RUC</th>
              <th>Contacto</th>
              <th class="text-right">ID</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            @if (loading() && proveedores().length === 0) {
              @for (s of [1, 2, 3, 4, 5]; track s) {
                <tr>
                  <td><div class="skeleton" style="width: 180px; height: 16px;"></div></td>
                  <td><div class="skeleton" style="width: 100px; height: 16px;"></div></td>
                  <td><div class="skeleton" style="width: 120px; height: 16px;"></div></td>
                  <td class="text-right"><div class="skeleton" style="width: 30px; height: 16px; margin-left: auto;"></div></td>
                  <td><div class="skeleton" style="width: 60px; height: 20px;"></div></td>
                </tr>
              }
            } @else if (proveedores().length === 0) {
              <tr>
                <td colspan="5">
                  <div class="empty-state">
                    <p class="empty-state__description">
                      No se encontraron proveedores con los filtros seleccionados.
                    </p>
                  </div>
                </td>
              </tr>
            } @else {
              @for (prv of proveedores(); track prv.id) {
                <tr [class.row-inactive]="!prv.activo">
                  <td>{{ prv.razonSocial }}</td>
                  <td class="font-mono">{{ prv.ruc }}</td>
                  <td>{{ prv.contacto || '—' }}</td>
                  <td class="text-right font-mono">{{ prv.id }}</td>
                  <td>
                    <app-badge [variant]="prv.activo ? 'neutral' : 'danger'" size="sm">
                      {{ prv.activo ? 'Activo' : 'Inactivo' }}
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

    <!-- Diálogo modal para registrar/editar proveedor -->
    <app-proveedor-form-dialog
      [(isOpen)]="isProveedorFormOpen"
      [proveedorToEdit]="selectedProveedor()"
      (saved)="onProveedorSaved($event)"
    />
  `,
  styles: [`
    .data-panel {
      height: fit-content;
    }

    .list-filters {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      margin-bottom: var(--space-4);
    }

    @media (min-width: 768px) {
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

    .list-input--ruc {
      flex: 0 1 220px;
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
export class ProveedorFormPage implements OnInit {
  private readonly catalogoApi = inject(CatalogoApi);
  readonly catalogoLookup = inject(CatalogoLookup);
  private readonly session = inject(SessionStore);
  private readonly toast = inject(ToastService);

  readonly isJefeTaller = computed(() => this.session.role() === 'JEFE_TALLER');

  readonly navItems: PillNavItem[] = [
    { label: 'Productos', route: '/catalogo/productos' },
    { label: 'Categorías', route: '/catalogo/categorias' },
    { label: 'Proveedores', route: '/catalogo/proveedores' }
  ];

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