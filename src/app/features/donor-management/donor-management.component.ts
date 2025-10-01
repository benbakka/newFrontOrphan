import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { SponsorshipWithGifts } from '../../core/models/sponsorship.model';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Donor } from '../../core/models/donor.model';
import { DonorService } from '../../core/services/donor.service';
import { SponsorshipService } from '../../core/services/sponsorship.service';
import { Sponsorship, SponsorshipType } from '../../core/models/sponsorship.model';
import { Gift, CreateGiftRequestV2, BeneficiaryType } from '../../core/models/gift.model';
import { GiftService } from '../../core/services/gift.service';
import { OrphanService } from '../../core/services/orphan.service';
import { OrphanListDTO } from '../../core/models/orphan-list.dto';
import { DonationService } from '../../core/services/donation.service';
import {
  Donation,
  DonorBalance,
  DonorStatistics,
  CreateDonationRequest
} from '../../core/models/donation.model';
import { GiftTypeService } from '../../core/services/gift-type.service';
import { GiftType } from '../../core/models/gift-type.model';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CharityProject } from '../../shared/models/charity-project.model';
import { CharityProjectService } from '../../shared/services/charity-project.service';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatNativeDateModule, MAT_DATE_LOCALE, MAT_DATE_FORMATS, DateAdapter, NativeDateAdapter } from '@angular/material/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { DonorAdvancedSearchRequest, DonorAdvancedSearchFormData } from '../../core/models/donor-advanced-search.model';
import { EmailService } from '../../shared/services/email.service';

interface DonorDetailDTO {
  id: number;
  donorId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  addressTwo?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  company?: string;
  sponsorships?: any[];
  donations?: any[];
  statistics?: any;
}

interface HistoryItem {
  id: number;
  date: string;
  type: 'donation' | 'gift';
  description: string;
  amount: number;
  fundType?: string;
  status: string;
}

interface PeriodStats {
  totalDonations: number;
  totalGifts: number;
  highestDonation: number;
  averagePerMonth: number;
}

interface DonationInsights {
  frequency: string;
  topFund: string;
  growth: number;
  consistencyScore: number;
}

@Component({
  selector: 'app-donor-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatDatepickerModule, MatInputModule, MatFormFieldModule, MatNativeDateModule, MatDialogModule, MatSnackBarModule],
  templateUrl: './donor-management.component.html',
  styleUrls: ['./donor-management.component.scss'],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'en-US' },
    {
      provide: MAT_DATE_FORMATS,
      useValue: {
        parse: {
          dateInput: 'MM/DD/YYYY',
        },
        display: {
          dateInput: 'MM/DD/YYYY',
          monthYearLabel: 'MMM YYYY',
          dateA11yLabel: 'LL',
          monthYearA11yLabel: 'MMMM YYYY',
        },
      },
    }
  ]
})

export class DonorManagementComponent implements OnInit, AfterViewInit, OnDestroy {
  // Donor list properties
  donors: Donor[] = [];
  filteredDonors: Donor[] = [];
  searchTerm: string = '';
  isLoading: boolean = false;

  // UI state
  isEditing = false;
  isCreating = false;
  showDonorList = true;

  // Missing property declarations
  donorSponsorships: Sponsorship[] = [];
  donorGifts: Gift[] = [];
  donorDonations: Donation[] = [];
  donorSponsorshipGifts: any[] = [];
  donorBalance: number = 0;
  giftTypes: GiftType[] = [];
  availableProjects: CharityProject[] = [];
  availableOrphans: OrphanListDTO[] = [];
  beneficiaryType: BeneficiaryType = BeneficiaryType.CHARITY;
  giftLinkType: 'orphan' | 'project' | 'charity' = 'charity';
  giftSuccess: boolean = false;
  donationError: string | null = null;
  donationSuccess: boolean = false;
  customGiftType: string = '';
  customGiftTypeName: string = '';
  showCustomGiftTypeInput: boolean = false;
  selectedGiftType: GiftType | null = null;
  selectedGiftTypeId: number | null = null;
  selectedGiftTypeBalance: number | null = null;
  activeTab: string = 'sponsorships';

  // Upload modal properties
  selectedFile: File | null = null;
  uploadProgress: number = 0;
  uploadError: string | null = null;
  uploadSuccess: boolean = false;
  isUploading: boolean = false;
  dragOver: boolean = false;
  apiUrl: string = environment.apiUrl;

  // Email form properties
  emailForm: FormGroup;
  showEmailForm: boolean = false;
  emailError: string | null = null;
  emailSuccess: boolean = false;
  isEmailLoading: boolean = false;
  isYearlyEmailLoading: boolean = false;
  isMonthlyEmailLoading: boolean = false;
  selectedYear: number = new Date().getFullYear();
  selectedMonth: number = new Date().getMonth();
  availableYears: number[] = [];
  availableMonths = [
    { value: 0, name: 'January' },
    { value: 1, name: 'February' },
    { value: 2, name: 'March' },
    { value: 3, name: 'April' },
    { value: 4, name: 'May' },
    { value: 5, name: 'June' },
    { value: 6, name: 'July' },
    { value: 7, name: 'August' },
    { value: 8, name: 'September' },
    { value: 9, name: 'October' },
    { value: 10, name: 'November' },
    { value: 11, name: 'December' }
  ];
  noDonationsMessage: string = '';

  // Advanced search properties
  isAdvancedSearchModalVisible = false;
  advancedSearchForm: FormGroup;
  isAdvancedSearching = false;
  isAdvancedSearchApplied = false;

  // Form state variables
  isFormVisible = false;
  isEditMode = false;
  editingDonorId: number | null = null;
  selectedDonor: Donor | null = null;
  selectedDonorDetail: DonorDetailDTO | null = null;
  isLoadingDonorDetail = false;

  // Donation edit tracking
  editingDonationId: number | null = null;
  isDonationEditMode = false;

  // Form visibility flags
  showDonorForm = false;
  showGiftForm = false;
  showDonationForm = false;
  showUploadModal = false;
  isUploadModalVisible: boolean = false;
  isGiftFormVisible: boolean = false;
  isDonationFormVisible: boolean = false;

  // Form groups
  donorForm: FormGroup;
  giftForm: FormGroup;
  donationForm: FormGroup;
  formattedGiftTypeAmounts: Map<number, string> = new Map();

  // Form submission states
  isSubmittingDonor = false;
  isSubmittingGift = false;
  isSubmittingDonation = false;

  // Form feedback messages
  donorError: string | null = null;
  donorSuccess: boolean = false;
  giftError: string | null = null;

  // Email functionality
  isEmailFormVisible = false;
  emailStartDate: string = '';
  emailEndDate: string = '';
  isPreviewingEmail = false;
  isSendingEmail = false;
  noDonationsFound = false;

  // History and Analytics Properties
  historyViewMode: 'chart' | 'table' = 'chart';
  selectedPeriod: '6months' | '1year' | 'custom' = '6months';
  customStartDate: string = '';
  customEndDate: string = '';
  historyData: HistoryItem[] = [];
  filteredHistoryData: HistoryItem[] = [];
  historySearchTerm: string = '';
  historySortBy: 'date' | 'amount' | 'type' = 'date';
  sortOrder: 'asc' | 'desc' = 'desc';

  // Statistics
  periodStats: PeriodStats = {
    totalDonations: 0,
    totalGifts: 0,
    highestDonation: 0,
    averagePerMonth: 0
  };

  donationInsights: DonationInsights = {
    frequency: 'N/A',
    topFund: 'N/A',
    growth: 0,
    consistencyScore: 0
  };

  // Donor statistics from backend
  donorStatistics: any = {
    totalOrphansSponsored: 0,
    totalGiftsGiven: 0,
    totalSponsorshipDuration: 0,
    currentDonationBalance: 0,
    totalDonations: 0,
    totalGifts: 0
  };


