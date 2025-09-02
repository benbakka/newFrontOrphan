export interface Sponsorship {
  id?: number;
  orphanId: number;
  donorId: number;
  sponsorshipType: SponsorshipType;
  startDate: string;
  endDate?: string;
  status?: string;
  orphanName?: string;
  donorName?: string;
  giftValue?: number;
  isLimited?: boolean;
  gifts?: Gift[];
}

export interface CreateSponsorshipRequest {
  orphanId: number;
  donorId: number;
  sponsorshipType: SponsorshipType;
  startDate: string;
  endDate?: string;
  giftValue: number;
  isLimited?: boolean;
}

export interface UpdateSponsorshipRequest {
  donorId?: number;
  sponsorshipType?: SponsorshipType;
  startDate?: string;
  endDate?: string;
  giftValue?: number;
  isLimited?: boolean;
}

export enum SponsorshipType {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY'
}

export interface Gift {
  id?: number;
  sponsorshipId: number;
  giftName: string;
  giftDate: string;
  description?: string;
  giftValue: number;
  orphanName?: string;
  donorName?: string;
}

export interface CreateGiftRequest {
  sponsorshipId: number;
  giftTypeId?: number | null;
  giftTypeName?: string | null;
  giftName: string;
  giftDate: string;
  description?: string;
  giftValue: number;
}

export interface SponsorshipWithGifts extends Sponsorship {
  gifts: Gift[];
}
