export interface CharityProject {
  id: number;
  name: string;
  description?: string;
  targetAmount: number;
  raisedAmount?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
  imageUrl?: string;
  category?: string;
}
