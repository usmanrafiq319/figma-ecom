import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn
} from '@angular/common/http';

import { inject } from '@angular/core';

import {
  BehaviorSubject,
  catchError,
  filter,
  switchMap,
  take,
  throwError
} from 'rxjs';

import { AuthService } from '../services/auth-service';

let isRefreshing = false;

const refreshTokenSubject =
  new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {

  const auth = inject(AuthService);

  const token = localStorage.getItem('token');

  let modifiedReq = req.clone({
    withCredentials: true
  });

  // Don't attach expired/current access token to refresh request
  if (
    token &&
    !req.url.includes('/access-token')
  ) {
    modifiedReq = modifiedReq.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(modifiedReq).pipe(

    catchError((error: HttpErrorResponse) => {

      // Access token expired
      if (
        error.status === 401 &&
        !req.url.includes('/access-token')
      ) {
        return handle401Error(
          modifiedReq,
          next,
          auth
        );
      }

      return throwError(() => error);
    })
  );
};


function handle401Error(
  req: HttpRequest<any>,
  next: HttpHandlerFn,
  auth: AuthService
) {

  if (!isRefreshing) {

    isRefreshing = true;

    refreshTokenSubject.next(null);

    return auth.refreshToken().pipe(

      switchMap((newAccessToken: string) => {

        isRefreshing = false;

        refreshTokenSubject.next(newAccessToken);

        return next(
          req.clone({
            setHeaders: {
              Authorization:
                `Bearer ${newAccessToken}`
            },
            withCredentials: true
          })
        );
      }),

      catchError((error) => {

        isRefreshing = false;

        // Release requests waiting for refresh
        refreshTokenSubject.next(null);

        auth.clearLocalSession();

        return throwError(() => error);
      })
    );
  }


  // Another request is already refreshing
  return refreshTokenSubject.pipe(

    filter(
      (token): token is string =>
        token !== null
    ),

    take(1),

    switchMap((newAccessToken) => {

      return next(
        req.clone({
          setHeaders: {
            Authorization:
              `Bearer ${newAccessToken}`
          },
          withCredentials: true
        })
      );
    })
  );
}