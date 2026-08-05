import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ProfileModel } from '../models/profile-model';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { UpdateProfileDto } from '../models/update-profile-dto';
import { CreateProfileDto } from '../models/create-profile-dto';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
    private readonly baseUrl = `${environment.apiUrl}/api/profile`;
  
  private http = inject(HttpClient);

 // profile-service.ts

getAvatarBlob(): Observable<Blob> {
  return this.http.get(`${this.baseUrl}/avatar`, { 
    responseType: 'blob',
    withCredentials: true  // Important: Send cookies/auth token
  }).pipe(
    catchError(this.handleError)
  );
}

// For all other requests
getProfile(): Observable<ProfileModel> {
  return this.http.get<ProfileModel>(this.baseUrl, {
    withCredentials: true
  }).pipe(
    catchError(this.handleError)
  );
}

  // Check if current authenticated user has a profile
  checkProfileExists(): Observable<boolean> {
    return this.http.get<ProfileModel>(this.baseUrl)
      .pipe(
        map(() => true),
        catchError(error => {
          if (error.status === 404 || error === 'Profile not found') {
            return of(false);
          }
          return throwError(() => error);
        })
      );
  }

  // POST: Create a profile for the token user
  createProfile(profileData: CreateProfileDto): Observable<ProfileModel> {
    const formData = new FormData();
    formData.append('email', profileData.email);
    formData.append('image', profileData.image, profileData.image.name);

    return this.http.post<ProfileModel>(this.baseUrl, formData)
      .pipe(
        catchError(this.handleError)
      );
  }

  // PUT: Update current profile based on token authentication
  updateProfile(profileData: UpdateProfileDto): Observable<ProfileModel> {
    const formData = new FormData();
    
    if (profileData.email) {
      formData.append('email', profileData.email);
    }
    
    if (profileData.image) {
      formData.append('image', profileData.image, profileData.image.name);
    }

    return this.http.put<ProfileModel>(this.baseUrl, formData)
      .pipe(
        catchError(this.handleError)
      );
  }

  // DELETE: Remove profile linked to access token
  deleteProfile(): Observable<any> {
    return this.http.delete(this.baseUrl)
      .pipe(
        catchError(this.handleError)
      );
  }

  private handleError(error: any) {
    let errorMessage = 'An error occurred';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = error.error.message;
    } else {
      errorMessage = error.error || error.message;
      
      switch (error.status) {
        case 400:
          errorMessage = error.error || 'Invalid request';
          break;
        case 401:
          errorMessage = 'Please login to continue';
          break;
        case 403:
          errorMessage = 'You do not have permission to perform this action';
          break;
        case 404:
          errorMessage = 'Profile not found';
          break;
        default:
          errorMessage = `Server error: ${error.message}`;
      }
    }
    
    console.error('API Error:', errorMessage);
    return throwError(() => errorMessage);
  }
}