# Local Image Storage Solution

## Overview

This document describes the implementation of local image storage for orphan photos in the charity management application. The solution addresses the issue of relying on external Google Drive URLs that may become unavailable when images are deleted from Google Drive.

## Implementation Details

### Backend Changes

1. **Enhanced ImageProxyService**
   - Added functionality to download and store images locally
   - Images are saved to `/app/uploads/` directory with unique filenames
   - Handles various URL formats including Google Drive URLs
   - Provides methods to convert external URLs to local paths

2. **Migration Utility**
   - Added a new endpoint `/api/orphans/migrate-photos` to batch migrate external images to local storage
   - Supports selective migration of only Google Drive URLs or all external URLs
   - Returns detailed migration results (success, failed, skipped)

3. **Excel Import Process**
   - Modified to automatically download and store images locally during Excel import
   - Converts external URLs in Excel files to local paths
   - Handles errors gracefully, keeping original URLs if download fails

4. **OrphanService Updates**
   - Added `updateOrphanPhotoPath` method to update photo paths without returning DTOs
   - Handles cleanup of old local images when updating photos

### Frontend Changes

1. **ProxyImageComponent Improvements**
   - Enhanced to better handle local image paths
   - Added fallback mechanism to try proxy if direct loading fails
   - Improved error messages to suggest migration for failed external images
   - Optimized image loading process

## Usage Guide

### Migrating Existing Images

To migrate existing external images to local storage:

1. **For Google Drive URLs Only:**
   ```
   POST /api/orphans/migrate-photos
   ```

2. **For All External URLs:**
   ```
   POST /api/orphans/migrate-photos?downloadAll=true
   ```

The migration endpoint returns a summary of results:
```json
{
  "success": 10,
  "failed": 2,
  "skipped": 5,
  "total": 17
}
```

### Excel Import

When importing orphans via Excel:
- Images referenced by URLs in the Excel file will be automatically downloaded and stored locally
- The orphan records will be updated with local paths
- If image download fails, the original URL will be preserved

### Viewing Images

The frontend `ProxyImageComponent` handles both local and external images:
- Local images (`/uploads/filename.jpg`) are loaded directly from the backend
- External images are fetched via the proxy service
- If an external image fails to load, the component will attempt to use the proxy as a fallback

## Technical Details

### Image Storage Path

Images are stored in the `/app/uploads/` directory on the backend server with:
- Unique filenames generated using UUID
- Original file extensions preserved when possible
- Accessible via `http://localhost:8080/uploads/filename.jpg`

### Security Considerations

- The `/uploads/**` path is configured to be publicly accessible without authentication
- CORS is configured to allow access from the frontend origin
- No sensitive information is stored in image filenames

## Troubleshooting

### Image Not Found (404) Errors

If you're getting 404 errors when accessing images:

1. **Check directory structure**:
   - Ensure the `/app/uploads/` directory exists on the server
   - The directory must have proper read/write permissions
   - On Windows, the path might be created as `C:\app\uploads\`

2. **Verify file existence**:
   - Check if the image file exists at the expected location
   - Verify the filename in the database matches the actual file on disk

3. **Check resource mapping**:
   - The backend should map `/uploads/**` to the physical directory
   - Restart the backend after making configuration changes
   - Check server logs for any resource mapping errors

4. **Path format issues**:
   - Ensure image paths in the database start with `/uploads/`
   - If paths are stored without the leading slash, the frontend will add it

### Image Loading Issues

1. **Placeholder text being treated as image paths**:
   - The application now handles "Photo" as a placeholder value
   - Other placeholder values like "none", "n/a" are also handled

2. **CORS issues**:
   - Check browser console for CORS errors
   - Ensure the backend CORS configuration allows access to `/uploads/**`

3. **External URL failures**:
   - If external URLs (like Google Drive) fail to load, use the migration utility
   - Run `POST /api/orphans/migrate-photos` to download them locally

### Manual Fixes

1. **Recreate upload directory**:
   ```bash
   mkdir -p /app/uploads
   chmod 777 /app/uploads  # On Linux/Mac
   ```

2. **Check image paths in database**:
   ```sql
   SELECT id, photo FROM orphan_id_card WHERE photo LIKE '%uploads%';
   ```

3. **Fix incorrect paths**:
   ```sql
   UPDATE orphan_id_card SET photo = CONCAT('/uploads/', SUBSTRING(photo, LOCATE('uploads/', photo) + 8)) 
   WHERE photo LIKE '%uploads/%' AND photo NOT LIKE '/uploads/%';
   ```

4. **Re-run migration utility**:
   ```
   POST /api/orphans/migrate-photos?downloadAll=true
   ```
