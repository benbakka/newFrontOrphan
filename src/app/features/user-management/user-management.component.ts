import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { UserService } from '../../shared/services/user.service';
import { User, CreateUserRequest, UpdateUserRequest, Permission, AVAILABLE_ROUTES, USER_ROLES } from '../../shared/models/user.model';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss']
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  searchTerm: string = '';
  isLoading: boolean = false;
  
  // Form states
  userForm!: FormGroup;
  permissionForm!: FormGroup;
  isEditMode: boolean = false;
  editingUserId: number | null = null;
  
  // Modal states
  isUserModalVisible: boolean = false;
  isPermissionModalVisible: boolean = false;
  isDeleteConfirmVisible: boolean = false;
  userToDelete: User | null = null;
  
  // Permission management
  selectedUser: User | null = null;
  userPermissions: Permission[] = [];
  availableRoutes = AVAILABLE_ROUTES;
  userRoles = USER_ROLES;
  
  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalUsers: number = 0;
  
  // Messages
  successMessage: string = '';
  errorMessage: string = '';

  constructor(
    private userService: UserService,
    private formBuilder: FormBuilder
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  private initializeForms(): void {
    this.userForm = this.formBuilder.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['ROLE_USER', Validators.required]
    });

    this.permissionForm = this.formBuilder.group({});
    this.availableRoutes.forEach(route => {
      this.permissionForm.addControl(route.route, this.formBuilder.control(false));
    });
  }

  // User CRUD Operations
  loadUsers(): void {
    this.isLoading = true;
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.filteredUsers = users;
        this.totalUsers = users.length;
        this.isLoading = false;
        this.applySearch();
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.showErrorMessage('Failed to load users');
        this.isLoading = false;
      }
    });
  }

  openCreateUserModal(): void {
    this.isEditMode = false;
    this.editingUserId = null;
    this.userForm.reset();
    this.userForm.patchValue({ role: 'ROLE_USER' });
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.userForm.get('password')?.updateValueAndValidity();
    this.isUserModalVisible = true;
  }

  openEditUserModal(user: User): void {
    this.isEditMode = true;
    this.editingUserId = user.id!;
    this.userForm.patchValue({
      username: user.username,
      email: user.email,
      role: user.role,
      password: ''
    });
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
    this.isUserModalVisible = true;
  }

  closeUserModal(): void {
    this.isUserModalVisible = false;
    this.userForm.reset();
    this.isEditMode = false;
    this.editingUserId = null;
  }

  submitUser(): void {
    if (this.userForm.valid) {
      this.isLoading = true;
      
      if (this.isEditMode && this.editingUserId) {
        const updateData: UpdateUserRequest = {
          username: this.userForm.value.username,
          email: this.userForm.value.email,
          role: this.userForm.value.role
        };
        
        if (this.userForm.value.password) {
          updateData.password = this.userForm.value.password;
        }

        this.userService.updateUser(this.editingUserId, updateData).subscribe({
          next: (response) => {
            console.log('Update response:', response);
            this.showSuccessMessage('User updated successfully');
            this.closeUserModal();
            this.loadUsers();
            this.isLoading = false;
          },
          error: (error) => {
            console.error('Error updating user:', error);
            console.log('Update error details:', error.error);
            
            let errorMessage = 'Failed to update user';
            if (error.error) {
              if (typeof error.error === 'string') {
                try {
                  const parsedError = JSON.parse(error.error);
                  errorMessage = parsedError.error || parsedError.message || error.error;
                } catch {
                  errorMessage = error.error;
                }
              } else if (error.error.error) {
                errorMessage = error.error.error;
              } else if (error.error.message) {
                errorMessage = error.error.message;
              }
            } else if (error.message) {
              errorMessage = error.message;
            }
            
            this.showErrorMessage(errorMessage);
            this.isLoading = false;
          }
        });
      } else {
        const createData: CreateUserRequest = {
          username: this.userForm.value.username,
          email: this.userForm.value.email,
          password: this.userForm.value.password,
          role: this.userForm.value.role
        };

        this.userService.createUser(createData).subscribe({
          next: () => {
            this.showSuccessMessage('User created successfully');
            this.closeUserModal();
            this.loadUsers();
            this.isLoading = false;
          },
          error: (error) => {
            console.error('Error creating user:', error);
            console.log('Request payload:', createData);
            console.log('Error details:', error.error);
            
            let errorMessage = 'Failed to create user';
            if (error.error) {
              if (typeof error.error === 'string') {
                try {
                  const parsedError = JSON.parse(error.error);
                  errorMessage = parsedError.error || parsedError.message || error.error;
                } catch {
                  errorMessage = error.error;
                }
              } else if (error.error.error) {
                errorMessage = error.error.error;
              } else if (error.error.message) {
                errorMessage = error.error.message;
              }
            } else if (error.message) {
              errorMessage = error.message;
            }
            
            this.showErrorMessage(errorMessage);
            this.isLoading = false;
          }
        });
      }
    }
  }

  openDeleteConfirm(user: User): void {
    this.userToDelete = user;
    this.isDeleteConfirmVisible = true;
  }

  closeDeleteConfirm(): void {
    this.isDeleteConfirmVisible = false;
    this.userToDelete = null;
  }

  confirmDelete(): void {
    if (this.userToDelete?.id) {
      this.isLoading = true;
      this.userService.deleteUser(this.userToDelete.id).subscribe({
        next: () => {
          this.showSuccessMessage('User deleted successfully');
          this.closeDeleteConfirm();
          this.loadUsers();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error deleting user:', error);
          this.showErrorMessage('Failed to delete user');
          this.isLoading = false;
        }
      });
    }
  }

  // Permission Management
  openPermissionModal(user: User): void {
    this.selectedUser = user;
    this.loadUserPermissions(user.id!);
    this.isPermissionModalVisible = true;
  }

  closePermissionModal(): void {
    this.isPermissionModalVisible = false;
    this.selectedUser = null;
    this.userPermissions = [];
  }

  loadUserPermissions(userId: number): void {
    this.userService.getUserPermissions(userId).subscribe({
      next: (permissions) => {
        this.userPermissions = permissions;
        this.updatePermissionForm(permissions);
      },
      error: (error) => {
        console.error('Error loading permissions:', error);
        this.showErrorMessage('Failed to load user permissions');
      }
    });
  }

  updatePermissionForm(permissions: Permission[]): void {
    this.availableRoutes.forEach(route => {
      const permission = permissions.find(p => p.route === route.route);
      this.permissionForm.get(route.route)?.setValue(permission?.canAccess || false);
    });
  }

  submitPermissions(): void {
    if (this.selectedUser?.id) {
      const permissions: Permission[] = this.availableRoutes.map(route => ({
        route: route.route,
        canAccess: this.permissionForm.get(route.route)?.value || false
      }));

      this.userService.updateUserPermissions(this.selectedUser.id, permissions).subscribe({
        next: () => {
          this.showSuccessMessage('Permissions updated successfully');
          this.closePermissionModal();
        },
        error: (error) => {
          console.error('Error updating permissions:', error);
          this.showErrorMessage('Failed to update permissions');
        }
      });
    }
  }

  // Search and Filter
  applySearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredUsers = this.users;
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredUsers = this.users.filter(user =>
        user.username.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.role.toLowerCase().includes(term)
      );
    }
    this.totalUsers = this.filteredUsers.length;
  }

  onSearchChange(): void {
    this.applySearch();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applySearch();
  }

  // Pagination
  get paginatedUsers(): User[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredUsers.slice(startIndex, startIndex + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.totalUsers / this.pageSize);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  // Utility Methods
  getRoleLabel(role: string): string {
    const roleObj = this.userRoles.find(r => r.value === role);
    return roleObj ? roleObj.label : role;
  }

  showSuccessMessage(message: string): void {
    this.successMessage = message;
    this.errorMessage = '';
    setTimeout(() => {
      this.successMessage = '';
    }, 5000);
  }

  showErrorMessage(message: string): void {
    this.errorMessage = message;
    this.successMessage = '';
    setTimeout(() => {
      this.errorMessage = '';
    }, 5000);
  }
}
