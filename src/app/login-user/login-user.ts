import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth-service';
import { AuthUserModel } from '../models/auth-user-model';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-login-user',
  imports: [FormsModule],
  templateUrl: './login-user.html',
  styleUrl: './login-user.scss',
})
export class LoginUser {
  service = inject(AuthService);
  router = inject(Router);
  route = inject(ActivatedRoute);

  user: AuthUserModel = {
    username: "",
    password: ""
  };

  isLoading = false;
  errorMessage: string | null = null;
  private returnUrl: string = '/';

  ngOnInit() {
    // Check if there's a return URL in query params
    this.route.queryParams.subscribe(params => {
      this.returnUrl = params['returnUrl'] || '/';
    });
  }

  authuser() {
    this.isLoading = true;
    this.errorMessage = null;

    this.service.authUser(this.user).subscribe({
      next: (res) => {
        console.log('Login successful');
        const token = res.accessToken;
        this.service.saveToken(token);
        
        // Navigate to the return URL or home
        this.router.navigateByUrl(this.returnUrl);
        this.isLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        
        // 1. Check if the backend sent a custom error string
        if (err.status === 400 && typeof err.error === 'string') {
          this.errorMessage = err.error;
        } else {
          this.errorMessage = 'An unexpected network error occurred.';
        }
        console.error('Full Error Details:', err);
      }
    });
  }
}