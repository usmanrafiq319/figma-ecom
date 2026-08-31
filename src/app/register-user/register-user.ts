import { Component, inject } from '@angular/core';
import { AuthService } from '../services/auth-service';
import { FormsModule } from '@angular/forms';
import { RegisterUserModel } from '../models/register-user-model';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-register-user',
  imports: [FormsModule,RouterLink],
  templateUrl: './register-user.html',
  styleUrl: './register-user.scss',
})
export class RegisterUser {

  service = inject(AuthService);

  user: RegisterUserModel = {
    userName: '',
    email: '',
    password: ''
  };

  confirmPassword = '';

  isLoading = false;
  errorMessage: string | null = null;

  registerUser() {

    this.errorMessage = null;

    // Check password confirmation
    if (this.user.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.isLoading = true;

    this.service.register(this.user).subscribe({

      next: (res) => {
        console.log('Registration successful');
        this.isLoading = false;
      },

      error: (err: HttpErrorResponse) => {
        this.isLoading = false;

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