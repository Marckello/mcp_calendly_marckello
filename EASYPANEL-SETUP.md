# 🚀 EasyPanel Deployment - Paso a Paso Visual

## ✅ **PASO 1: Obtener Credenciales WooCommerce**

### En tu WordPress Admin:
```
1. 🔑 Ve a: WooCommerce → Settings → Advanced → REST API
2. 📝 Click: "Add Key"  
3. ⚙️ Configurar:
   - Description: "MCP Server Integration"
   - User: [Seleccionar usuario admin]
   - Permissions: "Read/Write"
4. 🚀 Click: "Generate API Key"
5. 📋 COPIAR Consumer Key y Consumer Secret
```

**Ejemplo de credenciales:**
```
Consumer Key:    ck_1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t
Consumer Secret: cs_9z8y7x6w5v4u3t2s1r0q9p8o7n6m5l4k3j2i1h0g
```

---

## ✅ **PASO 2: Subir Código a GitHub**

### Opción A: Crear Repositorio en GitHub Web
```
1. 🌐 Ve a: https://github.com/new
2. 📝 Repository name: mcp-woocommerce-server
3. 📄 Description: "MCP Server for WooCommerce integration with n8n"
4. 🔓 Visibility: Public o Private (tu elección)
5. ❌ NO marcar: "Add a README file" (ya tenemos uno)
6. 🚀 Click: "Create repository"
```

### Opción B: Usando Git Commands
```bash
# Si ya tienes el repo creado en GitHub:
git remote add origin https://github.com/TU-USERNAME/mcp-woocommerce-server.git
git branch -M main
git push -u origin main
```

---

## ✅ **PASO 3: Crear App en EasyPanel**

### 3.1 Nueva Aplicación
```
1. 🖥️ Login en tu EasyPanel
2. ➕ Click: "New Service" o "Add Application"
3. 📁 Seleccionar: "Git Repository"
```

### 3.2 Configurar Repositorio
```
Repository URL: https://github.com/TU-USERNAME/mcp-woocommerce-server
Branch: main
Build Path: /
Dockerfile: Dockerfile
```

### 3.3 Configurar Básicos
```
App Name: mcp-woocommerce-server
Description: MCP Server for WooCommerce + n8n integration
```

---

## ✅ **PASO 4: Configurar Variables de Entorno**

**Copia y pega estas variables en EasyPanel:**

### 🔴 OBLIGATORIAS (cambia los valores):
```bash
WOOCOMMERCE_SITE_URL=https://tu-tienda.com
WOOCOMMERCE_CONSUMER_KEY=ck_tu_consumer_key_real_aqui
WOOCOMMERCE_CONSUMER_SECRET=cs_tu_consumer_secret_real_aqui
```

### 🟡 BÁSICAS (recomendadas):
```bash
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
LOG_LEVEL=info
ENABLE_CORS=true
```

### 🔵 OPCIONALES (para N8n):
```bash
N8N_ENABLED=false
N8N_WEBHOOK_URL=
N8N_WEBHOOK_SECRET=
```

---

## ✅ **PASO 5: Configurar Network & Domains**

### 5.1 Ports Configuration:
```
Internal Port: 3000
External Port: 80
Protocol: HTTP
```

### 5.2 Domain (Opcional):
```
Custom Domain: mcp-woocommerce.tu-dominio.com
SSL Certificate: Auto (Let's Encrypt)
```

---

## ✅ **PASO 6: Deploy & Test**

### 6.1 Iniciar Deploy:
```
1. 🚀 Click: "Deploy" en EasyPanel
2. ⏳ Esperar build (2-5 minutos)
3. 📋 Revisar logs de build
4. ✅ Verificar estado: "Running"
```

### 6.2 Test Endpoints:
```bash
# Health Check
curl https://tu-app.easypanel.host/health

# Respuesta esperada:
{
  "status": "healthy",
  "timestamp": "2024-08-30T...",
  "woocommerce": { "status": "healthy" },
  "server": {
    "name": "mcp-woocommerce-server",
    "version": "1.0.0"
  }
}
```

```bash
# Store Information  
curl https://tu-app.easypanel.host/info

# Test N8n Webhook
curl -X POST https://tu-app.easypanel.host/webhook/n8n \
  -H "Content-Type: application/json" \
  -d '{"test": "deployment", "success": true}'
```

---

## ✅ **PASO 7: Configurar N8n (Si lo usas)**

### 7.1 En N8n:
```
1. 🆕 Crear nuevo Workflow
2. ➕ Agregar nodo "Webhook" 
3. 🔗 URL: https://tu-app.easypanel.host/webhook/n8n
4. 📡 Method: POST
5. ✅ Activar workflow
6. 📋 Copiar webhook URL de n8n
```

### 7.2 Actualizar Variables en EasyPanel:
```bash
N8N_ENABLED=true
N8N_WEBHOOK_URL=https://tu-n8n.com/webhook/woocommerce
N8N_WEBHOOK_SECRET=tu-secreto-123
```

### 7.3 Redeploy:
```
1. 🔄 En EasyPanel: "Redeploy"
2. ✅ Verificar logs
3. 🧪 Test webhook
```

---

## 🎯 **RESULTADO FINAL**

### URLs Disponibles:
```
🔍 Health Check: https://tu-app.easypanel.host/health
📊 Store Info:   https://tu-app.easypanel.host/info  
🤖 N8n Webhook:  https://tu-app.easypanel.host/webhook/n8n
🛠️ MCP Protocol: Disponible para integraciones AI
```

### Funcionalidades Activas:
```
✅ 37 herramientas MCP para WooCommerce
✅ API REST completa (productos, pedidos, clientes)
✅ Integración N8n con webhooks
✅ Health monitoring automático
✅ Logs estructurados
✅ Seguridad y validación completa
```

---

## 🔧 **TROUBLESHOOTING**

### ❌ Error: "Build Failed"
```
🔍 Revisar logs en EasyPanel
✅ Verificar que Dockerfile está en raíz
✅ Verificar variables de entorno
```

### ❌ Error: "WooCommerce connection failed"
```
✅ Verificar WOOCOMMERCE_SITE_URL (incluir https://)
✅ Verificar Consumer Key/Secret correctos
✅ Verificar que WooCommerce REST API esté habilitado
```

### ❌ Error: "Health check failed"
```
✅ Verificar PORT=3000 en variables
✅ Esperar 2-3 minutos después del deploy
✅ Revisar logs de la aplicación
```

### ❌ N8n no recibe webhooks
```
✅ Verificar N8N_ENABLED=true
✅ Verificar N8N_WEBHOOK_URL correcta
✅ Test manual con curl
```

---

## 🎉 **¡ÉXITO!**

Tu **MCP WooCommerce Server** está ahora:

🚀 **Deployado en EasyPanel** con auto-scaling  
🔗 **Conectado a WooCommerce** con API completa  
🤖 **Integrado con N8n** para workflows automáticos  
⚡ **Listo para AI** via MCP Protocol  
📊 **Monitoreado** con health checks automáticos  

### Próximos Pasos:
1. **Crear workflows N8n** para automatización
2. **Integrar con Claude/ChatGPT** usando MCP
3. **Configurar alertas** para eventos importantes
4. **Analizar datos** de performance de productos
5. **Automatizar campañas** basadas en comportamiento de clientes

**¡Tu sistema de automatización WooCommerce está LIVE! 🎯🚀**