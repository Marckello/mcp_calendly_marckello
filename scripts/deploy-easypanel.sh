#!/bin/bash

# Script de Deployment para EasyPanel
# MCP WooCommerce Server - Marco Marketing Digital Expert

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "🚀 MCP WooCommerce Server - Deployment EasyPanel"
echo "================================================"
echo -e "${NC}"

# Función para imprimir mensajes
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ] || [ ! -f "Dockerfile" ]; then
    print_error "Este script debe ejecutarse desde el directorio raíz del proyecto"
    exit 1
fi

print_info "Verificando proyecto MCP WooCommerce Server..."

# Verificar build
if [ ! -d "dist" ] || [ ! -f "dist/index.js" ]; then
    print_warning "Build no encontrado, compilando proyecto..."
    npm run build
    if [ $? -eq 0 ]; then
        print_success "Proyecto compilado exitosamente"
    else
        print_error "Error en la compilación"
        exit 1
    fi
else
    print_success "Build encontrado y válido"
fi

# Verificar Git
if [ ! -d ".git" ]; then
    print_error "Repositorio Git no inicializado"
    print_info "Ejecuta: git init && git add . && git commit -m 'Initial commit'"
    exit 1
fi

print_success "Repositorio Git verificado"

# Verificar si hay cambios sin commit
if ! git diff-index --quiet HEAD --; then
    print_warning "Hay cambios sin commit"
    read -p "¿Quieres hacer commit de los cambios pendientes? (y/N): " commit_changes
    if [[ $commit_changes =~ ^[Yy]$ ]]; then
        git add .
        git commit -m "Pre-deployment commit: $(date '+%Y-%m-%d %H:%M:%S')"
        print_success "Commit realizado"
    else
        print_warning "Continuando con cambios sin commit..."
    fi
fi

# Generar configuración de EasyPanel
print_info "Generando archivos de configuración para EasyPanel..."

# Crear archivo de configuración específico para EasyPanel
cat > easypanel-config.json << EOF
{
  "name": "mcp-woocommerce-server",
  "description": "MCP Server for WooCommerce integration with n8n support",
  "repository": {
    "url": "https://github.com/TU-USERNAME/mcp-woocommerce-server",
    "branch": "main",
    "dockerfile": "Dockerfile"
  },
  "environment": {
    "required": [
      {
        "name": "WOOCOMMERCE_SITE_URL",
        "description": "Your WooCommerce store URL (e.g., https://your-store.com)"
      },
      {
        "name": "WOOCOMMERCE_CONSUMER_KEY", 
        "description": "WooCommerce REST API Consumer Key"
      },
      {
        "name": "WOOCOMMERCE_CONSUMER_SECRET",
        "description": "WooCommerce REST API Consumer Secret"
      }
    ],
    "optional": [
      {
        "name": "PORT",
        "value": "3000",
        "description": "Server port"
      },
      {
        "name": "LOG_LEVEL",
        "value": "info",
        "description": "Logging level"
      },
      {
        "name": "N8N_ENABLED",
        "value": "false",
        "description": "Enable n8n integration"
      },
      {
        "name": "N8N_WEBHOOK_URL",
        "value": "",
        "description": "n8n webhook URL"
      }
    ]
  },
  "ports": [
    {
      "internal": 3000,
      "external": 80,
      "protocol": "http"
    }
  ],
  "health_check": {
    "path": "/health",
    "interval": 30,
    "timeout": 10,
    "retries": 3
  }
}
EOF

print_success "Archivo easypanel-config.json generado"

# Crear script de variables de entorno para copy-paste
cat > .env.easypanel << EOF
# ==============================================
# VARIABLES PARA EASYPANEL - COPY & PASTE
# ==============================================

# ✅ OBLIGATORIAS - Configura estas en EasyPanel:
WOOCOMMERCE_SITE_URL=https://tu-tienda.com
WOOCOMMERCE_CONSUMER_KEY=ck_tu_consumer_key_aqui
WOOCOMMERCE_CONSUMER_SECRET=cs_tu_consumer_secret_aqui

# ✅ BÁSICAS - Recomendadas:
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
LOG_LEVEL=info
ENABLE_CORS=true

# ✅ SEGURIDAD - Opcionales:
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# ✅ N8N INTEGRATION - Solo si usas n8n:
N8N_ENABLED=false
N8N_WEBHOOK_URL=
N8N_WEBHOOK_SECRET=
N8N_EVENTS=all

