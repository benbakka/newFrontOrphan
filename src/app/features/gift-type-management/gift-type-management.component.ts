import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { GiftTypeService } from '../../core/services/gift-type.service';
import { GiftType, CreateGiftTypeRequest } from '../../core/models/gift-type.model';

@Component({
  selector: 'app-gift-type-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './gift-type-management.component.html',
  styleUrls: ['./gift-type-management.component.scss']
})
export class GiftTypeManagementComponent implements OnInit {
  giftTypes: GiftType[] = [];
  filteredGiftTypes: GiftType[] = [];
  searchTerm: string = '';
  isLoading: boolean = false;
  selectedGiftType: GiftType | null = null;
  
  // Form management
  giftTypeForm: FormGroup;
  isFormVisible: boolean = false;
  isEditMode: boolean = false;
  editingGiftTypeId: number | null = null;
  
  // Error and success states
  error: string = '';
  success: string = '';
  isSubmitting: boolean = false;

  constructor(
    private giftTypeService: GiftTypeService,
    private fb: FormBuilder
  ) {
    this.giftTypeForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['']
    });
  }

  ngOnInit(): void {
    this.loadGiftTypes();
    this.initializeDefaultGiftTypes();
  }

  loadGiftTypes(): void {
    this.isLoading = true;
    this.giftTypeService.getAllGiftTypesWithBalances().subscribe({
      next: (giftTypes) => {
        this.giftTypes = giftTypes;
        this.filteredGiftTypes = giftTypes;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading gift types:', error);
        this.error = 'Failed to load gift types';
        this.isLoading = false;
      }
    });
  }

  initializeDefaultGiftTypes(): void {
    this.giftTypeService.initializeDefaultGiftTypes().subscribe({
      next: () => {
        console.log('Default gift types initialized');
      },
      error: (error) => {
        console.error('Error initializing default gift types:', error);
      }
    });
  }

  filterGiftTypes(): void {
    if (!this.searchTerm.trim()) {
      this.filteredGiftTypes = this.giftTypes;
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredGiftTypes = this.giftTypes.filter(giftType =>
      giftType.name.toLowerCase().includes(term) ||
      (giftType.description && giftType.description.toLowerCase().includes(term))
    );
  }

  selectGiftType(giftType: GiftType): void {
    this.selectedGiftType = giftType;
    this.isFormVisible = false;
  }

  // Form methods
  openForm(giftType?: GiftType): void {
    this.isFormVisible = true;
    this.clearMessages();
    
    if (giftType) {
      this.isEditMode = true;
      this.editingGiftTypeId = giftType.id;
      this.giftTypeForm.patchValue({
        name: giftType.name,
        description: giftType.description || ''
      });
    } else {
      this.isEditMode = false;
      this.editingGiftTypeId = null;
      this.giftTypeForm.reset();
      this.selectedGiftType = null;
    }
  }

  closeForm(): void {
    this.isFormVisible = false;
    this.isEditMode = false;
    this.editingGiftTypeId = null;
    this.giftTypeForm.reset();
    this.clearMessages();
  }

  onSubmit(): void {
    if (this.giftTypeForm.valid) {
      this.isSubmitting = true;
      this.clearMessages();
      
      const giftTypeData: CreateGiftTypeRequest = this.giftTypeForm.value;
      
      if (this.isEditMode && this.editingGiftTypeId) {
        this.giftTypeService.updateGiftType(this.editingGiftTypeId, giftTypeData).subscribe({
          next: (updatedGiftType) => {
            this.success = 'Gift type updated successfully';
            this.loadGiftTypes();
            this.closeForm();
            this.isSubmitting = false;
          },
          error: (error) => {
            this.error = error.error?.message || 'Failed to update gift type';
            this.isSubmitting = false;
          }
        });
      } else {
        this.giftTypeService.createGiftType(giftTypeData).subscribe({
          next: (newGiftType) => {
            this.success = 'Gift type created successfully';
            this.loadGiftTypes();
            this.closeForm();
            this.isSubmitting = false;
          },
          error: (error) => {
            this.error = error.error?.message || 'Failed to create gift type';
            this.isSubmitting = false;
          }
        });
      }
    }
  }

  deactivateGiftType(id: number, name: string): void {
    if (confirm(`Are you sure you want to deactivate the gift type "${name}"?`)) {
      this.giftTypeService.deactivateGiftType(id).subscribe({
        next: () => {
          this.success = 'Gift type deactivated successfully';
          this.loadGiftTypes();
          if (this.selectedGiftType?.id === id) {
            this.selectedGiftType = null;
          }
        },
        error: (error) => {
          this.error = error.error?.message || 'Failed to deactivate gift type';
        }
      });
    }
  }

  clearMessages(): void {
    this.error = '';
    this.success = '';
  }

  formatCurrency(amount: number): string {
    if (amount === undefined || amount === null) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }

  getBalanceClass(balance: number): string {
    if (balance > 0) return 'text-success';
    if (balance === 0) return 'text-warning';
    return 'text-danger';
  }

  getBalanceIcon(balance: number): string {
    if (balance > 0) return 'fas fa-arrow-up';
    if (balance === 0) return 'fas fa-minus';
    return 'fas fa-arrow-down';
  }

  trackByGiftTypeId(index: number, giftType: GiftType): number {
    return giftType.id;
  }
}
