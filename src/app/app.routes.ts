import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { PermissionGuard } from './core/guards/permission.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'orphan-card/:id',
    loadComponent: () => import('./features/orphan-id-card/orphan-id-card.component').then(m => m.OrphanIdCardComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'donors',
    loadComponent: () => import('./features/donor-management/donor-management.component').then(m => m.DonorManagementComponent),
    canActivate: [AuthGuard, PermissionGuard]
  },
  {
    path: 'charity-projects',
    loadComponent: () => import('./features/charity-projects/charity-projects.component').then(m => m.CharityProjectsComponent),
    canActivate: [AuthGuard, PermissionGuard]
  },
  {
    path: 'gifts',
    loadComponent: () => import('./features/gifts/gifts.component').then(m => m.GiftsComponent),
    canActivate: [AuthGuard, PermissionGuard]
  },
  {
    path: 'user-management',
    loadComponent: () => import('./features/user-management/user-management.component').then(m => m.UserManagementComponent),
    canActivate: [AuthGuard, PermissionGuard]
  },
  {
    path: 'access-denied',
    loadComponent: () => import('./features/access-denied/access-denied.component').then(m => m.AccessDeniedComponent)
  },
  {
    path: 'logout',
    loadComponent: () => import('./features/logout/logout.component').then(m => m.LogoutComponent)
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
