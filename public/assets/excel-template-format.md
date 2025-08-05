# Excel Upload Template Format

## Column Structure

The Excel file should contain the following columns in order:

### Basic Information (Columns A-K)
1. **A: Orphan ID** (Required) - Unique identifier for the orphan
2. **B: First Name** (Required) - Orphan's first name
3. **C: Last Name** (Required) - Orphan's last name
4. **D: Date of Birth** (Required) - Format: YYYY-MM-DD
5. **E: Place of Birth** (Required) - City/location where orphan was born
6. **F: Gender** (Required) - Male/Female
7. **G: Location** (Required) - Current location/city
8. **H: Country** (Required) - Country name
9. **I: Health Status** (Required) - Good/Fair/Poor/Critical
10. **J: Special Needs** (Optional) - Any special needs or medical conditions
11. **K: Photo** (Optional) - Photo filename or URL

### Family Information (Columns L-X)
12. **L: Ethnic Group** (Optional) - Ethnic background
13. **M: Spoken Language** (Optional) - Primary language spoken
14. **N: Father Name** (Optional) - Father's full name
15. **O: Father Date of Death** (Optional) - Format: YYYY-MM-DD
16. **P: Father Cause of Death** (Optional) - Cause of father's death
17. **Q: Mother Name** (Optional) - Mother's full name
18. **R: Mother Status** (Optional) - Alive/Deceased
19. **S: Mother Date of Death** (Optional) - Format: YYYY-MM-DD
20. **T: Mother Cause of Death** (Optional) - Cause of mother's death
21. **U: Number of Siblings** (Optional) - Number as integer
22. **V: Guardian Name** (Optional) - Current guardian's name
23. **W: Relation to Orphan** (Optional) - Guardian's relationship to orphan
24. **X: Living Condition** (Optional) - Description of living situation

### Education Information (Columns Y-AF)
25. **Y: School Name** (Optional) - Name of current school
26. **Z: Grade Level** (Optional) - Current grade/class
27. **AA: Favorite Subject** (Optional) - Orphan's favorite subject
28. **AB: Education Needs** (Optional) - Special educational requirements
29. **AC: School Performance** (Optional) - Academic performance description
30. **AD: Orphan Dream** (Optional) - Future aspirations
31. **AE: Favorite Hobbies** (Optional) - Hobbies and interests
32. **AF: Supervisor Comments** (Optional) - Additional comments from supervisor

## Important Notes

1. **Header Row**: The first row should contain column headers
2. **Required Fields**: Columns A-I are required and must have values
3. **Date Format**: Use YYYY-MM-DD format for all dates
4. **File Format**: Save as .xlsx or .xls format
5. **File Size**: Maximum file size is 10MB
6. **Encoding**: Use UTF-8 encoding for special characters

## Example Data Row

| Orphan ID | First Name | Last Name | Date of Birth | Place of Birth | Gender | Location | Country | Health Status | Special Needs |
|-----------|------------|-----------|---------------|----------------|--------|----------|---------|---------------|---------------|
| MAR001    | Ahmed      | Hassan    | 2010-05-15    | Casablanca     | Male   | Rabat    | Morocco | Good          | None          |

## Error Handling

- Invalid rows will be skipped and logged
- The system will continue processing valid rows even if some rows fail
- A summary report will show successful imports and any errors encountered
