// src/app/layout/main-layout/main-layout.ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Breadcrumbs } from '../breadcrumbs/breadcrumbs';
import { Sidebar } from '../sidebar/sidebar';
import { ToastHost } from '../toast-host/toast-host';
import { Topbar } from '../topbar/topbar';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, Topbar, Sidebar, Breadcrumbs, ToastHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="app-layout">
      <app-topbar />
      <div class="app-layout__body">
        <app-sidebar />
        <div class="app-layout__main">
          <main class="container app-layout__content">
            <app-breadcrumbs />
            <router-outlet />
          </main>
        </div>
      </div>
      <app-toast-host />
    </div>
  `,
  styles: [`
    .app-layout {
      --topbar-height: 56px;
      --sidebar-width: 240px;
      --sidebar-width-collapsed: 68px;

      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background-color: var(--color-bg);
    }

    .app-layout__body {
      flex: 1;
      display: flex;
      min-width: 0;
    }

    /* min-width: 0 evita que tablas anchas generen desplazamiento horizontal de toda la página */
    .app-layout__main {
      flex: 1;
      min-width: 0;
    }

    .app-layout__content {
      padding-top: var(--space-6);
      padding-bottom: var(--space-12);
    }
  `]
})
export class MainLayout {}
