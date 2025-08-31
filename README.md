# 🚀 Calendly MCP Enterprise Streaming Server

**Servidor MCP (Model Context Protocol) empresarial con streaming bidireccional para integración completa con la API de Calendly. Arquitectura de microservicios con WebSocket, Server-Sent Events, OAuth 1.0a, y seguridad de nivel empresarial.**

[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-1.0.0-purple.svg)](https://modelcontextprotocol.io/)
[![Docker](https://img.shields.io/badge/Docker-Multi--Stage-blue.svg)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

> **✅ BRANCH ÚNICA**: Este repositorio usa exclusivamente la branch `main`.

## 🏗️ Arquitectura Empresarial

### 🔧 Stack Tecnológico Core
- **Protocolo**: MCP (Model Context Protocol) 1.0 con SDK oficial
- **Runtime**: Node.js 18+ con TypeScript 5.7+
- **Framework**: Express.js con middleware de seguridad completo
- **Comunicación**: Bidireccional vía WebSocket + Server-Sent Events (SSE)
- **Protocolo de transporte**: JSON-RPC sobre streaming connections
- **Autenticación**: OAuth 1.0a con Calendly (Consumer Key/Secret)

### 🛡️ Seguridad y Validación
- **Validación**: Joi schemas para todos los parámetros de entrada
- **Logging**: Winston con structured logging y rotación automática
- **Middleware**: Helmet, CORS, Morgan para protección completa
- **Encriptación**: Crypto-JS para tokens sensibles
- **Rate limiting**: Implementación nativa para prevenir abuso
- **Audit Trail**: Sistema completo de auditoría empresarial

### 📦 Contenedorización y Deploy
- **Docker**: Multi-stage builds optimizados para producción
- **Platform**: EasyPanel (PaaS) con auto-scaling
- **Health checks**: Endpoint `/health` con validación Calendly
- **Environment**: Variables seguras vía .env y secrets management

## 🎯 Características Implementadas

### ✅ **Funcionalidades Core MCP**
- **14 herramientas MCP** para Calendly API completa
- **Streaming bidireccional** WebSocket + SSE en tiempo real
- **JSON-RPC 2.0** sobre conexiones streaming
- **Progress notifications** con tokens de seguimiento
- **Resource subscriptions** para updates automáticos
- **Error handling** robusto con códigos MCP estándar

### 🔄 **Streaming en Tiempo Real**
- **WebSocket Server** con Socket.IO y WebSocket nativo
- **Server-Sent Events** con event buffering y replay
- **Heartbeat monitoring** con timeout automático
- **Connection pooling** con límites configurable
- **Event broadcasting** para notificaciones masivas
- **Reconnection handling** con state recovery

### 🔐 **Seguridad Empresarial**
- **OAuth 1.0a** signature validation (HMAC-SHA1/SHA256)
- **Rate limiting** por IP con burst protection
- **Token encryption** con key rotation automática
- **Audit logging** con structured data y alerts
- **IP whitelisting/blacklisting** dinámico
- **Security context** per-connection tracking

### 🛠️ **Herramientas MCP Disponibles**

#### 👤 **Gestión de Usuario**
- `calendly_get_current_user` - Info del usuario actual

#### 📅 **Eventos**
- `calendly_list_events` - Lista eventos con filtros avanzados
- `calendly_get_event` - Detalles de evento específico
- `calendly_cancel_event` - Cancelar evento con razón

#### 🎯 **Event Types**
- `calendly_list_event_types` - Lista tipos de evento
- `calendly_get_event_type` - Detalles de tipo específico

#### 👥 **Invitados**
- `calendly_list_event_invitees` - Lista invitados por evento
- `calendly_get_invitee` - Detalles de invitado específico

#### 🔔 **Webhooks**
- `calendly_create_webhook` - Crear suscripción webhook
- `calendly_list_webhooks` - Lista webhooks existentes
- `calendly_delete_webhook` - Eliminar webhook

#### ⏰ **Disponibilidad**
- `calendly_list_availability_schedules` - Horarios disponibles

#### 🏢 **Enterprise Features**
- `calendly_get_organization_members` - Miembros organización
- `calendly_get_organization_events` - Eventos organizacionales

## 🚀 Quick Start

### 1. **Clonar y Configurar**

```bash
git clone https://github.com/Marckello/mcp_calendly_marckello.git
cd mcp_calendly_marckello
npm install
```

### 2. **Variables de Entorno**

```bash
cp .env.example .env
# Editar .env con tus credenciales
```

**Variables REQUERIDAS:**
```bash
CALENDLY_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiJ9...  # Tu token de Calendly
JWT_SECRET=your_super_secret_jwt_key_32_chars_min  # JWT secret
ENCRYPTION_KEY=your_encryption_key_32_chars_min    # Encryption key
```

### 3. **Development Local**

```bash
# Modo desarrollo con hot reload
npm run dev

# Modo MCP stdio (para testing)
npm run start:mcp

# Build producción
npm run build
npm start
```

### 4. **Testing Endpoints**

```bash
# Health check
curl http://localhost:3000/health

# Lista herramientas MCP
curl http://localhost:3000/api/mcp/tools

# Ejecutar herramienta
curl -X POST http://localhost:3000/api/mcp/tools/call \
  -H "Content-Type: application/json" \
  -d '{"tool_name": "calendly_get_current_user"}'

# Streaming SSE
curl http://localhost:3000/api/stream
```

## 📊 URLs y Endpoints

### 🌐 **Producción EasyPanel**
- **URL Base**: `https://tu-dominio-easypanel.com`
- **Health Check**: `https://tu-dominio-easypanel.com/health`
- **MCP Tools**: `https://tu-dominio-easypanel.com/api/mcp/tools`
- **Streaming SSE**: `https://tu-dominio-easypanel.com/api/stream`
- **WebSocket**: `wss://tu-dominio-easypanel.com/ws`

### 🔧 **Development Local**
- **URL Base**: `http://localhost:3000`
- **Health Check**: `http://localhost:3000/health`
- **Status Dashboard**: `http://localhost:3000/api/status`
- **Webhooks**: `http://localhost:3000/api/webhooks/calendly`

### 📋 **API Endpoints Completos**

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/health` | GET | Health check con métricas |
| `/api/status` | GET | Status detallado del sistema |
| **`/mcp`** | **POST** | **🚀 JSON-RPC 2.0 endpoint para n8n (PRINCIPAL)** |
| `/api/mcp/tools` | GET | Lista herramientas MCP |
| `/api/mcp/tools/call` | POST | Ejecutar herramienta MCP |
| `/api/stream` | GET | SSE streaming endpoint |
| `/ws` | WebSocket | WebSocket connection |
| `/api/webhooks/calendly` | POST | Calendly webhooks receiver |
| `/api/admin/audit/stats` | GET | Estadísticas de auditoría |

### 🎯 **Endpoint Principal `/mcp` - JSON-RPC 2.0**

**⚡ ENDPOINT DE PRODUCCIÓN**: `https://mcp-calendly.serrano.marketing/mcp`

Endpoint optimizado para integración directa con **n8n HTTP Streamable transport**:

```bash
# Listar todas las herramientas disponibles (PRODUCCIÓN)
curl -X POST https://mcp-calendly.serrano.marketing/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}'

# Ejecutar herramienta específica (PRODUCCIÓN)
curl -X POST https://mcp-calendly.serrano.marketing/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0", 
    "method": "tools/call", 
    "params": {
      "name": "calendly_get_current_user",
      "arguments": {}
    }, 
    "id": 2
  }'
```

**✅ Características:**
- **JSON-RPC 2.0** completamente compatible
- **14 herramientas Calendly** listas para usar
- **Error handling** robusto con códigos estándar
- **Respuestas estructuradas** para n8n
- **Logging completo** de requests/responses

## 🏗️ **Arquitectura de Datos**

### 🗄️ **Modelos Principales**

#### **CalendlyUser** (Usuario Empresarial)
```typescript
{
  name: string
  email: string
  scheduling_url: string
  timezone: string
  current_organization?: string
  enterprise_metadata?: {
    department?: string
    role?: string
    permissions?: string[]
  }
}
```

#### **CalendlyEvent** (Evento con Streaming)
```typescript
{
  name: string
  status: 'active' | 'canceled'
  start_time: string
  end_time: string
  location: EventLocation
  invitees_counter: InviteesCounter
  streaming_metadata?: {
    real_time_updates: boolean
    webhook_events: string[]
    sync_status: 'pending' | 'synced' | 'error'
  }
}
```

#### **SecurityContext** (Contexto de Seguridad)
```typescript
{
  session_id: string
  permissions: string[]
  rate_limit: RateLimit
  encrypted_tokens: Record<string, string>
  expires_at: Date
}
```

### 🔄 **Flujo de Datos Streaming**

1. **Autenticación** → OAuth 1.0a + JWT → Security Context
2. **Conexión MCP** → WebSocket/SSE → Connection Pool
3. **Tool Call** → Validation → Calendly API → Streaming Response
4. **Real-time Events** → Webhooks → SSE Broadcast → Clients
5. **Audit Trail** → Structured Logging → Security Analytics

### 💾 **Servicios de Almacenamiento**

- **Calendly API**: Fuente única de datos (no local storage)
- **Memory Cache**: Connection states y event buffers
- **Audit Logs**: Structured logging con retention policy
- **Security Tokens**: Encrypted storage con rotation

## 🐳 **Deployment EasyPanel**

### **Status de Deploy**
- **Plataforma**: EasyPanel (PaaS)
- **Estado**: ✅ Production Ready
- **Tech Stack**: Node.js 20 + TypeScript + Docker Multi-Stage
- **Última Actualización**: 2024-08-30

### **Guía Deployment**

#### 1. **Setup EasyPanel Project**
```bash
Repository: https://github.com/Marckello/mcp_calendly_marckello
Build Command: npm run build
Start Command: npm start
Port: 3000
```

#### 2. **Variables de Entorno EasyPanel**
```bash
# CORE REQUIRED
CALENDLY_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiJ9...
JWT_SECRET=tu_jwt_secret_32_caracteres_minimo
ENCRYPTION_KEY=tu_encryption_key_32_caracteres

# APPLICATION
NODE_ENV=production
HTTP_MODE=true
PORT=3000
LOG_LEVEL=info

# STREAMING
MAX_CONNECTIONS=1000
HEARTBEAT_INTERVAL=30000
CONNECTION_TIMEOUT=60000

# RATE LIMITING
RATE_LIMIT_REQUESTS_PER_MINUTE=60
RATE_LIMIT_BURST=10

# CORS (ajustar a tu dominio)
CORS_ORIGINS=https://tu-dominio.com,https://tu-app.com
```

#### 3. **Docker Deployment**
```bash
# Production build
docker-compose up mcp-calendly-streaming

# Development
docker-compose --profile development up mcp-calendly-dev

# Con monitoring
docker-compose --profile monitoring up
```

#### 4. **Health Checks**
```bash
# Verificar deployment
curl https://tu-dominio-easypanel.com/health

# Expected response:
{
  "status": "healthy",
  "services": {
    "calendly": { "status": "connected", "user": "Tu Nombre" },
    "streaming": { "websocket": { "connections": 0 }, "sse": { "connections": 0 } }
  },
  "metrics": { "total_connections": 0, "uptime_seconds": 120 },
  "tools": { "count": 14, "categories": ["user", "events", "webhooks"] }
}
```

## 🧪 **Testing y Validación**

### **Automated Testing**
```bash
npm test              # Unit tests
npm run test:watch    # Watch mode
npm run lint          # ESLint validation
npm run type-check    # TypeScript validation
```

### **Manual Testing**
```bash
# Test all MCP tools
npm run validate:env  # Validate environment
npm run health        # Health check
curl -X POST localhost:3000/api/mcp/tools/call \
  -d '{"tool_name": "calendly_get_current_user"}'
```

## 🔧 **Configuración Avanzada**

### **Rate Limiting**
```typescript
// Per-IP rate limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=60  // 60 req/min normal
RATE_LIMIT_BURST=10                // 10 req/sec burst

// Security thresholds
ERROR_RATE_ALERT=10                // 10 errors/min → alert
SUSPICIOUS_ACTIVITY_ALERT=5        // 5 violations/hour → alert
```

### **Streaming Configuration**
```typescript
// Connection limits
MAX_CONNECTIONS=1000               // Max concurrent connections
HEARTBEAT_INTERVAL=30000          // 30s heartbeat
CONNECTION_TIMEOUT=60000          // 60s timeout

// Event buffering
SSE_BUFFER_SIZE=1000              // Events per connection
EVENT_RETENTION_HOURS=24          // Buffer retention
```

### **Security Configuration**
```typescript
// Encryption
ENCRYPTION_ALGORITHM=aes-256-gcm   // Encryption algorithm
KEY_ROTATION_DAYS=90              // Auto key rotation
TOKEN_EXPIRY_HOURS=24             // Token validity

// Audit
AUDIT_RETENTION_DAYS=90           // Audit log retention
LOG_SENSITIVE_DATA=false          // Don't log sensitive data (prod)
```

## 📖 **Guía de Usuario**

### **Para Desarrolladores MCP**
1. **Conectar**: Usar WebSocket/SSE endpoints
2. **Autenticar**: Proporcionar Calendly token
3. **Explorar**: Llamar `calendly_list_tools` 
4. **Ejecutar**: Usar herramientas con parámetros validados
5. **Stream**: Suscribirse a eventos en tiempo real

### **Para Administradores**
1. **Deploy**: Seguir guía EasyPanel
2. **Monitor**: Usar `/health` y `/api/status`
3. **Audit**: Revisar `/api/admin/audit/stats`
4. **Scale**: Ajustar `MAX_CONNECTIONS` según carga
5. **Secure**: Rotar tokens periódicamente

### **Para Integradores**
1. **Webhooks**: Configurar endpoint Calendly → `/api/webhooks/calendly`
2. **SSE**: Conectar a `/api/stream` para updates
3. **WebSocket**: Conectar a `/ws` para interactividad
4. **Tools**: Usar `/api/mcp/tools/call` para operaciones

## 🎯 **Próximos Steps Recomendados**

### 🔜 **Mejoras Técnicas**
- [ ] **Redis integration** para caching distribuido
- [ ] **Prometheus metrics** para monitoreo avanzado
- [ ] **GraphQL endpoint** para queries complejas
- [ ] **Rate limiting distribuido** con Redis
- [ ] **Circuit breaker** para resilencia API
- [ ] **Load balancing** multi-instance

### 🏢 **Features Empresariales**
- [ ] **RBAC (Role-Based Access Control)** granular
- [ ] **Multi-tenant support** para múltiples orgs
- [ ] **Data residency** compliance (GDPR, etc.)
- [ ] **Advanced analytics** dashboard
- [ ] **Custom integrations** framework
- [ ] **Backup/restore** automation

### 🔒 **Seguridad Avanzada**
- [ ] **Zero-trust architecture** implementation
- [ ] **Certificate pinning** para API calls
- [ ] **Threat detection** con ML
- [ ] **Compliance reporting** automatizado
- [ ] **Penetration testing** integration
- [ ] **SOC 2 compliance** preparation

## 🤝 **Contribuir**

```bash
# 1. Fork del repositorio
# 2. Crear rama feature
git checkout -b feature/nueva-funcionalidad

# 3. Desarrollar con tests
npm run dev
npm test

# 4. Commit siguiendo conventional commits
git commit -m "feat: agregar streaming de eventos en tiempo real"

# 5. Push y crear PR
git push origin feature/nueva-funcionalidad
```

## 📄 **Licencia**

MIT License - Ver [LICENSE](LICENSE) para detalles.

## 🔗 **Enlaces Útiles**

- **[Calendly API Docs](https://developer.calendly.com/api-docs)** - Documentación oficial API
- **[Model Context Protocol](https://modelcontextprotocol.io/)** - Especificación MCP
- **[EasyPanel Docs](https://easypanel.io/docs)** - Documentación deployment
- **[GitHub Repository](https://github.com/Marckello/mcp_calendly_marckello)** - Código fuente
- **[Docker Hub](https://hub.docker.com/)** - Imágenes Docker

---

**¿Necesitas ayuda?** 
- 📧 **Issues**: [GitHub Issues](https://github.com/Marckello/mcp_calendly_marckello/issues)
- 📖 **Docs**: [Wiki del proyecto](https://github.com/Marckello/mcp_calendly_marckello/wiki)
- 💬 **Support**: Crear issue con label `question`

**Creado con ❤️ por Marco - Enterprise MCP Architecture**