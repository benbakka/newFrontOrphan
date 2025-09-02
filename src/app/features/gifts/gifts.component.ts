import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { GiftTypeService } from '../../core/services/gift-type.service';
import { GiftType } from '../../core/models/gift-type.model';
import { Donation } from '../../core/models/donation.model';
import { Gift } from '../../core/models/gift.model';

export interface GiftTypeCategory {
  name: string;
  icon: string;
  color: string;
  giftTypes: GiftType[];
  isExpanded: boolean;
  totalDonations: number;
  totalExpenses: number;
  balance: number;
}

@Component({
  selector: 'app-gifts',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './gifts.component.html',
  styleUrls: ['./gifts.component.scss']
})

export class GiftsComponent implements OnInit {
  giftTypes: GiftType[] = [];
  categories: GiftTypeCategory[] = [];
  selectedGiftType: GiftType | null = null;
  donations: Donation[] = [];
  expenses: Gift[] = [];
  isLoading: boolean = false;
  isLoadingDetails: boolean = false;
  error: string = '';
  showDetailView: boolean = false;
  activeTab: string = 'donations';

  // Summary statistics
  totalFunds: number = 0;
  totalDonations: number = 0;
  totalExpenses: number = 0;
  activeGiftTypes: number = 0;

  // Category mapping configuration
  private categoryMappings = {
    'Orphan': {
      keywords: ['orphan', 'sponsorship', 'eid', 'school', 'medical', 'general gift'],
      icon: 'fas fa-child',
      color: 'primary'
    },
    'WASH': {
      keywords: ['water', 'well', 'wash', 'latrine', 'drinkwater', 'handpump', 'electrical pump', 'solar panel', 'artesian'],
      icon: 'fas fa-tint',
      color: 'info'
    },
    'Education': {
      keywords: ['education', 'school', 'learning', 'books', 'scholarship', 'teacher'],
      icon: 'fas fa-graduation-cap',
      color: 'success'
    },
    'Zakat': {
      keywords: ['zakat', 'zakah'],
      icon: 'fas fa-hand-holding-heart',
      color: 'warning'
    },
    'Ramadan': {
      keywords: ['ramadan', 'iftar', 'suhoor', 'breaking fast'],
      icon: 'fas fa-moon',
      color: 'secondary'
    },
    'Udhiyah': {
      keywords: ['udhiyah', 'qurbani', 'sacrifice', 'eid al-adha'],
      icon: 'fas fa-sheep',
      color: 'danger'
    }
  };

  constructor(private giftTypeService: GiftTypeService) {}

  ngOnInit(): void {
    this.loadGiftTypes();
  }

  loadGiftTypes(): void {
    this.isLoading = true;
    this.error = '';
    
    this.giftTypeService.getAllGiftTypesWithBalances().subscribe({
      next: (giftTypes) => {
        this.giftTypes = giftTypes.filter(gt => gt.isActive);
        this.organizeIntoCategories();
        this.calculateSummaryStats();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading gift types:', error);
        this.error = 'Failed to load gift types';
        this.isLoading = false;
      }
    });
  }

  calculateSummaryStats(): void {
    this.totalFunds = 0;
    this.totalDonations = 0;
    this.totalExpenses = 0;
    this.activeGiftTypes = this.giftTypes.length;

    this.giftTypes.forEach(giftType => {
      this.totalDonations += giftType.totalDonations || 0;
      this.totalExpenses += giftType.totalExpenses || 0;
      this.totalFunds += giftType.balance || 0;
    });
  }

  openGiftTypeDetails(giftType: GiftType): void {
    this.selectedGiftType = giftType;
    this.showDetailView = true;
    this.loadGiftTypeDetails(giftType.id);
  }

  loadGiftTypeDetails(giftTypeId: number): void {
    this.isLoadingDetails = true;
    this.donations = [];
    this.expenses = [];

    // Load donations
    this.giftTypeService.getDonationsByGiftType(giftTypeId).subscribe({
      next: (donations) => {
        this.donations = donations;
        this.checkDetailsLoadingComplete();
      },
      error: (error) => {
        console.error('Error loading donations:', error);
        this.checkDetailsLoadingComplete();
      }
    });

    // Load expenses
    this.giftTypeService.getExpensesByGiftType(giftTypeId).subscribe({
      next: (expenses) => {
        this.expenses = expenses;
        this.checkDetailsLoadingComplete();
      },
      error: (error) => {
        console.error('Error loading expenses:', error);
        this.checkDetailsLoadingComplete();
      }
    });
  }

