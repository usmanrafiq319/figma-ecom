import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ProfileService } from '../services/profile-service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProfileModel } from '../models/profile-model';
import { CreateProfileDto } from '../models/create-profile-dto';
import { UpdateProfileDto } from '../models/update-profile-dto';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule,RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit, OnDestroy {
  private profileService = inject(ProfileService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private sanitizer = inject(DomSanitizer);
  
  profileForm!: FormGroup;
  selectedFile: File | null = null;
  imagePreview: string | SafeUrl | null = null;
  private currentObjectUrl: string | null = null;
  private avatarLoaded = false;
  
  isLoading = signal(true);
  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  currentProfile = signal<ProfileModel | null>(null);
  isEditMode = signal(false);

  ngOnInit() {
    this.initializeForm();
    this.loadProfileFromToken();
  }

  ngOnDestroy() {
    this.revokeOldObjectUrl();
  }

  initializeForm() {
    this.profileForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  loadProfileFromToken() {
    this.isLoading.set(true);
    this.clearMessages();

    this.profileService.getProfile().subscribe({
      next: (profile) => {
        this.handleExistingProfile(profile);
      },
      error: (error) => {
        if (error === 'Profile not found' || error.includes('404')) {
          this.handleNewProfile();
        } else {
          this.errorMessage.set(error);
          this.isLoading.set(false);
        }
      }
    });
  }

  handleExistingProfile(profile: ProfileModel) {
    this.currentProfile.set(profile);
    this.isEditMode.set(true);
    this.profileForm.patchValue({ email: profile.email });
    
    // Load avatar
    this.loadAvatar();
  }

  loadAvatar() {
    // Don't reload if already loaded
    if (this.avatarLoaded) {
      this.isLoading.set(false);
      return;
    }

    this.profileService.getAvatarBlob().subscribe({
      next: (blob: Blob) => {
        if (blob && blob.size > 0) {
          this.revokeOldObjectUrl();
          this.currentObjectUrl = URL.createObjectURL(blob);
          this.imagePreview = this.sanitizer.bypassSecurityTrustUrl(this.currentObjectUrl);
          this.avatarLoaded = true;
        } else {
          console.warn('Received empty blob');
          this.imagePreview = null;
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load avatar:', err);
        this.imagePreview = null;
        this.isLoading.set(false);
      }
    });
  }

  handleNewProfile() {
    this.isEditMode.set(false);
    this.currentProfile.set(null);
    this.revokeOldObjectUrl();
    this.imagePreview = null;
    this.selectedFile = null;
    this.avatarLoaded = false;
    this.profileForm.patchValue({ email: '' });
    this.isLoading.set(false);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        this.errorMessage.set('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        this.errorMessage.set('Image size should be less than 10MB');
        return;
      }

      this.selectedFile = file;
      this.clearMessages();
      this.revokeOldObjectUrl();
      
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  createProfile() {
    if (this.profileForm.invalid) {
      this.markFormFieldsAsTouched();
      return;
    }

    if (!this.selectedFile) {
      this.errorMessage.set('Please select a profile image');
      return;
    }

    this.isSubmitting.set(true);
    this.clearMessages();

    const createDto: CreateProfileDto = {
      email: this.profileForm.get('email')?.value,
      image: this.selectedFile
    };

    this.profileService.createProfile(createDto).subscribe({
      next: (response) => {
        this.successMessage.set('Profile created successfully!');
        this.avatarLoaded = false; // Reset to reload avatar
        this.handleExistingProfile(response);
        this.isSubmitting.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error);
        this.isSubmitting.set(false);
      }
    });
  }

  updateProfile() {
    if (this.profileForm.invalid) {
      this.markFormFieldsAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.clearMessages();

    const updateDto: UpdateProfileDto = {
      email: this.profileForm.get('email')?.value,
      image: this.selectedFile || undefined
    };

    this.profileService.updateProfile(updateDto).subscribe({
      next: (response) => {
        this.successMessage.set('Profile updated successfully!');
        this.avatarLoaded = false; // Reset to reload avatar
        this.handleExistingProfile(response);
        this.selectedFile = null;
        this.isSubmitting.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error);
        this.isSubmitting.set(false);
      }
    });
  }

  deleteProfile() {
    const confirmDelete = confirm('Are you sure you want to delete your profile? This action cannot be undone.');
    if (!confirmDelete) return;

    this.isSubmitting.set(true);
    
    this.profileService.deleteProfile().subscribe({
      next: () => {
        this.successMessage.set('Profile deleted successfully');
        this.avatarLoaded = false;
        this.handleNewProfile();
        this.isSubmitting.set(false);
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 1500);
      },
      error: (error) => {
        this.errorMessage.set(error);
        this.isSubmitting.set(false);
      }
    });
  }

  onSubmit() {
    if (this.isEditMode()) {
      this.updateProfile();
    } else {
      this.createProfile();
    }
  }

  // Helper to get user initials for avatar placeholder
  getUserInitials(): string {
    const email = this.profileForm.get('email')?.value;
    if (email) {
      const name = email.split('@')[0];
      if (name.length >= 2) {
        return name.substring(0, 2).toUpperCase();
      }
      return name.substring(0, 1).toUpperCase();
    }
    return 'U';
  }

  private markFormFieldsAsTouched() {
    Object.keys(this.profileForm.controls).forEach(key => {
      this.profileForm.get(key)?.markAsTouched();
    });
  }

  private revokeOldObjectUrl() {
    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }
  }

  clearMessages() {
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }
}