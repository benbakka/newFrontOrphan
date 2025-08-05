import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OrphanService } from '../../core/services/orphan.service';
import { PdfService } from '../../core/services/pdf.service';
import { GiftService } from '../../core/services/gift.service';
import { DonorService } from '../../core/services/donor.service';
import { OrphanListDTO } from '../../core/models/orphan-list.dto';
import { OrphanDetailDTO } from '../../core/models/orphan-detail.dto';
import { Gift, CreateGiftRequest, GiftType, KafalaFrequency } from '../../core/models/gift.model';
import { Donor } from '../../core/models/donor.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-orphan-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './orphan-management.component.html',
  styleUrls: ['./orphan-management.component.scss']
})
export class OrphanManagementComponent implements OnInit {
  // Data properties
  orphansList: OrphanListDTO[] = [];
  selectedOrphan: OrphanDetailDTO | null = null;
  isLoading = false;
  isEditing = false;
  isCreating = false;

  // Form properties
  orphanForm: FormGroup;
  selectedPhoto: File | null = null;
  photoPreview: string | null = null;

  // UI state
  activeSection = 'basic'; // basic, family, education
  searchTerm = '';

  // Upload properties
  selectedFile: File | null = null;
  isDragOver = false;
  isUploading = false;
  uploadProgress = 0;
  uploadResults: { success: boolean; message: string; count?: number } | null = null;

  // Gift management properties
  orphanGifts: Gift[] = []; // For detail view
  modalGifts: Gift[] = []; // For modal view
  donors: Donor[] = [];
  giftForm: FormGroup;
  isGiftModalVisible = false;
  isGiftHistoryModalVisible = false;
  isAddingGift = false;
  isLoadingGifts = false;
  isLoadingModalGifts = false;
  selectedOrphanForGift: OrphanListDTO | null = null;
  GiftType = GiftType;
  KafalaFrequency = KafalaFrequency;

  constructor(
    private orphanService: OrphanService,
    private fb: FormBuilder,
    private router: Router,
    private pdfService: PdfService,
    private giftService: GiftService,
    private donorService: DonorService
  ) {
    this.orphanForm = this.createOrphanForm();
    this.giftForm = this.createGiftForm();
  }

  ngOnInit(): void {
    this.loadOrphansList();
  }

  // Data loading methods
  loadOrphansList(): void {
    this.isLoading = true;
    this.orphanService.getAllOrphans().subscribe({
      next: (orphans) => {
        this.orphansList = orphans;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading orphans:', error);
        this.isLoading = false;
      }
    });
  }

  // Form management
  createOrphanForm(): FormGroup {
    return this.fb.group({
      // Basic Information
      orphanId: ['', Validators.required],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      dob: ['', Validators.required],
      placeOfBirth: ['', Validators.required],
      gender: ['', Validators.required],
      location: ['', Validators.required],
      country: ['', Validators.required],
      healthStatus: ['', Validators.required],
      specialNeeds: [''],

      // Family Information
      ethnicGroup: [''],
      spokenLanguage: [''],
      fatherName: [''],
      fatherDateOfDeath: [''],
      fatherCauseOfDeath: [''],
      motherName: [''],
      motherStatus: [''],
      motherDateOfDeath: [''],
      motherCauseOfDeath: [''],
      numberOfSiblings: [0, [Validators.min(0)]],
      guardianName: [''],
      relationToOrphan: [''],
      livingCondition: [''],

      // Education Information
      schoolName: [''],
      gradeLevel: [''],
      favoriteSubject: [''],
      educationNeeds: [''],
      schoolPerformance: [''],
      orphanDream: [''],
      favoriteHobbies: [''],
      supervisorComments: ['']
    });
  }

  createGiftForm(): FormGroup {
    return this.fb.group({
      donorId: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      date: [new Date().toISOString().split('T')[0], Validators.required],
      description: [''],
      giftType: [GiftType.DONATION, Validators.required],
      kafalaFrequency: [''],
      isKafala: [false]
    });
  }

