import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth-service';

@Component({
  selector: 'app-reset-password-component',
  imports: [ReactiveFormsModule],
  templateUrl: './reset-password-component.html',
  styleUrl: './reset-password-component.scss'
})
export class ResetPasswordComponent implements OnInit, OnDestroy {

  // --------------------------------------------------
  // Step tracking
  // --------------------------------------------------

  currentStep = 1;
  readonly maxSteps = 3;


  // --------------------------------------------------
  // Forms
  // --------------------------------------------------

  verifyOtpForm!: FormGroup;
  resetPasswordForm!: FormGroup;


  // --------------------------------------------------
  // UI states
  // --------------------------------------------------

  isSendingOtp = false;
  isVerifyingOtp = false;
  isResettingPassword = false;

  errorMessage = '';
  successMessage = '';

  otpSent = false;
  otpVerified = false;
  passwordReset = false;


  // --------------------------------------------------
  // Resend OTP timer
  // --------------------------------------------------

  resendTimer = 60;
  resendInterval: ReturnType<typeof setInterval> | null = null;
  canResendOtp = false;


  // --------------------------------------------------
  // Password visibility
  // --------------------------------------------------

  showPassword = false;
  showConfirmPassword = false;


  // --------------------------------------------------
  // Constructor
  // --------------------------------------------------

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}


  // --------------------------------------------------
  // Lifecycle
  // --------------------------------------------------

  ngOnInit(): void {

    const storedResetToken =
      this.authService.getStoredResetToken();

    /*
     * Restore the reset flow if the user
     * refreshes the page after OTP verification.
     */

    if (storedResetToken) {
      this.currentStep = 3;
      this.otpSent = true;
      this.otpVerified = true;
    }

    this.initForms();
  }


  ngOnDestroy(): void {
    this.clearResendTimer();
  }


  // --------------------------------------------------
  // Form initialization
  // --------------------------------------------------

  initForms(): void { 
    // OTP form 
    this.verifyOtpForm = this.fb.group({ 
      otp: [ 
        '', 
        [ 
          Validators.required, 
          Validators.minLength(6), 
          Validators.maxLength(6), 
          Validators.pattern(/^[0-9]+$/) 
        ] 
      ] 
    }); // Fixed: changed ]); to });

    // Password form 
    this.resetPasswordForm = this.fb.group( 
      { 
        password: [ 
          '', 
          [ 
            Validators.required, 
            Validators.minLength(8), 
            Validators.pattern( 
              /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/ 
            ) 
          ] 
        ], 
        confirmPassword: [ '', Validators.required ] 
      }, 
      { validators: this.passwordMatchValidator } 
    ); 
  }



  // --------------------------------------------------
  // Password matching validator
  // --------------------------------------------------

  passwordMatchValidator(
    control: AbstractControl
  ): ValidationErrors | null {

    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    if (!password.value || !confirmPassword.value) {
      return null;
    }

    return password.value === confirmPassword.value
      ? null
      : { passwordMismatch: true };
  }


  // --------------------------------------------------
  // Step 1: Request OTP
  // --------------------------------------------------

  onSubmitForgotPassword(): void {

    if (this.isSendingOtp) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.isSendingOtp = true;

    /*
     * No email is sent from Angular.
     *
     * Backend gets the user's email
     * from the authenticated user's Profile.
     */

    this.authService.forgotPassword().subscribe({

      next: (response) => {

        this.isSendingOtp = false;

        this.successMessage =
          response.message || 'OTP sent to your email.';

        this.otpSent = true;
        this.currentStep = 2;

        this.startResendTimer();
      },

      error: (error) => {

        this.isSendingOtp = false;

        this.errorMessage =
          error.message ||
          'Failed to send OTP. Please try again.';
      }
    });
  }


  // --------------------------------------------------
  // Step 2: Verify OTP
  // --------------------------------------------------

  onVerifyOtp(): void {

    if (this.verifyOtpForm.invalid) {
      this.markFormGroupTouched(this.verifyOtpForm);
      return;
    }

    if (this.isVerifyingOtp) {
      return;
    }

    const otp =
      this.verifyOtpForm.get('otp')?.value;

    if (!otp) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.isVerifyingOtp = true;

    /*
     * No email is sent.
     * Backend identifies the user from
     * the authenticated request.
     */

    this.authService.verifyOtp(otp).subscribe({

      next: (response) => {

        this.isVerifyingOtp = false;

        this.successMessage =
          response.message ||
          'OTP verified successfully.';

        this.otpVerified = true;

        if (response.resetToken) {

          localStorage.setItem(
            'resetToken',
            response.resetToken
          );

          this.currentStep = 3;
        }
      },

      error: (error) => {

        this.isVerifyingOtp = false;

        this.errorMessage =
          error.message ||
          'Invalid OTP. Please try again.';
      }
    });
  }


  // --------------------------------------------------
  // Step 3: Reset Password
  // --------------------------------------------------

  onSubmitResetPassword(): void {

    if (this.resetPasswordForm.invalid) {
      this.markFormGroupTouched(this.resetPasswordForm);
      return;
    }

    if (this.isResettingPassword) {
      return;
    }

    const newPassword =
      this.resetPasswordForm.get('password')?.value;

    const resetToken =
      this.authService.getStoredResetToken();

    if (!resetToken) {

      this.errorMessage =
        'Reset session expired. Please request a new OTP.';

      this.currentStep = 1;

      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.isResettingPassword = true;

    /*
     * No email is sent.
     *
     * Backend gets the user from the
     * authenticated request/profile.
     */

    this.authService
      .resetPassword(resetToken, newPassword)
      .subscribe({

        next: (response) => {

          this.isResettingPassword = false;
          this.passwordReset = true;

          this.successMessage =
            response.message ||
            'Password reset successfully.';

          this.authService.clearResetData();

          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 3000);
        },

        error: (error) => {

          this.isResettingPassword = false;

          this.passwordReset = false;

          this.errorMessage =
            error.message ||
            'Failed to reset password. Please try again.';
        }
      });
  }


  // --------------------------------------------------
  // Resend OTP
  // --------------------------------------------------

  resendOtp(): void {

    if (!this.canResendOtp || this.isSendingOtp) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.isSendingOtp = true;

    // No email parameter.
    this.authService.forgotPassword().subscribe({

      next: (response) => {

        this.isSendingOtp = false;

        this.successMessage =
          response.message ||
          'New OTP sent to your email.';

        this.startResendTimer();
      },

      error: (error) => {

        this.isSendingOtp = false;

        this.errorMessage =
          error.message ||
          'Failed to resend OTP. Please try again.';
      }
    });
  }


  // --------------------------------------------------
  // OTP timer
  // --------------------------------------------------

  startResendTimer(): void {

    this.clearResendTimer();

    this.canResendOtp = false;
    this.resendTimer = 60;

    this.resendInterval = setInterval(() => {

      this.resendTimer--;

      if (this.resendTimer <= 0) {

        this.resendTimer = 0;
        this.canResendOtp = true;

        this.clearResendTimer();
      }

    }, 1000);
  }


  clearResendTimer(): void {

    if (this.resendInterval !== null) {

      clearInterval(this.resendInterval);
      this.resendInterval = null;
    }
  }


  // --------------------------------------------------
  // Go back one step
  // --------------------------------------------------

  goBack(): void {

    if (this.currentStep <= 1) {
      return;
    }

    this.currentStep--;

    this.errorMessage = '';
    this.successMessage = '';

    if (this.currentStep === 1) {

      this.otpSent = false;
      this.otpVerified = false;

      this.clearResendTimer();
    }

    else if (this.currentStep === 2) {

      this.otpVerified = false;
    }
  }


  // --------------------------------------------------
  // Go to login
  // --------------------------------------------------

  goToLogin(): void {

    this.authService.clearResetData();

    this.clearResendTimer();

    this.router.navigate(['/login']);
  }


  // --------------------------------------------------
  // Mark form controls as touched
  // --------------------------------------------------

  markFormGroupTouched(formGroup: FormGroup): void {

    Object.values(formGroup.controls).forEach(control => {

      control.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }


  // --------------------------------------------------
  // Validation error messages
  // --------------------------------------------------

  getErrorMessage(
    formGroup: FormGroup,
    controlName: string
  ): string {

    const control =
      formGroup.get(controlName);

    if (!control || !control.errors || !control.touched) {
      return '';
    }

    const errors = control.errors;

    if (errors['required']) {
      return `${this.getFieldLabel(controlName)} is required.`;
    }

    if (errors['minlength']) {

      return `${this.getFieldLabel(controlName)} must be at least ${errors['minlength'].requiredLength} characters.`;
    }

    if (errors['maxlength']) {

      return `${this.getFieldLabel(controlName)} cannot exceed ${errors['maxlength'].requiredLength} characters.`;
    }

    if (errors['pattern']) {

      if (controlName === 'password') {

        return 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.';
      }

      if (controlName === 'otp') {

        return 'OTP must contain only numbers.';
      }
    }

    return 'Invalid input.';
  }


  // --------------------------------------------------
  // Field labels
  // --------------------------------------------------

  getFieldLabel(controlName: string): string {

    const labels: Record<string, string> = {

      otp: 'OTP',
      password: 'Password',
      confirmPassword: 'Confirm Password'

    };

    return labels[controlName] || controlName;
  }


  // --------------------------------------------------
  // Password visibility
  // --------------------------------------------------

  togglePasswordVisibility(): void {

    this.showPassword =
      !this.showPassword;
  }


  toggleConfirmPasswordVisibility(): void {

    this.showConfirmPassword =
      !this.showConfirmPassword;
  }


  // --------------------------------------------------
  // Form errors
  // --------------------------------------------------

  hasError(
    formGroup: FormGroup,
    controlName: string,
    errorType: string
  ): boolean {

    const control =
      formGroup.get(controlName);

    return !!control &&
      control.hasError(errorType) &&
      control.touched;
  }


  // --------------------------------------------------
  // Password requirement getters
  // --------------------------------------------------

  get passwordValue(): string {

    return this.resetPasswordForm
      ?.get('password')
      ?.value || '';
  }


  get hasMinimumLength(): boolean {

    return this.passwordValue.length >= 8;
  }


  get hasUppercase(): boolean {

    return /[A-Z]/.test(this.passwordValue);
  }


  get hasLowercase(): boolean {

    return /[a-z]/.test(this.passwordValue);
  }


  get hasNumber(): boolean {

    return /[0-9]/.test(this.passwordValue);
  }


  get hasSpecialCharacter(): boolean {

    return /[@$!%*?&]/.test(this.passwordValue);
  }


  // --------------------------------------------------
  // Progress
  // --------------------------------------------------

  getProgressPercentage(): number {

    return ((this.currentStep - 1) / (this.maxSteps - 1)) * 100;
  }


  // --------------------------------------------------
  // Reset entire flow
  // --------------------------------------------------

  resetFlow(): void {

    this.currentStep = 1;

    this.otpSent = false;
    this.otpVerified = false;
    this.passwordReset = false;

    this.errorMessage = '';
    this.successMessage = '';

    this.showPassword = false;
    this.showConfirmPassword = false;

    this.authService.clearResetData();

    this.clearResendTimer();

    this.initForms();
  }
}