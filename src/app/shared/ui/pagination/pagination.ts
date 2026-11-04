// src/app/shared/ui/pagination/pagination.ts
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (totalElements() > 0) {
      <nav class="pagination" aria-label="Navegación de páginas">
        <div class="pagination__info">
          Mostrando
          <span class="font-mono">{{ fromIndex() }}</span>
          a
          <span class="font-mono">{{ toIndex() }}</span>
          de
          <span class="font-mono">{{ totalElements() }}</span>
          resultados
        </div>

        <div class="pagination__controls">
          <button
            type="button"
            class="pagination__btn"
            [disabled]="isFirst()"
            (click)="goToPage(page() - 1)"
            aria-label="Página anterior"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            <span class="pagination__label">Anterior</span>
          </button>

          <div class="pagination__pages">
            @for (p of visiblePages(); track p) {
              @if (p === -1) {
                <span class="pagination__ellipsis">…</span>
              } @else {
                <button
                  type="button"
                  class="pagination__page-btn"
                  [class.pagination__page-btn--active]="p === page()"
                  [attr.aria-current]="p === page() ? 'page' : null"
                  (click)="goToPage(p)"
                >
                  {{ p + 1 }}
                </button>
              }
            }
          </div>

          <button
            type="button"
            class="pagination__btn"
            [disabled]="isLast()"
            (click)="goToPage(page() + 1)"
            aria-label="Página siguiente"
          >
            <span class="pagination__label">Siguiente</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      </nav>
    }
  `,
  styles: [`
    .pagination {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      padding: var(--space-3) 0;
      align-items: center;
      justify-content: space-between;
      font-size: var(--font-size-label);
      color: var(--color-text-secondary);
    }

    @media (min-width: 768px) {
      .pagination {
        flex-direction: row;
      }
    }

    .pagination__info {
      font-size: 13px;
    }

    .pagination__info .font-mono {
      font-weight: 700;
      color: var(--color-text-primary);
    }

    .pagination__controls {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .pagination__pages {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .pagination__btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border: 1px solid var(--color-border);
      background-color: var(--color-surface);
      border-radius: var(--radius-md);
      color: var(--color-text-primary);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      min-height: 36px;
      transition: background-color var(--duration-fast) var(--easing-out);
    }

    .pagination__btn:hover:not(:disabled) {
      background-color: var(--color-surface-hover);
    }

    .pagination__btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .pagination__page-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border: 1px solid transparent;
      border-radius: var(--radius-md);
      background-color: transparent;
      color: var(--color-text-primary);
      font-family: var(--font-family-mono);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background-color var(--duration-fast) var(--easing-out);
    }

    .pagination__page-btn:hover:not(.pagination__page-btn--active) {
      background-color: var(--color-surface-hover);
    }

    .pagination__page-btn--active {
      background-color: var(--color-primary);
      color: var(--color-on-color);
      cursor: default;
    }

    .pagination__ellipsis {
      padding: 0 4px;
      color: var(--color-text-muted);
    }

    @media (max-width: 640px) {
      .pagination__label {
        display: none;
      }
    }
  `]
})
export class Pagination {
  readonly page = input<number>(0);
  readonly size = input<number>(10);
  readonly totalElements = input<number>(0);
  readonly totalPages = input<number>(0);

  readonly pageChange = output<number>();

  readonly isFirst = computed(() => this.page() <= 0);
  readonly isLast = computed(() => this.page() >= this.totalPages() - 1);

  readonly fromIndex = computed(() => {
    if (this.totalElements() === 0) return 0;
    return this.page() * this.size() + 1;
  });

  readonly toIndex = computed(() => {
    return Math.min((this.page() + 1) * this.size(), this.totalElements());
  });

  readonly visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.page();
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i);
    }

    const pages: number[] = [0];
    if (current > 2) pages.push(-1);

    const start = Math.max(1, current - 1);
    const end = Math.min(total - 2, current + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (current < total - 3) pages.push(-1);
    pages.push(total - 1);

    return pages;
  });

  goToPage(p: number): void {
    if (p >= 0 && p < this.totalPages() && p !== this.page()) {
      this.pageChange.emit(p);
    }
  }
}
