// src/app/layout/main-layout/main-layout.ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import { ToastHost } from '../toast-host/toast-host';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, Navbar, ToastHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="app-layout">
      <app-navbar />
      <main class="container app-layout__content">
        <router-outlet />
      </main>
      <app-toast-host />
    </div>
  `,
  styles: [`
    .app-layout {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background-color: var(--color-bg);
    }

    .app-layout__content {
      flex: 1;
      padding-top: var(--space-6);
      padding-bottom: var(--space-12);
    }
  `]
})
export class MainLayout {}
