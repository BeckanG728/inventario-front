// src/app/core/auth/session-store.ts
import { computed, Injectable, signal } from '@angular/core';
import { LoginResponse, UserRole } from '../api/auth/auth.models';

const SESSION_STORAGE_KEY = 'taller_auth_session';

interface PersistedSession {
  token: string;
  userId: number;
  role: UserRole;
  username: string;
  expiresAt: number;
  cambioPasswordPendiente: boolean;
}

function decodeJwtClaim(token: string, claimKey: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload) as Record<string, unknown>;
    return (parsed[claimKey] as string) || (parsed['sub'] as string) || null;
  } catch {
    return null;
  }
}

@Injectable({
  providedIn: 'root'
})
export class SessionStore {
  private readonly _token = signal<string | null>(null);
  private readonly _userId = signal<number | null>(null);
  private readonly _role = signal<UserRole | null>(null);
  private readonly _username = signal<string | null>(null);
  private readonly _expiresAt = signal<number | null>(null);
  private readonly _cambioPasswordPendiente = signal(false);

  readonly token = this._token.asReadonly();
  readonly userId = this._userId.asReadonly();
  readonly role = this._role.asReadonly();
  readonly username = this._username.asReadonly();
  readonly expiresAt = this._expiresAt.asReadonly();
  readonly cambioPasswordPendiente = this._cambioPasswordPendiente.asReadonly();

  readonly isAuthenticated = computed(() => {
    const t = this._token();
    const exp = this._expiresAt();
    if (!t) return false;
    if (exp && Date.now() >= exp) return false;
    return true;
  });

  constructor() {
    this.hydrateFromStorage();
  }

  setSession(response: LoginResponse, fallbackUsername?: string): void {
    const decodedUsername = decodeJwtClaim(response.token, 'username') || fallbackUsername || `Usuario #${response.userId}`;
    const expiresAt = Date.now() + response.expiresIn * 1000;

    const data: PersistedSession = {
      token: response.token,
      userId: response.userId,
      role: response.role,
      username: decodedUsername,
      expiresAt,
      cambioPasswordPendiente: response.cambioPasswordPendiente ?? false
    };

    this._token.set(data.token);
    this._userId.set(data.userId);
    this._role.set(data.role);
    this._username.set(data.username);
    this._expiresAt.set(data.expiresAt);
    this._cambioPasswordPendiente.set(data.cambioPasswordPendiente);

    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Ignorar si sessionStorage está bloqueado o deshabilitado
    }
  }

  /** Reemplaza la sesión con el token devuelto tras el cambio obligatorio. */
  confirmarCambioPassword(response: LoginResponse): void {
    this.setSession(response);
  }

  clear(): void {
    this._token.set(null);
    this._userId.set(null);
    this._role.set(null);
    this._username.set(null);
    this._expiresAt.set(null);
    this._cambioPasswordPendiente.set(false);

    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Ignorar
    }
  }

  private hydrateFromStorage(): void {
    try {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!stored) return;

      const data = JSON.parse(stored) as PersistedSession;
      // Validar si ya expiró
      if (data.expiresAt && Date.now() >= data.expiresAt) {
        this.clear();
        return;
      }

      this._token.set(data.token);
      this._userId.set(data.userId);
      this._role.set(data.role);
      this._username.set(data.username);
      this._expiresAt.set(data.expiresAt);
      this._cambioPasswordPendiente.set(data.cambioPasswordPendiente ?? false);
    } catch {
      this.clear();
    }
  }
}