  // ViewChild for file input
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor(
    private route: ActivatedRoute,
    private donorService: DonorService,
    private giftService: GiftService,
    private sponsorshipService: SponsorshipService,
    private donationService: DonationService,
    private giftTypeService: GiftTypeService,
    private charityProjectService: CharityProjectService,
    private orphanService: OrphanService,
    private http: HttpClient,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router,
    private emailService: EmailService
  ) {
    this.donorForm = this.fb.group({
      donorId: [''],
      firstName: [''],
      lastName: [''],
      email: ['', [Validators.email]],
      phone: [''],
      address: [''],
      addressTwo: [''],
      city: [''],
      state: [''],
      zip: [''],
      country: [''],
      company: ['']
    });

    this.giftForm = this.fb.group({
      giftTypeId: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      date: [new Date().toISOString().split('T')[0], Validators.required],
      description: [''],
      beneficiaryType: ['charity', Validators.required],
      orphanId: [''],
      projectId: [''],
      customGiftTypeName: [''] // For custom gift type
    });

    this.donationForm = this.fb.group({
      amount: ['', [Validators.required, Validators.min(0.01)]],
      donationDate: [new Date().toISOString().split('T')[0], Validators.required],
      description: [''],
      giftTypeId: [''],
      paymentMethod: [''],
      referenceNumber: [{value: '', disabled: true}], // Disabled as it's auto-generated
      customGiftTypeName: ['']
    });

    this.advancedSearchForm = this.createAdvancedSearchForm();

    // Initialize email form with Date objects for Material datepicker
    this.emailForm = this.fb.group({
      startDate: [new Date(new Date().getFullYear(), 0, 1), Validators.required],
      endDate: [new Date(), Validators.required]
    });

    // Initialize available years for email reports
    this.initializeAvailableYears();
  }

  ngOnInit(): void {
    this.initializeForms();
    this.loadDonors();
    this.loadGiftTypes();
    this.loadProjects();
    this.loadOrphans();
    this.initializeDateRanges();

    // Clear any hardcoded data
    this.historyData = [];
    this.filteredHistoryData = [];
  }

  ngAfterViewInit(): void {
    // Component initialization after view is ready
  }

  ngOnDestroy(): void {
    // Component cleanup
  }

  loadDonorDetails(donorId: number): void {
    this.isLoadingDonorDetail = true;

    // Reset data before loading new donor
    this.resetDonorData();
    this.loadAmountPerDonor(donorId)
    this.donorService.getDonorDetails(donorId).subscribe({
      next: (donorDetail) => {
        this.selectedDonor = donorDetail;
        this.selectedDonorDetail = donorDetail;

        // Load donor statistics if available
        if (donorDetail.statistics) {
          this.donorStatistics = donorDetail.statistics;
        }

        this.loadDonorSponsorships(donorId);
        this.loadDonorGifts(donorId);
        this.loadDonorDonations(donorId);
        this.isLoadingDonorDetail = false;
      },
      error: (error: any) => {
        console.error('Error loading donor details:', error);
        this.isLoadingDonorDetail = false;

        // Fallback to basic donor info if detailed info fails
        this.donorService.getDonorById(donorId).subscribe({
          next: (donor) => {
            this.selectedDonor = donor;
            // Convert Donor to DonorDetailDTO format
            this.selectedDonorDetail = {
              id: donor.id as number,
              donorId: donor.donorId || '',
              firstName: donor.firstName,
              lastName: donor.lastName,
              email: donor.email,
              phone: donor.phone,
              address: donor.address,
              addressTwo: donor.addressTwo,
              city: donor.city,
              state: donor.state,
              zip: donor.zip,
              country: donor.country,
              company: donor.company,
              // Initialize empty arrays for these properties
              sponsorships: [],
              donations: [],
              statistics: { totalOrphansSponsored: 0, totalGiftsGiven: 0, totalSponsorshipDuration: 0, currentDonationBalance: 0, totalDonations: 0, totalGifts: 0 }
            };
          },
          error: (err) => console.error('Error loading basic donor info:', err)
        });
      }
    });
  }

  loadDonorSponsorships(donorId: number): void {
    this.sponsorshipService.getSponsorshipsByDonorId(donorId).subscribe({
      next: (sponsorships: Sponsorship[]) => {
        this.donorSponsorships = sponsorships;
      },
      error: (error: any) => {
        console.error('Error loading sponsorships:', error);
      }
    });
  }

  loadDonorGifts(donorId: number): void {
    this.giftService.getGiftsByDonor(donorId).subscribe({
      next: (gifts: Gift[]) => {
        this.donorGifts = gifts;
        // Update statistics
        this.donorStatistics.totalGifts = gifts.reduce((sum, gift) => sum + gift.amount, 0);
        this.donorStatistics.totalGiftsGiven = gifts.length;
      },
      error: (error: any) => {
        console.error('Error loading gifts:', error);
      }
    });
  }

  loadDonorDonations(donorId: number): void {
    this.donationService.getDonationsByDonorId(donorId).subscribe({
      next: (donations: Donation[]) => {
        this.donorDonations = donations;
        // Update statistics
        this.donorStatistics.totalDonations = donations.reduce((sum, donation) => sum + donation.amount, 0);
        this.calculateDonorBalance();
        // Load history data for analytics
        this.updateHistoryData();
      },
      error: (error: any) => {
        console.error('Error loading donations:', error);
      }
    });
  }

  calculateDonorBalance(): void {
    // Calculate total donations minus total gifts
    const totalDonations = this.donorDonations.reduce((sum, donation) => sum + donation.amount, 0);
    const totalGifts = this.donorGifts.reduce((sum, gift) => sum + gift.amount, 0);
    this.donorBalance = totalDonations - totalGifts;

    // Update donor statistics
    this.donorStatistics.currentDonationBalance = this.donorBalance;
    this.donorStatistics.totalDonations = totalDonations;
    this.donorStatistics.totalGifts = totalGifts;
  }

  loadDonors(): void {
    this.isLoading = true;
    this.donorService.getDonors().subscribe({
      next: (donors) => {
        this.donors = donors;
        this.filteredDonors = donors;
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading donors:', error);
        this.isLoading = false;
      }
    });
  }

  loadGiftTypes(): void {
    this.giftTypeService.getAllGiftTypesWithBalances().subscribe({
      next: (giftTypes) => {
        this.giftTypes = giftTypes;
      },
      error: (error: any) => {
        console.error('Error loading gift types:', error);
      }
    });
  }

  loadProjects(): void {
    console.log('Loading projects...');
    // Try to get all projects first since active projects endpoint might not exist
    this.charityProjectService.getCharityProjects(0, 1000).subscribe({
      next: (response) => {
        this.availableProjects = response.content || [];
        console.log('Loaded projects from paginated endpoint:', this.availableProjects);
      },
      error: (error: any) => {
        console.error('Error loading projects from paginated endpoint:', error);
        // Fallback to active projects
        this.charityProjectService.getActiveProjects().subscribe({
          next: (projects: CharityProject[]) => {
            this.availableProjects = projects;
            console.log('Loaded active projects as fallback:', projects);
          },
          error: (fallbackError: any) => {
            console.error('Error loading active projects (fallback):', fallbackError);
            // Final fallback to custom getProjects method
            this.charityProjectService.getProjects(1000).subscribe({
              next: (response) => {
                this.availableProjects = response.content || response || [];
                console.log('Loaded projects from custom endpoint:', this.availableProjects);
              },
              error: (finalError: any) => {
                console.error('All project loading methods failed:', finalError);
                this.availableProjects = [];
              }
            });
          }
        });
      }
    });
  }

  loadOrphans(): void {
    this.orphanService.getAllOrphans().subscribe({
      next: (orphans: OrphanListDTO[]) => {
        this.availableOrphans = orphans;
      },
      error: (error: any) => {
        console.error('Error loading orphans:', error);
      }
    });
  }

  onBeneficiaryTypeChange(type: 'orphan' | 'project' | 'charity'): void {
    this.beneficiaryType = type === 'orphan' ? BeneficiaryType.ORPHAN :
                          type === 'project' ? BeneficiaryType.PROJECT :
                          BeneficiaryType.CHARITY;
    this.giftLinkType = type; // Keep giftLinkType in sync with beneficiaryType
    this.updateGiftFormValidators();

    // Load projects when charity project is selected and ensure they're available
    if (type === 'project') {
      console.log('Project beneficiary selected, checking available projects:', this.availableProjects.length);
      if (this.availableProjects.length === 0) {
        console.log('No projects loaded, reloading...');
        this.loadProjects();
      }
    }
  }

