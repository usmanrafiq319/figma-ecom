import { Component, OnDestroy, OnInit, inject, signal, computed } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { AuthService } from '../services/auth-service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-reset-password-component',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './reset-password-component.html',
  styleUrl: './reset-password-component.scss',
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Step tracking Signals
  currentStep = signal<number>(1);
  maxSteps = signal<number>(3);

  // Computed state
  progressPercentage = computed(() => ((this.currentStep() - 1) / (this.maxSteps() - 1)) * 100);

  // Forms
  forgotPasswordForm!: FormGroup;
  verifyOtpForm!: FormGroup;
  resetPasswordForm!: FormGroup;

  // UI State Signals
  isSendingOtp = signal<boolean>(false);
  isVerifyingOtp = signal<boolean>(false);
  isResettingPassword = signal<boolean>(false);

  errorMessage = signal<string>('');
  successMessage = signal<string>('');
  otpSent = signal<boolean>(false);
  otpVerified = signal<boolean>(false);
  passwordReset = signal<boolean>(false);

  userEmail = signal<string>('');

  // Timer Signals
  resendTimer = signal<number>(60);
  canResendOtp = signal<boolean>(false);
  private resendInterval: ReturnType<typeof setInterval> | null = null;

  // Password Visibility Signals
  showPassword = signal<boolean>(false);
  showConfirmPassword = signal<boolean>(false);

  ngOnInit(): void {
    const storedEmail = this.authService.getStoredEmail();
    const storedToken = this.authService.getStoredResetToken();

    if (storedEmail && storedToken) {
      this.userEmail.set(storedEmail);
      this.currentStep.set(3);
      this.otpSent.set(true);
      this.otpVerified.set(true);
    } else if (storedEmail) {
      this.userEmail.set(storedEmail);
      this.currentStep.set(2);
      this.otpSent.set(true);
    }

    this.initForms();
  }

  ngOnDestroy(): void {
    this.clearResendTimer();
  }

  initForms(): void {
    this.forgotPasswordForm = this.fb.group({
      email: [this.userEmail() || '', [Validators.required, Validators.email]]
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

  // Step 1: Request OTP
  onSubmitForgotPassword(): void {
    if (this.forgotPasswordForm.invalid) {
      this.markFormGroupTouched(this.forgotPasswordForm);
      return;
    }

    const email = this.forgotPasswordForm.get('email')?.value;
    this.userEmail.set(email);

    this.currentStep.set(2);
    this.otpSent.set(true);
    this.startResendTimer();

    this.errorMessage.set('');
    this.successMessage.set('Sending OTP to your email...');

    this.isSendingOtp.set(true);
    this.authService.forgotPassword(email).subscribe({
      next: (response) => {
        this.isSendingOtp.set(false);
        this.successMessage.set(response.message);
        localStorage.setItem('resetEmail', email);
      },
      error: (error) => {
        this.isSendingOtp.set(false);
        this.errorMessage.set(error.message || 'Failed to send OTP. Please try again.');
      }
    });
  }

  // Step 2: Verify OTP
  onVerifyOtp(): void {
    if (this.verifyOtpForm.invalid) {
      this.markFormGroupTouched(this.verifyOtpForm);
      return;
    }

    const otp = this.verifyOtpForm.get('otp')?.value;

    this.currentStep.set(3);
    this.otpVerified.set(true);
    this.successMessage.set('Verifying OTP...');

    this.resetPasswordForm.patchValue({
      email: this.userEmail()
    });

    this.isVerifyingOtp.set(true);
    this.authService.verifyOtp(this.userEmail(), otp).subscribe({
      next: (response) => {
        this.isVerifyingOtp.set(false);
        this.successMessage.set(response.message);
        if (response.resetToken) {
          localStorage.setItem('resetToken', response.resetToken);
        }
      },
      error: (error) => {
        this.isVerifyingOtp.set(false);
        this.errorMessage.set(error.message || 'Invalid OTP. Please try again.');
      }
    });
  }

  // Step 3: Reset Password
  onSubmitResetPassword(): void {
    if (this.resetPasswordForm.invalid) {
      this.markFormGroupTouched(this.resetPasswordForm);
      return;
    }

    const newPassword = this.resetPasswordForm.get('password')?.value;
    const resetToken = this.authService.getStoredResetToken();

    if (!resetToken) {
      this.errorMessage.set('Reset session expired. Please request a new OTP.');
      this.currentStep.set(1);
      return;
    }

    this.passwordReset.set(true);
    this.successMessage.set('Resetting your password...');

    this.isResettingPassword.set(true);
    this.authService.resetPassword(this.userEmail(), resetToken, newPassword).subscribe({
      next: (response) => {
        this.isResettingPassword.set(false);
        this.successMessage.set(response.message);

        if (response.warning) {
          this.errorMessage.set(response.warning);
        }

        this.authService.clearResetData();

        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      },
      error: (error) => {
        this.isResettingPassword.set(false);
        this.passwordReset.set(false);
        this.errorMessage.set(error.message || 'Failed to reset password. Please try again.');
      }
    });
  }

  // Resend OTP
  resendOtp(): void {
    if (!this.canResendOtp()) return;

    this.isSendingOtp.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.authService.forgotPassword(this.userEmail()).subscribe({
      next: (response) => {
        this.isSendingOtp.set(false);
        this.successMessage.set('New OTP sent to your email.');
        this.canResendOtp.set(false);
        this.resendTimer.set(60);
        this.startResendTimer();
      },
      error: (error) => {
        this.isSendingOtp.set(false);
        this.errorMessage.set(error.message || 'Failed to resend OTP. Please try again.');
      }
    });
  }

  // Timer
  startResendTimer(): void {
    this.canResendOtp.set(false);
    this.resendTimer.set(60);

    this.clearResendTimer();
    this.resendInterval = setInterval(() => {
      this.resendTimer.update((val) => val - 1);
      if (this.resendTimer() === 0) {
        this.canResendOtp.set(true);
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
    if (this.currentStep() > 1) {
      this.currentStep.update((val) => val - 1);
      if (this.currentStep() === 1) {
        this.otpSent.set(false);
        this.otpVerified.set(false);
      } else if (this.currentStep() === 2) {
        this.otpVerified.set(false);
      }
      this.errorMessage.set('');
      this.successMessage.set('');
    }
  }

  goToLogin(): void {
    this.authService.clearResetData();
    this.router.navigate(['/login']);
  }

  markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach((control) => {
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
    const labels: { [key: string]: string } = {
      email: 'Email',
      otp: 'OTP',
      password: 'Password',
      confirmPassword: 'Confirm Password'
    };
    return labels[controlName] || controlName;
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((val) => !val);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((val) => !val);
  }

  hasError(formGroup: FormGroup, controlName: string, errorType: string): boolean {
    const control = formGroup.get(controlName);
    return !!control && control.hasError(errorType) && control.touched;
  }

  resetFlow(): void {
    this.currentStep.set(1);
    this.otpSent.set(false);
    this.otpVerified.set(false);
    this.passwordReset.set(false);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.userEmail.set('');
    this.authService.clearResetData();
    this.initForms();
    this.clearResendTimer();
  }
}