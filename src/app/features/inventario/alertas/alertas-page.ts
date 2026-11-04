// src/app/features/inventario/alertas/alertas-page.ts
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { InventarioApi } from '@core/api/inventario/inventario-api';
import { AlertaResponse } from '@core/api/inventario/inventario.models';
import { SessionStore } from '@core/auth/session-store';
import { parseApiError } from '@core/api/api-error';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { PillNav, PillNavItem } from '@shared/ui/pill-nav/pill-nav';
import { Button } from '@shared/ui/button/button';
import { Badge } from '@shared/ui/badge/badge';

@Component({
  selector: 'app-alertas-page',
  standalone: true,
  imports: [PageHeader, PillNav, Button, Badge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="Alertas de bajo stock"
      subtitle="Productos activos con stock actual igual o inferior al mínimo configurado"
    >
      <app-button
        variant="outline"
        [loading]="cargando()"
        (btnClick)="cargar()"
        aria-label="Actualizar lista de alertas"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" aria-hidden="true">
          <polyline points="23 4 23 10 17 10"/>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
        Actualizar
      </app-button>
    </app-page-header>

    <app-pill-nav [items]="navItems" ariaLabel="Módulo de inventario" />

    <!-- Tarjeta resumen -->
    @if (!cargando() && alertas().length > 0) {
      <div class="stat-grid summary-grid">
        <div class="stat-card-mini">
          <span class="stat-label">Total en alerta</span>
          <span class="stat-value stat-value--danger">{{ alertas().length }}</span>
        </div>
        <div class="stat-card-mini">
          <span class="stat-label">Sin stock (0 unid.)</span>
          <span class="stat-value stat-value--danger">{{ sinStock() }}</span>
        </div>
        <div class="stat-card-mini">
          <span class="stat-label">Bajo stock</span>
          <span class="stat-value stat-value--warning">{{ bajoStock() }}</span>
        </div>
        <div class="stat-card-mini">
          <span class="stat-label">Total a reponer</span>
          <span class="stat-value">{{ totalSugerido() }} unid.</span>
        </div>
      </div>
    }

    <!-- Error -->
    @if (errorMensaje()) {
      <div class="inline-alert inline-alert--error alert-box" role="alert">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="8"/>
          <line x1="12" y1="12" x2="12" y2="16"/>
        </svg>
        <span>{{ errorMensaje() }}</span>
      </div>
    }

    <!-- Skeleton -->
    @if (cargando()) {
      <div class="data-panel">
        <div class="panel-head"><h2>Cargando alertas…</h2></div>
        <ul class="alert-list" aria-label="Cargando">
          @for (_ of skeletonItems; track $index) {
            <li class="alert-item alert-item--skeleton">
              <div class="skeleton skeleton-title"></div>
              <div class="skeleton-row">
                <div class="skeleton skeleton-pill"></div>
                <div class="skeleton skeleton-pill"></div>
                <div class="skeleton skeleton-pill"></div>
              </div>
            </li>
          }
        </ul>
      </div>
    }

    <!-- Estado vacío -->
    @if (!cargando() && !errorMensaje() && alertas().length === 0) {
      <div class="data-panel empty-panel">
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
               stroke="var(--color-success)" stroke-width="1.5" aria-hidden="true">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <h2>¡Todo el inventario está bien!</h2>
          <p>No hay productos con stock bajo o agotado en este momento.</p>
        </div>
      </div>
    }

    <!-- Lista de alertas -->
    @if (!cargando() && alertas().length > 0) {
      <div class="data-panel">
        <div class="panel-head">
          <h2>Productos que requieren reposición</h2>
          <span class="panel-hint">Ordenados por urgencia (mayor necesidad primero)</span>
        </div>

        <div class="table-wrapper">
          <table class="alert-table" aria-label="Alertas de bajo stock">
            <thead>
              <tr>
                <th scope="col">Código</th>
                <th scope="col">Producto</th>
                <th scope="col">Proveedor</th>
                <th scope="col" class="text-right">Stock actual</th>
                <th scope="col" class="text-right">Stock mínimo</th>
                <th scope="col" class="text-right">A reponer</th>
                <th scope="col" class="text-center">Urgencia</th>
              </tr>
            </thead>
            <tbody>
              @for (a of alertas(); track a.codigo) {
                <tr [class.row--sin-stock]="a.stockActual === 0">
                  <td class="font-mono">{{ a.codigo }}</td>
                  <td class="producto-nombre">{{ a.nombre }}</td>
                  <td class="proveedor-nombre color-secondary">{{ a.proveedor }}</td>
                  <td class="text-right">
                    <span [class.text-danger]="a.stockActual === 0"
                          [class.text-warning]="a.stockActual > 0 && a.stockActual <= a.stockMinimo"
                          class="font-weight-bold">
                      {{ a.stockActual }}
                    </span>
                  </td>
                  <td class="text-right color-secondary">{{ a.stockMinimo }}</td>
                  <td class="text-right">
                    <span class="sugerido">{{ a.cantidadSugerida }}</span>
                  </td>
                  <td class="text-center">
                    @if (a.stockActual === 0) {
                      <app-badge variant="danger" size="sm">Sin stock</app-badge>
                    } @else {
                      <app-badge variant="warning" size="sm">Bajo stock</app-badge>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Nota rol MECANICO -->
        @if (!esJefeTaller()) {
          <div class="inline-alert inline-alert--info rol-nota" role="note">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            <span>Informa al Jefe de Taller sobre estos productos para que gestione las entradas de inventario.</span>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    /* Stat cards summary */
    .summary-grid { margin-bottom: var(--space-5); }

    .stat-value--danger { color: var(--color-danger); }
    .stat-value--warning { color: var(--color-warning-text, var(--color-warning)); }

    /* Alert list skeleton */
    .alert-list { list-style: none; margin: 0; padding: 0; }
    .alert-item--skeleton {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      padding: var(--space-4);
      border-bottom: 1px solid var(--color-border);
    }
    .skeleton-title { height: 16px; width: 50%; border-radius: var(--radius-sm); }
    .skeleton-row { display: flex; gap: var(--space-2); }
    .skeleton-pill { height: 22px; width: 70px; border-radius: var(--radius-full); }

    /* Empty state */
    .empty-panel { text-align: center; }
    .empty-state { padding: var(--space-10) var(--space-6); }
    .empty-state svg { margin-bottom: var(--space-4); }
    .empty-state h2 { margin: 0 0 var(--space-2); color: var(--color-text-primary); }
    .empty-state p  { margin: 0; color: var(--color-text-secondary); }

    /* Panel hint */
    .panel-head {
      display: flex;
      align-items: baseline;
      gap: var(--space-3);
      flex-wrap: wrap;
    }
    .panel-hint { font-size: var(--font-size-sm); color: var(--color-text-secondary); }

    /* Table */
    .alert-table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--font-size-body);
    }
    .alert-table th, .alert-table td {
      padding: var(--space-3) var(--space-4);
      text-align: left;
      border-bottom: 1px solid var(--color-border);
    }
    .alert-table th {
      font-weight: 600;
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      background: var(--color-surface-raised);
    }
    .alert-table tr:last-child td { border-bottom: none; }
    .alert-table tbody tr:hover { background: var(--color-surface-raised); }

    .row--sin-stock { background: color-mix(in srgb, var(--color-danger) 6%, transparent); }

    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-mono { font-family: var(--font-mono); font-size: var(--font-size-sm); }
    .font-weight-bold { font-weight: 600; }
    .color-secondary { color: var(--color-text-secondary); }
    .text-danger { color: var(--color-danger); }
    .text-warning { color: var(--color-warning-text); }

    .producto-nombre { font-weight: 500; }
    .proveedor-nombre { font-size: var(--font-size-sm); }

    .sugerido {
      font-weight: 700;
      color: var(--color-primary);
    }

    .alert-box, .rol-nota { margin-top: var(--space-4); }
  `]
})
export class AlertasPage implements OnInit {
  private readonly inventarioApi = inject(InventarioApi);
  private readonly session       = inject(SessionStore);

  // ── Estado ─────────────────────────────────────────────────────────────────
  readonly alertas      = signal<AlertaResponse[]>([]);
  readonly cargando     = signal(false);
  readonly errorMensaje = signal('');

  readonly sinStock     = computed(() => this.alertas().filter(a => a.stockActual === 0).length);
  readonly bajoStock    = computed(() => this.alertas().filter(a => a.stockActual > 0 && a.stockActual <= a.stockMinimo).length);
  readonly totalSugerido = computed(() => this.alertas().reduce((sum, a) => sum + a.cantidadSugerida, 0));

  readonly esJefeTaller = computed(() => this.session.role() === 'JEFE_TALLER');

  readonly skeletonItems = Array(5).fill(null);

  // ── Nav ────────────────────────────────────────────────────────────────────
  readonly navItems: PillNavItem[] = [
    { label: 'Existencias', route: '/inventario/existencias' },
    { label: 'Alertas',     route: '/inventario/alertas' },
  ];

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorMensaje.set('');

    this.inventarioApi.getAlertas().subscribe({
      next: data => {
        this.alertas.set(data);
        this.cargando.set(false);
      },
      error: err => {
        this.errorMensaje.set(parseApiError(err).message);
        this.cargando.set(false);
      }
    });
  }
}
