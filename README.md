# MCP Calendly Server v1.3.0 - N8N Compatible

## Complete MCP (Model Context Protocol) Server for Calendly Integration

**Production-Ready** | **Real API Integration** | **EasyPanel Deployment** | **N8N Automation Support** | **Schema Compatible**

## Project Overview

- **Name**: MCP Calendly Server
- **Version**: v1.3.0
- **Goal**: Complete Calendly automation through MCP protocol
- **Features**: 14 comprehensive Calendly API tools with bidirectional MCP communication
- **N8N Compatible**: Specialized endpoints for N8N workflow automation

## Live URLs

- **Production**: Ready for EasyPanel deployment
- **GitHub**: https://github.com/Marckello/mcp_calendly_marckello
- **MCP Protocol**: Native MCP with WebSocket & SSE support
- **N8N Endpoints**: `/n8n/tools` and `/n8n/execute` for workflow automation

## N8N Integration

### **SOLVED: N8N Schema Compatibility Errors**

If you're getting **"Received tool input did not match expected schema"** errors in N8N, use these **specialized N8N endpoints**:

#### **N8N-Compatible Endpoints:**

- **GET `/n8n/tools`** - Get available tools in N8N-compatible format
- **POST `/n8n/execute`** - Execute tools with N8N schema validation

#### **Example N8N Request:**

```json
POST /n8n/execute
{
  "toolName": "calendly_get_current_user",
  "input": {}
}
```

#### **N8N Response Format:**

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"success\": true, \"data\": {...}}"
    }
  ],
  "isError": false
}
```

## Technical Architecture

### **Core Technologies**

- **Framework**: TypeScript + Node.js + Express
- **Protocol**: MCP (Model Context Protocol) with JSON-RPC 2.0
- **Transport**: HTTP + WebSocket + Server-Sent Events (SSE)
- **API Integration**: Calendly REST API v1
- **N8N Compatibility**: Schema validation layer for workflow automation
- **Deployment**: Docker multi-stage builds for EasyPanel
- **Automation**: N8n workflow integration with dedicated endpoints

### **Data Architecture**

- **Calendly API**: Real-time data integration
- **User Management**: Current user and organization information
- **Event Management**: Event types, scheduled events, and invitees
- **Webhook Integration**: Real-time notifications and automation
- **Availability**: User availability schedules and rules

### **Security & Validation**

- **Authentication**: Calendly Personal Access Token
- **Validation**: Joi schemas for all API inputs
- **N8N Compatibility**: Input sanitization and schema validation
- **Security**: Helmet + CORS middleware
- **Logging**: Winston structured logging
- **Error Handling**: Comprehensive error management

## MCP Tools Available (14 Tools)

### **Core User & Organization Tools**

- `calendly_get_current_user` - Get current user information
- `calendly_get_organization` - Get organization details

### **Event Type Management**

- `calendly_list_event_types` - List user event types
- `calendly_get_event_type` - Get event type details

### **Scheduled Events Management**

- `calendly_list_scheduled_events` - List scheduled events
- `calendly_get_scheduled_event` - Get scheduled event details
- `calendly_cancel_scheduled_event` - Cancel a scheduled event

### **Invitee Management**

- `calendly_list_event_invitees` - List event invitees
- `calendly_get_invitee` - Get invitee details

### **Availability Management**

- `calendly_get_user_availability` - Get user availability schedule

### **Webhook Management**

- `calendly_list_webhooks` - List webhook subscriptions
- `calendly_create_webhook` - Create new webhook
- `calendly_get_webhook` - Get webhook details
- `calendly_delete_webhook` - Delete webhook

## Deployment Guide

### **EasyPanel Deployment**

```bash
# 1. Configure environment variables in EasyPanel
CALENDLY_ACCESS_TOKEN=your_personal_access_token
NODE_ENV=production
PORT=3000
HTTP_MODE=true

# 2. Deploy with Docker
docker build -t mcp-calendly-server .
```

### **Local Development**

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your Calendly access token

# 3. Build and start
npm run build
npm start

# 4. Test MCP endpoints
curl http://localhost:3000/health
curl http://localhost:3000/mcp -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# 5. Test N8N endpoints
curl http://localhost:3000/n8n/tools
```

## MCP Protocol Integration

### **Connection Methods**

- **HTTP**: `POST http://localhost:3000/mcp`
- **WebSocket**: `ws://localhost:3000/mcp-ws`
- **Server-Sent Events**: `http://localhost:3000/mcp-sse`
- **N8N Compatible**: `POST http://localhost:3000/n8n/execute`

### **Example MCP Request**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "calendly_get_current_user",
    "arguments": {}
  }
}
```

### **Example N8N Request**

```json
{
  "toolName": "calendly_list_event_types",
  "input": {
    "active_only": true
  }
}
```

## N8n Automation Integration

### **Standard Webhook Endpoint**

- **URL**: `http://localhost:3000/webhook/n8n`
- **Method**: POST
- **Content-Type**: application/json

### **N8N-Compatible Tool Endpoints**

- **Tools List**: `GET http://localhost:3000/n8n/tools`
- **Execute Tool**: `POST http://localhost:3000/n8n/execute`

### **Integration Features**

- Schema-validated tool execution
- Real-time event notifications
- Automated scheduling workflows
- Invitee management automation
- Webhook-based integrations

## Security & Best Practices

### **Production Configuration**

- Environment variables for credentials
- Input validation with Joi schemas
- N8N schema compatibility layer
- Rate limiting and security headers
- Structured logging for monitoring
- Error handling and recovery
- Docker multi-stage builds

### **API Rate Limits**

- Calendly API: Standard rate limits apply
- MCP Protocol: No artificial limits
- N8N Endpoints: Validated input processing
- Error recovery: Automatic retry logic

## Environment Variables

```bash
# Required
CALENDLY_ACCESS_TOKEN=your_calendly_personal_access_token

# Optional
NODE_ENV=production
HTTP_MODE=true
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info
```

## Getting Calendly Access Token

1. Go to [Calendly Developer Settings](https://calendly.com/integrations/api_webhooks)
2. Generate a Personal Access Token
3. Copy the token to your environment variables

## Recent Updates (v1.3.0)

### **Complete Calendly Integration**

- **Full API Coverage** - All major Calendly endpoints supported
- **MCP Protocol Compatibility** - Native MCP 1.0 implementation
- **N8N Schema Compatibility** - Dedicated endpoints for N8N workflows
- **Real-time Webhooks** - Complete webhook management tools

### **Production Ready Features**

- **Docker Multi-stage Build** - Optimized for EasyPanel deployment
- **Comprehensive Error Handling** - Robust error recovery and logging
- **Security Hardened** - Helmet, CORS, and input validation
- **Structured Logging** - Winston-based logging for monitoring

## Production Verification

**All critical tools tested with real Calendly API:**

- User Information: Real user data retrieval
- Event Types: Active event type management
- Scheduled Events: Complete event lifecycle
- Invitee Management: Full invitee operations
- Webhook Integration: Real-time notifications
- N8N Compatibility: Schema validation verified
- Zero mock data: 100% real Calendly API integration

## Support & Maintenance

- **Status**: Production Ready
- **Platform**: EasyPanel optimized
- **N8N Compatible**: Schema validation layer included
- **Tech Stack**: TypeScript + Node.js + Express + Docker
- **Last Updated**: 2025-08-31
- **Verified**: Real Calendly API integration + N8N compatibility

---

**Ready for production deployment with complete Calendly automation capabilities and N8N workflow integration.**