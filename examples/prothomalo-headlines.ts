/**
 * Prothom Alo Headlines Scraper Example
 * 
 * Demonstrates how to use browser-use-codegen with self-testing
 * to scrape headlines from prothomalo.com
 * 
 * Usage:
 *   PUPPETEER_WS_ENDPOINT=ws://localhost:9222/devtools/browser/... npx tsx examples/prothomalo-headlines.ts
 *   npx tsx examples/prothomalo-headlines.ts --test     # Run with validation
 *   npx tsx examples/prothomalo-headlines.ts --verbose  # Verbose output
 */

import { 
  createBrowserManager,
  testSelectors,
  extractHeadlines,
  runValidation,
  printValidationResults,
  DEFAULT_HEADLINE_SELECTORS,
  type HeadlineData,
  type ValidationResult,
} from '../src/index'

interface ScrapeOptions {
  testMode?: boolean
  verbose?: boolean
  maxHeadlines?: number
}

async function scrapeProthomaloHeadlines(options: ScrapeOptions = {}): Promise<{
  headlines: HeadlineData[]
  validation: ValidationResult
}> {
  const wsEndpoint = process.env.PUPPETEER_WS_ENDPOINT
  
  if (!wsEndpoint) {
    throw new Error(
      'PUPPETEER_WS_ENDPOINT environment variable is required\n' +
      'Example: PUPPETEER_WS_ENDPOINT=ws://localhost:9222/devtools/browser/... npx tsx examples/prothomalo-headlines.ts'
    )
  }

  console.log('Connecting to browser...')
  const manager = await createBrowserManager({ wsEndpoint })
  
  try {
    const page = await manager.launch()
    console.log('Browser connected!\n')
    
    // Navigate to prothomalo.com
    console.log('Navigating to prothomalo.com...')
    await page.goto('https://www.prothomalo.com/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    })
    
    // Wait for content to load
    await page.waitForTimeout(3000)
    console.log('Page loaded!\n')
    
    // Test selectors if in test mode
    let selectorTests: Awaited<ReturnType<typeof testSelectors>> | undefined
    if (options.testMode || options.verbose) {
      console.log('--- TESTING SELECTORS ---')
      selectorTests = await testSelectors(page, DEFAULT_HEADLINE_SELECTORS)
      
      for (const test of selectorTests) {
        const icon = test.found > 0 ? '✓' : '✗'
        console.log(`${icon} ${test.name}: ${test.found} elements`)
        if (options.verbose && test.sample) {
          console.log(`   Sample: "${test.sample}"`)
        }
      }
      console.log('')
    }
    
    // Extract headlines
    console.log('Extracting headlines...')
    const headlines = await extractHeadlines(page, 'https://www.prothomalo.com', {
      minTitleLength: 10,
      maxHeadlines: options.maxHeadlines || 50
    })
    
    console.log(`Found ${headlines.length} headlines\n`)
    
    // Run validation
    const validation = runValidation(headlines, selectorTests)
    
    return { headlines, validation }
    
  } finally {
    await manager.close()
    console.log('Browser closed')
  }
}

async function main() {
  const args = process.argv.slice(2)
  const testMode = args.includes('--test') || args.includes('-t')
  const verbose = args.includes('--verbose') || args.includes('-v')
  
  console.log('=======================================')
  console.log('Prothom Alo Headlines Scraper')
  console.log(testMode ? 'MODE: Self-Test' : 'MODE: Scraping')
  console.log('=======================================\n')
  
  try {
    const { headlines, validation } = await scrapeProthomaloHeadlines({ 
      testMode, 
      verbose 
    })
    
    // Print validation results
    if (testMode || verbose) {
      printValidationResults(validation, verbose)
      console.log('')
    }
    
    // Print headlines
    console.log('--- HEADLINES ---\n')
    
    headlines.slice(0, 20).forEach((headline, index) => {
      console.log(`${index + 1}. ${headline.title}`)
      console.log(`   ${headline.url}\n`)
    })
    
    if (headlines.length > 20) {
      console.log(`... and ${headlines.length - 20} more headlines`)
    }
    
    console.log(`\nTotal: ${headlines.length} headlines scraped`)
    
    // Exit with appropriate code
    process.exit(validation.success ? 0 : 1)
    
  } catch (error) {
    console.error('\nError:', (error as Error).message)
    process.exit(1)
  }
}

main()
