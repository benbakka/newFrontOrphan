import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Gift, CreateGiftRequest } from '../models/gift.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class GiftService {
  private apiUrl = 'http://localhost:8080/api/gifts';

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

  updateGift(giftId: number, request: CreateGiftRequest): Observable<Gift> {
    return this.http.put<Gift>(`${this.apiUrl}/${giftId}`, request, { headers: this.getHeaders() });
  }

  deleteGift(giftId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${giftId}`, { headers: this.getHeaders() });
  }
}
