import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth-service';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isloggedin()) {
    return true;
  }

  // Store the attempted URL for redirect after login
  auth.setRedirectUrl(state.url);
  
  // Redirect to login page with returnUrl
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};