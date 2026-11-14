// src/app/features/catalogo/productos/producto-detalle-dialog.ts
import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductoResponse } from '@core/api/productos/productos.models';
import { CurrencyPipe } from '@shared/format/currency.pipe';
import { StockEstadoBadge } from '@shared/productos/stock-estado-badge';
import { Modal } from '@shared/ui/modal/modal';
import { Badge } from '@shared/ui/badge/badge';
import { Button } from '@shared/ui/button/button';

/**
 * Modal de solo consulta del producto. No contiene formularios:
 * la edición se hace desde ProductoFormDialog.
 */
@Component({
  selector: 'app-producto-detalle-dialog',
  standalone: true,
  imports: [RouterLink, CurrencyPipe, StockEstadoBadge, Modal, Badge, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal title="Detalle del producto" size="xl" [(isOpen)]="isOpen">
      @if (producto(); as p) {
        <div class="detail-head">
          <div class="detail-head__text">
            <h4 class="detail-name">{{ p.nombre }}</h4>
            <span class="detail-sku font-mono">{{ p.codigo }}</span>
          </div>
          @if (p.activo) {
            <app-badge variant="neutral" size="md">Activo</app-badge>
          } @else {
            <app-badge variant="danger" size="md">Inactivo</app-badge>
          }
        </div>

        <div class="detail-sections">
        <section class="detail-section" aria-labelledby="det-general">
          <h5 id="det-general" class="detail-section__title">Información general</h5>
          <dl class="detail-grid">
            <div class="detail-item detail-item--full">
              <dt>Descripción</dt>
              <dd>{{ p.descripcion || 'Sin descripción registrada' }}</dd>
            </div>
            <div class="detail-item">
              <dt>Categoría</dt>
              <dd>{{ p.categoriaNombre || '—' }}</dd>
            </div>
            <div class="detail-item">
              <dt>Unidad de medida</dt>
              <dd>{{ p.unidadMedida }}</dd>
            </div>
          </dl>
        </section>

        <section class="detail-section" aria-labelledby="det-inventario">
          <h5 id="det-inventario" class="detail-section__title">Información de inventario</h5>
          <dl class="detail-grid">
            <div class="detail-item">
              <dt>Stock actual</dt>
              <dd class="font-mono detail-value--strong">{{ p.stockActual }}</dd>
            </div>
            <div class="detail-item">
              <dt>Stock mínimo</dt>
              <dd class="font-mono">{{ p.stockMinimo }}</dd>
            </div>
            <div class="detail-item">
              <dt>Estado del inventario</dt>
              <dd>
                <app-stock-estado-badge [stockActual]="p.stockActual" [stockMinimo]="p.stockMinimo" />
              </dd>
            </div>
          </dl>
          @if (canAdjustStockMinimo()) {
            <div class="detail-inline-action">
              <app-button variant="secondary" size="sm" (btnClick)="stockMinimoClick.emit()">
                Ajustar stock mínimo
              </app-button>
            </div>
          }
        </section>

        @if (showCompras()) {
          <section class="detail-section" aria-labelledby="det-compras">
            <h5 id="det-compras" class="detail-section__title">Información de compras</h5>
            <dl class="detail-grid">
              <div class="detail-item">
                <dt>Último costo de adquisición</dt>
                <dd class="font-mono">
                  {{ p.costoUltimaCompra !== null ? (p.costoUltimaCompra | appCurrency) : 'Sin compras registradas' }}
                </dd>
              </div>
              <div class="detail-item">
                <dt>Proveedor habitual</dt>
                <dd>{{ p.proveedorRazonSocial || '—' }}</dd>
              </div>
            </dl>
          </section>

          <section class="detail-section" aria-labelledby="det-historial">
            <h5 id="det-historial" class="detail-section__title">Historial de movimientos</h5>
            <p class="detail-note">
              El historial completo de entradas, consumos y ajustes se consulta en el reporte de movimientos.
            </p>
            <a class="detail-link" routerLink="/reportes/movimientos" (click)="isOpen.set(false)">
              Ir al reporte de movimientos
            </a>
          </section>
        }
        </div>
      }

      <div modal-footer class="detail-actions">
        <app-button variant="secondary" (btnClick)="isOpen.set(false)">Cerrar</app-button>
      </div>
    </app-modal>
  `,
  styles: [`
    .detail-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3);
      padding-bottom: var(--space-4);
      margin-bottom: var(--space-4);
      border-bottom: 1px solid var(--color-border-soft);
    }

    .detail-head__text {
      min-width: 0;
    }

    .detail-name {
      margin: 0 0 var(--space-1) 0;
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--color-text-primary);
      overflow-wrap: anywhere;
    }

    .detail-sku {
      font-size: 13px;
      color: var(--color-text-secondary);
    }

    .detail-sections {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: var(--space-5);
    }

    .detail-sections .detail-section + .detail-section {
      margin-top: 0;
    }

    @media (min-width: 900px) {
      .detail-sections {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--space-5) var(--space-8);
        align-items: start;
      }
    }

    .detail-section__title {
      margin: 0 0 var(--space-3) 0;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--color-text-secondary);
    }

    .detail-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-3) var(--space-5);
      margin: 0;
    }

    @media (min-width: 600px) {
      .detail-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .detail-item--full {
        grid-column: 1 / -1;
      }
    }

    .detail-item dt {
      font-size: 12px;
      color: var(--color-text-secondary);
      margin-bottom: 2px;
    }

    .detail-item dd {
      margin: 0;
      font-size: var(--font-size-body);
      color: var(--color-text-primary);
      overflow-wrap: anywhere;
    }

    .detail-value--strong {
      font-weight: 700;
    }

    .detail-note {
      margin: 0 0 var(--space-2) 0;
      font-size: 13px;
      color: var(--color-text-secondary);
    }

    .detail-link {
      font-size: 13px;
      font-weight: 600;
      color: var(--color-blue-text);
      text-decoration: none;
    }

    .detail-link:hover {
      text-decoration: underline;
    }

    .detail-link:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
      border-radius: var(--radius-sm);
    }

    .detail-inline-action {
      margin-top: var(--space-3);
    }

    .detail-actions {
      display: flex;
      justify-content: flex-end;
      width: 100%;
    }
  `]
})
export class ProductoDetalleDialog {
  readonly producto = input<ProductoResponse | null>(null);
  /** Costos y proveedor solo se muestran a quien ya los ve en la tabla (JEFE_TALLER). */
  readonly showCompras = input<boolean>(false);
  /** Solo JEFE_TALLER: muestra el acceso al formulario existente de stock mínimo (el modal sigue siendo de consulta). */
  readonly canAdjustStockMinimo = input<boolean>(false);
  readonly stockMinimoClick = output<void>();
  readonly isOpen = model<boolean>(false);
}
