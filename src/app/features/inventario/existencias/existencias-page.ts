// src/app/features/inventario/existencias/existencias-page.ts
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Location } from '@angular/common';
import { debounceTime, distinctUntilChanged, Subject, switchMap, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InventarioApi } from '@core/api/inventario/inventario-api';
import { ProductosApi } from '@core/api/productos/productos-api';
import { ExistenciaResponse } from '@core/api/inventario/inventario.models';
import { ProductoResponse } from '@core/api/productos/productos.models';
import { parseApiError } from '@core/api/api-error';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { PillNav, PillNavItem } from '@shared/ui/pill-nav/pill-nav';
import { Button } from '@shared/ui/button/button';
import { StockEstadoBadge } from '@shared/productos/stock-estado-badge';

type FaseConsulta = 'busqueda' | 'resultado';

@Component({
  selector: 'app-existencias-page',
  standalone: true,
  imports: [FormsModule, RouterLink, PageHeader, PillNav, Button, StockEstadoBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="Existencias de inventario"
      subtitle="Consulte el stock actual de uno o varios productos"
    />

    <app-pill-nav [items]="navItems" ariaLabel="Módulo de inventario" />

    <!-- Buscador de productos -->
    <div class="data-panel search-panel">
      <div class="panel-head">
        <h2>Buscar productos</h2>
      </div>

      <div class="search-row">
        <div class="search-input-wrap">
          <label for="busqueda-nombre" class="sr-only">Nombre del producto</label>
          <input
            id="busqueda-nombre"
            type="search"
            class="search-input"
            placeholder="Buscar por nombre de producto…"
            autocomplete="off"
            [ngModel]="filtroNombre()"
            (ngModelChange)="onNombreChange($event)"
          />
        </div>
        @if (seleccionados().size > 0) {
          <app-button
            variant="primary"
            [loading]="cargando()"
            (btnClick)="consultarExistencias()"
          >
            Consultar stock ({{ seleccionados().size }})
          </app-button>
        }
        @if (fase() === 'resultado') {
          <app-button variant="outline" (btnClick)="limpiar()">
            Nueva consulta
          </app-button>
        }
      </div>

      <!-- Sugerencias de búsqueda -->
      @if (fase() === 'busqueda') {
        @if (cargandoBusqueda()) {
          <ul class="suggestion-list" aria-label="Resultados de búsqueda">
            @for (_ of skeletonItems; track $index) {
              <li class="suggestion-item suggestion-item--skeleton">
                <span class="skeleton skeleton-text"></span>
                <span class="skeleton skeleton-badge"></span>
              </li>
            }
          </ul>
        } @else if (productosFiltrados().length > 0) {
          <ul class="suggestion-list" aria-label="Resultados de búsqueda">
            @for (p of productosFiltrados(); track p.id) {
              <li
                class="suggestion-item"
                [class.suggestion-item--selected]="seleccionados().has(p.id)"
              >
                <div class="suggestion-info">
                  <span class="suggestion-nombre">{{ p.nombre }}</span>
                  <span class="suggestion-meta">{{ p.codigo }} · {{ p.unidadMedida }}</span>
                </div>
                <div class="suggestion-actions">
                  <app-stock-estado-badge
                    [stockActual]="p.stockActual"
                    [stockMinimo]="p.stockMinimo"
                  />
                  <button
                    type="button"
                    class="toggle-btn"
                    [class.toggle-btn--activo]="seleccionados().has(p.id)"
                    [attr.aria-pressed]="seleccionados().has(p.id)"
                    [attr.aria-label]="seleccionados().has(p.id) ? 'Quitar ' + p.nombre : 'Agregar ' + p.nombre"
                    (click)="toggleSeleccion(p)"
                  >
                    {{ seleccionados().has(p.id) ? '✓ Seleccionado' : '+ Agregar' }}
                  </button>
                </div>
              </li>
            }
          </ul>
        } @else if (filtroNombre().length >= 2) {
          <div class="empty-state empty-state--sm">
            <p>No se encontraron productos con ese nombre.</p>
          </div>
        }
      }
    </div>

    <!-- Error de consulta -->
    @if (errorMensaje()) {
      <div class="inline-alert inline-alert--error alert-box" role="alert">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="8"></line>
          <line x1="12" y1="12" x2="12" y2="16"></line>
        </svg>
        <span>{{ errorMensaje() }}</span>
      </div>
    }

    <!-- Tabla de resultados -->
    @if (fase() === 'resultado') {
      @if (existencias().length > 0) {
        <div class="data-panel result-panel">
          <div class="panel-head">
            <h2>Resultados ({{ existencias().length }} producto{{ existencias().length !== 1 ? 's' : '' }})</h2>
          </div>

          <div class="table-wrapper">
            <table class="data-table" aria-label="Existencias de inventario">
              <thead>
                <tr>
                  <th scope="col">Código</th>
                  <th scope="col">Nombre</th>
                  <th scope="col" class="text-right">Stock actual</th>
                  <th scope="col" class="text-right">Stock mínimo</th>
                  <th scope="col" class="text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                @for (e of existencias(); track e.productoId) {
                  <tr [class.row--critico]="e.stockCritico">
                    <td class="font-mono">{{ e.codigo }}</td>
                    <td>{{ e.nombre }}</td>
                    <td class="text-right font-weight-bold">{{ e.stockActual }}</td>
                    <td class="text-right color-secondary">{{ e.stockMinimo }}</td>
                    <td class="text-center">
                      <app-stock-estado-badge
                        [stockActual]="e.stockActual"
                        [stockMinimo]="e.stockMinimo"
                      />
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Resumen crítico -->
          @if (totalCriticos() > 0) {
            <div class="inline-alert inline-alert--warning summary-alert" role="status">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span>
                {{ totalCriticos() }} producto{{ totalCriticos() !== 1 ? 's' : '' }}
                con stock crítico (igual o por debajo del mínimo).
                <a routerLink="/inventario/alertas" class="alert-link">Ver bandeja de alertas →</a>
              </span>
            </div>
          }
        </div>
      } @else if (!cargando()) {
        <div class="data-panel result-panel">
          <div class="empty-state empty-state--sm">
            <p>No se encontraron existencias para los productos consultados.</p>
          </div>
        </div>
      }
    }
  `,
  styles: [`
    .search-panel { margin-bottom: var(--space-5); }

    .search-row {
      display: flex;
      gap: var(--space-3);
      align-items: flex-start;
      flex-wrap: wrap;
      margin-bottom: var(--space-4);
    }

    .search-input-wrap { flex: 1; min-width: 220px; }

    .search-input {
      width: 100%;
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-size: var(--font-size-body);
      color: var(--color-text-primary);
      background: var(--color-surface);
      outline: none;
      transition: border-color 0.15s;
    }
    .search-input:focus-visible {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px var(--color-focus-ring);
    }

    /* Sugerencias */
    .suggestion-list {
      list-style: none;
      margin: 0;
      padding: 0;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      overflow: hidden;
    }

    .suggestion-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      border-bottom: 1px solid var(--color-border);
      background: var(--color-surface);
      transition: background 0.1s;
    }
    .suggestion-item:last-child { border-bottom: none; }
    .suggestion-item:hover { background: var(--color-surface-raised); }
    .suggestion-item--selected { background: var(--color-primary-subtle); }
    .suggestion-item--skeleton { pointer-events: none; }

    .suggestion-info {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      min-width: 0;
    }
    .suggestion-nombre {
      font-weight: 500;
      color: var(--color-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .suggestion-meta { font-size: var(--font-size-sm); color: var(--color-text-secondary); }

    .suggestion-actions {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      flex-shrink: 0;
    }

    .toggle-btn {
      min-height: 36px;
      padding: 0 var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background: var(--color-surface);
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;
    }
    .toggle-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
    .toggle-btn--activo {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: var(--color-on-primary);
    }
    .toggle-btn:focus-visible { outline: 3px solid var(--color-focus-ring); outline-offset: 2px; }

    /* Skeleton */
    .skeleton-text { display: block; height: 14px; width: 60%; border-radius: var(--radius-sm); }
    .skeleton-badge { display: block; height: 22px; width: 70px; border-radius: var(--radius-full); }

    /* Tabla resultados */
    .result-panel { margin-top: var(--space-5); }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--font-size-body);
    }
    .data-table th, .data-table td {
      padding: var(--space-3) var(--space-4);
      text-align: left;
      border-bottom: 1px solid var(--color-border);
    }
    .data-table th {
      font-weight: 600;
      color: var(--color-text-secondary);
      font-size: var(--font-size-sm);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      background: var(--color-surface-raised);
    }
    .data-table tr:last-child td { border-bottom: none; }
    .data-table tbody tr:hover { background: var(--color-surface-raised); }

    .row--critico { background: color-mix(in srgb, var(--color-warning) 8%, transparent); }

    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-mono { font-family: var(--font-mono); font-size: var(--font-size-sm); }
    .font-weight-bold { font-weight: 600; }
    .color-secondary { color: var(--color-text-secondary); }

    .alert-box { margin-top: var(--space-4); }
    .summary-alert { margin-top: var(--space-4); }
    .alert-link {
      color: inherit;
      font-weight: 600;
      text-underline-offset: 2px;
    }
  `]
})
export class ExistenciasPage implements OnInit {
  private readonly inventarioApi = inject(InventarioApi);
  private readonly productosApi  = inject(ProductosApi);
  private readonly router        = inject(Router);
  private readonly route         = inject(ActivatedRoute);
  private readonly location      = inject(Location);

  // ── Estado ─────────────────────────────────────────────────────────────────
  readonly filtroNombre     = signal('');
  readonly productosFiltrados = signal<ProductoResponse[]>([]);
  readonly seleccionados    = signal<Map<number, ProductoResponse>>(new Map());
  readonly existencias      = signal<ExistenciaResponse[]>([]);
  readonly cargando         = signal(false);
  readonly cargandoBusqueda = signal(false);
  readonly errorMensaje     = signal('');
  readonly fase             = signal<FaseConsulta>('busqueda');

  readonly totalCriticos = computed(() =>
    this.existencias().filter(e => e.stockCritico).length
  );

  readonly skeletonItems = Array(4).fill(null);

  // ── Nav ────────────────────────────────────────────────────────────────────
  readonly navItems: PillNavItem[] = [
    { label: 'Existencias',  route: '/inventario/existencias' },
    { label: 'Alertas',      route: '/inventario/alertas' },
  ];

  // ── Búsqueda con debounce ──────────────────────────────────────────────────
  private readonly busqueda$ = new Subject<string>();

  constructor() {
    this.busqueda$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(nombre => {
          if (nombre.length < 2) {
            this.productosFiltrados.set([]);
            this.cargandoBusqueda.set(false);
            return of(null);
          }
          this.cargandoBusqueda.set(true);
          return this.productosApi.listar({ nombre, page: 0, size: 20 });
        }),
        takeUntilDestroyed()
      )
      .subscribe(res => {
        this.cargandoBusqueda.set(false);
        if (res) this.productosFiltrados.set(res.content);
      });
  }

  ngOnInit(): void {
    // Restaurar desde query params si vienen ids pre-seleccionados
    const idsParam = this.route.snapshot.queryParamMap.get('ids');
    if (idsParam) {
      const ids = idsParam.split(',').map(Number).filter(Boolean);
      if (ids.length) {
        this.cargando.set(true);
        this.inventarioApi.getExistencias(ids).subscribe({
          next: data => {
            this.existencias.set(data);
            this.fase.set('resultado');
            this.cargando.set(false);
          },
          error: err => {
            this.errorMensaje.set(parseApiError(err).message);
            this.cargando.set(false);
          }
        });
      }
    }
  }

  onNombreChange(value: string): void {
    this.filtroNombre.set(value);
    if (value.length < 2) {
      this.productosFiltrados.set([]);
      this.cargandoBusqueda.set(false);
    }
    this.busqueda$.next(value);
  }

  toggleSeleccion(p: ProductoResponse): void {
    this.seleccionados.update(map => {
      const next = new Map(map);
      if (next.has(p.id)) {
        next.delete(p.id);
      } else {
        next.set(p.id, p);
      }
      return next;
    });
  }

  consultarExistencias(): void {
    const ids = [...this.seleccionados().keys()];
    if (!ids.length) return;

    this.cargando.set(true);
    this.errorMensaje.set('');

    this.inventarioApi.getExistencias(ids).subscribe({
      next: data => {
        this.existencias.set(data);
        this.fase.set('resultado');
        this.filtroNombre.set('');
        this.productosFiltrados.set([]);
        this.cargando.set(false);
        // Actualizar URL sin disparar navegación (evita onSameUrlNavigation:reload)
        const url = this.router.createUrlTree([], {
          relativeTo: this.route,
          queryParams: { ids: ids.join(',') }
        });
        this.location.replaceState(url.toString());
      },
      error: err => {
        this.errorMensaje.set(parseApiError(err).message);
        this.cargando.set(false);
      }
    });
  }

  limpiar(): void {
    this.existencias.set([]);
    this.seleccionados.set(new Map());
    this.filtroNombre.set('');
    this.productosFiltrados.set([]);
    this.errorMensaje.set('');
    this.fase.set('busqueda');
    // Limpiar query params de URL sin redirigir
    const url = this.router.createUrlTree([], { relativeTo: this.route, queryParams: {} });
    this.location.replaceState(url.toString());
  }
}
