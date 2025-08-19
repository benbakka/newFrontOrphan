import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { OrphanDetailDTO } from '../models/orphan-detail.dto';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ExcelGeneratorService {

  /**
   * Generate a new Excel file from processed orphan data with standardized date formats
   */
  generateCorrectedExcelFile(orphans: OrphanDetailDTO[], originalFileName: string): File {
    // Create worksheet data
    const worksheetData: any[][] = [];
    
    // Add headers
    const headers = [
      'Orphan ID',
      'First Name', 
      'Last Name',
      'Date of Birth',
      'Place of Birth',
      'Gender',
      'Location',
      'Country',
      'Health Status',
      'Special Needs',
      'Father Name',
      'Father Death Date',
      'Mother Name',
      'Mother Status',
      'Mother Death Date',
      'Guardian Name',
      'Relation to Orphan',
      'School Name',
      'Grade Level',
      'Favorite Subject',
      'School Performance'
    ];
    
    worksheetData.push(headers);
    
    // Add data rows
    orphans.forEach(orphan => {
      const row = [
        orphan.orphanId,
        orphan.firstName,
        orphan.lastName,
        orphan.dob, // This will be in standardized YYYY-MM-DD format
        orphan.placeOfBirth || '',
        orphan.gender || '',
        orphan.location || '',
        orphan.country || '',
        orphan.healthStatus || '',
        orphan.specialNeeds || '',
        orphan.familyInformation?.fatherName || '',
        orphan.familyInformation?.fatherDateOfDeath || '',
        orphan.familyInformation?.motherName || '',
        orphan.familyInformation?.motherStatus || '',
        orphan.familyInformation?.motherDateOfDeath || '',
        orphan.familyInformation?.guardianName || '',
        orphan.familyInformation?.relationToOrphan || '',
        orphan.education?.schoolName || '',
        orphan.education?.gradeLevel || '',
        orphan.education?.favoriteSubject || '',
        orphan.education?.schoolPerformance || ''
      ];
      
      worksheetData.push(row);
    });
    
    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orphans');
    
    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    
    // Create File object
    const fileName = originalFileName.replace(/\.[^/.]+$/, '_corrected.xlsx');
    const file = new File([excelBuffer], fileName, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    return file;
  }

  /**
   * Generate a template Excel file for users to download
   */
  generateTemplateFile(): File {
    const templateData: any[][] = [];
    
    // Add headers
    const headers = [
      'Orphan ID',
      'First Name', 
      'Last Name',
      'Date of Birth',
      'Place of Birth',
      'Gender',
      'Location',
      'Country',
      'Health Status',
      'Special Needs',
      'Father Name',
      'Father Death Date',
      'Mother Name',
      'Mother Status',
      'Mother Death Date',
      'Guardian Name',
      'Relation to Orphan',
      'School Name',
      'Grade Level',
      'Favorite Subject',
      'School Performance'
    ];
    
    templateData.push(headers);
    
    // Add example rows
    const exampleRows = [
      [
        'ORF001',
        'Ahmed',
        'Hassan',
        '2015-03-15',
        'Cairo, Egypt',
        'Male',
        'Alexandria, Egypt',
        'Egypt',
        'Good',
        'None',
        'Mohamed Hassan',
        '2020-01-15',
        'Fatima Hassan',
        'Deceased',
        '2021-05-20',
        'Uncle Ali Hassan',
        'Uncle',
        'Al-Noor Primary School',
        'Grade 5',
        'Mathematics',
        'Good'
      ],
      [
        'ORF002',
        'Aisha',
        'Ali',
        '10/03/2016',
        'Giza, Egypt',
        'Female',
        'Cairo, Egypt',
        'Egypt',
        'Excellent',
        'None',
        'Omar Ali',
        '15/01/2019',
        'Maryam Ali',
        'Alive',
        '',
        'Grandmother Khadija',
        'Grandmother',
        'Future Stars School',
        'Grade 4',
        'Arabic',
        'Excellent'
      ],
      [
        'ORF003',
        'Yusuf',
        'Mohamed',
        '02/28/2017',
        'Luxor, Egypt',
        'Male',
        'Aswan, Egypt',
        'Egypt',
        'Good',
        'Hearing aid required',
        'Ibrahim Mohamed',
        '2018-12-10',
        'Zahra Mohamed',
        'Deceased',
        '03/15/2020',
        'Aunt Safiya',
        'Aunt',
        'Hope Academy',
        'Grade 3',
        'Art',
        'Good'
      ]
    ];
    
    exampleRows.forEach(row => templateData.push(row));
    
    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    
    // Set column widths for better readability
    const colWidths = [
      { wch: 12 }, // Orphan ID
      { wch: 15 }, // First Name
      { wch: 15 }, // Last Name
      { wch: 15 }, // Date of Birth
      { wch: 20 }, // Place of Birth
      { wch: 10 }, // Gender
      { wch: 20 }, // Location
      { wch: 15 }, // Country
      { wch: 15 }, // Health Status
      { wch: 20 }, // Special Needs
      { wch: 20 }, // Father Name
      { wch: 15 }, // Father Death Date
      { wch: 20 }, // Mother Name
      { wch: 15 }, // Mother Status
      { wch: 15 }, // Mother Death Date
      { wch: 20 }, // Guardian Name
      { wch: 15 }, // Relation to Orphan
      { wch: 25 }, // School Name
      { wch: 12 }, // Grade Level
      { wch: 18 }, // Favorite Subject
      { wch: 18 }  // School Performance
    ];
    
    worksheet['!cols'] = colWidths;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orphan Template');
    
    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    
    // Create File object
    const file = new File([excelBuffer], 'orphan_upload_template.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    return file;
  }

  /**
   * Download a file to the user's computer
   */
  downloadFile(file: File): void {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