  populateForm(orphan: OrphanDetailDTO): void {
    this.orphanForm.patchValue({
      orphanId: orphan.orphanId,
      firstName: orphan.firstName,
      lastName: orphan.lastName,
      dob: orphan.dob,
      placeOfBirth: orphan.placeOfBirth,
      gender: orphan.gender,
      location: orphan.location,
      country: orphan.country,
      healthStatus: orphan.healthStatus,
      specialNeeds: orphan.specialNeeds,

      // Family Information
      ethnicGroup: orphan.familyInformation?.ethnicGroup || '',
      spokenLanguage: orphan.familyInformation?.spokenLanguage || '',
      fatherName: orphan.familyInformation?.fatherName || '',
      fatherDateOfDeath: orphan.familyInformation?.fatherDateOfDeath || '',
      fatherCauseOfDeath: orphan.familyInformation?.fatherCauseOfDeath || '',
      motherName: orphan.familyInformation?.motherName || '',
      motherStatus: orphan.familyInformation?.motherStatus || '',
      motherDateOfDeath: orphan.familyInformation?.motherDateOfDeath || '',
      motherCauseOfDeath: orphan.familyInformation?.motherCauseOfDeath || '',
      numberOfSiblings: orphan.familyInformation?.numberOfSiblings || 0,
      guardianName: orphan.familyInformation?.guardianName || '',
      relationToOrphan: orphan.familyInformation?.relationToOrphan || '',
      livingCondition: orphan.familyInformation?.livingCondition || '',

      // Education Information
      schoolName: orphan.education?.schoolName || '',
      gradeLevel: orphan.education?.gradeLevel || '',
      favoriteSubject: orphan.education?.favoriteSubject || '',
      educationNeeds: orphan.education?.educationNeeds || '',
      schoolPerformance: orphan.education?.schoolPerformance || '',
      orphanDream: orphan.education?.orphanDream || '',
      favoriteHobbies: orphan.education?.favoriteHobbies || '',
      supervisorComments: orphan.education?.supervisorComments || ''
    });

    // Set photo preview if exists
    if (orphan.photo) {
      // If the photo is a relative path, construct the full URL
      if (orphan.photo.startsWith('/uploads') || orphan.photo.startsWith('uploads')) {
        this.photoPreview = `${environment.apiUrl}${orphan.photo.startsWith('/') ? '' : '/'}${orphan.photo}`;
      } else if (orphan.photo.startsWith('http')) {
        // Already a full URL
        this.photoPreview = orphan.photo;
      } else {
        // Base64 or other format
        this.photoPreview = orphan.photo;
      }
    } else {
      this.photoPreview = null;
    }
  }

  // CRUD operations
  createNewOrphan(): void {
    this.selectedOrphan = this.orphanService.createEmptyOrphan();
    this.orphanForm.reset();
    this.photoPreview = null;
    this.selectedPhoto = null;
    this.isCreating = true;
    this.isEditing = true;
    this.activeSection = 'basic';
  }

  editOrphan(orphan: OrphanListDTO): void {
    this.loadOrphanDetails(orphan.id);
    this.activeSection = 'basic';
  }

  loadOrphanDetails(orphanId: number): void {
    console.log('Loading orphan details for ID:', orphanId);
    this.isLoading = true;
    this.orphanService.getOrphanById(orphanId).subscribe({
      next: (orphan) => {
        console.log('Loaded orphan details:', orphan);
        this.selectedOrphan = orphan;
        this.populateForm(orphan);
        this.isEditing = true;
        this.isCreating = false;
        this.isLoading = false;
        
        // If we're on the gifts tab, load the gifts
        if (this.activeSection === 'gifts') {
          this.loadOrphanGiftsForDetail();
        }
      },
      error: (error) => {
        console.error('Error loading orphan details:', error);
        this.isLoading = false;
      }
    });
  }

