# Fund Box Model Testing Guide

## Overview
This guide provides comprehensive testing steps for the Fund Box Model implementation in the orphan management system.

## Prerequisites
1. Backend server running on port 8080
2. Frontend development server running on port 4200
3. Database with gift_type table created (run database_migration.sql)
4. Default gift types initialized

## Testing Scenarios

### 1. Backend API Testing

#### Test Gift Type Endpoints
```bash
# Get all gift types
curl -X GET http://localhost:8080/api/gift-types

# Get gift types with balances
curl -X GET http://localhost:8080/api/gift-types/with-balances

# Create new gift type
curl -X POST http://localhost:8080/api/gift-types \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Fund", "description": "Test fund for validation"}'

# Get gift type balance
curl -X GET http://localhost:8080/api/gift-types/1/balance

# Check sufficient balance
curl -X GET "http://localhost:8080/api/gift-types/1/sufficient-balance?amount=100"

# Initialize default gift types
curl -X POST http://localhost:8080/api/gift-types/initialize-defaults
```

### 2. Frontend Component Testing

#### A. Fund Box Dashboard
1. Navigate to `/fund-box-dashboard`
2. Verify summary statistics display correctly
3. Check gift types table shows all active gift types
4. Verify balance color coding (green > $1000, yellow > $100, red ≤ $100)
5. Test refresh functionality
6. Verify quick action buttons navigate correctly

#### B. Gift Type Management
1. Navigate to `/gift-type-management`
2. Test adding new gift type
3. Test editing existing gift type
4. Test deactivating gift type
5. Test search/filter functionality
6. Verify balance calculations are accurate

#### C. Donor Management - Donation Form
1. Navigate to donor management page
2. Open donation form
3. Test gift type dropdown population
4. Test custom gift type creation
5. Submit donation and verify balance update
6. Test form validation

#### D. Donor Management - Gift Form
1. Open gift/expense form
2. Select gift type with sufficient balance
3. Verify balance display updates
4. Test insufficient balance validation
5. Submit valid gift and verify balance deduction

### 3. End-to-End Testing Scenarios

#### Scenario 1: Complete Fund Management Workflow
1. **Create Gift Type**
   - Go to Gift Type Management
   - Add new gift type "Emergency Fund"
   - Verify it appears in dashboard

2. **Add Donation**
   - Go to Donor Management
   - Create donation of $500 to "Emergency Fund"
   - Verify balance increases to $500

3. **Create Gift/Expense**
   - Create gift of $200 from "Emergency Fund"
   - Verify balance decreases to $300
   - Attempt gift of $400 (should fail with insufficient balance)

4. **Verify Dashboard**
   - Check dashboard shows updated balances
   - Verify statistics are accurate

#### Scenario 2: Custom Gift Type Creation
1. **From Donation Form**
   - Select "Other (Custom)" in gift type dropdown
   - Enter "School Supplies Fund"
   - Submit donation
   - Verify new gift type created and appears in management page

2. **From Gift Form**
   - Try to create gift for new gift type (should fail - no balance)
   - Add donation first, then create gift

#### Scenario 3: Balance Validation
1. **Insufficient Balance Test**
   - Find gift type with low balance
   - Attempt to create gift exceeding balance
   - Verify error message displays
   - Verify gift is not created

2. **Exact Balance Test**
   - Create gift exactly equal to available balance
   - Verify balance becomes $0.00
   - Verify subsequent gifts are blocked

### 4. Data Integrity Testing

#### Database Validation Queries
```sql
-- Verify gift type balances
SELECT 
    gt.name,
    COALESCE(SUM(d.amount), 0) as total_donations,
    COALESCE(SUM(g.amount), 0) as total_expenses,
    (COALESCE(SUM(d.amount), 0) - COALESCE(SUM(g.amount), 0)) as calculated_balance
FROM gift_type gt
LEFT JOIN donation d ON gt.id = d.gift_type_id
LEFT JOIN gift g ON gt.id = g.gift_type_id
WHERE gt.is_active = true
GROUP BY gt.id, gt.name;

-- Check for orphaned records
SELECT COUNT(*) FROM donation WHERE gift_type_id IS NULL;
SELECT COUNT(*) FROM gift WHERE gift_type_id IS NULL;

-- Verify default gift types exist
SELECT * FROM gift_type WHERE name IN (
    'Orphan Sponsorship Monthly',
    'Orphan General Fund',
    'Orphan Eid Gift',
    'WASH Water Well with Handpump',
    'Education Sponsor a Student',
    'Ramadan Foodbasket',
    'Udhiyah Sheep'
);
```

### 5. Error Handling Testing

#### Test Error Scenarios
1. **Network Errors**
   - Stop backend server
   - Try to load gift types
   - Verify error messages display

2. **Invalid Data**
   - Submit empty gift type name
   - Submit negative donation amount
   - Submit gift with invalid gift type ID

3. **Concurrent Updates**
   - Open two browser tabs
   - Create gifts simultaneously from same fund
   - Verify balance consistency

### 6. Performance Testing

#### Load Testing
1. Create 50+ gift types
2. Add 100+ donations across different gift types
3. Create 50+ gifts/expenses
4. Verify dashboard loads quickly
5. Test search performance in gift type management

### 7. Mobile Responsiveness Testing

#### Test on Different Screen Sizes
1. Test dashboard on mobile (320px width)
2. Test gift type management table responsiveness
3. Test donation/gift forms on tablet
4. Verify all buttons and inputs are accessible

## Expected Results

### Success Criteria
- ✅ All API endpoints return correct data
- ✅ Balance calculations are accurate
- ✅ Validation prevents overspending
- ✅ Custom gift types can be created
- ✅ Dashboard shows real-time data
- ✅ Forms are user-friendly and responsive
- ✅ Error handling is graceful
- ✅ Database integrity is maintained

### Performance Benchmarks
- Dashboard loads in < 2 seconds
- Gift type management loads in < 1 second
- Form submissions complete in < 500ms
- Search results appear in < 300ms

## Troubleshooting

### Common Issues
1. **Gift types not loading**: Check backend server and CORS configuration
2. **Balance calculations incorrect**: Verify database migration ran successfully
3. **Forms not submitting**: Check browser console for JavaScript errors
4. **Styling issues**: Verify SCSS files compiled correctly

### Debug Steps
1. Check browser developer tools console
2. Verify network requests in Network tab
3. Check backend logs for errors
4. Validate database schema matches entity definitions

## Reporting Issues
When reporting bugs, include:
- Steps to reproduce
- Expected vs actual behavior
- Browser and version
- Console error messages
- Screenshots if applicable
