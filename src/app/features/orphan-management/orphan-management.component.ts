import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { ExcelProcessingResult } from '../../core/services/excel-processor.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatNativeDateModule, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { PdfService } from '../../core/services/pdf.service';
import { OrphanService } from '../../core/services/orphan.service';
import { OrphanListDTO } from '../../core/models/orphan-list.dto';
import { OrphanDetailDTO } from '../../core/models/orphan-detail.dto';
import { Gift, CreateGiftRequestV2, GiftType, KafalaFrequency, BeneficiaryType } from '../../core/models/gift.model';
import { Donor } from '../../core/models/donor.model';
import { GiftService } from '../../core/services/gift.service';
import { DonorService } from '../../core/services/donor.service';
import { GiftTypeService } from '../../core/services/gift-type.service';
import { CharityProjectService } from '../../core/services/charity-project.service';
import { SponsorshipService } from '../../core/services/sponsorship.service';
import { GiftType as GiftTypeModel } from '../../core/models/gift-type.model';
import { CharityProject } from '../../core/models/charity-project.model';
import { AdvancedSearchRequest, AdvancedSearchFormData } from '../../core/models/advanced-search.model';
import { ExcelProcessorService } from '../../core/services/excel-processor.service';
import { ExcelGeneratorService } from '../../core/services/excel-generator.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { OrphanDocumentService } from '../../core/services/orphan-document.service';
import { OrphanDocument } from '../../shared/models/orphan-document.model';
import { DocumentUploadComponent } from '../../shared/components/document-upload/document-upload.component';
import { environment } from '../../../environments/environment';
import {  Subject } from 'rxjs';

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
    MatDialogModule,
    MatSnackBarModule,
    DocumentUploadComponent
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'en-US' }
  ],
  templateUrl: './orphan-management.component.html',
  styleUrls: ['./orphan-management.component.scss']
})
export class OrphanManagementComponent implements OnInit {
  // Orphan list properties
  orphansList: OrphanListDTO[] = [];
  selectedOrphan: OrphanDetailDTO | null = null;
  isLoading = false;
  isEditing = false;
  isCreating = false;

  // Form instances
  orphanForm: FormGroup;
  giftForm: FormGroup;
  orphanGiftForm: FormGroup;
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
  giftTypes: GiftTypeModel[] = [];
  availableProjects: CharityProject[] = [];
  isGiftModalVisible = false;
  isGiftHistoryModalVisible = false;
  isAddingGift = false;
  isLoadingGifts = false;
  isLoadingModalGifts = false;

  // New gift form properties
  beneficiaryType: BeneficiaryType = BeneficiaryType.CHARITY;
  giftError: string = '';
  giftSuccess: string = '';
  isSubmittingGift = false;

  // Sponsorship-based gift properties
  isGiftFormModalVisible = false;
  selectedOrphanForGift: OrphanListDTO | null = null;
  GiftType = GiftType;
  KafalaFrequency = KafalaFrequency;
  BeneficiaryType = BeneficiaryType; // Expose enum to template

  // Sponsorship modal properties
  isAddDonorModalVisible = false;
  isSelectDonorModalVisible = false;
  isCreatingSponsorshipWithNewDonor = false;
  isCreatingSponsorshipWithExistingDonor = false;
  donorForm: FormGroup;
  sponsorshipForm: FormGroup;

  // Advanced search properties
  isAdvancedSearchModalVisible = false;
  advancedSearchForm: FormGroup;
  isAdvancedSearching = false;
  isAdvancedSearchApplied = false;

  // Document management properties
  showDocumentUpload = false;
  documentRefreshTrigger: any = {};

