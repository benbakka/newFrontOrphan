import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrphanDocumentService } from '../../../core/services/orphan-document.service';
import { OrphanDocument, DocumentType, DocumentTypeLabels } from '../../models/orphan-document.model';

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './document-list.component.html',
  styleUrls: ['./document-list.component.scss']
})
export class DocumentListComponent implements OnInit, OnChanges {
  @Input() orphanId!: number;
  @Input() refreshTrigger: any;

  documents: OrphanDocument[] = [];
  isLoading = false;
  error: string | null = null;
  documentTypes = Object.values(DocumentType);
  documentTypeLabels = DocumentTypeLabels;

  // Computed properties for template
  get imageDocuments() {
    return this.documents.filter(d => d.mimeType.startsWith('image/'));
  }
  
  get pdfDocuments() {
    return this.documents.filter(d => d.mimeType === 'application/pdf');
  }
  
  get imageCount() {
    return this.imageDocuments.length;
  }
  
  get pdfCount() {
    return this.pdfDocuments.length;
  }

  constructor(private documentService: OrphanDocumentService) {}

  ngOnInit() {
    if (this.orphanId) {
      this.loadDocuments();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['refreshTrigger'] && !changes['refreshTrigger'].firstChange) {
      this.loadDocuments();
    }
  }

  loadDocuments() {
    if (!this.orphanId) return;

    this.isLoading = true;
    this.error = null;

    this.documentService.getDocumentsByOrphanId(this.orphanId).subscribe({
      next: (documents) => {
        this.documents = documents;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading documents:', error);
        this.error = 'Failed to load documents';
        this.isLoading = false;
      }
    });
  }

