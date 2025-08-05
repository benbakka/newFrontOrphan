import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Donor } from '../models/donor.model';
import { DonorDetailDTO } from '../models/gift.model';

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
}
