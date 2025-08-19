import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Gift, CreateGiftRequest, CreateGiftRequestV2 } from '../models/gift.model';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GiftService {
  private apiUrl = `${environment.apiUrl}/api/gifts`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getAllGifts(): Observable<Gift[]> {
    return this.http.get<Gift[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  getGiftsByOrphan(orphanId: number): Observable<Gift[]> {
    return this.http.get<Gift[]>(`${this.apiUrl}/orphan/${orphanId}`, { headers: this.getHeaders() });
  }

  getGiftsByProject(projectId: number): Observable<Gift[]> {
    // Try multiple possible endpoints based on backend structure
    return this.http.get<Gift[]>(`${this.apiUrl}/beneficiary/project/${projectId}`, { headers: this.getHeaders() });
  }

  getGiftsByDonor(donorId: number): Observable<Gift[]> {
    return this.http.get<Gift[]>(`${this.apiUrl}/donor/${donorId}`, { headers: this.getHeaders() });
  }

  getKafalaByOrphan(orphanId: number): Observable<Gift[]> {
    return this.http.get<Gift[]>(`${this.apiUrl}/kafala/orphan/${orphanId}`, { headers: this.getHeaders() });
  }

  getTotalDonationsByDonor(donorId: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/total/donor/${donorId}`, { headers: this.getHeaders() });
  }

  getTotalGiftsByOrphan(orphanId: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/total/orphan/${orphanId}`, { headers: this.getHeaders() });
  }

  getGiftById(giftId: number): Observable<Gift> {
    return this.http.get<Gift>(`${this.apiUrl}/${giftId}`, { headers: this.getHeaders() });
  }

  createGift(request: CreateGiftRequest): Observable<Gift> {
    return this.http.post<Gift>(this.apiUrl, request, { headers: this.getHeaders() });
  }

  // New gift creation method with improved structure
  createGiftV2(request: CreateGiftRequestV2): Observable<Gift> {
    return this.http.post<Gift>(`${this.apiUrl}/v2`, request, { headers: this.getHeaders() });
  }

  // Check if gift type has sufficient balance
  checkGiftTypeBalance(giftTypeId: number, amount: number): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/check-balance/${giftTypeId}/${amount}`, { headers: this.getHeaders() });
  }

  recalculateProjectAmounts(): Observable<string> {
    return this.http.post<string>(`${this.apiUrl}/recalculate-project-amounts`, {}, { headers: this.getHeaders() });
  }

  debugProjectGifts(projectId: number): Observable<string> {
    return this.http.get<string>(`${this.apiUrl}/debug/project/${projectId}`, { headers: this.getHeaders() });
  }

  updateGift(giftId: number, request: CreateGiftRequest): Observable<Gift> {
    return this.http.put<Gift>(`${this.apiUrl}/${giftId}`, request, { headers: this.getHeaders() });
  }

  // New gift update method with improved structure
  updateGiftV2(giftId: number, request: CreateGiftRequestV2): Observable<Gift> {
    return this.http.put<Gift>(`${this.apiUrl}/v2/${giftId}`, request, { headers: this.getHeaders() });
  }

  deleteGift(giftId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${giftId}`, { headers: this.getHeaders() });
  }
}
