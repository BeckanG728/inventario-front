// src/app/features/operaciones/consumo/consumo-resultado-dialog.ts
import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { ConsumoResponse } from '@core/api/operaciones/operaciones.models';
import { DateTimePipe } from '@shared/format/date-time.pipe';
import { Modal } from '@shared/ui/modal/modal';
import { Button } from '@shared/ui/button/button';
import { Badge } from '@shared/ui/badge/badge';

@Component({
  selector: 'app-consumo-resultado-dialog',
  standalone: true,
  imports: [Modal, Button, Badge, DateTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal
      title="Consumo registrado exitosamente"
      size="md"
      [(isOpen)]="isOpen"
      (closed)="onClose()"
    >
      @if (consumo(); as c) {
        <div class="success-banner">
          <div class="success-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M20 6L9 17l-5-5"></path>
            </svg>
          </div>
          <div>
            <h3>Consumo #{{ c.id }}</h3>
            <p class="subtitle">{{ c.fecha | appDateTime:'datetime' }}</p>
          </div>
        </div>

        <div class="details-list">
          <div class="detail-row">
            <span class="detail-label">Finalidad / Trabajo:</span>
            <span class="detail-value">{{ c.finalidad }}</span>
          </div>

          @if (c.referenciaVehiculoCliente) {
            <div class="detail-row">
              <span class="detail-label">Vehículo / Cliente:</span>
              <span class="detail-value">{{ c.referenciaVehiculoCliente }}</span>
            </div>
          }
        </div>

        <h4 class="items-title">Repuestos y materiales descontados ({{ c.movimientos.length }})</h4>

        <div class="table-wrapper">
          <table class="items-table">
            <thead>
              <tr>
                <th>Producto (ID)</th>
                <th class="text-right">Cantidad</th>
                <th class="text-right">Stock Anterior</th>
                <th class="text-right">Stock Nuevo</th>
              </tr>
            </thead>
            <tbody>
              @for (m of c.movimientos; track m.id) {
                <tr>
                  <td>
                    <strong>ID #{{ m.productoId }}</strong>
                  </td>
                  <td class="text-right">
                    <app-badge variant="neutral">-{{ m.cantidad }}</app-badge>
                  </td>
                  <td class="text-right text-muted">{{ m.stockAnterior }}</td>
                  <td class="text-right">
                    <strong>{{ m.stockPosterior }}</strong>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <div modal-footer class="dialog-actions">
        <app-button variant="primary" (btnClick)="onClose()">
          Aceptar y continuar
        </app-button>
      </div>
    </app-modal>
  `,
  styles: [`
    .success-banner {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-4);
      background-color: var(--color-success-subtle);
      border: 1px solid var(--color-success-border);
      border-radius: var(--radius-md);
      margin-bottom: var(--space-4);
    }

    .success-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border-radius: var(--radius-full);
      background-color: var(--color-success);
      color: var(--color-on-color);
      flex-shrink: 0;
    }

    .success-banner h3 {
      margin: 0;
      font-size: var(--text-lg);
      font-weight: var(--font-semibold);
      color: var(--color-success-text);
    }

    .subtitle {
      margin: 0;
      font-size: var(--text-xs);
      color: var(--color-text-secondary);
    }

    .details-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      padding: var(--space-3);
      background-color: var(--color-bg-secondary);
      border-radius: var(--radius-sm);
      margin-bottom: var(--space-4);
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      gap: var(--space-2);
      font-size: var(--text-sm);
    }

    .detail-label {
      color: var(--color-text-secondary);
      font-weight: var(--font-medium);
    }

    .detail-value {
      font-weight: var(--font-semibold);
      color: var(--color-text-primary);
      text-align: right;
    }

    .items-title {
      font-size: var(--text-sm);
      font-weight: var(--font-semibold);
      color: var(--color-text-primary);
      margin: var(--space-4) 0 var(--space-2) 0;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--text-sm);
    }

    .items-table th,
    .items-table td {
      padding: var(--space-2) var(--space-3);
      border-bottom: 1px solid var(--color-border);
    }

    .items-table th {
      font-size: var(--text-xs);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-secondary);
      background-color: var(--color-bg-secondary);
    }

    .text-right {
      text-align: right;
    }

    .text-muted {
      color: var(--color-text-tertiary);
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      width: 100%;
    }
  `]
})
export class ConsumoResultadoDialog {
  readonly consumo = input<ConsumoResponse | null>(null);
  readonly isOpen = model<boolean>(false);
  readonly closed = output<void>();

  onClose(): void {
    this.isOpen.set(false);
    this.closed.emit();
  }
}
