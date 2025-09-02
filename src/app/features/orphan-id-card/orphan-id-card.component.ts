import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { OrphanService } from '../../core/services/orphan.service';
import { PdfService } from '../../core/services/pdf.service';
import { SponsorshipService } from '../../core/services/sponsorship.service';
import { DonationService } from '../../core/services/donation.service';
import { DonorService } from '../../core/services/donor.service';
import { EmailService } from '../../shared/services/email.service';
import { OrphanDetailDTO, SponsorshipInfo, GiftInfo } from '../../core/models/orphan-detail.dto';
import { Sponsorship, CreateSponsorshipRequest, CreateGiftRequest, SponsorshipType, SponsorshipWithGifts } from '../../core/models/sponsorship.model';
import { Donor } from '../../core/models/donor.model';
import { CreateDonationRequest } from '../../core/models/donation.model';
import { environment } from '../../../environments/environment';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-orphan-id-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './orphan-id-card.component.html',
  styleUrls: ['./orphan-id-card.component.scss']
})
export class OrphanIdCardComponent implements OnInit {
  orphan: OrphanDetailDTO | null = null;
  isLoading = true;
  error: string | null = null;
  issueDate = new Date().toISOString();
  validUntilDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString();

  // Sponsorship related properties
  sponsorships: SponsorshipWithGifts[] = [];
  currentSponsorship: SponsorshipWithGifts | null = null;
  showAddDonorForm = false;
  showAddGiftForm = false;
  availableDonors: Donor[] = [];
  
  // Form data
  newSponsorshipForm = {
    donorId: 0,
    sponsorshipType: SponsorshipType.MONTHLY,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    giftValue: 0
  };

  newGiftForm = {
    giftName: '',
    giftDate: new Date().toISOString().split('T')[0],
    description: '',
    giftValue: 0
  };

  newDonorForm = {
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: '',
    company: ''
  };

