import { Injectable } from '@angular/core';
import {environment} from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ImageDownloaderUtil {

  /**
   * Downloads an image from a URL and converts it to a File object
   * @param imageUrl The URL of the image to download
   * @param fileName Optional filename for the downloaded image
   * @returns Promise that resolves to a File object or null if download fails
   */
  async downloadImageFromUrl(imageUrl: string, fileName?: string): Promise<File | null> {
    if (!imageUrl || !imageUrl.startsWith('http')) {
      console.warn('Invalid image URL:', imageUrl);
      return null;
    }

    // Special handling for Google Drive URLs using backend proxy
    if (imageUrl.includes('drive.google.com')) {
      console.log('Using backend proxy for Google Drive URL:', imageUrl);
      // Use backend proxy to download Google Drive images
      const proxyUrl = `${environment.apiUrl}/api/orphans/proxy-image?url=${encodeURIComponent(imageUrl)}`;

      try {
        const response = await fetch(proxyUrl, { mode: 'cors' });

        if (!response.ok) {
          console.error(`Failed to fetch image via proxy: ${response.status} ${response.statusText}`);
          return null;
        }

        const blob = await response.blob();

        if (!blob.type.startsWith('image/')) {
          console.error('Downloaded content is not an image:', blob.type);
          return null;
        }

        const generatedFileName = fileName || this.generateFileName(imageUrl, blob.type);
        return new File([blob], generatedFileName, { type: blob.type });
      } catch (error) {
        console.error('Error downloading image via proxy:', error);
        return null;
      }
    }

    try {
      // Convert URLs to direct download URLs (for supported services)
      const directUrl = this.convertToDirectUrl(imageUrl);

      // Fetch the image
      const response = await fetch(directUrl, {
        mode: 'cors',
        headers: {
          'Accept': 'image/*'
        }
      });

      if (!response.ok) {
        console.error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        return null;
      }

      // Get the blob
      const blob = await response.blob();

      // Check if the blob is actually an image
      if (!blob.type.startsWith('image/')) {
        console.error('Downloaded content is not an image:', blob.type);
        return null;
      }

      // Generate a filename if not provided
      const generatedFileName = fileName || this.generateFileName(imageUrl, blob.type);

      // Create a File object from the blob
      return new File([blob], generatedFileName, { type: blob.type });
    } catch (error) {
      console.error('Error downloading image:', error);
      return null;
    }
  }

  /**
   * Converts various URL formats to direct download URLs
   * @param url The original URL
   * @returns Direct download URL
   */
  private convertToDirectUrl(url: string): string {
    // Handle Google Drive URLs - Use alternative approach due to CORS restrictions
    if (url.includes('drive.google.com')) {
      // Extract file ID from Google Drive URL
      const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (fileIdMatch) {
        const fileId = fileIdMatch[1];
        // Use Google Drive thumbnail API which is more permissive for CORS
        return `https://drive.google.com/thumbnail?id=${fileId}&sz=w2048`;
      }
    }

    // Handle Google Photos URLs
    if (url.includes('photos.google.com') || url.includes('googleusercontent.com')) {
      // Try to add size parameter for better download
      if (!url.includes('=s')) {
        return url + '=s2048'; // Request larger size
      }
    }

    // Handle Dropbox URLs
    if (url.includes('dropbox.com') && url.includes('?dl=0')) {
      return url.replace('?dl=0', '?dl=1');
    }

    // Return original URL if no conversion needed
    return url;
  }

  /**
   * Checks if a string is a valid image URL
   * @param url String to check
   * @returns boolean indicating if the string is likely an image URL
   */
  isImageUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;

    // Check if it's a URL
    if (!url.startsWith('http')) return false;

    const lowerUrl = url.toLowerCase();

    // Google Drive URLs are now supported via backend proxy
    if (lowerUrl.includes('drive.google.com/file/d/')) {
      return true;
    }

    // Check for Google Photos URLs
    if (lowerUrl.includes('photos.google.com') || lowerUrl.includes('googleusercontent.com')) {
      return true;
    }

    // Check for Dropbox URLs
    if (lowerUrl.includes('dropbox.com')) {
      return true;
    }

    // Check if it has an image extension
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];

    // Check for common image extensions in the URL
    if (imageExtensions.some(ext => lowerUrl.endsWith(ext))) {
      return true;
    }

    // Check for image-related domains or paths
    const imageRelatedTerms = ['image', 'img', 'photo', 'pic', 'upload', 'media'];
    if (imageRelatedTerms.some(term => lowerUrl.includes(term))) {
      return true;
    }

    return false;
  }

  /**
   * Generates a filename from a URL and MIME type
   * @param url The source URL
   * @param mimeType The MIME type of the image
   * @returns A generated filename
   */
  private generateFileName(url: string, mimeType: string): string {
    // Try to extract filename from URL
    let fileName = url.split('/').pop() || '';

    // Remove query parameters if any
    fileName = fileName.split('?')[0];

    // If no valid filename was extracted or it doesn't have an extension
    if (!fileName || !fileName.includes('.')) {
      // Generate a random name with appropriate extension
      const extension = this.getExtensionFromMimeType(mimeType);
      const timestamp = new Date().getTime();
      fileName = `image_${timestamp}${extension}`;
    }

    return fileName;
  }

  /**
   * Gets file extension from MIME type
   * @param mimeType The MIME type
   * @returns The corresponding file extension
   */
  private getExtensionFromMimeType(mimeType: string): string {
    switch (mimeType) {
      case 'image/jpeg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'image/gif':
        return '.gif';
      case 'image/bmp':
        return '.bmp';
      case 'image/webp':
        return '.webp';
      case 'image/svg+xml':
        return '.svg';
      default:
        return '.jpg'; // Default to jpg
    }
  }
}
