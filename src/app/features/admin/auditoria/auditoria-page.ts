// src/app/features/admin/auditoria/auditoria-page.ts
import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuditoriaApi, ListarAuditoriaParams } from '@core/api/auditoria/auditoria-api';
import { AuditoriaResponse, AuditoriaTipo } from '@core/api/auditoria/auditoria.models';
import { parseApiError } from '@core/api/api-error';
import { DateTimePipe } from '@shared/format/date-time.pipe';
import { Badge, BadgeVariant } from '@shared/ui/badge/badge';
import { Button } from '@shared/ui/button/button';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { Pagination } from '@shared/ui/pagination/pagination';

@Component({
  selector: 'app-auditoria-page',
  standalone: true,
  imports: [FormsModule, DateTimePipe, PageHeader, Button, Badge, Pagination],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './auditoria-page.html',
  styleUrl: './auditoria-page.css'
})
export class AuditoriaPage implements OnInit {
  private readonly auditoriaApi = inject(AuditoriaApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  readonly desde = signal('');
  readonly hasta = signal('');
  readonly actor = signal('');
  readonly tipo = signal<AuditoriaTipo | ''>('');
  readonly resultado = signal('');
  readonly page = signal(0);
  readonly size = signal(10);

  readonly registros = signal<AuditoriaResponse[]>([]);
  readonly totalElements = signal(0);
  readonly totalPages = signal(0);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    this.desde.set(q.get('desde') || '');
    this.hasta.set(q.get('hasta') || '');
    this.actor.set(q.get('actor') || '');
    this.tipo.set((q.get('tipo') as AuditoriaTipo | null) || '');
    this.resultado.set(q.get('resultado') || '');
    this.page.set(Number(q.get('page')) || 0);
    this.size.set(Number(q.get('size')) || 10);

    this.cargar();
  }

  onFiltrar(): void {
    this.page.set(0);
    this.sincronizarUrl();
    this.cargar();
  }

  limpiarFiltros(): void {
    this.desde.set('');
    this.hasta.set('');
    this.actor.set('');
    this.tipo.set('');
    this.resultado.set('');
    this.page.set(0);
    this.sincronizarUrl();
    this.cargar();
  }

  onPageChange(page: number): void {
    this.page.set(page);
    this.sincronizarUrl();
    this.cargar();
  }

  tipoVariant(tipo: AuditoriaTipo): BadgeVariant {
    return tipo === 'AUTENTICACION' ? 'accent' : 'info';
  }

  tipoLabel(tipo: AuditoriaTipo): string {
    return tipo === 'AUTENTICACION' ? 'Autenticación' : 'Operación';
  }

  resultadoVariant(registro: AuditoriaResponse): BadgeVariant {
    if (registro.resultado === 'ERROR') return 'danger';
    if (registro.exito) return 'success';
    return 'warning';
  }

  private cargar(): void {
    this.errorMessage.set(null);

    if (this.desde() && this.hasta() && this.hasta() < this.desde()) {
      this.loading.set(false);
      this.errorMessage.set('La fecha "hasta" no puede ser anterior a "desde".');
      return;
    }

    this.loading.set(true);

    const params: ListarAuditoriaParams = {
      page: this.page(),
      size: this.size(),
      desde: this.desde() || undefined,
      hasta: this.hasta() || undefined,
      actor: this.actor().trim() || undefined,
      tipo: this.tipo() || undefined,
      resultado: this.resultado().trim() || undefined
    };

    this.auditoriaApi.listar(params).subscribe({
      next: resp => {
        this.loading.set(false);
        this.registros.set(resp.content);
        this.totalElements.set(resp.totalElements);
        this.totalPages.set(resp.totalPages);
      },
      error: err => {
        this.loading.set(false);
        this.errorMessage.set(parseApiError(err).message || 'Error al cargar la auditoría.');
      }
    });
  }

  private sincronizarUrl(): void {
    const urlTree = this.router.createUrlTree([], {
      relativeTo: this.route,
      queryParams: {
        desde: this.desde() || null,
        hasta: this.hasta() || null,
        actor: this.actor().trim() || null,
        tipo: this.tipo() || null,
        resultado: this.resultado().trim() || null,
        page: this.page(),
        size: this.size()
      }
    });
    this.location.replaceState(urlTree.toString());
  }
}
