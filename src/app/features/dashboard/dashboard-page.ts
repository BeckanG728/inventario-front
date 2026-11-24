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
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.css'
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
