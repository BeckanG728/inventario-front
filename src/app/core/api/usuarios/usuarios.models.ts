// src/app/core/api/usuarios/usuarios.models.ts
import { UserRole } from '../auth/auth.models';

export interface UsuarioResponse {
  id: number;
  username: string;
  role: UserRole;
  activo: boolean;
  createdAt: string;
}

export interface ActualizarUsuarioRequest {
  role: UserRole;
  activo: boolean;
}

export interface ResetPasswordRequest {
  password: string;
}
