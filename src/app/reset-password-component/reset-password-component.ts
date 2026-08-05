import { Component, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, NgModel, ReactiveFormsModule, ValidationErrors, Validators  } from '@angular/forms';
import { AuthService } from '../services/auth-service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reset-password-component',
  imports: [ReactiveFormsModule,CommonModule],
  templateUrl: './reset-password-component.html',
  styleUrl: './reset-password-component.scss',
})

export class ResetPasswordComponent implements OnInit, OnDestroy {
  // Step tracking
  currentStep: number = 1;
  maxSteps: number = 3;
  
  // Forms
  forgotPasswordForm!: FormGroup;
  verifyOtpForm!: FormGroup;
  resetPasswordForm!: FormGroup;
  
  // UI States
  isSendingOtp: boolean = false;
  isVerifyingOtp: boolean = false;
  isResettingPassword: boolean = false;
  
  errorMessage: string = '';
  successMessage: string = '';
  otpSent: boolean = false;
  otpVerified: boolean = false;
  passwordReset: boolean = false;
  
  userEmail: string = '';
  
  // Timer
  resendTimer: number = 60;
  resendInterval: any;
  canResendOtp: boolean = false;

  // Password visibility
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const storedEmail = this.authService.getStoredEmail();
    const storedToken = this.authService.getStoredResetToken();
    
    if (storedEmail && storedToken) {
      this.userEmail = storedEmail;
      this.currentStep = 3;
      this.otpSent = true;
      this.otpVerified = true;
    } else if (storedEmail) {
      this.userEmail = storedEmail;
      this.currentStep = 2;
      this.otpSent = true;
    }
    
