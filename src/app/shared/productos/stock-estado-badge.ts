// src/app/shared/productos/stock-estado-badge.ts
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Badge, BadgeSize, BadgeVariant } from '../ui/badge/badge';

@Component({
  selector: 'app-stock-estado-badge',
  standalone: true,
  imports: [Badge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stock-estado-badge.html'
})
export class StockEstadoBadge {
  readonly stockActual = input.required<number>();
  readonly stockMinimo = input.required<number>();
  readonly size = input<BadgeSize>('sm');

  readonly badgeVariant = computed<BadgeVariant>(() => {
    const actual = this.stockActual();
    const minimo = this.stockMinimo();

    if (actual === 0) return 'danger';
    if (actual <= minimo) return 'warning';
    return 'success';
  });

  readonly badgeLabel = computed<string>(() => {
    const actual = this.stockActual();
    const minimo = this.stockMinimo();

    if (actual === 0) return 'Sin stock';
    if (actual <= minimo) return 'Bajo stock';
    return 'Normal';
  });
}
