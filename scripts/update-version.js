#!/usr/bin/env node

/**
 * Auto-sync version across all files
 * Keeps package.json, streaming-server.cjs, and README.md in sync
 */

const fs = require('fs')
const path = require('path')

// Read version from package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
const version = packageJson.version

console.log(`🔄 Updating version to ${version} across all files...`)

// Update streaming-server.cjs
const serverPath = 'streaming-server.cjs'
if (fs.existsSync(serverPath)) {
  let serverContent = fs.readFileSync(serverPath, 'utf8')
  
  // Replace version strings
  serverContent = serverContent.replace(
    /version: ['"][\d\.]+['"]/g, 
    `version: '${version}'`
  )
  
  fs.writeFileSync(serverPath, serverContent)
  console.log(`✅ Updated ${serverPath}`)
}

// Update enhanced-server.cjs if it exists
const enhancedPath = 'enhanced-server.cjs'
if (fs.existsSync(enhancedPath)) {
  let enhancedContent = fs.readFileSync(enhancedPath, 'utf8')
  
  enhancedContent = enhancedContent.replace(
    /version: ['"][\d\.]+['"]/g,
    `version: '${version}'`
  )
  
  fs.writeFileSync(enhancedPath, enhancedContent)
  console.log(`✅ Updated ${enhancedPath}`)
}

// Update README.md
const readmePath = 'README.md'
if (fs.existsSync(readmePath)) {
  let readmeContent = fs.readFileSync(readmePath, 'utf8')
  
  // Update version badge
  readmeContent = readmeContent.replace(
    /version-[\d\.]+-green/g,
    `version-${version}-green`
  )
  
  fs.writeFileSync(readmePath, readmeContent)
  console.log(`✅ Updated ${readmePath}`)
}

console.log(`🎯 Version ${version} synchronized across all files!`)
console.log('')
console.log('📝 Next steps:')
console.log('1. Update CHANGELOG.md manually if needed')
console.log('2. Commit changes: git add . && git commit -m "📌 version: Release v' + version + '"')
console.log('3. Push with tags: git push && git push --tags')