// src/app/features/reportes/movimientos/reporte-movimientos-page.ts
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { ReportesApi } from '@core/api/reportes/reportes-api';
import {
  ExportMovimientosParams,
  ReporteMovimientosParams,
  ReporteMovimientosResponse
} from '@core/api/reportes/reportes.models';
import { parseApiError } from '@core/api/api-error';
import { ToastService } from '@core/notifications/toast-service';
import { downloadHttpResponse } from '@shared/download/download.util';
import { getLimaMonthRange } from '@shared/format/date.util';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { PillNav } from '@shared/ui/pill-nav/pill-nav';
import { Button } from '@shared/ui/button/button';
import { Badge } from '@shared/ui/badge/badge';
import { Pagination } from '@shared/ui/pagination/pagination';
import { DateTimePipe } from '@shared/format/date-time.pipe';
import { CurrencyPipe } from '@shared/format/currency.pipe';
import { BotonesExportar } from '../compartido/botones-exportar';
import { REPORTES_NAV_ITEMS } from '../reportes-nav';

@Component({
  selector: 'app-reporte-movimientos-page',
  standalone: true,
  imports: [
    FormsModule,
    PageHeader,
    PillNav,
    Button,
    Badge,
    Pagination,
    DateTimePipe,
    CurrencyPipe,
    BotonesExportar
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="Reporte de Movimientos de Inventario"
      subtitle="Auditoría cronológica de entradas por compra, consumos de mecánicos y ajustes físicos"
    >
      <app-botones-exportar
        [loadingPdf]="exportandoPdf()"
        [loadingExcel]="exportandoExcel()"
        [disabled]="cargando()"
        (exportPdf)="onExportar('pdf')"
        (exportExcel)="onExportar('xlsx')"
      />
    </app-page-header>

    <app-pill-nav [items]="navItems" ariaLabel="Reportes del sistema" />

    <!-- Filtros de búsqueda -->
    <div class="data-panel filter-panel">
      <form class="filter-form" (ngSubmit)="onFiltrar()">
        <div class="filter-field">
          <label for="fecha-desde">Fecha desde</label>
          <input
            id="fecha-desde"
            type="date"
            class="filter-input"
            [ngModel]="desde()"
            (ngModelChange)="desde.set($event)"
            name="desde"
            required
          />
        </div>

        <div class="filter-field">
          <label for="fecha-hasta">Fecha hasta</label>
          <input
            id="fecha-hasta"
            type="date"
            class="filter-input"
            [ngModel]="hasta()"
            (ngModelChange)="hasta.set($event)"
            name="hasta"
            required
          />
        </div>

        <div class="filter-field">
          <label for="filtro-tipo">Tipo de movimiento</label>
          <select
            id="filtro-tipo"
            class="filter-input"
            [ngModel]="tipo()"
            (ngModelChange)="tipo.set($event)"
            name="tipo"
          >
            <option value="">Todos los tipos</option>
            <option value="ENTRADA">Entradas (Compras)</option>
            <option value="CONSUMO">Consumos</option>
            <option value="AJUSTE">Ajustes físicos</option>
          </select>
        </div>

        <div class="filter-actions">
          <app-button
            type="submit"
            variant="primary"
            [loading]="cargando()"
          >
            Filtrar
          </app-button>
          <app-button
            type="button"
            variant="outline"
            (btnClick)="resetFiltros()"
          >
            Mes actual
          </app-button>
        </div>
      </form>
    </div>

    <!-- Error -->
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

    <!-- Totales globales (calculados sobre el filtro completo) -->
    @if (data(); as d) {
      <div class="stat-grid summary-grid">
        <div class="stat-card-mini stat-card-mini--blue">
          <span class="label">Total Movimientos</span>
          <span class="value">{{ d.totalElements }}</span>
        </div>
        <div class="stat-card-mini stat-card-mini--green">
          <span class="label">Entradas</span>
          <span class="value">{{ d.totalEntradas }}</span>
        </div>
        <div class="stat-card-mini stat-card-mini--purple">
          <span class="label">Consumos</span>
          <span class="value">{{ d.totalConsumos }}</span>
        </div>
        <div class="stat-card-mini stat-card-mini--orange">
          <span class="label">Ajustes</span>
          <span class="value">{{ d.totalAjustes }}</span>
        </div>
      </div>

      <!-- Tabla de resultados -->
      <div class="data-panel">
        <div class="table-wrapper">
          <table class="data-table" aria-label="Listado de movimientos">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Fecha / Hora</th>
                <th scope="col">Tipo</th>
                <th scope="col" class="text-right">Cantidad</th>
                <th scope="col" class="text-right">Stock Anterior</th>
                <th scope="col" class="text-right">Stock Posterior</th>
                <th scope="col" class="text-right">Costo Unit.</th>
                <th scope="col">Motivo / Detalle</th>
              </tr>
            </thead>
            <tbody>
              @for (m of d.movimientos; track m.id) {
                <tr>
                  <td class="font-mono text-muted">#{{ m.id }}</td>
                  <td class="font-mono font-sm">{{ m.fecha | appDateTime }}</td>
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
                  <td class="text-right font-weight-bold">
                    @if (m.tipo === 'AJUSTE') {
                      <span [class.text-danger]="(m.variacion ?? 0) < 0" [class.text-success]="(m.variacion ?? 0) > 0">
                        {{ (m.variacion ?? 0) >= 0 ? '+' : '' }}{{ m.variacion }}
                      </span>
                    } @else {
                      {{ m.cantidad }}
                    }
                  </td>
                  <td class="text-right text-muted">{{ m.stockAnterior }}</td>
                  <td class="text-right font-weight-bold">{{ m.stockPosterior }}</td>
                  <td class="text-right font-mono">
                    @if (m.costoUnitario !== null) {
                      {{ m.costoUnitario | appCurrency }}
                    } @else {
                      <span class="text-muted">—</span>
                    }
                  </td>
                  <td class="td-motivo">{{ m.motivo }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="8" class="text-center text-muted empty-cell">
                    No se encontraron movimientos para el rango y filtros seleccionados.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Paginación -->
        <app-pagination
          [page]="d.page"
          [size]="d.size"
          [totalElements]="d.totalElements"
          [totalPages]="d.totalPages"
          (pageChange)="onPageChange($event)"
        />
      </div>
    }
  `,
  styles: [`
    .filter-panel {
      margin-bottom: var(--space-5);
    }

    .filter-form {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
      align-items: flex-end;
    }

    .filter-field {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      flex: 1;
      min-width: 170px;
    }

    .filter-field label {
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--color-text-secondary);
    }

    .filter-input {
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-size: var(--font-size-body);
      color: var(--color-text-primary);
      background: var(--color-surface);
      outline: none;
      min-height: 40px;
    }

    .filter-input:focus-visible {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px var(--color-focus-ring);
    }

    .filter-actions {
      display: flex;
      gap: var(--space-2);
      align-items: center;
    }

    .summary-grid {
      margin-bottom: var(--space-5);
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

    .data-table tbody tr:hover {
      background: var(--color-surface-raised);
    }

    .empty-cell {
      padding: var(--space-8) var(--space-4);
    }

    .td-motivo {
      max-width: 280px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-mono { font-family: var(--font-mono); }
    .font-sm { font-size: var(--font-size-sm); }
    .font-weight-bold { font-weight: 700; }
    .text-muted { color: var(--color-text-muted); }
    .text-success { color: var(--color-success); }
    .text-danger { color: var(--color-danger); }

    .alert-box {
      margin-bottom: var(--space-5);
    }
  `]
})
export class ReporteMovimientosPage implements OnInit {
  private readonly reportesApi = inject(ReportesApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly toast = inject(ToastService);

  readonly navItems = REPORTES_NAV_ITEMS;

  // Estado de filtros
  readonly desde = signal('');
  readonly hasta = signal('');
  readonly tipo = signal<'ENTRADA' | 'CONSUMO' | 'AJUSTE' | ''>('');
  readonly page = signal(0);
  readonly size = signal(10);

  // Estado de datos
  readonly data = signal<ReporteMovimientosResponse | null>(null);
  readonly cargando = signal(false);
  readonly exportandoPdf = signal(false);
  readonly exportandoExcel = signal(false);
  readonly errorMensaje = signal('');

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    const defaultRange = getLimaMonthRange();

    this.desde.set(q.get('desde') || defaultRange.desde);
    this.hasta.set(q.get('hasta') || defaultRange.hasta);
    this.tipo.set((q.get('tipo') as never) || '');
    this.page.set(Number(q.get('page')) || 0);
    this.size.set(Number(q.get('size')) || 10);

    this.cargar();
  }

  onFiltrar(): void {
    this.page.set(0);
    this.cargar();
  }

  resetFiltros(): void {
    const defaultRange = getLimaMonthRange();
    this.desde.set(defaultRange.desde);
    this.hasta.set(defaultRange.hasta);
    this.tipo.set('');
    this.page.set(0);
    this.cargar();
  }

  onPageChange(p: number): void {
    this.page.set(p);
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.errorMensaje.set('');

    const params: ReporteMovimientosParams = {
      desde: this.desde(),
      hasta: this.hasta(),
      page: this.page(),
      size: this.size()
    };
    if (this.tipo()) {
      params.tipo = this.tipo() as 'ENTRADA' | 'CONSUMO' | 'AJUSTE';
    }

    // Sincronizar URL
    const urlTree = this.router.createUrlTree([], {
      relativeTo: this.route,
      queryParams: {
        desde: params.desde,
        hasta: params.hasta,
        tipo: params.tipo || null,
        page: params.page,
        size: params.size
      }
    });
    this.location.replaceState(urlTree.toString());

    this.reportesApi.getMovimientos(params).subscribe({
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

  onExportar(formato: 'pdf' | 'xlsx'): void {
    const isPdf = formato === 'pdf';
    if (isPdf) this.exportandoPdf.set(true);
    else this.exportandoExcel.set(true);

    const ext = isPdf ? 'pdf' : 'xlsx';
    const fallback = `reporte-movimientos.${ext}`;

    const params: ExportMovimientosParams = {
      formato,
      desde: this.desde(),
      hasta: this.hasta()
    };
    if (this.tipo()) {
      params.tipo = this.tipo() as 'ENTRADA' | 'CONSUMO' | 'AJUSTE';
    }

    this.reportesApi.exportarMovimientos(params).subscribe({
      next: res => {
        downloadHttpResponse(res, fallback);
        this.toast.success(`Reporte de movimientos descargado (${ext.toUpperCase()})`);
        if (isPdf) this.exportandoPdf.set(false);
        else this.exportandoExcel.set(false);
      },
      error: err => {
        this.toast.error(`Error al exportar: ${parseApiError(err).message}`);
        if (isPdf) this.exportandoPdf.set(false);
        else this.exportandoExcel.set(false);
      }
    });
  }
}
