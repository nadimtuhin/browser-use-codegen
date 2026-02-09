/**
 * AI-Assisted Recording Example
 * 
 * Shows AI features:
 * - Page pattern detection
 * - Extraction UI overlay
 * - Smart suggestions
 */

import { 
  AIAssistedRecorder, 
  ScriptGenerator,
  createBrowserManager 
} from '../src/index'

async function main() {
  const wsEndpoint = process.env.PUPPETEER_WS_ENDPOINT
  
  if (!wsEndpoint) {
    console.error('Error: PUPPETEER_WS_ENDPOINT required')
    process.exit(1)
  }

  console.log('🤖 AI-Assisted Recording Demo\n')
  
  const manager = await createBrowserManager({ wsEndpoint })
  
  try {
    const page = await manager.launch()
    
    // Use AI-assisted recorder
    const recorder = new AIAssistedRecorder(page, {
      debug: true,
      suggestExtractions: true,
      detectPatterns: true,
      validateSelectors: true,
    })
    
    await recorder.start()
    
    console.log('\n✨ AI Features active:')
    console.log('  - Page pattern detection')
    console.log('  - Extraction suggestion UI (green button top-right)')
    console.log('  - Smart field detection\n')
    
    console.log('🔴 Recording for 15 seconds...')
    console.log('Tip: Click the green "Mark for Extraction" button to select fields.\n')
    
    await new Promise(r => setTimeout(r, 15000))
    
    const actions = await recorder.stop()
    const suggestions = recorder.getSuggestions()
    
    console.log(`\n📊 Recorded ${actions.length} actions`)
    
    if (suggestions.length > 0) {
      console.log('\n💡 AI Suggestions:')
      suggestions.forEach(s => console.log(`  ${s}`))
    }
    
    // Validate selectors
    console.log('\n🔍 Validating selectors...')
    const validation = await recorder.validateSelectors()
    const validCount = validation.filter(v => v.valid).length
    console.log(`  ${validCount}/${validation.length} selectors valid`)
    
    // Auto-detect fields
    console.log('\n🔎 Auto-detected fields:')
    const fields = await recorder.autoDetectFields()
    fields.forEach(f => {
      console.log(`  - ${f.name}: "${f.sample.substring(0, 40)}..."`)
    })
    
    // Generate script
    const generator = new ScriptGenerator()
    const code = generator.generate('demo', 'AI-assisted task', actions)
    
    console.log('\n--- Generated Script ---\n')
    console.log(code.substring(0, 1000) + '...')
    
  } finally {
    await manager.close()
  }
}

main().catch(console.error)
