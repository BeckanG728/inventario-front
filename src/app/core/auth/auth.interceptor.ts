// src/app/core/auth/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SessionStore } from './session-store';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Omitir peticiones públicas de login o salud
  if (req.url.includes('/auth/login') || req.url.includes('/actuator/')) {
    return next(req);
  }

  const session = inject(SessionStore);
  const token = session.token();

  if (token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(cloned);
  }

  return next(req);
};
