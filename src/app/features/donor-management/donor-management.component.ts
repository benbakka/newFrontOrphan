import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
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

@Component({
  selector: 'app-donor-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './donor-management.component.html',
  styleUrls: ['./donor-management.component.scss']
})
export class DonorManagementComponent implements OnInit {
  // Donor list properties
  donors: Donor[] = [];
  filteredDonors: Donor[] = [];
  searchTerm: string = '';
  isLoading: boolean = false;
  
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
  showDonorForm: boolean = false;
  showGiftForm: boolean = false;
  showDonationForm: boolean = false;
  showUploadModal: boolean = false;
  isUploadModalVisible: boolean = false;
  isGiftFormVisible: boolean = false;
  isDonationFormVisible: boolean = false;
  
  // Form groups
  donorForm: FormGroup;
  giftForm: FormGroup;
  donationForm: FormGroup;
  
  // Form submission states
  isSubmittingDonor = false;
  isSubmittingGift = false;
  isSubmittingDonation = false;
  
  // Form feedback messages
  donorError: string | null = null;
  donorSuccess: boolean = false;
  giftError: string | null = null;
  giftSuccess: boolean = false;
  donationError: string | null = null;
  donationSuccess: boolean = false;
  
  // File upload properties
  selectedFile: File | null = null;
  isUploading: boolean = false;
  uploadProgress: number = 0;
  uploadError: string | null = null;
  uploadSuccess: boolean = false;
  dragOver: boolean = false;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  
  // Gift type properties
  giftTypes: GiftType[] = [];
  customGiftType: string = '';
  customGiftTypeName: string = '';
  selectedGiftTypeId: number | null = null;
  selectedGiftTypeBalance: number | null = null;
  selectedGiftType: GiftType | null = null;
  showCustomGiftTypeInput: boolean = false;
  
  // Donor data
  donorSponsorships: Sponsorship[] = [];
  donorGifts: Gift[] = [];
  donorDonations: Donation[] = [];
  donorBalance: number = 0;
  donorSponsorshipGifts: any[] = [];
  
  // Tab navigation
  activeTab: string = 'basic';
  
  // Gift link properties
  beneficiaryType: 'orphan' | 'project' | 'charity' = 'charity';
  giftLinkType: 'orphan' | 'project' | 'charity' = 'charity'; // Added to match template references
  availableProjects: CharityProject[] = [];
  availableOrphans: OrphanListDTO[] = [];
  private apiUrl = environment.apiUrl;
  BeneficiaryType = BeneficiaryType;

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
    private fb: FormBuilder
  ) {
    this.donorForm = this.fb.group({
      donorId: ['', Validators.required],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
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
  }

  ngOnInit(): void {
    this.loadDonors();
    this.loadGiftTypes();
    this.loadProjects();
    this.loadOrphans();
    
    this.route.paramMap.subscribe(params => {
      const donorId = params.get('id');
      if (donorId) {
        this.loadDonorDetails(+donorId);
      }
    });
  }
  
  loadDonorDetails(donorId: number): void {
    this.isLoadingDonorDetail = true;
    this.donorService.getDonorDetails(donorId).subscribe({
      next: (donorDetail) => {
        this.selectedDonor = donorDetail;
        this.selectedDonorDetail = donorDetail;
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
        this.calculateDonorBalance();
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
    this.beneficiaryType = type;
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
    this.beneficiaryType = type; // Keep beneficiaryType in sync with giftLinkType
    this.updateGiftFormValidators();
  }

  updateGiftFormValidators(): void {
    // Reset form controls
    this.giftForm.get('orphanId')?.clearValidators();
    this.giftForm.get('projectId')?.clearValidators();
    
    // Apply validators based on beneficiary type
    if (this.beneficiaryType === 'orphan') {
      this.giftForm.get('orphanId')?.setValidators([Validators.required]);
    } else if (this.beneficiaryType === 'project') {
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
          beneficiaryType: this.beneficiaryType
        };
        
        // Add beneficiary-specific fields
        if (this.beneficiaryType === 'orphan' && formValues.orphanId) {
          giftRequest.orphanId = +formValues.orphanId;
        } else if (this.beneficiaryType === 'project' && formValues.projectId) {
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
      this.beneficiaryType = 'charity';
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

  resetGiftForm(): void {
    this.giftForm.reset({
      date: new Date().toISOString().split('T')[0],
      beneficiaryType: 'charity'
    });
    this.giftError = null;
    this.giftSuccess = false;
    this.customGiftType = '';
    this.beneficiaryType = 'charity';
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
        },
        error: (error: any) => {
          this.donationError = 'Error adding donation: ' + (error.error?.message || error.message || 'Unknown error');
          this.isSubmittingDonation = false;
        }
      });
    }
  }

filterDonors(): void {
  if (!this.searchTerm.trim()) {
    this.filteredDonors = this.donors;
  } else {
    const searchTermLower = this.searchTerm.toLowerCase().trim();
    this.filteredDonors = this.donors.filter(donor => 
      donor.firstName.toLowerCase().includes(searchTermLower) ||
      donor.lastName.toLowerCase().includes(searchTermLower) ||
      donor.email.toLowerCase().includes(searchTermLower) ||
      donor.phone?.toLowerCase().includes(searchTermLower) ||
      donor.city?.toLowerCase().includes(searchTermLower) ||
      donor.country?.toLowerCase().includes(searchTermLower)
    );
  }
}

selectDonor(donor: Donor): void {
  this.selectedDonor = donor;
  this.isFormVisible = false; // Close any open forms
  
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
  return new Date(date).toLocaleDateString();
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

} // Add missing closing brace for the component class
