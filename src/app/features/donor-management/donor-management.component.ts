import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DonorService } from '../../core/services/donor.service';
import { GiftService } from '../../core/services/gift.service';
import { Donor } from '../../core/models/donor.model';
import { DonorDetailDTO, Gift } from '../../core/models/gift.model';

@Component({
  selector: 'app-donor-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './donor-management.component.html',
  styleUrls: ['./donor-management.component.scss']
})
export class DonorManagementComponent implements OnInit {
  donors: Donor[] = [];
  filteredDonors: Donor[] = [];
  searchTerm: string = '';
  isLoading: boolean = false;
  selectedDonor: Donor | null = null;
  
  // Form management
  donorForm: FormGroup;
  isFormVisible: boolean = false;
  isEditMode: boolean = false;
  editingDonorId: number | null = null;
  
  // Excel upload properties
  isUploadModalVisible: boolean = false;
  selectedFile: File | null = null;
  isUploading: boolean = false;
  uploadProgress: number = 0;
  uploadSuccess: boolean = false;
  uploadError: string = '';
  dragOver: boolean = false;

  // Donor details modal
  isDonorDetailModalVisible: boolean = false;
  selectedDonorDetail: DonorDetailDTO | null = null;
  donorGifts: Gift[] = [];
  isLoadingDonorDetail: boolean = false;

  constructor(
    private donorService: DonorService,
    private giftService: GiftService,
    private fb: FormBuilder
  ) {
    this.donorForm = this.fb.group({
      donorId: ['', Validators.required],
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      address: ['', Validators.required],
      addressTwo: [''],
      city: ['', Validators.required],
      state: ['', Validators.required],
      zip: ['', Validators.required],
      country: ['', Validators.required],
      company: ['']
    });
  }

  ngOnInit(): void {
    this.loadDonors();
  }

  loadDonors(): void {
    this.isLoading = true;
    this.donorService.getDonors().subscribe({
      next: (donors) => {
        this.donors = donors;
        this.filteredDonors = donors;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading donors:', error);
        this.isLoading = false;
      }
    });
  }

  filterDonors(): void {
    if (!this.searchTerm.trim()) {
      this.filteredDonors = this.donors;
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredDonors = this.donors.filter(donor =>
      donor.name.toLowerCase().includes(term) ||
      donor.email.toLowerCase().includes(term) ||
      donor.donorId?.toLowerCase().includes(term) ||
      donor.phone.includes(term) ||
      donor.city.toLowerCase().includes(term) ||
      donor.country.toLowerCase().includes(term)
    );
  }

  // Selection and navigation methods
  selectDonor(donor: Donor): void {
    this.selectedDonor = donor;
    this.isFormVisible = false;
  }

  editDonor(donor: Donor): void {
    this.selectedDonor = donor;
    this.openForm(donor);
  }

  trackByDonorId(index: number, donor: Donor): number {
    return donor.id!;
  }

  // Form methods
  openForm(donor?: Donor): void {
    this.isFormVisible = true;
    if (donor) {
      this.isEditMode = true;
      this.editingDonorId = donor.id!;
      this.donorForm.patchValue(donor);
    } else {
      this.isEditMode = false;
      this.editingDonorId = null;
      this.donorForm.reset();
      this.selectedDonor = null;
    }
  }

  closeForm(): void {
    this.isFormVisible = false;
    this.isEditMode = false;
    this.editingDonorId = null;
    this.donorForm.reset();
  }

  onSubmit(): void {
    if (this.donorForm.valid) {
      const donorData = this.donorForm.value;
      
      if (this.isEditMode && this.editingDonorId) {
        this.donorService.updateDonor(this.editingDonorId, donorData).subscribe({
          next: () => {
            this.loadDonors();
            this.closeForm();
          },
          error: (error) => {
            console.error('Error updating donor:', error);
          }
        });
      } else {
        this.donorService.createDonor(donorData).subscribe({
          next: () => {
            this.loadDonors();
            this.closeForm();
          },
          error: (error) => {
            console.error('Error creating donor:', error);
          }
        });
      }
    }
  }

  deleteDonor(id: number): void {
    if (confirm('Are you sure you want to delete this donor?')) {
      this.donorService.deleteDonor(id).subscribe({
        next: () => {
          this.loadDonors();
        },
        error: (error) => {
          console.error('Error deleting donor:', error);
        }
      });
    }
  }

  // Excel Upload Methods
  openUploadModal(): void {
    this.resetUploadState();
    this.isUploadModalVisible = true;
    
    // Prevent body scroll
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = '17px'; // Compensate for scrollbar
  }

  closeUploadModal(): void {
    this.isUploadModalVisible = false;
    this.resetUploadState();
    
    // Restore body scroll
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }

  resetUploadState(): void {
    this.selectedFile = null;
    this.isUploading = false;
    this.uploadProgress = 0;
    this.uploadSuccess = false;
    this.uploadError = '';
    this.dragOver = false;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFileSelection(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFileSelection(input.files[0]);
    }
  }

  handleFileSelection(file: File): void {
    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      this.uploadError = 'Please select a valid Excel file (.xlsx or .xls)';
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      this.uploadError = 'File size must be less than 10MB';
      return;
    }

    this.selectedFile = file;
    this.uploadError = '';
  }

  uploadFile(): void {
    if (!this.selectedFile) return;

    this.isUploading = true;
    this.uploadProgress = 0;

    // Simulate progress
    const progressInterval = setInterval(() => {
      this.uploadProgress += 10;
      if (this.uploadProgress >= 90) {
        clearInterval(progressInterval);
      }
    }, 100);

    this.donorService.uploadExcelFile(this.selectedFile).subscribe({
      next: (donors) => {
        clearInterval(progressInterval);
        this.uploadProgress = 100;
        this.uploadSuccess = true;
        this.isUploading = false;
        
        // Refresh donor list
        this.loadDonors();
        
        // Close modal after 2 seconds
        setTimeout(() => {
          this.closeUploadModal();
        }, 2000);
      },
      error: (error) => {
        clearInterval(progressInterval);
        this.isUploading = false;
        this.uploadError = 'Upload failed. Please try again.';
        console.error('Upload error:', error);
      }
    });
  }

  removeFile(): void {
    this.selectedFile = null;
    this.uploadError = '';
  }

  // Donor Detail Management
  openDonorDetailModal(donor: Donor): void {
    this.isLoadingDonorDetail = true;
    this.isDonorDetailModalVisible = true;
    
    this.donorService.getDonorDetails(donor.id!).subscribe({
      next: (donorDetail) => {
        this.selectedDonorDetail = donorDetail;
        this.loadDonorGifts(donor.id!);
        this.isLoadingDonorDetail = false;
      },
      error: (error) => {
        console.error('Error loading donor details:', error);
        this.isLoadingDonorDetail = false;
      }
    });
  }

  closeDonorDetailModal(): void {
    this.isDonorDetailModalVisible = false;
    this.selectedDonorDetail = null;
    this.donorGifts = [];
  }

  loadDonorGifts(donorId: number): void {
    this.giftService.getGiftsByDonor(donorId).subscribe({
      next: (gifts) => {
        this.donorGifts = gifts;
      },
      error: (error) => {
        console.error('Error loading donor gifts:', error);
      }
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
}
