// src/app/shared/ui/button/button.ts
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Spinner } from '../spinner/spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [Spinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './button.html',
  styleUrl: './button.css'
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input<boolean>(false);
  readonly loading = input<boolean>(false);
  readonly block = input<boolean>(false);
  readonly hideTextOnLoading = input<boolean>(false);

  readonly btnClick = output<MouseEvent>();

  onClick(event: MouseEvent): void {
    if (!this.disabled() && !this.loading()) {
      this.btnClick.emit(event);
    }
  }
}
