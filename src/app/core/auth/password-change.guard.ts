// src/app/core/auth/password-change.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionStore } from './session-store';
import { getRoleHome } from './roles';

export const passwordChangeGuard: CanActivateFn = () => {
  const session = inject(SessionStore);
  const router = inject(Router);

  if (!session.isAuthenticated()) {
    session.clear();
    return router.createUrlTree(['/login']);
  }

  if (!session.cambioPasswordPendiente()) {
    return router.createUrlTree([getRoleHome(session.role())]);
  }

  return true;
};
