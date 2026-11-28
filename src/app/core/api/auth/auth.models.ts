// src/app/core/api/auth/auth.models.ts

export type UserRole = 'ADMIN' | 'JEFE_TALLER' | 'MECANICO';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  tokenType: string;
  expiresIn: number; // en segundos
  userId: number;
  role: UserRole;
  cambioPasswordPendiente: boolean;
}

export interface CambiarPasswordRequest {
  passwordActual: string;
  nuevaPassword: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  role: 'JEFE_TALLER' | 'MECANICO';
  cambioPasswordPendiente: boolean;
}

export interface RegisterResponse {
  id: number;
  username: string;
  role: string;
  createdAt: string; // ISO Instant UTC
}
