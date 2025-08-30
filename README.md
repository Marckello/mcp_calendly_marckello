# 🚀 MCP Calendly Streaming Server

**Enterprise-grade Model Context Protocol (MCP) server for Calendly API with real-time bidirectional streaming capabilities.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![MCP Protocol](https://img.shields.io/badge/MCP-1.0.0-blue)](https://spec.modelcontextprotocol.io/)
[![Version](https://img.shields.io/badge/version-1.1.1-green.svg)](https://github.com/Marckello/mcp_calendly_marckello/releases)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://hub.docker.com/)

## 🎯 Features

### 🔌 **Streaming Architecture**
- **WebSocket Bidirectional Streaming** - Real-time MCP tool execution
- **Server-Sent Events (SSE)** - Live server-side event broadcasting
- **Connection Management** - Advanced connection pooling and monitoring
- **Protocol Compliance** - Full MCP 1.0 specification support

### 🛠️ **Complete MCP Tool Suite (14 Tools)**

#### 👤 User Management
- `calendly_get_current_user` - Retrieve current user information

#### 🏢 Organization
- `calendly_get_organization` - Get organization details and settings

#### 📅 Event Types
- `calendly_list_event_types` - List all user event types
- `calendly_get_event_type` - Get specific event type details

#### 🗓️ Scheduled Events
- `calendly_list_scheduled_events` - List scheduled events with filtering
- `calendly_get_scheduled_event` - Get detailed event information
- `calendly_cancel_scheduled_event` - Cancel scheduled events

#### 👥 Invitees
- `calendly_list_event_invitees` - List event participants
- `calendly_get_invitee` - Get detailed invitee information

#### ⏰ Availability
- `calendly_get_user_availability` - Retrieve user availability schedules

#### 🪝 Webhooks
- `calendly_list_webhooks` - List configured webhooks
- `calendly_create_webhook` - Create new webhook subscriptions
- `calendly_get_webhook` - Get webhook details
- `calendly_delete_webhook` - Remove webhook subscriptions

### 🛡️ **Enterprise Security**
- **OAuth 1.0a Integration** - Secure API authentication
- **Rate Limiting** - DDoS protection and API quota management
- **Connection Security** - WebSocket authentication and validation
- **Audit Trail** - Complete request/response logging
- **Data Encryption** - Sensitive data protection

### 📊 **Monitoring & Analytics**
- **Real-time Dashboard** - Live connection and performance monitoring
- **Health Checks** - System status and uptime tracking
- **Performance Metrics** - Execution time and success rate analytics
- **Connection Analytics** - WebSocket and SSE usage statistics

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Calendly Personal Access Token
- npm or yarn

### Installation

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
   # Edit .env with your Calendly API token and configuration
   ```

4. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode  
   npm run start
   
   # With PM2 (recommended for production)
   npm run pm2:start
   ```

### Configuration

Create a `.env` file with your settings:

```env
# Required: Your Calendly Personal Access Token
CALENDLY_ACCESS_TOKEN=your_token_here

# Optional: Customize server behavior
PORT=3000
NODE_ENV=production
RATE_LIMIT_REQUESTS_PER_MINUTE=100
MAX_CONNECTIONS=100
```

## 📖 Usage

### Web Interface
Access the interactive dashboard at `http://localhost:3000`

### WebSocket Connection
```javascript
const socket = io('ws://localhost:3000')

// Execute MCP tool
socket.emit('mcp_tool_request', {
  request_id: 'unique_id',
  tool_name: 'calendly_get_current_user',
  parameters: {}
})

// Handle response
socket.on('mcp_tool_response', (response) => {
  console.log('Tool result:', response.result)
})
```

### Server-Sent Events
```javascript
const eventSource = new EventSource('http://localhost:3000/events')

eventSource.addEventListener('tool_executed', (event) => {
  const data = JSON.parse(event.data)
  console.log('Tool executed:', data)
})
```

### REST API
```bash
# Health check
curl http://localhost:3000/health

# Get MCP tools registry
curl http://localhost:3000/api/mcp/tools

# Connection statistics
curl http://localhost:3000/api/connections
```

## 🐳 Docker Deployment

### Using Docker Compose
```yaml
version: '3.8'
services:
  mcp-calendly:
    build: .
    ports:
      - "3000:3000"
    environment:
      - CALENDLY_ACCESS_TOKEN=your_token_here
      - NODE_ENV=production
    restart: unless-stopped
```

### EasyPanel Deployment

1. **Create new service in EasyPanel**
2. **Set Docker image**: `node:18-alpine`
3. **Configure environment variables**:
   - `CALENDLY_ACCESS_TOKEN`: Your Calendly token
   - `NODE_ENV`: `production`
   - `PORT`: `3000`
4. **Set startup command**: `npm run start`
5. **Configure port mapping**: `3000:3000`

## 📊 API Documentation

### MCP Tool Categories

| Category | Tools | Description |
|----------|-------|-------------|
| User | 1 | User account management |
| Organization | 1 | Organization settings |
| Event Types | 2 | Event type configuration |
| Scheduled Events | 3 | Event scheduling and management |
| Invitees | 2 | Participant management |
| Availability | 1 | Schedule availability |
| Webhooks | 4 | Real-time event notifications |

### WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `mcp_initialize` | Server → Client | Protocol handshake |
| `mcp_tool_request` | Client → Server | Execute MCP tool |
| `mcp_tool_response` | Server → Client | Tool execution result |
| `mcp_tool_progress` | Server → Client | Execution progress |
| `mcp_tool_error` | Server → Client | Execution error |

## 🔧 Development

### Project Structure
```
mcp_calendly_marckello/
├── src/                    # Source code (if using TypeScript)
├── streaming-server.cjs    # Main server file
├── enhanced-server.cjs     # Alternative enhanced server
├── package.json           # Dependencies and scripts
├── .env.example          # Environment template
├── README.md             # This file
└── docker/               # Docker configuration
```

### Available Scripts

#### 🚀 **Development & Production**
- `npm run dev` - Development mode with hot reload
- `npm run start` - Production mode
- `npm run pm2:start` - Start with PM2 process manager
- `npm run pm2:stop` - Stop PM2 processes
- `npm run pm2:restart` - Restart PM2 processes

#### 🔢 **Version Management**
- `npm run version:patch` - Increment patch version (1.1.0 → 1.1.1)
- `npm run version:minor` - Increment minor version (1.1.0 → 1.2.0)
- `npm run version:major` - Increment major version (1.1.0 → 2.0.0)
- `npm run version:check` - Check current version
- `npm run release` - Quick minor version release

#### 🧪 **Testing & Quality**
- `npm run test` - Run test suite
- `npm run lint` - Code linting

### Adding New MCP Tools

1. Add tool definition to `MCP_TOOLS` object
2. Implement tool function
3. Add to `executeMCPTool` switch statement
4. Update documentation

## 🛡️ Security

### Best Practices
- **Never commit `.env` files** - Use `.env.example` as template
- **Rotate API tokens regularly** - Update Calendly tokens periodically
- **Use HTTPS in production** - Enable SSL/TLS encryption
- **Configure CORS properly** - Restrict origins to your domains
- **Monitor rate limits** - Adjust based on your usage patterns

### Environment Variables Security
- Store sensitive values in environment variables
- Use secret management services in production
- Never log sensitive information
- Implement proper access controls

## 📈 Performance

### Optimization Tips
- **Use PM2 clustering** for multi-core utilization
- **Configure rate limiting** to prevent API overuse
- **Monitor memory usage** with built-in metrics
- **Optimize WebSocket connections** using connection pooling

### Scaling
- **Horizontal scaling**: Deploy multiple instances behind load balancer
- **Database integration**: Add Redis for session management
- **Caching**: Implement response caching for frequently accessed data

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/Marckello/mcp_calendly_marckello/issues)
- **Documentation**: [MCP Protocol Specification](https://spec.modelcontextprotocol.io/)
- **Calendly API**: [Official Documentation](https://developer.calendly.com/)

## 🙏 Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) - Protocol specification
- [Calendly API](https://developer.calendly.com/) - API integration
- [Socket.IO](https://socket.io/) - WebSocket implementation
- [Express.js](https://expressjs.com/) - Web framework

---

**Made with ❤️ for the MCP community**