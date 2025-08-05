# Donor Excel Upload Template Format

## Column Structure

The Excel file should contain the following columns in order:

### Donor Information (Columns A-K)
1. **A: Donor ID** (Required) - Unique identifier for the donor
2. **B: Name** (Required) - Donor's full name
3. **C: Address** (Required) - Primary address
4. **D: Address Two** (Optional) - Secondary address line
5. **E: Phone** (Required) - Phone number
6. **F: Email** (Required) - Email address
7. **G: City** (Required) - City name
8. **H: State** (Required) - State or province
9. **I: ZIP** (Required) - ZIP or postal code
10. **J: Country** (Required) - Country name
11. **K: Company** (Optional) - Company or organization name

## Important Notes

1. **Header Row**: The first row should contain column headers
2. **Required Fields**: Columns A, B, C, E, F, G, H, I, J are required and must have values
3. **Email Format**: Must be a valid email address format
4. **File Format**: Save as .xlsx or .xls format
5. **File Size**: Maximum file size is 10MB
6. **Encoding**: Use UTF-8 encoding for special characters

## Sample Data Row

| Donor ID | Name | Address | Address Two | Phone | Email | City | State | ZIP | Country | Company |
|----------|------|---------|-------------|-------|-------|------|-------|-----|---------|---------|
| DON001 | John Smith | 123 Main St | Apt 4B | +1-555-0123 | john.smith@email.com | New York | NY | 10001 | USA | ABC Corp |

## Usage Instructions

1. Download or create an Excel file with the above column structure
2. Fill in the donor data starting from row 2 (row 1 should contain headers)
3. Ensure all required fields are populated
4. Save the file in .xlsx or .xls format
5. Use the "Upload Excel" button in the Donor Management page
6. Select your file and click "Upload File"

## Error Handling

- If a row has missing required fields, it will be skipped and logged
- Invalid email formats will cause the row to be skipped
- The system will continue processing other rows even if some fail
- A summary of successful imports and errors will be displayed after upload
