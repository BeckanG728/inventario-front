// src/app/shared/ui/modal/modal.ts
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  model,
  output,
  viewChild
} from '@angular/core';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'app-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './modal.html',
  styleUrl: './modal.css'
})
export class Modal {
  readonly title = input.required<string>();
  readonly size = input<ModalSize>('md');
  readonly showCloseButton = input<boolean>(true);
  readonly closeOnBackdrop = input<boolean>(true);

  readonly isOpen = model<boolean>(false);
  readonly closed = output<void>();

  private readonly dialogRef = viewChild<ElementRef<HTMLDialogElement>>('dialogRef');
  private previousActiveElement: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const open = this.isOpen();
      const dialog = this.dialogRef()?.nativeElement;
      if (!dialog) return;

      if (open) {
        if (!dialog.open) {
          this.previousActiveElement = document.activeElement as HTMLElement | null;
          dialog.showModal();
        }
      } else {
        if (dialog.open) {
          dialog.close();
          this.previousActiveElement?.focus();
        }
      }
    });
  }

  close(): void {
    this.isOpen.set(false);
    this.closed.emit();
  }

  onCancel(event: Event): void {
    // Al pulsar Escape en el teclado
    event.preventDefault();
    this.close();
  }

  onBackdropClick(event: MouseEvent): void {
    if (this.closeOnBackdrop() && event.target === this.dialogRef()?.nativeElement) {
      this.close();
    }
  }
}
