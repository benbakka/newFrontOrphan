import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { 
  Donation, 
  CreateDonationRequest, 
  DonorBalance, 
  DonorStatistics 
} from '../models/donation.model';

@Injectable({
  providedIn: 'root'
})
export class DonationService {
  private baseUrl = `${environment.apiUrl}/api/donations`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  // Get all donations
  getAllDonations(): Observable<Donation[]> {
    return this.http.get<Donation[]>(this.baseUrl, { headers: this.getAuthHeaders() });
  }

  // Get donations by donor ID
  getDonationsByDonorId(donorId: number): Observable<Donation[]> {
    return this.http.get<any[]>(`${this.baseUrl}/donor/${donorId}`, { headers: this.getAuthHeaders() })
      .pipe(
        map(donations => donations.map(donation => ({
          id: donation.id,
          donorId: donation.donorId,
          giftTypeId: donation.giftTypeId,
          giftTypeName: donation.giftTypeName,
          amount: donation.amount,
          donationDate: donation.donationDate,
          description: donation.description,
          donorName: donation.donorName,
          paymentMethod: donation.paymentMethod,
          referenceNumber: donation.referenceNumber
        })))
      );
  }

  // Create new donation
  createDonation(donation: CreateDonationRequest): Observable<Donation> {
    return this.http.post<Donation>(this.baseUrl, donation, { headers: this.getAuthHeaders() });
  }

  // Update donation
  updateDonation(id: number, donation: Partial<CreateDonationRequest>): Observable<Donation> {
    return this.http.put<Donation>(`${this.baseUrl}/${id}`, donation, { headers: this.getAuthHeaders() });
  }

  // Delete donation
  deleteDonation(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`, { headers: this.getAuthHeaders() });
  }

  // Get donor balance
  getDonorBalance(donorId: number): Observable<DonorBalance> {
    return this.http.get<DonorBalance>(`${this.baseUrl}/donor/${donorId}/balance`, { headers: this.getAuthHeaders() });
  }

  // Get donor statistics
  getDonorStatistics(donorId: number): Observable<DonorStatistics> {
    return this.http.get<DonorStatistics>(`${this.baseUrl}/donor/${donorId}/statistics`, { headers: this.getAuthHeaders() });
  }

  // Check if donor has sufficient balance for gift
  checkSufficientBalance(donorId: number, giftValue: number): Observable<boolean> {
    return this.http.get<boolean>(`${this.baseUrl}/donor/${donorId}/check-balance/${giftValue}`, { headers: this.getAuthHeaders() });
  }
}
