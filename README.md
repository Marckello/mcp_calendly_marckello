# MCP Calendly Server v1.0 - n8n Compatible

A Model Context Protocol (MCP) server that provides seamless integration between Calendly and n8n workflow automation platform.

## ✨ Features

- 🔌 **Full n8n MCP Client Tool compatibility**
- 📅 **16 Calendly tools** for complete calendar automation
- 🔐 **Secure authentication** with Calendly Personal Access Token
- 🚀 **Production-ready** with PM2 process management
- 📊 **Real-time data** from your Calendly account
- 🎯 **HTTP Streamable** protocol support
- 🔗 **Smart booking URLs** with pre-filled invitee information

## 🛠️ Available Tools

### User & Organization
- `calendly_get_current_user` - Get current user information
- `calendly_get_organization` - Get organization details

### Event Types & Scheduling
- `calendly_list_event_types` - List user event types with scheduling URLs
- `calendly_get_event_type` - Get event type details
- `calendly_get_scheduling_links` - Get all available scheduling links for booking meetings
- `calendly_create_booking_url` - Create a pre-filled booking URL with invitee information

### Scheduled Events
- `calendly_list_scheduled_events` - List scheduled events
- `calendly_get_scheduled_event` - Get scheduled event details
- `calendly_cancel_scheduled_event` - Cancel a scheduled event

### Availability
- `calendly_get_user_availability` - Get user availability schedule

### Invitees
- `calendly_list_event_invitees` - List event invitees
- `calendly_get_invitee` - Get invitee details

### Webhooks
- `calendly_list_webhooks` - List webhooks
- `calendly_create_webhook` - Create webhook
- `calendly_get_webhook` - Get webhook details
- `calendly_delete_webhook` - Delete webhook

## 📦 Installation

### Prerequisites
- Node.js v18+ 
- npm or yarn
- Calendly Personal Access Token
- n8n instance (for integration)

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/Marckello/mcp_calendly_marckello.git
cd mcp_calendly_marckello
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env and add your Calendly Personal Access Token
```

4. **Get your Calendly token**
- Go to [Calendly Developer Settings](https://calendly.com/integrations/api_webhooks)
- Generate a Personal Access Token
- Add it to your `.env` file:
```env
CALENDLY_ACCESS_TOKEN=your_token_here
```

## 🚀 Running the Server

### Development
```bash
npm run dev
```

### Production with PM2
```bash
# Install PM2 globally
npm install -g pm2

# Start the server
pm2 start server.js --name "mcp-calendly"

# View logs
pm2 logs mcp-calendly

# Monitor
pm2 status
```

### Production with Supervisor
```bash
# Install supervisor
pip install supervisor

# Start with supervisor
supervisord -c supervisord.conf

# Check status
supervisorctl status
```

## 📅 How Scheduling Works

**Important**: The Calendly API does not support direct meeting scheduling. All bookings must be made through Calendly's web interface using scheduling links.

### Scheduling Process
1. Use `calendly_get_scheduling_links` to get available meeting types
2. Use `calendly_create_booking_url` to generate a pre-filled booking link
3. Share the link with invitees or open it in a browser
4. Select an available time slot on the Calendly page
5. Complete the booking with required information
6. The meeting is automatically scheduled in both calendars

### Example: Creating a Booking URL
When you call `calendly_create_booking_url` with:
- Event type: "30 Minute Meeting"
- Invitee: "Antonio" (markserga@icloud.com)
- Timezone: "America/New_York"

The tool returns a URL like:
```
https://calendly.com/marco-serga/30min?name=Antonio&email=markserga@icloud.com&timezone=America/New_York
```

This URL opens the Calendly booking page with the invitee's information pre-filled.

## 🔗 n8n Integration

### Configuration in n8n

1. Add a new **MCP Client Tool** node
2. Configure with these settings:
   - **Endpoint**: `http://localhost:3000/mcp` (or your server URL)
   - **Server Transport**: `HTTP Streamable`
   - **Authentication**: `None`
   - **Tools to Include**: `Selected` (choose the tools you need)

### Example n8n Workflow

```json
{
  "nodes": [
    {
      "type": "n8n-nodes-langchain.mcpClientTool",
      "parameters": {
        "endpoint": "http://localhost:3000/mcp",
        "transport": "HTTP Streamable",
        "tools": ["calendly_get_current_user", "calendly_list_scheduled_events"]
      }
    }
  ]
}
```

## 🔧 API Endpoints

### MCP Protocol Endpoint
- **POST** `/mcp` - Main MCP protocol endpoint

Supports three methods:
- `initialize` - Protocol handshake
- `tools/list` - Get available tools
- `tools/call` - Execute a tool

### Health Check
- **GET** `/health` - Server health status

## 📝 Example Usage

### Get Current User
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "calendly_get_current_user",
      "arguments": {}
    },
    "jsonrpc": "2.0",
    "id": 1
  }'
```

### Create Booking URL for a Meeting
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "calendly_create_booking_url",
      "arguments": {
        "event_type_name": "30 Minute Meeting",
        "invitee_name": "John Doe",
        "invitee_email": "john@example.com",
        "timezone": "America/New_York"
      }
    },
    "jsonrpc": "2.0",
    "id": 2
  }'
```

### List Scheduled Events
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "calendly_list_scheduled_events",
      "arguments": {
        "count": 10,
        "status": "active"
      }
    },
    "jsonrpc": "2.0",
    "id": 3
  }'
```

## 🐳 Docker Support

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

Build and run:
```bash
docker build -t mcp-calendly .
docker run -p 3000:3000 --env-file .env mcp-calendly
```

## 🔒 Security

- Store your Calendly token in environment variables
- Never commit `.env` file to repository
- Use HTTPS in production
- Implement rate limiting for production use

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/Marckello/mcp_calendly_marckello/issues)
- **Documentation**: [Calendly API Docs](https://developer.calendly.com/api-docs)
- **n8n Community**: [n8n Community Forum](https://community.n8n.io)

## 🏷️ Version

Current version: 1.0.0

## 👨‍💻 Author

**Marco Serrano**
- GitHub: [@Marckello](https://github.com/Marckello)

---

Made with ❤️ for the n8n and MCP community