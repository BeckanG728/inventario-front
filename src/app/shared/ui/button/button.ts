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
  template: `
    <button
      [type]="type()"
      [disabled]="disabled() || loading()"
      class="btn btn--{{ variant() }} btn--{{ size() }}"
      [class.btn--loading]="loading()"
      [class.btn--block]="block()"
      (click)="onClick($event)"
    >
      @if (loading()) {
        <app-spinner [size]="size() === 'lg' ? 'md' : 'sm'" color="current" />
      }
      <span class="btn__content" [class.btn__content--hidden]="loading() && hideTextOnLoading()">
        <ng-content />
      </span>
    </button>
  `,
  styles: [`
    :host {
      display: inline-block;
    }

    /* Alinea iconos (svg) y texto proyectados en el mismo eje vertical */
    .btn__content {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
    }

    .btn__content ::ng-deep svg {
      flex-shrink: 0;
      display: block;
    }

    :host([block]) {
      display: block;
      width: 100%;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      border-radius: var(--radius-md);
      font-family: var(--font-family);
      font-weight: 600;
      line-height: 1.25;
      cursor: pointer;
      border: 1px solid transparent;
      text-decoration: none;
      white-space: nowrap;
      user-select: none;
      transition: background-color var(--duration-fast) var(--easing-out),
                  border-color var(--duration-fast) var(--easing-out),
                  color var(--duration-fast) var(--easing-out);
      min-height: var(--touch-target-min);
    }

    /* Tamaños */
    .btn--sm {
      padding: 6px 12px;
      font-size: 13px;
      min-height: 36px;
    }

    .btn--md {
      padding: 10px 18px;
      font-size: var(--font-size-body);
      min-height: 44px;
    }

    .btn--lg {
      padding: 14px 24px;
      font-size: 1rem;
      min-height: 48px;
    }

    .btn--block {
      width: 100%;
    }

    /* Variantes semánticas */
    .btn--primary {
      background-color: var(--color-primary);
      color: var(--color-on-color);
      border-color: transparent;
    }
    .btn--primary:hover:not(:disabled) {
      background-color: var(--color-primary-hover);
    }

    .btn--secondary {
      background-color: var(--color-surface);
      color: var(--color-text-primary);
      border-color: var(--color-border);
    }
    .btn--secondary:hover:not(:disabled) {
      background-color: var(--color-surface-hover);
      border-color: var(--color-border);
    }

    .btn--destructive {
      background-color: var(--color-danger);
      color: var(--color-on-color);
      border-color: transparent;
    }
    .btn--destructive:hover:not(:disabled) {
      background-color: var(--color-danger-hover);
    }

    .btn--outline {
      background-color: transparent;
      color: var(--color-text-primary);
      border-color: var(--color-border);
    }
    .btn--outline:hover:not(:disabled) {
      background-color: var(--color-surface-hover);
    }

    .btn--ghost {
      background-color: transparent;
      color: var(--color-text-primary);
      border-color: transparent;
    }
    .btn--ghost:hover:not(:disabled) {
      background-color: var(--color-surface-hover);
    }

    /* Estados de interacción */
    .btn:active:not(:disabled) {
      transform: translateY(1px);
    }

    .btn:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .btn--loading {
      cursor: wait;
    }

    .btn__content--hidden {
      visibility: hidden;
    }
  `]
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
