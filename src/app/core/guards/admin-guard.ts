import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLogin()) {
    const role = authService.getRole();
    if (role === 'admin' || role === 'superadmin') {
      return true; // allow access
    } else {
      // If a regular user tries to access the dashboard, log them out
      authService.logout();
      return false;
    }
  }

  // Redirect to login if not authorized
  return router.parseUrl('/login');
};