  // Added to match template references
  onGiftLinkTypeChange(type: 'orphan' | 'project' | 'charity'): void {
    this.giftLinkType = type;
    this.beneficiaryType = type === 'orphan' ? BeneficiaryType.ORPHAN :
                          type === 'project' ? BeneficiaryType.PROJECT :
                          BeneficiaryType.CHARITY; // Keep beneficiaryType in sync with giftLinkType
    this.updateGiftFormValidators();
  }

  updateGiftFormValidators(): void {
    // Reset form controls
    this.giftForm.get('orphanId')?.clearValidators();
    this.giftForm.get('projectId')?.clearValidators();

    // Apply validators based on beneficiary type
    if (this.beneficiaryType === BeneficiaryType.ORPHAN) {
      this.giftForm.get('orphanId')?.setValidators([Validators.required]);
    } else if (this.beneficiaryType === BeneficiaryType.PROJECT) {
      this.giftForm.get('projectId')?.setValidators([Validators.required]);
    }
    // No additional validators needed for 'charity' type

    // Update form control status
    this.giftForm.get('orphanId')?.updateValueAndValidity();
    this.giftForm.get('projectId')?.updateValueAndValidity();
  }

  processGiftSubmission(giftTypeId: number): void {
    const formValues = this.giftForm.value;

    // Check balance before creating gift
    this.giftService.checkGiftTypeBalance(giftTypeId, +formValues.amount).subscribe({
      next: (hasSufficientBalance) => {
        if (!hasSufficientBalance) {
          this.giftError = 'There is not enough balance for this type of gift';
          return;
        }

        const giftRequest: CreateGiftRequestV2 = {
          donorId: this.selectedDonor?.id!,
          giftTypeId: giftTypeId,
          amount: +formValues.amount,
          giftName: formValues.description || 'Gift', // Use description as gift name or default to 'Gift'
          date: formValues.date,
          description: formValues.description || undefined,
          beneficiaryType: this.beneficiaryType as 'orphan' | 'project' | 'charity'
        };

        // Add beneficiary-specific fields
        if (this.beneficiaryType === BeneficiaryType.ORPHAN && formValues.orphanId) {
          giftRequest.orphanId = +formValues.orphanId;
        } else if (this.beneficiaryType === BeneficiaryType.PROJECT && formValues.projectId) {
          giftRequest.projectId = +formValues.projectId;
        }

        this.isSubmittingGift = true;
        this.giftService.createGiftV2(giftRequest).subscribe({
          next: (response) => {
            this.giftSuccess = true;
            this.isSubmittingGift = false;
            this.resetGiftForm();
            this.loadDonorGifts(this.selectedDonor?.id as number);
            this.loadGiftTypes(); // Reload gift types to update balances
            this.calculateDonorBalance();
          },
          error: (error: any) => {
            this.giftError = 'Error adding gift: ' + (error.error?.message || error.message || 'Unknown error');
            this.isSubmittingGift = false;
          }
        });
      },
      error: (error: any) => {
        this.giftError = 'Error checking balance: ' + (error.error?.message || error.message || 'Unknown error');
      }
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  getSponsorshipTypeName(type: SponsorshipType): string {
    return type === SponsorshipType.MONTHLY ? 'Monthly' : 'Yearly';
  }

  toggleGiftForm(): void {
    this.isGiftFormVisible = !this.isGiftFormVisible;
    this.showGiftForm = this.isGiftFormVisible;
    if (!this.isGiftFormVisible) {
      this.resetGiftForm();
    } else {
      // Default to charity beneficiary type when opening the form
      this.beneficiaryType = BeneficiaryType.CHARITY;
      this.giftLinkType = 'charity'; // Keep giftLinkType in sync
      this.updateGiftFormValidators();
    }
  }

  toggleDonationForm(): void {
    this.isDonationFormVisible = !this.isDonationFormVisible;
    this.showDonationForm = this.isDonationFormVisible;
    if (!this.isDonationFormVisible) {
      this.resetDonationForm();
    }
  }

  resetDonationForm(): void {
    // Reset all fields except referenceNumber which is handled separately
    this.donationForm.reset({
      amount: '',
      donationDate: new Date().toISOString().split('T')[0],
      description: '',
      giftTypeId: this.giftTypes && this.giftTypes.length > 0 ? this.giftTypes[0].id : '',
      customGiftTypeName: '',
      paymentMethod: '',
      referenceNumber: ''
    });
    this.isDonationFormVisible = false;
    this.donationError = null;
    this.donationSuccess = false;

    // Reset edit mode tracking
    this.isDonationEditMode = false;
    this.editingDonationId = null;
  }

  onDonationGiftTypeChange(): void {
    const giftTypeId = this.donationForm.get('giftTypeId')?.value;

    if (giftTypeId === 'custom') {
      this.donationForm.get('customGiftTypeName')?.setValidators([Validators.required]);
    } else {
      this.donationForm.get('customGiftTypeName')?.clearValidators();
      this.donationForm.get('customGiftTypeName')?.reset();
    }

    this.donationForm.get('customGiftTypeName')?.updateValueAndValidity();
  }

  // Format date as MM/DD/YYYY
  formatDateMMDDYYYY(date: Date): string {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  }

  // Parse MM/DD/YYYY to ISO format
  parseMMDDYYYYToISO(dateStr: string): string {
    if (!dateStr) return '';
    const [month, day, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
  }

  resetGiftForm(): void {
    const today = new Date();
    this.giftForm.reset({
      date: today.toISOString().split('T')[0],
      beneficiaryType: BeneficiaryType.CHARITY
    });
    this.giftError = null;
    this.giftSuccess = false;
    this.customGiftType = '';
    this.beneficiaryType = BeneficiaryType.CHARITY;
    this.giftLinkType = 'charity'; // Keep giftLinkType in sync
    this.updateGiftFormValidators();
  }

  submitGift(): void {
    if (this.giftForm.invalid) {
      this.giftForm.markAllAsTouched();
      return;
    }

    this.giftError = null;
    this.giftSuccess = false;

    const formValues = this.giftForm.value;

    // Handle custom gift type if selected
    let giftTypeId = formValues.giftTypeId;
    if (giftTypeId === 'custom' && formValues.customGiftTypeName) {
      // Create a new gift type
      const newGiftTypeRequest = {
        name: formValues.customGiftTypeName,
        description: 'Custom gift type created by user'
      };

      this.giftTypeService.createGiftType(newGiftTypeRequest).subscribe({
        next: (createdType: GiftType) => {
          this.giftTypes.push(createdType);
          this.processGiftSubmission(createdType.id);
        },
        error: (error: any) => {
          this.giftError = 'Error creating custom gift type: ' + (error.error?.message || error.message || 'Unknown error');
        }
      });
    } else {
      // Use existing gift type
      this.processGiftSubmission(+giftTypeId);
    }
  }

  submitDonation(): void {
    if (this.donationForm.invalid) {
      this.donationForm.markAllAsTouched();
      return;
    }

    this.donationError = null;
    this.donationSuccess = false;
    this.isSubmittingDonation = true;

    // Get values from form including disabled controls
    const formValues = this.donationForm.getRawValue();
    // Ensure donorId is not undefined
    if (!this.selectedDonor?.id) {
      this.donationError = 'No donor selected';
      this.isSubmittingDonation = false;
      return;
    }

    const donationRequest: CreateDonationRequest = {
      donorId: this.selectedDonor.id,
      amount: +formValues.amount,
      donationDate: formValues.donationDate,
      description: formValues.description || undefined,
      paymentMethod: formValues.paymentMethod || undefined,
      // Reference number will be auto-generated by backend if empty
      referenceNumber: undefined
    };

    // Handle gift type selection - ensure at least one is provided
    if (formValues.giftTypeId === 'custom' && formValues.customGiftTypeName) {
      donationRequest.giftTypeName = formValues.customGiftTypeName;
    } else if (formValues.giftTypeId && formValues.giftTypeId !== 'custom') {
      donationRequest.giftTypeId = +formValues.giftTypeId;
    } else {
      // Default to first available gift type if none selected
      if (this.giftTypes && this.giftTypes.length > 0) {
        donationRequest.giftTypeId = this.giftTypes[0].id;
      } else {
        donationRequest.giftTypeName = 'General Donation';
      }
    }

    // Check if we're editing or creating
    if (this.isDonationEditMode && this.editingDonationId) {
      // Update existing donation
      this.donationService.updateDonation(this.editingDonationId, donationRequest).subscribe({
        next: (response) => {
          this.donationSuccess = true;
          this.isSubmittingDonation = false;
          this.resetDonationForm();
          this.loadDonorDonations(this.selectedDonor?.id as number);
          this.loadGiftTypes(); // Reload gift types to update balances
          this.calculateDonorBalance();
        },
        error: (error: any) => {
          this.donationError = 'Error updating donation: ' + (error.error?.message || error.message || 'Unknown error');
          this.isSubmittingDonation = false;
        }
      });
    } else {
      // Create new donation
      this.donationService.createDonation(donationRequest).subscribe({
        next: (response) => {
          this.donationSuccess = true;
          this.isSubmittingDonation = false;
          this.resetDonationForm();
          this.loadDonorDonations(this.selectedDonor?.id as number);
          this.loadGiftTypes(); // Reload gift types to update balances
          this.calculateDonorBalance();
          this.loadAmountPerDonor(this.selectedDonor?.id as number);
        },
        error: (error: any) => {
          this.donationError = 'Error adding donation: ' + (error.error?.message || error.message || 'Unknown error');
          this.isSubmittingDonation = false;
        }
      });
    }
  }

  filterDonors(searchTerm?: string): void {
    // If searchTerm is provided as a parameter, use it, otherwise use the class property
    const term = searchTerm !== undefined ? searchTerm : this.searchTerm;

    if (!term || !term.trim()) {
      this.filteredDonors = [...this.donors];
      return;
    }

    const searchTermLower = term.toLowerCase().trim();
    this.filteredDonors = this.donors.filter(donor =>
      (donor.firstName && donor.firstName.toLowerCase().includes(searchTermLower)) ||
      (donor.lastName && donor.lastName.toLowerCase().includes(searchTermLower)) ||
      (donor.email && donor.email.toLowerCase().includes(searchTermLower)) ||
      (donor.phone && donor.phone.toLowerCase().includes(searchTermLower)) ||
      (donor.city && donor.city.toLowerCase().includes(searchTermLower)) ||
      (donor.country && donor.country.toLowerCase().includes(searchTermLower)) ||
      (donor.donorId && donor.donorId.toLowerCase().includes(searchTermLower))
    );
  }

  selectDonor(donor: Donor): void {
    if (donor.id !== undefined) {
      // Reset any previous donor details before loading new ones
      this.selectedDonorDetail = null;
      this.donorSponsorships = [];
      this.donorGifts = [];
      this.donorDonations = [];
      this.donorSponsorshipGifts = [];
      this.donorBalance = 0;

      // Load the donor details
      this.loadDonorDetails(donor.id);
    }
  }

  trackByDonorId(index: number, donor: Donor): number {
    return donor.id ?? -1; // Return -1 if id is undefined
  }

  openForm(): void {
    this.isFormVisible = true;
    this.isEditMode = false;
    this.editingDonorId = null;
    this.donorForm.reset();
    this.donorError = null;
    this.donorSuccess = false;
    this.isSubmittingDonor = false;
  }

  closeForm(): void {
    this.isFormVisible = false;
    this.donorForm.reset();
    this.donorError = null;
    this.donorSuccess = false;
    this.isEditMode = false;
    this.editingDonorId = null;
  }

  editDonor(donor: Donor): void {
    this.isEditMode = true;
    this.editingDonorId = donor.id ?? null;
    this.isFormVisible = true;
    this.donorForm.patchValue({
      donorId: donor.donorId || '',
      firstName: donor.firstName,
      lastName: donor.lastName,
      email: donor.email,
      phone: donor.phone,
      address: donor.address,
      addressTwo: donor.addressTwo,
      city: donor.city,
      state: donor.state,
      zip: donor.zip,
      country: donor.country,
      company: donor.company
    });
  }

  deleteDonor(donorId: number): void {
    const donor = this.donors.find(d => d.id === donorId);
    if (!donor) return;

    if (confirm(`Are you sure you want to delete ${donor.firstName} ${donor.lastName}?`)) {
      this.donorService.deleteDonor(donorId).subscribe({
        next: () => {
          this.donors = this.donors.filter(d => d.id !== donor.id);
          this.filteredDonors = this.filteredDonors.filter(d => d.id !== donor.id);
          if (this.selectedDonor?.id === donor.id) {
            this.selectedDonor = null;
          }
        },
        error: (error: any) => {
          console.error('Error deleting donor:', error);
        }
      });
    }
  }

  deleteAllDonors(): void {
    if (this.donors.length === 0) {
      return;
    }

    const confirmMessage = `Are you sure you want to delete ALL ${this.donors.length} donors? This action cannot be undone.`;

    if (confirm(confirmMessage)) {
      this.isLoading = true;

      // Call backend service to delete all donors
      this.donorService.deleteAllDonors().subscribe({
        next: () => {
          this.donors = [];
          this.filteredDonors = [];
          this.selectedDonor = null;
          this.selectedDonorDetail = null;
          this.isLoading = false;

          // Show success message
          alert('All donors have been deleted successfully.');
        },
        error: (error: any) => {
          console.error('Error deleting all donors:', error);
          this.isLoading = false;

          // Show error message
          alert('Error deleting donors: ' + (error.error?.message || error.message || 'Unknown error'));
        }
      });
    }
  }

  onSubmit(): void {
    if (this.donorForm.invalid) {
      this.donorForm.markAllAsTouched();
      return;
    }

    // Reset any previous error/success messages
    this.donorError = null;
    this.donorSuccess = false;
    this.isSubmittingDonor = true;
    const donorData = this.donorForm.value;

    if (this.isEditMode) {
      this.donorService.updateDonor(this.editingDonorId!, donorData).subscribe({
        next: (updatedDonor) => {
          const index = this.donors.findIndex(d => d.id === updatedDonor.id);
          if (index !== -1) {
            this.donors[index] = updatedDonor;
            this.filteredDonors = [...this.donors];
            if (this.selectedDonor?.id === updatedDonor.id) {
              this.selectedDonor = updatedDonor;
            }
          }
          this.isSubmittingDonor = false;
          this.donorSuccess = true;
          setTimeout(() => {
            this.donorSuccess = false;
            this.closeForm();
          }, 1500);
        },
        error: (error: any) => {
          console.error('Error updating donor:', error);
          this.isSubmittingDonor = false;
          this.donorError = error.error?.message || 'Failed to update donor. Please try again.';
          setTimeout(() => this.donorError = null, 5000);
        }
      });
    } else {
      this.donorService.createDonor(donorData).subscribe({
        next: (newDonor) => {
          this.donors.push(newDonor);
          this.filteredDonors = [...this.donors];
          this.isSubmittingDonor = false;
          this.donorSuccess = true;
          setTimeout(() => {
            this.donorSuccess = false;
            this.closeForm();
          }, 1500);
        },
        error: (error: any) => {
          console.error('Error creating donor:', error);
          this.isSubmittingDonor = false;
          this.donorError = error.error?.message || 'Failed to create donor. Please try again.';
          setTimeout(() => this.donorError = null, 5000);
        }
      });
    }
  }

  openUploadModal(): void {
    this.isUploadModalVisible = true;
    this.selectedFile = null;
    this.uploadProgress = 0;
    this.uploadError = null;
    this.uploadSuccess = false;
  }

  closeUploadModal(): void {
    this.isUploadModalVisible = false;
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
      this.selectedFile = files[0];
    }
  }

  onFileSelected(event: Event): void {
    const element = event.target as HTMLInputElement;
    if (element.files && element.files.length > 0) {
      this.selectedFile = element.files[0];
    }
  }

  removeFile(): void {
    this.selectedFile = null;
  }

  uploadFile(): void {
    if (!this.selectedFile) {
      this.uploadError = 'Please select a file to upload';
      return;
    }

    this.isUploading = true;
    this.uploadProgress = 0;
    this.uploadError = null;

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    // Use HttpClient directly for file upload since uploadDonorsExcel doesn't exist
    this.http.post<any>(`${this.apiUrl}/api/donors/upload`, formData, {
      reportProgress: true,
      observe: 'events'
    }).subscribe({
      next: (event: any) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.uploadProgress = Math.round(100 * event.loaded / event.total);
        } else if (event.type === HttpEventType.Response) {
          this.uploadSuccess = true;
          this.isUploading = false;
          this.loadDonors(); // Reload donors after successful upload
          setTimeout(() => this.closeUploadModal(), 2000);
        }
      },
      error: (error: any) => {
          this.uploadError = 'Error uploading file: ' + (error.error?.message || error.message || 'Unknown error');
          this.isUploading = false;
        }
      });
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  }

  getSponsorshipStatus(sponsorship: Sponsorship): string {
    const now = new Date();
    const endDate = sponsorship.endDate ? new Date(sponsorship.endDate) : null;

    if (!endDate) {
      return 'Active';
    }

    if (endDate < now) {
      return 'Expired';
    }

    // If end date is within 30 days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    if (endDate <= thirtyDaysFromNow) {
      return 'Expiring Soon';
    }

    return 'Active';
  }

