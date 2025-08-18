export interface CharityProject {
  id?: number;
  name: string;
  type: string;
  description?: string;
  targetAmount: number;
  collectedAmount: number;
  status: ProjectStatus;
  startDate: string;
  endDate?: string;
  createdDate?: string;
  progressPercentage?: number;
}

export enum ProjectStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface CreateCharityProjectRequest {
  name: string;
  type: string;
  description?: string;
  targetAmount: number;
  collectedAmount?: number;
  status: ProjectStatus;
  startDate: string;
  endDate?: string;
}

export interface CharityProjectPage {
  content: CharityProject[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}
