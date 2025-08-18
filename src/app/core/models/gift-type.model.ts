export interface GiftType {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  createdDate: string;
  totalDonations?: number;
  totalExpenses?: number;
  balance?: number;
  currentBalance?: number;
}

export interface CreateGiftTypeRequest {
  name: string;
  description?: string;
}

export interface GiftTypeBalance {
  giftTypeId: number;
  giftTypeName: string;
  totalDonations: number;
  totalExpenses: number;
  balance: number;
}
