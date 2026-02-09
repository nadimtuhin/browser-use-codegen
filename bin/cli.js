#!/usr/bin/env node

// This is a wrapper that handles both development (ts-node/tsx) and production (compiled JS) modes
const path = require('path')
const fs = require('fs')

const distPath = path.join(__dirname, '..', 'dist', 'cli.js')
const srcPath = path.join(__dirname, '..', 'src', 'cli.ts')

// Check if compiled version exists
if (fs.existsSync(distPath)) {
  // Production mode - use compiled JS
  require(distPath)
} else if (fs.existsSync(srcPath)) {
  // Development mode - use tsx or ts-node
  const { spawn } = require('child_process')
  
  // Try tsx first, fall back to ts-node
  const loader = process.env.BROWSER_USE_CODEGEN_LOADER || 'tsx'
  
  const child = spawn('npx', [loader, srcPath, ...process.argv.slice(2)], {
    stdio: 'inherit',
    shell: true,
  })
  
  child.on('exit', (code) => {
    process.exit(code || 0)
  })
} else {
  console.error('Error: Could not find CLI entry point.')
  console.error('Please run `npm run build` first.')
  process.exit(1)
}
