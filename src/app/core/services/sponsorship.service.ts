import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  Sponsorship, 
  CreateSponsorshipRequest, 
  UpdateSponsorshipRequest,
  Gift,
  CreateGiftRequest,
  SponsorshipWithGifts,
  SponsorshipType
} from '../models/sponsorship.model';

@Injectable({
  providedIn: 'root'
})
export class SponsorshipService {
  private baseUrl = `${environment.apiUrl}/api/sponsorships`;
  
  // For development/testing when backend is not available
  private useMockData = true; // Set to false when backend is ready
  
  // Mock sponsorships data
  private mockSponsorships: {[key: number]: SponsorshipWithGifts[]} = {
    1: [
      { 
        id: 201, 
        orphanId: 1, 
        donorId: 1, 
        orphanName: 'Fatima Ali', 
        sponsorshipType: SponsorshipType.MONTHLY, 
        startDate: '2025-01-15',
        gifts: [
          { id: 301, sponsorshipId: 201, giftName: 'Eid Gift', giftValue: 200, giftDate: '2025-06-15', description: 'Eid celebration gift' }
        ]
      },
      { 
        id: 202, 
        orphanId: 2, 
        donorId: 1, 
        orphanName: 'Mohammed Salah', 
        sponsorshipType: SponsorshipType.YEARLY, 
        startDate: '2025-03-10',
        gifts: [
          { id: 302, sponsorshipId: 202, giftName: 'School Supplies', giftValue: 150, giftDate: '2025-08-01', description: 'Back to school supplies' }
        ]
      }
    ],
    2: [
      { 
        id: 203, 
        orphanId: 3, 
        donorId: 2, 
        orphanName: 'Aisha Rahman', 
        sponsorshipType: SponsorshipType.MONTHLY, 
        startDate: '2025-02-20',
        gifts: [
          { id: 303, sponsorshipId: 203, giftName: 'Birthday Gift', giftValue: 100, giftDate: '2025-07-25', description: 'Birthday celebration' }
        ]
      }
    ],
    3: [
      { 
        id: 204, 
        orphanId: 4, 
        donorId: 3, 
        orphanName: 'Yusuf Khan', 
        sponsorshipType: SponsorshipType.YEARLY, 
        startDate: '2025-01-05',
        gifts: [
          { id: 304, sponsorshipId: 204, giftName: 'Winter Clothes', giftValue: 250, giftDate: '2025-07-10', description: 'Winter clothing package' }
        ]
      },
      { 
        id: 205, 
        orphanId: 5, 
        donorId: 3, 
        orphanName: 'Zainab Omar', 
        sponsorshipType: SponsorshipType.MONTHLY, 
        startDate: '2025-04-15',
        gifts: [
          { id: 305, sponsorshipId: 205, giftName: 'Medical Aid', giftValue: 300, giftDate: '2025-08-05', description: 'Medical assistance' }
        ]
      }
    ]
  };

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  // Get all sponsorships
  getAllSponsorships(): Observable<Sponsorship[]> {
    return this.http.get<Sponsorship[]>(this.baseUrl, { headers: this.getAuthHeaders() });
  }

  // Get sponsorship by ID
  getSponsorshipById(id: number): Observable<SponsorshipWithGifts> {
    return this.http.get<SponsorshipWithGifts>(`${this.baseUrl}/${id}`, { headers: this.getAuthHeaders() });
  }

  // Get sponsorships by orphan ID
  getSponsorshipsByOrphanId(orphanId: number): Observable<SponsorshipWithGifts[]> {
    return this.http.get<SponsorshipWithGifts[]>(`${this.baseUrl}/orphan/${orphanId}`, { headers: this.getAuthHeaders() });
  }

  // Get sponsorships by donor ID
  getSponsorshipsByDonorId(donorId: number): Observable<SponsorshipWithGifts[]> {
    return this.http.get<SponsorshipWithGifts[]>(`${this.baseUrl}/donor/${donorId}`, { headers: this.getAuthHeaders() });
  }

  // Create new sponsorship
  createSponsorship(sponsorship: CreateSponsorshipRequest): Observable<Sponsorship> {
    return this.http.post<Sponsorship>(this.baseUrl, sponsorship, { headers: this.getAuthHeaders() });
  }

  // Create multiple sponsorships for a donor
  createMultipleSponsorships(sponsorships: CreateSponsorshipRequest[]): Observable<Sponsorship[]> {
    return this.http.post<Sponsorship[]>(`${this.baseUrl}/multiple`, sponsorships, { headers: this.getAuthHeaders() });
  }

  // Update sponsorship
  updateSponsorship(id: number, sponsorship: UpdateSponsorshipRequest): Observable<Sponsorship> {
    return this.http.put<Sponsorship>(`${this.baseUrl}/${id}`, sponsorship, { headers: this.getAuthHeaders() });
  }

  // Delete sponsorship
  deleteSponsorship(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`, { headers: this.getAuthHeaders() });
  }

  // Cancel sponsorship (sets end date to current date and status to CANCELLED)
  cancelSponsorship(id: number): Observable<Sponsorship> {
    // Use the dedicated cancel endpoint
    return this.http.put<Sponsorship>(`${this.baseUrl}/${id}/cancel`, {}, { headers: this.getAuthHeaders() });
  }

  // Gift management
  createGift(gift: CreateGiftRequest): Observable<Gift> {
    // For Java LocalDate, we need to send the date in ISO format
    const formattedGift = {
      sponsorshipId: Number(gift.sponsorshipId),
      giftTypeId: gift.giftTypeId || null,
      giftTypeName: gift.giftTypeName || null,
      giftName: gift.giftName,
      // Keep the date in ISO format (YYYY-MM-DD) which Spring can parse
      giftDate: gift.giftDate,
      description: gift.description || '',
      giftValue: Number(gift.giftValue)
    };
    
    console.log('Formatted gift data for backend:', formattedGift);
    return this.http.post<Gift>(`${this.baseUrl}/gifts`, formattedGift, { headers: this.getAuthHeaders() });
  }

  // Get gifts by sponsorship ID
  getGiftsBySponsorshipId(sponsorshipId: number): Observable<Gift[]> {
    return this.http.get<Gift[]>(`${this.baseUrl}/${sponsorshipId}/gifts`, { headers: this.getAuthHeaders() });
  }

  // Update gift
  updateGift(giftId: number, gift: Partial<CreateGiftRequest>): Observable<Gift> {
    return this.http.put<Gift>(`${this.baseUrl}/gifts/${giftId}`, gift, { headers: this.getAuthHeaders() });
  }

  // Delete gift
  deleteGift(giftId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/gifts/${giftId}`, { headers: this.getAuthHeaders() });
  }
}