  saveOrphan(): void {
    if (this.orphanForm.valid) {
      this.isLoading = true;
      const formValue = this.orphanForm.value;
      
      const orphanData: OrphanDetailDTO = {
        id: this.selectedOrphan?.id,
        orphanId: formValue.orphanId,
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        dob: formValue.dob,
        placeOfBirth: formValue.placeOfBirth,
        gender: formValue.gender,
        location: formValue.location,
        country: formValue.country,
        healthStatus: formValue.healthStatus,
        specialNeeds: formValue.specialNeeds,
        familyInformation: {
          id: this.selectedOrphan?.familyInformation?.id,
          ethnicGroup: formValue.ethnicGroup,
          spokenLanguage: formValue.spokenLanguage,
          fatherName: formValue.fatherName,
          fatherDateOfDeath: formValue.fatherDateOfDeath,
          fatherCauseOfDeath: formValue.fatherCauseOfDeath,
          motherName: formValue.motherName,
          motherStatus: formValue.motherStatus,
          motherDateOfDeath: formValue.motherDateOfDeath,
          motherCauseOfDeath: formValue.motherCauseOfDeath,
          numberOfSiblings: formValue.numberOfSiblings,
          guardianName: formValue.guardianName,
          relationToOrphan: formValue.relationToOrphan,
          livingCondition: formValue.livingCondition
        },
        education: {
          id: this.selectedOrphan?.education?.id,
          schoolName: formValue.schoolName,
          gradeLevel: formValue.gradeLevel,
          favoriteSubject: formValue.favoriteSubject,
          educationNeeds: formValue.educationNeeds,
          schoolPerformance: formValue.schoolPerformance,
          orphanDream: formValue.orphanDream,
          favoriteHobbies: formValue.favoriteHobbies,
          supervisorComments: formValue.supervisorComments
        }
      };

      const saveOperation = this.isCreating
        ? this.orphanService.createOrphan(orphanData, this.selectedPhoto || undefined)
        : this.orphanService.updateOrphan(orphanData.id!, orphanData, this.selectedPhoto || undefined);

      saveOperation.subscribe({
        next: (savedOrphan) => {
          console.log('Orphan saved successfully:', savedOrphan);
          // Update photo preview if a new photo was uploaded
          if (savedOrphan.photo && this.selectedPhoto) {
            if (savedOrphan.photo.startsWith('/uploads') || savedOrphan.photo.startsWith('uploads')) {
              this.photoPreview = `${environment.apiUrl}${savedOrphan.photo.startsWith('/') ? '' : '/'}${savedOrphan.photo}`;
            } else {
              this.photoPreview = savedOrphan.photo;
            }
          }
          this.isLoading = false;
          this.loadOrphansList();
          // Don't cancel edit immediately, let user see the result
          setTimeout(() => {
            this.cancelEdit();
          }, 1000);
        },
        error: (error) => {
          console.error('Error saving orphan:', error);
          this.isLoading = false;
          // Show user-friendly error message
          alert('Error saving orphan. Please check the console for details.');
        }
      });
    } else {
      console.log('Form is invalid:', this.orphanForm.errors);
      // Mark all fields as touched to show validation errors
      Object.keys(this.orphanForm.controls).forEach(key => {
        this.orphanForm.get(key)?.markAsTouched();
      });
    }
  }

  deleteOrphan(id: number): void {
    if (confirm('Are you sure you want to delete this orphan?')) {
      this.orphanService.deleteOrphan(id).subscribe({
        next: () => {
          this.loadOrphansList();
          if (this.selectedOrphan?.id === id) {
            this.cancelEdit();
          }
        },
        error: (error) => {
          console.error('Error deleting orphan:', error);
        }
      });
    }
  }

  viewIdCard(id: number): void {
    this.router.navigate(['/orphan-card', id]);
  }

