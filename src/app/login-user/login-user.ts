import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { AuthService } from '../services/auth-service';
import { AuthUserModel } from '../models/auth-user-model';

@Component({
  selector: 'app-login-user',
  imports: [
    FormsModule,
    RouterLink
  ],
  templateUrl: './login-user.html',
  styleUrl: './login-user.scss'
})
export class LoginUser {

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  private returnUrl = '/';

  user: AuthUserModel = {
    username: '',
    password: ''
  };

  ngOnInit(): void {

    this.route.queryParams.subscribe(params => {

      this.returnUrl = params['returnUrl'] || '/';

    });

  }


  authuser(): void {

    // Don't submit if fields are empty
    if (!this.user.username.trim() || !this.user.password) {
      return;
    }

    // Prevent multiple requests
    if (this.isLoading()) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);


    this.authService.authUser(this.user).subscribe({

      next: (res) => {

        console.log('Login successful');

        // Save access token
        this.authService.saveToken(res.accessToken);

        // Only navigate after successful login
        this.router.navigateByUrl(this.returnUrl);

        this.isLoading.set(false);

      },


      error: (err: HttpErrorResponse) => {

        console.error('Login failed:', err);

        this.isLoading.set(false);


        if (err.status === 401) {

          this.errorMessage.set(
            typeof err.error === 'string'
              ? err.error
              : 'Invalid username or password.'
          );

        }
        else if (err.status === 0) {

          this.errorMessage.set(
            'Unable to connect to the server. Please try again.'
          );

        }
        else {

          this.errorMessage.set(
            'Unable to login. Please try again.'
          );

        }

      }

    });

  }


  clearError(): void {

    if (this.errorMessage()) {
      this.errorMessage.set(null);
    }

  }

}
