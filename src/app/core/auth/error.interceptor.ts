// src/app/core/auth/error.interceptor.ts
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SessionStore } from './session-store';
import { ToastService } from '../notifications/toast-service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const session = inject(SessionStore);
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        // 401 Unauthorized: token expirado o sesión inválida
        if (err.status === 401 && !req.url.includes('/auth/login')) {
          session.clear();
          const currentUrl = router.url;
          router.navigate(['/login'], { queryParams: { returnUrl: currentUrl } });
          toast.warning('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
        }
        // 403 Forbidden: acción o pantalla no autorizada
        else if (err.status === 403) {
          if (req.method === 'GET') {
            router.navigate(['/acceso-denegado']);
          } else {
            toast.error('No tienes permisos suficientes para realizar esta acción.');
          }
        }
        // 500+ Internal Server Error
        else if (err.status >= 500) {
          toast.error('Ocurrió un error en el servidor. Intenta nuevamente en unos instantes.');
        }
      }

      return throwError(() => err);
    })
  );
};
