export interface OrphanListDTO {
  id: number;
  orphanId: string;
  photo?: string;
  lastName: string;
  firstName: string;
  dob: string;
  gender: string;
  location: string;
  country: string;
  healthStatus: string;
  
  // Sponsorship Information
  isSponsored?: boolean;
  sponsorships?: SponsorshipInfo[];
  
  // Legacy Kafala Information (to be deprecated)
  kafalaAmount?: number;
  kafalaFrequency?: string;
  donorName?: string;
  donorId?: number;
  hasKafala?: boolean;
}

export interface SponsorshipInfo {
  id: number;
  orphanId: number;
  donorId: number;
  orphanName?: string;
  donorName?: string;
  sponsorshipType: string;
  startDate: string;
  endDate?: string;
  gifts?: any[];
}
