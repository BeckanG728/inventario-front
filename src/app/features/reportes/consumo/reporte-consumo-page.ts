// src/app/features/reportes/consumo/reporte-consumo-page.ts
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
import { ReportesApi } from '@core/api/reportes/reportes-api';
import {
  ExportConsumoParams,
  ReporteConsumoResponse
} from '@core/api/reportes/reportes.models';
import { parseApiError } from '@core/api/api-error';
import { ToastService } from '@core/notifications/toast-service';
import { downloadHttpResponse } from '@shared/download/download.util';
import { getLimaMonthRange } from '@shared/format/date.util';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { PillNav } from '@shared/ui/pill-nav/pill-nav';
import { Button } from '@shared/ui/button/button';
import { Badge } from '@shared/ui/badge/badge';
import { NumberPipe } from '@shared/format/number.pipe';
import { BotonesExportar } from '../compartido/botones-exportar';
import { REPORTES_NAV_ITEMS } from '../reportes-nav';

@Component({
  selector: 'app-reporte-consumo-page',
  standalone: true,
  imports: [
    FormsModule,
    PageHeader,
    PillNav,
    Button,
    Badge,
    NumberPipe,
    BotonesExportar
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="Reporte de Consumo por Mecánico y Repuesto"
      subtitle="Consolidado de repuestos y materiales utilizados agrupados por producto y mecánico"
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
      <form class="filter-form" (ngSubmit)="cargar()">
        <div class="filter-field">
          <label for="consumo-desde">Fecha desde</label>
          <input
            id="consumo-desde"
            type="date"
            class="filter-input"
            [ngModel]="desde()"
            (ngModelChange)="desde.set($event)"
            name="desde"
            required
          />
        </div>

        <div class="filter-field">
          <label for="consumo-hasta">Fecha hasta</label>
          <input
            id="consumo-hasta"
            type="date"
            class="filter-input"
            [ngModel]="hasta()"
            (ngModelChange)="hasta.set($event)"
            name="hasta"
            required
          />
        </div>

        <div class="filter-actions">
          <app-button
            type="submit"
            variant="primary"
            [loading]="cargando()"
          >
            Consultar
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

    <!-- Totales -->
    @if (!cargando() && data().length > 0) {
      <div class="stat-grid summary-grid">
        <div class="stat-card-mini stat-card-mini--purple">
          <span class="label">Total Unidades Consumidas</span>
          <span class="value">{{ totalUnidades() | appNumber }}</span>
        </div>
        <div class="stat-card-mini stat-card-mini--blue">
          <span class="label">Grupos Producto / Mecánico</span>
          <span class="value">{{ data().length }}</span>
        </div>
      </div>
    }

    <!-- Tabla de resultados -->
    <div class="data-panel">
      <div class="table-wrapper">
        <table class="data-table" aria-label="Consolidado de consumos">
          <thead>
            <tr>
              <th scope="col">Código</th>
              <th scope="col">Producto</th>
              <th scope="col">Mecánico</th>
              <th scope="col">Finalidades registradas</th>
              <th scope="col" class="text-right">Movimientos</th>
              <th scope="col" class="text-right">Total Consumido</th>
            </tr>
          </thead>
          <tbody>
            @for (item of data(); track item.productoId + '_' + item.mecanico) {
              <tr>
                <td class="font-mono font-sm text-muted">{{ item.productoCodigo }}</td>
                <td class="font-weight-500">{{ item.productoNombre }}</td>
                <td>
                  <app-badge variant="neutral" size="sm">
                    {{ item.mecanico }}
                  </app-badge>
                </td>
                <td>
                  <div class="tag-list">
                    @for (f of item.finalidades; track f) {
                      <span class="finalidad-tag">{{ f }}</span>
                    }
                  </div>
                </td>
                <td class="text-right text-muted font-sm">
                  {{ item.fechas.length }} reg.
                </td>
                <td class="text-right font-weight-bold font-lg text-primary">
                  {{ item.cantidadTotal }}
                </td>
              </tr>
            } @empty {
              @if (!cargando()) {
                <tr>
                  <td colspan="6" class="text-center text-muted empty-cell">
                    No se registran consumos para el rango de fechas seleccionado.
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
    </div>
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

    .tag-list {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .finalidad-tag {
      font-size: 11px;
      padding: 2px 6px;
      border-radius: var(--radius-sm);
      background: var(--color-surface-raised);
      color: var(--color-text-secondary);
      border: 1px solid var(--color-border);
    }

    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-mono { font-family: var(--font-mono); }
    .font-sm { font-size: var(--font-size-sm); }
    .font-lg { font-size: 1rem; }
    .font-weight-500 { font-weight: 500; }
    .font-weight-bold { font-weight: 700; }
    .text-muted { color: var(--color-text-muted); }
    .text-primary { color: var(--color-primary); }

    .alert-box {
      margin-bottom: var(--space-5);
    }
  `]
})
export class ReporteConsumoPage implements OnInit {
  private readonly reportesApi = inject(ReportesApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly toast = inject(ToastService);

  readonly navItems = REPORTES_NAV_ITEMS;

  readonly desde = signal('');
  readonly hasta = signal('');
  readonly data = signal<ReporteConsumoResponse>([]);
  readonly cargando = signal(false);
  readonly exportandoPdf = signal(false);
  readonly exportandoExcel = signal(false);
  readonly errorMensaje = signal('');

  readonly totalUnidades = computed(() =>
    this.data().reduce((acc, item) => acc + item.cantidadTotal, 0)
  );

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    const defaultRange = getLimaMonthRange();

    this.desde.set(q.get('desde') || defaultRange.desde);
    this.hasta.set(q.get('hasta') || defaultRange.hasta);

    this.cargar();
  }

  resetFiltros(): void {
    const defaultRange = getLimaMonthRange();
    this.desde.set(defaultRange.desde);
    this.hasta.set(defaultRange.hasta);
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorMensaje.set('');

    const urlTree = this.router.createUrlTree([], {
      relativeTo: this.route,
      queryParams: {
        desde: this.desde(),
        hasta: this.hasta()
      }
    });
    this.location.replaceState(urlTree.toString());

    this.reportesApi.getConsumo({
      desde: this.desde(),
      hasta: this.hasta()
    }).subscribe({
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
    const fallback = `reporte-consumo.${ext}`;

    const params: ExportConsumoParams = {
      formato,
      desde: this.desde(),
      hasta: this.hasta()
    };

    this.reportesApi.exportarConsumo(params).subscribe({
      next: res => {
        downloadHttpResponse(res, fallback);
        this.toast.success(`Reporte de consumo descargado (${ext.toUpperCase()})`);
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
