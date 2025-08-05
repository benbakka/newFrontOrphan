import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OrphanListDTO } from '../models/orphan-list.dto';
import { OrphanDetailDTO } from '../models/orphan-detail.dto';

@Injectable({
  providedIn: 'root'
})
export class OrphanService {
  private apiUrl = `${environment.apiUrl}/api/orphans`;

  constructor(private http: HttpClient) {}

  // Optimized: Get all orphans with minimal data for list view
  getAllOrphans(): Observable<OrphanListDTO[]> {
    return this.http.get<OrphanListDTO[]>(this.apiUrl);
  }

  // Get orphan details with full data including family and education
  getOrphanById(id: number): Observable<OrphanDetailDTO> {
    return this.http.get<OrphanDetailDTO>(`${this.apiUrl}/${id}`);
  }

  // Create new orphan
  createOrphan(orphan: OrphanDetailDTO, photo?: File): Observable<OrphanDetailDTO> {
    const formData = new FormData();
    if (photo) {
      formData.append('photo', photo);
    }
    formData.append('OrphanIDCard', JSON.stringify(this.convertDTOToEntity(orphan)));
    
    return this.http.post<OrphanDetailDTO>(this.apiUrl, formData);
  }

  // Update existing orphan
  updateOrphan(id: number, orphan: OrphanDetailDTO, photo?: File): Observable<OrphanDetailDTO> {
    const formData = new FormData();
    formData.append('OrphanIDCard', JSON.stringify(this.convertDTOToEntity(orphan)));
    if (photo) {
      formData.append('photo', photo);
    }
    
    return this.http.put<OrphanDetailDTO>(`${this.apiUrl}/${id}`, formData);
  }

  // Delete orphan
  deleteOrphan(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Get last orphan ID for a country
  getLastOrphanId(countryAbbr: string): Observable<string> {
    return this.http.get<string>(`${this.apiUrl}/last-orphan-id/${countryAbbr}`);
  }

  // Download ID card
  downloadIdCard(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/id-card`, { 
      responseType: 'blob' 
    });
  }

  // Upload Excel file
  uploadExcelFile(file: File): Observable<OrphanDetailDTO[]> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<OrphanDetailDTO[]>(`${this.apiUrl}/upload`, formData);
  }

  // Helper method to convert DTO to entity format for backend
  private convertDTOToEntity(dto: OrphanDetailDTO): any {
    return {
      id: dto.id,
      orphanId: dto.orphanId,
      lastName: dto.lastName,
      firstName: dto.firstName,
      dob: dto.dob,
      placeOfBirth: dto.placeOfBirth,
      gender: dto.gender,
      location: dto.location,
      country: dto.country,
      healthStatus: dto.healthStatus,
      specialNeeds: dto.specialNeeds,
      familyInformation: dto.familyInformation ? {
        id: dto.familyInformation.id,
        ethnicGroup: dto.familyInformation.ethnicGroup,
        spokenLanguage: dto.familyInformation.spokenLanguage,
        fatherName: dto.familyInformation.fatherName,
        fatherDateOfDeath: dto.familyInformation.fatherDateOfDeath,
        fatherCauseOfDeath: dto.familyInformation.fatherCauseOfDeath,
        motherName: dto.familyInformation.motherName,
        motherStatus: dto.familyInformation.motherStatus,
        motherDateOfDeath: dto.familyInformation.motherDateOfDeath,
        motherCauseOfDeath: dto.familyInformation.motherCauseOfDeath,
        numberOfSiblings: dto.familyInformation.numberOfSiblings,
        guardianName: dto.familyInformation.guardianName,
        relationToOrphan: dto.familyInformation.relationToOrphan,
        livingCondition: dto.familyInformation.livingCondition
      } : null,
      education: dto.education ? {
        id: dto.education.id,
        schoolName: dto.education.schoolName,
        gradeLevel: dto.education.gradeLevel,
        favoriteSubject: dto.education.favoriteSubject,
        educationNeeds: dto.education.educationNeeds,
        schoolPerformance: dto.education.schoolPerformance,
        orphanDream: dto.education.orphanDream,
        favoriteHobbies: dto.education.favoriteHobbies,
        supervisorComments: dto.education.supervisorComments
      } : null
    };
  }

  // Helper method to create empty orphan DTO
  createEmptyOrphan(): OrphanDetailDTO {
    return {
      orphanId: '',
      lastName: '',
      firstName: '',
      dob: '',
      placeOfBirth: '',
      gender: '',
      location: '',
      country: '',
      healthStatus: '',
      specialNeeds: '',
      familyInformation: {
        ethnicGroup: '',
        spokenLanguage: '',
        fatherName: '',
        motherName: '',
        motherStatus: '',
        numberOfSiblings: 0,
        guardianName: '',
        relationToOrphan: '',
        livingCondition: ''
      },
      education: {
        schoolName: '',
        gradeLevel: '',
        favoriteSubject: '',
        educationNeeds: '',
        schoolPerformance: '',
        orphanDream: '',
        favoriteHobbies: '',
        supervisorComments: ''
      }
    };
  }
}
