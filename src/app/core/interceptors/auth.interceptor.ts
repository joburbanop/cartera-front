import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, throwError } from 'rxjs';
import { AuthService, SESSION_EXPIRED_MESSAGE } from '../services/auth.service';
import { ToastService } from '../../shared/services/toast.service';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);
  const token = authService.getToken();

  const headers: Record<string, string> = {
    Accept: 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const authReq = req.clone({
    setHeaders: headers
  });

  const shouldSkipAutoLogout = req.url.includes('/login') || req.url.includes('/logout');
  const isWrite = WRITE_METHODS.has(req.method.toUpperCase()) && !shouldSkipAutoLogout;

  if (isWrite) {
    authService.beginWrite();
  }

  const expireSession = (): void => {
    const shouldNotify = authService.notifySessionExpired();
    if (shouldNotify) {
      toast.show(SESSION_EXPIRED_MESSAGE, 'error');
    }

    authService.logout().subscribe(() => {
      void router.navigate(['/login'], { queryParams: { expired: '1' } });
    });
  };

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      const errorCode = (error.error as { errors?: { code?: string } } | null)?.errors?.code;

      if (error.status === 403 && errorCode === 'password_change_required') {
        authService.setMustChangePassword(true);
        void router.navigate(['/cambiar-contrasena']);
        return throwError(() => error);
      }

      if (error.status === 401 && !shouldSkipAutoLogout && !authService.isLogoutRequest(req.url)) {
        if (!isWrite && authService.hasInFlightWrites()) {
          authService.deferSessionExpiry();
        } else {
          expireSession();
        }
      }

      return throwError(() => error);
    }),
    finalize(() => {
      if (!isWrite) {
        return;
      }

      if (authService.endWrite()) {
        expireSession();
      }
    })
  );
};
