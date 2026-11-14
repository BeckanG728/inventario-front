// src/app/features/catalogo/proveedores/proveedor-form-page.ts
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ProveedorResponse } from '@core/api/catalogo/catalogo.models';
import { CatalogoLookup } from '@core/lookup/catalogo-lookup';
import { SessionStore } from '@core/auth/session-store';
import { ToastService } from '@core/notifications/toast-service';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { PillNav, PillNavItem } from '@shared/ui/pill-nav/pill-nav';
import { Button } from '@shared/ui/button/button';
import { Badge } from '@shared/ui/badge/badge';
import { ProveedorFormDialog } from './proveedor-form-dialog';

@Component({
  selector: 'app-proveedor-form-page',
  standalone: true,
  imports: [
    PageHeader,
    PillNav,
    Button,
    Badge,
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

    <!-- Tabla de proveedores conocidos en sesión -->
    <div class="data-panel list-card">
      <div class="panel-head">
        <h3>Proveedores registrados</h3>
        <span class="panel-meta font-mono">{{ catalogoLookup.proveedores().length }} registrados</span>
      </div>

      @if (catalogoLookup.proveedores().length === 0) {
        <div class="empty-state">
          <p class="empty-state__description">
            No se han registrado proveedores en esta sesión. Los proveedores registrados estarán disponibles para asociar repuestos y recepcionar compras de almacén.
          </p>
        </div>
      } @else {
        <div class="table-wrapper">
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
              @for (prv of catalogoLookup.proveedores(); track prv.id) {
                <tr [class.row-inactive]="!prv.activo">
                  <td>{{ prv.razonSocial }}</td>
                  <td class="font-mono">{{ prv.ruc }}</td>
                  <td>{{ prv.contacto || '—' }}</td>
                  <td class="text-right font-mono">{{ prv.id }}</td>
                  <td>
                    <app-badge
                      [variant]="prv.activo ? 'neutral' : 'danger'"
                      size="sm"
                    >
                      {{ prv.activo ? 'Activo' : 'Inactivo' }}
                    </app-badge>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
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

    .table-wrapper {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
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
export class ProveedorFormPage {
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

  openCreateDialog(): void {
    this.selectedProveedor.set(null);
    this.isProveedorFormOpen.set(true);
  }

  onProveedorSaved(savedPrv: ProveedorResponse): void {
    this.toast.success(`Proveedor "${savedPrv.razonSocial}" guardado correctamente.`);
  }
}
