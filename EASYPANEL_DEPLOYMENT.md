# 🚀 EasyPanel Deployment Guide

## ⚠️ CRITICAL SECURITY NOTICE
**NEVER pass your Calendly token as a build argument!** This exposes it in build logs.

## 🔧 Correct EasyPanel Configuration

### 1. Project Setup
- **Repository**: `https://github.com/Marckello/mcp_calendly_marckello`
- **Branch**: `master`
- **Build Context**: `/` (root)
- **Dockerfile**: `Dockerfile`

### 2. Environment Variables (Runtime Only - NOT Build Args)
Set these as **Environment Variables** in EasyPanel (NOT as build arguments):

```env
CALENDLY_ACCESS_TOKEN=your_token_here
NODE_ENV=production
PORT=3000
JWT_SECRET=generate_secure_32_char_secret
RATE_LIMIT_REQUESTS_PER_MINUTE=100
MAX_CONNECTIONS=100
CORS_ORIGINS=https://your-domain.easypanel.io
```

### 3. Port Configuration
- **Container Port**: `3000`
- **External Port**: `80` or `443` (EasyPanel will handle)

### 4. Health Check
EasyPanel should automatically detect the health check from Dockerfile:
- **Endpoint**: `/health`
- **Interval**: `30s`
- **Timeout**: `3s`

### 5. Resource Limits (Recommended)
- **Memory**: `512MB` (minimum) to `1GB` (recommended)
- **CPU**: `0.5` cores minimum

## 🔄 Deployment Steps

1. **Create New Service** in EasyPanel
2. **Select "Git Repository"** 
3. **Connect GitHub**: `Marckello/mcp_calendly_marckello`
4. **Set Environment Variables** (see above - NO BUILD ARGS!)
5. **Configure Port**: `3000`
6. **Deploy**

## 🛡️ Security Best Practices

### ✅ DO:
- Set `CALENDLY_ACCESS_TOKEN` as environment variable
- Use HTTPS for production domain
- Set proper CORS origins
- Use strong JWT_SECRET (32+ characters)
- Monitor logs for any token exposure

### ❌ DON'T:
- Pass tokens as build arguments (exposes in logs)
- Use development settings in production
- Expose internal ports unnecessarily
- Commit tokens to git (already protected)

## 🧪 Testing After Deployment

1. **Health Check**: `https://your-app.easypanel.io/health`
2. **Dashboard**: `https://your-app.easypanel.io/`
3. **API Tools**: `https://your-app.easypanel.io/api/mcp/tools`
4. **WebSocket**: Connect via browser console or test interface

## 📊 Monitoring

The app includes built-in monitoring:
- `/health` - Service health
- `/api/connections` - Active connections
- Real-time dashboard with metrics
- WebSocket connection status
- SSE event streaming

## 🔧 Troubleshooting

### Common Issues:
1. **Build Fails**: Check Dockerfile and dependencies
2. **Token Issues**: Verify environment variable is set correctly
3. **Port Issues**: Ensure container port 3000 is exposed
4. **CORS Errors**: Update CORS_ORIGINS with your domain

### Logs to Check:
- Application logs for startup messages
- Health check responses
- WebSocket connection attempts
- MCP tool execution results

## 📈 Scaling

For high-traffic deployments:
- Increase memory allocation (1GB+)
- Use multiple instances with load balancer
- Consider Redis for session storage
- Monitor connection limits

---

**🎯 Ready for production with your Calendly token safely secured!**