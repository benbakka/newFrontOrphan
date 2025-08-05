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
  
  // Kafala Information
  kafalaAmount?: number;
  kafalaFrequency?: string;
  donorName?: string;
  donorId?: number;
  hasKafala?: boolean;
}
