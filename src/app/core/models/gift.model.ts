export interface Gift {
  id?: number;
  donorId: number;
  donorName?: string;
  orphanId: number;
  orphanName?: string;
  amount: number;
  date: string;
  description?: string;
  giftType: GiftType;
  kafalaFrequency?: KafalaFrequency;
  isKafala?: boolean;
}

export interface CreateGiftRequest {
  donorId: number;
  orphanId: number;
  amount: number;
  date?: string;
  description?: string;
  giftType: GiftType;
  kafalaFrequency?: KafalaFrequency;
  isKafala?: boolean;
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
