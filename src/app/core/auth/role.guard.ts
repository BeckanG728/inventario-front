// src/app/core/auth/role.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionStore } from './session-store';
import { ROUTE_ROLES, UserRole } from './roles';

export const roleGuard: CanActivateFn = (route, state) => {
  const session = inject(SessionStore);
  const router = inject(Router);

  const currentRole = session.role();
  if (!currentRole) {
    return router.createUrlTree(['/login']);
  }

  // 1. Revisar si la ruta define roles explícitos en data: { roles: [...] }
  const routeRoles = route.data?.['roles'] as UserRole[] | undefined;
  if (routeRoles && Array.isArray(routeRoles)) {
    if (routeRoles.includes(currentRole)) {
      return true;
    }
    return router.createUrlTree(['/acceso-denegado']);
  }

  // 2. Si no viene en data, consultar el mapa centralizado ROUTE_ROLES
  // Buscar coincidencia exacta o por prefijo de ruta
  const cleanPath = state.url.split('?')[0];
  const allowedRoles = ROUTE_ROLES[cleanPath];

  if (allowedRoles) {
    if (allowedRoles.includes(currentRole)) {
      return true;
    }
    return router.createUrlTree(['/acceso-denegado']);
  }

  // Si no está registrado en ROUTE_ROLES, denegar por defecto
  return router.createUrlTree(['/acceso-denegado']);
};