  // Gift edit properties
  isEditingGift = false;
  editingGiftId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private orphanService: OrphanService,
    private giftService: GiftService,
    private giftTypeService: GiftTypeService,
    private charityProjectService: CharityProjectService,
    private donorService: DonorService,
    private sponsorshipService: SponsorshipService,
    private orphanDocumentService: OrphanDocumentService,
    private pdfService: PdfService,
    private excelProcessor: ExcelProcessorService,
    private excelGenerator: ExcelGeneratorService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.orphanForm = this.createOrphanForm();
    this.giftForm = this.createGiftForm();
    this.orphanGiftForm = this.createSponsorshipGiftForm();
    this.donorForm = this.createDonorForm();
    this.sponsorshipForm = this.createSponsorshipForm();
    this.advancedSearchForm = this.createAdvancedSearchForm();
  }

  ngOnInit(): void {
    this.loadOrphansList();
    this.loadGiftTypes();
    this.loadProjects();
    this.setupDateFormatting();
    this.fetchSystemDonor();
  }

  // Fetch a system donor to use for non-sponsored gifts
  fetchSystemDonor(): void {
    this.donorService.getDonors().subscribe({
      next: (donors: Donor[]) => {
        // Look for a donor with ID 1 (system donor)
        const systemDonor = donors.find(donor => donor.id === 1);
        if (systemDonor) {
          this.donors = donors;
          console.log('System donor found:', systemDonor);
        } else if (donors.length > 0) {
          // If no donor with ID 1, use the first donor in the list
          this.donors = donors;
          console.log('Using first donor as system donor:', donors[0]);
        } else {
          console.error('No donors found in the system');
        }
      },
      error: (error) => {
        console.error('Error fetching donors:', error);
      }
    });
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

  // Advanced search methods
  openAdvancedSearchModal(): void {
    this.isAdvancedSearchModalVisible = true;
  }

  closeAdvancedSearchModal(): void {
    this.isAdvancedSearchModalVisible = false;
  }

  applyAdvancedSearch(): void {
    const formData = this.advancedSearchForm.value as AdvancedSearchFormData;
    const searchRequest = this.convertFormDataToSearchRequest(formData);

    this.isAdvancedSearching = true;
    this.orphanService.advancedSearchOrphans(searchRequest).subscribe({
      next: (orphans) => {
        if (orphans.length === 0) {
          this.showMessage('No orphans found matching your search criteria', 'info');
        } else {
          this.showMessage(`Found ${orphans.length} orphans matching your criteria`, 'success');
        }

        this.orphansList = orphans;
        this.isAdvancedSearching = false;
        this.isAdvancedSearchApplied = true;
        this.closeAdvancedSearchModal();
        // Disable pagination when using advanced search
        this.hasMoreData = false;
        this.allOrphansLoaded = true;
      },
      error: (error) => {
        console.error('Error in advanced search:', error);
        this.isAdvancedSearching = false;
        this.showMessage('An error occurred while searching', 'error');
      }
    });
  }

  resetAdvancedSearch(): void {
    this.advancedSearchForm.reset();
    // Reset to default values
    this.advancedSearchForm.patchValue({
      name: '',
      gender: '',
      ageFrom: null,
      ageTo: null,
      country: '',
      city: '',
      placeOfBirth: '',
      isSponsored: '',
      sponsorshipType: '',
      sponsorshipStartDate: '',
      sponsorshipEndDate: '',
      healthStatus: '',
      educationLevel: '',
      projectParticipation: '',
      registrationDateFrom: '',
      registrationDateTo: '',
      guardianName: '',
      orphanId: ''
    });
  }

  clearAdvancedSearch(): void {
    this.isAdvancedSearchApplied = false;
    this.resetAdvancedSearch();
    this.loadOrphansList();
  }

  private convertFormDataToSearchRequest(formData: AdvancedSearchFormData): AdvancedSearchRequest {
    const request: AdvancedSearchRequest = {};

    // Only include non-empty values in the request
    if (formData.name?.trim()) request.name = formData.name.trim();
    if (formData.gender?.trim()) request.gender = formData.gender.trim();
    if (formData.ageFrom !== null && formData.ageFrom !== undefined) request.ageFrom = formData.ageFrom;
    if (formData.ageTo !== null && formData.ageTo !== undefined) request.ageTo = formData.ageTo;
    if (formData.country?.trim()) request.country = formData.country.trim();
    if (formData.city?.trim()) request.city = formData.city.trim();
    if (formData.placeOfBirth?.trim()) request.placeOfBirth = formData.placeOfBirth.trim();

    // Convert string boolean values
    if (formData.isSponsored === 'true') request.isSponsored = true;
    else if (formData.isSponsored === 'false') request.isSponsored = false;

    if (formData.sponsorshipType?.trim()) request.sponsorshipType = formData.sponsorshipType.trim();
    if (formData.sponsorshipStartDate?.trim()) request.sponsorshipStartDate = formData.sponsorshipStartDate.trim();
    if (formData.sponsorshipEndDate?.trim()) request.sponsorshipEndDate = formData.sponsorshipEndDate.trim();

    if (formData.healthStatus?.trim()) request.healthStatus = formData.healthStatus.trim();
    if (formData.educationLevel?.trim()) request.educationLevel = formData.educationLevel.trim();

    // Convert string boolean values
    if (formData.projectParticipation === 'true') request.projectParticipation = true;
    else if (formData.projectParticipation === 'false') request.projectParticipation = false;

    if (formData.registrationDateFrom?.trim()) request.registrationDateFrom = formData.registrationDateFrom.trim();
    if (formData.registrationDateTo?.trim()) request.registrationDateTo = formData.registrationDateTo.trim();
    if (formData.guardianName?.trim()) request.guardianName = formData.guardianName.trim();
    if (formData.orphanId?.trim()) request.orphanId = formData.orphanId.trim();

    return request;
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

  // Helper method to show messages to the user
  private showMessage(message: string, type: 'success' | 'error' | 'info' | 'warning'): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: [`snackbar-${type}`],
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
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
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];

    return this.fb.group({
      // Fields used in the edit form
      giftName: ['', Validators.required],
      giftValue: ['', [Validators.required, Validators.min(0.01)]],
      giftDate: [formattedDate, Validators.required],
      description: [''],

      // Keep these fields for compatibility with other methods
      donorId: [''],
      giftTypeId: [null],
      customGiftTypeName: [''],
      beneficiaryType: [BeneficiaryType.CHARITY],
      orphanId: [null],
      projectId: [null]
    });
  }

  createSponsorshipGiftForm(): FormGroup {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];

    return this.fb.group({
      giftTypeId: ['', Validators.required],
      customGiftTypeName: [''],
      giftName: ['', Validators.required],
      giftValue: ['', [Validators.required, Validators.min(0.01)]],
      giftDate: [formattedDate, Validators.required],
      description: ['']
    });
  }

  createDonorForm(): FormGroup {
    return this.fb.group({
      donorId: ['', Validators.required],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: [''],
      phone: [''],
      address: [''],
      city: [''],
      state: [''],
      zip: [''],
      country: [''],
      company: ['']
    });
  }

  createSponsorshipForm(): FormGroup {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];

    const form = this.fb.group({
      donorId: [''],
      sponsorshipType: ['MONTHLY', Validators.required],
      startDate: [formattedDate, Validators.required],
      endDate: [''],
      giftValue: [0, [Validators.required, Validators.min(0.01)]],
      isLimited: [true] // Default to limited commitment
    });

    // Set up a listener to update endDate validators when isLimited changes
    form.get('isLimited')?.valueChanges.subscribe(isLimited => {
      // Ensure isLimited is treated as boolean
      this.updateEndDateValidation(form, isLimited === true);
    });

    // Initialize validators based on default isLimited value
    this.updateEndDateValidation(form, true);

    return form;
  }

  // Helper method to update endDate validation based on isLimited value
  private updateEndDateValidation(form: FormGroup, isLimited: boolean): void {
    const endDateControl = form.get('endDate');

    if (isLimited) {
      // If limited commitment, endDate is required
      endDateControl?.setValidators([Validators.required]);
    } else {
      // If unlimited commitment, endDate is not required
      endDateControl?.clearValidators();
      // Clear the endDate value when switching to unlimited
      endDateControl?.setValue('');
    }

    // Update the control's validation status
    endDateControl?.updateValueAndValidity();
  }

  // Toggle isLimited field value
  toggleIsLimited(): void {
    const currentValue = this.sponsorshipForm.get('isLimited')?.value;
    this.sponsorshipForm.patchValue({ isLimited: !currentValue });
    this.updateEndDateValidation(this.sponsorshipForm, !currentValue);
  }

  // Determine if a sponsorship is limited or unlimited
  isSponsorshipLimited(sponsorship: any): boolean {
    // If isLimited is explicitly set as a boolean, use that value
    if (typeof sponsorship.isLimited === 'boolean') {
      return sponsorship.isLimited;
    }

    // If isLimited is set as a number (from database), convert to boolean (1 = true, 0 = false)
    if (sponsorship.isLimited !== undefined) {
      return sponsorship.isLimited === 1 || sponsorship.isLimited === true;
    }

    // If no isLimited field exists, determine based on endDate presence
    return !!sponsorship.endDate;
  }

  createAdvancedSearchForm(): FormGroup {
    return this.fb.group({
      // Personal Info
      name: [''],
      gender: [''],
      ageFrom: [null],
      ageTo: [null],
      country: [''],
      city: [''],
      placeOfBirth: [''],

      // Sponsorship Info
      isSponsored: [''],
      sponsorshipType: [''],
      sponsorshipStartDate: [''],
      sponsorshipEndDate: [''],

      // Other Info
      healthStatus: [''],
      educationLevel: [''],
      projectParticipation: [''],
      registrationDateFrom: [''],
      registrationDateTo: [''],
      guardianName: [''],
      orphanId: ['']
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

    // Reset document upload form state when switching orphans
    this.showDocumentUpload = false;

    this.orphanService.getOrphanById(orphanId).subscribe({
      next: (orphan) => {
        console.log('Loaded orphan details:', orphan);
        this.selectedOrphan = orphan;
        this.populateForm(orphan);
        this.isEditing = true;
        this.isCreating = false;
        this.isLoading = false;

        // Trigger document refresh for the newly selected orphan
        this.documentRefreshTrigger = {};

        // Load sponsorships for this orphan
        this.loadSponsorships();

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
  getActiveOrOnHoldSponsorCount(orphan: OrphanListDTO): number {
    return (orphan.sponsorships || []).filter(
      s => s.status === 'ACTIVE' || s.status ===  'ON_HOLD'
    ).length;
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

    // Special case: if the value is exactly "Photo", it's likely a placeholder and should be treated as invalid
    if (cleanPhoto === "Photo") {
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

  // Delete all orphans with confirmation
  deleteAllOrphans(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      data: {
        title: 'Delete All Orphans',
        message: 'Are you sure you want to delete ALL orphans? This action cannot be undone!',
        confirmText: 'Delete All'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.isLoading = true;
        this.orphanService.deleteAllOrphans().subscribe({
          next: () => {
            this.isLoading = false;
            this.snackBar.open('All orphans have been deleted successfully', 'Close', {
              duration: 5000,
              panelClass: ['success-snackbar']
            });
            // Clear the current list and reset search
            this.orphansList = [];
            this.searchTerm = '';
            this.currentPage = 0;
            this.hasMoreData = true;
          },
          error: (error) => {
            this.isLoading = false;
            console.error('Error deleting all orphans:', error);
            this.snackBar.open('Failed to delete all orphans', 'Close', {
              duration: 5000,
              panelClass: ['error-snackbar']
            });
          }
        });
      }
    });
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
  loadGiftTypes(): void {
    this.giftTypeService.getAllGiftTypesWithBalances().subscribe({
      next: (types: GiftTypeModel[]) => {
        this.giftTypes = types;
      },
      error: (error: any) => {
        console.error('Error loading gift types:', error);
      }
    });
  }

  loadProjects(): void {
    this.charityProjectService.getProjects().subscribe({
      next: (projects: CharityProject[]) => {
        this.availableProjects = projects;
      },
      error: (error: any) => {
        console.error('Error loading projects:', error);
      }
    });
  }

  onGiftTypeChange(): void {
    const giftTypeId = this.giftForm.get('giftTypeId')?.value;
    const customNameControl = this.giftForm.get('customGiftTypeName');

    if (giftTypeId === 'custom') {
      customNameControl?.setValidators([Validators.required]);
    } else {
      customNameControl?.clearValidators();
      customNameControl?.setValue('');
    }
    customNameControl?.updateValueAndValidity();
  }

  onBeneficiaryTypeChange(type: BeneficiaryType): void {
    this.beneficiaryType = type;
    const orphanIdControl = this.giftForm.get('orphanId');
    const projectIdControl = this.giftForm.get('projectId');

    // Clear validators first
    orphanIdControl?.clearValidators();
    projectIdControl?.clearValidators();

    // Set validators based on beneficiary type
    if (type === BeneficiaryType.ORPHAN) {
      orphanIdControl?.setValidators([Validators.required]);
      projectIdControl?.setValue(null);
    } else if (type === BeneficiaryType.PROJECT) {
      projectIdControl?.setValidators([Validators.required]);
      orphanIdControl?.setValue(null);
    } else {
      // Charity - no specific beneficiary required
      orphanIdControl?.setValue(null);
      projectIdControl?.setValue(null);
    }

    orphanIdControl?.updateValueAndValidity();
    projectIdControl?.updateValueAndValidity();
  }

  openAddGiftModal(orphan: OrphanListDTO): void {
    this.selectedOrphanForGift = orphan;
    this.loadDonors();
    this.resetGiftForm();
    this.isGiftModalVisible = true;
  }

  resetGiftForm(): void {
    this.giftForm.reset();
    this.giftForm.patchValue({
      donorId: '',
      date: new Date().toISOString().split('T')[0],
      beneficiaryType: BeneficiaryType.CHARITY,
      giftTypeId: null,
      customGiftTypeName: '',
      amount: '',
      orphanId: null,
      projectId: null,
      description: ''
    });
    this.beneficiaryType = BeneficiaryType.CHARITY;
    this.giftError = '';
    this.giftSuccess = '';
  }

  openGiftHistoryModal(orphan: OrphanListDTO): void {
    this.selectedOrphanForGift = orphan;
    this.loadOrphanGifts(orphan.id!);
    this.isGiftHistoryModalVisible = true;
  }

  closeGeneralGiftModal(): void {
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


  async submitGift(): Promise<void> {
    if (!this.giftForm.valid || !this.selectedOrphanForGift) {
      return;
    }

    this.isSubmittingGift = true;
    this.giftError = '';
    this.giftSuccess = '';

    try {
      const formValue = this.giftForm.value;
      let giftTypeId = formValue.giftTypeId;

      // Handle custom gift type creation
      if (formValue.giftTypeId === 'custom' && formValue.customGiftTypeName) {
        const newGiftType = await this.giftTypeService.createGiftType({
          name: formValue.customGiftTypeName,
          description: `Custom gift type: ${formValue.customGiftTypeName}`
        }).toPromise();
        giftTypeId = newGiftType?.id;
      }

      if (!giftTypeId) {
        this.giftError = 'Please select or create a valid gift type';
        this.isSubmittingGift = false;
        return;
      }

      // Check gift type balance
      const hasBalance = await this.giftService.checkGiftTypeBalance(giftTypeId, formValue.amount).toPromise();
      if (!hasBalance) {
        this.giftError = 'Insufficient balance in the selected gift type fund';
        this.isSubmittingGift = false;
        return;
      }

      // Prepare gift request
      const giftRequest: CreateGiftRequestV2 = {
        donorId: formValue.donorId,
        giftTypeId: giftTypeId,
        amount: formValue.amount,
        giftName: formValue.description || 'Gift for Orphan', // Use description as gift name or default
        date: formValue.date,
        description: formValue.description || '',
        beneficiaryType: formValue.beneficiaryType,
        orphanId: formValue.beneficiaryType === BeneficiaryType.ORPHAN ? this.selectedOrphanForGift.id : undefined,
        projectId: formValue.beneficiaryType === BeneficiaryType.PROJECT ? formValue.projectId : undefined
      };

      // Create gift
      const gift = await this.giftService.createGiftV2(giftRequest).toPromise();

      this.giftSuccess = 'Gift added successfully!';
      this.resetGiftForm();

      // Refresh data
      if (this.activeSection === 'gifts') {
        this.loadOrphanGiftsForDetail();
      }
      this.loadOrphansList();

      // Close modal after short delay
      setTimeout(() => {
        this.closeGeneralGiftModal();
      }, 1500);

    } catch (error: any) {
      console.error('Error creating gift:', error);
      this.giftError = error.error?.message || 'Failed to create gift. Please try again.';
    } finally {
      this.isSubmittingGift = false;
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

  formatCurrency(amount: any): string {
    // Handle undefined, null, NaN, or non-numeric values
    if (amount === undefined || amount === null || isNaN(parseFloat(amount))) {
      return '$0.00';
    }

    // Convert to number if it's a string
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(numericAmount);
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

  // Check if a sponsorship is active based on its status field
  getSponsorshipStatus(sponsorship: any): string {
    // Use the status field from backend if available
    if (sponsorship.status) {
      return sponsorship.status;
    }

    // Fallback to date-based logic for backward compatibility
    if (!sponsorship.endDate) {
      return 'ACTIVE';
    }

    const endDate = new Date(sponsorship.endDate);
    const today = new Date();

    return endDate > today ? 'ACTIVE' : 'EXPIRED';
  }

  // Get all gifts from all sponsorships (remove duplicates)
  getAllGifts(): any[] {
    console.log('=== DEBUG: getAllGifts() called ===');

    const allGifts: any[] = [];
    const seenGiftIds = new Set<number>();

    // First, add gifts from the orphanGifts array (non-sponsored gifts)
    if (this.orphanGifts && Array.isArray(this.orphanGifts)) {
      console.log('Processing orphanGifts array:', this.orphanGifts);
      this.orphanGifts.forEach((gift: any) => {
        const giftId = gift.id || gift.giftId;
        if (giftId && !seenGiftIds.has(giftId)) {
          seenGiftIds.add(giftId);
          const mappedGift = {
            ...gift,
            amount: gift.gift_value || gift.giftValue || gift.amount || 0,
            giftTypeName: this.getGiftTypeNameFromId(gift.gift_type_id) || gift.giftTypeName || gift.giftType || 'Unknown',
            giftTypeId: gift.gift_type_id || gift.giftTypeId,
            donorName: gift.donorName || 'System',
            giftDate: gift.gift_date || gift.giftDate || gift.date,
            giftName: gift.gift_name || gift.giftName || 'Gift'
          };
          allGifts.push(mappedGift);
        }
      });
    }

    // Then add gifts from sponsorships (if any)
    if (this.selectedOrphan?.sponsorships) {
      console.log('Selected orphan sponsorships:', this.selectedOrphan.sponsorships);

      this.selectedOrphan.sponsorships.forEach((sponsorship: any) => {
        console.log('Processing sponsorship:', sponsorship);
        if (sponsorship.gifts && Array.isArray(sponsorship.gifts)) {
          console.log('Sponsorship gifts array:', sponsorship.gifts);
          sponsorship.gifts.forEach((gift: any) => {
            console.log('Processing individual gift:', gift);
            const giftId = gift.id || gift.giftId;
            if (giftId && !seenGiftIds.has(giftId)) {
              seenGiftIds.add(giftId);
              // Ensure proper field mapping based on database structure
              const mappedGift = {
                ...gift,
                amount: gift.gift_value || gift.giftValue || gift.amount || 0,
                giftTypeName: this.getGiftTypeNameFromId(gift.gift_type_id) || gift.giftTypeName || gift.giftType || 'Unknown',
                giftTypeId: gift.gift_type_id || gift.giftTypeId,
                donorName: sponsorship.donorName || gift.donorName,
                giftDate: gift.gift_date || gift.giftDate || gift.date,
                giftName: gift.gift_name || gift.giftName || 'Gift'
              };

              console.log('Mapped gift result:', mappedGift);
              allGifts.push(mappedGift);
            }
          });
        }
      });
    }

    console.log('Final allGifts array:', allGifts);
    console.log('=== END DEBUG: getAllGifts() ===');
    return allGifts;
  }

  // Filter gifts by type and return only Monthly Sponsorship gifts
  getMonthlyOrphanSponsorshipGifts(sponsorship: any): any[] {
    if (!sponsorship.gifts || !Array.isArray(sponsorship.gifts)) {
      return [];
    }

    // For monthly sponsorships, return all gifts as they are associated with this sponsorship
    if (sponsorship.sponsorshipType === 'MONTHLY') {
      return sponsorship.gifts;
    }

    // For other sponsorship types, use more specific filtering
    return sponsorship.gifts.filter((gift: any) =>
      gift.giftName === 'Orphan Sponsorship Monthly' ||
      gift.giftTypeName === 'Orphan Sponsorship Monthly' ||
      gift.giftType === 'SPONSORSHIP'
    );
  }

  // Group all gifts by their type (from all sponsorships)
  getAllGiftsByType(): {[key: string]: {id: number, name: string, gifts: any[]}} {
    const allGifts = this.getAllGifts();

    if (!allGifts || allGifts.length === 0) {
      return {};
    }

    const groupedGifts: {[key: string]: {id: number, name: string, gifts: any[]}} = {};

    allGifts.forEach((gift: any) => {
      // Determine gift type ID and name
      let giftTypeId = gift.gift_type_id || gift.giftTypeId;
      let giftTypeName = '';

      // If we have a valid gift type ID, use it
      if (giftTypeId && giftTypeId > 0) {
        giftTypeName = this.getGiftTypeName(giftTypeId);
      }
      // Otherwise, try to infer gift type from name
      else {
        // Map gift names to appropriate gift type IDs
        const giftName = gift.giftName || '';
        if (giftName.toLowerCase().includes('education')) {
          giftTypeId = 26;
          giftTypeName = 'Education General Fund';
        } else if (giftName.toLowerCase().includes('medical')) {
          giftTypeId = 3;
          giftTypeName = 'Medical Fund';
        } else if (giftName.toLowerCase().includes('food')) {
          giftTypeId = 5;
          giftTypeName = 'Food Fund';
        } else if (giftName.toLowerCase().includes('emergency')) {
          giftTypeId = 4;
          giftTypeName = 'Emergency Fund';
        } else if (giftName.toLowerCase().includes('sponsorship') || giftName.toLowerCase().includes('monthly')) {
          giftTypeId = 1;
          giftTypeName = 'Orphan Sponsorship Monthly';
        } else {
          // Default to General Donation if no match
          giftTypeId = 2;
          giftTypeName = 'General Donation';
        }
      }

      // If still no gift type name, use the gift type name from the data or default to "Other"
      if (!giftTypeName) {
        giftTypeName = gift.giftTypeName || 'Other';
      }

      // Use the gift type ID as the key to ensure proper grouping by type
      const key = giftTypeId.toString();

      if (!groupedGifts[key]) {
        groupedGifts[key] = {
          id: giftTypeId,
          name: giftTypeName,
          gifts: []
        };
      }

      groupedGifts[key].gifts.push(gift);
    });

    return groupedGifts;
  }

  // Group gifts by their type (for individual sponsorship)
  getGiftsByType(sponsorship: any): {[key: string]: {id: number, name: string, gifts: any[]}} {
    if (!sponsorship.gifts || !Array.isArray(sponsorship.gifts)) {
      return {};
    }

    const groupedGifts: {[key: string]: {id: number, name: string, gifts: any[]}} = {};

    sponsorship.gifts.forEach((gift: any) => {
      // Determine gift type ID and name
      let giftTypeId = gift.gift_type_id || gift.giftTypeId;
      let giftTypeName = '';

      // If we have a valid gift type ID, use it
      if (giftTypeId && giftTypeId > 0) {
        giftTypeName = this.getGiftTypeName(giftTypeId);
      }
      // Otherwise, try to infer gift type from name
      else {
        // Map gift names to appropriate gift type IDs
        const giftName = gift.giftName || '';
        if (giftName.toLowerCase().includes('education')) {
          giftTypeId = 26;
          giftTypeName = 'Education General Fund';
        } else if (giftName.toLowerCase().includes('medical')) {
          giftTypeId = 3;
          giftTypeName = 'Medical Fund';
        } else if (giftName.toLowerCase().includes('food')) {
          giftTypeId = 5;
          giftTypeName = 'Food Fund';
        } else if (giftName.toLowerCase().includes('emergency')) {
          giftTypeId = 4;
          giftTypeName = 'Emergency Fund';
        } else if (giftName.toLowerCase().includes('sponsorship') || giftName.toLowerCase().includes('monthly')) {
          giftTypeId = 1;
          giftTypeName = 'Orphan Sponsorship Monthly';
        } else {
          // Default to General Donation if no match
          giftTypeId = 2;
          giftTypeName = 'General Donation';
        }
      }

      // If still no gift type name, use the gift type name from the data or default to "Other"
      if (!giftTypeName) {
        giftTypeName = gift.giftTypeName || 'Other';
      }

      // Use the gift type ID as the key to ensure proper grouping by type
      const key = giftTypeId.toString();

      if (!groupedGifts[key]) {
        groupedGifts[key] = {
          id: giftTypeId,
          name: giftTypeName,
          gifts: []
        };
      }

      groupedGifts[key].gifts.push(gift);
    });

    return groupedGifts;
  }

  // Get gift type name from ID
  getGiftTypeName(giftTypeId: number): string {
    // Map of known gift type IDs to names based on the database screenshots
    const giftTypeMap: {[key: number]: string} = {
      26: 'Education General Fund',
      1: 'Orphan Sponsorship Monthly',
      2: 'General Donation',
      3: 'Medical Fund',
      4: 'Emergency Fund',
      5: 'Food Fund',
      6: 'Clothing Fund',
      7: 'Housing Fund',
      8: 'Transportation Fund',
      9: 'Special Needs Fund',
      10: 'Holiday Fund'
    };

    return giftTypeMap[giftTypeId] || '';
  }

  // Get all gift types from all sponsorships
  getAllGiftTypes(): {id: number, name: string, gifts: any[]}[] {
    const groupedGifts = this.getAllGiftsByType();
    return Object.values(groupedGifts);
  }

  // Get all gift types in a sponsorship
  getGiftTypes(sponsorship: any): {id: number, name: string, gifts: any[]}[] {
    const groupedGifts = this.getGiftsByType(sponsorship);
    return Object.values(groupedGifts);
  }

  // Check if an orphan is currently sponsored
  isOrphanSponsored(): boolean {
    // Always check for active sponsorships in the array first
    if (this.selectedOrphan?.sponsorships && this.selectedOrphan.sponsorships.length > 0) {
      // Check if any sponsorship has ACTIVE status
      const hasActiveSponsorship = this.selectedOrphan.sponsorships.some(s =>
        this.getSponsorshipStatus(s) === 'ACTIVE'
      );

      // Update the isSponsored field to match our calculation
      if (this.selectedOrphan) {
        this.selectedOrphan.isSponsored = hasActiveSponsorship;
      }

      return hasActiveSponsorship;
    }

    // If no sponsorships array, use the isSponsored field if available
    if (this.selectedOrphan?.isSponsored !== undefined) {
      return this.selectedOrphan.isSponsored;
    }

    return false;
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
          console.log('=== RAW API RESPONSE ===');
          console.log('Raw gifts from API:', gifts);
          console.log('Type of gifts:', typeof gifts);
          console.log('Is array:', Array.isArray(gifts));
          if (gifts && gifts.length > 0) {
            console.log('First gift structure:', gifts[0]);
            console.log('Gift keys:', Object.keys(gifts[0]));
          }

          // Map the gifts to ensure proper field mapping
          const mappedGifts = (gifts || []).map((gift: any) => {
            console.log('Mapping gift:', gift);
            const mapped = {
              ...gift,
              // Use the correct field from API response
              amount: gift.amount || 0,
              // Use the correct gift type fields from API
              giftTypeName: gift.giftTypeName || this.getGiftTypeNameFromId(gift.giftTypeId) || 'Unknown',
              giftTypeId: gift.giftTypeId,
              // Use the correct date field
              giftDate: gift.giftDate || gift.date,
              // Use the correct name field
              giftName: gift.giftName || 'Gift',
              // Use the correct donor name
              donorName: gift.donorName || 'Unknown Donor'
            };
            console.log('Mapped gift result:', mapped);
            return mapped;
          });

          this.orphanGifts = mappedGifts;
          console.log('Final orphanGifts:', this.orphanGifts);
          console.log('=== END RAW API RESPONSE ===');
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

  // Sponsorship-related methods for new sections
  openAddDonorForm(): void {
    this.isAddDonorModalVisible = true;
    this.donorForm.reset();
    this.sponsorshipForm.reset();

    // Set default values
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];

    this.sponsorshipForm.patchValue({
      sponsorshipType: 'MONTHLY',
      startDate: formattedDate,
      giftValue: 0,
      isLimited: true // Default to limited commitment
    });

    // Make sure endDate validation is applied correctly
    this.updateEndDateValidation(this.sponsorshipForm, true);
  }

  openSelectDonorForm(): void {
    // Load existing donors
    this.loadDonors();
    this.sponsorshipForm.reset();

    // Set default values for sponsorship form
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    this.sponsorshipForm.patchValue({
      sponsorshipType: 'MONTHLY',
      startDate: formattedDate,
      giftValue: 0,
      isLimited: true // Default to limited commitment
    });

    // Make sure endDate validation is applied correctly
    this.updateEndDateValidation(this.sponsorshipForm, true);

    this.isSelectDonorModalVisible = true;
  }

  openAddGiftForm(): void {
    // Check if orphan is selected
    if (!this.selectedOrphan) {
      this.snackBar.open('Please select an orphan first.', 'Close', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    // Open the gift modal (no sponsorship requirement)
    this.orphanGiftForm.reset();
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    this.orphanGiftForm.patchValue({
      giftDate: formattedDate
    });
    this.isGiftFormModalVisible = true;
  }

  loadSponsorships(): void {
    if (this.selectedOrphan && this.selectedOrphan.id) {
      console.log('Loading sponsorships for orphan ID:', this.selectedOrphan.id);
      this.sponsorshipService.getSponsorshipsByOrphanId(this.selectedOrphan.id).subscribe({
        next: (sponsorships) => {
          console.log('Loaded sponsorships:', sponsorships);
          // Update the selected orphan with sponsorship data
          if (this.selectedOrphan) {
            // Create a counter to track async operations
            let pendingDonorFetches = 0;
            const donorFetchesComplete = new Subject<void>();

            // Process sponsorships with basic data first
            this.selectedOrphan.sponsorships = sponsorships.map(s => {
              // Try multiple possible field names for the amount/gift value
              const amount = (s as any).giftValue || (s as any).amount || (s as any).monthlyAmount || (s as any).yearlyAmount || 0;

              // If we have donor name, use it; otherwise use a temporary placeholder
              let donorName = s.donorName;
              if (!donorName || donorName === 'null' || donorName.trim() === '') {
                donorName = `Loading donor...`; // Temporary placeholder

                // Increment the counter for pending donor fetches
                if (s.donorId) {
                  pendingDonorFetches++;
                }
              }

              // Explicitly capture isLimited from backend
              console.log('Sponsorship data from backend:', s);

              return {
                id: s.id || 0,
                donorId: s.donorId,
                donorName: donorName,
                sponsorshipType: s.sponsorshipType,
                amount: amount,
                status: s.status || 'ACTIVE',
                startDate: s.startDate,
                endDate: s.endDate,
                gifts: (s.gifts || []).map(g => ({
                  id: g.id || 0,
                  giftName: g.giftName,
                  giftDate: g.giftDate,
                  description: g.description,
                  giftValue: g.giftValue
                }))
              };
            });

            // Now fetch donor names for all sponsorships that need them
            if (pendingDonorFetches > 0) {
              console.log(`Fetching ${pendingDonorFetches} donor names...`);
              let completedFetches = 0;

              // For each sponsorship that needs a donor name
              this.selectedOrphan.sponsorships.forEach((sponsorship, index) => {
                if (sponsorship.donorName === 'Loading donor...' && sponsorship.donorId) {
                  // Fetch the donor details
                  this.donorService.getDonorById(sponsorship.donorId).subscribe({
                    next: (donor) => {
                      // Update the donor name in the sponsorship
                      if (this.selectedOrphan?.sponsorships) {
                        this.selectedOrphan.sponsorships[index].donorName =
                          `${donor.firstName} ${donor.lastName}`.trim() || `Donor ${sponsorship.donorId}`;
                      }

                      // Check if all fetches are complete
                      completedFetches++;
                      if (completedFetches === pendingDonorFetches) {
                        donorFetchesComplete.next();
                        donorFetchesComplete.complete();
                      }
                    },
                    error: () => {
                      // Update with fallback name if donor fetch fails
                      if (this.selectedOrphan?.sponsorships) {
                        this.selectedOrphan.sponsorships[index].donorName = `Donor ${sponsorship.donorId}`;
                      }

                      // Check if all fetches are complete
                      completedFetches++;
                      if (completedFetches === pendingDonorFetches) {
                        donorFetchesComplete.next();
                        donorFetchesComplete.complete();
                      }
                    }
                  });
                }
              });
            } else {
              // No donor names to fetch, complete immediately
              donorFetchesComplete.next();
              donorFetchesComplete.complete();
            }
          }
        },
        error: (error) => {
          console.error('Error loading sponsorships:', error);
          // Initialize empty sponsorships array on error
          if (this.selectedOrphan) {
            this.selectedOrphan.sponsorships = [];
          }
        }
      });
    }
  }

  // This method has been moved to line ~1294

  // Method to refresh sponsorships while preserving donor names
  refreshSponsorshipsPreservingDonorNames(): void {
    if (this.selectedOrphan && this.selectedOrphan.id) {
      // Store current sponsorships with donor names
      const currentSponsorships = [...(this.selectedOrphan.sponsorships || [])];
      const donorNameMap = new Map<number, string>();

      // Create a map of donorId -> donorName from current data
      currentSponsorships.forEach(s => {
        if (s.donorId && s.donorName && s.donorName !== 'Loading donor...' && s.donorName !== `Donor ${s.donorId}`) {
          donorNameMap.set(s.donorId, s.donorName);
        }
      });

      // Now fetch fresh sponsorship data
      this.sponsorshipService.getSponsorshipsByOrphanId(this.selectedOrphan.id).subscribe({
        next: (sponsorships) => {
          console.log('Refreshed sponsorships while preserving donor names:', sponsorships);

          // Process the fresh sponsorships
          if (this.selectedOrphan) {
            this.selectedOrphan.sponsorships = sponsorships.map(s => {
              // Try multiple possible field names for the amount/gift value
              const amount = (s as any).giftValue || (s as any).amount || (s as any).monthlyAmount || (s as any).yearlyAmount || 0;

              // Use the donor name from our map if available, otherwise use what came from the API
              let donorName = s.donorName || '';
              if (s.donorId && donorNameMap.has(s.donorId)) {
                // Use our cached donor name
                donorName = donorNameMap.get(s.donorId) || donorName;
              } else if (!donorName || donorName === 'null' || donorName.trim() === '') {
                // If we don't have a cached name and the API didn't provide one, fetch it
                donorName = `Donor ${s.donorId}`; // Temporary name

                // Fetch the donor details if needed
                if (s.donorId) {
                  this.donorService.getDonorById(s.donorId).subscribe({
                    next: (donor) => {
                      // Find this sponsorship in the array and update its donor name
                      if (this.selectedOrphan?.sponsorships) {
                        const index = this.selectedOrphan.sponsorships.findIndex(sp => sp.id === s.id);
                        if (index !== -1) {
                          this.selectedOrphan.sponsorships[index].donorName =
                            `${donor.firstName} ${donor.lastName}`.trim() || `Donor ${s.donorId}`;
                        }
                      }
                    },
                    error: () => {
                      // Keep the temporary name on error
                    }
                  });
                }
              }

              return {
                id: s.id || 0,
                donorId: s.donorId,
                donorName: donorName,
                sponsorshipType: s.sponsorshipType,
                amount: amount,
                status: s.status || 'ACTIVE',
                startDate: s.startDate,
                endDate: s.endDate,
                isLimited: s.isLimited, // Add the missing isLimited field
                gifts: (s.gifts || []).map(g => ({
                  id: g.id || 0,
                  giftName: g.giftName,
                  giftDate: g.giftDate,
                  description: g.description,
                  giftValue: g.giftValue
                }))
              };
            });
          }
        },
        error: (error) => {
          console.error('Error refreshing sponsorships:', error);
          // Keep existing sponsorships on error
        }
      });
    }
  }

  // Gift modal methods
  closeGiftModal(): void {
    this.isGiftFormModalVisible = false;
    this.orphanGiftForm.reset();
    this.isSubmittingGift = false;
  }

  submitOrphanGiftForm(): void {
    if (this.orphanGiftForm.valid && !this.isSubmittingGift && this.selectedOrphan) {
      this.isSubmittingGift = true;

      const formValue = this.orphanGiftForm.value;

      // Handle custom gift type creation if needed
      let giftTypeId = formValue.giftTypeId;
      if (giftTypeId === 'custom' && formValue.customGiftTypeName) {
        // Create a new gift type first
        const newGiftTypeRequest = {
          name: formValue.customGiftTypeName,
          description: 'Custom gift type created by user'
        };

        this.giftTypeService.createGiftType(newGiftTypeRequest).subscribe({
          next: (createdType: GiftTypeModel) => {
            this.giftTypes.push(createdType);
            this.processGiftSubmission(createdType.id);
          },
          error: (error: any) => {
            this.isSubmittingGift = false;
            this.snackBar.open('Error creating custom gift type: ' + (error.error?.message || error.message || 'Unknown error'), 'Close', {
              duration: 5000,
              panelClass: ['error-snackbar']
            });
          }
        });
      } else {
        // Use existing gift type
        this.processGiftSubmission(+giftTypeId);
      }
    }
  }

  processGiftSubmission(giftTypeId: number): void {
    const formValue = this.orphanGiftForm.value;

    // Check balance before creating gift
    this.giftService.checkGiftTypeBalance(giftTypeId, +formValue.giftValue).subscribe({
      next: (hasSufficientBalance) => {
        if (!hasSufficientBalance) {
          this.isSubmittingGift = false;
          this.snackBar.open('There is not enough balance for this type of gift', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          return;
        }

        // Convert date string to ISO DateTime format for backend
        const giftDate = new Date(formValue.giftDate);

        // Find if the orphan has any active sponsorships to get a donor ID
        let donorId: number | null = null;

        // If the orphan has sponsorships, use the donor ID from the first active one
        if (this.selectedOrphan?.sponsorships && this.selectedOrphan.sponsorships.length > 0) {
          const activeSponsorship = this.selectedOrphan.sponsorships.find(s => s.status === 'ACTIVE');
          if (activeSponsorship) {
            donorId = activeSponsorship.donorId;
          }
        }

        // If no donor ID from sponsorship, find a valid donor from the donors list
        if (!donorId && this.donors.length > 0) {
          // Try to find donor with ID 1 first (system donor)
          const systemDonor = this.donors.find(d => d.id === 1);
          if (systemDonor && systemDonor.id) {
            donorId = systemDonor.id;
          } else if (this.donors[0] && this.donors[0].id) {
            // Otherwise use the first donor in the list
            donorId = this.donors[0].id;
          }
        }

        // Create the gift request with the donor ID (always required by backend)
        const giftRequest: CreateGiftRequestV2 = {
          donorId: donorId as number, // Cast to number since we've ensured it's valid
          giftTypeId: giftTypeId,
          amount: +formValue.giftValue,
          giftName: formValue.giftName || 'Gift',
          date: giftDate.toISOString().split('T')[0],
          description: formValue.description || undefined,
          beneficiaryType: 'orphan',
          orphanId: this.selectedOrphan?.id
        };

        this.giftService.createGiftV2(giftRequest).subscribe({
          next: (response) => {
            this.isSubmittingGift = false;
            this.closeGiftModal();

            // Reload sponsorships and gifts to show the new gift
            this.loadSponsorships();

            // Reload gifts if we're on the gifts tab
            if (this.activeSection === 'gifts' && this.selectedOrphan?.id) {
              this.loadOrphanGiftsForDetail();
            }

            // Also reload gifts in the gift history modal if it's open
            if (this.selectedOrphanForGift && this.isGiftHistoryModalVisible) {
              this.loadOrphanGifts(this.selectedOrphanForGift.id!);
            }

            this.snackBar.open('Gift added successfully!', 'Close', {
              duration: 3000,
              panelClass: ['success-snackbar']
            });
          },
          error: (error) => {
            this.isSubmittingGift = false;
            console.error('Error adding gift:', error);

            let errorMessage = 'Failed to add gift. Please try again.';
            if (error.error && error.error.message) {
              errorMessage = error.error.message;
            }

            this.snackBar.open(errorMessage, 'Close', {
              duration: 5000,
              panelClass: ['error-snackbar']
            });
          }
        });
      },
      error: (error: any) => {
        this.isSubmittingGift = false;
        this.snackBar.open('Error checking balance: ' + (error.error?.message || error.message || 'Unknown error'), 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }


  // Properties for sponsorship editing
  isEditSponsorshipModalVisible = false;
  isUpdatingSponsorship = false;
  editingSponsorshipId: number | null = null;

  // Edit sponsorship method
  editSponsorship(sponsorship: any): void {
    this.editingSponsorshipId = sponsorship.id;

    // Format date for input field
    let startDate = '';
    let endDate = '';

    if (sponsorship.startDate) {
      const date = new Date(sponsorship.startDate);
      startDate = date.toISOString().split('T')[0];
    }

    if (sponsorship.endDate) {
      const date = new Date(sponsorship.endDate);
      endDate = date.toISOString().split('T')[0];
    }

    // Determine if this is a limited commitment based on endDate
    // If endDate exists, it's a limited commitment
    const isLimited = !!endDate;

    // Reset form and populate with current data
    this.sponsorshipForm.reset();
    this.sponsorshipForm.patchValue({
      donorId: sponsorship.donorId,
      sponsorshipType: sponsorship.sponsorshipType,
      startDate: startDate,
      endDate: endDate,
      giftValue: sponsorship.amount,
      isLimited: isLimited // Set based on whether endDate exists
    });

    // Make sure endDate validation is applied correctly
    this.updateEndDateValidation(this.sponsorshipForm, isLimited);

    this.openEditSponsorshipModal();
  }

  // Open edit sponsorship modal
  openEditSponsorshipModal(): void {
    // Load existing donors for the dropdown
    this.loadDonors();

    // Show the edit modal
    this.isEditSponsorshipModalVisible = true;
  }

  // Close edit sponsorship modal
  closeEditSponsorshipModal(): void {
    this.isEditSponsorshipModalVisible = false;
    this.sponsorshipForm.reset();
    this.editingSponsorshipId = null;
    this.isUpdatingSponsorship = false;
  }

  // Update sponsorship method
  updateSponsorship(): void {
    if (this.sponsorshipForm.valid && this.editingSponsorshipId && !this.isUpdatingSponsorship) {
      this.isUpdatingSponsorship = true;
      const sponsorshipData = {
        donorId: this.sponsorshipForm.value.donorId,
        sponsorshipType: this.sponsorshipForm.value.sponsorshipType,
        startDate: this.sponsorshipForm.value.startDate,
        endDate: this.sponsorshipForm.value.endDate,
        giftValue: this.sponsorshipForm.value.giftValue,
        isLimited: this.sponsorshipForm.value.isLimited,
        orphanId: this.selectedOrphan?.id
      };

      // Store donor details for UI update
      let donorDetails: any = null;

      // First get the donor details to update the UI with the correct donor name
      this.donorService.getDonorById(sponsorshipData.donorId).subscribe({
        next: (donor) => {
          // Save donor details for later use
          donorDetails = donor;

          // Now update the sponsorship with the backend
          // Ensure editingSponsorshipId is not null before passing it
          if (this.editingSponsorshipId !== null) {
            this.sponsorshipService.updateSponsorship(this.editingSponsorshipId, sponsorshipData).subscribe({
              next: (updatedSponsorship) => {
                console.log('Backend response - updated sponsorship:', updatedSponsorship);
                console.log('Backend response - isLimited field:', updatedSponsorship.isLimited);
                this.isUpdatingSponsorship = false;
                this.closeEditSponsorshipModal();

                // Update the sponsorship in the local array immediately
                if (this.selectedOrphan && this.selectedOrphan.sponsorships) {
                  const index = this.selectedOrphan.sponsorships.findIndex(s => s.id === this.editingSponsorshipId);
                  if (index !== -1) {
                    // Update all fields including the donor name
                    this.selectedOrphan.sponsorships[index].donorId = sponsorshipData.donorId;
                    this.selectedOrphan.sponsorships[index].donorName = `${donorDetails.firstName} ${donorDetails.lastName}`.trim();
                    this.selectedOrphan.sponsorships[index].sponsorshipType = sponsorshipData.sponsorshipType;
                    this.selectedOrphan.sponsorships[index].amount = sponsorshipData.giftValue;
                    this.selectedOrphan.sponsorships[index].startDate = sponsorshipData.startDate;
                    this.selectedOrphan.sponsorships[index].endDate = sponsorshipData.endDate;
                    this.selectedOrphan.sponsorships[index].isLimited = sponsorshipData.isLimited;

                    console.log('Local UI update - isLimited value:', sponsorshipData.isLimited);
                    console.log('Updated sponsorship object:', this.selectedOrphan.sponsorships[index]);
                  }
                }

                // Instead of reloading the entire orphan details, just update the sponsorships
                // This prevents the UI from showing temporary placeholder donor names
                if (this.selectedOrphan && this.selectedOrphan.id) {
                  // We'll use a custom method to refresh sponsorships while preserving donor names
                  this.refreshSponsorshipsPreservingDonorNames();
                }

                this.snackBar.open('Sponsorship updated successfully!', 'Close', {
                  duration: 3000,
                  panelClass: ['success-snackbar']
                });
              },
              error: (error: any) => {
                this.isUpdatingSponsorship = false;
                console.error('Error updating sponsorship:', error);

                let errorMessage = 'Failed to update sponsorship. Please try again.';
                if (error.error && error.error.message) {
                  errorMessage = error.error.message;
                }

                this.snackBar.open(errorMessage, 'Close', {
                  duration: 5000,
                  panelClass: ['error-snackbar']
                });
              }
            });
          }
        },
        error: (error: any) => {
          this.isUpdatingSponsorship = false;
          console.error('Error fetching donor details:', error);

          let errorMessage = 'Failed to fetch donor details. Please try again.';
          if (error.error && error.error.message) {
            errorMessage = error.error.message;
          }

          this.snackBar.open(errorMessage, 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }

  // Cancel sponsorship method
  cancelSponsorship(sponsorship: any): void {
    if (confirm(`Are you sure you want to cancel the sponsorship with ${sponsorship.donorName}?`)) {
      this.sponsorshipService.cancelSponsorship(sponsorship.id).subscribe({
        next: (updatedSponsorship) => {
          // Update the sponsorship in the local array
          if (this.selectedOrphan && this.selectedOrphan.sponsorships) {
            const index = this.selectedOrphan.sponsorships.findIndex(s => s.id === sponsorship.id);
            const orphanId = this.selectedOrphan?.id;
            const orphanListIndex = this.filteredOrphans.findIndex(o => o.id === orphanId);
            if (index !== -1 && orphanListIndex !== -1) {
              // Update the status directly
              this.selectedOrphan.sponsorships[index].status = 'CANCELLED';
              this.selectedOrphan.sponsorships[index].endDate = new Date().toISOString().split('T')[0];
              this.filteredOrphans[orphanListIndex].isSponsored = false;
            }
          }

          // Refresh the orphan data completely to ensure all UI elements update
          if (this.selectedOrphan && this.selectedOrphan.id) {
            this.loadOrphanDetails(this.selectedOrphan.id);
          }

          this.snackBar.open('Sponsorship cancelled successfully', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
        },
        error: (error) => {
          console.error('Error cancelling sponsorship:', error);
        }
      });
    }
  }

  // Put sponsorship on hold method
  putSponsorshipOnHold(sponsorship: any): void {
    if (confirm(`Are you sure you want to put the sponsorship with ${sponsorship.donorName} on hold?`)) {
      this.sponsorshipService.putSponsorshipOnHold(sponsorship.id).subscribe({
        next: (updatedSponsorship) => {
          // Update the sponsorship in the local array
          if (this.selectedOrphan && this.selectedOrphan.sponsorships) {
            const orphanId = this.selectedOrphan?.id;
            const orphanListIndex = this.filteredOrphans.findIndex(o => o.id === orphanId);
            const index = this.selectedOrphan.sponsorships.findIndex(s => s.id === sponsorship.id);
            if (index !== -1 && orphanListIndex !== -1) {
              // Update the status directly
              this.selectedOrphan.sponsorships[index].status = 'ON_HOLD';
              this.filteredOrphans[orphanListIndex].isSponsored = true;
            }
          }

          // Refresh the orphan data completely to ensure all UI elements update
          if (this.selectedOrphan && this.selectedOrphan.id) {
            this.loadOrphanDetails(this.selectedOrphan.id);
          }

          this.snackBar.open('Sponsorship put on hold successfully', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
        },
        error: (error) => {
          console.error('Error putting sponsorship on hold:', error);
          this.snackBar.open('Error putting sponsorship on hold', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }

  // Reactivate sponsorship method
  reactivateSponsorship(sponsorship: any): void {
    if (confirm(`Are you sure you want to reactivate the sponsorship with ${sponsorship.donorName}?`)) {
      this.sponsorshipService.reactivateSponsorship(sponsorship.id).subscribe({
        next: (updatedSponsorship) => {
          // Update the sponsorship in the local array
          if (this.selectedOrphan && this.selectedOrphan.sponsorships) {
            const index = this.selectedOrphan.sponsorships.findIndex(s => s.id === sponsorship.id);
            const orphanId = this.selectedOrphan?.id;
            const orphanListIndex = this.filteredOrphans.findIndex(o => o.id === orphanId);
            if (index !== -1 && orphanListIndex !== -1) {
              // Update the status directly
              this.selectedOrphan.sponsorships[index].status = 'ACTIVE';
              this.filteredOrphans[orphanListIndex].isSponsored = true;
            }
          }

          // Refresh the orphan data completely to ensure all UI elements update
          if (this.selectedOrphan && this.selectedOrphan.id) {
            this.loadOrphanDetails(this.selectedOrphan.id);
          }

          this.snackBar.open('Sponsorship reactivated successfully', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
        },
        error: (error) => {
          console.error('Error reactivating sponsorship:', error);
          this.snackBar.open('Error reactivating sponsorship', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }

  // Load donors for selection
  loadDonors(): void {
    this.donorService.getDonors().subscribe({
      next: (donors: Donor[]) => {
        this.donors = donors;
      },
      error: (error: any) => {
        console.error('Error loading donors:', error);
        this.donors = [];
      }
    });
  }


  // Modal closing methods
  closeAddDonorModal(): void {
    this.isAddDonorModalVisible = false;
    this.donorForm.reset();
    this.sponsorshipForm.reset();
    this.isCreatingSponsorshipWithNewDonor = false;
  }

  closeSelectDonorModal(): void {
    this.isSelectDonorModalVisible = false;
    this.sponsorshipForm.reset();
    this.isCreatingSponsorshipWithExistingDonor = false;
  }

  // Create new donor and sponsorship
  createDonorWithSponsorship(): void {
    console.log(this.selectedOrphan)
    if (this.donorForm.valid && this.sponsorshipForm.valid) {
      this.isCreatingSponsorshipWithNewDonor = true;

      const donorData = this.donorForm.value;

      // First create the donor
      this.donorService.createDonor(donorData).subscribe({
        next: (createdDonor) => {
          // Then create the sponsorship
          const sponsorshipData = {
            ...this.sponsorshipForm.value,
            donorId: createdDonor.id,
            orphanId: this.selectedOrphan?.id
          };

          this.sponsorshipService.createSponsorship(sponsorshipData).subscribe({
            next: (sponsorship) => {
              this.isCreatingSponsorshipWithNewDonor = false;
              this.closeAddDonorModal();
              const orphanId = this.selectedOrphan?.id;
              // Reload sponsorships to show the new one
              this.loadSponsorships();
              const index = this.filteredOrphans.findIndex(o => o.id === orphanId);
              if (index !== -1) {
                if (this.selectedOrphan) {
                  this.filteredOrphans[index].isSponsored = true;
                }
              }
              this.snackBar.open('Donor and sponsorship created successfully!', 'Close', {
                duration: 3000,
                panelClass: ['success-snackbar']
              });
            },
            error: (error) => {
              this.isCreatingSponsorshipWithNewDonor = false;
              console.error('Error creating sponsorship:', error);

              let errorMessage = 'Failed to create sponsorship. Please try again.';
              if (error.error && error.error.message) {
                errorMessage = error.error.message;
              }

              this.snackBar.open(errorMessage, 'Close', {
                duration: 5000,
                panelClass: ['error-snackbar']
              });
            }
          });
        },
        error: (error) => {
          this.isCreatingSponsorshipWithNewDonor = false;
          console.error('Error creating donor:', error);

          let errorMessage = 'Failed to create donor. Please try again.';
          if (error.error && error.error.message) {
            errorMessage = error.error.message;
          }

          this.snackBar.open(errorMessage, 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }

  // Create sponsorship with existing donor
  createSponsorshipWithExistingDonor(): void {
    if (this.sponsorshipForm.valid && this.selectedOrphan) {
      this.isCreatingSponsorshipWithExistingDonor = true;

      const sponsorshipData = {
        ...this.sponsorshipForm.value,
        orphanId: this.selectedOrphan.id
      };

      this.sponsorshipService.createSponsorship(sponsorshipData).subscribe({
        next: (sponsorship) => {
          console.log(this.selectedOrphan)
          this.isCreatingSponsorshipWithExistingDonor = false;
          this.closeSelectDonorModal();
          const orphanId = this.selectedOrphan?.id;
          // Reload sponsorships to show the new one
          this.loadSponsorships();
          const index = this.filteredOrphans.findIndex(o => o.id === orphanId);
          if (index !== -1) {
              this.filteredOrphans[index].isSponsored = true;
          }

          this.snackBar.open('Sponsorship created successfully!', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
        },
        error: (error) => {
          this.isCreatingSponsorshipWithExistingDonor = false;
          console.error('Error creating sponsorship:', error);

          let errorMessage = 'Failed to create sponsorship. Please try again.';
          if (error.error && error.error.message) {
            errorMessage = error.error.message;
          }

          this.snackBar.open(errorMessage, 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }

  // Document management methods
  onDocumentUploaded(document: OrphanDocument): void {
    this.showDocumentUpload = false;
    this.documentRefreshTrigger = {}; // Trigger refresh of document list

    this.snackBar.open('Document uploaded successfully!', 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  onDocumentDeleted(documentId: number): void {
    this.documentRefreshTrigger = {}; // Trigger refresh of document list
    // No need for a snackbar message here as it's already shown in the document-upload component
  }

  // Gift edit and delete functionality
  editOrphanGift(gift: Gift): void {
    console.log('Editing gift:', gift);
    // No need to find sponsorship - gifts can exist without sponsorships now
    // Just proceed with editing the gift directly

    // Format date for input field
    let formattedDate = '';
    if (gift.giftDate) {
      const date = new Date(gift.giftDate);
      formattedDate = date.toISOString().split('T')[0];
    }

    // Make sure we have the active section set to gifts
    this.activeSection = 'gifts';

    // Ensure we have gift types loaded
    if (!this.giftTypes || this.giftTypes.length === 0) {
      this.loadGiftTypes();
    }

    // Populate the gift form with existing data
    this.giftForm.reset(); // Clear previous values first
    this.giftForm.patchValue({
      giftName: gift.giftName || '',
      giftTypeId: typeof gift.giftType === 'number' ? gift.giftType : 1,
      giftValue: gift.amount || 0,
      giftDate: formattedDate,
      description: gift.description || ''
    });

    console.log('Form values after patch:', this.giftForm.value);

    // Set edit mode
    this.isEditingGift = true;
    this.editingGiftId = gift.id || null;
  }

  updateOrphanGift(): void {
    console.log('Updating gift with form values:', this.giftForm.value);
    console.log('Form valid?', this.giftForm.valid);
    console.log('Editing gift ID:', this.editingGiftId);

    if (this.giftForm.valid && this.editingGiftId) {
      this.isSubmittingGift = true;

      // Find the original gift to get required fields
      const originalGift = this.getAllGifts().find(g => g.id === this.editingGiftId);
      if (!originalGift) {
        this.snackBar.open('Cannot find original gift data', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
        this.isSubmittingGift = false;
        return;
      }

      console.log('Original gift found:', originalGift);

      // Use CreateGiftRequestV2 format for the V2 API
      const giftTypeId = this.giftForm.value.giftTypeId || (originalGift.giftType as number) || 1;
      const amount = this.giftForm.value.giftValue;

      // First check if the gift type has sufficient balance
      this.giftService.checkGiftTypeBalance(giftTypeId, amount).subscribe(
        (hasBalance: boolean) => {
          if (!hasBalance) {
            this.isSubmittingGift = false;
            this.snackBar.open(`Insufficient balance in selected gift type. Please choose a different gift type or amount.`, 'Close', {
              duration: 5000,
              panelClass: ['error-snackbar']
            });
            return;
          }

          const updateData: CreateGiftRequestV2 = {
            donorId: originalGift.donorId || 0,
            giftTypeId: giftTypeId,
            amount: amount,
            giftName: this.giftForm.value.giftName,
            date: this.giftForm.value.giftDate,
            description: this.giftForm.value.description,
            beneficiaryType: BeneficiaryType.ORPHAN,
            orphanId: originalGift.orphanId,
            // Make projectId and sponsorshipId optional to support non-sponsored gifts
            projectId: originalGift.projectId || undefined,
            sponsorshipId: originalGift.sponsorshipId || undefined
          };

          console.log('Update data being sent:', updateData);

          if (this.editingGiftId) {
            this.giftService.updateGiftV2(this.editingGiftId, updateData).subscribe({
              next: (response) => {
                console.log('Gift updated successfully:', response);
                this.isSubmittingGift = false;
                this.cancelEditOrphanGift();

                this.snackBar.open('Gift updated successfully!', 'Close', {
                  duration: 3000,
                  panelClass: ['success-snackbar']
                });

                // Reload sponsorships to refresh the gift list
                this.loadSponsorships();

                // Refresh gifts list if we're on the gifts tab
                if (this.activeSection === 'gifts' && this.selectedOrphan?.id) {
                  this.loadOrphanGiftsForDetail();
                }

                // Also refresh gifts in the gift history modal if it's open
                if (this.selectedOrphanForGift && this.isGiftHistoryModalVisible) {
                  this.loadOrphanGifts(this.selectedOrphanForGift.id!);
                }
              },
              error: (error) => {
                this.isSubmittingGift = false;
                console.error('Error updating gift:', error);

                let errorMessage = 'Failed to update gift. Please try again.';

                // Extract specific error message if available
                if (error.error && error.error.message) {
                  errorMessage = error.error.message;
                } else if (error.error && typeof error.error === 'string' && error.error.includes('Insufficient balance')) {
                  errorMessage = error.error;
                }

                this.snackBar.open(errorMessage, 'Close', {
                  duration: 5000,
                  panelClass: ['error-snackbar']
                });
              }
            });
          }
        },
        (error) => {
          this.isSubmittingGift = false;
          console.error('Error checking gift type balance:', error);
          this.snackBar.open('Error checking gift type balance. Please try again.', 'Close', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
        }
      );
    } else {
      console.warn('Form is invalid or no editing gift ID');
      if (!this.giftForm.valid) {
        // Show validation errors
        Object.keys(this.giftForm.controls).forEach(key => {
          const control = this.giftForm.get(key);
          if (control && control.errors) {
            console.log(`Validation error in ${key}:`, control.errors);
          }
        });
      }
    }
  }

  cancelEditOrphanGift(): void {
    this.isEditingGift = false;
    this.editingGiftId = null;
    this.giftForm.reset();
  }

  // Helper method to get gift type name from ID
  private getGiftTypeNameFromId(giftTypeId: number): string {
    if (!giftTypeId) return '';

    // Map based on common gift type IDs from the system
    const giftTypeMap: {[key: number]: string} = {
      1: 'Orphan Sponsorship Monthly',
      2: 'General Donation',
      3: 'Medical Fund',
      4: 'Emergency Fund',
      5: 'Food Fund',
      26: 'Education General Fund'
    };

    return giftTypeMap[giftTypeId] || `Gift Type ${giftTypeId}`;
  }

  // Use the direct API data instead of sponsorship nested data
  getDisplayGifts(): any[] {
    // Use orphanGifts from direct API call which has correct data structure
    return this.orphanGifts || [];
  }

  deleteOrphanGift(gift: Gift): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Gift',
        message: `Are you sure you want to delete this gift "${gift.giftName}"?`,
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && gift.id) {
        this.giftService.deleteGift(gift.id).subscribe({
          next: () => {
            this.snackBar.open('Gift deleted successfully!', 'Close', {
              duration: 3000,
              panelClass: ['success-snackbar']
            });

            // Reload sponsorships to refresh the gift list
            this.loadSponsorships();

            // Refresh gifts list if we're on the gifts tab
            if (this.activeSection === 'gifts' && this.selectedOrphan?.id) {
              this.loadOrphanGiftsForDetail();
            }

            // Also refresh gifts in the gift history modal if it's open
            if (this.selectedOrphanForGift && this.isGiftHistoryModalVisible) {
              this.loadOrphanGifts(this.selectedOrphanForGift.id!);
            }
          },
          error: (error) => {
            console.error('Error deleting gift:', error);
            this.snackBar.open('Failed to delete gift. Please try again.', 'Close', {
              duration: 5000,
              panelClass: ['error-snackbar']
            });
          }
        });
      }
    });
  }

}
