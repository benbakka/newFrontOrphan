import { Component, OnInit, Type } from '@angular/core';
import { CommonModule, NgComponentOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { PermissionService } from '../../core/services/permission.service';
import { AccessControlService } from '../../shared/services/access-control.service';
import { Router } from '@angular/router';
import { User } from '../../core/models/auth.model';
import { OrphanManagementComponent } from '../orphan-management/orphan-management.component';
import { DonorManagementComponent } from '../donor-management/donor-management.component';
import { CharityProjectsComponent } from '../charity-projects/charity-projects.component';
import { UserManagementComponent } from '../user-management/user-management.component';
import { ReportsComponent } from '../reports/reports.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NgComponentOutlet, FormsModule, OrphanManagementComponent, DonorManagementComponent, CharityProjectsComponent, UserManagementComponent, ReportsComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  styles: [`
    .logout-btn {
      transition: all 0.3s ease;
      background-color: rgba(255, 255, 255, 0.15);
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    }
    
    .logout-btn:hover {
      background-color: rgba(255, 255, 255, 0.25);
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }
    
    .logout-btn:active {
      transform: translateY(1px);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
  `]
})
export class DashboardComponent implements OnInit {
  currentUser: User | null = null;
  activeTab = 'orphans';
  giftsComponent: Type<any> | null = null;
  permissionsLoaded = false;
  isLoadingPermissions = true;
  availableTabs: string[] = [];

  constructor(
    private authService: AuthService,
    private permissionService: PermissionService,
    private accessControlService: AccessControlService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Initialize current user immediately if available
    this.currentUser = this.authService.getCurrentUser();
    
    // Subscribe to user changes
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.initializePermissions();
      } else {
        this.isLoadingPermissions = false;
        this.permissionsLoaded = false;
        this.availableTabs = [];
      }
    });
  }

  private initializePermissions(): void {
    this.isLoadingPermissions = true;
    
    // Subscribe to permission loading state
    this.permissionService.permissionsLoaded$.subscribe(loaded => {
      this.permissionsLoaded = loaded;
      this.isLoadingPermissions = !loaded;
      
      if (loaded) {
        this.updateAvailableTabs();
        this.setDefaultTab();
      }
    });
  }

  private updateAvailableTabs(): void {
    const allTabs = [
      { key: 'orphans', route: '/orphan-management' },
      { key: 'donors', route: '/donor-management' },
      { key: 'gifts', route: '/gifts' },
      { key: 'projects', route: '/charity-projects' },
      { key: 'users', route: '/user-management' },
      { key: 'reports', route: '/reports' }
    ];

    this.availableTabs = allTabs
      .filter(tab => this.hasPermission(tab.route))
      .map(tab => tab.key);
  }

  private setDefaultTab(): void {
    // Set the first available tab based on permissions
    if (this.availableTabs.length > 0) {
      // Only change active tab if current tab is not available
      if (!this.availableTabs.includes(this.activeTab)) {
        this.activeTab = this.availableTabs[0];
      }
    } else {
      // No tabs available - user has no permissions
      this.activeTab = '';
    }
  }

  hasPermission(route: string): boolean {
    if (!this.currentUser) return false;
    
    // Admin users have all permissions
    if (this.currentUser.roles && this.currentUser.roles.includes('ROLE_ADMIN')) {
      return true;
    }
    
    // Use permission service for all routes to check actual database permissions
    return this.permissionService.hasPermission(route);
  }

  setActiveTab(tab: string): void {
    // Only allow switching to available tabs
    if (this.availableTabs.includes(tab)) {
      this.activeTab = tab;
    } else if (this.permissionsLoaded) {
      // Redirect to access denied if no permission and permissions are loaded
      this.router.navigate(['/access-denied']);
    }
  }

  logout(): void {
    // Navigate to logout page which handles the logout process with animation
    this.router.navigate(['/logout']);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  exportReport(format: 'pdf' | 'excel'): void {
    // Implementation for export functionality
    console.log(`Exporting report as ${format}`);
    // This would integrate with a library like jsPDF or ExcelJS
  }

  printReport(): void {
    // Implementation for print functionality
    window.print();
  }
}
