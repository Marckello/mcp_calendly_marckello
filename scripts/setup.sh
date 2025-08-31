#!/bin/bash

# MCP WooCommerce Server Setup Script
# Para Marco - Marketing Digital Expert

set -e

echo "🚀 Configurando MCP WooCommerce Server..."
echo "=========================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_message() {
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

# Verificar Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js no está instalado. Por favor instala Node.js 18+."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js versión 18+ es requerida. Versión actual: $(node --version)"
    exit 1
fi

print_message "Node.js versión $(node --version) detectada"

# Verificar Docker (opcional)
if command -v docker &> /dev/null; then
    print_message "Docker detectado - despliegue con contenedores disponible"
else
    print_warning "Docker no detectado - despliegue local únicamente"
fi

# Instalar dependencias
print_info "Instalando dependencias npm..."
npm install

# Crear directorio de logs
print_info "Creando directorios necesarios..."
mkdir -p logs data

# Copiar archivo de ejemplo de configuración
if [ ! -f .env ]; then
    cp .env.example .env
    print_message "Archivo .env creado desde .env.example"
    print_warning "⚡ IMPORTANTE: Configura tus credenciales WooCommerce en .env"
else
    print_info "Archivo .env ya existe"
fi

# Compilar TypeScript
print_info "Compilando TypeScript..."
npm run build

# Verificar compilación
if [ -f "dist/index.js" ]; then
    print_message "Compilación exitosa"
else
    print_error "Error en la compilación"
    exit 1
fi

# Mostrar configuración requerida
echo ""
echo "🔧 CONFIGURACIÓN REQUERIDA"
echo "=========================="
echo ""
print_info "Edita el archivo .env con tus credenciales WooCommerce:"
echo ""
echo "WOOCOMMERCE_SITE_URL=https://tu-tienda.com"
echo "WOOCOMMERCE_CONSUMER_KEY=ck_tu_clave_aqui"
echo "WOOCOMMERCE_CONSUMER_SECRET=cs_tu_secreto_aqui"
echo ""

# Mostrar comandos disponibles
echo "📝 COMANDOS DISPONIBLES"
echo "======================"
echo ""
echo "🏃 Desarrollo:"
echo "  npm run dev          # Desarrollo con hot reload"
echo "  npm run build        # Compilar TypeScript"
echo "  npm run start        # Producción"
echo ""
echo "🐳 Docker:"
echo "  npm run docker:build # Construir imagen Docker"
echo "  npm run docker:run   # Ejecutar contenedor"
echo "  docker-compose up -d # Stack completo"
echo ""
echo "🧪 Testing:"
echo "  npm test             # Ejecutar tests"
echo "  node tests/basic.test.js # Tests manuales"
echo ""

# Mostrar endpoints
echo "🌐 ENDPOINTS DISPONIBLES"
echo "========================"
echo ""
echo "Health Check: http://localhost:3000/health"
echo "Info Server:  http://localhost:3000/info"
echo "N8n Webhook:  http://localhost:3000/webhook/n8n"
echo ""

# Verificar configuración WooCommerce
echo "🔍 VERIFICACIÓN DE CONFIGURACIÓN"
echo "================================"
echo ""

if [ -f .env ]; then
    if grep -q "your-store.com" .env || grep -q "ck_your_consumer_key_here" .env; then
        print_warning "Configuración de WooCommerce pendiente en .env"
        print_info "Después de configurar .env, ejecuta: npm start"
    else
        print_message "Configuración de WooCommerce detectada"
        print_info "Listo para ejecutar: npm start"
        
        # Ofrecer test de conectividad
        echo ""
        read -p "¿Quieres probar la conectividad WooCommerce ahora? (y/N): " test_connection
        if [[ $test_connection =~ ^[Yy]$ ]]; then
            print_info "Iniciando test de conectividad..."
            timeout 10s npm start &
            PID=$!
            sleep 5
            
            if curl -s http://localhost:3000/health > /dev/null; then
                print_message "Test de conectividad exitoso"
            else
                print_warning "Test de conectividad falló - verifica configuración"
            fi
            
            kill $PID 2>/dev/null || true
        fi
    fi
fi

echo ""
echo "🎉 SETUP COMPLETADO"
echo "==================="
print_message "MCP WooCommerce Server configurado correctamente"
print_info "Siguiente paso: Configura .env y ejecuta 'npm start'"

# Información para EasyPanel
echo ""
echo "📦 DESPLIEGUE EN EASYPANEL"
echo "=========================="
print_info "1. Sube el código a tu repositorio Git"
print_info "2. En EasyPanel: New App → Git Repository"
print_info "3. Configura las variables de entorno desde docker/easypanel.json"
print_info "4. Deploy automático"
print_info "5. Para N8n: configura webhook en N8N_WEBHOOK_URL"

echo ""
print_message "¡Listo para dominar WooCommerce con IA! 🚀"