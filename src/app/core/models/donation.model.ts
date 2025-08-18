export interface Donation {
  id?: number;
  donorId: number;
  giftTypeId?: number;
  giftTypeName?: string;
  amount: number;
  donationDate: string;
  description?: string;
  donorName?: string;
  paymentMethod?: string;
  referenceNumber?: string;
}

export interface CreateDonationRequest {
  donorId: number;
  giftTypeId?: number;
  giftTypeName?: string; // For creating new gift types
  amount: number;
  donationDate: string;
  description?: string;
  paymentMethod?: string;
  referenceNumber?: string;
}

export interface DonorBalance {
  donorId: number;
  donorName: string;
  totalDonations: number;
  totalGifts: number;
  availableBalance: number;
}

export interface DonorStatistics {
  totalOrphansSponsored: number;
  totalGiftsGiven: number;
  totalSponsorshipDuration: number; // in months
  currentDonationBalance: number;
  totalDonations: number;
  totalGifts: number;
}
