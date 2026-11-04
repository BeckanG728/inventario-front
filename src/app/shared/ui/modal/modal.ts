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
  template: `
    <dialog
      #dialogRef
      class="modal modal--{{ size() }}"
      (cancel)="onCancel($event)"
      (click)="onBackdropClick($event)"
    >
      <div class="modal__container" (click)="$event.stopPropagation()">
        <header class="modal__header">
          <h3 class="modal__title">{{ title() }}</h3>
          @if (showCloseButton()) {
            <button
              type="button"
              class="modal__close-btn"
              (click)="close()"
              aria-label="Cerrar ventana modal"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          }
        </header>

        <div class="modal__body">
          <ng-content />
        </div>

        <div class="modal__footer">
          <ng-content select="[modal-footer]" />
        </div>
      </div>
    </dialog>
  `,
  styles: [`
    .modal {
      border: none;
      padding: 0;
      background: transparent;
      max-width: 100vw;
      max-height: 100vh;
      margin: auto;
      z-index: var(--z-modal);
    }

    .modal::backdrop {
      background-color: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(2px);
      transition: opacity var(--duration-fast) var(--easing-out);
    }

    .modal__container {
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-panel);
      box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.1);
      width: 100%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: modal-appear var(--duration-fast) var(--easing-out);
    }

    /* Anchos responsivos */
    .modal--sm .modal__container { width: min(400px, 92vw); }
    .modal--md .modal__container { width: min(540px, 92vw); }
    .modal--lg .modal__container { width: min(720px, 92vw); }
    .modal--xl .modal__container { width: min(960px, 95vw); }

    .modal__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-4) var(--space-5);
      border-bottom: 1px solid var(--color-border);
      background-color: var(--color-surface);
    }

    .modal__title {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--color-text-primary);
    }

    .modal__close-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      color: var(--color-text-secondary);
      border-radius: var(--radius-sm);
      cursor: pointer;
      padding: 0;
      transition: background-color var(--duration-fast) var(--easing-out),
                  color var(--duration-fast) var(--easing-out);
    }

    .modal__close-btn:hover {
      background-color: var(--color-surface-hover);
      color: var(--color-text-primary);
    }

    .modal__close-btn:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 1px;
    }

    .modal__body {
      padding: var(--space-5);
      overflow-y: auto;
      flex: 1;
      font-size: var(--font-size-body);
      color: var(--color-text-primary);
    }

    .modal__footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: var(--space-3);
      padding: var(--space-4) var(--space-5);
      border-top: 1px solid var(--color-border);
      background-color: var(--color-bg);
    }

    .modal__footer:empty {
      display: none;
    }

    @keyframes modal-appear {
      from {
        opacity: 0;
        transform: scale(0.97);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
  `]
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
