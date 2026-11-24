// src/app/shared/ui/pagination/pagination.ts
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pagination.html',
  styleUrl: './pagination.css'
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
