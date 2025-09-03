import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError, timeout } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { PermissionService } from '../services/permission.service';

@Injectable({
  providedIn: 'root'
})
export class PermissionGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private permissionService: PermissionService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    const currentUser = this.authService.getCurrentUser();
    
    if (!currentUser) {
      this.router.navigate(['/login']);
      return of(false);
    }

    // Admin users have access to all routes
    if (currentUser.roles && currentUser.roles.includes('ROLE_ADMIN')) {
      return of(true);
    }

    // Get the route path for permission checking
    const routePath = this.getRoutePermissionPath(state.url);
    
    // Use PermissionService with timeout to prevent infinite loading
    return this.permissionService.canAccessRoute(routePath).pipe(
      timeout(5000), // 5 second timeout
      map(hasAccess => {
        if (!hasAccess) {
          this.router.navigate(['/access-denied']);
          return false;
        }
        return true;
      }),
      catchError(error => {
        console.error('Error checking permissions:', error);
        // On timeout or error, allow access to prevent infinite loading
        return of(true);
      })
    );
  }

  private getRoutePermissionPath(url: string): string {
    // Map URL paths to permission route names
    if (url.startsWith('/orphan-management') || url.includes('orphan')) {
      return '/orphan-management';
    }
    if (url.startsWith('/donors') || url.includes('donor')) {
      return '/donor-management';
    }
    if (url.startsWith('/gifts')) {
      return '/gifts';
    }
    if (url.startsWith('/charity-projects')) {
      return '/charity-projects';
    }
    if (url.startsWith('/user-management')) {
      return '/user-management';
    }
    if (url.startsWith('/reports')) {
      return '/reports';
    }
    
    // Default to dashboard
    return '/dashboard';
  }
}
