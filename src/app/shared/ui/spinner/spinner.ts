// src/app/shared/ui/spinner/spinner.ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-spinner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      class="spinner spinner--{{ size() }} spinner--{{ color() }}"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        class="spinner__track"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="3"
      ></circle>
      <path
        class="spinner__thumb"
        d="M12 2A10 10 0 0 1 22 12"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
      ></path>
    </svg>
    <span class="sr-only">{{ label() }}</span>
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }

    .spinner {
      animation: spin 0.75s linear infinite;
    }

    .spinner--sm {
      width: 14px;
      height: 14px;
    }

    .spinner--md {
      width: 18px;
      height: 18px;
    }

    .spinner--lg {
      width: 28px;
      height: 28px;
    }

    .spinner--current {
      color: currentColor;
    }

    .spinner--primary {
      color: var(--color-primary);
    }

    .spinner--white {
      color: var(--color-on-color);
    }

    .spinner__track {
      opacity: 0.25;
    }

    .spinner__thumb {
      opacity: 1;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class Spinner {
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly color = input<'current' | 'primary' | 'white'>('current');
  readonly label = input<string>('Cargando...');
}
