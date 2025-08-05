export interface Donor {
  id?: number;
  donorId?: string;
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
}

export interface DonorListDTO {
  id: number;
  donorId: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  company?: string;
}
