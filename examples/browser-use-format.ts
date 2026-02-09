/**
 * Browser-Use Format Example
 * 
 * Demonstrates generating browser-use compatible Python code.
 */

import { 
  ActionRecorder, 
  BrowserUseGenerator,
  createBrowserManager 
} from '../src/index'

async function main() {
  const wsEndpoint = process.env.PUPPETEER_WS_ENDPOINT
  
  if (!wsEndpoint) {
    console.error('Error: PUPPETEER_WS_ENDPOINT required')
    process.exit(1)
  }

  console.log('Connecting to browser...')
  
  const manager = await createBrowserManager({ wsEndpoint })
  
  try {
    const page = await manager.launch()
    console.log('Browser connected!\n')
    
    // Start recording
    const recorder = new ActionRecorder(page, { debug: true })
    await recorder.start()
    
    console.log('🔴 Recording for 10 seconds...')
    console.log('Navigate to a website and perform some actions.\n')
    
    await new Promise(r => setTimeout(r, 10000))
    
    const actions = await recorder.stop()
    console.log(`\nRecorded ${actions.length} actions`)
    
    // Generate browser-use Python code
    const generator = new BrowserUseGenerator({
      includeComments: true,
      addDelays: true,
    })
    
    const code = generator.generate(
      'example-profile',
      'Automate web task',
      actions
    )
    
    console.log('\n--- Generated browser-use Python Script ---\n')
    console.log(code)
    
    console.log('\n--- To run this script ---')
    console.log('1. pip install browser-use langchain-openai')
    console.log('2. export OPENAI_API_KEY=your_key')
    console.log('3. python generated_script.py')
    
  } finally {
    await manager.close()
  }
}

main().catch(console.error)
