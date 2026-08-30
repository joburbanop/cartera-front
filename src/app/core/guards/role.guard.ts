import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const allowedRoles = route.data['roles'] as string[] | undefined;
  const deniedRoles = route.data['deniedRoles'] as string[] | undefined;

  if (!authService.isLoggedIn()) {
    void router.navigate(['/login']);
    return false;
  }

  if (deniedRoles?.some((role) => authService.hasRole(role))) {
    void router.navigate(['/dashboard']);
    return false;
  }

  if (allowedRoles && !allowedRoles.some((role) => authService.hasRole(role))) {
    void router.navigate(['/dashboard']);
    return false;
  }

  return true;
};
