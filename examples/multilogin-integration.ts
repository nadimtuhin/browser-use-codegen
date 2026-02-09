/**
 * Multilogin Integration Example
 * 
 * Shows how to integrate with Multilogin using a custom provider.
 */

import { 
  ActionRecorder, 
  ScriptGenerator,
  BrowserManager,
  MultiloginProvider,
  type BrowserProvider 
} from '../src/index'

/**
 * Custom Multilogin provider implementation.
 * 
 * In your actual implementation, you would:
 * 1. Call Multilogin API to start browser
 * 2. Get WebSocket endpoint from response
 * 3. Connect Puppeteer to that endpoint
 */
class MyMultiloginProvider implements BrowserProvider {
  private profileId: string
  private apiKey: string

  constructor(profileId: string, apiKey: string) {
    this.profileId = profileId
    this.apiKey = apiKey
  }

  async connect() {
    const puppeteer = await import('puppeteer-core')
    
    // TODO: Replace with actual Multilogin API call
    // const response = await fetch('https://api.multilogin.com/v1/profile/start', {
    //   method: 'POST',
    //   headers: { 'Authorization': `Bearer ${this.apiKey}` },
    //   body: JSON.stringify({ profileId: this.profileId })
    // })
    // const { wsEndpoint } = await response.json()
    
    // For demo purposes, using a placeholder
    const wsEndpoint = process.env.PUPPETEER_WS_ENDPOINT
    if (!wsEndpoint) {
      throw new Error('PUPPETEER_WS_ENDPOINT required for demo')
    }
    
    return await puppeteer.connect({ browserWSEndpoint: wsEndpoint })
  }

  async disconnect(browser: any) {
    await browser.disconnect()
    // TODO: Call Multilogin API to stop browser
  }
}

async function main() {
  const profileId = process.env.MULTILOGIN_PROFILE_ID
  const apiKey = process.env.MULTILOGIN_API_KEY
  
  if (!profileId) {
    console.error('Error: MULTILOGIN_PROFILE_ID environment variable is required')
    process.exit(1)
  }

  console.log(`Using Multilogin profile: ${profileId}`)
  
  // Create custom provider
  const provider = new MyMultiloginProvider(profileId, apiKey || '')
  const manager = new BrowserManager(provider)
  
  try {
    const page = await manager.launch()
    console.log('Browser started via Multilogin!')
    
    // Start recording
    const recorder = new ActionRecorder(page)
    await recorder.start()
    
    console.log('\n🔴 Recording... perform actions for 15 seconds')
    await new Promise(r => setTimeout(r, 15000))
    
    // Generate script
    const actions = await recorder.stop()
    const generator = new ScriptGenerator()
    const code = generator.generate(profileId, 'Multilogin automation', actions)
    
    console.log('\n--- Generated Script ---\n')
    console.log(code)
    
  } finally {
    await manager.close()
  }
}

main().catch(console.error)
