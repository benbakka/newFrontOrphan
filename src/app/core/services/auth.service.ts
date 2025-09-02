import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, JwtResponse, User } from '../models/auth.model';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/api/auth`;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Check if user is already logged in on page load
    this.initializeAuthState();
  }

  private initializeAuthState(): void {
    const token = this.getToken();
    if (token && this.isLoggedIn()) {
      const user = this.getUserFromToken(token);
      if (user && user.id) {
        console.log('Restoring user from token:', user);
        this.currentUserSubject.next(user);
      } else {
        console.log('Invalid user data in token, logging out');
        this.logout();
      }
    } else {
      console.log('No valid token found, user not logged in');
      this.logout();
    }
  }

  login(credentials: LoginRequest): Observable<JwtResponse> {
    return this.http.post<JwtResponse>(`${this.apiUrl}/login`, credentials)
      .pipe(
        tap(response => {
          if (response.token) {
            if (isPlatformBrowser(this.platformId)) {
              localStorage.setItem('token', response.token);
            }
            const user: User = {
              id: response.id,
              username: response.username,
              email: response.email,
              roles: response.roles
            };
            this.currentUserSubject.next(user);
          }
        })
      );
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
    }
    this.currentUserSubject.next(null);
  }

  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('token');
    }
    return null;
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;
    
    // Check if token is expired
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp > currentTime;
    } catch {
      return false;
    }
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  private getUserFromToken(token: string): User | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('JWT Payload:', payload); // Debug log to see available fields
      
      // Extract user ID from the userId claim we added in backend
      let userId = payload.userId || payload.id || payload.user_id;
      
      // If no numeric ID found, try to get it from username by making API call
      if (!userId || userId === payload.sub) {
        console.warn('No numeric user ID found in JWT token, will need to fetch from API');
        // For now, we'll handle this in the permission service
        userId = null;
      }
      
      console.log('Extracted User ID:', userId);
      
      return {
        id: userId,
        username: payload.sub || payload.username || payload.user_name,
        email: payload.email,
        roles: payload.roles || payload.authorities || []
      };
    } catch (error) {
      console.error('Error parsing JWT token:', error);
      return null;
    }
  }
}
