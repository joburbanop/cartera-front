import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
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

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      const errorCode = (error.error as { errors?: { code?: string } } | null)?.errors?.code;

      if (error.status === 403 && errorCode === 'password_change_required') {
        authService.setMustChangePassword(true);
        void router.navigate(['/cambiar-contrasena']);
        return throwError(() => error);
      }

      if (error.status === 401 && !shouldSkipAutoLogout && !authService.isLogoutRequest(req.url)) {
        authService.logout().subscribe(() => {
          void router.navigate(['/login']);
        });
      }

      return throwError(() => error);
    })
  );
};
