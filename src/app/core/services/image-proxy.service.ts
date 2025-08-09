import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ImageProxyService {
  private apiUrl = `${environment.apiUrl}/api/proxy`;

  constructor(private http: HttpClient) {}

  /**
   * Fetch image from URL via backend proxy and return as base64 data URL
   * This bypasses CORS issues with Google Drive and other cloud storage URLs
   */
  getImageAsBase64(imageUrl: string): Observable<{data: string}> {
    return this.http.post<{data: string}>(`${this.apiUrl}/image`, { url: imageUrl });
  }
}
