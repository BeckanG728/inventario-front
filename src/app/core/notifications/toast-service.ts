// src/app/core/notifications/toast-service.ts
import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  durationMs: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private readonly _toasts = signal<ToastItem[]>([]);
  readonly toasts = this._toasts.asReadonly();

  success(message: string, durationMs = 5000): void {
    this.show('success', message, durationMs);
  }

  error(message: string, durationMs = 6000): void {
    this.show('error', message, durationMs);
  }

  warning(message: string, durationMs = 5000): void {
    this.show('warning', message, durationMs);
  }

  info(message: string, durationMs = 5000): void {
    this.show('info', message, durationMs);
  }

  dismiss(id: string): void {
    this._toasts.update(current => current.filter(t => t.id !== id));
  }

  private show(type: ToastType, message: string, durationMs: number): void {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const toast: ToastItem = { id, type, message, durationMs };

    this._toasts.update(current => [...current, toast]);

    if (durationMs > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, durationMs);
    }
  }
}
