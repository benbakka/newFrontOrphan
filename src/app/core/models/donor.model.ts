export interface Donor {
  id?: number;
  donorId?: string;
  firstName: string;
  lastName: string;
  address: string;
  addressTwo?: string;
  phone: string;
  city: string;
  state: string;
  zip: string;
  company?: string;
  email: string;
  country: string;
}

export interface DonorListDTO {
  id: number;
  donorId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  company?: string;
  totalOrphansSponsored?: number;
  currentDonationBalance?: number;
}

export interface DonorDetailDTO {
  id: number;
  donorId: string;
  firstName: string;
  lastName: string;
  address: string;
  addressTwo?: string;
  phone: string;
  city: string;
  state: string;
  zip: string;
  company?: string;
  email: string;
  country: string;
  sponsorships?: DonorSponsorshipInfo[];
  donations?: DonorDonationInfo[];
  statistics?: DonorStatisticsInfo;
}

export interface DonorSponsorshipInfo {
  id: number;
  orphanId: number;
  orphanName: string;
  sponsorshipType: 'MONTHLY' | 'YEARLY';
  startDate: string;
  endDate?: string;
  gifts?: DonorGiftInfo[];
  isLimited?: boolean;
}

export interface DonorGiftInfo {
  id: number;
  giftName: string;
  giftDate: string;
  description?: string;
  giftValue: number;
  orphanName: string;
}

export interface DonorDonationInfo {
  id: number;
  amount: number;
  donationDate: string;
  description?: string;
}

export interface DonorStatisticsInfo {
  totalOrphansSponsored: number;
  totalGiftsGiven: number;
  totalSponsorshipDuration: number;
  currentDonationBalance: number;
  totalDonations: number;
  totalGifts: number;
}
