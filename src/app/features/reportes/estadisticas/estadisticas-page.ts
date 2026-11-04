// src/app/features/reportes/estadisticas/estadisticas-page.ts
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { EstadisticasApi } from '@core/api/estadisticas/estadisticas-api';
import {
  EstadisticasParams,
  EstadisticasResponse,
  Granularidad
} from '@core/api/estadisticas/estadisticas.models';
import { parseApiError } from '@core/api/api-error';
import { formatDate, getLimaMonthRange } from '@shared/format/date.util';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { PillNav } from '@shared/ui/pill-nav/pill-nav';
import { Button } from '@shared/ui/button/button';
import { NumberPipe } from '@shared/format/number.pipe';
import { REPORTES_NAV_ITEMS } from '../reportes-nav';

interface ItemEstadistica {
  fecha: string;
  label: string;
  cantidad: number;
  porcentaje: number;
}

@Component({
  selector: 'app-estadisticas-page',
  standalone: true,
  imports: [
    FormsModule,
    PageHeader,
    PillNav,
    Button,
    NumberPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="Estadísticas de Actividad de Inventario"
      subtitle="Distribución temporal de movimientos registrados por día, semana o mes"
    />

    <app-pill-nav [items]="navItems" ariaLabel="Reportes del sistema" />

    <!-- Panel de filtros -->
    <div class="data-panel filter-panel">
      <form class="filter-form" (ngSubmit)="cargar()">
        <div class="filter-field">
          <label for="stat-from">Fecha desde</label>
          <input
            id="stat-from"
            type="date"
            class="filter-input"
            [ngModel]="from()"
            (ngModelChange)="from.set($event)"
            name="from"
            required
          />
        </div>

        <div class="filter-field">
          <label for="stat-to">Fecha hasta</label>
          <input
            id="stat-to"
            type="date"
            class="filter-input"
            [ngModel]="to()"
            (ngModelChange)="to.set($event)"
            name="to"
            required
          />
        </div>

        <div class="filter-field">
          <label id="gran-label">Granularidad</label>
          <div class="granularity-toggle" role="radiogroup" aria-labelledby="gran-label">
            <button
              type="button"
              class="gran-btn"
              [class.gran-btn--active]="granularity() === 'DAY'"
              (click)="setGranularity('DAY')"
              role="radio"
              [attr.aria-checked]="granularity() === 'DAY'"
            >
              Día
            </button>
            <button
              type="button"
              class="gran-btn"
              [class.gran-btn--active]="granularity() === 'WEEK'"
              (click)="setGranularity('WEEK')"
              role="radio"
              [attr.aria-checked]="granularity() === 'WEEK'"
            >
              Semana
            </button>
            <button
              type="button"
              class="gran-btn"
              [class.gran-btn--active]="granularity() === 'MONTH'"
              (click)="setGranularity('MONTH')"
              role="radio"
              [attr.aria-checked]="granularity() === 'MONTH'"
            >
              Mes
            </button>
          </div>
        </div>

        <div class="filter-actions">
          <app-button
            type="submit"
            variant="primary"
            [loading]="cargando()"
          >
            Actualizar gráfico
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

    <!-- KPIs de actividad -->
    @if (!cargando() && items().length > 0) {
      <div class="stat-grid summary-grid">
        <div class="stat-card-mini stat-card-mini--blue">
          <span class="label">Total Movimientos</span>
          <span class="value">{{ totalMovimientos() | appNumber }}</span>
        </div>
        <div class="stat-card-mini stat-card-mini--teal">
          <span class="label">Períodos con Actividad</span>
          <span class="value">{{ items().length }}</span>
        </div>
        <div class="stat-card-mini stat-card-mini--purple">
          <span class="label">Pico Máximo</span>
          <span class="value">{{ maxCantidad() }} mov.</span>
        </div>
        <div class="stat-card-mini stat-card-mini--green">
          <span class="label">Promedio por Período</span>
          <span class="value">{{ promedio() }}</span>
        </div>
      </div>

      <!-- Gráfico SVG Puro -->
      <div class="data-panel chart-panel">
        <div class="panel-head">
          <h2>Tendencia de movimientos</h2>
          <span class="panel-hint">Distribución por {{ granularidadLabel() }}</span>
        </div>

        <div class="svg-container" role="img" aria-label="Gráfico de barras de movimientos por fecha">
          <svg
            viewBox="0 0 800 320"
            class="chart-svg"
            preserveAspectRatio="xMidYMid meet"
          >
            <!-- Líneas guía horizontales -->
            <line x1="60" y1="40" x2="780" y2="40" class="grid-line" />
            <text x="50" y="44" class="axis-label">{{ maxCantidad() }}</text>

            <line x1="60" y1="130" x2="780" y2="130" class="grid-line" />
            <text x="50" y="134" class="axis-label">{{ Math.round(maxCantidad() / 2) }}</text>

            <line x1="60" y1="220" x2="780" y2="220" class="grid-line" />
            <text x="50" y="224" class="axis-label">0</text>

            <!-- Eje base -->
            <line x1="60" y1="220" x2="780" y2="220" class="axis-base" />

            <!-- Barras -->
            @for (bar of chartBars(); track bar.fecha) {
              <g class="bar-group" tabindex="0">
                <title>{{ bar.label }}: {{ bar.cantidad }} movimientos</title>
                <rect
                  [attr.x]="bar.x"
                  [attr.y]="bar.y"
                  [attr.width]="bar.width"
                  [attr.height]="bar.height"
                  class="chart-bar"
                  rx="4"
                />
                <!-- Valor sobre la barra si cabe -->
                @if (bar.height > 16) {
                  <text
                    [attr.x]="bar.x + bar.width / 2"
                    [attr.y]="bar.y - 6"
                    class="bar-val-label"
                  >
                    {{ bar.cantidad }}
                  </text>
                }
                <!-- Label en eje X -->
                <text
                  [attr.x]="bar.x + bar.width / 2"
                  y="245"
                  class="bar-x-label"
                  [attr.transform]="bar.xLabelTransform"
                >
                  {{ bar.label }}
                </text>
              </g>
            }
          </svg>
        </div>
      </div>

      <!-- Tabla complementaria -->
      <div class="data-panel">
        <div class="panel-head">
          <h2>Detalle de movimientos por período</h2>
        </div>

        <div class="table-wrapper">
          <table class="data-table" aria-label="Detalle por período">
            <thead>
              <tr>
                <th scope="col">Período</th>
                <th scope="col" class="text-right">Movimientos</th>
                <th scope="col" style="width: 45%;">Distribución</th>
              </tr>
            </thead>
            <tbody>
              @for (item of items(); track item.fecha) {
                <tr>
                  <td class="font-weight-500 font-mono">{{ item.label }}</td>
                  <td class="text-right font-weight-bold font-lg text-primary">
                    {{ item.cantidad }}
                  </td>
                  <td>
                    <div class="progress-track" [attr.aria-valuenow]="item.porcentaje">
                      <div
                        class="progress-fill"
                        [style.width.%]="item.porcentaje"
                      ></div>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    } @else if (!cargando() && !errorMensaje()) {
      <div class="data-panel empty-panel">
        <div class="empty-state">
          <h2>Sin movimientos registrados</h2>
          <p>No se encontraron movimientos en el rango de fechas seleccionado.</p>
        </div>
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

    .granularity-toggle {
      display: inline-flex;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      overflow: hidden;
      min-height: 40px;
      background: var(--color-surface);
    }

    .gran-btn {
      padding: 0 var(--space-3);
      border: none;
      background: transparent;
      font-size: var(--font-size-sm);
      font-weight: 600;
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: all 0.15s;
    }

    .gran-btn:hover:not(.gran-btn--active) {
      background: var(--color-surface-hover);
      color: var(--color-text-primary);
    }

    .gran-btn--active {
      background: var(--color-primary);
      color: var(--color-on-color);
    }

    .gran-btn:focus-visible {
      outline: 2px solid var(--color-focus-ring);
      outline-offset: -2px;
    }

    .filter-actions {
      display: flex;
      gap: var(--space-2);
      align-items: center;
    }

    .summary-grid {
      margin-bottom: var(--space-5);
    }

    .chart-panel {
      margin-bottom: var(--space-5);
    }

    .svg-container {
      width: 100%;
      overflow-x: auto;
      padding: var(--space-2) 0;
    }

    .chart-svg {
      width: 100%;
      height: auto;
      max-height: 380px;
    }

    .grid-line {
      stroke: var(--color-border);
      stroke-dasharray: 4 4;
      stroke-width: 1;
    }

    .axis-base {
      stroke: var(--color-border-strong, var(--color-border));
      stroke-width: 1.5;
    }

    .axis-label {
      font-family: var(--font-mono);
      font-size: 11px;
      fill: var(--color-text-muted);
      text-anchor: end;
    }

    .chart-bar {
      fill: var(--color-primary);
      transition: fill 0.15s, transform 0.15s;
      cursor: pointer;
    }

    .bar-group:hover .chart-bar,
    .bar-group:focus-visible .chart-bar {
      fill: var(--color-primary-hover);
      filter: brightness(1.1);
    }

    .bar-val-label {
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 700;
      fill: var(--color-text-primary);
      text-anchor: middle;
    }

    .bar-x-label {
      font-family: var(--font-mono);
      font-size: 10px;
      fill: var(--color-text-secondary);
      text-anchor: middle;
    }

    /* Tabla y barras de progreso */
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

    .progress-track {
      height: 12px;
      background: var(--color-surface-raised);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-full);
      overflow: hidden;
      width: 100%;
    }

    .progress-fill {
      height: 100%;
      background: var(--color-primary);
      border-radius: var(--radius-full);
      transition: width 0.3s ease;
    }

    .text-right { text-align: right; }
    .font-mono { font-family: var(--font-mono); }
    .font-lg { font-size: 1rem; }
    .font-weight-500 { font-weight: 500; }
    .font-weight-bold { font-weight: 700; }
    .text-primary { color: var(--color-primary); }

    .empty-panel {
      text-align: center;
    }

    .empty-state {
      padding: var(--space-10) var(--space-6);
    }

    .alert-box {
      margin-bottom: var(--space-5);
    }
  `]
})
export class EstadisticasPage implements OnInit {
  protected readonly Math = Math;
  private readonly estadisticasApi = inject(EstadisticasApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  readonly navItems = REPORTES_NAV_ITEMS;

  readonly from = signal('');
  readonly to = signal('');
  readonly granularity = signal<Granularidad>('DAY');

  readonly rawData = signal<EstadisticasResponse>({});
  readonly cargando = signal(false);
  readonly errorMensaje = signal('');

  // Items ordenados cronológicamente
  readonly items = computed<ItemEstadistica[]>(() => {
    const raw = this.rawData();
    const keys = Object.keys(raw).sort();
    if (!keys.length) return [];

    let max = 0;
    for (const k of keys) {
      if (raw[k] > max) max = raw[k];
    }
    const maxVal = max > 0 ? max : 1;

    return keys.map(k => ({
      fecha: k,
      label: this.formatLabel(k, this.granularity()),
      cantidad: raw[k],
      porcentaje: Math.round((raw[k] / maxVal) * 100)
    }));
  });

  readonly totalMovimientos = computed(() =>
    this.items().reduce((sum, item) => sum + item.cantidad, 0)
  );

  readonly maxCantidad = computed(() => {
    const it = this.items();
    if (!it.length) return 1;
    const m = Math.max(...it.map(i => i.cantidad));
    return m > 0 ? m : 1;
  });

  readonly promedio = computed(() => {
    const it = this.items();
    if (!it.length) return '0';
    return (this.totalMovimientos() / it.length).toFixed(1);
  });

  readonly granularidadLabel = computed(() => {
    switch (this.granularity()) {
      case 'DAY': return 'día';
      case 'WEEK': return 'semana';
      case 'MONTH': return 'mes';
    }
  });

  // Cálculo de coordenadas SVG para las barras
  readonly chartBars = computed(() => {
    const items = this.items();
    if (!items.length) return [];

    const chartWidth = 720; // 780 - 60
    const startX = 60;
    const baseY = 220;
    const maxHeight = 180; // 220 - 40
    const max = this.maxCantidad();

    const n = items.length;
    const slotWidth = chartWidth / n;
    const barWidth = Math.min(Math.max(slotWidth * 0.65, 8), 44);

    return items.map((item, idx) => {
      const x = startX + idx * slotWidth + (slotWidth - barWidth) / 2;
      const height = Math.max(Math.round((item.cantidad / max) * maxHeight), 2);
      const y = baseY - height;

      // Si hay más de 12 elementos, rotar ligeramente el label
      const xLabelTransform = n > 12
        ? `rotate(-40, ${x + barWidth / 2}, 245)`
        : '';

      return {
        fecha: item.fecha,
        label: item.label,
        cantidad: item.cantidad,
        x,
        y,
        width: barWidth,
        height,
        xLabelTransform
      };
    });
  });

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    const defaultRange = getLimaMonthRange();

    this.from.set(q.get('from') || defaultRange.desde);
    this.to.set(q.get('to') || defaultRange.hasta);
    const g = q.get('granularity') as Granularidad;
    if (g === 'DAY' || g === 'WEEK' || g === 'MONTH') {
      this.granularity.set(g);
    }

    this.cargar();
  }

  setGranularity(g: Granularidad): void {
    this.granularity.set(g);
    this.cargar();
  }

  resetFiltros(): void {
    const defaultRange = getLimaMonthRange();
    this.from.set(defaultRange.desde);
    this.to.set(defaultRange.hasta);
    this.granularity.set('DAY');
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorMensaje.set('');

    const params: EstadisticasParams = {
      from: this.from(),
      to: this.to(),
      granularity: this.granularity()
    };

    const urlTree = this.router.createUrlTree([], {
      relativeTo: this.route,
      queryParams: params
    });
    this.location.replaceState(urlTree.toString());

    this.estadisticasApi.getEstadisticas(params).subscribe({
      next: res => {
        this.rawData.set(res);
        this.cargando.set(false);
      },
      error: err => {
        this.errorMensaje.set(parseApiError(err).message);
        this.cargando.set(false);
      }
    });
  }

  private formatLabel(key: string, gran: Granularidad): string {
    switch (gran) {
      case 'DAY': {
        // key is yyyy-MM-dd -> 'DD/MM'
        const parts = key.split('-');
        return parts.length === 3 ? `${parts[2]}/${parts[1]}` : key;
      }
      case 'WEEK': {
        // key is lunes de la semana -> 'Sem. DD/MM'
        const parts = key.split('-');
        return parts.length === 3 ? `Sem. ${parts[2]}/${parts[1]}` : key;
      }
      case 'MONTH': {
        // key is yyyy-MM-01 -> 'MM/YYYY'
        const parts = key.split('-');
        return parts.length === 3 ? `${parts[1]}/${parts[0]}` : key;
      }
    }
  }
}
