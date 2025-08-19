# Donor Name Refactor Testing Guide

This guide outlines the steps to test the changes made to the Donor model, where the single `name` field has been replaced with separate `firstName` and `lastName` fields.

## Prerequisites

1. Backend server is running with the updated schema
2. Frontend application is running with the updated components
3. Database migration has been executed

## Testing Steps

### 1. Database Migration Verification

- Verify that the database migration script has run successfully
- Check that the `donor` table now has `first_name` and `last_name` columns
- Confirm that the `name` column has been removed
- Verify that existing data has been migrated properly

### 2. Creating a New Donor

- Navigate to the donor management page
- Click "Add New Donor"
- Fill out the form with the following test data:
  - First Name: "John"
  - Last Name: "Doe"
  - Email: "john.doe@example.com"
  - Phone: "123-456-7890"
  - Address: "123 Main St"
  - City: "Anytown"
  - State: "State"
  - ZIP: "12345"
  - Country: "Country"
- Submit the form
- Verify that the donor is created successfully
- Check that the donor appears in the donor list with both first and last name displayed

### 3. Editing an Existing Donor

- Select an existing donor from the list
- Click "Edit"
- Modify both the first name and last name fields
- Save the changes
- Verify that the changes are reflected in the donor list
- Check the database to confirm the changes were saved correctly

### 4. Donor Details View

- Select a donor to view their details
- Verify that both first name and last name are displayed correctly
- Check that any statistics or related information is still displayed properly

### 5. Orphan Management Integration

- Navigate to the orphan management page
- Check any dropdowns or lists that display donor names
- Verify that both first and last names are displayed correctly
- Test selecting a donor from these lists to ensure the correct donor is selected

### 6. Excel Import/Export

- If applicable, test importing donors from an Excel file
- Verify that the import process correctly maps columns to firstName and lastName
- Test exporting donors to Excel and check that both name fields are included

### 7. Search Functionality

- Test searching for donors by first name
- Test searching for donors by last name
- Verify that search results display correctly

### 8. API Testing

- Use a tool like Postman to test the donor API endpoints
- Verify that GET requests return donor data with firstName and lastName
- Test POST and PUT requests with the new field structure
- Ensure that all API responses include the correct fields

## Troubleshooting

If issues are encountered:

1. Check browser console for JavaScript errors
2. Review backend logs for exceptions
3. Verify that all components are using the updated model
4. Confirm that the database schema matches the entity classes

## Rollback Plan

If critical issues are found:

1. Revert the database migration
2. Restore the previous version of the code
3. Restart the application
