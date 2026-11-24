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
  templateUrl: './breadcrumbs.html',
  styleUrl: './breadcrumbs.css'
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
