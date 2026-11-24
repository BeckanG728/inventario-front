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
  templateUrl: './producto-detalle-dialog.html',
  styleUrl: './producto-detalle-dialog.css'
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
