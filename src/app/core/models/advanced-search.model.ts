export interface AdvancedSearchRequest {
  // Personal Info
  name?: string;
  gender?: string;
  ageFrom?: number;
  ageTo?: number;
  country?: string;
  city?: string;
  placeOfBirth?: string;
  
  // Sponsorship Info
  isSponsored?: boolean;
  sponsorshipType?: string;
  sponsorshipStartDate?: string;
  sponsorshipEndDate?: string;
  
  // Other Info
  healthStatus?: string;
  educationLevel?: string;
  projectParticipation?: boolean;
  registrationDateFrom?: string;
  registrationDateTo?: string;
  guardianName?: string;
  orphanId?: string;
}

export interface AdvancedSearchFormData {
  // Personal Info
  name: string;
  gender: string;
  ageFrom: number | null;
  ageTo: number | null;
  country: string;
  city: string;
  placeOfBirth: string;
  
  // Sponsorship Info
  isSponsored: string; // 'true', 'false', or ''
  sponsorshipType: string;
  sponsorshipStartDate: string;
  sponsorshipEndDate: string;
  
  // Other Info
  healthStatus: string;
  educationLevel: string;
  projectParticipation: string; // 'true', 'false', or ''
  registrationDateFrom: string;
  registrationDateTo: string;
  guardianName: string;
  orphanId: string;
}
