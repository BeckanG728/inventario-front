// src/app/shared/ui/stepper/stepper.ts
import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

@Component({
  selector: 'app-stepper',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stepper.html',
  styleUrl: './stepper.css'
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
