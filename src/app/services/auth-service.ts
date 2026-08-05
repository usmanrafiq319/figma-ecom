import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { AuthUserModel } from '../models/auth-user-model';
import { Token } from '../models/token';
import { Router } from '@angular/router';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { ApiResponse } from '../models/api-response';
import { ForgotPasswordRequest } from '../models/forgot-password-request';
import { VerifyOtpRequest } from '../models/verify-otp-request';
import { ResetPasswordRequest } from '../models/reset-password-request';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})

export class AuthService {
  private router = inject(Router);
  private http = inject(HttpClient);
  
  // private baseUrl = 'https://localhost:7011/api/';
  private readonly baseUrl = `${environment.apiUrl}/api/auth`;

  private tokenKey = 'token';
  // private userKey = 'user_data';

  isloggedin = signal<boolean>(!!localStorage.getItem(this.tokenKey));

  // Store the redirect URL after login
  private redirectUrl: string | null = null;


  authUser(authUseruser: AuthUserModel): Observable<Token> {
    return this.http.post<Token>(`${this.baseUrl}/login`, authUseruser, { withCredentials: true });
  }

  // New method: Login and handle navigation
  login(authUseruser: AuthUserModel): Observable<Token> {
    return this.authUser(authUseruser).pipe(
      tap((response: Token) => {
        if (response.accessToken) {
          this.saveToken(response.accessToken);
          this.navigateAfterLogin();
        }
      }),
      catchError(err => this.handleError(err))
    );
  }

  saveToken(token: string) {
    localStorage.setItem('token', token);
    this.isloggedin.set(true);
  }

  // Set the URL to redirect to after login
  setRedirectUrl(url: string) {
    this.redirectUrl = url;
  }

  // Navigate to the stored redirect URL or home
  private navigateAfterLogin() {
    const url = this.redirectUrl || '/';
    this.redirectUrl = null; // Clear after navigation
    this.router.navigateByUrl(url);
  }

  logOut() {
    this.http.post(`${this.baseUrl}/logout`, {}, { withCredentials: true }).subscribe({
      next: () => {
        console.log("Logout successful.");
        this.clearLocalSession();
      },
      error: (err) => {
        console.error(err);
      }
    });
  }

  refreshToken() {
    return this.http.post<string>(`${this.baseUrl}/access-token`, {}, { withCredentials: true })
      .pipe(
        tap(newToken => {
          if (newToken) this.saveToken(newToken);
        }),
        catchError(err => this.handleError(err))
      );
  }

  clearLocalSession() {
    localStorage.removeItem("token");
    this.isloggedin.set(false);
    this.router.navigate(['/']);
  }

  forgotPassword(email: string): Observable<ApiResponse> {
    const request: ForgotPasswordRequest = { email };
    return this.http.post<ApiResponse>(`${this.baseUrl}/forgot-password`, request)
      .pipe(
        tap(() => localStorage.setItem('resetEmail', email)),
        catchError(err => this.handleError(err))
      );
  }

  verifyOtp(email: string, code: string): Observable<ApiResponse> {
    const request: VerifyOtpRequest = { email, code };
    return this.http.post<ApiResponse>(`${this.baseUrl}/verify-otp`, request)
      .pipe(
        tap(response => {
          if (response.resetToken) {
            localStorage.setItem('resetToken', response.resetToken);
            localStorage.setItem('resetEmail', email);
          }
        }),
        catchError(err => this.handleError(err))
      );
  }

  resetPassword(email: string, resetToken: string, newPassword: string): Observable<ApiResponse> {
    const request: ResetPasswordRequest = { email, resetToken, newPassword };
    return this.http.post<ApiResponse>(`${this.baseUrl}/reset-password`, request)
      .pipe(
        tap(() => this.clearResetData()),
        catchError(err => this.handleError(err))
      );
  }

  clearResetData(): void {
    localStorage.removeItem('resetToken');
    localStorage.removeItem('resetEmail');
  }

  getStoredEmail(): string | null {
    return localStorage.getItem('resetEmail');
  }


    // ================ USER DATA FROM TOKEN ================
  
  /** Extract user ID from JWT token */

    getToken(): string {
    return localStorage.getItem(this.tokenKey) || '';
  }

  getUserId(): string {
    const token = this.getToken();
    if (!token) return '';
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Your JWT uses "nameid" for user ID
      return payload.nameid || payload.sub || '';
    } catch {
      return '';
    }
  }

  /** Extract user role from JWT token */
  getUserRole(): string {
    const token = this.getToken();
    if (!token) return '';
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Your JWT role claim
      return payload.role || '';
    } catch {
      return '';
    }
  }

  /** Extract username from JWT token */
  getUserName(): string {
    const token = this.getToken();
    if (!token) return '';
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.unique_name || payload.name || '';
    } catch {
      return '';
    }
  }

  getStoredResetToken(): string | null {
    return localStorage.getItem('resetToken');
  }

  private handleError(error: any): Observable<never> {
    let errorMessage = 'An error occurred. Please try again.';
    
    if (error.error && error.error.message) {
      errorMessage = error.error.message;
    } else if (error.status === 500) {
      errorMessage = 'Server error. Please try again later.';
    } else if (error.status === 0) {
      errorMessage = 'Network error. Please check your connection.';
    }
    
    return throwError(() => new Error(errorMessage));
  }
  
}