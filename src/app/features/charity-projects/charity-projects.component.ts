import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CharityProject, CreateCharityProjectRequest, ProjectStatus } from '../../shared/models/charity-project.model';
import { CharityProjectService } from '../../shared/services/charity-project.service';
import { Gift, CreateGiftRequestV2, BeneficiaryType } from '../../core/models/gift.model';
import { GiftService } from '../../core/services/gift.service';
import { GiftTypeService } from '../../core/services/gift-type.service';
import { GiftType } from '../../core/models/gift-type.model';

@Component({
  selector: 'app-charity-projects',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './charity-projects.component.html',
  styleUrls: ['./charity-projects.component.scss']
})
export class CharityProjectsComponent implements OnInit {
  projects: CharityProject[] = [];
  filteredProjects: CharityProject[] = [];
  projectTypes: string[] = [];
  selectedProject: CharityProject | null = null;

  // Pagination
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;

  // Filters and search
  searchTerm = '';
  selectedType = '';
  selectedStatus: ProjectStatus | '' = '';
  sortBy = 'createdDate';
  sortDir = 'desc';

  // Form and modal states
  projectForm: FormGroup;
  showForm = false;
  isEditing = false;
  isEditingInline = false;
  editingProjectId: number | null = null;

  // Detail tabs
  activeDetailTab = 'info';

  // Loading states
  isLoading = false;
  isSubmitting = false;
  isLoadingGifts = false;

  // Gift related properties
  projectGifts: Gift[] = [];
  giftForm: FormGroup;
  giftTypes: GiftType[] = [];
  giftError: string | null = null;
  giftSuccess = false;
  isSubmittingGift = false;
  beneficiaryType: 'project' = 'project';

  // Enums for template
  ProjectStatus = ProjectStatus;
  projectStatuses = Object.values(ProjectStatus);

  constructor(
    private charityProjectService: CharityProjectService,
    private giftService: GiftService,
    private giftTypeService: GiftTypeService,
    private fb: FormBuilder
  ) {
    this.projectForm = this.createForm();
    this.giftForm = this.fb.group({
      giftTypeId: [null, Validators.required],
      customGiftTypeName: [''],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      date: [new Date().toISOString().split('T')[0], Validators.required],
      description: ['']
    });
  }

  ngOnInit(): void {
    this.loadProjects();
    this.loadProjectTypes();
    this.loadGiftTypes();
  }

  selectProject(project: CharityProject): void {
    this.selectedProject = project;
    this.activeDetailTab = 'info';
    if (project.id) {
      this.loadProjectGifts(project.id);
    }
  }

  loadProjectGifts(projectId: number): void {
    this.isLoadingGifts = true;
    // Try to get all gifts and filter by project ID as fallback
    this.giftService.getAllGifts().subscribe({
      next: (gifts) => {
        this.projectGifts = gifts.filter(gift => gift.projectId === projectId)
          .map(gift => ({
            ...gift,
            // Ensure giftName is always defined with a fallback
            giftName: gift.giftName || gift.description || 'Gift'
          }));
        this.isLoadingGifts = false;
      },
      error: (error) => {
        console.error('Error loading project gifts:', error);
        // Initialize empty array if no gifts found
        this.projectGifts = [];
        this.isLoadingGifts = false;
      }
    });
  }

  loadGiftTypes(): void {
    this.giftTypeService.getAllGiftTypesWithBalances().subscribe({
      next: (types) => {
        this.giftTypes = types;
      },
      error: (error) => {
        console.error('Error loading gift types:', error);
      }
    });
  }

  createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      type: ['', Validators.required],
      description: [''],
      targetAmount: [0, [Validators.required, Validators.min(1)]],
      collectedAmount: [0, [Validators.min(0)]],
      status: [ProjectStatus.ACTIVE, Validators.required],
      startDate: ['', Validators.required],
      endDate: ['']
    });
  }

  loadProjects(): void {
    this.isLoading = true;

    const statusFilter = this.selectedStatus === '' ? undefined : this.selectedStatus;

    this.charityProjectService.getCharityProjects(
      this.currentPage,
      this.pageSize,
      this.sortBy,
      this.sortDir,
      this.searchTerm || undefined,
      this.selectedType || undefined,
      statusFilter
    ).subscribe({
      next: (response) => {
        this.projects = response.content;
        this.filteredProjects = response.content;
        this.totalElements = response.totalElements;
        this.totalPages = response.totalPages;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading projects:', error);
        this.isLoading = false;
      }
    });
  }

  loadProjectTypes(): void {
    this.charityProjectService.getAllProjectTypes().subscribe({
      next: (types) => {
        this.projectTypes = types;
      },
      error: (error) => {
        console.error('Error loading project types:', error);
      }
    });
  }

  onSearch(): void {
    this.currentPage = 0;
    this.loadProjects();
  }

  onFilterChange(): void {
    this.currentPage = 0;
    this.loadProjects();
  }

  onSort(column: string): void {
    if (this.sortBy === column) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.sortDir = 'asc';
    }
    this.loadProjects();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadProjects();
  }

  toggleAddForm(): void {
    if (this.showForm && !this.isEditing) {
      // If form is already showing and not in edit mode, hide it
      this.showForm = false;
    } else {
      // Show the form for adding a new project
      this.isEditing = false;
      this.editingProjectId = null;
      this.projectForm.reset({
        status: ProjectStatus.ACTIVE,
        collectedAmount: 0
      });
      this.showForm = true;
    }
  }

  createNewProject(): void {
    // Create an empty project template
    const emptyProject: CharityProject = {
      name: 'New Project',
      type: '',
      description: '',
      targetAmount: 0,
      collectedAmount: 0,
      status: ProjectStatus.ACTIVE,
      startDate: new Date().toISOString().split('T')[0],
      progressPercentage: 0
    };

    // Set as selected project
    this.selectedProject = emptyProject;

    // Switch to info tab and start editing
    this.activeDetailTab = 'info';
    this.isEditingInline = true;

    // Reset form with default values
    this.projectForm.reset({
      name: 'New Project',
      type: '',
      description: '',
      targetAmount: 0,
      collectedAmount: 0,
      status: ProjectStatus.ACTIVE,
      startDate: new Date().toISOString().split('T')[0]
    });
  }

  showAddForm(): void {
    this.isEditing = false;
    this.editingProjectId = null;
    this.projectForm.reset({
      status: ProjectStatus.ACTIVE,
      collectedAmount: 0
    });
    this.showForm = true;
  }

  editProject(project: CharityProject): void {
    this.isEditing = true;
    this.editingProjectId = project.id!;
    this.projectForm.patchValue({
      name: project.name,
      type: project.type,
      description: project.description,
      targetAmount: project.targetAmount,
      collectedAmount: project.collectedAmount,
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate
    });
    this.showForm = true;
  }

  onSubmit(): void {
    if (this.projectForm.valid) {
      this.isSubmitting = true;
      const formValue = this.projectForm.value;

      const request: CreateCharityProjectRequest = {
        name: formValue.name,
        type: formValue.type,
        description: formValue.description,
        targetAmount: formValue.targetAmount,
        collectedAmount: formValue.collectedAmount,
        status: formValue.status,
        startDate: formValue.startDate,
        endDate: formValue.endDate
      };

      const operation = this.isEditing
        ? this.charityProjectService.updateCharityProject(this.editingProjectId!, request)
        : this.charityProjectService.createCharityProject(request);

      operation.subscribe({
        next: (project) => {
          this.loadProjects();
          this.loadProjectTypes(); // Refresh types in case a new type was added
          this.cancelForm();
          this.isSubmitting = false;
        },
        error: (error) => {
          console.error('Error saving project:', error);
          this.isSubmitting = false;
        }
      });
    }
  }

  deleteProject(project: CharityProject): void {
    if (confirm(`Are you sure you want to delete "${project.name}"?`)) {
      this.charityProjectService.deleteCharityProject(project.id!).subscribe({
        next: () => {
          this.loadProjects();
        },
        error: (error) => {
          console.error('Error deleting project:', error);
        }
      });
    }
  }

  cancelForm(): void {
    this.showForm = false;
    this.isEditing = false;
    this.editingProjectId = null;
    this.projectForm.reset();
  }

  startInlineEdit(): void {
    this.isEditingInline = true;
    this.editingProjectId = this.selectedProject?.id || null;
    this.projectForm.patchValue({
      name: this.selectedProject?.name,
      type: this.selectedProject?.type,
      description: this.selectedProject?.description,
      targetAmount: this.selectedProject?.targetAmount,
      collectedAmount: this.selectedProject?.collectedAmount,
      status: this.selectedProject?.status,
      startDate: this.selectedProject?.startDate,
      endDate: this.selectedProject?.endDate
    });
  }

  cancelInlineEdit(): void {
    this.isEditingInline = false;
    this.editingProjectId = null;
    this.projectForm.reset();
  }

  saveInlineEdit(): void {
    if (this.projectForm.valid && this.selectedProject) {
      this.isSubmitting = true;
      const formValue = this.projectForm.value;

      const request: CreateCharityProjectRequest = {
        name: formValue.name,
        type: formValue.type,
        description: formValue.description,
        targetAmount: formValue.targetAmount,
        collectedAmount: formValue.collectedAmount,
        status: formValue.status,
        startDate: formValue.startDate,
        endDate: formValue.endDate
      };

      // Check if this is a new project or an existing one
      const isNewProject = !this.selectedProject.id;

      const operation = isNewProject
        ? this.charityProjectService.createCharityProject(request)
        : this.charityProjectService.updateCharityProject(this.selectedProject.id!, request);

      operation.subscribe({
        next: (project) => {
          // Update the selected project with new values
          this.selectedProject = project;
          this.loadProjects(); // Refresh the list
          this.isEditingInline = false;
          this.isSubmitting = false;
        },
        error: (error) => {
          console.error('Error saving project:', error);
          this.isSubmitting = false;
        }
      });
    }
  }

  getStatusClass(status: ProjectStatus): string {
    switch (status) {
      case ProjectStatus.ACTIVE:
        return 'status-active';
      case ProjectStatus.COMPLETED:
        return 'status-completed';
      case ProjectStatus.INACTIVE:
        return 'status-inactive';
      case ProjectStatus.CANCELLED:
        return 'status-cancelled';
      default:
        return '';
    }
  }

  getProgressBarClass(percentage: number): string {
    if (percentage >= 100) return 'progress-complete';
    if (percentage >= 75) return 'progress-high';
    if (percentage >= 50) return 'progress-medium';
    if (percentage >= 25) return 'progress-low';
    return 'progress-minimal';
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


  onGiftTypeChange(): void {
    // Update form validators based on gift type selection
    const giftTypeId = this.giftForm.get('giftTypeId')?.value;
    const customNameControl = this.giftForm.get('customGiftTypeName');

    if (giftTypeId === 'custom') {
      customNameControl?.setValidators([Validators.required]);
    } else {
      customNameControl?.clearValidators();
    }
    customNameControl?.updateValueAndValidity();
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
          // donorId: 1, // Default donor ID since not shown in form
          giftTypeId: giftTypeId,
          amount: +formValues.amount,
          giftName: formValues.description || 'Gift', // Use description as gift name or default to 'Gift'
          date: formValues.date,
          description: formValues.description || undefined,
          beneficiaryType: this.beneficiaryType,
          projectId: this.selectedProject?.id
        };

        this.isSubmittingGift = true;
        this.giftService.createGiftV2(giftRequest).subscribe({
          next: (response) => {
            this.giftSuccess = true;
            this.isSubmittingGift = false;
            this.resetGiftForm();
            this.loadProjectGifts(this.selectedProject?.id!);
            this.loadGiftTypes(); // Reload gift types to update balances

            // Update project progress with new gift amount
            if (this.selectedProject) {
              const updatedAmount = this.selectedProject.collectedAmount + +formValues.amount;
              this.charityProjectService.updateCollectedAmount(this.selectedProject.id!, updatedAmount)
                .subscribe({
                  next: (updatedProject) => {
                    this.selectedProject = updatedProject;
                    this.loadProjects();
                  },
                  error: (error) => console.error('Error updating project amount:', error)
                });
            }
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

  resetGiftForm(): void {
    this.giftForm.reset({
      giftTypeId: null,
      customGiftTypeName: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      description: ''
    });
    this.giftError = null;
    this.giftSuccess = false;
  }

  // Temporary method to recalculate project amounts
  recalculateProjectAmounts(): void {
    this.giftService.recalculateProjectAmounts().subscribe({
      next: (response) => {
        console.log('Project amounts recalculated:', response);
        this.loadProjects(); // Reload projects to see updated amounts
        alert('Project amounts recalculated successfully!');
      },
      error: (error) => {
        console.error('Error recalculating project amounts:', error);
        alert('Error recalculating project amounts');
      }
    });
  }

  // Debug method to check project gifts
  debugProjectGifts(): void {
    if (this.selectedProject?.id) {
      this.giftService.debugProjectGifts(this.selectedProject.id).subscribe({
        next: (response) => {
          console.log('Debug info for project:', response);
          alert('Debug info logged to console');
        },
        error: (error) => {
          console.error('Error debugging project gifts:', error);
        }
      });
    }
  }
}
