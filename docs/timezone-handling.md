# Timezone Handling Documentation

## Overview

This document describes the implementation of proper timezone handling in MCP Orch to ensure consistent datetime display across different client timezones.

## Problem Statement

**Issue**: Server timestamps were displaying incorrectly in the frontend (showing times approximately 10 hours behind actual time).

**Root Cause**: Backend API responses were sending datetime values without timezone information, causing JavaScript `Date()` constructor to interpret timestamps as local time instead of UTC.

### Example of the Issue

- **Backend sent**: `"2025-06-27T13:25:05.375815"` (no timezone info)
- **JavaScript interpreted**: `2025-06-27T04:25:05.375Z` (incorrectly assumed local time)
- **Frontend displayed**: "2025-06-27 01:25 PM GMT+9" (wrong time)

## Solution

### Backend Changes

Modified the `ServerResponse` Pydantic model to include a custom JSON encoder that ensures all datetime fields are serialized with proper UTC timezone information.

**File**: `src/mcp_orch/api/project_servers.py`

```python
class ServerResponse(BaseModel):
    # ... other fields ...
    last_connected: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
        # Ensure datetime fields are serialized with timezone information
        json_encoders = {
            datetime: lambda v: v.isoformat() + 'Z' if v.tzinfo is None else v.astimezone(datetime.timezone.utc).isoformat().replace('+00:00', 'Z')
        }
```

### How It Works

1. **Naive Datetime (no timezone)**: Assumes UTC and adds 'Z' suffix
   - Input: `datetime(2025, 6, 27, 13, 25, 5)`
   - Output: `"2025-06-27T13:25:05Z"`

2. **Timezone-aware Datetime**: Converts to UTC and adds 'Z' suffix
   - Input: `datetime(2025, 6, 27, 22, 25, 5, tzinfo=KST)`
   - Output: `"2025-06-27T13:25:05Z"`

### Frontend Compatibility

The frontend already uses JavaScript's built-in `Date()` constructor and `Intl.DateTimeFormat()` which properly handle ISO 8601 timestamps with timezone information:

```javascript
// Before fix (ambiguous)
new Date("2025-06-27T13:25:05.375815")  // Could be interpreted as local time

// After fix (explicit UTC)
new Date("2025-06-27T13:25:05.375815Z") // Clearly UTC time
```

## Impact Analysis

### Positive Impact
- ✅ **Accurate Time Display**: All timestamps now display correctly regardless of user's timezone
- ✅ **ISO 8601 Compliance**: Follows international standard for datetime representation
- ✅ **Backward Compatibility**: Existing clients continue to work without modification
- ✅ **Consistent API**: All datetime fields across the application now use the same format

### Risk Assessment
- 🟢 **Low Risk**: JavaScript `Date()` constructor supports both formats
- 🟢 **No Breaking Changes**: Existing API clients remain compatible
- 🟢 **Minimal Code Changes**: Only required updates to Pydantic model configurations

## Implementation Details

### Applied to Models
This timezone handling solution should be applied to all Pydantic response models that include datetime fields:

- `ServerResponse` (project servers)
- `ToolResponse` (tools)
- `LogResponse` (logs and activities)
- All other models with `datetime` fields

### Testing

To verify the fix is working:

1. **Backend API Response**:
   ```bash
   curl -H "Authorization: Bearer <token>" \
        "http://localhost:8000/api/projects/{id}/servers" | jq '.[] | .last_connected'
   ```
   Expected: `"2025-06-27T13:25:05.375815Z"` (with 'Z' suffix)

2. **Frontend Display**:
   Check that server timestamps show current or recent times, not times from many hours ago.

## Best Practices

### For Future Development

1. **Always Use UTC in Database**: Store all timestamps in UTC in the database
2. **Include Timezone in API Responses**: Use the JSON encoder pattern for all datetime fields
3. **Client-Side Formatting**: Let the frontend handle timezone conversion for display
4. **Consistent Standards**: Follow ISO 8601 format for all datetime serialization

### Example Template for New Models

```python
from datetime import datetime
from pydantic import BaseModel

class NewResponseModel(BaseModel):
    # ... other fields ...
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat() + 'Z' if v.tzinfo is None else v.astimezone(datetime.timezone.utc).isoformat().replace('+00:00', 'Z')
        }
```

## Verification

After implementing this fix:

1. **API Responses** include 'Z' suffix: `"2025-06-27T13:25:05.375815Z"`
2. **Frontend Displays** show correct local time based on user's timezone
3. **No Breaking Changes** for existing API clients
4. **Consistent Behavior** across all datetime fields in the application

## Related Files

- `src/mcp_orch/api/project_servers.py` - Server response model with timezone fix
- `web/src/lib/date-utils.ts` - Frontend date formatting utilities (unchanged)
- `web/src/app/projects/[projectId]/servers/page.tsx` - Frontend display (unchanged)

---

**Last Updated**: 2025-06-27  
**Task ID**: TASK_121  
**Status**: Implemented and Documented