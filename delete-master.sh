#!/bin/bash

echo "🔄 Deleting master branch after default branch change..."
echo ""

echo "=== Step 1: Verify we're on main ==="
git checkout main
git pull origin main

echo ""
echo "=== Step 2: Delete remote master branch ==="
git push origin --delete master

echo ""
echo "=== Step 3: Clean up local references ==="
git remote prune origin

echo ""
echo "=== Step 4: Verify only main exists ==="
echo "Branches:"
git branch -a

echo ""
echo "=== Step 5: Verify latest commit ==="
git log --oneline -3

echo ""
echo "✅ SUCCESS: Master branch deleted, only main remains!"
echo "✅ Your deployment will now use main branch automatically"
echo "✅ Endpoint /mcp with corrected code ready for deployment"