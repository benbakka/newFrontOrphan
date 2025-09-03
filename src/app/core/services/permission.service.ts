import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { UserService } from '../../shared/services/user.service';
import { Permission } from '../../shared/models/user.model';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private userPermissions: Permission[] = [];
  private permissionsSubject = new BehaviorSubject<Permission[]>([]);
  private permissionsLoadedSubject = new BehaviorSubject<boolean>(false);

  public permissions$ = this.permissionsSubject.asObservable();
  public permissionsLoaded$ = this.permissionsLoadedSubject.asObservable();

  constructor(
    private authService: AuthService,
    private userService: UserService
  ) {
    // Initialize permissions after a short delay to ensure auth service is ready
    setTimeout(() => {
      this.loadUserPermissions();
    }, 100);

    // Reload permissions when user changes
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.loadUserPermissions();
      } else {
        this.userPermissions = [];
        this.permissionsSubject.next([]);
        this.permissionsLoadedSubject.next(true);
      }
    });
  }

  private loadUserPermissions(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      console.log('No current user found, skipping permission load');
      this.permissionsLoadedSubject.next(true);
      return;
    }

    // Admin users have all permissions
    if (currentUser.roles && currentUser.roles.includes('ROLE_ADMIN')) {
      this.userPermissions = [
        { route: '/orphan-management', canAccess: true },
        { route: '/donor-management', canAccess: true },
        { route: '/gifts', canAccess: true },
        { route: '/charity-projects', canAccess: true },
        { route: '/user-management', canAccess: true },
        { route: '/reports', canAccess: true }
      ];
      this.permissionsSubject.next(this.userPermissions);
      this.permissionsLoadedSubject.next(true);
      return;
    }

    if (!currentUser.id) {
      console.log('User ID is null/undefined, trying to fetch user by username');
      // Try to get user ID by username from backend
      this.getUserIdByUsername(currentUser.username);
      return;
    }

    // Load permissions from backend for non-admin users
    console.log('Loading permissions for user ID:', currentUser.id);
    console.log(currentUser.roles)
    this.userService.getUserPermissions(currentUser.id).subscribe({
      next: (permissions) => {
        console.log('Permissions loaded successfully:', permissions);
        this.userPermissions = permissions;
        this.permissionsSubject.next(permissions);
        this.permissionsLoadedSubject.next(true);
      },
      error: (error) => {
        console.error('Error loading user permissions:', error);
        // On error, set empty permissions but mark as loaded
        this.userPermissions = [];
        this.permissionsSubject.next([]);
        this.permissionsLoadedSubject.next(true);
      }
    });
  }

  hasPermission(route: string): boolean {
    const currentUser = this.authService.getCurrentUser();

    // Admin users have all permissions
    if (currentUser?.roles && currentUser.roles.includes('ROLE_ADMIN')) {
      return true;
    }

    // Check if user has permission for this route
    const permission = this.userPermissions.find(p => p.route === route);
    return permission ? permission.canAccess : false;
  }

  canAccessRoute(route: string): Observable<boolean> {
    return new Observable(observer => {
      const currentUser = this.authService.getCurrentUser();

      if (!currentUser) {
        observer.next(false);
        observer.complete();
        return;
      }

      // Admin users have all permissions
      if (currentUser.roles && currentUser.roles.includes('ROLE_ADMIN')) {
        observer.next(true);
        observer.complete();
        return;
      }

      // Check permissions
      const hasAccess = this.hasPermission(route);
      observer.next(hasAccess);
      observer.complete();
    });
  }

  refreshPermissions(): void {
    this.permissionsLoadedSubject.next(false);
    this.loadUserPermissions();
  }

  isPermissionsLoaded(): boolean {
    return this.permissionsLoadedSubject.value;
  }

  private getUserIdByUsername(username: string): void {
    // Get all users and find the one with matching username
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        const user = users.find(u => u.username === username);
        if (user && user.id) {
          console.log('Found user ID by username:', user.id);
          // Update the current user with the ID
          const currentUser = this.authService.getCurrentUser();
          if (currentUser) {
            currentUser.id = user.id;
            // Load permissions with the found user ID
            this.userService.getUserPermissions(user.id).subscribe({
              next: (permissions) => {
                console.log('Permissions loaded successfully:', permissions);
                this.userPermissions = permissions;
                this.permissionsSubject.next(permissions);
                this.permissionsLoadedSubject.next(true);
              },
              error: (error) => {
                console.error('Error loading user permissions:', error);
                this.userPermissions = [];
                this.permissionsSubject.next([]);
                this.permissionsLoadedSubject.next(true);
              }
            });
          }
        } else {
          console.error('User not found by username:', username);
          this.userPermissions = [];
          this.permissionsSubject.next([]);
          this.permissionsLoadedSubject.next(true);
        }
      },
      error: (error) => {
        console.error('Error fetching users:', error);
        this.userPermissions = [];
        this.permissionsSubject.next([]);
        this.permissionsLoadedSubject.next(true);
      }
    });
  }
}
