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
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css'
})
export class MainLayout {}
