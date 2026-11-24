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
  templateUrl: './consumo-resultado-dialog.html',
  styleUrl: './consumo-resultado-dialog.css'
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
