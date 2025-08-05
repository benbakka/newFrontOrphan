import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

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
    canActivate: [AuthGuard]
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
