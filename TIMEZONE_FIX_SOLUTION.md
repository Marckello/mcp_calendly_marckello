# Calendly MCP Server - Timezone Fix Solution

## Problem
Antonio (markserga@icloud.com) was unable to schedule a "30 Minute Meeting" through the Calendly integration. The system was requesting timezone information and preventing the scheduling from completing.

## Root Cause
The Calendly API **does not support direct meeting scheduling**. It only provides:
- View event types (meeting templates)
- View already scheduled events
- Manage webhooks and user information

All actual booking/scheduling must happen through Calendly's web interface using scheduling links.

## Solution Implemented

### 1. Added New Tools

#### `calendly_get_scheduling_links`
- Lists all available event types with their scheduling URLs
- Returns formatted links that users can share for booking meetings
- Includes instructions on how to use the scheduling links

#### `calendly_create_booking_url`
- Creates pre-filled booking URLs for specific event types
- Accepts parameters:
  - `event_type_name`: Name of the meeting type (e.g., "30 Minute Meeting")
  - `invitee_name`: Name of the person booking
  - `invitee_email`: Email of the person booking
  - `timezone`: Timezone for the meeting (defaults to America/New_York)
- Returns a URL with pre-filled information

### 2. How It Works Now

For Antonio to schedule a meeting:

1. **Generate the booking URL:**
```bash
curl -X POST https://3000-i6flpwy50i2euwlueftgm-6532622b.e2b.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "calendly_create_booking_url",
      "arguments": {
        "event_type_name": "30 Minute Meeting",
        "invitee_name": "Antonio",
        "invitee_email": "markserga@icloud.com",
        "timezone": "America/New_York"
      }
    },
    "jsonrpc": "2.0",
    "id": 1
  }'
```

2. **The tool returns a booking URL:**
```
https://calendly.com/marco-serga/30min?name=Antonio&email=markserga@icloud.com&timezone=America/New_York
```

3. **Antonio opens this URL in a browser**
   - His name and email are pre-filled
   - Timezone is set to America/New_York
   - He selects an available time slot
   - Confirms the booking
   - Meeting is automatically scheduled

## Testing the Fix

### Via n8n:
1. Use the MCP Client Tool node
2. Configure endpoint: `https://3000-i6flpwy50i2euwlueftgm-6532622b.e2b.dev/mcp`
3. Call `calendly_create_booking_url` with Antonio's information
4. Share the returned URL with Antonio

### Direct API Test:
```bash
# Get all scheduling links
curl -X POST https://3000-i6flpwy50i2euwlueftgm-6532622b.e2b.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "calendly_get_scheduling_links",
      "arguments": {"active_only": true}
    },
    "jsonrpc": "2.0",
    "id": 1
  }'
```

## Key Points

1. **Calendly API Limitation**: Direct booking through API is not possible
2. **Solution**: Generate pre-filled booking URLs that open Calendly's web interface
3. **Timezone Handling**: Now properly passed as URL parameter
4. **User Experience**: Seamless - invitee info is pre-filled, just select time slot

## Server Details

- **Production URL**: `https://3000-i6flpwy50i2euwlueftgm-6532622b.e2b.dev/mcp`
- **Health Check**: `https://3000-i6flpwy50i2euwlueftgm-6532622b.e2b.dev/health`
- **GitHub Repository**: https://github.com/Marckello/mcp_calendly_marckello
- **Version**: 1.0.0

## Changes Made

1. Added 2 new tools to server.js
2. Updated README with scheduling instructions
3. Clarified API limitations
4. Provided clear examples for booking URLs
5. Fixed timezone parameter handling

The server is now running and ready for use!