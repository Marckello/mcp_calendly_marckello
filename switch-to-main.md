# 🔄 INSTRUCCIONES PARA CAMBIAR A MAIN BRANCH

## ⚠️ IMPORTANTE: DEBES HACER ESTO EN GITHUB

### 1. Cambiar Default Branch (CRÍTICO):
1. Ve a: **https://github.com/Marckello/mcp_calendly_marckello/settings/branches**
2. En "Default branch" cambia de `master` → `main`  
3. Click "Update"
4. Confirma el cambio

### 2. Una vez cambiado el default branch, ejecuta:
```bash
git push origin --delete master
```

### 3. Verificar que solo tengas main:
```bash
git branch -a
# Solo debe mostrar: main y origin/main
```

## ✅ RESULTADO ESPERADO:
- ✅ Solo branch `main` 
- ✅ Todos los commits en `main`
- ✅ Tu deployment usará `main` automáticamente
- ✅ Endpoint `/mcp` funcionará correctamente

## 🚨 NO EJECUTES `git push origin --delete master` HASTA CAMBIAR EL DEFAULT BRANCH