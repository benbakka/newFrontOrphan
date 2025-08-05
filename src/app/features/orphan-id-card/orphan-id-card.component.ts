import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { OrphanService } from '../../core/services/orphan.service';
import { PdfService } from '../../core/services/pdf.service';
import { OrphanDetailDTO } from '../../core/models/orphan-detail.dto';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-orphan-id-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './orphan-id-card.component.html',
  styleUrls: ['./orphan-id-card.component.scss']
})
export class OrphanIdCardComponent implements OnInit {
  orphan: OrphanDetailDTO | null = null;
  isLoading = true;
  error: string | null = null;
  issueDate = new Date().toISOString();
  validUntilDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orphanService: OrphanService,
    private pdfService: PdfService
  ) {}

  ngOnInit(): void {
    const orphanId = this.route.snapshot.paramMap.get('id');
    if (orphanId) {
      this.loadOrphan(+orphanId);
    }
  }

  loadOrphan(id: number): void {
    this.isLoading = true;
    this.error = null;
    
    this.orphanService.getOrphanById(id).subscribe({
      next: (orphan) => {
        this.orphan = orphan;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading orphan:', error);
        this.error = 'Failed to load orphan details';
        this.isLoading = false;
      }
    });
  }

  getOrphanPhotoUrl(photo?: string): string {
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

  calculateAge(dob: string): number {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  downloadCard(): void {
    if (!this.orphan) return;
    
    this.orphanService.downloadIdCard(this.orphan.id!).subscribe({
      next: (blob) => {
        if (typeof window !== 'undefined') {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${this.orphan!.firstName}-${this.orphan!.lastName}-id-card.pdf`;
          a.click();
          window.URL.revokeObjectURL(url);
        }
      },
      error: (error) => {
        console.error('Error downloading ID card:', error);
        alert('Error downloading ID card. Please try again.');
      }
    });
  }

  async generateCardTemplate1(): Promise<void> {
    if (!this.orphan) return;
    
    try {
      await this.pdfService.generateCard1(this.orphan);
    } catch (error) {
      console.error('Error generating card template 1:', error);
      alert('Error generating card template 1. Please try again.');
    }
  }

  async generateCardTemplate2(): Promise<void> {
    if (!this.orphan) return;
    
    try {
      await this.pdfService.generateCard2(this.orphan);
    } catch (error) {
      console.error('Error generating card template 2:', error);
      alert('Error generating card template 2. Please try again.');
    }
  }

  printCard(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  handleImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    if (imgElement) {
      imgElement.src = this.getOrphanPhotoUrl();
    }
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
