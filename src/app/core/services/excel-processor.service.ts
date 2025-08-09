import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { DateParserUtil } from '../utils/date-parser.util';
import { ImageDownloaderUtil } from '../utils/image-downloader.util';
import { OrphanDetailDTO } from '../models/orphan-detail.dto';

export interface ExcelProcessingResult {
  success: boolean;
  data?: OrphanDetailDTO[];
  errors?: string[];
  warnings?: string[];
  photoFiles?: Map<string, File>; // Map orphanId to photo file
}

@Injectable({
  providedIn: 'root'
})
export class ExcelProcessorService {

  constructor(
    private dateParser: DateParserUtil,
    private imageDownloader: ImageDownloaderUtil
  ) {}

  /**
   * Process Excel file and return parsed orphan data with proper date handling
   */
  async processExcelFile(file: File): Promise<ExcelProcessingResult> {
    try {
      const workbook = await this.readExcelFile(file);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (!rawData || rawData.length < 2) {
        return {
          success: false,
          errors: ['Excel file appears to be empty or has no data rows']
        };
      }

      const result = await this.parseExcelData(rawData as any[][]);
      return result;

    } catch (error) {
      console.error('Error processing Excel file:', error);
      return {
        success: false,
        errors: [`Failed to process Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  private readExcelFile(file: File): Promise<XLSX.WorkBook> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          resolve(workbook);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  private async parseExcelData(rawData: any[][]): Promise<ExcelProcessingResult> {
    const headers = rawData[0];
    const dataRows = rawData.slice(1);
    
    const errors: string[] = [];
    const warnings: string[] = [];
    const orphans: OrphanDetailDTO[] = [];
    const photoFiles = new Map<string, File>();

    // Map common header variations to our expected field names
    const headerMap = this.createHeaderMap(headers);

    // Process each row and collect photo URLs
    for (let index = 0; index < dataRows.length; index++) {
      const row = dataRows[index];
      const rowNumber = index + 2; // +2 because we start from row 2 (after header)
      
      try {
        const orphan = this.parseOrphanRow(row, headerMap, rowNumber);
        
        if (orphan) {
          // Check if photo is a URL and download it
          const photoColumnIndex = headerMap.get('photo');
          if (photoColumnIndex !== undefined && photoColumnIndex < row.length) {
            const photoValue = row[photoColumnIndex];
            
            if (photoValue && typeof photoValue === 'string') {
              // Clean and validate the photo value
              const cleanPhotoValue = photoValue.toString().trim();
              
              // Skip invalid values like "Accident", "None", "N/A", etc.
              const invalidValues = ['accident', 'none', 'n/a', 'na', 'null', 'undefined', 'no photo', 'no image'];
              if (invalidValues.includes(cleanPhotoValue.toLowerCase())) {
                warnings.push(`Row ${rowNumber}: Skipping invalid photo value: "${cleanPhotoValue}"`);
              } else if (this.imageDownloader.isImageUrl(cleanPhotoValue)) {
                try {
                  // Download the image from URL
                  const photoFile = await this.imageDownloader.downloadImageFromUrl(
                    cleanPhotoValue, 
                    `orphan_${orphan.orphanId}_photo.jpg`
                  );
                  
                  if (photoFile) {
                    // Store the downloaded file in the map
                    photoFiles.set(orphan.orphanId, photoFile);
                    warnings.push(`Row ${rowNumber}: Successfully downloaded photo from URL: ${cleanPhotoValue}`);
                  } else {
                    warnings.push(`Row ${rowNumber}: Failed to download photo from URL: ${cleanPhotoValue}`);
                  }
                } catch (photoError) {
                  warnings.push(`Row ${rowNumber}: Error downloading photo: ${photoError instanceof Error ? photoError.message : 'Unknown error'}`);
                }
              } else if (cleanPhotoValue.length > 0) {
                warnings.push(`Row ${rowNumber}: Invalid photo URL format: "${cleanPhotoValue}"`);
              }
            }
          }
          
          orphans.push(orphan);
        } else {
          warnings.push(`Row ${rowNumber}: Skipped due to missing required fields`);
        }
      } catch (error) {
        errors.push(`Row ${rowNumber}: ${error instanceof Error ? error.message : 'Parsing error'}`);
      }
    }

    return {
      success: errors.length === 0,
      data: orphans,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      photoFiles: photoFiles.size > 0 ? photoFiles : undefined
    };
  }

  private createHeaderMap(headers: any[]): Map<string, number> {
    const headerMap = new Map<string, number>();
    
    // Define possible header variations for each field
    const fieldMappings: { [key: string]: string[] } = {
      'orphanId': ['orphan_id', 'orphanid', 'id', 'orphan id', 'orphan-id'],
      'lastName': ['last_name', 'lastname', 'surname', 'family_name', 'last name', 'family name'],
      'firstName': ['first_name', 'firstname', 'given_name', 'first name', 'given name'],
      'dob': ['dob', 'date_of_birth', 'birth_date', 'birthdate', 'date of birth', 'birth date'],
      'placeOfBirth': ['place_of_birth', 'birthplace', 'birth_place', 'place of birth', 'birth place'],
      'gender': ['gender', 'sex'],
      'location': ['location', 'address', 'city', 'place'],
      'country': ['country', 'nationality', 'nation'],
      'healthStatus': ['health_status', 'health', 'medical_status', 'health status', 'medical status'],
      'specialNeeds': ['special_needs', 'special needs', 'medical_needs', 'medical needs', 'disabilities'],
      'photo': ['photo', 'image', 'picture', 'avatar', 'profile_photo', 'profile_image', 'profile_picture'],
      // Family information
      'fatherName': ['father_name', 'father name', 'father'],
      'fatherDateOfDeath': ['father_death_date', 'father death date', 'father_dod'],
      'motherName': ['mother_name', 'mother name', 'mother'],
      'motherStatus': ['mother_status', 'mother status'],
      'guardianName': ['guardian_name', 'guardian name', 'guardian'],
      'relationToOrphan': ['relation_to_orphan', 'relation', 'relationship'],
      // Education
      'schoolName': ['school_name', 'school name', 'school'],
      'gradeLevel': ['grade_level', 'grade', 'class', 'level'],
      'favoriteSubject': ['favorite_subject', 'favorite subject', 'subject'],
      'schoolPerformance': ['school_performance', 'performance', 'academic_performance']
    };

    // Map headers to field names
    headers.forEach((header, index) => {
      if (header) {
        const normalizedHeader = String(header).toLowerCase().trim().replace(/[_\s-]+/g, '_');
        
        // Find matching field - use exact match or starts with for better precision
        for (const [fieldName, variations] of Object.entries(fieldMappings)) {
          if (variations.some(variation => {
            const normalizedVariation = variation.replace(/[_\s-]+/g, '_');
            // Exact match or header starts with variation (but not the other way around)
            return normalizedHeader === normalizedVariation || 
                   normalizedHeader.startsWith(normalizedVariation + '_') ||
                   normalizedHeader.startsWith(normalizedVariation);
          })) {
            headerMap.set(fieldName, index);
            break;
          }
        }
      }
    });

    return headerMap;
  }

  private parseOrphanRow(row: any[], headerMap: Map<string, number>, rowNumber: number): OrphanDetailDTO | null {
    // Get required fields
    const orphanId = this.getCellValue(row, headerMap, 'orphanId');
    const lastName = this.getCellValue(row, headerMap, 'lastName');
    const firstName = this.getCellValue(row, headerMap, 'firstName');
    const dobRaw = this.getCellValue(row, headerMap, 'dob');

    // Validate required fields
    if (!orphanId || !lastName || !firstName) {
      return null;
    }

    // Parse date of birth with our robust date parser
    const dob = this.dateParser.parseExcelDate(dobRaw);
    if (!dob) {
      throw new Error(`Invalid date format for date of birth: ${dobRaw}`);
    }

    // Parse other date fields
    const fatherDateOfDeath = this.parseOptionalDate(row, headerMap, 'fatherDateOfDeath');
    const motherDateOfDeath = this.parseOptionalDate(row, headerMap, 'motherDateOfDeath');

    // Build the orphan object
    const orphan: OrphanDetailDTO = {
      orphanId: String(orphanId),
      lastName: String(lastName),
      firstName: String(firstName),
      dob: dob,
      placeOfBirth: this.getCellValue(row, headerMap, 'placeOfBirth') || '',
      gender: this.getCellValue(row, headerMap, 'gender') || '',
      location: this.getCellValue(row, headerMap, 'location') || '',
      country: this.getCellValue(row, headerMap, 'country') || '',
      healthStatus: this.getCellValue(row, headerMap, 'healthStatus') || '',
      specialNeeds: this.getCellValue(row, headerMap, 'specialNeeds') || ''
    };

    // Add family information if available
    const fatherName = this.getCellValue(row, headerMap, 'fatherName');
    const motherName = this.getCellValue(row, headerMap, 'motherName');
    const guardianName = this.getCellValue(row, headerMap, 'guardianName');

    if (fatherName || motherName || guardianName) {
      orphan.familyInformation = {
        ethnicGroup: '',
        spokenLanguage: '',
        fatherName: fatherName || '',
        fatherDateOfDeath: fatherDateOfDeath || undefined,
        motherName: motherName || '',
        motherStatus: this.getCellValue(row, headerMap, 'motherStatus') || '',
        motherDateOfDeath: motherDateOfDeath || undefined,
        numberOfSiblings: 0,
        guardianName: guardianName || '',
        relationToOrphan: this.getCellValue(row, headerMap, 'relationToOrphan') || '',
        livingCondition: ''
      };
    }

    // Add education information if available
    const schoolName = this.getCellValue(row, headerMap, 'schoolName');
    const gradeLevel = this.getCellValue(row, headerMap, 'gradeLevel');

    if (schoolName || gradeLevel) {
      orphan.education = {
        schoolName: schoolName || '',
        gradeLevel: gradeLevel || '',
        favoriteSubject: this.getCellValue(row, headerMap, 'favoriteSubject') || '',
        educationNeeds: '',
        schoolPerformance: this.getCellValue(row, headerMap, 'schoolPerformance') || '',
        orphanDream: '',
        favoriteHobbies: '',
        supervisorComments: ''
      };
    }

    return orphan;
  }

  private getCellValue(row: any[], headerMap: Map<string, number>, fieldName: string): string | null {
    const columnIndex = headerMap.get(fieldName);
    if (columnIndex !== undefined && columnIndex < row.length) {
      const value = row[columnIndex];
      return value !== null && value !== undefined ? String(value).trim() : null;
    }
    return null;
  }

  private parseOptionalDate(row: any[], headerMap: Map<string, number>, fieldName: string): string | null {
    const rawValue = this.getCellValue(row, headerMap, fieldName);
    if (!rawValue) {
      return null;
    }
    return this.dateParser.parseExcelDate(rawValue);
  }

  /**
   * Validate Excel file format before processing
   */
  validateExcelFile(file: File): { valid: boolean; error?: string } {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel' // .xls
    ];

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Please select a valid Excel file (.xlsx or .xls)'
      };
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return {
        valid: false,
        error: 'File size must be less than 10MB'
      };
    }

    return { valid: true };
  }
}
