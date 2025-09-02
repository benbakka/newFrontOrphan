export interface User {
  id?: number;
  username: string;
  email: string;
  password?: string;
  role: string;
  permissions?: Permission[];
}

export interface Permission {
  route: string;
  canAccess: boolean;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role: string;
}

export interface UpdateUserRequest {
  username: string;
  email: string;
  password?: string;
  role: string;
}

export interface UserListDTO {
  id: number;
  username: string;
  email: string;
  role: string;
}

// Available routes for permission management
export const AVAILABLE_ROUTES = [
  { route: '/dashboard', name: 'Dashboard', description: 'Main dashboard page' },
  { route: '/orphan-management', name: 'Orphan Management', description: 'Manage orphans' },
  { route: '/donor-management', name: 'Donor Management', description: 'Manage donors' },
  { route: '/gifts', name: 'Gift Types & Funds', description: 'Manage gift types and funds' },
  { route: '/charity-projects', name: 'Charity Projects', description: 'Manage charity projects' },
  { route: '/user-management', name: 'User Management', description: 'Manage users and permissions' },
  { route: '/reports', name: 'Reports', description: 'View reports and analytics' }
];

export const USER_ROLES = [
  { value: 'ROLE_ADMIN', label: 'Administrator' },
  { value: 'ROLE_USER', label: 'User' },
  { value: 'ROLE_VIEWER', label: 'Viewer' }
];
