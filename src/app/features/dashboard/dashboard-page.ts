// src/app/features/dashboard/dashboard-page.ts
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardApi } from '@core/api/dashboard/dashboard-api';
import { DashboardResponse } from '@core/api/dashboard/dashboard.models';
import { parseApiError } from '@core/api/api-error';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { Button } from '@shared/ui/button/button';
import { Badge } from '@shared/ui/badge/badge';
import { CurrencyPipe } from '@shared/format/currency.pipe';
import { DateTimePipe } from '@shared/format/date-time.pipe';
import { NumberPipe } from '@shared/format/number.pipe';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    RouterLink,
    PageHeader,
    Button,
    Badge,
    CurrencyPipe,
    DateTimePipe,
    NumberPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="Panel de Control"
      subtitle="Resumen general del inventario, alertas prioritarias y KPIs operativos del mes"
    >
      <app-button
        variant="outline"
        [loading]="cargando()"
        (btnClick)="cargarDashboard()"
        aria-label="Actualizar datos del panel"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" aria-hidden="true">
          <polyline points="23 4 23 10 17 10"/>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
        Actualizar
      </app-button>
    </app-page-header>

    @if (errorMensaje()) {
      <div class="inline-alert inline-alert--error alert-box" role="alert">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="8"/>
          <line x1="12" y1="12" x2="12" y2="16"/>
        </svg>
        <span>{{ errorMensaje() }}</span>
      </div>
    }

    @if (cargando() && !data()) {
      <!-- Skeletons de carga -->
      <div class="stat-grid" aria-label="Cargando estadísticas">
        @for (_ of [1, 2, 3, 4]; track $index) {
          <div class="stat-card skeleton-card">
            <div class="skeleton skeleton-line-sm"></div>
            <div class="skeleton skeleton-val"></div>
          </div>
        }
      </div>
    } @else if (data(); as d) {
      <!-- 1. Estado del Inventario (4 Stat Cards) -->
      <section class="section-block" aria-labelledby="inv-heading">
        <h2 id="inv-heading" class="sr-only">Estado del inventario</h2>
        <div class="stat-grid">
          <div class="stat-card stat-card--blue">
            <span class="label">Total de Productos</span>
            <span class="value">{{ d.inventario.totalProductos | appNumber }}</span>
            <span class="meta">Catálogo activo</span>
          </div>

          <div class="stat-card stat-card--green">
            <span class="label">Stock Normal</span>
            <span class="value">{{ d.inventario.productosStockNormal | appNumber }}</span>
            <span class="meta">Nivel óptimo</span>
          </div>

          <div class="stat-card stat-card--orange">
            <span class="label">Bajo Stock</span>
            <span class="value">{{ d.inventario.productosBajoStock | appNumber }}</span>
            <span class="meta">Próximos a agotar</span>
          </div>

          <div class="stat-card stat-card--red">
            <span class="label">Sin Stock</span>
            <span class="value">{{ d.inventario.productosSinStock | appNumber }}</span>
            <span class="meta">Agotados</span>
          </div>
        </div>
      </section>

      <!-- 2. KPIs del Mes en curso -->
      <section class="section-block" aria-labelledby="kpis-heading">
        <div class="panel-head-section">
          <h2 id="kpis-heading">Métricas operativas del mes</h2>
          <span class="panel-hint">Calculadas desde el primer día del mes actual</span>
        </div>

        <div class="stat-grid stat-grid--5">
          <div class="stat-card-mini stat-card-mini--teal">
            <span class="label">Valor Estimado</span>
            <span class="value">{{ d.kpis.valorEstimadoInventario | appCurrency }}</span>
          </div>
          <div class="stat-card-mini stat-card-mini--neutral">
            <span class="label">Sin Costo Registrado</span>
            <span class="value">{{ d.kpis.productosSinCosto }} prod.</span>
          </div>
          <div class="stat-card-mini stat-card-mini--green">
            <span class="label">Entradas del Mes</span>
            <span class="value">{{ d.kpis.entradasMes }} mov.</span>
          </div>
          <div class="stat-card-mini stat-card-mini--purple">
            <span class="label">Consumos del Mes</span>
            <span class="value">{{ d.kpis.consumosMes }} mov.</span>
          </div>
          <div class="stat-card-mini stat-card-mini--orange">
            <span class="label">Ajustes del Mes</span>
            <span class="value">{{ d.kpis.ajustesMes }} mov.</span>
          </div>
        </div>
      </section>

      <!-- 3. Alertas prioritarias y Últimos Movimientos -->
      <div class="dashboard-grid">
        <!-- Panel Alertas Urgentes -->
        <div class="data-panel">
          <div class="panel-head">
            <div>
              <h2>Alertas prioritarias</h2>
              <span class="panel-hint">Productos que requieren reposición urgente ({{ d.alertas.total }} en total)</span>
            </div>
            <a routerLink="/inventario/alertas" class="panel-link">Ver todas →</a>
          </div>

          @if (d.alertas.masUrgentes.length === 0) {
            <div class="empty-state empty-state--sm">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                   stroke="var(--color-success)" stroke-width="2" aria-hidden="true">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <p>Sin alertas críticas pendientes.</p>
            </div>
          } @else {
            <div class="table-wrapper">
              <table class="data-table" aria-label="Alertas más urgentes">
                <colgroup>
                  <col style="width: 15%">
                  <col style="width: 37%">
                  <col style="width: 13%">
                  <col style="width: 14%">
                  <col style="width: 21%">
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">Código</th>
                    <th scope="col">Producto</th>
                    <th scope="col" class="text-right">Actual</th>
                    <th scope="col" class="text-right">Sugerido</th>
                    <th scope="col" class="text-center">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  @for (a of d.alertas.masUrgentes; track a.codigo) {
                    <tr [class.row--agotado]="a.stockActual === 0">
                      <td class="font-mono">{{ a.codigo }}</td>
                      <td>
                        <span class="td-nombre">{{ a.nombre }}</span>
                        <span class="td-sub">{{ a.proveedor }}</span>
                      </td>
                      <td class="text-right font-weight-bold" [class.text-danger]="a.stockActual === 0">
                        {{ a.stockActual }}
                      </td>
                      <td class="text-right text-primary font-weight-bold">
                        {{ a.cantidadSugerida }}
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
          }
        </div>

        <!-- Panel Últimos Movimientos -->
        <div class="data-panel">
          <div class="panel-head">
            <div>
              <h2>Últimos movimientos</h2>
              <span class="panel-hint">Actividad reciente de inventario</span>
            </div>
            <a routerLink="/reportes/movimientos" class="panel-link">Ver historial →</a>
          </div>

          @if (d.ultimosMovimientos.length === 0) {
            <div class="empty-state empty-state--sm">
              <p>No se registran movimientos en el sistema.</p>
            </div>
          } @else {
            <div class="table-wrapper">
              <table class="data-table" aria-label="Últimos movimientos registrados">
                <colgroup>
                  <col style="width: 17%">
                  <col style="width: 10%">
                  <col style="width: 36%">
                  <col style="width: 13%">
                  <col style="width: 24%">
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">Fecha / Hora</th>
                    <th scope="col">Tipo</th>
                    <th scope="col">Producto</th>
                    <th scope="col" class="text-right">Cantidad</th>
                    <th scope="col">Usuario</th>
                  </tr>
                </thead>
                <tbody>
                  @for (m of d.ultimosMovimientos; track m.id) {
                    <tr>
                      <td class="text-muted font-mono font-sm">
                        {{ m.fecha | appDateTime }}
                      </td>
                      <td>
                        @switch (m.tipo) {
                          @case ('ENTRADA') {
                            <app-badge variant="success" size="sm">Entrada</app-badge>
                          }
                          @case ('CONSUMO') {
                            <app-badge variant="accent" size="sm">Consumo</app-badge>
                          }
                          @case ('AJUSTE') {
                            <app-badge variant="info" size="sm">Ajuste</app-badge>
                          }
                        }
                      </td>
                      <td>
                        <span class="td-nombre">{{ m.productoNombre }}</span>
                        <span class="td-sub font-mono">{{ m.productoCodigo }}</span>
                      </td>
                      <td class="text-right font-weight-bold">
                        {{ m.cantidad }}
                      </td>
                      <td class="font-sm text-secondary">
                        {{ m.usuario }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .section-block {
      margin-bottom: var(--space-6);
    }

    .panel-head-section {
      margin-bottom: var(--space-3);
    }

    .panel-head-section h2 {
      margin: 0;
      font-size: var(--font-size-h2);
      color: var(--color-text-primary);
    }

    .panel-hint {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
    }

    .stat-grid--5 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-3);
    }

    @media (min-width: 1024px) {
      .stat-grid--5 {
        grid-template-columns: repeat(5, 1fr);
      }
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-5);
      min-width: 0;
    }

    @media (min-width: 1024px) {
      .dashboard-grid {
        grid-template-columns: 1fr;
      }
    }

    .dashboard-grid > * {
      min-width: 0;
    }

    .panel-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
      flex-wrap: wrap;
    }

    .panel-head h2 {
      margin: 0;
      font-size: var(--font-size-h2);
      color: var(--color-text-primary);
    }

    .panel-link {
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--color-primary);
      text-decoration: none;
      white-space: nowrap;
    }

    .panel-link:hover {
      text-decoration: underline;
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

    .row--agotado {
      background: color-mix(in srgb, var(--color-danger) 6%, transparent);
    }

    .td-nombre {
      display: block;
      font-weight: 500;
      color: var(--color-text-primary);
    }

    .td-sub {
      display: block;
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
    }

    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-mono { font-family: var(--font-mono); }
    .font-sm { font-size: var(--font-size-sm); }
    .font-weight-bold { font-weight: 700; }
    .text-danger { color: var(--color-danger); }
    .text-primary { color: var(--color-primary); }
    .text-muted { color: var(--color-text-muted); }
    .text-secondary { color: var(--color-text-secondary); }

    .skeleton-card {
      min-height: 100px;
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      padding: var(--space-4);
      background: var(--color-surface-raised);
    }

    .skeleton-line-sm { height: 14px; width: 40%; border-radius: var(--radius-sm); }
    .skeleton-val { height: 32px; width: 60%; border-radius: var(--radius-sm); }

    .alert-box {
      margin-bottom: var(--space-5);
    }
  `]
})
export class DashboardPage implements OnInit {
  private readonly dashboardApi = inject(DashboardApi);

  readonly data = signal<DashboardResponse | null>(null);
  readonly cargando = signal(false);
  readonly errorMensaje = signal('');

  ngOnInit(): void {
    this.cargarDashboard();
  }

  cargarDashboard(): void {
    this.cargando.set(true);
    this.errorMensaje.set('');

    this.dashboardApi.getDashboard().subscribe({
      next: res => {
        this.data.set(res);
        this.cargando.set(false);
      },
      error: err => {
        this.errorMensaje.set(parseApiError(err).message);
        this.cargando.set(false);
      }
    });
  }
}
