# 🚀 Guía de Despliegue en EasyPanel

## PASO 1: Subir a GitHub

### Opción A: Crear Repositorio en GitHub Web
1. Ve a https://github.com/new
2. Nombre del repo: `mcp-woocommerce-server`
3. Descripción: `MCP Server for WooCommerce integration with n8n support`
4. Mantener **Público** o **Privado** según prefieras
5. **NO** inicializar con README (ya tenemos uno)
6. Crear repositorio

### Opción B: Comandos para subir el código
```bash
# En tu terminal local (después de crear el repo en GitHub):
cd /path/to/your/mcp-woocommerce-server
git remote add origin https://github.com/TU-USERNAME/mcp-woocommerce-server.git
git branch -M main
git push -u origin main
```

## PASO 2: Configurar EasyPanel

### 2.1 Crear Nueva Aplicación
1. **Login** en tu panel EasyPanel
2. Click **"New Service"** o **"Add Application"**
3. Seleccionar **"Git Repository"**

### 2.2 Configurar Repositorio
```
Repository URL: https://github.com/TU-USERNAME/mcp-woocommerce-server
Branch: main
Build Context: /
Dockerfile: Dockerfile
```

### 2.3 Configurar Variables de Entorno
**Variables REQUERIDAS:**
```bash
# WooCommerce Configuration (OBLIGATORIO)
WOOCOMMERCE_SITE_URL=https://tu-tienda.com
WOOCOMMERCE_CONSUMER_KEY=ck_tu_consumer_key_aqui
WOOCOMMERCE_CONSUMER_SECRET=cs_tu_consumer_secret_aqui

# Server Configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=production

# Logging
LOG_LEVEL=info

# Security
ENABLE_CORS=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

**Variables OPCIONALES para N8n:**
```bash
N8N_ENABLED=true
N8N_WEBHOOK_URL=https://tu-n8n.com/webhook/woocommerce
N8N_WEBHOOK_SECRET=tu_secreto_super_seguro
N8N_EVENTS=all
```

### 2.4 Configurar Networking
```
Internal Port: 3000
External Port: 80 (o el que prefieras)
Protocol: HTTP
```

### 2.5 Configurar Dominio (Opcional)
```
Custom Domain: mcp-woocommerce.tu-dominio.com
SSL: Habilitado (Let's Encrypt automático)
```

## PASO 3: Obtener Credenciales WooCommerce

### 3.1 En tu WordPress/WooCommerce Admin:
1. Ve a **WooCommerce → Settings → Advanced → REST API**
2. Click **"Add Key"**
3. Configurar:
   - **Description:** "MCP Server Integration"
   - **User:** Seleccionar usuario admin
   - **Permissions:** "Read/Write"
4. Click **"Generate API Key"**
5. **COPIAR** Consumer Key y Consumer Secret

### 3.2 Ejemplo de Keys:
```
Consumer Key: ck_1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t
Consumer Secret: cs_9z8y7x6w5v4u3t2s1r0q9p8o7n6m5l4k3j2i1h0g
```

## PASO 4: Deploy y Verificación

### 4.1 Iniciar Deploy
1. En EasyPanel, click **"Deploy"**
2. Esperar build (aprox. 2-5 minutos)
3. Verificar logs de deploy

### 4.2 Verificar Funcionamiento
```bash
# Health Check
curl https://tu-app.easypanel.host/health

# Respuesta esperada:
{
  "status": "healthy",
  "timestamp": "2024-08-30T...",
  "woocommerce": {
    "status": "healthy",
    "timestamp": "2024-08-30T..."
  },
  "server": {
    "name": "mcp-woocommerce-server",
    "version": "1.0.0",
    "uptime": 123.45
  }
}
```

```bash
# Store Info
curl https://tu-app.easypanel.host/info

# Test N8n Webhook
curl -X POST https://tu-app.easypanel.host/webhook/n8n \
  -H "Content-Type: application/json" \
  -d '{"test": "data", "event": "test_event"}'
```

## PASO 5: Configurar N8n (Opcional)

### 5.1 En tu instancia N8n:
1. Crear nuevo **Workflow**
2. Agregar nodo **"Webhook"**
3. Configurar Webhook URL: `https://tu-app.easypanel.host/webhook/n8n`
4. Método: **POST**
5. Activar workflow

### 5.2 Configurar Variables en EasyPanel:
```bash
N8N_ENABLED=true
N8N_WEBHOOK_URL=https://tu-n8n.com/webhook-test/woocommerce
N8N_WEBHOOK_SECRET=secreto-super-seguro-123
```

### 5.3 Test de N8n Integration:
El MCP server enviará eventos a n8n cuando:
- Se creen/actualicen productos
- Se procesen pedidos
- Se registren clientes
- Cambios importantes en la tienda

## PASO 6: Monitoreo y Logs

### 6.1 Ver Logs en EasyPanel:
1. En tu app, ir a **"Logs"** tab
2. Ver logs en tiempo real
3. Buscar errores o warnings

### 6.2 Endpoints de Monitoreo:
```bash
# Health Check (cada 30 segundos automático)
GET /health

# Información del servidor y tienda
GET /info

# Webhook para n8n
POST /webhook/n8n
```

## PASO 7: URLs Finales

Después del deploy exitoso tendrás:

```
🌐 Health Check: https://tu-app.easypanel.host/health
📊 Store Info:   https://tu-app.easypanel.host/info
🤖 N8n Webhook:  https://tu-app.easypanel.host/webhook/n8n
🔧 MCP Protocol: Disponible para integraciones AI
```

## TROUBLESHOOTING

### Error: "WooCommerce API connection failed"
- ✅ Verificar WOOCOMMERCE_SITE_URL (debe incluir https://)
- ✅ Verificar Consumer Key y Secret
- ✅ Verificar que WooCommerce REST API esté habilitado

### Error: "Port already in use"
- ✅ Cambiar PORT a 3001 o 8080 en variables de entorno

### Error: "Build failed"
- ✅ Verificar que package.json esté en la raíz
- ✅ Verificar que Dockerfile esté presente

### N8n no recibe webhooks
- ✅ Verificar N8N_WEBHOOK_URL
- ✅ Verificar que N8N_ENABLED=true
- ✅ Test manual: `curl -X POST tu-app/webhook/n8n`

## PRÓXIMOS PASOS

Una vez deployed:

1. **Integrar con Claude/ChatGPT** usando MCP Protocol
2. **Crear workflows n8n** para automatización
3. **Configurar alertas** para stock bajo, pedidos, etc.
4. **Análisis automático** de performance de productos
5. **Campañas de marketing** basadas en datos de WooCommerce

¡Tu MCP WooCommerce Server está listo para dominar el mundo del e-commerce! 🚀