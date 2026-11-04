// src/app/shared/ui/field/field.ts
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="field" [class.field--error]="hasError()" [class.field--pill]="variant() === 'pill'">
      @if (label()) {
        <label [attr.for]="forId()" class="field__label">
          {{ label() }}
          @if (required()) {
            <span class="field__required" aria-hidden="true">*</span>
          }
        </label>
      }

      <div class="field__control">
        <ng-content />
      </div>

      @if (hasError()) {
        <div [id]="errorId()" class="field__error" role="alert">
          {{ error() }}
        </div>
      } @else if (hint()) {
        <div [id]="hintId()" class="field__hint">
          {{ hint() }}
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      margin-bottom: var(--space-3);
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .field__label {
      font-size: 13px;
      font-weight: 600;
      color: var(--color-text-primary);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .field__required {
      color: var(--color-danger);
    }

    .field__control {
      position: relative;
    }

    /* Estilos proyectados sobre inputs/selects nativos */
    ::ng-deep .field__control input,
    ::ng-deep .field__control select,
    ::ng-deep .field__control textarea {
      width: 100%;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 10px 14px;
      font-size: var(--font-size-body);
      font-family: var(--font-family);
      color: var(--color-text-primary);
      background-color: var(--color-input-bg);
      transition: border-color var(--duration-fast) var(--easing-out),
                  box-shadow var(--duration-fast) var(--easing-out);
      min-height: var(--touch-target-min);
    }

    ::ng-deep .field--pill .field__control input {
      border-radius: var(--radius-pill);
      padding: 12px 18px;
    }

    ::ng-deep .field__control input:focus-visible,
    ::ng-deep .field__control select:focus-visible,
    ::ng-deep .field__control textarea:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 1px;
      border-color: var(--color-primary);
    }

    ::ng-deep .field--error .field__control input,
    ::ng-deep .field--error .field__control select,
    ::ng-deep .field--error .field__control textarea {
      border-color: var(--color-danger);
    }

    ::ng-deep .field--error .field__control input:focus-visible,
    ::ng-deep .field--error .field__control select:focus-visible,
    ::ng-deep .field--error .field__control textarea:focus-visible {
      outline: 2px solid var(--color-danger);
      outline-offset: 1px;
    }

    .field__error {
      font-size: 12px;
      color: var(--color-danger);
      font-weight: 500;
    }

    .field__hint {
      font-size: 12px;
      color: var(--color-text-secondary);
    }
  `]
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
