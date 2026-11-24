// src/app/layout/toast-host/toast-host.ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '@core/notifications/toast-service';

@Component({
  selector: 'app-toast-host',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './toast-host.html',
  styleUrl: './toast-host.css'
})
export class ToastHost {
  readonly toastService = inject(ToastService);
}