# ==============================================
# INSTRUCCIONES:
# 1. Copia las variables de arriba
# 2. Pégalas en EasyPanel → Environment Variables
# 3. Cambia los valores por los reales
# 4. Deploy!
# ==============================================
EOF

print_success "Archivo .env.easypanel generado para copy-paste"

# Mostrar resumen de archivos importantes
echo ""
print_info "📁 ARCHIVOS PARA EASYPANEL:"
echo "   ✅ Dockerfile - Configuración del contenedor"
echo "   ✅ docker-compose.yml - Stack completo (referencia)"
echo "   ✅ docker/easypanel.json - Template oficial EasyPanel"
echo "   ✅ easypanel-config.json - Configuración generada"
echo "   ✅ .env.easypanel - Variables para copy-paste"

# Verificar URLs de ejemplo
echo ""
print_info "🌐 URLs DESPUÉS DEL DEPLOY:"
echo "   Health Check: https://tu-app.easypanel.host/health"
echo "   Store Info:   https://tu-app.easypanel.host/info"
echo "   N8n Webhook:  https://tu-app.easypanel.host/webhook/n8n"

# Mostrar siguiente paso
echo ""
print_info "📋 SIGUIENTES PASOS:"
echo "   1. 🔧 Obtener credenciales WooCommerce (Consumer Key/Secret)"
echo "   2. 📤 Subir código a GitHub"
echo "   3. 🚀 Crear app en EasyPanel con este repo"
echo "   4. 🔑 Configurar variables de entorno desde .env.easypanel"
echo "   5. 🎯 Deploy!"

# Ofrecer mostrar credenciales WooCommerce
echo ""
read -p "¿Quieres ver las instrucciones para obtener credenciales WooCommerce? (y/N): " show_wc_instructions

if [[ $show_wc_instructions =~ ^[Yy]$ ]]; then
    echo ""
    print_info "🔐 OBTENER CREDENCIALES WOOCOMMERCE:"
    echo "   1. Ve a tu WordPress Admin"
    echo "   2. WooCommerce → Settings → Advanced → REST API"
    echo "   3. Click 'Add Key'"
    echo "   4. Description: 'MCP Server Integration'"
    echo "   5. User: Seleccionar admin user"
    echo "   6. Permissions: 'Read/Write'"
    echo "   7. Click 'Generate API Key'"
    echo "   8. COPIAR Consumer Key y Consumer Secret"
    echo ""
    print_warning "⚠️  IMPORTANTE: Guarda las credenciales de forma segura!"
fi

# Test de conectividad local (opcional)
echo ""
read -p "¿Quieres hacer un test local antes del deploy? (y/N): " test_local

if [[ $test_local =~ ^[Yy]$ ]]; then
    print_info "Iniciando test local..."
    
    # Verificar si .env existe
    if [ ! -f ".env" ]; then
        print_warning "Archivo .env no encontrado, creando desde ejemplo..."
        cp .env.example .env
        print_warning "⚠️  Configura .env con tus credenciales antes del test"
    fi
    
    print_info "Compilando y iniciando servidor por 10 segundos..."
    npm run build
    timeout 10s npm start &
    SERVER_PID=$!
    sleep 5
    
    # Test básico
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        print_success "✅ Servidor local funcionando correctamente"
    else
        print_warning "⚠️  Servidor local no responde - verifica configuración"
    fi
    
    # Limpiar proceso
    kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
fi

echo ""
print_success "🎉 PREPARACIÓN PARA EASYPANEL COMPLETADA"
echo ""
print_info "Archivos generados:"
echo "   📄 easypanel-config.json - Configuración EasyPanel"
echo "   📄 .env.easypanel - Variables para copy-paste"
echo "   📄 DEPLOYMENT.md - Guía completa paso a paso"
echo ""
print_info "Siguiente: Sube el código a GitHub y configura en EasyPanel"

# Mostrar git remote si existe
if git remote get-url origin 2>/dev/null; then
    REMOTE_URL=$(git remote get-url origin)
    print_success "Git remote configurado: $REMOTE_URL"
    echo ""
    print_info "Para subir cambios:"
    echo "   git push origin main"
else
    print_warning "Git remote no configurado"
    echo ""
    print_info "Para configurar GitHub:"
    echo "   1. Crear repo en GitHub"
    echo "   2. git remote add origin https://github.com/TU-USERNAME/mcp-woocommerce-server.git"
    echo "   3. git push -u origin main"
fi

echo ""
print_success "🚀 ¡Listo para conquistar EasyPanel!"