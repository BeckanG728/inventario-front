// src/app/shared/ui/confirm-dialog/confirm-dialog.ts
import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { Modal } from '../modal/modal';
import { Button, ButtonVariant } from '../button/button';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [Modal, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal
      [title]="title()"
      size="sm"
      [(isOpen)]="isOpen"
      (closed)="onCancel()"
    >
      <p class="confirm-message">{{ message() }}</p>

      <div modal-footer class="confirm-actions">
        <app-button
          variant="secondary"
          [disabled]="submitting()"
          (btnClick)="onCancel()"
        >
          {{ cancelText() }}
        </app-button>

        <app-button
          [variant]="confirmVariant()"
          [loading]="submitting()"
          (btnClick)="onConfirm()"
        >
          {{ confirmText() }}
        </app-button>
      </div>
    </app-modal>
  `,
  styles: [`
    .confirm-message {
      margin: 0;
      font-size: var(--font-size-body);
      color: var(--color-text-primary);
      line-height: 1.5;
    }

    .confirm-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-3);
      width: 100%;
    }
  `]
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