    this.initForms();
  }

  ngOnDestroy(): void {
    this.clearResendTimer();
  }

  initForms(): void {
    this.forgotPasswordForm = this.fb.group({
      email: [this.userEmail || '', [Validators.required, Validators.email]]
    });

    this.verifyOtpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6), Validators.pattern('^[0-9]*$')]]
    });

    this.resetPasswordForm = this.fb.group({
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$')
      ]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');
    
    if (!password || !confirmPassword) return null;
    
    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  // Step 1: Request OTP - INSTANT STEP CHANGE
  onSubmitForgotPassword(): void {
    if (this.forgotPasswordForm.invalid) {
      this.markFormGroupTouched(this.forgotPasswordForm);
      return;
    }

    const email = this.forgotPasswordForm.get('email')?.value;
    this.userEmail = email;
    
    // INSTANTLY move to next step
    this.currentStep = 2;
    this.otpSent = true;
    this.startResendTimer();
    
    // Clear any previous messages
    this.errorMessage = '';
    this.successMessage = 'Sending OTP to your email...';
    
    // Make API call in background
    this.isSendingOtp = true;
    this.authService.forgotPassword(email).subscribe({
      next: (response) => {
        this.isSendingOtp = false;
        this.successMessage = response.message;
        // Store email for next steps
        localStorage.setItem('resetEmail', email);
      },
      error: (error) => {
        this.isSendingOtp = false;
        this.errorMessage = error.message || 'Failed to send OTP. Please try again.';
        // Optionally go back if it fails
        // this.currentStep = 1;
      }
    });
  }

  // Step 2: Verify OTP - INSTANT STEP CHANGE
  onVerifyOtp(): void {
    if (this.verifyOtpForm.invalid) {
      this.markFormGroupTouched(this.verifyOtpForm);
      return;
    }

    const otp = this.verifyOtpForm.get('otp')?.value;
    
    // INSTANTLY move to next step
    this.currentStep = 3;
    this.otpVerified = true;
    this.successMessage = 'Verifying OTP...';
    
    // Pre-fill reset password form
    this.resetPasswordForm.patchValue({
      email: this.userEmail
    });
    
    // Make API call in background
    this.isVerifyingOtp = true;
    this.authService.verifyOtp(this.userEmail, otp).subscribe({
      next: (response) => {
        this.isVerifyingOtp = false;
        this.successMessage = response.message;
        if (response.resetToken) {
          localStorage.setItem('resetToken', response.resetToken);
        }
      },
      error: (error) => {
        this.isVerifyingOtp = false;
        this.errorMessage = error.message || 'Invalid OTP. Please try again.';
        // Optionally go back if it fails
        // this.currentStep = 2;
      }
    });
  }

  // Step 3: Reset Password - INSTANT SUCCESS
  onSubmitResetPassword(): void {
    if (this.resetPasswordForm.invalid) {
      this.markFormGroupTouched(this.resetPasswordForm);
      return;
    }

    const newPassword = this.resetPasswordForm.get('password')?.value;
    const resetToken = this.authService.getStoredResetToken();

    if (!resetToken) {
      this.errorMessage = 'Reset session expired. Please request a new OTP.';
      this.currentStep = 1;
      return;
    }

    // INSTANTLY show success
    this.passwordReset = true;
    this.successMessage = 'Resetting your password...';
    
    // Make API call in background
    this.isResettingPassword = true;
    this.authService.resetPassword(this.userEmail, resetToken, newPassword).subscribe({
      next: (response) => {
        this.isResettingPassword = false;
        this.successMessage = response.message;
        
        if (response.warning) {
          this.errorMessage = response.warning;
        }
        
        // Clear stored data
        this.authService.clearResetData();
        
        // Auto redirect to login after 3 seconds
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      },
      error: (error) => {
        this.isResettingPassword = false;
        this.passwordReset = false;
        this.errorMessage = error.message || 'Failed to reset password. Please try again.';
      }
    });
  }

  // Resend OTP
  resendOtp(): void {
    if (!this.canResendOtp) return;
    
    this.isSendingOtp = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.forgotPassword(this.userEmail).subscribe({
      next: (response) => {
        this.isSendingOtp = false;
        this.successMessage = 'New OTP sent to your email.';
        this.canResendOtp = false;
        this.resendTimer = 60;
        this.startResendTimer();
      },
      error: (error) => {
        this.isSendingOtp = false;
        this.errorMessage = error.message || 'Failed to resend OTP. Please try again.';
      }
    });
  }

  // Timer
  startResendTimer(): void {
    this.canResendOtp = false;
    this.resendTimer = 60;
    
    this.clearResendTimer();
    this.resendInterval = setInterval(() => {
      this.resendTimer--;
      if (this.resendTimer === 0) {
        this.canResendOtp = true;
        this.clearResendTimer();
      }
    }, 1000);
  }

  clearResendTimer(): void {
    if (this.resendInterval) {
      clearInterval(this.resendInterval);
      this.resendInterval = null;
    }
  }

  goBack(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      if (this.currentStep === 1) {
        this.otpSent = false;
        this.otpVerified = false;
      } else if (this.currentStep === 2) {
        this.otpVerified = false;
      }
      this.errorMessage = '';
      this.successMessage = '';
    }
  }

  goToLogin(): void {
    this.authService.clearResetData();
    this.router.navigate(['/login']);
  }

  markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  getErrorMessage(formGroup: FormGroup, controlName: string): string {
    const control = formGroup.get(controlName);
    if (!control || !control.errors || !control.touched) return '';
    
    const errors = control.errors;
    
    if (errors['required']) return `${this.getFieldLabel(controlName)} is required.`;
    if (errors['email']) return 'Please enter a valid email address.';
    if (errors['minlength']) return `${this.getFieldLabel(controlName)} must be at least ${errors['minlength'].requiredLength} characters.`;
    if (errors['maxlength']) return `${this.getFieldLabel(controlName)} cannot exceed ${errors['maxlength'].requiredLength} characters.`;
    if (errors['pattern']) {
      if (controlName === 'password') {
        return 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.';
      }
      if (controlName === 'otp') {
        return 'OTP must contain only numbers.';
      }
    }
    if (errors['passwordMismatch']) return 'Passwords do not match.';
    
    return 'Invalid input.';
  }

  getFieldLabel(controlName: string): string {
    const labels: {[key: string]: string} = {
      email: 'Email',
      otp: 'OTP',
      password: 'Password',
      confirmPassword: 'Confirm Password'
    };
    return labels[controlName] || controlName;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  hasError(formGroup: FormGroup, controlName: string, errorType: string): boolean {
    const control = formGroup.get(controlName);
    return !!control && control.hasError(errorType) && control.touched;
  }

  getProgressPercentage(): number {
    return ((this.currentStep - 1) / (this.maxSteps - 1)) * 100;
  }

  resetFlow(): void {
    this.currentStep = 1;
    this.otpSent = false;
    this.otpVerified = false;
    this.passwordReset = false;
    this.errorMessage = '';
    this.successMessage = '';
    this.userEmail = '';
    this.authService.clearResetData();
    this.initForms();
    this.clearResendTimer();
  }
}