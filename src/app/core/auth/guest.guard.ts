// src/app/core/auth/guest.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionStore } from './session-store';
import { getRoleHome } from './roles';

export const guestGuard: CanActivateFn = () => {
  const session = inject(SessionStore);
  const router = inject(Router);

  if (session.isAuthenticated()) {
    if (session.cambioPasswordPendiente()) {
      return router.createUrlTree(['/cambiar-password']);
    }
    const homeUrl = getRoleHome(session.role());
    return router.createUrlTree([homeUrl]);
  }

  return true;
};
