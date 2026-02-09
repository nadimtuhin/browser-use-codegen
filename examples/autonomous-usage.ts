/**
 * Autonomous Usage Example
 * 
 * Demonstrates how to use browser-use-codegen WITHOUT requiring:
 * - WebSocket endpoint
 * - Pre-running Chrome instance
 * - Manual browser setup
 * 
 * The package automatically finds and launches Chrome for you!
 */

import {
  launchAutonomous,
  scrapeHeadlinesAutonomous,
  isAutonomousAvailable,
  getChromeSetupInstructions,
  testSelectors,
  extractHeadlines,
  runValidation,
  printValidationResults,
  DEFAULT_HEADLINE_SELECTORS,
} from '../src/index'

async function basicAutonomousExample() {
  console.log('=== Basic Autonomous Scraping ===\n')

  // Check if autonomous mode is available
  if (!isAutonomousAvailable()) {
    console.error('❌ Chrome not found!')
    console.log(getChromeSetupInstructions())
    return
  }

  console.log('✓ Chrome found, launching browser...\n')

  // Launch browser - no WebSocket needed!
  const session = await launchAutonomous({
    headless: true, // Set to false to see the browser
  })

  try {
    // Navigate to a page
    console.log('Navigating to prothomalo.com...')
    await session.page.goto('https://www.prothomalo.com', {
      waitUntil: 'networkidle2',
    })

    // Wait for content
    await session.page.waitForTimeout(3000)

    // Extract headlines using the helper
    console.log('Extracting headlines...')
    const headlines = await extractHeadlines(
      session.page,
      'https://www.prothomalo.com',
      { maxHeadlines: 10 }
    )

    console.log(`\nFound ${headlines.length} headlines:\n`)
    headlines.forEach((h, i) => {
      console.log(`${i + 1}. ${h.title}`)
    })

  } finally {
    await session.close()
    console.log('\n✓ Browser closed')
  }
}

async function oneLineScrapingExample() {
  console.log('\n=== One-Line Scraping ===\n')

  // Simplest possible usage - one function call!
  const result = await scrapeHeadlinesAutonomous(
    'https://www.prothomalo.com',
    {
      headless: true,
      maxHeadlines: 5,
      waitTime: 3000,
    }
  )

  console.log(`Scraped ${result.headlines.length} headlines in ${result.stats.scrapeTime}ms`)
  console.log(`Success: ${result.stats.success}\n`)

  result.headlines.forEach((h, i) => {
    console.log(`${i + 1}. ${h.title}`)
    console.log(`   ${h.url}\n`)
  })
}

async function validationExample() {
  console.log('\n=== Scraping with Validation ===\n')

  // Launch browser
  const session = await launchAutonomous({ headless: true })

  try {
    // Navigate
    await session.page.goto('https://www.prothomalo.com', {
      waitUntil: 'networkidle2',
    })
    await session.page.waitForTimeout(3000)

    // Test which selectors are working
    console.log('Testing selectors...')
    const selectorTests = await testSelectors(
      session.page,
      DEFAULT_HEADLINE_SELECTORS
    )

    console.log('\nSelector Results:')
    selectorTests.forEach(test => {
      const icon = test.found > 0 ? '✓' : '✗'
      console.log(`  ${icon} ${test.name}: ${test.found} elements`)
    })

    // Extract headlines
    const headlines = await extractHeadlines(
      session.page,
      'https://www.prothomalo.com',
      { maxHeadlines: 15 }
    )

    // Run validation
    const validation = runValidation(headlines, selectorTests)

    console.log('')
    printValidationResults(validation)

  } finally {
    await session.close()
  }
}

async function visibleBrowserExample() {
  console.log('\n=== Visible Browser (for debugging) ===\n')
  console.log('Launching visible browser in 3 seconds...')
  console.log('(You can see the browser window)\n')

  await new Promise(r => setTimeout(r, 3000))

  // Launch with headless: false to see the browser
  const session = await launchAutonomous({
    headless: false,
    slowMo: 100, // Slow down operations for visibility
  })

  try {
    console.log('Browser launched! Navigating...')
    await session.page.goto('https://www.prothomalo.com')
    
    console.log('Page loaded. Waiting 5 seconds...')
    await session.page.waitForTimeout(5000)

    const headlines = await extractHeadlines(
      session.page,
      'https://www.prothomalo.com',
      { maxHeadlines: 5 }
    )

    console.log(`\nFound ${headlines.length} headlines`)

  } finally {
    await session.close()
    console.log('Browser closed')
  }
}

async function customSiteExample(url: string) {
  console.log(`\n=== Scraping Custom Site: ${url} ===\n`)

  try {
    const result = await scrapeHeadlinesAutonomous(url, {
      headless: true,
      maxHeadlines: 10,
      minTitleLength: 15,
      waitTime: 5000, // Wait longer for JS-heavy sites
    })

    console.log(`Found ${result.headlines.length} headlines\n`)
    
    result.headlines.slice(0, 5).forEach((h, i) => {
      console.log(`${i + 1}. ${h.title.substring(0, 80)}${h.title.length > 80 ? '...' : ''}`)
    })

  } catch (error) {
    console.error(`Error scraping ${url}:`, (error as Error).message)
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2)
  const example = args[0] || 'all'

  console.log('=======================================')
  console.log('Autonomous Browser Examples')
  console.log('=======================================')
  console.log('\nNo WebSocket endpoint required!')
  console.log('The package automatically finds and launches Chrome.\n')

  switch (example) {
    case 'basic':
      await basicAutonomousExample()
      break
    case 'oneliner':
      await oneLineScrapingExample()
      break
    case 'validation':
      await validationExample()
      break
    case 'visible':
      await visibleBrowserExample()
      break
    case 'custom':
      const url = args[1] || 'https://news.ycombinator.com'
      await customSiteExample(url)
      break
    case 'all':
    default:
      await basicAutonomousExample()
      await oneLineScrapingExample()
      await validationExample()
      console.log('\n=======================================')
      console.log('Run with argument for specific example:')
      console.log('  npx tsx examples/autonomous-usage.ts basic')
      console.log('  npx tsx examples/autonomous-usage.ts oneliner')
      console.log('  npx tsx examples/autonomous-usage.ts validation')
      console.log('  npx tsx examples/autonomous-usage.ts visible')
      console.log('  npx tsx examples/autonomous-usage.ts custom <url>')
      console.log('=======================================\n')
  }
}

main().catch(console.error)