  isActiveSponsorship(sponsorship: Sponsorship): boolean {
    if (!sponsorship.endDate) {
      return true;
    }

    const now = new Date();
    const endDate = new Date(sponsorship.endDate);

    return endDate >= now;
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  // Gift form methods
  submitGiftForm(): void {
    if (this.giftForm.valid && this.selectedDonor?.id) {
      this.submitGift();
    }
  }

  onGiftTypeChange(): void {
    const giftTypeId = this.giftForm.get('giftTypeId')?.value;
    if (giftTypeId === 'new' || giftTypeId === 'custom') {
      this.showCustomGiftTypeInput = true;
      this.selectedGiftTypeId = null;
      this.selectedGiftTypeBalance = null;
      this.selectedGiftType = null;
    } else if (giftTypeId) {
      this.showCustomGiftTypeInput = false;
      const selectedType = this.giftTypes.find(type => type.id === giftTypeId);
      this.selectedGiftType = selectedType || null;
      this.selectedGiftTypeId = parseInt(giftTypeId);
      this.selectedGiftTypeBalance = selectedType?.balance || null;
    }
  }

  onCustomGiftTypeNameChange(value: string): void {
    this.customGiftTypeName = value;
  }

  editGift(gift: Gift): void {
    // Populate gift form with existing gift data
    this.giftForm.patchValue({
      giftType: gift.giftType,
      amount: gift.amount,
      date: gift.giftDate,
      description: gift.description
    });
    this.isGiftFormVisible = true;
  }

  deleteGift(gift: Gift): void {
    if (confirm('Are you sure you want to delete this gift?')) {
      if (gift.id) {
        this.giftService.deleteGift(gift.id).subscribe({
          next: () => {
            this.loadDonorGifts(this.selectedDonor!.id!);
            this.giftSuccess = true;
            setTimeout(() => this.giftSuccess = false, 3000);
          },
          error: (error) => {
            console.error('Error deleting gift:', error);
            this.giftError = 'Failed to delete gift';
            setTimeout(() => this.giftError = null, 5000);
          }
        });
      }
    }
  }

  // Donation form methods
  submitDonationForm(): void {
    if (this.donationForm.valid && this.selectedDonor?.id) {
      this.submitDonation();
    }
  }

  editDonation(donation: Donation): void {
    // Set edit mode and track the donation being edited
    this.isDonationEditMode = true;
    this.editingDonationId = donation.id || null;

    // Populate donation form with existing donation data
    this.donationForm.patchValue({
      amount: donation.amount,
      donationDate: donation.donationDate,
      description: donation.description,
      paymentMethod: donation.paymentMethod || '',
      giftTypeId: donation.giftTypeId || (this.giftTypes && this.giftTypes.length > 0 ? this.giftTypes[0].id : ''),
      referenceNumber: donation.referenceNumber || ''
    });

    this.isDonationFormVisible = true;
  }

  deleteDonation(donation: Donation): void {
    if (confirm('Are you sure you want to delete this donation?')) {
      if (donation.id) {
        this.donationService.deleteDonation(donation.id).subscribe({
          next: () => {
            this.loadDonorDonations(this.selectedDonor!.id!);
            this.donationSuccess = true;
            setTimeout(() => this.donationSuccess = false, 3000);
          },
          error: (error) => {
            console.error('Error deleting donation:', error);
            this.donationError = 'Failed to delete donation';
            setTimeout(() => this.donationError = null, 5000);
          }
        });
      }
    }
  }

  // Create advanced search form
  createAdvancedSearchForm(): FormGroup {
    return this.fb.group({
      // Personal Info
      firstName: [''],
      lastName: [''],
      email: [''],
      phone: [''],
      city: [''],
      country: [''],

      // Donation Info
      hasDonations: [''],
      donationAmountFrom: [null],
      donationAmountTo: [null],
      donationDateFrom: [''],
      donationDateTo: [''],

      // Sponsorship Info
      hasActiveSponsorships: [''],
      sponsorshipType: [''],

      // Other Info
      registrationDateFrom: [''],
      registrationDateTo: [''],
      donorId: ['']
    });
  }

  openAdvancedSearchModal(): void {
    this.isAdvancedSearchModalVisible = true;
  }

  closeAdvancedSearchModal(shouldClearFilters: boolean = false): void {
    this.isAdvancedSearchModalVisible = false;

    // If we're canceling and shouldClearFilters is true, clear the filters
    if (shouldClearFilters) {
      this.clearAdvancedSearch();
    }
  }

  resetAdvancedSearch(): void {
    this.advancedSearchForm.reset();
  }

  applyAdvancedSearch(): void {
    if (this.advancedSearchForm.invalid) {
      return;
    }

    this.isAdvancedSearching = true;
    const searchRequest = this.convertFormDataToSearchRequest(this.advancedSearchForm.value);

    this.donorService.advancedSearchDonors(searchRequest).subscribe({
      next: (donors) => {
        if (donors.length === 0) {
          // Show no results message
          this.showMessage('No donors found matching your search criteria', 'info');
        } else {
          this.showMessage(`Found ${donors.length} donors matching your criteria`, 'success');
        }

        this.donors = donors;
        this.filteredDonors = donors;
        this.isAdvancedSearching = false;
        this.isAdvancedSearchApplied = true;
        this.closeAdvancedSearchModal();
      },
      error: (error) => {
        console.error('Error performing advanced search:', error);
        this.isAdvancedSearching = false;
        this.showMessage('An error occurred while searching. Using client-side filtering instead.', 'warning');
      }
    });
  }

  // Helper method to show messages to the user
  private showMessage(message: string, type: 'success' | 'error' | 'info' | 'warning'): void {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }


  convertFormDataToSearchRequest(formData: DonorAdvancedSearchFormData): DonorAdvancedSearchRequest {
    const request: DonorAdvancedSearchRequest = {};

    // Personal Info
    if (formData.firstName) request.firstName = formData.firstName;
    if (formData.lastName) request.lastName = formData.lastName;
    if (formData.email) request.email = formData.email;
    if (formData.phone) request.phone = formData.phone;
    if (formData.city) request.city = formData.city;
    if (formData.country) request.country = formData.country;

    // Donation Info
    if (formData.hasDonations === 'true') request.hasDonations = true;
    if (formData.hasDonations === 'false') request.hasDonations = false;
    if (formData.donationAmountFrom) request.donationAmountFrom = +formData.donationAmountFrom;
    if (formData.donationAmountTo) request.donationAmountTo = +formData.donationAmountTo;
    if (formData.donationDateFrom) request.donationDateFrom = formData.donationDateFrom;
    if (formData.donationDateTo) request.donationDateTo = formData.donationDateTo;

    // Sponsorship Info
    if (formData.hasActiveSponsorships === 'true') request.hasActiveSponsorships = true;
    if (formData.hasActiveSponsorships === 'false') request.hasActiveSponsorships = false;
    if (formData.sponsorshipType) request.sponsorshipType = formData.sponsorshipType;

    // Other Info
    if (formData.registrationDateFrom) request.registrationDateFrom = formData.registrationDateFrom;
    if (formData.registrationDateTo) request.registrationDateTo = formData.registrationDateTo;
    if (formData.donorId) request.donorId = formData.donorId;

    return request;
  }

  // This duplicate method has been merged with the main filterDonors method above

  // Method to clear advanced search and reset to original donor list
  clearAdvancedSearch(): void {
    this.isAdvancedSearchApplied = false;
    this.loadDonors();
    this.resetAdvancedSearch();
  }

  // Method to toggle advanced search modal visibility
  toggleAdvancedSearchModal(): void {
    if (this.isAdvancedSearchModalVisible) {
      this.closeAdvancedSearchModal();
    } else {
      this.openAdvancedSearchModal();
    }
  }

  // Method to handle search input changes
  onSearchInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm = input.value;
    this.filterDonors(input.value);
  }