  downloadIdCard(id: number): void {
    this.orphanService.downloadIdCard(id).subscribe({
      next: (blob) => {
        // Check if we're in browser environment before using browser APIs
        if (typeof window !== 'undefined') {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `orphan-${id}-id-card.pdf`;
          a.click();
          window.URL.revokeObjectURL(url);
        } else {
          console.log('ID card download not available in server environment');
        }
      },
      error: (error) => {
        console.error('Error downloading ID card:', error);
      }
    });
  }

  async generateTemplate1(id: number): Promise<void> {
    try {
      // First get the orphan details
      this.orphanService.getOrphanById(id).subscribe({
        next: async (orphan) => {
          try {
            await this.pdfService.generateCard1(orphan);
          } catch (error) {
            console.error('Error generating template 1:', error);
            alert('Error generating template 1. Please try again.');
          }
        },
        error: (error) => {
          console.error('Error loading orphan details:', error);
          alert('Error loading orphan details. Please try again.');
        }
      });
    } catch (error) {
      console.error('Error in generateTemplate1:', error);
    }
  }

  async generateTemplate2(id: number): Promise<void> {
    try {
      // First get the orphan details
      this.orphanService.getOrphanById(id).subscribe({
        next: async (orphan) => {
          try {
            await this.pdfService.generateCard2(orphan);
          } catch (error) {
            console.error('Error generating template 2:', error);
            alert('Error generating template 2. Please try again.');
          }
        },
        error: (error) => {
          console.error('Error loading orphan details:', error);
          alert('Error loading orphan details. Please try again.');
        }
      });
    } catch (error) {
      console.error('Error in generateTemplate2:', error);
    }
  }

  // UI methods
  cancelEdit(): void {
    this.selectedOrphan = null;
    this.isEditing = false;
    this.isCreating = false;
    this.orphanForm.reset();
    this.photoPreview = null;
    this.selectedPhoto = null;
    this.activeSection = 'basic';
  }

  setActiveSection(section: string): void {
    console.log('Setting active section to:', section);
    this.activeSection = section;
    
    // Load gifts when switching to gifts tab
    if (section === 'gifts') {
      console.log('Switching to gifts tab, loading gifts...');
      // Always reload gifts when switching to this tab
      this.orphanGifts = []; // Clear existing gifts first
      this.loadOrphanGiftsForDetail();
    }
  }

  onPhotoSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Please select an image smaller than 5MB.');
        return;
      }
      
      this.selectedPhoto = file;
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.photoPreview = e.target.result;
      };
      reader.onerror = () => {
        console.error('Error reading file');
        alert('Error reading the selected file.');
      };
      reader.readAsDataURL(file);
    }
  }

  onImageError(event: any): void {
    console.log('Image failed to load, using default avatar');
    event.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjgwIiByPSIzMCIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNNTAgMTYwQzUwIDEzNS4xNDcgNzAuMTQ3IDExNSA5NSAxMTVIMTA1QzEyOS44NTMgMTE1IDE1MCAxMzUuMTQ3IDE1MCAxNjBWMjAwSDUwVjE2MFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
  }

  // Utility methods
  get filteredOrphans(): OrphanListDTO[] {
    if (!this.searchTerm) return this.orphansList;
    
    return this.orphansList.filter(orphan =>
      orphan.firstName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      orphan.lastName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      orphan.orphanId.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      orphan.location.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  getFullName(orphan: OrphanListDTO): string {
    return `${orphan.firstName} ${orphan.lastName}`;
  }

  getAge(dob: string): number {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  getOrphanPhotoUrl(photo?: string): string {
    if (!photo) {
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjgwIiByPSIzMCIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNNTAgMTYwQzUwIDEzNS4xNDcgNzAuMTQ3IDExNSA5NSAxMTVIMTA1QzEyOS44NTMgMTE1IDE1MCAxMzUuMTQ3IDE1MCAxNjBWMjAwSDUwVjE2MFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
    }
    
    // If the photo is a relative path, construct the full URL
    if (photo.startsWith('/uploads') || photo.startsWith('uploads')) {
      return `${environment.apiUrl}${photo.startsWith('/') ? '' : '/'}${photo}`;
    } else if (photo.startsWith('http')) {
      // Already a full URL
      return photo;
    } else {
      // Base64 or other format
      return photo;
    }
  }

  trackByOrphanId(index: number, orphan: OrphanListDTO): number {
    return orphan.id;
  }

  // Debug method to check form validation
  debugFormValidation(): void {
    console.log('Form valid:', this.orphanForm.valid);
    console.log('Form errors:', this.orphanForm.errors);
    Object.keys(this.orphanForm.controls).forEach(key => {
      const control = this.orphanForm.get(key);
      if (control && control.invalid) {
        console.log(`${key} is invalid:`, control.errors);
      }
    });
  }

  // Excel Upload Methods
  openUploadModal(): void {
    this.resetUploadState();
    // Use data-bs-toggle instead of programmatic modal
    const modalElement = document.getElementById('uploadModal');
    if (modalElement) {
      modalElement.classList.add('show');
      modalElement.style.display = 'block';
      modalElement.setAttribute('aria-modal', 'true');
      modalElement.setAttribute('role', 'dialog');
      
      // Add backdrop
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop fade show';
      backdrop.id = 'upload-modal-backdrop';
      document.body.appendChild(backdrop);
      
      // Prevent body scroll
      document.body.classList.add('modal-open');
    }
  }

  closeUploadModal(): void {
    const modalElement = document.getElementById('uploadModal');
    if (modalElement) {
      modalElement.classList.remove('show');
      modalElement.style.display = 'none';
      modalElement.removeAttribute('aria-modal');
      modalElement.removeAttribute('role');
      
      // Remove backdrop
      const backdrop = document.getElementById('upload-modal-backdrop');
      if (backdrop) {
        backdrop.remove();
      }
      
      // Restore body scroll
      document.body.classList.remove('modal-open');
    }
  }

  resetUploadState(): void {
    this.selectedFile = null;
    this.isDragOver = false;
    this.isUploading = false;
    this.uploadProgress = 0;
    this.uploadResults = null;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

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

  private handleFileSelection(file: File): void {
    // Validate file type
    const allowedTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      this.uploadResults = {
        success: false,
        message: 'Please select a valid Excel file (.xlsx or .xls)'
      };
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      this.uploadResults = {
        success: false,
        message: 'File size must be less than 10MB'
      };
      return;
    }

    this.selectedFile = file;
    this.uploadResults = null;
  }

  removeSelectedFile(): void {
    this.selectedFile = null;
    this.uploadResults = null;
  }

  uploadFile(): void {
    if (!this.selectedFile) return;

    this.isUploading = true;
    this.uploadProgress = 0;
    this.uploadResults = null;

    // Simulate progress
    const progressInterval = setInterval(() => {
      if (this.uploadProgress < 90) {
        this.uploadProgress += 10;
      }
    }, 200);

    this.orphanService.uploadExcelFile(this.selectedFile).subscribe({
      next: (response) => {
        clearInterval(progressInterval);
        this.uploadProgress = 100;
        
        this.uploadResults = {
          success: true,
          message: 'Excel file uploaded and processed successfully!',
          count: response.length
        };
        
        // Refresh the orphan list
        this.loadOrphansList();
        
        // Close modal after 2 seconds
        setTimeout(() => {
          this.closeUploadModal();
          this.resetUploadState();
        }, 2000);
        
        this.isUploading = false;
      },
      error: (error) => {
        clearInterval(progressInterval);
        this.uploadProgress = 0;
        
        this.uploadResults = {
          success: false,
          message: error.error?.message || 'Failed to upload and process Excel file. Please check the file format and try again.'
        };
        
        this.isUploading = false;
      }
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Gift Management Methods
  openAddGiftModal(orphan: OrphanListDTO): void {
    this.selectedOrphanForGift = orphan;
    this.loadDonors();
    this.giftForm.reset();
    this.giftForm.patchValue({
      date: new Date().toISOString().split('T')[0],
      giftType: GiftType.DONATION,
      isKafala: false
    });
    this.isGiftModalVisible = true;
  }

  openGiftHistoryModal(orphan: OrphanListDTO): void {
    this.selectedOrphanForGift = orphan;
    this.loadOrphanGifts(orphan.id!);
    this.isGiftHistoryModalVisible = true;
  }

  closeGiftModal(): void {
    this.isGiftModalVisible = false;
    this.selectedOrphanForGift = null;
    this.giftForm.reset();
    
    // No need to reload here - handled in success handlers
  }

  closeGiftHistoryModal(): void {
    this.isGiftHistoryModalVisible = false;
    this.selectedOrphanForGift = null;
    this.modalGifts = []; // Only clear modal gifts
    this.isLoadingModalGifts = false;
    
    // No need to reload detail gifts - they should remain intact
  }

  loadDonors(): void {
    this.donorService.getDonors().subscribe({
      next: (donors) => {
        this.donors = donors;
      },
      error: (error) => {
        console.error('Error loading donors:', error);
      }
    });
  }

  loadOrphanGifts(orphanId: number): void {
    this.isLoadingModalGifts = true;
    this.giftService.getGiftsByOrphan(orphanId).subscribe({
      next: (gifts) => {
        this.modalGifts = gifts || [];
        this.isLoadingModalGifts = false;
      },
      error: (error) => {
        console.error('Error loading orphan gifts for modal:', error);
        this.modalGifts = [];
        this.isLoadingModalGifts = false;
      }
    });
  }

  onGiftTypeChange(): void {
    const giftType = this.giftForm.get('giftType')?.value;
    const isKafala = giftType === GiftType.KAFALA;
    this.giftForm.patchValue({ isKafala });
    
    if (isKafala) {
      this.giftForm.get('kafalaFrequency')?.setValidators([Validators.required]);
    } else {
      this.giftForm.get('kafalaFrequency')?.clearValidators();
      this.giftForm.patchValue({ kafalaFrequency: '' });
    }
    this.giftForm.get('kafalaFrequency')?.updateValueAndValidity();
  }

  submitGift(): void {
    if (this.giftForm.valid && this.selectedOrphanForGift) {
      this.isAddingGift = true;
      
      const formValue = this.giftForm.value;
      const giftRequest: CreateGiftRequest = {
        donorId: formValue.donorId,
        orphanId: this.selectedOrphanForGift.id!,
        amount: formValue.amount,
        date: this.formatDateForBackend(formValue.date),
        description: formValue.description,
        giftType: formValue.giftType,
        kafalaFrequency: formValue.kafalaFrequency || undefined,
        isKafala: formValue.isKafala
      };

      this.giftService.createGift(giftRequest).subscribe({
        next: (gift) => {
          console.log('Gift created successfully:', gift);
          this.closeGiftModal();
          
          // Refresh detail view gifts if on gifts tab
          if (this.activeSection === 'gifts') {
            this.loadOrphanGiftsForDetail();
          }
          
          // Refresh the list to show updated kafala info
          this.loadOrphansList();
          this.isAddingGift = false;
        },
        error: (error) => {
          console.error('Error creating gift:', error);
          this.isAddingGift = false;
        }
      });
    }
  }

  deleteGift(giftId: number): void {
    if (confirm('Are you sure you want to delete this gift?')) {
      this.giftService.deleteGift(giftId).subscribe({
        next: () => {
          console.log('Gift deleted successfully');
          
          // Refresh modal gifts if modal is open
          if (this.selectedOrphanForGift) {
            this.loadOrphanGifts(this.selectedOrphanForGift.id!);
          }
          
          // Refresh detail view gifts if on gifts tab
          if (this.activeSection === 'gifts') {
            this.loadOrphanGiftsForDetail();
          }
          
          // Refresh the orphan list to update kafala info
          this.loadOrphansList();
        },
        error: (error) => {
          console.error('Error deleting gift:', error);
        }
      });
    }
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

  // Format date for backend LocalDateTime compatibility
  formatDateForBackend(dateString: string): string {
    // If the date already includes time, return as is
    if (dateString.includes('T')) {
      return dateString;
    }
    
    // If it's just a date (YYYY-MM-DD), add current time
    const date = new Date(dateString);
    const now = new Date();
    
    // Set the time to current time
    date.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    
    // Return ISO string format that backend expects
    return date.toISOString();
  }

  // Gift management methods for detail view
  openAddGiftModalFromDetail(): void {
    if (this.selectedOrphan && this.selectedOrphan.id) {
      // Convert OrphanDetailDTO to OrphanListDTO for the modal
      const orphanForGift: OrphanListDTO = {
        id: this.selectedOrphan.id,
        orphanId: this.selectedOrphan.orphanId,
        firstName: this.selectedOrphan.firstName,
        lastName: this.selectedOrphan.lastName,
        dob: this.selectedOrphan.dob,
        gender: this.selectedOrphan.gender,
        location: this.selectedOrphan.location,
        country: this.selectedOrphan.country,
        healthStatus: this.selectedOrphan.healthStatus,
        photo: this.selectedOrphan.photo,
        hasKafala: this.selectedOrphan.hasKafala,
        kafalaAmount: this.selectedOrphan.kafalaAmount,
        kafalaFrequency: this.selectedOrphan.kafalaFrequency,
        donorName: this.selectedOrphan.donorName,
        donorId: this.selectedOrphan.donorId
      };
      this.openAddGiftModal(orphanForGift);
    }
  }

  openGiftHistoryModalFromDetail(): void {
    if (this.selectedOrphan && this.selectedOrphan.id) {
      // Convert OrphanDetailDTO to OrphanListDTO for the modal
      const orphanForGift: OrphanListDTO = {
        id: this.selectedOrphan.id,
        orphanId: this.selectedOrphan.orphanId,
        firstName: this.selectedOrphan.firstName,
        lastName: this.selectedOrphan.lastName,
        dob: this.selectedOrphan.dob,
        gender: this.selectedOrphan.gender,
        location: this.selectedOrphan.location,
        country: this.selectedOrphan.country,
        healthStatus: this.selectedOrphan.healthStatus,
        photo: this.selectedOrphan.photo,
        hasKafala: this.selectedOrphan.hasKafala,
        kafalaAmount: this.selectedOrphan.kafalaAmount,
        kafalaFrequency: this.selectedOrphan.kafalaFrequency,
        donorName: this.selectedOrphan.donorName,
        donorId: this.selectedOrphan.donorId
      };
      this.openGiftHistoryModal(orphanForGift);
    }
  }

  // Helper method to calculate age from date of birth
  private calculateAge(dob: string): number {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  // Load gifts when switching to gifts tab
  loadOrphanGiftsForDetail(): void {
    if (this.selectedOrphan && this.selectedOrphan.id) {
      console.log('Loading gifts for orphan:', this.selectedOrphan.id);
      this.isLoadingGifts = true;
      this.giftService.getGiftsByOrphan(this.selectedOrphan.id).subscribe({
        next: (gifts) => {
          console.log('Loaded gifts:', gifts);
          this.orphanGifts = gifts || [];
          this.isLoadingGifts = false;
        },
        error: (error) => {
          console.error('Error loading orphan gifts:', error);
          this.orphanGifts = [];
          this.isLoadingGifts = false;
        }
      });
    } else {
      console.log('No selected orphan or orphan ID missing');
      this.orphanGifts = [];
      this.isLoadingGifts = false;
    }
  }
}
