// src/app/features/inventario/movimientos/reporte-movimientos-page.ts
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
  ReporteMovimientosParams,
  ReporteMovimientosResponse
} from '@core/api/reportes/reportes.models';
import { parseApiError } from '@core/api/api-error';
import { getLimaMonthRange } from '@shared/format/date.util';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { Button } from '@shared/ui/button/button';
import { Badge } from '@shared/ui/badge/badge';
import { Pagination } from '@shared/ui/pagination/pagination';
import { DateTimePipe } from '@shared/format/date-time.pipe';
import { CurrencyPipe } from '@shared/format/currency.pipe';

@Component({
  selector: 'app-reporte-movimientos-page',
  standalone: true,
  imports: [
    FormsModule,
    PageHeader,
    Button,
    Badge,
    Pagination,
    DateTimePipe,
    CurrencyPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reporte-movimientos-page.html',
  styleUrl: './reporte-movimientos-page.css'
})
export class ReporteMovimientosPage implements OnInit {
  private readonly reportesApi = inject(ReportesApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  // Estado de filtros
  readonly desde = signal('');
  readonly hasta = signal('');
  readonly tipo = signal<'ENTRADA' | 'CONSUMO' | 'AJUSTE' | ''>('');
  readonly page = signal(0);
  readonly size = signal(10);

  // Estado de datos
  readonly data = signal<ReporteMovimientosResponse | null>(null);
  readonly cargando = signal(false);
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
    this.errorMensaje.set('');
    if (!this.desde() || !this.hasta() || this.hasta() < this.desde()) {
      this.cargando.set(false);
      this.errorMensaje.set('Selecciona un rango de fechas válido: "desde" no puede ser posterior a "hasta".');
      return;
    }

    this.cargando.set(true);

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
}
