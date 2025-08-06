import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DateParserUtil {

  /**
   * Parse various date formats from Excel and return a standardized ISO date string
   * Handles formats: 2025-01-10, 2000/23/02, 02/23/2000, 10/01/2025
   */
  parseExcelDate(dateValue: any): string | null {
    if (!dateValue) {
      return null;
    }

    // If it's already a Date object (from Excel parsing)
    if (dateValue instanceof Date) {
      return this.formatToISO(dateValue);
    }

    // Convert to string for parsing
    const dateStr = String(dateValue).trim();
    
    if (!dateStr) {
      return null;
    }

    // Try different parsing strategies
    const parsedDate = this.tryParseDate(dateStr);
    
    if (parsedDate && this.isValidDate(parsedDate)) {
      return this.formatToISO(parsedDate);
    }

    console.warn(`Could not parse date: ${dateStr}`);
    return null;
  }

  private tryParseDate(dateStr: string): Date | null {
    // Remove any extra whitespace
    dateStr = dateStr.trim();

    // Strategy 1: ISO format (YYYY-MM-DD)
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateStr)) {
      const date = new Date(dateStr);
      if (this.isValidDate(date)) {
        return date;
      }
    }

    // Strategy 2: Handle formats with slashes
    if (dateStr.includes('/')) {
      return this.parseSlashFormat(dateStr);
    }

    // Strategy 3: Handle formats with dashes (non-ISO)
    if (dateStr.includes('-') && !dateStr.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
      return this.parseDashFormat(dateStr);
    }

    // Strategy 4: Try direct Date parsing as fallback
    const directParse = new Date(dateStr);
    if (this.isValidDate(directParse)) {
      return directParse;
    }

    return null;
  }

  private parseSlashFormat(dateStr: string): Date | null {
    const parts = dateStr.split('/').map(part => parseInt(part.trim(), 10));
    
    if (parts.length !== 3 || parts.some(part => isNaN(part))) {
      return null;
    }

    const [first, second, third] = parts;

    // Determine if it's DD/MM/YYYY, MM/DD/YYYY, or YYYY/MM/DD
    let year: number, month: number, day: number;

    // If first part is 4 digits, assume YYYY/MM/DD or YYYY/DD/MM
    if (first > 1900) {
      year = first;
      // Check if second > 12, then it's likely YYYY/DD/MM
      if (second > 12) {
        day = second;
        month = third;
      } else {
        month = second;
        day = third;
      }
    } else {
      // Two-digit or single-digit year scenarios
      // Determine year based on context
      if (third > 31) {
        // Third part is year
        year = third < 100 ? (third < 50 ? 2000 + third : 1900 + third) : third;
        
        // Determine MM/DD vs DD/MM
        if (first > 12) {
          // First must be day
          day = first;
          month = second;
        } else if (second > 12) {
          // Second must be day
          month = first;
          day = second;
        } else {
          // Ambiguous - default to MM/DD/YYYY (US format)
          month = first;
          day = second;
        }
      } else {
        // Assume DD/MM/YYYY format
        day = first;
        month = second;
        year = third < 100 ? (third < 50 ? 2000 + third : 1900 + third) : third;
      }
    }

    // Validate ranges
    if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
      return null;
    }

    const date = new Date(year, month - 1, day); // Month is 0-indexed in JS Date
    
    // Verify the date is valid (handles cases like Feb 30)
    if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
      return date;
    }

    return null;
  }

  private parseDashFormat(dateStr: string): Date | null {
    const parts = dateStr.split('-').map(part => parseInt(part.trim(), 10));
    
    if (parts.length !== 3 || parts.some(part => isNaN(part))) {
      return null;
    }

    const [first, second, third] = parts;

    // Similar logic to slash format but for dash-separated dates
    let year: number, month: number, day: number;

    if (first > 31) {
      // Likely YYYY-MM-DD or YYYY-DD-MM
      year = first;
      if (second > 12) {
        day = second;
        month = third;
      } else {
        month = second;
        day = third;
      }
    } else {
      // DD-MM-YYYY or MM-DD-YYYY
      if (third > 31) {
        year = third;
        if (first > 12) {
          day = first;
          month = second;
        } else if (second > 12) {
          month = first;
          day = second;
        } else {
          // Default to DD-MM-YYYY
          day = first;
          month = second;
        }
      } else {
        return null; // Can't determine year
      }
    }

    // Validate ranges
    if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
      return null;
    }

    const date = new Date(year, month - 1, day);
    
    if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
      return date;
    }

    return null;
  }

  private isValidDate(date: Date): boolean {
    return date instanceof Date && !isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100;
  }

  private formatToISO(date: Date): string {
    return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
  }

  /**
   * Batch process multiple date values
   */
  parseMultipleDates(dates: any[]): (string | null)[] {
    return dates.map(date => this.parseExcelDate(date));
  }

  /**
   * Validate if a date string is in the expected format
   */
  isValidDateFormat(dateStr: string): boolean {
    const parsed = this.parseExcelDate(dateStr);
    return parsed !== null;
  }
}
