export interface AmountPerDonor {
  id?: number;
  amount: number;
  donor: Donor;
  giftType : GiftType;
}
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
