import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { UserService } from '../../shared/services/user.service';

@Injectable({
  providedIn: 'root'
})
export class PermissionGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private userService: UserService,
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
    
    // Check user permissions for this route
    return this.userService.getUserPermissions(currentUser.id).pipe(
      map(permissions => {
        const hasPermission = permissions.some(p => 
          p.route === routePath && p.canAccess
        );
        
        if (!hasPermission) {
          // Redirect to access denied page
          this.router.navigate(['/access-denied']);
          return false;
        }
        
        return true;
      }),
      catchError(error => {
        console.error('Error checking permissions:', error);
        // On error, allow access for now (could be changed to deny)
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
