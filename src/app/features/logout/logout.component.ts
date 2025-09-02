import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-logout',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="logout-container">
      <div class="logout-card">
        <div class="logout-icon">
          <i class="fas fa-sign-out-alt fa-4x"></i>
        </div>
        <h2>Logging Out</h2>
        <p>Please wait while we log you out...</p>
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .logout-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background-color: #f8f9fa;
    }
    
    .logout-card {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      padding: 2rem;
      text-align: center;
      width: 100%;
      max-width: 400px;
    }
    
    .logout-icon {
      color: #0d6efd;
      margin-bottom: 1.5rem;
    }
    
    h2 {
      font-weight: 600;
      margin-bottom: 1rem;
    }
    
    p {
      color: #6c757d;
      margin-bottom: 1.5rem;
    }
  `]
})
export class LogoutComponent implements OnInit {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Short delay to show the logout screen
    setTimeout(() => {
      this.authService.logout();
      this.router.navigate(['/login']);
    }, 1500);
  }
}
