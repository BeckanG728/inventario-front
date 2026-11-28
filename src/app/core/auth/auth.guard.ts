// src/app/core/auth/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionStore } from './session-store';

export const authGuard: CanActivateFn = (_route, state) => {
  const session = inject(SessionStore);
  const router = inject(Router);

  if (session.isAuthenticated()) {
    if (session.cambioPasswordPendiente()) {
      return router.createUrlTree(['/cambiar-password'], {
        queryParams: { returnUrl: state.url }
      });
    }
    return true;
  }

  session.clear();
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url }
  });
};
