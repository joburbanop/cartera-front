import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const passwordChangedGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    void router.navigate(['/login']);
    return false;
  }

  if (authService.mustChangePassword()) {
    void router.navigate(['/cambiar-contrasena']);
    return false;
  }

  return true;
};
