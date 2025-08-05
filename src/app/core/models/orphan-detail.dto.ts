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
  
  // Kafala Information
  kafalaAmount?: number;
  kafalaFrequency?: string;
  donorName?: string;
  donorId?: number;
  hasKafala?: boolean;
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
