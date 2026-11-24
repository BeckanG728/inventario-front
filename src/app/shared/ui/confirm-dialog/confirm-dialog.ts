// src/app/shared/ui/confirm-dialog/confirm-dialog.ts
import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { Modal } from '../modal/modal';
import { Button, ButtonVariant } from '../button/button';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [Modal, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css'
})
export class ConfirmDialog {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmText = input<string>('Confirmar');
  readonly cancelText = input<string>('Cancelar');
  readonly confirmVariant = input<ButtonVariant>('primary');
  readonly submitting = input<boolean>(false);

  readonly isOpen = model<boolean>(false);
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  onConfirm(): void {
    this.confirmed.emit();
  }

  onCancel(): void {
    this.isOpen.set(false);
    this.cancelled.emit();
  }
}
