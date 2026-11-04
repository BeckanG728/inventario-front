// src/app/shared/ui/pill-nav/pill-nav.ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface PillNavItem {
  label: string;
  route: string;
}

@Component({
  selector: 'app-pill-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="pill-tab-group" [attr.aria-label]="ariaLabel()">
      @for (item of items(); track item.route) {
        <a
          [routerLink]="item.route"
          routerLinkActive="pill-tab--active"
          class="pill-tab"
        >
          {{ item.label }}
        </a>
      }
    </nav>
  `,
  styles: [`
    :host {
      display: block;
      margin-bottom: var(--space-5);
      border-bottom: 1px solid var(--color-border);
      padding-bottom: var(--space-2);
    }
  `]
})
export class PillNav {
  readonly items = input.required<PillNavItem[]>();
  readonly ariaLabel = input<string>('Subnavegación de sección');
}
