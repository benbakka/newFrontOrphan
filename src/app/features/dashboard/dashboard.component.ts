import { Component, OnInit, Type } from '@angular/core';
import { CommonModule, NgComponentOutlet } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { User } from '../../core/models/auth.model';
import { OrphanManagementComponent } from '../orphan-management/orphan-management.component';
import { DonorManagementComponent } from '../donor-management/donor-management.component';
import { CharityProjectsComponent } from '../charity-projects/charity-projects.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NgComponentOutlet, OrphanManagementComponent, DonorManagementComponent, CharityProjectsComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  currentUser: User | null = null;
  activeTab = 'orphans';
  giftsComponent: Type<any> | null = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
    this.loadGiftsComponent();
  }

  async loadGiftsComponent(): Promise<void> {
    try {
      const { GiftsComponent } = await import('../gifts/gifts.component');
      this.giftsComponent = GiftsComponent;
    } catch (error) {
      console.error('Error loading GiftsComponent:', error);
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }
}
