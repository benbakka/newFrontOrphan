import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { GiftTypeService } from '../../core/services/gift-type.service';
import { GiftType } from '../../core/models/gift-type.model';

@Component({
  selector: 'app-fund-box-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './fund-box-dashboard.component.html',
  styleUrls: ['./fund-box-dashboard.component.scss']
})
export class FundBoxDashboardComponent implements OnInit {
  giftTypes: GiftType[] = [];
  isLoading: boolean = false;
  error: string = '';
  
  // Summary statistics
  totalFunds: number = 0;
  totalDonations: number = 0;
  totalExpenses: number = 0;
  activeGiftTypes: number = 0;
  lowBalanceTypes: number = 0;

  constructor(private giftTypeService: GiftTypeService) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.isLoading = true;
    this.giftTypeService.getAllGiftTypesWithBalances().subscribe({
      next: (giftTypes) => {
        this.giftTypes = giftTypes;
        this.calculateSummaryStats();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.error = 'Failed to load fund box data';
        this.isLoading = false;
      }
    });
  }

  calculateSummaryStats(): void {
    this.totalFunds = 0;
    this.totalDonations = 0;
    this.totalExpenses = 0;
    this.activeGiftTypes = 0;
    this.lowBalanceTypes = 0;

    this.giftTypes.forEach(giftType => {
      if (giftType.isActive) {
        this.activeGiftTypes++;
      }
      
      this.totalDonations += giftType.totalDonations || 0;
      this.totalExpenses += giftType.totalExpenses || 0;
      this.totalFunds += giftType.balance || 0;
      
      if ((giftType.balance || 0) <= 100) { // Low balance threshold
        this.lowBalanceTypes++;
      }
    });
  }

  formatCurrency(amount: number): string {
    if (amount === undefined || amount === null) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  getBalanceClass(balance: number): string {
    if (balance > 1000) return 'text-success';
    if (balance > 100) return 'text-warning';
    return 'text-danger';
  }

  getBalanceIcon(balance: number): string {
    if (balance > 1000) return 'fas fa-arrow-up';
    if (balance > 100) return 'fas fa-minus';
    return 'fas fa-arrow-down';
  }

  getProgressPercentage(current: number, total: number): number {
    if (total === 0) return 0;
    return Math.min((current / total) * 100, 100);
  }

  refresh(): void {
    this.loadDashboardData();
  }
}
