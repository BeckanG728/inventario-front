// src/app/shared/ui/badge/badge.ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'neutral';
export type BadgeSize = 'sm' | 'md';

@Component({
  selector: 'app-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './badge.html',
  styleUrl: './badge.css'
})
export class Badge {
  readonly variant = input<BadgeVariant>('neutral');
  readonly size = input<BadgeSize>('md');
}
