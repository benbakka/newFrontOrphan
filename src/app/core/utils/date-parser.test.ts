import { DateParserUtil } from './date-parser.util';

// Simple test function to demonstrate date parsing capabilities
export function testDateParsing(): void {
  const dateParser = new DateParserUtil();
  
  console.log('=== Date Parser Test Results ===');
  
  const testDates = [
    '2025-01-10',      // ISO format
    '2000/23/02',      // Invalid date (month 23)
    '02/23/2000',      // MM/DD/YYYY
    '10/01/2025',      // DD/MM/YYYY or MM/DD/YYYY (ambiguous)
    '23/02/2000',      // DD/MM/YYYY (clear because day > 12)
    '2025/02/23',      // YYYY/MM/DD
    '15-03-2020',      // DD-MM-YYYY
    '03-15-2020',      // MM-DD-YYYY
    '2020-12-25',      // ISO format
    '25/12/2020',      // DD/MM/YYYY (clear)
    '12/25/2020',      // MM/DD/YYYY (clear)
    '01/02/2025',      // Ambiguous - defaults to MM/DD
    '2025/13/01',      // Invalid month
    '31/02/2025',      // Invalid date (Feb 31)
    '29/02/2024',      // Valid leap year
    '29/02/2023',      // Invalid leap year
    '',                // Empty string
    null,              // Null value
    undefined,         // Undefined value
    new Date('2025-01-10'), // Date object
  ];
  
  testDates.forEach((testDate, index) => {
    try {
      const result = dateParser.parseExcelDate(testDate);
      console.log(`${index + 1}. Input: "${testDate}" -> Output: "${result}"`);
    } catch (error) {
      console.log(`${index + 1}. Input: "${testDate}" -> Error: ${error}`);
    }
  });
  
  console.log('\n=== Batch Processing Test ===');
  const batchDates = ['2025-01-10', '23/02/2000', '02/23/2000', 'invalid-date'];
  const batchResults = dateParser.parseMultipleDates(batchDates);
  console.log('Batch input:', batchDates);
  console.log('Batch output:', batchResults);
  
  console.log('\n=== Validation Test ===');
  const validationTests = [
    '2025-01-10',
    '23/02/2000', 
    'invalid-date',
    '32/01/2025'
  ];
  
  validationTests.forEach(date => {
    const isValid = dateParser.isValidDateFormat(date);
    console.log(`"${date}" is ${isValid ? 'valid' : 'invalid'}`);
  });
}

// Export for use in console or testing
(window as any).testDateParsing = testDateParsing;
