import {
  HttpErrorResponse,
  HttpInterceptorFn
} from '@angular/common/http';

import { inject } from '@angular/core';

import {
  catchError,
  switchMap,
  throwError
} from 'rxjs';

import { AuthService } from '../services/auth-service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {

  const auth = inject(AuthService);

  const token = localStorage.getItem('token');

  // Don't attach token to refresh request
  if (!req.url.includes('/access-token') && token) {

    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });

  }

  return next(req).pipe(

    catchError((error: HttpErrorResponse) => {

      // Only handle expired access token
      if (
        error.status === 401 &&
        !req.url.includes('/access-token')
      ) {

        return auth.refreshToken().pipe(

          switchMap((newAccessToken) => {

            auth.saveToken(newAccessToken);

            const clonedRequest = req.clone({

              setHeaders: {
                Authorization: `Bearer ${newAccessToken}`
              }

            });

            return next(clonedRequest);

          }),

          catchError(err => {

            auth.clearLocalSession();

            return throwError(() => err);

          })

        );

      }

      return throwError(() => error);

    })

  );

};
