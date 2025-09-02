import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Donor, DonorDetailDTO, DonorListDTO } from '../models/donor.model';
import { OrphanListDTO } from '../models/orphan-list.dto';
import { DonorAdvancedSearchRequest } from '../models/donor-advanced-search.model';

@Injectable({
  providedIn: 'root'
})
export class DonorService {
  private baseUrl = `${environment.apiUrl}/api/donors`;

  constructor(private http: HttpClient) {}

  // Helper method to include Authorization headers
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  // Fetch all donors
  getDonors(): Observable<Donor[]> {
    return this.http.get<Donor[]>(this.baseUrl, { headers: this.getAuthHeaders() });
  }

  // Fetch a donor by ID
  getDonorById(id: number): Observable<Donor> {
    return this.http.get<Donor>(`${this.baseUrl}/${id}`, { headers: this.getAuthHeaders() });
  }

  // Create a new donor
  createDonor(donor: Donor): Observable<Donor> {
    return this.http.post<Donor>(this.baseUrl, donor, { headers: this.getAuthHeaders() });
  }

  // Update an existing donor
  updateDonor(id: number, donor: Donor): Observable<Donor> {
    return this.http.put<Donor>(`${this.baseUrl}/${id}`, donor, { headers: this.getAuthHeaders() });
  }

  // Delete a donor by ID
  deleteDonor(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`, { headers: this.getAuthHeaders() });
  }

  // Delete all donors
  deleteAllDonors(): Observable<any> {
    return this.http.delete(`${this.baseUrl}/all`, { headers: this.getAuthHeaders() });
  }

  // Upload Excel file
  uploadExcelFile(file: File): Observable<Donor[]> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Donor[]>(`${this.baseUrl}/upload`, formData, { headers: this.getAuthHeaders() });
  }

  // Get donation history by donor ID
  getDonationHistory(donorId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/${donorId}/donations`, { headers: this.getAuthHeaders() });
  }

  // Get donor details with gift information
  getDonorDetails(donorId: number): Observable<DonorDetailDTO> {
    return this.http.get<DonorDetailDTO>(`${this.baseUrl}/${donorId}/details`, { headers: this.getAuthHeaders() });
  }

  // Get available orphans for sponsorship (not currently sponsored)
  getAvailableOrphansForSponsorship(): Observable<OrphanListDTO[]> {
    return this.http.get<OrphanListDTO[]>(`${this.baseUrl}/available-orphans`, { headers: this.getAuthHeaders() });
  }

  // Create donor with multiple orphan sponsorships
  createDonorWithSponsorships(donor: Donor, orphanIds: number[], sponsorshipType: string, startDate: string): Observable<DonorDetailDTO> {
    const payload = {
      donor,
      orphanIds,
      sponsorshipType,
      startDate
    };
    return this.http.post<DonorDetailDTO>(`${this.baseUrl}/with-sponsorships`, payload, { headers: this.getAuthHeaders() });
  }

  // Advanced search donors with multiple filters
  // Temporary client-side implementation until backend is ready
  advancedSearchDonors(searchRequest: DonorAdvancedSearchRequest): Observable<Donor[]> {
    // Get all donors and filter them client-side
    return this.getDonors().pipe(
      map((donors: Donor[]) => this.filterDonorsBySearchCriteria(donors, searchRequest))
    );
  }

  // Client-side filtering implementation
  private filterDonorsBySearchCriteria(donors: Donor[], criteria: DonorAdvancedSearchRequest): Donor[] {
    if (!criteria || Object.keys(criteria).length === 0) {
      return donors;
    }

    return donors.filter(donor => {
      // Personal Info filters
      if (criteria.firstName && !donor.firstName?.toLowerCase().includes(criteria.firstName.toLowerCase())) {
        return false;
      }
      if (criteria.lastName && !donor.lastName?.toLowerCase().includes(criteria.lastName.toLowerCase())) {
        return false;
      }
      if (criteria.email && !donor.email?.toLowerCase().includes(criteria.email.toLowerCase())) {
        return false;
      }
      if (criteria.phone && !donor.phone?.includes(criteria.phone)) {
        return false;
      }
      if (criteria.city && !donor.city?.toLowerCase().includes(criteria.city.toLowerCase())) {
        return false;
      }
      if (criteria.country && !donor.country?.toLowerCase().includes(criteria.country.toLowerCase())) {
        return false;
      }
      
      // Donation Info filters - basic implementation
      // Note: These filters would normally be handled by the backend
      // This is a simplified version for client-side filtering
      
      // Sponsorship Info filters - basic implementation
      // Note: These filters would normally be handled by the backend
      
      // Other Info filters
      if (criteria.donorId && donor.id !== parseInt(criteria.donorId.toString(), 10)) {
        return false;
      }
      
      return true;
    });
  }
}
