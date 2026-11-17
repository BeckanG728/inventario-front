// src/app/layout/breadcrumbs/breadcrumbs.ts
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { LucideChevronRight, LucideDynamicIcon } from '@lucide/angular';
import { filter } from 'rxjs';

/**
 * Deriva las migas de la configuración de rutas (sin listas duplicadas):
 * - rutas padre: `data: { breadcrumb: 'Catálogo' }`
 * - ruta hoja: su `title`
 */
function buildCrumbs(root: ActivatedRouteSnapshot): string[] {
  const crumbs: string[] = [];
  let node: ActivatedRouteSnapshot | null = root;

  while (node) {
    const config = node.routeConfig;
    const label = config?.data?.['breadcrumb'];

    if (typeof label === 'string') {
      crumbs.push(label);
    } else if (!node.firstChild && typeof config?.title === 'string') {
      crumbs.push(config.title);
    }

    node = node.firstChild;
  }

  return crumbs;
}

@Component({
  selector: 'app-breadcrumbs',
  standalone: true,
  imports: [LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (crumbs().length > 1) {
      <nav class="breadcrumbs" aria-label="Ubicación actual">
        <ol class="breadcrumbs__list">
          @for (crumb of crumbs(); track $index; let last = $last) {
            <li class="breadcrumbs__item" [attr.aria-current]="last ? 'page' : null">
              {{ crumb }}
              @if (!last) {
                <svg [lucideIcon]="separatorIcon" [size]="14" [strokeWidth]="1.75"></svg>
              }
            </li>
          }
        </ol>
      </nav>
    }
  `,
  styles: [`
    :host {
      display: block;
    }

    .breadcrumbs {
      margin-bottom: var(--space-4);
    }

    .breadcrumbs__list {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-1);
      margin: 0;
      padding: 0;
      list-style: none;
      font-size: 13px;
      color: var(--color-text-muted);
    }

    .breadcrumbs__item {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
    }

    .breadcrumbs__item[aria-current="page"] {
      color: var(--color-text-primary);
      font-weight: 600;
    }
  `]
})
export class Breadcrumbs {
  private readonly router = inject(Router);

  protected readonly separatorIcon = LucideChevronRight;

  private readonly navigationEnd = toSignal(
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)),
    { initialValue: null }
  );

  protected readonly crumbs = computed(() => {
    this.navigationEnd();
    return buildCrumbs(this.router.routerState.snapshot.root);
  });
}
