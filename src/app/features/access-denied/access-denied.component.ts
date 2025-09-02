import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container-fluid d-flex align-items-center justify-content-center min-vh-100">
      <div class="row justify-content-center w-100">
        <div class="col-md-6 col-lg-4">
          <div class="card shadow-lg border-0">
            <div class="card-body text-center p-5">
              <div class="mb-4">
                <i class="fas fa-lock text-danger" style="font-size: 4rem;"></i>
              </div>
              
              <h2 class="card-title text-danger mb-3">Access Denied</h2>
              
              <p class="card-text text-muted mb-4">
                You don't have permission to access this page. Please contact your administrator if you believe this is an error.
              </p>
              
              <div class="d-grid gap-2">
                <button 
                  class="btn btn-primary"
                  (click)="goToDashboard()"
                >
                  <i class="fas fa-home me-2"></i>
                  Go to Dashboard
                </button>
                
                <button 
                  class="btn btn-outline-secondary"
                  (click)="goBack()"
                >
                  <i class="fas fa-arrow-left me-2"></i>
                  Go Back
                </button>
              </div>
              
              <hr class="my-4">
              
              <div class="text-muted small">
                <p class="mb-1">
                  <strong>User:</strong> {{ currentUser?.username }}
                </p>
                <p class="mb-0">
                  <strong>Role:</strong> 
                  <span class="badge bg-secondary ms-1">
                    {{ getUserRole() }}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .min-vh-100 {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    
    .card {
      border-radius: 15px;
      backdrop-filter: blur(10px);
      background: rgba(255, 255, 255, 0.95);
    }
    
    .fas.fa-lock {
      opacity: 0.8;
    }
    
    .btn {
      border-radius: 8px;
      font-weight: 500;
    }
    
    .badge {
      font-size: 0.75rem;
    }
  `]
})
export class AccessDeniedComponent {
  currentUser: any;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {
    this.currentUser = this.authService.getCurrentUser();
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  goBack(): void {
    window.history.back();
  }

  getUserRole(): string {
    if (!this.currentUser?.roles || this.currentUser.roles.length === 0) {
      return 'No Role';
    }
    
    const role = this.currentUser.roles[0];
    switch (role) {
      case 'ROLE_ADMIN':
        return 'Administrator';
      case 'ROLE_USER':
        return 'User';
      case 'ROLE_VIEWER':
        return 'Viewer';
      default:
        return role.replace('ROLE_', '');
    }
  }
}
