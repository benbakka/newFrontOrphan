import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { jsPDF } from 'jspdf';
import { environment } from '../../../environments/environment';

export interface DonationSummaryRequest {
  donorId: number;
  startDate: string;
  endDate: string;
  pdfFile: File;
}

export interface Donation {
  id: number;
  amount: number;
  donationDate: string;
  description?: string;
  paymentMethod?: string;
  referenceNumber?: string;
  giftType?: {
    id: number;
    name: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  private apiUrl = `${environment.apiUrl}/api/email`;

  constructor(private http: HttpClient) { }


  private getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    return {
      Authorization: `Bearer ${token}`
    };
  }

  async generateDonationSummaryPDF(donor: any, donations: Donation[], startDate: Date, endDate: Date): Promise<Blob> {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const lineHeight = 7;
    let currentY = 60;
    const currentYear = new Date().getFullYear();

    // Add background image
    try {
      doc.addImage('assets/images/faseelahletterheadv2.jpg', 'JPEG', 0, 0, pageWidth, pageHeight);
    } catch (error) {
      console.warn('Could not load background image:', error);
    }

    // Determine report type and format dates accordingly
    const { reportTitle, dateRangeText, amountText: formattedAmountText } = this.formatDateRangeText(startDate, endDate, donations);

    // Add title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(reportTitle, pageWidth / 2, currentY, { align: 'center' });
    currentY += lineHeight * 2;
    doc.setFont('helvetica', 'normal');

    // Add receipt date - right aligned
    const reportDate = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    doc.text(reportDate, pageWidth - margin, currentY, { align: 'right' });
    currentY += lineHeight * 2.5;

    // Add donor information
    doc.text(`${donor.firstName} ${donor.lastName}`, margin, currentY);
    currentY += lineHeight;

    if (donor.address) {
      doc.text(donor.address, margin, currentY);
      currentY += lineHeight;
    }

    if (donor.city && donor.state && donor.zip) {
      doc.text(`${donor.city}, ${donor.state} ${donor.zip}`, margin, currentY);
      currentY += lineHeight * 2.8;
    }

    // Add salutation
    const donorFullName = `${donor.firstName} ${donor.lastName}`;
    doc.text(`Dear ${donorFullName},`, margin, currentY);
    currentY += lineHeight * 2.8;

    // Add main content
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const mainContent = 'Thank you for your generous contributions. Your generosity helps further our mission in improving the lives of the most vulnerable and underserved people in the regions we serve.';
    doc.text(doc.splitTextToSize(mainContent, pageWidth - (margin * 2)), margin, currentY);
    currentY += lineHeight * 2.5;

    // Add donation amount in bold
    doc.setFont('helvetica', 'bold');
    const wrappedText = doc.splitTextToSize(formattedAmountText, pageWidth - (margin * 2));
    doc.text(wrappedText, margin, currentY);
    currentY += lineHeight * (wrappedText.length + 0.5);

    // Add tax receipt notice
    doc.setFont('helvetica', 'normal');
    doc.text(`This letter serves as your donation receipt for ${dateRangeText}.`, margin, currentY);
    currentY += lineHeight * 1.5;

    // Add no goods or services notice in bold
    doc.setFont('helvetica', 'bold');
    doc.text('No goods or services were provided in exchange for this donation.', margin, currentY);
    currentY += lineHeight * 1.5;

    // Add closing
    doc.setFont('helvetica', 'normal');
    const closingText = 'On behalf of Faseelah Charity Team, we thank you again for your donation and look forward to your continued support.';
    doc.text(doc.splitTextToSize(closingText, pageWidth - (margin * 2)), margin, currentY);
    currentY += lineHeight * 3;

    // Add signature block
    doc.text('Sincerely', margin, currentY);
    currentY += lineHeight * 2;
    doc.text('Executive Director', margin, currentY);
    currentY += lineHeight;
    doc.text('Youness Ktiri', margin, currentY);

    return doc.output('blob');
  }

