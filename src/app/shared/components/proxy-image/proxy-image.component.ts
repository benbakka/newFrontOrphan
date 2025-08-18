import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageProxyService } from '../../../core/services/image-proxy.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-proxy-image',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="image-container">
      <img 
        *ngIf="imageDataUrl && !loading && !error" 
        [src]="imageDataUrl" 
        [alt]="alt"
        [class]="imageClass"
        (error)="onImageError()"
      />
      <div *ngIf="loading" class="loading-placeholder">
        <div class="spinner"></div>
        Loading image...
      </div>
      <div *ngIf="error" class="error-placeholder">
        <span class="error-icon">📷</span>
        <span class="error-text">{{ errorMessage }}</span>
      </div>
      <div *ngIf="!imageUrl && !loading" class="no-image-placeholder">
        <span class="no-image-icon">👤</span>
        <span class="no-image-text">No photo</span>
      </div>
    </div>
  `,
  styles: [`
    .image-container {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      min-height: 100px;
    }
    
    img {
      max-width: 100%;
      max-height: 100%;
      object-fit: cover;
      border-radius: 4px;
    }
    
    .loading-placeholder, .error-placeholder, .no-image-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background-color: #f5f5f5;
      border-radius: 4px;
      color: #666;
      text-align: center;
      min-height: 100px;
      width: 100%;
    }
    
    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid #f3f3f3;
      border-top: 2px solid #3498db;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 8px;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .error-icon, .no-image-icon {
      font-size: 24px;
      margin-bottom: 8px;
    }
    
    .error-text, .no-image-text {
      font-size: 12px;
    }
  `]
})
export class ProxyImageComponent implements OnInit {
  @Input() imageUrl: string = '';
  @Input() alt: string = 'Image';
  @Input() imageClass: string = '';

  imageDataUrl: string = '';
  loading: boolean = false;
  error: boolean = false;
  errorMessage: string = '';

  constructor(private imageProxyService: ImageProxyService) {}

  ngOnInit() {
    this.loadImage();
  }

  ngOnChanges() {
    this.loadImage();
  }

  private loadImage() {
    if (!this.imageUrl || this.imageUrl.trim() === '') {
      this.imageDataUrl = '';
      this.loading = false;
      this.error = false;
      return;
    }

    // Reset state
    this.loading = true;
    this.error = false;
    this.errorMessage = '';

    // Check if it's already a data URL
    if (this.imageUrl.startsWith('data:')) {
      this.imageDataUrl = this.imageUrl;
      this.loading = false;
      return;
    }

    // Handle local uploads path
    if (this.imageUrl.startsWith('/uploads/') || this.imageUrl.startsWith('uploads/')) {
      // Ensure path starts with slash
      const normalizedPath = this.imageUrl.startsWith('/') ? this.imageUrl : `/${this.imageUrl}`;
      // Use the backend URL for local images
      this.imageDataUrl = `${environment.apiUrl}${normalizedPath}`;
      this.loading = false;
      return;
    }

    // Use proxy for external URLs (Google Drive, etc.)
    this.imageProxyService.getImageAsBase64(this.imageUrl).subscribe({
      next: (response) => {
        this.imageDataUrl = response.data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading image via proxy:', error);
        this.loading = false;
        this.error = true;
        this.errorMessage = 'Failed to load image. Try migrating images to local storage.';
        this.imageDataUrl = '';
      }
    });
  }

  onImageError() {
    // If a local image fails to load, show error
    if (this.imageUrl.startsWith('/uploads/')) {
      this.error = true;
      this.errorMessage = 'Local image not found';
      this.imageDataUrl = '';
      return;
    }
    
    // If an external image fails to load, try using the proxy as fallback
    if (!this.imageUrl.startsWith('data:') && !this.loading) {
      console.log('Image failed to load directly, trying proxy:', this.imageUrl);
      this.loading = true;
      this.error = false;
      
      this.imageProxyService.getImageAsBase64(this.imageUrl).subscribe({
        next: (response) => {
          this.imageDataUrl = response.data;
          this.loading = false;
          this.error = false;
        },
        error: (error) => {
          console.error('Fallback proxy also failed:', error);
          this.loading = false;
          this.error = true;
          this.errorMessage = 'Image could not be loaded';
          this.imageDataUrl = '';
        }
      });
    } else {
      this.error = true;
      this.errorMessage = 'Image failed to display';
      this.imageDataUrl = '';
    }
  }
}
