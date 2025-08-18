export interface OrphanDocument {
  id: number;
  orphanId: number;
  documentName: string;
  originalFilename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  documentType: DocumentType;
  description?: string;
  uploadDate: string;
  downloadUrl: string;
}

export interface UploadDocumentRequest {
  orphanId: number;
  documentName: string;
  documentType: DocumentType;
  description?: string;
}

export enum DocumentType {
  BIRTH_CERTIFICATE = 'BIRTH_CERTIFICATE',
  SCHOOL_CERTIFICATE = 'SCHOOL_CERTIFICATE',
  MEDICAL_RECORD = 'MEDICAL_RECORD',
  IDENTITY_DOCUMENT = 'IDENTITY_DOCUMENT',
  FAMILY_DOCUMENT = 'FAMILY_DOCUMENT',
  OTHER = 'OTHER'
}

export const DocumentTypeLabels: Record<DocumentType, string> = {
  [DocumentType.BIRTH_CERTIFICATE]: 'Birth Certificate',
  [DocumentType.SCHOOL_CERTIFICATE]: 'School Certificate',
  [DocumentType.MEDICAL_RECORD]: 'Medical Record',
  [DocumentType.IDENTITY_DOCUMENT]: 'Identity Document',
  [DocumentType.FAMILY_DOCUMENT]: 'Family Document',
  [DocumentType.OTHER]: 'Other'
};

export interface DocumentUploadResponse {
  success: boolean;
  message: string;
  document?: OrphanDocument;
}
