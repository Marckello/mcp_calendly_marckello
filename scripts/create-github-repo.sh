#!/bin/bash

# Script para crear repositorio GitHub del MCP WooCommerce Server
# Marco - Marketing Digital Expert

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "🚀 Creando Repositorio GitHub - MCP WooCommerce Server"
echo "===================================================="
echo -e "${NC}"

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
if [ ! -f "package.json" ]; then
    print_error "Este script debe ejecutarse desde el directorio raíz del proyecto"
    exit 1
fi

print_info "Verificando configuración GitHub..."

# Configurar el repositorio
REPO_NAME="mcp-woocommerce-server"
REPO_DESCRIPTION="🤖 MCP Server for WooCommerce integration with n8n support - Advanced e-commerce automation for AI workflows"

print_info "Configuración del repositorio:"
echo "   📦 Nombre: $REPO_NAME"
echo "   📝 Descripción: $REPO_DESCRIPTION"
echo ""

# Preparar archivos finales
print_info "Preparando archivos para GitHub..."

# Actualizar README con información de GitHub
cat > README-GITHUB.md << 'EOF'
# 🤖 MCP WooCommerce Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://www.docker.com/)
[![EasyPanel](https://img.shields.io/badge/easypanel-compatible-purple.svg)](https://easypanel.io/)

Un servidor MCP (Model Context Protocol) completo para integración con WooCommerce, optimizado para despliegue en EasyPanel y conectividad perfecta con n8n workflows.

## 🚀 Características Principales

### ✅ API WooCommerce Completa
- **🛍️ Productos**: CRUD completo con validación avanzada
- **📦 Pedidos**: Gestión completa con notas y estados
- **👥 Clientes**: Sistema completo de usuarios
- **🏷️ Categorías & Tags**: Organización de productos
- **💰 Cupones**: Sistema de descuentos

### 🤖 Integración AI & Automation
- **37 herramientas MCP** para WooCommerce
- **N8n webhooks** para workflows automáticos
- **Claude/ChatGPT compatible** via MCP Protocol
- **Eventos en tiempo real** para automatización

### 🐳 Production Ready
- **Docker optimizado** para EasyPanel
- **Health monitoring** automático
- **Logs estructurados** con Winston
- **Seguridad avanzada** con validación

## ⚡ Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/YOUR-USERNAME/mcp-woocommerce-server.git
cd mcp-woocommerce-server
npm install
```

### 2. Configure
```bash
cp .env.example .env
# Edit .env with your WooCommerce credentials
```

### 3. Run
```bash
npm run build
npm start
```

### 4. Deploy to EasyPanel
```bash
# Follow the detailed guide in EASYPANEL-SETUP.md
./scripts/deploy-easypanel.sh
```

## 🔧 Configuration

### Required Environment Variables
```bash
WOOCOMMERCE_SITE_URL=https://your-store.com
WOOCOMMERCE_CONSUMER_KEY=ck_your_key_here
WOOCOMMERCE_CONSUMER_SECRET=cs_your_secret_here
```

### Optional N8n Integration
```bash
N8N_ENABLED=true
N8N_WEBHOOK_URL=https://your-n8n.com/webhook/woocommerce
N8N_WEBHOOK_SECRET=your-webhook-secret
```

## 📖 Documentation

- **[EasyPanel Setup Guide](EASYPANEL-SETUP.md)** - Visual step-by-step deployment
- **[Complete Deployment Guide](DEPLOYMENT.md)** - Technical documentation  
- **[API Documentation](docs/API.md)** - MCP tools reference

## 🛠️ Available MCP Tools

### Products (6 tools)
- `wc_get_products` - List products with advanced filters
- `wc_get_product` - Get specific product details
- `wc_create_product` - Create new products
- `wc_update_product` - Update existing products
- `wc_delete_product` - Delete products
- `wc_batch_products` - Bulk operations

### Orders (7 tools)  
- `wc_get_orders` - List orders with filters
- `wc_get_order` - Get specific order
- `wc_create_order` - Create new orders
- `wc_update_order` - Update orders
- `wc_delete_order` - Delete orders
- `wc_get_order_notes` - Get order notes
- `wc_add_order_note` - Add notes to orders

### Customers (7 tools)
- `wc_get_customers` - List customers
- `wc_get_customer` - Get specific customer  
- `wc_create_customer` - Create new customers
- `wc_update_customer` - Update customer data
- `wc_delete_customer` - Delete customers
- `wc_batch_customers` - Bulk customer operations
- `wc_get_customer_orders` - Get customer's orders

## 🌐 API Endpoints

After deployment:
```
Health Check: https://your-app.host/health
Store Info:   https://your-app.host/info
N8n Webhook:  https://your-app.host/webhook/n8n
```

## 🤝 N8n Workflows

Perfect for automating:
- **Customer onboarding** with welcome emails + coupons
- **Inventory management** with low stock alerts
- **Order processing** with automatic fulfillment
- **Marketing campaigns** based on customer behavior
- **Sales analytics** with automated reporting

## 🔒 Security Features

- **Input validation** with Joi schemas
- **Data sanitization** for all inputs
- **Rate limiting** configurable
- **Secure headers** with Helmet
- **Structured logging** without sensitive data

## 📊 Monitoring & Health

- **Automatic health checks** every 30 seconds
- **Performance metrics** built-in
- **Error tracking** with detailed logs
- **Uptime monitoring** compatible

## 🚀 Deployment Platforms

### EasyPanel (Recommended)
```bash
# Use the automated script
./scripts/deploy-easypanel.sh
```

### Docker Compose
```bash
docker-compose up -d
```

### Manual Docker
```bash
docker build -t mcp-woocommerce .
docker run -p 3000:3000 mcp-woocommerce
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   AI Assistant  │───▶│  MCP Server      │───▶│  WooCommerce    │
│ (Claude/ChatGPT)│    │  (This Project)  │    │     Store       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   N8n Workflows  │
                       │   (Automation)   │
                       └──────────────────┘
```

## 🛡️ Requirements

- **Node.js** 18+
- **WooCommerce** with REST API enabled
- **Docker** (for containerized deployment)
- **EasyPanel** account (for easy deployment)

## 📝 License

MIT License - see [LICENSE](LICENSE) file

## 👨‍💻 Author

**Marco - Marketing Digital Expert**
- 🎯 Specialized in e-commerce automation
- 🤖 AI-powered marketing workflows
- 🚀 Advanced WooCommerce integrations

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## ⭐ Show Your Support

If this project helps your e-commerce automation, please ⭐ star this repository!

---

**Ready to revolutionize your WooCommerce store with AI? Let's automate! 🚀**
EOF

# Mover el README actualizado
mv README-GITHUB.md README.md

print_success "README actualizado para GitHub"

# Crear archivo de licencia
cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2024 Marco - Marketing Digital Expert

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF

print_success "Licencia MIT creada"

# Commit de archivos finales
git add .
git commit -m "📝 Prepare for GitHub: Update README and add LICENSE

✨ Changes:
- 📖 GitHub-optimized README with badges and detailed docs
- 📄 MIT License added
- 🚀 Ready for public repository
- 🎯 Professional documentation structure"

print_success "Archivos finales commiteados"

print_info "📁 ESTRUCTURA DEL REPOSITORIO:"
echo "   ├── 📖 README.md (GitHub optimizado)"
echo "   ├── 📄 LICENSE (MIT)"
echo "   ├── 🐳 Dockerfile (Producción)"
echo "   ├── ⚙️ docker-compose.yml"
echo "   ├── 📋 EASYPANEL-SETUP.md (Guía visual)"
echo "   ├── 📚 DEPLOYMENT.md (Documentación completa)"
echo "   ├── 💼 package.json"
echo "   ├── 🔧 src/ (Código fuente TypeScript)"
echo "   ├── 📜 scripts/ (Scripts de automatización)"
echo "   └── 🧪 tests/ (Tests básicos)"

echo ""
print_success "🎉 REPOSITORIO LISTO PARA GITHUB"
echo ""
print_info "Siguiente paso: Configurar GitHub authentication en el sandbox"
print_info "Después ejecutar: setup_github_environment && crear repositorio"
echo ""
print_warning "⚠️  IMPORTANTE: Configura GitHub OAuth primero en el tab #github"