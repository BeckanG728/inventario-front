// src/app/core/theme/theme.service.ts
import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'app_theme';

  // Leer el tema ya aplicado por el script inline del index.html
  // para sincronizar el signal sin doble escritura al DOM
  private readonly _initialTheme = (): Theme => {
    try {
      return (localStorage.getItem(this.storageKey) as Theme | null) === 'dark'
        ? 'dark'
        : 'light';
    } catch {
      return 'light';
    }
  };

  readonly currentTheme = signal<Theme>(this._initialTheme());

  // No llamar setTheme() en el constructor: el script inline ya fijó el
  // atributo data-theme antes del primer paint. Solo sincronizamos el signal.
  constructor() {}

  toggleTheme(): void {
    const next: Theme = this.currentTheme() === 'light' ? 'dark' : 'light';
    this.setTheme(next);
  }

  setTheme(theme: Theme): void {
    this.currentTheme.set(theme);
    try {
      localStorage.setItem(this.storageKey, theme);
    } catch { /* sessionStorage bloqueado */ }
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
  }
}
