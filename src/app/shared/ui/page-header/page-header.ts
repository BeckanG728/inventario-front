// src/app/shared/ui/page-header/page-header.ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="page-header">
      <div class="page-header__main">
        <h1 class="page-header__title">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="page-header__subtitle">{{ subtitle() }}</p>
        }
      </div>

      <div class="page-header__actions">
        <ng-content />
      </div>
    </header>
  `,
  styles: [`
    :host {
      display: block;
      margin-bottom: var(--space-6);
    }

    .page-header {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    @media (min-width: 768px) {
      .page-header {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
    }

    .page-header__title {
      margin: 0;
      font-size: var(--font-size-h1);
      font-weight: 700;
      color: var(--color-text-primary);
      line-height: 1.2;
    }

    .page-header__subtitle {
      margin: var(--space-1) 0 0 0;
      font-size: var(--font-size-body);
      color: var(--color-text-secondary);
    }

    .page-header__actions {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      flex-wrap: wrap;
    }

    .page-header__actions:empty {
      display: none;
    }
  `]
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
}
