// src/app/shared/ui/spinner/spinner.ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-spinner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './spinner.html',
  styleUrl: './spinner.css'
})
export class Spinner {
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly color = input<'current' | 'primary' | 'white'>('current');
  readonly label = input<string>('Cargando...');
}