  downloadDocument(doc: OrphanDocument) {
    this.documentService.downloadDocument(doc.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.originalFilename;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error downloading document:', error);
        alert('Failed to download document');
      }
    });
  }

  previewDocument(doc: OrphanDocument) {
    // Use the preview endpoint instead of the download endpoint
    const previewUrl = `http://localhost:8080/api/orphans/documents/${doc.id}/preview`;
    
    if (doc.mimeType === 'application/pdf') {
      // For PDFs, open in a new tab due to X-Frame-Options restrictions
      window.open(previewUrl, '_blank');
    } else if (doc.mimeType.startsWith('image/')) {
      // For images, use image modal
      this.showImagePreviewSimple(doc, previewUrl);
    }
  }

  showImagePreviewSimple(doc: OrphanDocument, previewUrl: string) {
    // Create modal for image preview
    const modalId = `imageModal_${doc.id}`;
    
    // Remove any existing modal with the same ID
    const existingModal = document.getElementById(modalId);
    if (existingModal) {
      document.body.removeChild(existingModal);
    }
    
    // Create modal container
    const modalContainer = document.createElement('div');
    modalContainer.id = modalId;
    modalContainer.style.position = 'fixed';
    modalContainer.style.top = '0';
    modalContainer.style.left = '0';
    modalContainer.style.width = '100%';
    modalContainer.style.height = '100%';
    modalContainer.style.backgroundColor = 'rgba(0,0,0,0.7)';
    modalContainer.style.display = 'flex';
    modalContainer.style.justifyContent = 'center';
    modalContainer.style.alignItems = 'center';
    modalContainer.style.zIndex = '1050';
    
    // Create modal content
    modalContainer.innerHTML = `
      <div style="background: white; max-width: 90%; max-height: 90%; padding: 20px; border-radius: 5px; position: relative;">
        <button style="position: absolute; top: 10px; right: 10px; background: none; border: none; font-size: 24px; cursor: pointer;" id="${modalId}_close">×</button>
        <h3 style="margin-bottom: 15px;">${doc.documentName}</h3>
        <div style="text-align: center;">
          <img src="${previewUrl}" style="max-width: 100%; max-height: 70vh;" alt="${doc.documentName}">
        </div>
        <div style="margin-top: 15px; text-align: right;">
          <button class="btn btn-primary" id="${modalId}_download">Download</button>
        </div>
      </div>
    `;
    
    // Add to DOM
    document.body.appendChild(modalContainer);
    
    // Add event listeners
    const closeButton = document.getElementById(`${modalId}_close`);
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        document.body.removeChild(modalContainer);
      });
    }
    
    // Add download button event listener
    const downloadButton = document.getElementById(`${modalId}_download`);
    if (downloadButton) {
      downloadButton.addEventListener('click', () => {
        this.downloadDocument(doc);
      });
    }
    
    // Close on background click
    modalContainer.addEventListener('click', (event) => {
      if (event.target === modalContainer) {
        document.body.removeChild(modalContainer);
      }
    });
  }
  
  showPdfPreview(doc: OrphanDocument, previewUrl: string) {
    // Create modal for PDF preview
    const modalId = `pdfModal_${doc.id}`;
    
    // Remove any existing modal with the same ID
    const existingModal = document.getElementById(modalId);
    if (existingModal) {
      document.body.removeChild(existingModal);
    }
    
    // Create modal container
    const modalContainer = document.createElement('div');
    modalContainer.id = modalId;
    modalContainer.style.position = 'fixed';
    modalContainer.style.top = '0';
    modalContainer.style.left = '0';
    modalContainer.style.width = '100%';
    modalContainer.style.height = '100%';
    modalContainer.style.backgroundColor = 'rgba(0,0,0,0.7)';
    modalContainer.style.display = 'flex';
    modalContainer.style.justifyContent = 'center';
    modalContainer.style.alignItems = 'center';
    modalContainer.style.zIndex = '1050';
    
    // Create modal content
    modalContainer.innerHTML = `
      <div style="background: white; width: 90%; height: 90%; padding: 20px; border-radius: 5px; position: relative; display: flex; flex-direction: column;">
        <button style="position: absolute; top: 10px; right: 10px; background: none; border: none; font-size: 24px; cursor: pointer; z-index: 1060;" id="${modalId}_close">×</button>
        <h3 style="margin-bottom: 15px;">${doc.documentName}</h3>
        <div style="flex: 1; overflow: hidden;">
          <iframe src="${previewUrl}" style="width: 100%; height: 100%; border: none;" title="${doc.documentName}"></iframe>
        </div>
        <div style="margin-top: 15px; text-align: right;">
          <button class="btn btn-primary" id="${modalId}_download">Download</button>
        </div>
      </div>
    `;
    
    // Add to DOM
    document.body.appendChild(modalContainer);
    
    // Add event listeners
    const closeButton = document.getElementById(`${modalId}_close`);
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        document.body.removeChild(modalContainer);
      });
    }
    
    // Add download button event listener
    const downloadButton = document.getElementById(`${modalId}_download`);
    if (downloadButton) {
      downloadButton.addEventListener('click', () => {
        this.downloadDocument(doc);
      });
    }
    
    // Close on background click
    modalContainer.addEventListener('click', (event) => {
      if (event.target === modalContainer) {
        document.body.removeChild(modalContainer);
      }
    });
  }

  showImagePreview(doc: OrphanDocument) {
    // Create modal for image preview
    const modalId = `imageModal_${doc.id}`;
    
    // Remove any existing modal with the same ID
    const existingModal = document.getElementById(modalId);
    if (existingModal) {
      document.body.removeChild(existingModal);
    }
    
    // Create new modal element
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = modalId;
    modal.setAttribute('tabindex', '-1');
    modal.setAttribute('aria-labelledby', `${modalId}Label`);
    modal.setAttribute('aria-hidden', 'true');
    
    // Set modal content with image preview
    modal.innerHTML = `
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="${modalId}Label">${doc.documentName}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body text-center">
            <img src="http://localhost:8080${doc.downloadUrl}" 
                 class="img-fluid" alt="${doc.documentName}">
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <button type="button" class="btn btn-primary" id="${modalId}_download">
              <i class="fas fa-download me-1"></i> Download
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Add modal to document body
    document.body.appendChild(modal);
    
    // Initialize Bootstrap modal
    const bootstrapModal = new (window as any).bootstrap.Modal(modal);
    bootstrapModal.show();
    
    // Add download button event listener
    const downloadButton = document.getElementById(`${modalId}_download`);
    if (downloadButton) {
      downloadButton.addEventListener('click', () => {
        this.downloadDocument(doc);
      });
    }
    
    // Clean up when modal is hidden
    modal.addEventListener('hidden.bs.modal', () => {
      document.body.removeChild(modal);
    });
  }

  deleteDocument(doc: OrphanDocument) {
    if (confirm(`Are you sure you want to delete "${doc.documentName}"?`)) {
      this.documentService.deleteDocument(doc.id).subscribe({
        next: () => {
          this.documents = this.documents.filter(d => d.id !== doc.id);
        },
        error: (error) => {
          console.error('Error deleting document:', error);
          alert('Failed to delete document');
        }
      });
    }
  }

  getFileIcon(mimeType: string): string {
    return this.documentService.getFileIcon(mimeType);
  }

  getFileTypeColor(mimeType: string): string {
    return this.documentService.getFileTypeColor(mimeType);
  }

  formatFileSize(size: number): string {
    return this.documentService.formatFileSize(size);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  }

  canPreview(mimeType: string): boolean {
    return mimeType === 'application/pdf' || mimeType.startsWith('image/');
  }
}
