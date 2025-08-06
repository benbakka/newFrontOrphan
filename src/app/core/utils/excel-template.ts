export interface ExcelTemplateColumn {
  header: string;
  description: string;
  example: string;
  required: boolean;
}

export const ORPHAN_EXCEL_TEMPLATE: ExcelTemplateColumn[] = [
  {
    header: 'Orphan ID',
    description: 'Unique identifier for the orphan',
    example: 'ORF001',
    required: true
  },
  {
    header: 'First Name',
    description: 'Orphan\'s first name',
    example: 'Ahmed',
    required: true
  },
  {
    header: 'Last Name',
    description: 'Orphan\'s last name',
    example: 'Hassan',
    required: true
  },
  {
    header: 'Date of Birth',
    description: 'Birth date - supports multiple formats: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY',
    example: '2015-03-15 or 15/03/2015 or 03/15/2015',
    required: true
  },
  {
    header: 'Place of Birth',
    description: 'Where the orphan was born',
    example: 'Cairo, Egypt',
    required: false
  },
  {
    header: 'Gender',
    description: 'Male or Female',
    example: 'Male',
    required: false
  },
  {
    header: 'Location',
    description: 'Current location/address',
    example: 'Alexandria, Egypt',
    required: false
  },
  {
    header: 'Country',
    description: 'Country of residence',
    example: 'Egypt',
    required: false
  },
  {
    header: 'Health Status',
    description: 'General health condition',
    example: 'Good',
    required: false
  },
  {
    header: 'Special Needs',
    description: 'Any special medical or care needs',
    example: 'None',
    required: false
  },
  {
    header: 'Father Name',
    description: 'Father\'s full name',
    example: 'Mohamed Hassan',
    required: false
  },
  {
    header: 'Father Death Date',
    description: 'Date of father\'s death - supports multiple formats',
    example: '2020-01-15 or 15/01/2020',
    required: false
  },
  {
    header: 'Mother Name',
    description: 'Mother\'s full name',
    example: 'Fatima Hassan',
    required: false
  },
  {
    header: 'Mother Status',
    description: 'Mother\'s current status',
    example: 'Deceased',
    required: false
  },
  {
    header: 'Mother Death Date',
    description: 'Date of mother\'s death - supports multiple formats',
    example: '2021-05-20 or 20/05/2021',
    required: false
  },
  {
    header: 'Guardian Name',
    description: 'Current guardian\'s name',
    example: 'Uncle Ali Hassan',
    required: false
  },
  {
    header: 'Relation to Orphan',
    description: 'Guardian\'s relationship to orphan',
    example: 'Uncle',
    required: false
  },
  {
    header: 'School Name',
    description: 'Name of school currently attending',
    example: 'Al-Noor Primary School',
    required: false
  },
  {
    header: 'Grade Level',
    description: 'Current grade or class level',
    example: 'Grade 5',
    required: false
  },
  {
    header: 'Favorite Subject',
    description: 'Orphan\'s favorite school subject',
    example: 'Mathematics',
    required: false
  },
  {
    header: 'School Performance',
    description: 'Academic performance level',
    example: 'Good',
    required: false
  }
];

export const SUPPORTED_DATE_FORMATS = [
  'YYYY-MM-DD (e.g., 2025-01-10)',
  'DD/MM/YYYY (e.g., 10/01/2025)', 
  'MM/DD/YYYY (e.g., 01/10/2025)',
  'YYYY/MM/DD (e.g., 2025/01/10)',
  'DD-MM-YYYY (e.g., 10-01-2025)',
  'MM-DD-YYYY (e.g., 01-10-2025)'
];

export const EXCEL_UPLOAD_INSTRUCTIONS = `
Excel File Upload Instructions:

1. DATE FORMATS SUPPORTED:
   - ISO format: 2025-01-10
   - European format: 10/01/2025 (DD/MM/YYYY)
   - US format: 01/10/2025 (MM/DD/YYYY) 
   - Alternative: 2025/01/10 (YYYY/MM/DD)
   - With dashes: 10-01-2025, 01-10-2025

2. REQUIRED FIELDS:
   - Orphan ID (must be unique)
   - First Name
   - Last Name  
   - Date of Birth

3. OPTIONAL FIELDS:
   - All other fields are optional but recommended for complete records

4. HEADER VARIATIONS:
   The system recognizes various header names:
   - "Date of Birth", "DOB", "Birth Date", "Birthdate"
   - "First Name", "FirstName", "Given Name"
   - "Last Name", "LastName", "Surname", "Family Name"
   - And many more variations...

5. FILE REQUIREMENTS:
   - Excel format (.xlsx or .xls)
   - Maximum file size: 10MB
   - First row should contain headers
   - Data starts from second row

6. DATE PARSING INTELLIGENCE:
   - Automatically detects DD/MM vs MM/DD based on values
   - If day > 12, assumes DD/MM format
   - If month > 12, assumes MM/DD format
   - Handles 2-digit years (< 50 = 20xx, >= 50 = 19xx)
   - Validates date ranges (1900-2100)
`;
