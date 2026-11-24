// src/app/features/reportes/valor-inventario/botones-exportar.ts
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
  templateUrl: './botones-exportar.html',
  styleUrl: './botones-exportar.css'
})
export class BotonesExportar {
  readonly loadingPdf = input<boolean>(false);
  readonly loadingExcel = input<boolean>(false);
  readonly disabled = input<boolean>(false);

  readonly exportPdf = output<void>();
  readonly exportExcel = output<void>();
}
