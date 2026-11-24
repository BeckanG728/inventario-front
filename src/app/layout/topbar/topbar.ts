// src/app/layout/topbar/topbar.ts
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  LucideChevronDown,
  LucideDynamicIcon,
  LucideLogOut,
  LucideMenu,
  LucideMoon,
  LucidePanelLeftClose,
  LucidePanelLeftOpen,
  LucideSun,
  LucideWrench,
  LucideX
} from '@lucide/angular';
import { getRoleLabel } from '@core/auth/roles';
import { SessionStore } from '@core/auth/session-store';
import { ThemeService } from '@core/theme/theme.service';
import { Badge } from '@shared/ui/badge/badge';
import { LayoutState } from '../layout-state';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [RouterLink, Badge, LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './topbar.html',
  styleUrl: './topbar.css'
})
export class Topbar {
  readonly layout = inject(LayoutState);
  readonly session = inject(SessionStore);
  readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');

  protected readonly icons = {
    wrench: LucideWrench,
    moon: LucideMoon,
    sun: LucideSun,
    chevronDown: LucideChevronDown,
    logOut: LucideLogOut
  };

  readonly menuOpen = signal(false);

  protected readonly initial = computed(() => (this.session.username() ?? '?').trim().charAt(0).toUpperCase() || '?');
  protected readonly roleLabel = computed(() => getRoleLabel(this.session.role()));

  protected readonly roleBadgeVariant = computed(() => {
    switch (this.session.role()) {
      case 'ADMIN': return 'accent';
      case 'JEFE_TALLER': return 'primary';
      case 'MECANICO': return 'success';
      default: return 'neutral';
    }
  });

  protected readonly sidebarExpanded = computed(() =>
    this.layout.isMobile() ? this.layout.mobileOpen() : !this.layout.collapsed()
  );

  protected readonly toggleIcon = computed(() => {
    if (this.layout.isMobile()) {
      return this.layout.mobileOpen() ? LucideX : LucideMenu;
    }
    return this.layout.collapsed() ? LucidePanelLeftOpen : LucidePanelLeftClose;
  });

  protected readonly toggleLabel = computed(() => {
    if (this.layout.isMobile()) {
      return this.layout.mobileOpen() ? 'Cerrar menú de navegación' : 'Abrir menú de navegación';
    }
    return this.layout.collapsed() ? 'Expandir barra lateral' : 'Contraer barra lateral';
  });

  protected readonly themeLabel = computed(() =>
    this.theme.currentTheme() === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'
  );

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (this.menuOpen() && !this.host.nativeElement.contains(event.target as Node)) {
      this.menuOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.menuOpen()) {
      this.menuOpen.set(false);
      this.trigger()?.nativeElement.focus();
    }
  }

  toggleMenu(): void {
    this.menuOpen.update(open => !open);
  }

  logout(): void {
    this.menuOpen.set(false);
    this.session.clear();
    this.router.navigate(['/login']);
  }
}
