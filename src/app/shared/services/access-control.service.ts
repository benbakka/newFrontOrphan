import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { PermissionService } from '../../core/services/permission.service';
import { User } from '../../core/models/auth.model';

export interface AccessControlState {
  canAccessOrphanManagement: boolean;
  canAccessDonorManagement: boolean;
  canAccessGifts: boolean;
  canAccessCharityProjects: boolean;
  canAccessUserManagement: boolean;
  canAccessReports: boolean;
  availableTabs: string[];
  isAdmin: boolean;
  user: User | null;
}

@Injectable({
  providedIn: 'root'
})
export class AccessControlService {
  private accessStateSubject = new BehaviorSubject<AccessControlState>({
    canAccessOrphanManagement: false,
    canAccessDonorManagement: false,
    canAccessGifts: false,
    canAccessCharityProjects: false,
    canAccessUserManagement: false,
    canAccessReports: false,
    availableTabs: [],
    isAdmin: false,
    user: null
  });

  public accessState$ = this.accessStateSubject.asObservable();

  constructor(
    private authService: AuthService,
    private permissionService: PermissionService
  ) {
    this.initializeAccessControl();
  }

  private initializeAccessControl(): void {
    // Combine user state and permissions to create access control state
    combineLatest([
      this.authService.currentUser$,
      this.permissionService.permissions$
    ]).pipe(
      map(([user, permissions]) => {
        if (!user) {
          return {
            canAccessOrphanManagement: false,
            canAccessDonorManagement: false,
            canAccessGifts: false,
            canAccessCharityProjects: false,
            canAccessUserManagement: false,
            canAccessReports: false,
            availableTabs: [],
            isAdmin: false,
            user: null
          };
        }

        const isAdmin = user.roles && user.roles.includes('ROLE_ADMIN');
        
        const canAccessOrphanManagement = isAdmin || this.hasPermission('/orphan-management', permissions);
        const canAccessDonorManagement = isAdmin || this.hasPermission('/donor-management', permissions);
        const canAccessGifts = isAdmin || this.hasPermission('/gifts', permissions);
        const canAccessCharityProjects = isAdmin || this.hasPermission('/charity-projects', permissions);
        const canAccessUserManagement = isAdmin || this.hasPermission('/user-management', permissions);
        const canAccessReports = isAdmin || this.hasPermission('/reports', permissions);

        const availableTabs: string[] = [];
        if (canAccessOrphanManagement) availableTabs.push('orphans');
        if (canAccessDonorManagement) availableTabs.push('donors');
        if (canAccessGifts) availableTabs.push('gifts');
        if (canAccessCharityProjects) availableTabs.push('projects');
        if (canAccessUserManagement) availableTabs.push('users');
        if (canAccessReports) availableTabs.push('reports');

        return {
          canAccessOrphanManagement,
          canAccessDonorManagement,
          canAccessGifts,
          canAccessCharityProjects,
          canAccessUserManagement,
          canAccessReports,
          availableTabs,
          isAdmin,
          user
        };
      })
    ).subscribe(state => {
      this.accessStateSubject.next(state);
    });
  }

  private hasPermission(route: string, permissions: any[]): boolean {
    return permissions.some(p => p.route === route && p.canAccess);
  }

  // Convenience methods for checking specific permissions
  canAccessRoute(route: string): Observable<boolean> {
    return this.accessState$.pipe(
      map(state => {
        if (state.isAdmin) return true;
        
        switch (route) {
          case '/orphan-management':
            return state.canAccessOrphanManagement;
          case '/donor-management':
            return state.canAccessDonorManagement;
          case '/gifts':
            return state.canAccessGifts;
          case '/charity-projects':
            return state.canAccessCharityProjects;
          case '/user-management':
            return state.canAccessUserManagement;
          case '/reports':
            return state.canAccessReports;
          default:
            return false;
        }
      })
    );
  }

  getFirstAvailableTab(): Observable<string | null> {
    return this.accessState$.pipe(
      map(state => state.availableTabs.length > 0 ? state.availableTabs[0] : null)
    );
  }

  isAdmin(): Observable<boolean> {
    return this.accessState$.pipe(map(state => state.isAdmin));
  }

  // Block access to unauthorized features within components
  blockUnauthorizedAccess(requiredRoute: string): Observable<boolean> {
    return this.canAccessRoute(requiredRoute).pipe(
      map(hasAccess => {
        if (!hasAccess) {
          console.warn(`Access denied to ${requiredRoute}. User lacks required permissions.`);
          return false;
        }
        return true;
      })
    );
  }
}
