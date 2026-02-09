/**
 * Basic Usage Example
 * 
 * Demonstrates how to use browser-use-codegen programmatically
 * with a WebSocket-connected browser.
 */

import { 
  ActionRecorder, 
  ScriptGenerator, 
  createBrowserManager 
} from '../src/index'

async function main() {
  // Get WebSocket endpoint from environment
  const wsEndpoint = process.env.PUPPETEER_WS_ENDPOINT
  
  if (!wsEndpoint) {
    console.error('Error: PUPPETEER_WS_ENDPOINT environment variable is required')
    console.error('')
    console.error('Example:')
    console.error('  PUPPETEER_WS_ENDPOINT=ws://localhost:9222/devtools/browser/... npx tsx basic-usage.ts')
    process.exit(1)
  }

  console.log('Connecting to browser...')
  
  // Create browser manager
  const manager = await createBrowserManager({ wsEndpoint })
  
  try {
    // Launch and get page
    const page = await manager.launch()
    console.log('Browser connected!')
    
    // Start recording
    const recorder = new ActionRecorder(page, {
      debug: true,
      captureScreenshots: false,
    })
    
    await recorder.start()
    console.log('\n🔴 Recording started!')
    console.log('Perform actions in the browser for 10 seconds...\n')
    
    // Wait for user actions (in real use, this would be interactive)
    await new Promise(r => setTimeout(r, 10000))
    
    // Stop recording
    const actions = await recorder.stop()
    console.log(`\nRecorded ${actions.length} actions`)
    
    if (actions.length > 0) {
      // Generate script
      const generator = new ScriptGenerator({
        includeComments: true,
        addDelays: true,
      })
      
      const code = generator.generate(
        'example-profile', 
        'Basic automation task', 
        actions
      )
      
      console.log('\n--- Generated Script ---\n')
      console.log(code)
    }
    
  } finally {
    await manager.close()
    console.log('\nBrowser closed')
  }
}

main().catch(console.error)
