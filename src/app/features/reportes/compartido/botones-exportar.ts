// src/app/features/reportes/compartido/botones-exportar.ts
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output
} from '@angular/core';
import { Button } from '@shared/ui/button/button';

@Component({
  selector: 'app-botones-exportar',
  standalone: true,
  imports: [Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="export-actions" role="group" aria-label="Opciones de exportación de reporte">
      <app-button
        variant="outline"
        size="sm"
        [loading]="loadingPdf()"
        [disabled]="disabled() || loadingExcel()"
        (btnClick)="exportPdf.emit()"
        aria-label="Descargar reporte en formato PDF"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
        PDF
      </app-button>

      <app-button
        variant="outline"
        size="sm"
        [loading]="loadingExcel()"
        [disabled]="disabled() || loadingPdf()"
        (btnClick)="exportExcel.emit()"
        aria-label="Descargar reporte en formato Excel"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <path d="M8 13h8"/>
          <path d="M8 17h8"/>
          <path d="M10 9H8"/>
        </svg>
        Excel (.xlsx)
      </app-button>
    </div>
  `,
  styles: [`
    .export-actions {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
    }
  `]
})
export class BotonesExportar {
  readonly loadingPdf = input<boolean>(false);
  readonly loadingExcel = input<boolean>(false);
  readonly disabled = input<boolean>(false);

  readonly exportPdf = output<void>();
  readonly exportExcel = output<void>();
}
