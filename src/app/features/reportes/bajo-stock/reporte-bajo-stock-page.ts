// src/app/features/reportes/bajo-stock/reporte-bajo-stock-page.ts
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { ReportesApi } from '@core/api/reportes/reportes-api';
import {
  BajoStockResponse,
  ExportBajoStockParams
} from '@core/api/reportes/reportes.models';
import { parseApiError } from '@core/api/api-error';
import { ToastService } from '@core/notifications/toast-service';
import { downloadHttpResponse } from '@shared/download/download.util';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { PillNav } from '@shared/ui/pill-nav/pill-nav';
import { Button } from '@shared/ui/button/button';
import { Badge } from '@shared/ui/badge/badge';
import { NumberPipe } from '@shared/format/number.pipe';
import { BotonesExportar } from '../compartido/botones-exportar';
import { REPORTES_NAV_ITEMS } from '../reportes-nav';

@Component({
  selector: 'app-reporte-bajo-stock-page',
  standalone: true,
  imports: [
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
      title="Reporte de Bajo Stock por Proveedor"
      subtitle="Productos activos con stock igual o inferior al mínimo configurado, agrupados para solicitud de cotización y compras"
    >
      <app-button
        variant="outline"
        size="sm"
        [loading]="cargando()"
        (btnClick)="cargar()"
        aria-label="Actualizar lista de bajo stock"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" aria-hidden="true">
          <polyline points="23 4 23 10 17 10"/>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
        Actualizar
      </app-button>

      <app-botones-exportar
        [loadingPdf]="exportandoPdf()"
        [loadingExcel]="exportandoExcel()"
        [disabled]="cargando() || grupos().length === 0"
        (exportPdf)="onExportar('pdf')"
        (exportExcel)="onExportar('xlsx')"
      />
    </app-page-header>

    <app-pill-nav [items]="navItems" ariaLabel="Reportes del sistema" />

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

    <!-- Resumen -->
    @if (!cargando() && grupos().length > 0) {
      <div class="stat-grid summary-grid">
        <div class="stat-card-mini stat-card-mini--orange">
          <span class="label">Proveedores Afectados</span>
          <span class="value">{{ grupos().length }}</span>
        </div>
        <div class="stat-card-mini stat-card-mini--red">
          <span class="label">Total Repuestos Críticos</span>
          <span class="value">{{ totalProductos() | appNumber }}</span>
        </div>
        <div class="stat-card-mini stat-card-mini--blue">
          <span class="label">Total Unidades a Reponer</span>
          <span class="value">{{ totalSugerido() | appNumber }} unid.</span>
        </div>
      </div>
    }

    <!-- Estado vacío -->
    @if (!cargando() && !errorMensaje() && grupos().length === 0) {
      <div class="data-panel empty-panel">
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
               stroke="var(--color-success)" stroke-width="1.5" aria-hidden="true">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <h2>¡Excelente! Sin productos bajo stock</h2>
          <p>Todos los productos del taller se encuentran por encima de su stock mínimo de seguridad.</p>
        </div>
      </div>
    }

    <!-- Grupos por Proveedor -->
    @for (g of grupos(); track g.proveedor) {
      <div class="data-panel group-panel">
        <div class="panel-head">
          <div class="proveedor-title-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" class="text-primary" aria-hidden="true">
              <rect x="1" y="3" width="15" height="13"/>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
              <circle cx="5.5" cy="18.5" r="2.5"/>
              <circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
            <h2>{{ g.proveedor }}</h2>
          </div>
          <span class="panel-hint">{{ g.productos.length }} producto{{ g.productos.length !== 1 ? 's' : '' }}</span>
        </div>

        <div class="table-wrapper">
          <table class="data-table" [attr.aria-label]="'Productos de ' + g.proveedor">
            <thead>
              <tr>
                <th scope="col">Código</th>
                <th scope="col">Repuesto / Producto</th>
                <th scope="col" class="text-right">Stock Actual</th>
                <th scope="col" class="text-right">Stock Mínimo</th>
                <th scope="col" class="text-right">Cantidad Sugerida</th>
                <th scope="col" class="text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              @for (p of g.productos; track p.codigo) {
                <tr [class.row--agotado]="p.stockActual === 0">
                  <td class="font-mono text-muted">{{ p.codigo }}</td>
                  <td class="font-weight-500">{{ p.nombre }}</td>
                  <td class="text-right font-weight-bold" [class.text-danger]="p.stockActual === 0">
                    {{ p.stockActual }}
                  </td>
                  <td class="text-right text-muted">{{ p.stockMinimo }}</td>
                  <td class="text-right font-weight-bold font-mono text-primary font-lg">
                    {{ p.sugerido }}
                  </td>
                  <td class="text-center">
                    @if (p.stockActual === 0) {
                      <app-badge variant="danger" size="sm">Agotado</app-badge>
                    } @else {
                      <app-badge variant="warning" size="sm">Bajo stock</app-badge>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }
  `,
  styles: [`
    .summary-grid {
      margin-bottom: var(--space-5);
    }

    .group-panel {
      margin-bottom: var(--space-5);
    }

    .proveedor-title-wrap {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .proveedor-title-wrap h2 {
      margin: 0;
      font-size: var(--font-size-h2);
      color: var(--color-text-primary);
    }

    .panel-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
      margin-bottom: var(--space-3);
    }

    .panel-hint {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
    }

    .empty-panel {
      text-align: center;
    }

    .empty-state {
      padding: var(--space-10) var(--space-6);
    }

    .empty-state svg {
      margin-bottom: var(--space-4);
    }

    .empty-state h2 {
      margin: 0 0 var(--space-2);
      color: var(--color-text-primary);
    }

    .empty-state p {
      margin: 0;
      color: var(--color-text-secondary);
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

    .row--agotado {
      background: color-mix(in srgb, var(--color-danger) 6%, transparent);
    }

    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-mono { font-family: var(--font-mono); }
    .font-lg { font-size: 1rem; }
    .font-weight-500 { font-weight: 500; }
    .font-weight-bold { font-weight: 700; }
    .text-muted { color: var(--color-text-muted); }
    .text-danger { color: var(--color-danger); }
    .text-primary { color: var(--color-primary); }

    .alert-box {
      margin-bottom: var(--space-5);
    }
  `]
})
export class ReporteBajoStockPage implements OnInit {
  private readonly reportesApi = inject(ReportesApi);
  private readonly toast = inject(ToastService);

  readonly navItems = REPORTES_NAV_ITEMS;

  readonly grupos = signal<BajoStockResponse>([]);
  readonly cargando = signal(false);
  readonly exportandoPdf = signal(false);
  readonly exportandoExcel = signal(false);
  readonly errorMensaje = signal('');

  readonly totalProductos = computed(() =>
    this.grupos().reduce((acc, g) => acc + g.productos.length, 0)
  );

  readonly totalSugerido = computed(() =>
    this.grupos().reduce(
      (acc, g) => acc + g.productos.reduce((sum, p) => sum + p.sugerido, 0),
      0
    )
  );

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorMensaje.set('');

    this.reportesApi.getBajoStock().subscribe({
      next: res => {
        this.grupos.set(res);
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
    const fallback = `reporte-bajo-stock.${ext}`;

    const params: ExportBajoStockParams = { formato };

    this.reportesApi.exportarBajoStock(params).subscribe({
      next: res => {
        downloadHttpResponse(res, fallback);
        this.toast.success(`Reporte de bajo stock descargado (${ext.toUpperCase()})`);
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
