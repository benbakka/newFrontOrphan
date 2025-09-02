export interface DonorAdvancedSearchRequest {
  // Personal Info
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  city?: string;
  country?: string;
  
  // Donation Info
  hasDonations?: boolean;
  donationAmountFrom?: number;
  donationAmountTo?: number;
  donationDateFrom?: string;
  donationDateTo?: string;
  
  // Sponsorship Info
  hasActiveSponsorships?: boolean;
  sponsorshipType?: string;
  
  // Other Info
  registrationDateFrom?: string;
  registrationDateTo?: string;
  donorId?: string;
}

export interface DonorAdvancedSearchFormData {
  // Personal Info
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  
  // Donation Info
  hasDonations: string; // 'true', 'false', or ''
  donationAmountFrom: number | null;
  donationAmountTo: number | null;
  donationDateFrom: string;
  donationDateTo: string;
  
  // Sponsorship Info
  hasActiveSponsorships: string; // 'true', 'false', or ''
  sponsorshipType: string;
  
  // Other Info
  registrationDateFrom: string;
  registrationDateTo: string;
  donorId: string;
}
