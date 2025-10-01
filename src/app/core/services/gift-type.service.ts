import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { GiftType, CreateGiftTypeRequest, GiftTypeBalance } from '../models/gift-type.model';
import { Donation } from '../models/donation.model';
import { Gift } from '../models/gift.model';
import { environment } from '../../../environments/environment';
import {AmountPerDonor} from '../models/amountPerDonor.model';

@Injectable({
  providedIn: 'root'
})
export class GiftTypeService {
  private apiUrl = `${environment.apiUrl}/api/gift-types`;

  constructor(private http: HttpClient) {}

  // Get all active gift types
  getAllActiveGiftTypes(): Observable<GiftType[]> {
    return this.http.get<GiftType[]>(this.apiUrl);
  }

  // Get all gift types with their balances
  getAllGiftTypesWithBalances(): Observable<GiftType[]> {
    console.log('Making API call to:', `${this.apiUrl}/with-balances`);
    return this.http.get<GiftType[]>(`${this.apiUrl}/with-balances`);
  }
  // Get all gift types with their balances
  findByDonorId( donorId:number): Observable<AmountPerDonor[]> {
    // console.log('Making API call to:', `${environment.apiUrl}/api/amount`);
    return this.http.get<AmountPerDonor[]>(`${environment.apiUrl}/api/amount/donor/${donorId}`);
  }
  // Simple fallback method
  getAllGiftTypesSimple(): Observable<GiftType[]> {
    console.log('Making simple API call to:', `${this.apiUrl}/simple`);
    return this.http.get<GiftType[]>(`${this.apiUrl}/simple`);
  }

  // Get gift type by ID
  getGiftTypeById(id: number): Observable<GiftType> {
    return this.http.get<GiftType>(`${this.apiUrl}/${id}`);
  }

  // Create new gift type
  createGiftType(request: CreateGiftTypeRequest): Observable<GiftType> {
    return this.http.post<GiftType>(this.apiUrl, request);
  }

  // Update gift type
  updateGiftType(id: number, request: CreateGiftTypeRequest): Observable<GiftType> {
    return this.http.put<GiftType>(`${this.apiUrl}/${id}`, request);
  }

  // Deactivate gift type
  deactivateGiftType(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // Get current balance for gift type
  getGiftTypeBalance(id: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/${id}/balance`);
  }

  // Check if gift type has sufficient balance
  checkSufficientBalance(id: number, amount: number): Observable<boolean> {
    const params = new HttpParams().set('amount', amount.toString());
    return this.http.get<boolean>(`${this.apiUrl}/${id}/check-balance`, { params });
  }

  // Get balance details for gift type
  getBalanceDetails(id: number): Observable<GiftType> {
    return this.http.get<GiftType>(`${this.apiUrl}/${id}/balance-details`);
  }

  // Initialize default gift types
  initializeDefaultGiftTypes(): Observable<any> {
    return this.http.post(`${this.apiUrl}/initialize-defaults`, {});
  }

  // Find or create gift type by name
  findOrCreateGiftType(name: string): Observable<GiftType> {
    const params = new HttpParams().set('name', name);
    return this.http.post<GiftType>(`${this.apiUrl}/find-or-create`, null, { params });
  }

  // Get donations for a specific gift type
  getDonationsByGiftType(giftTypeId: number): Observable<Donation[]> {
    return this.http.get<Donation[]>(`${this.apiUrl}/${giftTypeId}/donations`);
  }

  // Get expenses (gifts) for a specific gift type
  getExpensesByGiftType(giftTypeId: number): Observable<Gift[]> {
    return this.http.get<Gift[]>(`${this.apiUrl}/${giftTypeId}/expenses`);
  }
}