  // Email functionality methods
  toggleEmailForm(): void {
    this.showEmailForm = !this.showEmailForm;
    this.isEmailFormVisible = !this.isEmailFormVisible;
    if (!this.showEmailForm) {
      this.resetEmailForm();
    }
  }

  resetEmailForm(): void {
    this.emailForm.reset({
      startDate: new Date(new Date().getFullYear(), 0, 1),
      endDate: new Date()
    });
    this.emailError = null;
    this.emailSuccess = false;
  }

  async sendDonationSummaryEmail(): Promise<void> {
    if (!this.selectedDonorDetail || !this.emailForm.valid) {
      this.emailError = 'Please select a donor and provide valid date range';
      return;
    }

    this.isEmailLoading = true;
    this.emailError = null;
    this.emailSuccess = false;

    try {
      const startDate = this.emailForm.value.startDate;
      const endDate = this.emailForm.value.endDate;

      // Format dates as ISO strings for API calls (YYYY-MM-DD)
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Get donations for the selected period
      const donations = await this.emailService.getDonationsByDateRange(
        this.selectedDonorDetail.id,
        startDateStr,
        endDateStr
      ).toPromise();

      if (!donations || donations.length === 0) {
        this.emailError = 'No donations found for the selected period';
        this.isEmailLoading = false;
        return;
      }

      // Generate PDF
      const pdfBlob = await this.emailService.generateDonationSummaryPDF(
        this.selectedDonorDetail,
        donations,
        startDate,
        endDate
      );

      // Convert blob to file
      const pdfFile = new File([pdfBlob], 'donation_summary.pdf', { type: 'application/pdf' });

      // Send email
      await this.emailService.sendDonationSummaryEmail(
        this.selectedDonorDetail.id,
        startDateStr,
        endDateStr,
        pdfFile
      ).toPromise();

      this.emailSuccess = true;
      this.showMessage(`Donation summary email sent successfully to ${this.selectedDonorDetail.email}`, 'success');
      this.toggleEmailForm();

    } catch (error: any) {
      console.error('Error sending donation summary email:', error);
      this.emailError = error.error || 'Failed to send donation summary email';
    } finally {
      this.isEmailLoading = false;
    }
  }

