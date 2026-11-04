// src/app/shared/ui/stepper/stepper.ts
import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

@Component({
  selector: 'app-stepper',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stepper" [class.stepper--disabled]="disabled()">
      <button
        type="button"
        class="stepper__btn stepper__btn--minus"
        [disabled]="disabled() || isMin()"
        (click)="decrement()"
        aria-label="Disminuir cantidad"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>

      <input
        type="text"
        inputmode="numeric"
        pattern="[0-9]*"
        class="stepper__input font-mono"
        [value]="value()"
        [disabled]="disabled()"
        (change)="onInputChange($event)"
        (blur)="onInputBlur($event)"
        aria-label="Cantidad seleccionada"
      />

      <button
        type="button"
        class="stepper__btn stepper__btn--plus"
        [disabled]="disabled() || isMax()"
        (click)="increment()"
        aria-label="Aumentar cantidad"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
    }

    .stepper {
      display: inline-flex;
      align-items: center;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background-color: var(--color-surface);
      overflow: hidden;
      height: var(--touch-target-min);
    }

    .stepper__btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 100%;
      min-height: var(--touch-target-min);
      border: none;
      background-color: var(--color-surface);
      color: var(--color-text-primary);
      cursor: pointer;
      user-select: none;
      transition: background-color var(--duration-fast) var(--easing-out);
    }

    .stepper__btn:hover:not(:disabled) {
      background-color: var(--color-surface-hover);
    }

    .stepper__btn:active:not(:disabled) {
      transform: translateY(1px);
    }

    .stepper__btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .stepper__input {
      width: 56px;
      height: 100%;
      border: none;
      border-left: 1px solid var(--color-border);
      border-right: 1px solid var(--color-border);
      background-color: var(--color-surface);
      color: var(--color-text-primary);
      text-align: center;
      font-size: 1rem;
      font-weight: 700;
      padding: 0 4px;
    }

    .stepper__input:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: -2px;
      z-index: 1;
    }

    .stepper--disabled {
      opacity: 0.5;
    }
  `]
})
export class Stepper {
  readonly min = input<number>(1);
  readonly max = input<number | undefined>(undefined);
  readonly step = input<number>(1);
  readonly disabled = input<boolean>(false);

  readonly value = model<number>(1);

  readonly isMin = computed(() => this.value() <= this.min());
  readonly isMax = computed(() => {
    const maxVal = this.max();
    return maxVal !== undefined && this.value() >= maxVal;
  });

  increment(): void {
    const current = this.value();
    const maxVal = this.max();
    const next = current + this.step();
    if (maxVal === undefined || next <= maxVal) {
      this.value.set(next);
    }
  }

  decrement(): void {
    const current = this.value();
    const minVal = this.min();
    const next = current - this.step();
    if (next >= minVal) {
      this.value.set(next);
    }
  }

  onInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const parsed = parseInt(target.value, 10);
    this.applyBoundedValue(parsed, target);
  }

  onInputBlur(event: FocusEvent): void {
    const target = event.target as HTMLInputElement;
    const parsed = parseInt(target.value, 10);
    this.applyBoundedValue(parsed, target);
  }

  private applyBoundedValue(parsed: number, target: HTMLInputElement): void {
    let finalVal = Number.isNaN(parsed) ? this.min() : parsed;
    const minVal = this.min();
    const maxVal = this.max();

    if (finalVal < minVal) finalVal = minVal;
    if (maxVal !== undefined && finalVal > maxVal) finalVal = maxVal;

    this.value.set(finalVal);
    target.value = String(finalVal);
  }
}
