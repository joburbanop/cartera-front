import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Clonamos la petición original para agregarle las cabeceras de seguridad
  let authReq = req.clone({
    setHeaders: {
      Accept: 'application/json' // Soluciona el error de redirección que tuvimos en Postman
    }
  });

  // Si tenemos un token guardado, se lo pegamos como Bearer
  if (token) {
    authReq = authReq.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq);
};