  // Email card sending properties
  showSendCardModal = false;
  selectedTemplate = 'template1';
  recipientType = 'sponsor'; // 'sponsor' or 'donor'
  selectedDonorId = 0;
  customEmail = '';
  customName = '';
  isSendingCard = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orphanService: OrphanService,
    private pdfService: PdfService,
    private sponsorshipService: SponsorshipService,
    private donationService: DonationService,
    private donorService: DonorService,
    private emailService: EmailService
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
        // Load sponsorships after orphan is loaded
        this.loadSponsorships(id);
        this.loadAvailableDonors();
      },
      error: (error) => {
        console.error('Error loading orphan:', error);
        this.error = 'Failed to load orphan details';
        this.isLoading = false;
      }
    });
  }

  loadSponsorships(orphanId: number): void {
    this.sponsorshipService.getSponsorshipsByOrphanId(orphanId).subscribe({
      next: (sponsorships) => {
        this.sponsorships = sponsorships;
        // Find active sponsorship: no endDate AND status is not CANCELLED
        this.currentSponsorship = sponsorships.find(s => !s.endDate && s.status !== 'CANCELLED') || null;
      },
      error: (error) => {
        console.error('Error loading sponsorships:', error);
      }
    });
  }

  loadAvailableDonors(): void {
    this.donorService.getDonors().subscribe({
      next: (donors) => {
        this.availableDonors = donors;
      },
      error: (error) => {
        console.error('Error loading donors:', error);
      }
    });
  }

  // Form methods - these are no longer needed as we use inline forms

  openAddGiftForm(): void {
    this.showAddGiftForm = true;
    this.resetNewGiftForm();
  }

  closeAddGiftForm(): void {
    this.showAddGiftForm = false;
    this.resetNewGiftForm();
  }

  resetNewDonorForm(): void {
    this.newDonorForm = {
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      country: '',
      company: ''
    };
    this.newSponsorshipForm = {
      donorId: 0,
      sponsorshipType: SponsorshipType.MONTHLY,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      giftValue: 0
    };
  }

  resetNewGiftForm(): void {
    this.newGiftForm = {
      giftName: '',
      giftDate: new Date().toISOString().split('T')[0],
      description: '',
      giftValue: 0
    };
  }


  submitNewGift(): void {
    if (!this.currentSponsorship || !this.orphan) return;

    const giftRequest: CreateGiftRequest = {
      sponsorshipId: this.currentSponsorship.id!,
      giftName: this.newGiftForm.giftName,
      giftDate: this.newGiftForm.giftDate,
      description: this.newGiftForm.description,
      giftValue: this.newGiftForm.giftValue
    };

    this.sponsorshipService.createGift(giftRequest).subscribe({
      next: (gift) => {
        console.log('Gift created successfully:', gift);
        this.loadSponsorships(this.orphan!.id!);
        this.closeAddGiftForm();
        alert('Gift added successfully!');
      },
      error: (error) => {
        console.error('Error creating gift:', error);
        if (error.error && error.error.includes('insufficient balance')) {
          alert('Cannot add gift, insufficient balance');
        } else {
          alert('Error adding gift');
        }
      }
    });
  }

  // Helper methods
  getSponsorshipTypeLabel(type: string): string {
    return type === 'MONTHLY' ? 'Monthly' : 'Yearly';
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
        console.error('Error downloading card:', error);
        alert('Error downloading ID card');
      }
    });
  }

  getSponsorshipStatus(sponsorship: SponsorshipWithGifts): string {
    if (!sponsorship.endDate) {
      return 'Active';
    }
    
    const endDate = new Date(sponsorship.endDate);
    const today = new Date();
    
    return endDate < today ? 'Expired' : 'Active';
  }

  formatCurrency(amount: number): string {
    if (amount === undefined || amount === null) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  getSponsorshipTypeArabic(type: string): string {
    return type === 'MONTHLY' ? 'Monthly' : 'Yearly';
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    // Format as MM/DD/YYYY
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  }

  getRecentGifts(gifts: any[]): any[] {
    if (!gifts || gifts.length === 0) return [];
    return gifts.slice(0, 3); // Show only recent 3 gifts
  }

  goBack(): void {
    this.router.navigate(['/orphan-management']);
  }

  handleImageError(event: any): void {
    const imgElement = event.target as HTMLImageElement;
    if (imgElement) {
      imgElement.src = this.getOrphanPhotoUrl();
    }
  }

  // PDF Generation methods
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

  // Email card sending methods
  openSendCardModal(): void {
    this.showSendCardModal = true;
    this.resetSendCardForm();
    
    // Set default recipient to sponsor if available
    if (this.currentSponsorship) {
      this.recipientType = 'sponsor';
    } else {
      this.recipientType = 'donor';
    }
  }

  closeSendCardModal(): void {
    this.showSendCardModal = false;
    this.resetSendCardForm();
  }

  resetSendCardForm(): void {
    this.selectedTemplate = 'template1';
    this.recipientType = 'sponsor';
    this.selectedDonorId = 0;
    this.customEmail = '';
    this.customName = '';
    this.isSendingCard = false;
  }

  async sendCard(): Promise<void> {
    if (!this.orphan) return;

    this.isSendingCard = true;
    
    try {
      // Generate the selected template as blob
      const cardBlob = await this.generateCardAsBlob();

      // Determine recipient details
      if (this.recipientType === 'sponsor' && this.currentSponsorship) {
        // Get sponsor details from current sponsorship
        this.donorService.getDonorById(this.currentSponsorship.donorId).subscribe({
          next: (donor) => {
            const recipientEmail = donor.email;
            const recipientName = `${donor.firstName} ${donor.lastName}`;
            this.sendCardEmail(recipientEmail, recipientName, cardBlob);
          },
          error: (error) => {
            console.error('Error loading sponsor details:', error);
            alert('Error loading sponsor details');
            this.isSendingCard = false;
          }
        });
      } else if (this.recipientType === 'donor' && this.selectedDonorId > 0) {
        // Get selected donor details
        this.donorService.getDonorById(this.selectedDonorId).subscribe({
          next: (donor) => {
            const recipientEmail = donor.email;
            const recipientName = `${donor.firstName} ${donor.lastName}`;
            this.sendCardEmail(recipientEmail, recipientName, cardBlob);
          },
          error: (error) => {
            console.error('Error loading donor details:', error);
            alert('Error loading donor details');
            this.isSendingCard = false;
          }
        });
      } else if (this.recipientType === 'custom') {
        // Use custom email and name
        this.sendCardEmail(this.customEmail, this.customName, cardBlob);
      } else {
        alert('Please select a valid recipient');
        this.isSendingCard = false;
      }
    } catch (error) {
      console.error('Error generating card:', error);
      alert('Error generating card. Please try again.');
      this.isSendingCard = false;
    }
  }

  private async generateCardAsBlob(): Promise<Blob> {
    if (!this.orphan) throw new Error('No orphan data available');

    // Use the existing PDF service template generation methods
    return new Promise<Blob>(async (resolve, reject) => {
      try {
        // Create HTML template element using the same method as PDF service
        const templateElement = document.createElement('div');
        templateElement.style.width = '210mm';
        templateElement.style.height = '297mm';
        templateElement.style.position = 'absolute';
        templateElement.style.top = '-10000px';
        templateElement.style.left = '-10000px';
        
        // Use the same template creation methods from PDF service
        if (this.selectedTemplate === 'template1') {
          templateElement.innerHTML = this.createPdfServiceTemplate1(this.orphan!);
        } else {
          templateElement.innerHTML = this.createPdfServiceTemplate2(this.orphan!);
        }

        document.body.appendChild(templateElement);

        // Load background image first
        const backgroundImageSrc = this.selectedTemplate === 'template1' 
          ? '/assets/images/orphanCard.jpg' 
          : '/assets/images/orphanCard2.jpg';

        const backgroundImg = new Image();
        backgroundImg.crossOrigin = 'anonymous';
        
        backgroundImg.onload = async () => {
          try {
            // Wait for orphan photo to load
            const orphanImg = new Image();
            orphanImg.src = this.getOrphanPhotoUrl(this.orphan!.photo);
            
            orphanImg.onload = async () => {
              try {
                // Create canvas with background
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d')!;
                
                // Set canvas size (A5 dimensions in pixels at 300 DPI)
                canvas.width = 1748; // 148mm * 300/25.4
                canvas.height = 2480; // 210mm * 300/25.4
                
                // Draw background image
                ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);
                
                // Generate content overlay using html2canvas
                const contentCanvas = await html2canvas(templateElement, {
                  scale: 4,
                  useCORS: true,
                  logging: false,
                  backgroundColor: null
                });
                
                // Draw content overlay on top of background
                ctx.drawImage(contentCanvas, 0, 0, canvas.width, canvas.height);
                
                // Convert to blob
                canvas.toBlob((blob: Blob | null) => {
                  document.body.removeChild(templateElement);
                  if (blob) {
                    resolve(blob);
                  } else {
                    reject(new Error('Failed to generate blob from canvas'));
                  }
                }, 'image/png');
                
              } catch (error) {
                document.body.removeChild(templateElement);
                reject(error);
              }
            };
            
            orphanImg.onerror = () => {
              document.body.removeChild(templateElement);
              reject(new Error('Failed to load orphan image'));
            };
            
          } catch (error) {
            document.body.removeChild(templateElement);
            reject(error);
          }
        };
        
        backgroundImg.onerror = () => {
          document.body.removeChild(templateElement);
          reject(new Error('Failed to load background image'));
        };
        
        backgroundImg.src = backgroundImageSrc;
        
      } catch (error) {
        reject(error);
      }
    });
  }


  private sendCardEmail(recipientEmail: string, recipientName: string, cardBlob: Blob): void {
    if (!this.orphan) return;

    const orphanName = `${this.orphan.firstName} ${this.orphan.lastName}`;
    
    this.emailService.sendOrphanCard(
      recipientEmail,
      recipientName,
      orphanName,
      this.selectedTemplate,
      cardBlob
    ).subscribe({
      next: (response) => {
        console.log('Card sent successfully:', response);
        alert(`Orphan ID card sent successfully to ${recipientEmail}`);
        this.closeSendCardModal();
      },
      error: (error) => {
        console.error('Error sending card:', error);
        alert('Error sending card. Please try again.');
      },
      complete: () => {
        this.isSendingCard = false;
      }
    });
  }

  getAvailableDonors(): Donor[] {
    return this.availableDonors.filter(donor => 
      !this.currentSponsorship || donor.id !== this.currentSponsorship.donorId
    );
  }

  getCurrentSponsorName(): string {
    if (!this.currentSponsorship) return '';
    
    const sponsor = this.availableDonors.find(donor => donor.id === this.currentSponsorship!.donorId);
    return sponsor ? `${sponsor.firstName} ${sponsor.lastName}` : 'Current Sponsor';
  }

  // PDF Service template methods for email generation
  private createPdfServiceTemplate1(orphan: OrphanDetailDTO): string {
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
          ${orphan.education?.gradeLevel || 'N/A'} 
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

  private createPdfServiceTemplate2(orphan: OrphanDetailDTO): string {
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
          ${orphan.education?.gradeLevel || 'N/A'} 
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
}
