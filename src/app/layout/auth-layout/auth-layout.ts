// src/app/layout/auth-layout/auth-layout.ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from '@core/theme/theme.service';
import { ToastHost } from '../toast-host/toast-host';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet, ToastHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.css'
})
export class AuthLayout {
  readonly theme = inject(ThemeService);
}
