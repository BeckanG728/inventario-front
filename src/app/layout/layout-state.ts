// src/app/layout/layout-state.ts
import { computed, Injectable, signal } from '@angular/core';

export type Viewport = 'mobile' | 'tablet' | 'desktop';

const STORAGE_KEY = 'sidebar_collapsed';
const MOBILE_QUERY = '(max-width: 767px)';
const TABLET_QUERY = '(min-width: 768px) and (max-width: 1023px)';

function readStoredCollapsed(): boolean | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === 'true') return true;
    if (value === 'false') return false;
    return null;
  } catch {
    return null;
  }
}

function createQuery(query: string): MediaQueryList | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query)
    : null;
}

/**
 * Estado compartido del layout autenticado: contracción de la Sidebar (escritorio/tablet)
 * y apertura del menú superpuesto (móvil). Lo consumen Topbar y Sidebar.
 */
@Injectable({ providedIn: 'root' })
export class LayoutState {
  private readonly mobileQuery = createQuery(MOBILE_QUERY);
  private readonly tabletQuery = createQuery(TABLET_QUERY);

  private readonly _viewport = signal<Viewport>(this.detectViewport());
  // null = el usuario aún no eligió: escritorio expandida, tablet contraída.
  private readonly _userCollapsed = signal<boolean | null>(readStoredCollapsed());
  private readonly _mobileOpen = signal(false);

  readonly viewport = this._viewport.asReadonly();
  readonly isMobile = computed(() => this._viewport() === 'mobile');
  readonly mobileOpen = this._mobileOpen.asReadonly();

  /** Sidebar en modo riel (solo iconos). En móvil nunca: el menú superpuesto siempre muestra etiquetas. */
  readonly collapsed = computed(() => {
    if (this.isMobile()) return false;
    return this._userCollapsed() ?? this._viewport() === 'tablet';
  });

  constructor() {
    const onChange = () => {
      this._viewport.set(this.detectViewport());
      if (this._viewport() !== 'mobile') {
        this._mobileOpen.set(false);
      }
    };
    this.mobileQuery?.addEventListener('change', onChange);
    this.tabletQuery?.addEventListener('change', onChange);
  }

  toggle(): void {
    if (this.isMobile()) {
      this._mobileOpen.update(open => !open);
      return;
    }
    this.setCollapsed(!this.collapsed());
  }

  expand(): void {
    if (!this.isMobile()) {
      this.setCollapsed(false);
    }
  }

  closeMobile(): void {
    this._mobileOpen.set(false);
  }

  private setCollapsed(value: boolean): void {
    this._userCollapsed.set(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // Ignorar si localStorage está bloqueado
    }
  }

  private detectViewport(): Viewport {
    if (this.mobileQuery?.matches) return 'mobile';
    if (this.tabletQuery?.matches) return 'tablet';
    return 'desktop';
  }
}
