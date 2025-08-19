import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { OrphanDocument, UploadDocumentRequest, DocumentType } from '../../shared/models/orphan-document.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OrphanDocumentService {
  public apiUrl = `${environment.apiUrl}/api/orphans/documents`;

  constructor(private http: HttpClient) {}

  uploadDocument(file: File, request: UploadDocumentRequest): Observable<OrphanDocument> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentInfo', JSON.stringify(request));

    return this.http.post<OrphanDocument>(`${this.apiUrl}/upload`, formData);
  }

  getDocumentsByOrphanId(orphanId: number): Observable<OrphanDocument[]> {
    return this.http.get<OrphanDocument[]>(`${this.apiUrl}/orphan/${orphanId}`);
  }

  getDocumentById(documentId: number): Observable<OrphanDocument> {
    return this.http.get<OrphanDocument>(`${this.apiUrl}/${documentId}`);
  }

  downloadDocument(documentId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${documentId}/download`, {
      responseType: 'blob'
    });
  }

  previewDocument(documentId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${documentId}/preview`, {
      responseType: 'blob'
    });
  }

  deleteDocument(documentId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${documentId}`);
  }

  getDocumentCount(orphanId: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/orphan/${orphanId}/count`);
  }

  getTotalFileSize(orphanId: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/orphan/${orphanId}/total-size`);
  }

  getDocumentTypes(): Observable<DocumentType[]> {
    return this.http.get<DocumentType[]>(`${this.apiUrl}/document-types`);
  }

  // Helper methods
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  isValidFileType(file: File): boolean {
    const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg', 'application/pdf'];
    return allowedTypes.includes(file.type);
  }

  getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) {
      return 'fas fa-image';
    } else if (mimeType === 'application/pdf') {
      return 'fas fa-file-pdf';
    }
    return 'fas fa-file';
  }

  getFileTypeColor(mimeType: string): string {
    if (mimeType.startsWith('image/')) {
      return 'text-success';
    } else if (mimeType === 'application/pdf') {
      return 'text-danger';
    }
    return 'text-secondary';
  }
}
