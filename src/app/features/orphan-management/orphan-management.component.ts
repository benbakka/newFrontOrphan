import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { ExcelProcessingResult } from '../../core/services/excel-processor.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatNativeDateModule, MAT_DATE_LOCALE } from '@angular/material/core';
import { Router } from '@angular/router';
import { PdfService } from '../../core/services/pdf.service';
import { OrphanService } from '../../core/services/orphan.service';
import { OrphanListDTO } from '../../core/models/orphan-list.dto';
import { OrphanDetailDTO } from '../../core/models/orphan-detail.dto';
import { Gift, CreateGiftRequest, GiftType, KafalaFrequency } from '../../core/models/gift.model';
import { Donor } from '../../core/models/donor.model';
import { GiftService } from '../../core/services/gift.service';
import { DonorService } from '../../core/services/donor.service';
import { ExcelProcessorService } from '../../core/services/excel-processor.service';
import { ExcelGeneratorService } from '../../core/services/excel-generator.service';
import { ProxyImageComponent } from '../../shared/components/proxy-image/proxy-image.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-orphan-management',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    FormsModule,
    MatDatepickerModule,
    MatInputModule,
    MatFormFieldModule,
    MatNativeDateModule,
    ProxyImageComponent
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'en-US' }
  ],
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
  searchTimeout: any = null;

  // Pagination properties
  currentPage = 0;
  pageSize = 10;
  isLoadingMore = false;
  hasMoreData = true;
  allOrphansLoaded = false;

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
    private donorService: DonorService,
    private excelProcessor: ExcelProcessorService,
    private excelGenerator: ExcelGeneratorService
  ) {
    this.orphanForm = this.createOrphanForm();
    this.giftForm = this.createGiftForm();
  }

  ngOnInit(): void {
    this.loadOrphansList();
    this.setupDateFormatting();
  }
  
  // Set up date formatting for US format (MM/dd/yyyy)
  setupDateFormatting(): void {
    // Angular Material date picker handles formatting automatically with en-US locale
  }

  // Data loading methods
  loadOrphansList(): void {
    this.isLoading = true;
    this.currentPage = 0;
    this.hasMoreData = true;
    this.allOrphansLoaded = false;
    
    // If there's a search term, use search instead of pagination
    if (this.searchTerm && this.searchTerm.trim()) {
      this.searchOrphans();
      return;
    }
    
    this.orphanService.getOrphansPaginated(this.currentPage, this.pageSize).subscribe({
      next: (orphans) => {
        this.orphansList = orphans;
        this.isLoading = false;
        
        // Check if we have more data
        if (orphans.length < this.pageSize) {
          this.hasMoreData = false;
          this.allOrphansLoaded = true;
        }
      },
      error: (error) => {
        console.error('Error loading orphans:', error);
        this.isLoading = false;
        // Fallback to load all orphans if pagination fails
        this.loadAllOrphans();
      }
    });
  }

  // Search orphans by multiple criteria (name, age, gender, ID, place of birth, location)
  searchOrphans(): void {
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      this.loadOrphansList();
      return;
    }

    this.isLoading = true;
    this.orphanService.searchOrphans(this.searchTerm).subscribe({
      next: (orphans) => {
        this.orphansList = orphans;
        this.isLoading = false;
        // Disable pagination when searching
        this.hasMoreData = false;
        this.allOrphansLoaded = true;
      },
      error: (error) => {
        console.error('Error searching orphans:', error);
        this.isLoading = false;
        // Fallback to show all orphans on search error
        this.loadAllOrphans();
      }
    });
  }

  // Handle search input changes
  onSearchChange(): void {
    // Debounce search to avoid too many API calls
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    this.searchTimeout = setTimeout(() => {
      this.searchOrphans();
    }, 300); // 300ms delay
  }

  // Clear search and reload all orphans
  clearSearch(): void {
    this.searchTerm = '';
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.loadOrphansList();
  }

  // Load more orphans for pagination
  loadMoreOrphans(): void {
    if (this.isLoadingMore || !this.hasMoreData || this.allOrphansLoaded) {
      return;
    }

    this.isLoadingMore = true;
    this.currentPage++;

    this.orphanService.getOrphansPaginated(this.currentPage, this.pageSize).subscribe({
      next: (orphans) => {
        if (orphans.length > 0) {
          // Append new orphans to existing list
          this.orphansList = [...this.orphansList, ...orphans];
          
          // Check if we have more data
          if (orphans.length < this.pageSize) {
            this.hasMoreData = false;
            this.allOrphansLoaded = true;
          }
        } else {
          this.hasMoreData = false;
          this.allOrphansLoaded = true;
        }
        
        this.isLoadingMore = false;
      },
      error: (error) => {
        console.error('Error loading more orphans:', error);
        this.isLoadingMore = false;
        this.currentPage--; // Revert page increment on error
      }
    });
  }

  // Fallback method to load all orphans if pagination fails
  private loadAllOrphans(): void {
    this.orphanService.getAllOrphans().subscribe({
      next: (orphans) => {
        this.orphansList = orphans;
        this.hasMoreData = false;
        this.allOrphansLoaded = true;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading all orphans:', error);
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
    // Format today's date as MM/dd/yyyy
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const year = today.getFullYear();
    const formattedDate = `${year}-${month}-${day}`; // Still use ISO format for form value
    
    return this.fb.group({
      donorId: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      date: [formattedDate, Validators.required],
      description: [''],
      giftType: [GiftType.DONATION, Validators.required],
      kafalaFrequency: [''],
      isKafala: [false]
    });
  }

  populateForm(orphan: OrphanDetailDTO): void {
    // Convert date strings to Date objects for Angular Material date picker
    const parseDate = (dateStr: string | undefined): Date | null => {
      if (!dateStr) return null;
      try {
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date;
      } catch (e) {
        return null;
      }
    };

    this.orphanForm.patchValue({
      orphanId: orphan.orphanId,
      firstName: orphan.firstName,
      lastName: orphan.lastName,
      dob: parseDate(orphan.dob),
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
      fatherDateOfDeath: parseDate(orphan.familyInformation?.fatherDateOfDeath),
      fatherCauseOfDeath: orphan.familyInformation?.fatherCauseOfDeath || '',
      motherName: orphan.familyInformation?.motherName || '',
      motherStatus: orphan.familyInformation?.motherStatus || '',
      motherDateOfDeath: parseDate(orphan.familyInformation?.motherDateOfDeath),
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
      
      // Convert Date objects to backend format (ISO)
      const convertDateToBackendFormat = (dateValue: Date | string | null): string => {
        if (!dateValue) return '';
        try {
          const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
          if (isNaN(date.getTime())) return '';
          return date.toISOString();
        } catch (e) {
          return '';
        }
      };
      
      const orphanData: OrphanDetailDTO = {
        id: this.selectedOrphan?.id,
        orphanId: formValue.orphanId,
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        dob: convertDateToBackendFormat(formValue.dob),
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
          fatherDateOfDeath: convertDateToBackendFormat(formValue.fatherDateOfDeath),
          fatherCauseOfDeath: formValue.fatherCauseOfDeath,
          motherName: formValue.motherName,
          motherStatus: formValue.motherStatus,
          motherDateOfDeath: convertDateToBackendFormat(formValue.motherDateOfDeath),
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
          
          // Keep the form open and update the selected orphan with the saved data
          if (!this.isCreating) {
            this.selectedOrphan = savedOrphan;
            // Refresh the form with the updated data
            this.populateForm(savedOrphan);
            // Show success message
            alert('Orphan updated successfully!');
          } else {
            // For new orphans, show success and optionally keep form open
            alert('Orphan created successfully!');
            // Optionally close the form for new orphans
            setTimeout(() => {
              this.cancelEdit();
            }, 1000);
          }
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
          // Remove the orphan from the local list without refreshing
          this.orphansList = this.orphansList.filter(orphan => orphan.id !== id);
          
          // If the deleted orphan was selected, clear the selection
          if (this.selectedOrphan?.id === id) {
            this.selectedOrphan = null;
            this.isEditing = false;
          }
          
          console.log('Orphan deleted successfully!');
        },
        error: (error) => {
          console.error('Error deleting orphan:', error);
          
          // Check if the error is 'not found' (orphan already deleted)
          let isNotFoundError = false;
          
          if (error.status === 500) {
            // Check different possible error message formats
            const errorMessage = typeof error.error === 'string' ? error.error : 
                               error.message || 
                               JSON.stringify(error.error) || 
                               '';
            
            isNotFoundError = errorMessage.toLowerCase().includes('not found') || 
                             errorMessage.includes('Orphan record not found');
          }
          
          if (isNotFoundError) {
            // Orphan was already deleted, remove it from the list anyway
            this.orphansList = this.orphansList.filter(orphan => orphan.id !== id);
            
            if (this.selectedOrphan?.id === id) {
              this.selectedOrphan = null;
              this.isEditing = false;
            }
            
            alert('Orphan was already deleted. Removing from list.');
          } else {
            // Other errors
            alert('Error deleting orphan. Please try again.');
          }
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
    // Since we're now using backend search, just return the orphansList
    // The backend handles all filtering based on searchTerm
    return this.orphansList;
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
    const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjgwIiByPSIzMCIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNNTAgMTYwQzUwIDEzNS4xNDcgNzAuMTQ3IDExNSA5NSAxMTVIMTA1QzEyOS44NTMgMTE1IDE1MCAxMzUuMTQ3IDE1MCAxNjBWMjAwSDUwVjE2MFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
    
    if (!photo || photo.trim() === '') {
      return defaultAvatar;
    }
    
    // Clean the photo value
    const cleanPhoto = photo.toString().trim();
    
    // Check for invalid values that should use default avatar
    const invalidValues = ['accident', 'none', 'n/a', 'na', 'null', 'undefined', 'no photo', 'no image'];
    if (invalidValues.includes(cleanPhoto.toLowerCase())) {
      return defaultAvatar;
    }
    
    // Check for upload path format (starts with /uploads/ or uploads/)
    if (cleanPhoto.includes('/uploads/') || cleanPhoto.startsWith('uploads/')) {
      // Valid upload path
      return `${environment.apiUrl}${cleanPhoto.startsWith('/') ? '' : '/'}${cleanPhoto}`;
    } else if (cleanPhoto.startsWith('http')) {
      // Valid full URL
      return cleanPhoto;
    } else if (cleanPhoto.startsWith('data:image/')) {
      // Valid base64 image
      return cleanPhoto;
    } else if (this.isValidImageExtension(cleanPhoto)) {
      // Valid image file with extension
      return cleanPhoto;
    } else {
      // Invalid photo value, return default avatar without logging warning for known invalid values
      if (!invalidValues.includes(cleanPhoto.toLowerCase())) {
        console.warn(`Invalid photo value detected: "${cleanPhoto}". Using default avatar.`);
      }
      return defaultAvatar;
    }
  }

  private isValidImageExtension(filename: string): boolean {
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    const lowerFilename = filename.toLowerCase();
    return validExtensions.some(ext => lowerFilename.endsWith(ext));
  }

  getPhotoPreviewUrl(): string {
    // If we have a photo preview from file upload, use it
    if (this.photoPreview && this.photoPreview.startsWith('data:image/')) {
      return this.photoPreview;
    }
    
    // If we have a selected orphan, use their photo with validation
    if (this.selectedOrphan?.photo) {
      return this.getOrphanPhotoUrl(this.selectedOrphan.photo);
    }
    
    // Default avatar
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjgwIiByPSIzMCIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNNTAgMTYwQzUwIDEzNS4xNDcgNzAuMTQ3IDExNSA5NSAxMTVIMTA1QzEyOS44NTMgMTE1IDE1MCAxMzUuMTQ3IDE1MCAxNjBWMjAwSDUwVjE2MFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
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
    // Use Excel processor validation
    const validation = this.excelProcessor.validateExcelFile(file);
    if (!validation.valid) {
      this.uploadResults = {
        success: false,
        message: validation.error || 'Invalid file'
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

  async uploadFile(): Promise<void> {
    if (!this.selectedFile) return;

    this.isUploading = true;
    this.uploadProgress = 0;
    this.uploadResults = null;

    // Simulate progress for UI feedback
    const progressInterval = setInterval(() => {
      if (this.uploadProgress < 90) {
        this.uploadProgress += Math.random() * 10;
      }
    }, 200);

    try {
      // Simple upload directly to backend - let backend handle everything
      this.orphanService.uploadExcelFile(this.selectedFile).subscribe({
        next: (response: OrphanDetailDTO[]) => {
          clearInterval(progressInterval);
          this.uploadProgress = 100;
          
          this.uploadResults = {
            success: true,
            message: `Successfully uploaded ${response.length} orphan records.`,
            count: response.length
          };
          
          this.isUploading = false;
          this.loadAllOrphans(); // Refresh the orphan list
        },
        error: (error) => {
          clearInterval(progressInterval);
          this.uploadProgress = 0;
          
          let errorMessage = 'Failed to upload Excel file.';
          if (error.error && error.error.message) {
            errorMessage = error.error.message;
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          this.uploadResults = { 
            success: false, 
            message: errorMessage
          };
          this.isUploading = false;
        }
      });
    } catch (error) {
      clearInterval(progressInterval);
      this.uploadProgress = 0;
      this.uploadResults = { 
        success: false, 
        message: 'An unexpected error occurred during file upload.' 
      };
      this.isUploading = false;
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  /**
   * Finalizes the upload process after both Excel data and photos have been processed
   * @param response The response from the Excel upload API
   * @param processingResult The result of the Excel processing
   * @param uploadedPhotos Number of photos successfully uploaded
   * @param photoUploadErrors Array of error messages from photo uploads
   */
  finalizeUpload(response: OrphanDetailDTO[], processingResult: ExcelProcessingResult, uploadedPhotos: number, photoUploadErrors: string[]): void {
    this.uploadProgress = 100;
    
    // Prepare success message with orphan processing details
    let message = `Successfully processed ${response.length} orphan(s).`;
    
    // Add photo upload details if applicable
    if (processingResult.photoFiles && processingResult.photoFiles.size > 0) {
      message += ` ${uploadedPhotos} of ${processingResult.photoFiles.size} photos were uploaded.`;
      
      // Handle CORS errors specifically
      const corsErrors = photoUploadErrors.filter(error => error.includes('CORS error'));
      const otherErrors = photoUploadErrors.filter(error => !error.includes('CORS error'));
      
      if (corsErrors.length > 0) {
        message += `\n\nCORS errors occurred: The backend server may not be configured to accept cross-origin requests for photo uploads. `;
        message += `Please ensure the backend API has CORS properly configured.`;
      }
      
      // Add other photo upload errors if any
      if (otherErrors.length > 0) {
        message += `\n\nSome photos could not be uploaded due to errors: `;
        // Limit the number of errors shown to avoid extremely long messages
        const maxErrorsToShow = 3;
        if (otherErrors.length <= maxErrorsToShow) {
          message += otherErrors.join('\n');
        } else {
          message += otherErrors.slice(0, maxErrorsToShow).join('\n');
          message += `\n...and ${otherErrors.length - maxErrorsToShow} more errors.`;
        }
      }
    }
    
    this.uploadResults = {
      success: true,
      message: message,
      count: response.length
    };
    
    // Refresh the orphans list to show updated data
    this.loadOrphansList();
    this.closeUploadModal();
    this.resetUploadState();
    this.isUploading = false;
  }

  // Download Excel template
  downloadTemplate(): void {
    try {
      const templateFile = this.excelGenerator.generateTemplateFile();
      this.excelGenerator.downloadFile(templateFile);
    } catch (error) {
      console.error('Error generating template:', error);
      // You could show a toast notification here
    }
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
      
      // Convert Date object to ISO format for backend
      let dateValue = '';
      if (formValue.date) {
        try {
          const date = formValue.date instanceof Date ? formValue.date : new Date(formValue.date);
          if (!isNaN(date.getTime())) {
            dateValue = date.toISOString();
          }
        } catch (e) {
          console.error('Error converting date:', e);
        }
      }
      
      const giftRequest: CreateGiftRequest = {
        orphanId: this.selectedOrphanForGift.id,
        donorId: formValue.donorId,
        amount: formValue.amount,
        date: dateValue,
        description: formValue.description || '',
        giftType: formValue.giftType,
        isKafala: formValue.isKafala,
        kafalaFrequency: formValue.isKafala ? formValue.kafalaFrequency : null
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
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      return `${month}/${day}/${year}`;
    } catch (e) {
      return '';
    }
  }
  
  // Format date input to MM/dd/yyyy when user leaves the field
  formatDateInput(controlName: string, form: FormGroup = this.orphanForm): void {
    const control = form.get(controlName);
    if (!control || !control.value) return;
    
    let dateValue = control.value;
    
    // If it's already in MM/dd/yyyy format
    const mmddyyyyRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
    if (mmddyyyyRegex.test(dateValue)) {
      // Already in correct format, just validate it's a real date
      const [month, day, year] = dateValue.split('/');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        // Valid date, keep as is
        return;
      }
    }
    
    try {
      // Try to parse the input as a date
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        // Valid date, format it as MM/dd/yyyy
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        control.setValue(`${month}/${day}/${year}`);
      }
    } catch (e) {
      // If parsing fails, leave as is
      console.error('Error formatting date:', e);
    }
  }

  // Format date for backend LocalDateTime compatibility
  formatDateForBackend(dateString: string): string {
    if (!dateString) return '';
    
    // If the date already includes time, return as is
    if (dateString.includes('T')) {
      return dateString;
    }
    
    try {
      let date: Date;
      
      // Check if the date is in MM/dd/yyyy format
      const mmddyyyyRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
      if (mmddyyyyRegex.test(dateString)) {
        // Parse MM/dd/yyyy format
        const [month, day, year] = dateString.split('/');
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        // Try to parse as standard format
        date = new Date(dateString);
      }
      
      if (isNaN(date.getTime())) {
        console.error('Invalid date:', dateString);
        return '';
      }
      
      const now = new Date();
      
      // Set the time to current time
      date.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
      
      // Return ISO string format that backend expects
      return date.toISOString();
    } catch (e) {
      console.error('Error formatting date for backend:', e);
      return '';
    }
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
