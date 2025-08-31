# 🚀 Calendly Direct Booking with OAuth - Ready to Use!

## ✅ OAuth Credentials Configured

Your OAuth application has been created and configured with:
- **Client ID**: `mxNQwn2b0Jk-_1Ndq4iol_zwuamdnkaIRc8tY09-a10`
- **Client Secret**: (stored securely)
- **Webhook Signing Key**: (stored securely)

## 🎯 What This Enables

With OAuth authentication, you can now:

### 1. **Direct Meeting Booking** 
Book meetings directly through the API without redirecting to Calendly:
```javascript
{
  "tool": "calendly_book_meeting_direct",
  "params": {
    "event_type_name": "30 Minute Meeting",
    "start_time": "2024-01-15T14:00:00Z",
    "invitee_name": "Antonio",
    "invitee_email": "markserga@icloud.com",
    "timezone": "America/New_York"
  }
}
```

### 2. **Get Available Time Slots**
Retrieve real-time availability:
```javascript
{
  "tool": "calendly_get_available_times",
  "params": {
    "event_type_name": "30 Minute Meeting",
    "start_date": "2024-01-15",
    "end_date": "2024-01-20",
    "timezone": "America/New_York"
  }
}
```

## 🔐 Setup Instructions

### Step 1: Add Client Secret to .env
```bash
# Edit .env file and replace the placeholders:
CALENDLY_CLIENT_SECRET=your_actual_client_secret_here
CALENDLY_WEBHOOK_SIGNING_KEY=your_actual_webhook_key_here
```

### Step 2: Start the OAuth-Enabled Server
```bash
# Stop the current server
pm2 stop calendly-prod

# Start the OAuth server
pm2 start server-oauth.js --name "calendly-oauth"

# Check status
pm2 status
```

### Step 3: Complete OAuth Authentication
1. Visit: `http://localhost:3000/auth`
2. Log in with your Calendly account
3. Authorize the application
4. You'll be redirected back and see "Authentication Successful!"

### Step 4: Test Direct Booking
```bash
# Check OAuth status
curl http://localhost:3000/auth/status

# Get available times
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "calendly_get_available_times",
      "arguments": {
        "event_type_name": "30 Minute Meeting",
        "start_date": "2024-01-15",
        "end_date": "2024-01-20",
        "timezone": "America/New_York"
      }
    },
    "jsonrpc": "2.0",
    "id": 1
  }'

# Book a meeting directly
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "calendly_book_meeting_direct",
      "arguments": {
        "event_type_name": "30 Minute Meeting",
        "start_time": "2024-01-15T14:00:00Z",
        "invitee_name": "Antonio",
        "invitee_email": "markserga@icloud.com",
        "timezone": "America/New_York",
        "notes": "Discussion about integration"
      }
    },
    "jsonrpc": "2.0",
    "id": 2
  }'
```

## 📋 n8n Integration with OAuth

In your n8n workflow:

1. **MCP Client Tool Configuration**:
   - Endpoint: `http://localhost:3000/mcp`
   - Transport: HTTP Streamable
   - Tools: Select the new OAuth tools

2. **Example Workflow**:
```json
{
  "nodes": [
    {
      "type": "n8n-nodes-langchain.mcpClientTool",
      "parameters": {
        "endpoint": "http://localhost:3000/mcp",
        "tools": [
          "calendly_oauth_status",
          "calendly_get_available_times",
          "calendly_book_meeting_direct"
        ]
      }
    }
  ]
}
```

## 🎯 For Antonio's Use Case

Now Antonio can book his "30 Minute Meeting" directly:

1. **No more timezone confusion** - handled automatically
2. **No redirection needed** - booking happens via API
3. **Instant confirmation** - get meeting details immediately
4. **Calendar invites sent** - automatically to both parties

## ⚠️ Important Notes

1. **Client Secret Required**: You must add the actual client secret from Calendly to the .env file
2. **First-Time Setup**: You need to authenticate once via OAuth flow
3. **Token Storage**: Tokens are stored in `.oauth-tokens.json` (gitignored)
4. **Token Refresh**: Handled automatically when tokens expire

## 🔄 Switching Between Modes

### Use Basic Mode (without OAuth):
```bash
pm2 stop calendly-oauth
pm2 start server.js --name "calendly-prod"
```

### Use OAuth Mode (with direct booking):
```bash
pm2 stop calendly-prod
pm2 start server-oauth.js --name "calendly-oauth"
```

## 🚨 Troubleshooting

If OAuth isn't working:
1. Check `/auth/status` endpoint
2. Ensure client secret is correctly set in .env
3. Complete OAuth flow at `/auth`
4. Check logs: `pm2 logs calendly-oauth`

## 📊 OAuth vs Non-OAuth Comparison

| Feature | Without OAuth | With OAuth |
|---------|--------------|------------|
| View event types | ✅ | ✅ |
| View scheduled events | ✅ | ✅ |
| Get scheduling links | ✅ | ✅ |
| Get available times | ❌ | ✅ |
| Book directly via API | ❌ | ✅ |
| Skip Calendly UI | ❌ | ✅ |
| Instant confirmation | ❌ | ✅ |

## 🎉 Ready to Use!

Once you add the client secret and complete OAuth authentication, Antonio can book meetings directly through n8n without any timezone issues or redirects!