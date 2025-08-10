import { Injectable } from '@angular/core';
import { OrphanDetailDTO } from '../models/orphan-detail.dto';
import { environment } from '../../../environments/environment';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Injectable({
  providedIn: 'root'
})
export class PdfService {

  constructor() { }

  private async loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        console.log('Image loaded successfully:', src);
        resolve(img);
      };
      img.onerror = (err) => {
        console.error('Image loading failed:', src, err);
        reject(err);
      };
      
      // Set the image source directly
      console.log('Loading image from:', src);
      img.src = src;
    });
  }

  private getOrphanPhotoUrl(photo?: string): string {
    if (!photo) {
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjgwIiByPSIzMCIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNNTAgMTYwQzUwIDEzNS4xNDcgNzAuMTQ3IDExNSA5NSAxMTVIMTA1QzEyOS44NTMgMTE1IDE1MCAxMzUuMTQ3IDE1MCAxNjBWMjAwSDUwVjE2MFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+';
    }
    
    if (photo.startsWith('/uploads') || photo.startsWith('uploads')) {
      return `${environment.apiUrl}${photo.startsWith('/') ? '' : '/'}${photo}`;
    } else if (photo.startsWith('http')) {
      return photo;
    } else {
      return photo;
    }
  }

  private getValidUntilDate(): Date {
    const today = new Date();
    return new Date(today.setFullYear(today.getFullYear() + 1));
  }
  
  private formatDate(date: string | Date): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  
  private downloadImage(dataUrl: string, fileName: string): void {
    console.log('Preparing to download image:', fileName);
    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    console.log('Image download initiated for:', fileName);
  }
  
  // Helper method to create rounded rectangle path for clipping images
  private roundedImage(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  private calculateAge(dob: string): number {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  async generateCard1(orphan: OrphanDetailDTO): Promise<void> {
    console.log('Starting template 1 generation for orphan:', orphan.firstName, orphan.lastName);
    try {
      // Create HTML template element (same approach as old project)
      const templateElement = document.createElement('div');
      templateElement.style.width = '210mm'; // A5 width
      templateElement.style.height = '297mm'; // A5 height
      templateElement.style.position = 'absolute';
      templateElement.style.top = '-10000px'; // Move far above the visible area
      templateElement.style.left = '-10000px'; // Move far to the left
      templateElement.innerHTML = this.createCardTemplate1(orphan);

      // Append the template to the body
      document.body.appendChild(templateElement);

      // Ensure the image is fully loaded before proceeding
      const img = new Image();
      img.src = this.getOrphanPhotoUrl(orphan.photo);
      img.onload = async () => {
        try {
          // Create PDF with A5 dimensions (same as old project)
          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a5'
          });

          // Load and add the background image first
          try {
            console.log('Loading background image for template 1...');
            // Use the correct Angular 19 asset path
            const backgroundImage = await this.loadImage('/assets/images/orphanCard.jpg');
            
            const imgWidth = 148; // A5 width in mm
            const imgHeight = 210; // A5 height in mm
            pdf.addImage(backgroundImage, 'JPEG', 0, 0, imgWidth, imgHeight);
            console.log('Template 1 background added to PDF successfully');
          } catch (error) {
            console.error('Error loading background image:', error);
            console.error('All attempts to load background image failed');
          }

          // Render the content using html2canvas
          const canvas = await html2canvas(templateElement, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: null // Transparent background
          });

          // Add the content overlay
          const imgWidth = 148; // A5 width in mm
          const imgHeight = 210; // A5 height in mm
          const canvasDataURL = canvas.toDataURL('image/png');
          pdf.addImage(canvasDataURL, 'PNG', 0, 0, imgWidth, imgHeight);

          // Save the PDF
          const fileName = `${orphan.firstName.toLowerCase().replace(/\s+/g, '-')}-${orphan.lastName.toLowerCase().replace(/\s+/g, '-')}-card-template1.pdf`;
          pdf.save(fileName);
          console.log('Template 1 PDF generated successfully');

          // Remove the template from the DOM
          document.body.removeChild(templateElement);
        } catch (error) {
          console.error('Error in PDF generation:', error);
          document.body.removeChild(templateElement);
          throw error;
        }
      };
      img.onerror = (error) => {
        console.error('Image load error:', error);
        document.body.removeChild(templateElement);
        throw new Error('Failed to load orphan image');
      };
    } catch (error) {
      console.error('Error generating card template 1:', error);
      throw new Error('Failed to generate card template 1');
    }
  }

  async generateCard2(orphan: OrphanDetailDTO): Promise<void> {
    console.log('Starting template 2 generation for orphan:', orphan.firstName, orphan.lastName);
    try {
      // Create HTML template element (same approach as old project)
      const templateElement = document.createElement('div');
      templateElement.style.width = '210mm'; // A5 width
      templateElement.style.height = '297mm'; // A5 height
      templateElement.style.position = 'absolute';
      templateElement.style.top = '-10000px'; // Move far above the visible area
      templateElement.style.left = '-10000px'; // Move far to the left
      templateElement.innerHTML = this.createCardTemplate2(orphan);

      // Append the template to the body
      document.body.appendChild(templateElement);

      // Ensure the image is fully loaded before proceeding
      const img = new Image();
      img.src = this.getOrphanPhotoUrl(orphan.photo);
      img.onload = async () => {
        try {
          // Create PDF with A5 dimensions (same as old project)
          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a5'
          });

          // Load and add the background image first
          try {
            console.log('Loading background image for template 2...');
            // Use the correct Angular 19 asset path
            const backgroundImage = await this.loadImage('/assets/images/orphanCard2.jpg');
            
            const imgWidth = 148; // A5 width in mm
            const imgHeight = 210; // A5 height in mm
            pdf.addImage(backgroundImage, 'JPEG', 0, 0, imgWidth, imgHeight);
            console.log('Template 2 background added to PDF successfully');
          } catch (error) {
            console.error('Error loading background image:', error);
            console.error('All attempts to load background image failed');
          }

          // Render the content using html2canvas
          const canvas = await html2canvas(templateElement, {
            scale: 4,
            useCORS: true,
            logging: false,
            backgroundColor: null // Transparent background
          });

          // Add the content overlay
          const imgWidth = 148; // A5 width in mm
          const imgHeight = 210; // A5 height in mm
          const canvasDataURL = canvas.toDataURL('image/png');
          pdf.addImage(canvasDataURL, 'PNG', 0, 0, imgWidth, imgHeight);

          // Save the PDF
          const fileName = `${orphan.firstName.toLowerCase().replace(/\s+/g, '-')}-${orphan.lastName.toLowerCase().replace(/\s+/g, '-')}-card-template2.pdf`;
          pdf.save(fileName);
          console.log('Template 2 PDF generated successfully');

          // Remove the template from the DOM
          document.body.removeChild(templateElement);
        } catch (error) {
          console.error('Error in PDF generation:', error);
          document.body.removeChild(templateElement);
          throw error;
        }
      };
      img.onerror = (error) => {
        console.error('Image load error:', error);
        document.body.removeChild(templateElement);
        throw new Error('Failed to load orphan image');
      };
    } catch (error) {
      console.error('Error generating card template 2:', error);
      throw new Error('Failed to generate card template 2');
    }
  }

  private createCardTemplate1(orphan: OrphanDetailDTO): string {
    return `
      <div style="
        width: 210mm;
        height: 297mm;
        background-size: cover;
        background-position: center;
        position: relative;
        font-family: 'El Messiri', sans-serif;
      ">
        <!-- User Image -->
        <div style="
          position: absolute;
          top: 53.5%; 
          left: 20.7%; 
          transform: translate(-50%, -50%);
          width: 225px; 
          height: 274px; 
        ">
          <img src="${this.getOrphanPhotoUrl(orphan.photo)}" alt="User Photo" style="
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 30px;
          ">
        </div>
    
        <!-- Attributes -->
        <h1 style="
          font-size: 26px; 
          position: absolute; 
          bottom: 33.7%; 
          left: 86%; 
          transform: translate(-50%, -50%); 
          color: black; 
          font-weight: bold; 
          letter-spacing: 0.9px; 
          width: 300px;
          text-align: left;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        ">
          ${orphan.orphanId || orphan.id || 'N/A'}
        </h1>
  
        <h1 style="
          font-size: 26px; 
          position: absolute; 
          bottom: 25.2%; 
          left: 60.2%; 
          transform: translate(-50%, -50%); 
          color: black; 
          font-weight: bold; 
          letter-spacing: 0.9px; 
          width: 400px;
          text-align: left; 
          white-space: nowrap; 
          overflow: hidden; 
          text-overflow: ellipsis;
        ">
          ${orphan.firstName} ${orphan.lastName}
        </h1>
  
        <h1 style="
          font-size: 26px; 
          position: absolute; 
          bottom: 22.2%; 
          left: 60.2%; 
          transform: translate(-50%, -50%); 
          color: black; 
          font-weight: bold; 
          letter-spacing: 0.9px; 
          width: 400px;
          text-align: left; 
          white-space: nowrap; 
          overflow: hidden; 
          text-overflow: ellipsis;
        ">
          ${this.calculateAge(orphan.dob)} years old
        </h1>
  
        <h1 style="
          font-size: 26px; 
          position: absolute; 
          bottom: 19.2%; 
          left: 60.2%; 
          transform: translate(-50%, -50%); 
          color: black; 
          font-weight: bold; 
          letter-spacing: 0.9px; 
          width: 400px;
          text-align: left; 
          white-space: nowrap; 
          overflow: hidden; 
          text-overflow: ellipsis;
        ">
          ${orphan.education?.gradeLevel || 'N/A'} Grade
        </h1>
  
        <h1 style="
          font-size: 26px; 
          position: absolute; 
          bottom: 16.2%; 
          left: 60.2%; 
          transform: translate(-50%, -50%); 
          color: black; 
          font-weight: bold; 
          letter-spacing: 0.9px; 
          width: 400px;
          text-align: left; 
          white-space: nowrap; 
          overflow: hidden; 
          text-overflow: ellipsis;
        ">
          ${orphan.location || 'N/A'}, ${orphan.country || 'N/A'}
        </h1>
      </div>
    `;
  }

  private createCardTemplate2(orphan: OrphanDetailDTO): string {
    return `
      <div style="
        width: 210mm;
        height: 297mm;
        background-size: cover;
        background-position: center;
        position: relative;
        font-family: 'El Messiri', sans-serif;
      ">
        <!-- User Image -->
        <div style="
          position: absolute;
          top: 65.24%; 
          left: 20.74%; 
          transform: translate(-50%, -50%);
          width: 219px; 
          height: 253px; 
        ">
          <img src="${this.getOrphanPhotoUrl(orphan.photo)}" alt="User Photo" style="
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 55px;
          ">
        </div>
        
        <!-- Attributes -->
        <h1 style="
          font-size: 28px; 
          position: absolute; 
          bottom: 32.1%; 
          left: 94%; 
          transform: translate(-50%, -50%); 
          color: black; 
          font-weight: bold; 
          letter-spacing: 0.9px; 
          width: 300px;
          text-align: left;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        ">
          ${orphan.orphanId || orphan.id || 'N/A'}
        </h1>

        <h1 style="
          font-size: 24px; 
          position: absolute; 
          bottom: 26.8%; 
          left: 72.9%; 
          transform: translate(-50%, -50%); 
          color: black; 
          font-weight: bold; 
          letter-spacing: 0.9px; 
          width: 300px;
          text-align: left; 
          white-space: nowrap; 
          overflow: hidden; 
          text-overflow: ellipsis;
        ">
          ${orphan.firstName} ${orphan.lastName}
        </h1>

        <h1 style="
          font-size: 24px; 
          position: absolute; 
          bottom: 23.9%; 
          left: 72.95%; 
          transform: translate(-50%, -50%); 
          color: black; 
          font-weight: bold; 
          letter-spacing: 0.9px; 
          width: 300px;
          text-align: left; 
          white-space: nowrap; 
          overflow: hidden; 
          text-overflow: ellipsis;
        ">
          ${this.calculateAge(orphan.dob)} years old
        </h1>

        <h1 style="
          font-size: 24px; 
          position: absolute; 
          bottom: 21%; 
          left: 73.1%; 
          transform: translate(-50%, -50%); 
          color: black; 
          font-weight: bold; 
          letter-spacing: 0.9px; 
          width: 300px;
          text-align: left; 
          white-space: nowrap; 
          overflow: hidden; 
          text-overflow: ellipsis;
        ">
          ${orphan.education?.gradeLevel || 'N/A'} Grade
        </h1>

        <h1 style="
          font-size: 24px; 
          position: absolute; 
          bottom: 18.09%; 
          left: 81.9%; 
          transform: translate(-50%, -50%); 
          color: black; 
          font-weight: bold; 
          letter-spacing: 0.9px; 
          width: 300px;
          text-align: left; 
          white-space: nowrap; 
          overflow: hidden; 
          text-overflow: ellipsis;
        ">
          ${orphan.location || 'N/A'}, ${orphan.country || 'N/A'}
        </h1>
      </div>
    `;
  }

  // Method to generate PDF version using jsPDF (if needed)
  async generatePDFCard(orphan: OrphanDetailDTO, templateNumber: 1 | 2): Promise<void> {
    // This would require jsPDF library
    // For now, we'll use the canvas method above
    if (templateNumber === 1) {
      await this.generateCard1(orphan);
    } else {
      await this.generateCard2(orphan);
    }
  }
}
