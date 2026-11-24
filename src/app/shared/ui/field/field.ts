// src/app/shared/ui/field/field.ts
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './field.html',
  styleUrl: './field.css'
})
export class Field {
  readonly label = input<string>('');
  readonly forId = input<string>('');
  readonly hint = input<string>('');
  readonly error = input<string | null | undefined>(null);
  readonly required = input<boolean>(false);
  readonly variant = input<'default' | 'pill'>('default');

  readonly hasError = computed(() => !!this.error());
  readonly errorId = computed(() => this.forId() ? `${this.forId()}-error` : '');
  readonly hintId = computed(() => this.forId() ? `${this.forId()}-hint` : '');
}