  async generateTaxReceiptPDF(donation: Donation, donor: any): Promise<Blob> {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const lineHeight = 7;
    let currentY = 60;

    // Add background image
    try {
      doc.addImage('assets/images/faseelahletterheadv2.jpg', 'JPEG', 0, 0, pageWidth, pageHeight);
    } catch (error) {
      console.warn('Could not load background image:', error);
    }

    // Add title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`Donation Tax Receipt`, pageWidth / 2, currentY, { align: 'center' });
    currentY += lineHeight * 2;
    doc.setFont('helvetica', 'normal');

    // Add receipt date - right aligned
    const donationDate = donation.donationDate ? new Date(donation.donationDate) : new Date();
    const formattedDate = donationDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    doc.text(formattedDate, pageWidth - margin, currentY, { align: 'right' });
    currentY += lineHeight * 2.5;

    // Add donor information
    doc.text(`${donor.firstName} ${donor.lastName}`, margin, currentY);
    currentY += lineHeight;

    if (donor.address) {
      doc.text(donor.address, margin, currentY);
      currentY += lineHeight;
    }

    if (donor.city && donor.state && donor.zip) {
      doc.text(`${donor.city}, ${donor.state} ${donor.zip}`, margin, currentY);
      currentY += lineHeight * 2.8;
    }

    // Add salutation
    const donorFullName = `${donor.firstName} ${donor.lastName}`;
    doc.text(`Dear ${donorFullName},`, margin, currentY);
    currentY += lineHeight * 2.8;

    // Add main content
    doc.setFontSize(12);
    const mainContent = 'Thank you for your generous contributions. Your generosity helps further our mission in improving the lives of the most vulnerable and underserved people in the regions we serve.';
    doc.text(doc.splitTextToSize(mainContent, pageWidth - (margin * 2)), margin, currentY);
    currentY += lineHeight * 2.5;

    // Add donation amount in bold
    doc.setFont('helvetica', 'bold');
    // Use our improved formatting method
    const formattedAmount = this.formatAmountText(donation.amount);
    const amountText = `Your total donation amount for ${formattedDate} is ${formattedAmount}.`;
    const wrappedText = doc.splitTextToSize(amountText, pageWidth - (margin * 2));
    doc.text(wrappedText, margin, currentY);
    currentY += lineHeight * (wrappedText.length + 0.5);

    // Add tax receipt notice
    doc.setFont('helvetica', 'normal');
    doc.text(`This letter serves as your donation receipt for ${formattedDate}.`, margin, currentY);
    currentY += lineHeight * 1.5;

    // Add no goods or services notice in bold
    doc.setFont('helvetica', 'bold');
    doc.text('No goods or services were provided in exchange for this donation.', margin, currentY);
    currentY += lineHeight * 1.5;

    // Add closing
    doc.setFont('helvetica', 'normal');
    const closingText = 'On behalf of Faseelah Charity Team, we thank you again for your donation and look forward to your continued support.';
    doc.text(doc.splitTextToSize(closingText, pageWidth - (margin * 2)), margin, currentY);
    currentY += lineHeight * 3;

    // Add signature block
    doc.text('Sincerely', margin, currentY);
    currentY += lineHeight * 2;
    doc.text('Executive Director', margin, currentY);
    currentY += lineHeight;
    doc.text('Youness Ktiri', margin, currentY);

    return doc.output('blob');
  }

  private numberToWords(num: number, addCurrency: boolean = false): string {
    const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];

    if (num === 0) return addCurrency ? 'zero dollars' : 'zero';

    function convertGroup(n: number): string {
      if (n === 0) return '';
      else if (n < 10) return ones[n];
      else if (n < 20) return teens[n - 10];
      else {
        const ten = Math.floor(n / 10);
        const one = n % 10;
        return tens[ten] + (one ? '-' + ones[one] : '');
      }
    }