  async sendYearlyDonationReport(): Promise<void> {
    if (!this.selectedDonorDetail) {
      this.emailError = 'Please select a donor';
      return;
    }

    this.isYearlyEmailLoading = true;
    this.emailError = null;
    this.emailSuccess = false;

    try {
      // Use selected year instead of current year
      const selectedYear = this.selectedYear;

      // Create dates for PDF generation (keeping the Date objects for PDF generation)
      const startDate = new Date(selectedYear, 0, 1); // January 1st
      const endDate = new Date(selectedYear, 11, 31); // December 31st

      // Get donations for the selected year
      const donations = await this.emailService.getDonationsByYear(
        this.selectedDonorDetail.id,
        selectedYear
      ).toPromise();

      if (!donations || donations.length === 0) {
        this.emailError = `No donations found for ${selectedYear}`;
        this.isYearlyEmailLoading = false;
        this.noDonationsFound = true;
        this.noDonationsMessage = `No donations found for year ${selectedYear}. Please select a different year.`;
        this.showMessage(`No donations found for year ${selectedYear}. Please select a different year.`, 'warning');
        return;
      }

      // Reset no donations flag if we have donations
      this.noDonationsFound = false;
      this.noDonationsMessage = '';

      // Calculate total donation amount for the year
      const totalAmount = donations.reduce((sum, donation) => sum + donation.amount, 0);

      // Generate PDF
      const pdfBlob = await this.emailService.generateDonationSummaryPDF(
        this.selectedDonorDetail,
        donations,
        startDate,
        endDate
      );

      // Convert blob to file
      const pdfFile = new File([pdfBlob], `yearly_donation_report_${selectedYear}.pdf`, { type: 'application/pdf' });

      // Format dates as ISO strings for API calls (YYYY-MM-DD)
      const startDateStr = `${selectedYear}-01-01`; // January 1st
      const endDateStr = `${selectedYear}-12-31`; // December 31st

      // Send email
      await this.emailService.sendDonationSummaryEmail(
        this.selectedDonorDetail.id,
        startDateStr,
        endDateStr,
        pdfFile
      ).toPromise();

      this.emailSuccess = true;
      this.showMessage(`Yearly donation report for ${selectedYear} sent successfully to ${this.selectedDonorDetail.email}. Total donations: ${this.formatAmount(totalAmount)}`, 'success');

    } catch (error: any) {
      console.error('Error sending yearly donation report:', error);
      this.emailError = error.error || 'Failed to send yearly donation report';
    } finally {
      this.isYearlyEmailLoading = false;
    }
  }