  private checkDetailsLoadingComplete(): void {
    // Simple check - if we have responses for both calls, stop loading
    // This is a simplified approach; in production, you might use forkJoin
    if (this.donations !== undefined && this.expenses !== undefined) {
      this.isLoadingDetails = false;
    }
  }

  closeDetailView(): void {
    this.showDetailView = false;
    this.selectedGiftType = null;
    this.donations = [];
    this.expenses = [];
    this.activeTab = 'donations';
  }

  switchTab(tab: string): void {
    this.activeTab = tab;
  }

  formatCurrency(amount: number | undefined): string {
    if (amount === undefined || amount === null) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  }

  getBalanceClass(balance: number | undefined): string {
    if (!balance) return 'text-muted';
    if (balance > 1000) return 'text-success';
    if (balance > 100) return 'text-warning';
    return 'text-danger';
  }

  getBalanceIcon(balance: number | undefined): string {
    if (!balance) return 'fas fa-minus';
    if (balance > 1000) return 'fas fa-arrow-up';
    if (balance > 100) return 'fas fa-minus';
    return 'fas fa-arrow-down';
  }

  organizeIntoCategories(): void {
    // Initialize categories
    this.categories = Object.keys(this.categoryMappings).map(categoryName => ({
      name: categoryName,
      icon: this.categoryMappings[categoryName as keyof typeof this.categoryMappings].icon,
      color: this.categoryMappings[categoryName as keyof typeof this.categoryMappings].color,
      giftTypes: [],
      isExpanded: false,
      totalDonations: 0,
      totalExpenses: 0,
      balance: 0
    }));

    // Add "Other" category for unmatched gift types
    this.categories.push({
      name: 'Other',
      icon: 'fas fa-ellipsis-h',
      color: 'dark',
      giftTypes: [],
      isExpanded: false,
      totalDonations: 0,
      totalExpenses: 0,
      balance: 0
    });

    // Categorize gift types
    this.giftTypes.forEach(giftType => {
      let categorized = false;
      
      for (const category of this.categories) {
        if (category.name === 'Other') continue;
        
        const mapping = this.categoryMappings[category.name as keyof typeof this.categoryMappings];
        const giftTypeName = giftType.name.toLowerCase();
        
        if (mapping.keywords.some(keyword => giftTypeName.includes(keyword.toLowerCase()))) {
          category.giftTypes.push(giftType);
          category.totalDonations += giftType.totalDonations || 0;
          category.totalExpenses += giftType.totalExpenses || 0;
          category.balance += giftType.balance || 0;
          categorized = true;
          break;
        }
      }
      
      // If not categorized, add to "Other"
      if (!categorized) {
        const otherCategory = this.categories.find(c => c.name === 'Other')!;
        otherCategory.giftTypes.push(giftType);
        otherCategory.totalDonations += giftType.totalDonations || 0;
        otherCategory.totalExpenses += giftType.totalExpenses || 0;
        otherCategory.balance += giftType.balance || 0;
      }
    });

    // Remove empty categories
    this.categories = this.categories.filter(category => category.giftTypes.length > 0);
  }

  toggleCategory(category: GiftTypeCategory): void {
    category.isExpanded = !category.isExpanded;
  }

  refresh(): void {
    this.loadGiftTypes();
  }

  // Get progress percentage for visual indicators
  getProgressPercentage(current: number, total: number): number {
    if (total === 0) return 0;
    return Math.min((current / total) * 100, 100);
  }

  // Get card background class based on balance
  getCardClass(giftType: GiftType): string {
    const balance = giftType.balance || 0;
    if (balance > 1000) return 'border-success';
    if (balance > 100) return 'border-warning';
    if (balance <= 0) return 'border-danger';
    return 'border-secondary';
  }
}
