import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ViewChild, ElementRef, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OrphanDocumentService } from '../../../core/services/orphan-document.service';
import { DocumentType, DocumentTypeLabels, OrphanDocument, UploadDocumentRequest } from '../../models/orphan-document.model';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-document-upload',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './document-upload.component.html',
  styleUrls: ['./document-upload.component.scss']
})
export class DocumentUploadComponent implements OnInit, OnChanges {
  @Input() orphanId!: number;
  @Input() showUploadForm: boolean = false;
  @Input() refreshTrigger: any;
  @Output() documentUploaded = new EventEmitter<OrphanDocument>();
  @Output() uploadError = new EventEmitter<string>();
  @Output() uploadFormToggled = new EventEmitter<boolean>();
  @Output() documentDeleted = new EventEmitter<number>();
  @ViewChild('fileInput') fileInput!: HTMLInputElement;

  uploadForm!: FormGroup;
  selectedFile: File | null = null;
  isUploading = false;
  dragOver = false;
  errorMessage: string | null = null;
  
  documents: OrphanDocument[] = [];
  isLoadingDocuments = false;
  documentError: string | null = null;
  openDropdownId: number | null = null;

  documentTypes = Object.values(DocumentType);
  documentTypeLabels = DocumentTypeLabels;
  
  constructor(
    private fb: FormBuilder,
    public documentService: OrphanDocumentService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.initializeForm();
    if (this.orphanId) {
      this.loadDocuments();
    }
  }
  
  ngOnChanges(changes: SimpleChanges) {
    // Check if orphanId has changed and is not the first change
    if (changes['orphanId'] && !changes['orphanId'].firstChange) {
      console.log('Orphan ID changed to:', changes['orphanId'].currentValue);
      // Reset the form and reload documents for the new orphan
      this.resetForm();
      this.loadDocuments();
    }
    
    // Check if refreshTrigger has changed (used to force refresh)
    if (changes['refreshTrigger'] && !changes['refreshTrigger'].firstChange) {
      console.log('Document refresh triggered');
      if (this.orphanId) {
        this.loadDocuments();
      }
    }
  }

  loadDocuments() {
    this.isLoadingDocuments = true;
    this.documentError = null;
    
    this.documentService.getDocumentsByOrphanId(this.orphanId).subscribe({
      next: (documents) => {
        this.documents = documents;
        this.isLoadingDocuments = false;
      },
      error: (error) => {
        console.error('Error loading documents:', error);
        this.documentError = 'Failed to load documents. Please try again.';
        this.isLoadingDocuments = false;
      }
    });
  }

  initializeForm() {
    this.uploadForm = this.fb.group({
      documentName: ['', [Validators.required, Validators.minLength(2)]],
      documentType: [DocumentType.OTHER, Validators.required],
      description: ['']
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    this.handleFileSelection(file);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.dragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.dragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragOver = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFileSelection(files[0]);
    }
  }

  private handleFileSelection(file: File) {
    if (!file) return;

    // Validate file type
    if (!this.documentService.isValidFileType(file)) {
      this.errorMessage = 'Invalid file type. Only PNG, JPG, JPEG, and PDF files are allowed.';
      this.uploadError.emit(this.errorMessage);
      return;
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      this.errorMessage = 'File size exceeds 50MB limit.';
      this.uploadError.emit(this.errorMessage);
      return;
    }

    this.selectedFile = file;
    this.errorMessage = null;

    // Auto-fill document name if empty
    if (!this.uploadForm.get('documentName')?.value) {
      const nameWithoutExtension = file.name.substring(0, file.name.lastIndexOf('.'));
      this.uploadForm.patchValue({ documentName: nameWithoutExtension });
    }
  }

  removeSelectedFile() {
    this.selectedFile = null;
    this.errorMessage = null;
  }

  onSubmit() {
    if (this.uploadForm.valid && this.selectedFile && this.orphanId) {
      // Check document limit before uploading
      if (this.documents.length >= 4) {
        this.errorMessage = 'Maximum 4 documents allowed per orphan.';
        return;
      }
      
      this.isUploading = true;
      this.errorMessage = null;
      
      const documentRequest: UploadDocumentRequest = {
        orphanId: this.orphanId,
        documentName: this.uploadForm.get('documentName')?.value,
        documentType: this.uploadForm.get('documentType')?.value,
        description: this.uploadForm.get('description')?.value || ''
      };
      
      this.documentService.uploadDocument(this.selectedFile, documentRequest).subscribe({
        next: (document) => {
          this.isUploading = false;
          // Reload documents instead of adding to local array to prevent duplicates
          this.loadDocuments();
          this.documentUploaded.emit(document);
          this.resetForm();
          this.showUploadForm = false;
          this.uploadFormToggled.emit(false);
        },
        error: (error) => {
          console.error('Error uploading document:', error);
          this.errorMessage = error.error?.message || 'Failed to upload document. Please try again.';
          this.uploadError.emit(this.errorMessage!);
          this.isUploading = false;
        }
      });
    }
  }

  resetForm() {
    this.uploadForm.reset();
    this.uploadForm.get('documentType')?.setValue(DocumentType.OTHER);
    this.selectedFile = null;
    this.errorMessage = null;
  }

  toggleDropdown(documentId: number) {
    this.openDropdownId = this.openDropdownId === documentId ? null : documentId;
  }

  deleteDocument(documentId: number) {
    if (confirm('Are you sure you want to delete this document?')) {
      this.openDropdownId = null; // Close dropdown
      this.documentService.deleteDocument(documentId).subscribe({
        next: () => {
          this.snackBar.open('Document deleted successfully', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          // Remove the document from the local array
          this.documents = this.documents.filter(doc => doc.id !== documentId);
          this.documentDeleted.emit(documentId);
        },
        error: (error) => {
          console.error('Error deleting document:', error);
          this.snackBar.open('Failed to delete document', 'Close', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    // Close dropdown when clicking outside
    this.openDropdownId = null;
  }

  toggleUploadForm() {
    this.showUploadForm = !this.showUploadForm;
    this.uploadFormToggled.emit(this.showUploadForm);
    if (!this.showUploadForm) {
      this.resetForm();
    }
  }

  getFileIcon(): string {
    if (!this.selectedFile) return 'fas fa-file';
    return this.documentService.getFileIcon(this.selectedFile.type);
  }

  getFileTypeColor(): string {
    if (!this.selectedFile) return 'text-secondary';
    return this.documentService.getFileTypeColor(this.selectedFile.type);
  }

  formatFileSize(size: number): string {
    return this.documentService.formatFileSize(size);
  }
}
