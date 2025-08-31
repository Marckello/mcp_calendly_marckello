#!/bin/bash

# Script final para crear repositorio después de auth GitHub
echo "🚀 Intentando crear repositorio en GitHub..."

# Verificar configuración GitHub
setup_github_environment

if [ $? -eq 0 ]; then
    echo "✅ GitHub configurado correctamente"
    
    # Intentar crear repositorio usando gh CLI
    gh repo create mcp-woocommerce-server \
        --description "🤖 MCP Server for WooCommerce integration with n8n support - Advanced e-commerce automation for AI workflows" \
        --public \
        --clone=false \
        --source=.
    
    if [ $? -eq 0 ]; then
        echo "✅ Repositorio creado exitosamente"
        
        # Push del código
        git remote add origin https://github.com/$(gh api user --jq .login)/mcp-woocommerce-server.git
        git branch -M main
        git push -u origin main
        
        echo "🎉 ¡CÓDIGO SUBIDO A GITHUB EXITOSAMENTE!"
        echo ""
        echo "📋 URLs del repositorio:"
        echo "   🌐 GitHub: https://github.com/$(gh api user --jq .login)/mcp-woocommerce-server"
        echo "   📖 README: https://github.com/$(gh api user --jq .login)/mcp-woocommerce-server#readme"
        echo ""
        echo "🚀 SIGUIENTE PASO: Deploy en EasyPanel usando esta URL de repo"
        
    else
        echo "❌ Error creando repositorio"
        echo "💡 Alternativa: Crear manualmente en https://github.com/new"
    fi
    
else
    echo "❌ GitHub no configurado"
    echo "👆 Ve al tab #github y autoriza primero"
fi