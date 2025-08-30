# 📋 Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2025-08-30

### ✨ Added
- **Docker Build Fix**: Fixed npm ci issues for EasyPanel deployment
- **Security Enhancement**: Added comprehensive .dockerignore
- **Deployment Guide**: Complete EasyPanel deployment documentation with security best practices
- **Version Management**: Automated versioning scripts and changelog tracking

### 🐳 Fixed
- Docker build failing with npm ci command
- Missing package-lock.json for deterministic builds
- Security vulnerability with tokens exposed in build logs

### 🛡️ Security
- **CRITICAL**: Fixed token exposure in Docker build logs
- Added comprehensive security warnings in deployment guide
- Improved .dockerignore to exclude sensitive files

### 📖 Documentation
- Added `EASYPANEL_DEPLOYMENT.md` with step-by-step guide
- Security best practices documentation
- Troubleshooting and monitoring guide

## [1.0.0] - 2025-08-30

### 🚀 Initial Release
- **Complete MCP 1.0 Protocol Implementation**
- **14 Calendly API Tools**: Full integration suite
  - User management (1 tool)
  - Organization details (1 tool) 
  - Event types (2 tools)
  - Scheduled events (3 tools)
  - Invitees management (2 tools)
  - Availability schedules (1 tool)
  - Webhook management (4 tools)

### 🔌 Streaming Features
- **WebSocket Bidirectional Streaming**: Real-time MCP tool execution
- **Server-Sent Events (SSE)**: Live server-side event broadcasting
- **Connection Management**: Advanced pooling and monitoring
- **Real-time Dashboard**: Live metrics and connection analytics

### 🛡️ Enterprise Security
- **Rate Limiting**: DDoS protection and API quota management
- **CORS Configuration**: Cross-origin request security
- **Connection Authentication**: WebSocket security validation
- **Audit Trail**: Complete request/response logging
- **Environment Protection**: Comprehensive .gitignore and security practices

### 📊 Monitoring & Analytics
- **Health Checks**: System status and uptime tracking
- **Performance Metrics**: Execution time and success rate analytics
- **Connection Analytics**: WebSocket and SSE usage statistics
- **Real-time Dashboard**: Live monitoring interface

### 🐳 Deployment
- **Docker Support**: Production-ready Dockerfile
- **EasyPanel Compatible**: Optimized for EasyPanel deployment
- **PM2 Integration**: Process management for production
- **Health Checks**: Automated monitoring and restart capabilities

### 📦 Development
- **TypeScript Support**: Full type definitions and validation
- **CommonJS Ready**: Direct .cjs execution for stability
- **Multiple Server Variants**: Enhanced and streaming versions
- **Comprehensive Documentation**: README, deployment guides, and API docs

---

## 📝 Version Format

- **Major** (X.0.0): Breaking changes, major new features
- **Minor** (0.X.0): New features, enhancements, significant improvements
- **Patch** (0.0.X): Bug fixes, security patches, small improvements

## 🔗 Links

- [GitHub Repository](https://github.com/Marckello/mcp_calendly_marckello)
- [Issues](https://github.com/Marckello/mcp_calendly_marckello/issues)
- [EasyPanel Deployment Guide](./EASYPANEL_DEPLOYMENT.md)
- [MCP Protocol Specification](https://spec.modelcontextprotocol.io/)