    function convert(n: number): string {
      if (n === 0) return '';
      else if (n < 100) return convertGroup(n);
      else if (n < 1000) {
        const hundreds = Math.floor(n / 100);
        const remainder = n % 100;
        return ones[hundreds] + ' hundred' + (remainder ? ' ' + convertGroup(remainder) : '');
      } else if (n < 1000000) {
        const thousands = Math.floor(n / 1000);
        const remainder = n % 1000;
        return convert(thousands) + ' thousand' + (remainder ? ' ' + convert(remainder) : '');
      } else if (n < 1000000000) {
        const millions = Math.floor(n / 1000000);
        const remainder = n % 1000000;
        return convert(millions) + ' million' + (remainder ? ' ' + convert(remainder) : '');
      }
      return '';
    }

    let result = convert(Math.floor(num));
    if (addCurrency) {
      result += result === 'one' ? ' dollar' : ' dollars';
    }

    return result.charAt(0).toUpperCase() + result.slice(1);
  }

  /**
   * Format amount to display without 'zero cents' for whole numbers
   */
  formatAmountText(amount: number): string {
    const dollars = Math.floor(amount);
    const cents = Math.round((amount % 1) * 100);

    // Format numeric part - show cents only if non-zero
    const numericPart = cents === 0 ? `$${dollars}` : `$${amount.toFixed(2)}`;

    // Format text part
    let amountInWords = this.numberToWords(dollars, true);
    if (cents > 0) {
      amountInWords += ` and ${this.numberToWords(cents)} cents`;
    }
    // No 'zero cents' text for whole numbers

    return `${numericPart} (${amountInWords})`;
  }

  /**
   * Formats date range text and amount based on the period type
   */
  formatDateRangeText(startDate: Date, endDate: Date, donations: Donation[]): { reportTitle: string, dateRangeText: string, amountText: string } {
    // Calculate total amount by summing all donations
    const totalAmount = donations.reduce((sum, donation) => sum + donation.amount, 0);
    // We'll use the formatAmountText method for consistent formatting

    // Check if it's a single day
    if (this.isSameDay(startDate, endDate)) {
      const formattedDate = startDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
      return {
        reportTitle: `Donation Tax Receipt`,
        dateRangeText: formattedDate,
        amountText: `Your total donation amount for ${formattedDate} is ${this.formatAmountText(totalAmount)}.`
      };
    }

    // Check if it's a full year
    if (this.isFullYear(startDate, endDate)) {
      const year = startDate.getFullYear();
      return {
        reportTitle: `Donation Report for ${year}`,
        dateRangeText: `the year ${year}`,
        amountText: `Your total donation amount for ${year} is ${this.formatAmountText(totalAmount)}.`
      };
    }

    // Check if it's a full month
    if (this.isFullMonth(startDate, endDate)) {
      const monthYear = startDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
      });
      return {
        reportTitle: `Donation Report for ${monthYear}`,
        dateRangeText: monthYear,
        amountText: `Your total donation amount for ${monthYear} is ${this.formatAmountText(totalAmount)}.`
      };
    }

    // Check if it's a quarter
    if (this.isQuarter(startDate, endDate)) {
      const monthYear = startDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
      });
      return {
        reportTitle: `Donation Report for ${monthYear}`,
        dateRangeText: monthYear,
        amountText: `Your total donation amount for ${monthYear} is ${this.formatAmountText(totalAmount)}.`
      };
    }

    // Check if it's a semester
    if (this.isSemester(startDate, endDate)) {
      const year = startDate.getFullYear();
      return {
        reportTitle: `Donation Report for ${year}`,
        dateRangeText: `the year ${year}`,
        amountText: `Your total donation amount for ${year} is ${this.formatAmountText(totalAmount)}.`
      };
    }

    // Default case: custom date range
    const yearRange = `${startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} to ${endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
    return {
      reportTitle: `Donation Report for ${yearRange}`,
      dateRangeText: `the period ${yearRange}`,
      amountText: `Your total donation amount for the period ${yearRange} is ${this.formatAmountText(totalAmount)}.`
    };
  }

  /**
   * Checks if two dates represent the same day
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  /**
   * Checks if the date range represents a full year
   */
  private isFullYear(startDate: Date, endDate: Date): boolean {
    return startDate.getFullYear() === endDate.getFullYear() &&
           startDate.getMonth() === 0 && startDate.getDate() === 1 &&
           endDate.getMonth() === 11 && endDate.getDate() === 31;
  }

  /**
   * Checks if the date range represents a full month
   */
  private isFullMonth(startDate: Date, endDate: Date): boolean {
    const year = startDate.getFullYear();
    const month = startDate.getMonth();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0); // Last day of the month

    return this.isSameDay(startDate, monthStart) && this.isSameDay(endDate, monthEnd);
  }

  /**
   * Checks if the date range represents a quarter (3 months)
   */
  private isQuarter(startDate: Date, endDate: Date): boolean {
    // Check if start date is the first day of a quarter (Jan 1, Apr 1, Jul 1, Oct 1)
    const startMonth = startDate.getMonth();
    const isStartOfQuarter = startDate.getDate() === 1 && (startMonth === 0 || startMonth === 3 || startMonth === 6 || startMonth === 9);

    // Check if end date is the last day of a quarter (Mar 31, Jun 30, Sep 30, Dec 31)
    const endMonth = endDate.getMonth();
    const isEndOfQuarter =
      (endMonth === 2 && endDate.getDate() === 31) || // March 31
      (endMonth === 5 && endDate.getDate() === 30) || // June 30
      (endMonth === 8 && endDate.getDate() === 30) || // September 30
      (endMonth === 11 && endDate.getDate() === 31);  // December 31

    // Both conditions must be true and the dates must be in the same year
    return isStartOfQuarter && isEndOfQuarter && startDate.getFullYear() === endDate.getFullYear();
  }

  /**
   * Checks if the date range represents a semester (6 months)
   */
  private isSemester(startDate: Date, endDate: Date): boolean {
    // Check if start date is the first day of a semester (Jan 1 or Jul 1)
    const startMonth = startDate.getMonth();
    const isStartOfSemester = startDate.getDate() === 1 && (startMonth === 0 || startMonth === 6);

    // Check if end date is the last day of a semester (Jun 30 or Dec 31)
    const endMonth = endDate.getMonth();
    const isEndOfSemester =
      (endMonth === 5 && endDate.getDate() === 30) || // June 30
      (endMonth === 11 && endDate.getDate() === 31);  // December 31

    // Both conditions must be true and the dates must be in the same year
    return isStartOfSemester && isEndOfSemester && startDate.getFullYear() === endDate.getFullYear();
  }

  sendDonationSummaryEmail(donorId: number, startDate: string, endDate: string, pdfFile: File): Observable<any> {
    const formData = new FormData();
    formData.append('donorId', donorId.toString());
    formData.append('startDate', startDate);
    formData.append('endDate', endDate);
    formData.append('pdfFile', pdfFile);

    return this.http.post(`${this.apiUrl}/send-donation-summary`, formData, {
      responseType: 'text'
    });
  }

  getDonationsByDateRange(donorId: number, startDate: string, endDate: string): Observable<Donation[]> {
    return this.http.get<Donation[]>(`${this.apiUrl}/donor/${donorId}/donations`, {
      params: { startDate, endDate }
    });
  }

  /**
   * Get donations for a specific year
   * @param donorId The donor ID
   * @param year The year to filter by
   * @returns Observable of donations for the specified year
   */
  getDonationsByYear(donorId: number, year: number): Observable<Donation[]> {
    // Create dates with local timezone and set time to start/end of day
    // Use UTC date strings to avoid timezone issues
    const startDateStr = `${year}-01-01`; // January 1st
    const endDateStr = `${year}-12-31`; // December 31st

    return this.getDonationsByDateRange(donorId, startDateStr, endDateStr);
  }

  /**
   * Get donations for a specific month and year
   * @param donorId The donor ID
   * @param year The year to filter by
   * @param month The month to filter by (0-11, where 0 is January)
   * @returns Observable of donations for the specified month and year
   */
  getDonationsByMonth(donorId: number, year: number, month: number): Observable<Donation[]> {
    // Use 1-based month for string formatting (JavaScript months are 0-based)
    // Ensure month is a number before adding 1 to avoid concatenation issues
    const monthNum = Number(month) + 1;
    const monthStr = monthNum.toString().padStart(2, '0');

    // Calculate last day of month (accounting for different month lengths and leap years)
    const lastDay = new Date(year, Number(month) + 1, 0).getDate();
    const lastDayStr = lastDay.toString().padStart(2, '0');

    // Create date strings directly in YYYY-MM-DD format to avoid timezone issues
    const startDateStr = `${year}-${monthStr}-01`; // First day of month
    const endDateStr = `${year}-${monthStr}-${lastDayStr}`; // Last day of month

    console.log(`Monthly report date range: ${startDateStr} to ${endDateStr}`);
    return this.getDonationsByDateRange(donorId, startDateStr, endDateStr);
  }

  getDonationTotal(donorId: number, startDate: string, endDate: string): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/donor/${donorId}/donation-total`, {
      params: { startDate, endDate }
    });
  }

  /**
   * Get total donation amount for a specific year
   * @param donorId The donor ID
   * @param year The year to filter by
   * @returns Observable of the total donation amount for the specified year
   */
  getDonationTotalByYear(donorId: number, year: number): Observable<number> {
    const startDate = new Date(year, 0, 1); // January 1st
    const endDate = new Date(year, 11, 31); // December 31st

    // Format dates as ISO strings for API calls (YYYY-MM-DD)
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    return this.getDonationTotal(donorId, startDateStr, endDateStr);
  }

  /**
   * Get total donation amount for a specific month and year
   * @param donorId The donor ID
   * @param year The year to filter by
   * @param month The month to filter by (0-11, where 0 is January)
   * @returns Observable of the total donation amount for the specified month and year
   */
  getDonationTotalByMonth(donorId: number, year: number, month: number): Observable<number> {
    const startDate = new Date(year, month, 1); // First day of month
    const endDate = new Date(year, month + 1, 0); // Last day of month

    // Format dates as ISO strings for API calls (YYYY-MM-DD)
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    return this.getDonationTotal(donorId, startDateStr, endDateStr);
  }

  sendEmail(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/send-email`, formData, {
      responseType: 'text'
    });
  }

  sendEmailWithTaxReceipt(donation: Donation, donor: any, pdfBlob: Blob): Observable<any> {
    const formData = new FormData();
    formData.append('to', donor.email);
    formData.append('subject', 'Tax Receipt for Your Donation');
    const donorName = `${donor.firstName} ${donor.lastName}`;
    formData.append('body', `Dear ${donorName},\n\nThank you for your generous donation of $${donation.amount}. Please find attached your tax receipt for your records.\n\nBest regards,\nFaseelah Charity`);
    formData.append('attachment', pdfBlob, 'tax_receipt.pdf');

    return this.sendEmail(formData);
  }

  sendOrphanCard(recipientEmail: string, recipientName: string, orphanName: string, templateType: string, cardFile: Blob): Observable<any> {
    const formData = new FormData();
    formData.append('recipientEmail', recipientEmail);
    formData.append('recipientName', recipientName);
    formData.append('orphanName', orphanName);
    formData.append('templateType', templateType);
    formData.append('cardFile', cardFile, `orphan_card_${templateType}.png`);

    return this.http.post(`${this.apiUrl}/send-orphan-card`, formData, {
      responseType: 'text'
    });
  }
}
