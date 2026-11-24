// src/app/features/reportes/valor-inventario/valor-inventario-page.ts
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { ReportesApi } from '@core/api/reportes/reportes-api';
import {
  ExportValorInventarioParams,
  ValorInventarioResponse
} from '@core/api/reportes/reportes.models';
import { parseApiError } from '@core/api/api-error';
import { ToastService } from '@core/notifications/toast-service';
import { downloadHttpResponse } from '@shared/download/download.util';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { PillNav } from '@shared/ui/pill-nav/pill-nav';
import { Button } from '@shared/ui/button/button';
import { CurrencyPipe } from '@shared/format/currency.pipe';
import { NumberPipe } from '@shared/format/number.pipe';
import { Pagination } from '@shared/ui/pagination/pagination';
import { REPORTES_NAV_ITEMS } from '../reportes-nav';
import { BotonesExportar } from './botones-exportar';

@Component({
  selector: 'app-valor-inventario-page',
  standalone: true,
  imports: [
    PageHeader,
    PillNav,
    Button,
    CurrencyPipe,
    NumberPipe,
    BotonesExportar,
    Pagination
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './valor-inventario-page.html',
  styleUrl: './valor-inventario-page.css'
})
export class ValorInventarioPage implements OnInit {
  private readonly reportesApi = inject(ReportesApi);
  private readonly toast = inject(ToastService);

  readonly navItems = REPORTES_NAV_ITEMS;

  readonly data = signal<ValorInventarioResponse | null>(null);
  readonly page = signal(0);
  readonly size = signal(10);
  readonly cargando = signal(false);
  readonly exportandoPdf = signal(false);
  readonly exportandoExcel = signal(false);
  readonly errorMensaje = signal('');

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorMensaje.set('');

    this.reportesApi.getValorInventario({ page: this.page(), size: this.size() }).subscribe({
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

  onPageChange(page: number): void {
    this.page.set(page);
    this.cargar();
  }

  onExportar(formato: 'pdf' | 'excel'): void {
    const isPdf = formato === 'pdf';
    if (isPdf) this.exportandoPdf.set(true);
    else this.exportandoExcel.set(true);

    const ext = isPdf ? 'pdf' : 'xlsx';
    const params: ExportValorInventarioParams = { formato };

    this.reportesApi.exportarValorInventario(params).subscribe({
      next: res => {
        downloadHttpResponse(res, `reporte-valor-inventario.${ext}`);
        this.toast.success(`Reporte de valorización descargado (${ext.toUpperCase()})`);
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
