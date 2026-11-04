// src/app/shared/ui/badge/badge.ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'neutral';
export type BadgeSize = 'sm' | 'md';

@Component({
  selector: 'app-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="badge badge--{{ variant() }} badge--{{ size() }}">
      <ng-content />
    </span>
  `,
  styles: [`
    :host {
      display: inline-flex;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      border-radius: var(--radius-pill);
      white-space: nowrap;
      line-height: 1;
      border: 1px solid transparent;
    }

    .badge--sm {
      padding: 3px 8px;
      font-size: 11px;
    }

    .badge--md {
      padding: 4px 12px;
      font-size: 12px;
    }

    /* Variantes con contraste adecuado sobre tint */
    .badge--primary {
      background-color: var(--color-blue-tint);
      color: var(--color-blue-text);
      border-color: rgba(37, 99, 235, 0.2);
    }

    .badge--success {
      background-color: var(--color-green-tint);
      color: var(--color-green-text);
      border-color: rgba(22, 163, 74, 0.2);
    }

    .badge--warning {
      background-color: var(--color-warning-tint);
      color: var(--color-orange-text);
      border-color: rgba(234, 88, 12, 0.2);
    }

    .badge--danger {
      background-color: var(--color-danger-tint);
      color: var(--color-red-text);
      border-color: rgba(220, 38, 38, 0.2);
    }

    .badge--info {
      background-color: var(--color-info-tint);
      color: var(--color-teal-text);
      border-color: rgba(8, 145, 178, 0.2);
    }

    .badge--accent {
      background-color: var(--color-accent-tint);
      color: var(--color-purple-text);
      border-color: rgba(124, 58, 237, 0.2);
    }

    .badge--neutral {
      background-color: var(--color-border-soft);
      color: var(--color-text-secondary);
      border-color: var(--color-border);
    }
  `]
})
export class Badge {
  readonly variant = input<BadgeVariant>('neutral');
  readonly size = input<BadgeSize>('md');
}
