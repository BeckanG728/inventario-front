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
  templateUrl: './pill-nav.html',
  styleUrl: './pill-nav.css'
})
export class PillNav {
  readonly items = input.required<PillNavItem[]>();
  readonly ariaLabel = input<string>('Subnavegación de sección');
}