  async sendMonthlyDonationReport(): Promise<void> {
    if (!this.selectedDonorDetail) {
      this.emailError = 'Please select a donor';
      return;
    }

    this.isMonthlyEmailLoading = true;
    this.emailError = null;
    this.emailSuccess = false;

    // Reset alert state at the beginning
    this.noDonationsFound = false;
    this.noDonationsMessage = '';

    try {
      // Use selected year and month instead of current date
      const selectedYear = this.selectedYear;
      const selectedMonth = this.selectedMonth;

      // Create dates for PDF generation (keeping the Date objects for PDF generation)
      const startDate = new Date(selectedYear, selectedMonth, 1); // First day of selected month
      const endDate = new Date(selectedYear, selectedMonth + 1, 0); // Last day of selected month

      // Get donations for the selected month and year
      const donations = await this.emailService.getDonationsByMonth(
        this.selectedDonorDetail.id,
        selectedYear,
        selectedMonth
      ).toPromise();

      if (!donations || donations.length === 0) {
        const monthName = startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        console.log(`No donations found for month: ${monthName}, setting alert...`);
        this.emailError = `No donations found for ${monthName}`;
        this.isMonthlyEmailLoading = false;
        this.noDonationsFound = true;
        this.noDonationsMessage = `No donations found for ${monthName}. Please select a different month or year.`;

        // Force UI update with setTimeout
        setTimeout(() => {
          console.log('Alert state in send method:', this.noDonationsFound, this.noDonationsMessage);
        }, 0);

        this.showMessage(`No donations found for ${monthName}. Please select a different month or year.`, 'warning');
        return;
      }

      // Reset no donations flag if we have donations
      this.noDonationsFound = false;
      this.noDonationsMessage = '';

      // Calculate total donation amount for the month
      const totalAmount = donations.reduce((sum, donation) => sum + donation.amount, 0);

      // Generate PDF
      const pdfBlob = await this.emailService.generateDonationSummaryPDF(
        this.selectedDonorDetail,
        donations,
        startDate,
        endDate
      );

      const monthName = startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).replace(' ', '_');
      // Convert blob to file
      const pdfFile = new File([pdfBlob], `monthly_donation_report_${monthName}.pdf`, { type: 'application/pdf' });

      // Format dates as ISO strings for API calls (YYYY-MM-DD)
      const monthStr = (selectedMonth + 1).toString().padStart(2, '0');
      const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      const startDateStr = `${selectedYear}-${monthStr}-01`; // First day of month
      const endDateStr = `${selectedYear}-${monthStr}-${lastDay}`; // Last day of month

      // Send email
      await this.emailService.sendDonationSummaryEmail(
        this.selectedDonorDetail.id,
        startDateStr,
        endDateStr,
        pdfFile
      ).toPromise();

      this.emailSuccess = true;
      const monthDisplayName = startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      this.showMessage(`Monthly donation report for ${monthDisplayName} sent successfully to ${this.selectedDonorDetail.email}. Total donations: ${this.formatAmount(totalAmount)}`, 'success');

    } catch (error: any) {
      console.error('Error sending monthly donation report:', error);
      this.emailError = error.error || 'Failed to send monthly donation report';
    } finally {
      this.isMonthlyEmailLoading = false;
    }
  }

  async previewYearlyDonationReport(): Promise<void> {
    if (!this.selectedDonorDetail) {
      this.emailError = 'Please select a donor';
      return;
    }

    this.isYearlyEmailLoading = true;
    this.emailError = null;

    try {
      // Use selected year instead of current year
      const selectedYear = this.selectedYear;

      // Create dates for PDF generation (keeping the Date objects for PDF generation)
      const startDate = new Date(selectedYear, 0, 1); // January 1st
      const endDate = new Date(selectedYear, 11, 31); // December 31st

      // Get donations for the selected year
      const donations = await this.emailService.getDonationsByYear(
        this.selectedDonorDetail.id,
        selectedYear
      ).toPromise();

      if (!donations || donations.length === 0) {
        this.emailError = `No donations found for ${selectedYear}`;
        this.noDonationsFound = true;
        this.noDonationsMessage = `No donations found for year ${selectedYear}. Please select a different year.`;
        this.showMessage(`No donations found for year ${selectedYear}. Please select a different year.`, 'warning');
        return;
      }

      // Reset no donations flag if we have donations
      this.noDonationsFound = false;
      this.noDonationsMessage = '';

      // Calculate total donation amount for the year
      const totalAmount = donations.reduce((sum, donation) => sum + donation.amount, 0);

      // Generate PDF
      const pdfBlob = await this.emailService.generateDonationSummaryPDF(
        this.selectedDonorDetail,
        donations,
        startDate,
        endDate
      );

      // Open PDF in new window
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');

      // Show success message with total amount
      this.showMessage(`Yearly donation report for ${selectedYear} previewed. Total donations: ${this.formatAmount(totalAmount)}`, 'info');

    } catch (error: any) {
      console.error('Error previewing yearly donation report:', error);
      this.emailError = error.error || 'Failed to generate yearly donation report preview';
    } finally {
      this.isYearlyEmailLoading = false;
    }
  }

  async previewMonthlyDonationReport(): Promise<void> {
    if (!this.selectedDonorDetail) {
      this.emailError = 'Please select a donor';
      return;
    }

    this.isMonthlyEmailLoading = true;
    this.emailError = null;

    // Reset alert state at the beginning
    this.noDonationsFound = false;
    this.noDonationsMessage = '';

    try {
      // Use selected year and month instead of current date
      const selectedYear = this.selectedYear;
      const selectedMonth = this.selectedMonth;

      // Create dates for PDF generation (keeping the Date objects for PDF generation)
      const startDate = new Date(selectedYear, selectedMonth, 1); // First day of selected month
      const endDate = new Date(selectedYear, selectedMonth + 1, 0); // Last day of selected month

      // Get donations for the selected month and year
      const donations = await this.emailService.getDonationsByMonth(
        this.selectedDonorDetail.id,
        selectedYear,
        selectedMonth
      ).toPromise();

      if (!donations || donations.length === 0) {
        const monthName = startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        console.log(`No donations found for month: ${monthName}, setting alert...`);
        this.emailError = `No donations found for ${monthName}`;
        this.noDonationsFound = true;
        this.noDonationsMessage = `No donations found for ${monthName}. Please select a different month or year.`;

        // Force UI update with setTimeout
        setTimeout(() => {
          console.log('Alert state:', this.noDonationsFound, this.noDonationsMessage);
        }, 0);

        this.showMessage(`No donations found for ${monthName}. Please select a different month or year.`, 'warning');
        return;
      }

      // Reset no donations flag if we have donations
      this.noDonationsFound = false;
      this.noDonationsMessage = '';

      // Calculate total donation amount for the month
      const totalAmount = donations.reduce((sum, donation) => sum + donation.amount, 0);

      // Generate PDF
      const pdfBlob = await this.emailService.generateDonationSummaryPDF(
        this.selectedDonorDetail,
        donations,
        startDate,
        endDate
      );

      // Open PDF in new window
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');

      // Show success message with total amount
      const monthName = startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      this.showMessage(`Monthly donation report for ${monthName} previewed. Total donations: ${this.formatAmount(totalAmount)}`, 'info');
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);

    } catch (error: any) {
      console.error('Error previewing monthly donation report:', error);
      this.emailError = error.error || 'Failed to generate monthly donation report preview';
    } finally {
      this.isMonthlyEmailLoading = false;
    }
  }

  async previewDonationSummary(): Promise<void> {
    if (!this.selectedDonorDetail || !this.emailForm.valid) {
      this.emailError = 'Please select a donor and provide valid date range';
      return;
    }

    try {
      const startDate = this.emailForm.value.startDate;
      const endDate = this.emailForm.value.endDate;

      // Format dates as ISO strings for API calls (YYYY-MM-DD)
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Get donations for the selected period
      const donations = await this.emailService.getDonationsByDateRange(
        this.selectedDonorDetail.id,
        startDateStr,
        endDateStr
      ).toPromise();

      if (!donations || donations.length === 0) {
        this.emailError = 'No donations found for the selected period';
        return;
      }

      // Generate and download PDF for preview
      const pdfBlob = await this.emailService.generateDonationSummaryPDF(
        this.selectedDonorDetail,
        donations,
        startDate,
        endDate
      );

      // Open PDF in new browser tab for preview
      const url = window.URL.createObjectURL(pdfBlob);
      const newWindow = window.open(url, '_blank');
      if (!newWindow) {
        // Fallback if popup blocked - create download link
        const link = document.createElement('a');
        link.href = url;
        link.download = `donation_summary_${this.selectedDonorDetail.firstName}_${this.selectedDonorDetail.lastName}_${this.emailForm.value.startDate}_to_${this.emailForm.value.endDate}.pdf`;
        link.click();
      }
      // Clean up the URL after a delay to allow the browser to load it
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);

    } catch (error: any) {
      console.error('Error generating donation summary preview:', error);
      this.emailError = 'Failed to generate donation summary preview';
    }
  }

  // History and Analytics Methods
  initializeDateRanges(): void {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());

    this.customStartDate = sixMonthsAgo.toISOString().split('T')[0];
    this.customEndDate = now.toISOString().split('T')[0];
  }



  // Missing method implementations
  initializeForms(): void {
    // Forms are already initialized in constructor
  }

  initializeAvailableYears(): void {
    const currentYear = new Date().getFullYear();
    this.availableYears = [];
    for (let year = currentYear; year >= currentYear - 10; year--) {
      this.availableYears.push(year);
    }
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  // History and Analytics Methods
  setTimePeriod(period: '6months' | '1year' | 'custom'): void {
    this.selectedPeriod = period;
    this.updateHistoryData();
  }

  updateHistoryData(): void {
    if (!this.selectedDonor) return;

    // Clear existing history data
    this.historyData = [];

    // Load donation and gift history based on selected period
    this.loadDonationHistory();
    this.loadGiftHistory();
  }

  loadDonationHistory(): void {
    if (!this.selectedDonor?.id) return;

    this.donationService.getDonationsByDonorId(this.selectedDonor.id).subscribe({
      next: (donations) => {
        this.addToHistoryData(donations, 'donation');
        this.filterHistoryData();
        this.calculatePeriodStats();
      },
      error: (error) => {
        console.error('Error loading donation history:', error);
      }
    });
  }

  loadGiftHistory(): void {
    if (!this.selectedDonor?.id) return;

    this.giftService.getGiftsByDonor(this.selectedDonor.id).subscribe({
      next: (gifts) => {
        this.addToHistoryData(gifts, 'gift');
        this.filterHistoryData();
        this.calculatePeriodStats();
      },
      error: (error) => {
        console.error('Error loading gift history:', error);
      }
    });
  }

  addToHistoryData(items: any[], type: 'donation' | 'gift'): void {
    const historyItems: HistoryItem[] = items.map(item => ({
      id: item.id,
      date: type === 'donation' ? item.donationDate : item.giftDate,
      type: type,
      description: item.description || (type === 'donation' ? 'Donation' : item.giftName || 'Gift'),
      amount: item.amount,
      fundType: item.giftTypeName || 'General',
      status: 'Completed'
    }));

    // Add to history data array (avoid duplicates)
    const existingIds = this.historyData.map(h => `${h.type}-${h.id}`);
    const newItems = historyItems.filter(item => !existingIds.includes(`${item.type}-${item.id}`));
    this.historyData = [...this.historyData, ...newItems];

    // Filter data
    this.filterHistoryData();

    // Update insights based on real data
    this.updateDonationInsights();
  }

  filterHistoryData(): void {
    let filtered = [...this.historyData];

    // Apply date range filter based on selected period
    const now = new Date();
    let startDate: Date;

    switch (this.selectedPeriod) {
      case '6months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        break;
      case '1year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      case 'custom':
        startDate = new Date(this.customStartDate);
        const endDate = new Date(this.customEndDate);
        filtered = filtered.filter(item => {
          const itemDate = new Date(item.date);
          return itemDate >= startDate && itemDate <= endDate;
        });
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    }

    if (this.selectedPeriod !== 'custom') {
      filtered = filtered.filter(item => new Date(item.date) >= startDate);
    }

    // Apply search filter
    if (this.historySearchTerm) {
      const searchTerm = this.historySearchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.description.toLowerCase().includes(searchTerm) ||
        item.fundType?.toLowerCase().includes(searchTerm) ||
        item.type.toLowerCase().includes(searchTerm)
      );
    }

    this.filteredHistoryData = filtered;
    this.sortHistoryData();
  }

  sortHistoryData(): void {
    this.filteredHistoryData.sort((a, b) => {
      let comparison = 0;

      switch (this.historySortBy) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
      }

      return this.sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  toggleSortOrder(): void {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    this.sortHistoryData();
  }

  calculatePeriodStats(): void {
    const donations = this.filteredHistoryData.filter(item => item.type === 'donation');
    const gifts = this.filteredHistoryData.filter(item => item.type === 'gift');

    this.periodStats = {
      totalDonations: donations.reduce((sum, item) => sum + item.amount, 0),
      totalGifts: gifts.reduce((sum, item) => sum + item.amount, 0),
      highestDonation: donations.length > 0 ? Math.max(...donations.map(d => d.amount)) : 0,
      averagePerMonth: this.calculateAveragePerMonth(donations)
    };
  }

  calculateAveragePerMonth(donations: HistoryItem[]): number {
    if (donations.length === 0) return 0;

    const totalAmount = donations.reduce((sum, item) => sum + item.amount, 0);
    const monthsInPeriod = this.selectedPeriod === '6months' ? 6 :
                          this.selectedPeriod === '1year' ? 12 :
                          this.getCustomPeriodMonths();

    return totalAmount / monthsInPeriod;
  }

  getCustomPeriodMonths(): number {
    const start = new Date(this.customStartDate);
    const end = new Date(this.customEndDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.round(diffDays / 30)); // Approximate months
  }

  resetDonorData(): void {
    // Reset all donor-related data
    this.donorSponsorships = [];
    this.donorGifts = [];
    this.donorDonations = [];
    this.donorSponsorshipGifts = [];
    this.donorBalance = 0;
    this.historyData = [];
    this.filteredHistoryData = [];

    // Reset statistics to default values
    this.donorStatistics = {
      totalOrphansSponsored: 0,
      totalGiftsGiven: 0,
      totalSponsorshipDuration: 0,
      currentDonationBalance: 0,
      totalDonations: 0,
      totalGifts: 0
    };

    this.periodStats = {
      totalDonations: 0,
      totalGifts: 0,
      highestDonation: 0,
      averagePerMonth: 0
    };

    this.donationInsights = {
      frequency: 'N/A',
      topFund: 'N/A',
      growth: 0,
      consistencyScore: 0
    };
  }

  updateDonationInsights(): void {
    if (this.historyData.length === 0) return;

    const donations = this.historyData.filter(item => item.type === 'donation');
    if (donations.length === 0) return;

    // Calculate frequency based on donation intervals
    const sortedDonations = donations.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let totalDaysBetween = 0;
    let intervals = 0;

    for (let i = 1; i < sortedDonations.length; i++) {
      const prevDate = new Date(sortedDonations[i-1].date);
      const currDate = new Date(sortedDonations[i].date);
      const daysDiff = Math.abs(currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
      totalDaysBetween += daysDiff;
      intervals++;
    }

    if (intervals > 0) {
      const avgDaysBetween = totalDaysBetween / intervals;
      if (avgDaysBetween <= 35) {
        this.donationInsights.frequency = 'Monthly';
      } else if (avgDaysBetween <= 95) {
        this.donationInsights.frequency = 'Quarterly';
      } else if (avgDaysBetween <= 185) {
        this.donationInsights.frequency = 'Semi-Annual';
      } else {
        this.donationInsights.frequency = 'Annual';
      }
    }

    // Find top fund type
    const fundTypeCounts: {[key: string]: number} = {};
    this.historyData.forEach(item => {
      const fundType = item.fundType || 'General';
      fundTypeCounts[fundType] = (fundTypeCounts[fundType] || 0) + 1;
    });

    let topFund = 'General';
    let maxCount = 0;
    Object.entries(fundTypeCounts).forEach(([fund, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topFund = fund;
      }
    });
    this.donationInsights.topFund = topFund;

    // Calculate growth (simple year-over-year if we have enough data)
    const currentYear = new Date().getFullYear();
    const currentYearDonations = donations.filter(d => new Date(d.date).getFullYear() === currentYear);
    const lastYearDonations = donations.filter(d => new Date(d.date).getFullYear() === currentYear - 1);

    if (lastYearDonations.length > 0 && currentYearDonations.length > 0) {
      const currentYearTotal = currentYearDonations.reduce((sum, d) => sum + d.amount, 0);
      const lastYearTotal = lastYearDonations.reduce((sum, d) => sum + d.amount, 0);
      this.donationInsights.growth = ((currentYearTotal - lastYearTotal) / lastYearTotal) * 100;
    }

    // Calculate consistency score based on regularity
    this.donationInsights.consistencyScore = Math.min(100, Math.max(0,
      (donations.length / Math.max(1, intervals)) * 50 +
      (intervals > 0 ? Math.max(0, 50 - (totalDaysBetween / intervals - 30)) : 0)
    ));
  }

  getHighestDonation(): number {
    if (this.donorDonations.length === 0) return 0;
    return Math.max(...this.donorDonations.map(donation => donation.amount));
  }

  getFormattedAmount(giftTypeId: number): string {
    return this.formattedGiftTypeAmounts.get(giftTypeId) ?? '0.00';
  }

  private loadAmountPerDonor(donorId:number) {
    this.giftTypeService.findByDonorId(donorId).subscribe({
      next: (amounts) => {
        console.log(amounts)
        this.formattedGiftTypeAmounts = new Map(
          amounts.map((amount) => [
            amount.giftType.id,
            this.formatAmount(amount.amount || 0)
          ])
        );
      },
      error: (error) => {
        console.error('Error loading gift history:', error);
      }
    });
  }
}
