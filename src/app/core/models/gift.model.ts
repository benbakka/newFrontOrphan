export interface Gift {
  id?: number;
  donorId: number;
  donorName?: string;
  orphanId?: number;
  orphanName?: string;
  projectId?: number;
  projectName?: string;
  amount: number;
  giftName?: string;
  giftDate: string; // Changed from 'date' to match backend
  description?: string;
  giftType: number | string; // Support both entity ID and legacy enum
  giftTypeName?: string;
  sponsorshipId?: number; // Added sponsorship relationship
  recipientName?: string; // Added for expenses display
}

export interface CreateGiftRequest {
  donorId: number;
  orphanId?: number;
  projectId?: number;
  sponsorshipId?: number; // Added sponsorship relationship
  amount: number;
  date?: string;
  giftName?: string;
  description?: string;
  giftType: number; // Gift type entity ID
}

// Updated gift creation request for new system
export interface CreateGiftRequestV2 {
  donorId?: number; // Optional - not required for orphan gifts without a donor
  giftTypeId: number;
  amount: number;
  giftName: string;
  date: string;
  description?: string;
  beneficiaryType: 'orphan' | 'project' | 'charity'; // Who benefits from the gift
  orphanId?: number; // Optional - only if beneficiaryType is 'orphan'
  projectId?: number; // Optional - only if beneficiaryType is 'project'
  sponsorshipId?: number; // Optional - only if linked to a sponsorship
}

export enum GiftType {
  KAFALA = 'KAFALA',
  DONATION = 'DONATION',
  SPONSORSHIP = 'SPONSORSHIP',
  EMERGENCY_AID = 'EMERGENCY_AID'
}

export enum KafalaFrequency {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY'
}

export enum BeneficiaryType {
  ORPHAN = 'orphan',
  PROJECT = 'project',
  CHARITY = 'charity'
}

export interface DonorDetailDTO {
  id: number;
  donorId: string;
  name: string;
  address: string;
  addressTwo?: string;
  phone: string;
  city: string;
  state: string;
  zip: string;
  company?: string;
  email: string;
  country: string;
  totalDonations: number;
  numberOfGifts: number;
  sponsoredOrphans: string[];
  recentGifts: Gift[];
}
