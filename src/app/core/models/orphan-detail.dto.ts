export interface OrphanDetailDTO {
  id?: number;
  orphanId: string;
  photo?: string;
  lastName: string;
  firstName: string;
  dob: string;
  placeOfBirth: string;
  gender: string;
  location: string;
  country: string;
  healthStatus: string;
  specialNeeds: string;
  familyInformation?: FamilyInformationDTO;
  education?: EducationDTO;
  
  // Kafala Information (legacy)
  kafalaAmount?: number;
  kafalaFrequency?: string;
  donorName?: string;
  donorId?: number;
  hasKafala?: boolean;
  
  // Dynamic Sponsorship Status
  isSponsored?: boolean;
  
  // New Sponsorship Information
  sponsorships?: SponsorshipInfo[];
  currentSponsorship?: SponsorshipInfo;
}

export interface SponsorshipInfo {
  id: number;
  donorId: number;
  donorName: string;
  sponsorshipType: 'MONTHLY' | 'YEARLY';
  amount: number;
  status?: string;
  startDate: string;
  endDate?: string;
  gifts?: GiftInfo[];
}

export interface GiftInfo {
  id: number;
  giftName: string;
  giftDate: string;
  description?: string;
  giftValue: number;
}

export interface FamilyInformationDTO {
  id?: number;
  ethnicGroup: string;
  spokenLanguage: string;
  fatherName: string;
  fatherDateOfDeath?: string;
  fatherCauseOfDeath?: string;
  motherName: string;
  motherStatus: string;
  motherDateOfDeath?: string;
  motherCauseOfDeath?: string;
  numberOfSiblings: number;
  guardianName: string;
  relationToOrphan: string;
  livingCondition: string;
}

export interface EducationDTO {
  id?: number;
  schoolName: string;
  gradeLevel: string;
  favoriteSubject: string;
  educationNeeds: string;
  schoolPerformance: string;
  orphanDream: string;
  favoriteHobbies: string;
  supervisorComments: string;
}
