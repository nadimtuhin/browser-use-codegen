/**
 * HeadlineScraperGenerator
 * 
 * Generates standalone Puppeteer scripts for scraping news headlines
 * with built-in self-testing capabilities.
 */

export interface HeadlineScraperOptions {
  /** Target website URL */
  url: string
  /** Base URL for resolving relative links */
  baseUrl: string
  /** Minimum title length to consider valid */
  minTitleLength?: number
  /** Maximum headlines to extract */
  maxHeadlines?: number
  /** Include selector tests in output */
  includeSelectorTests?: boolean
  /** Include self-test function */
  includeSelfTest?: boolean
  /** Output file path */
  outputPath?: string
}

/**
 * Generates a complete standalone headline scraper script
 */
export function generateHeadlineScraper(options: HeadlineScraperOptions): string {
  const {
    url,
    baseUrl,
    minTitleLength = 10,
    maxHeadlines = 50,
    includeSelectorTests = true,
    includeSelfTest = true,
  } = options

  return `/**
 * AUTO-GENERATED Headline Scraper
 * 
 * Source: ${url}
 * Generated: ${new Date().toISOString()}
 * 
 * Usage:
 *   PUPPETEER_WS_ENDPOINT=ws://localhost:9222/devtools/browser/... npx tsx this-script.ts
 *   npx tsx this-script.ts --test     # Run with validation
 *   npx tsx this-script.ts --verbose  # Verbose output
 */

import puppeteer from 'puppeteer-core'

interface Headline {
  title: string
  url: string
}

interface ValidationTest {
  name: string
  passed: boolean
  message: string
  details?: Record<string, unknown>
}

interface ValidationResult {
  success: boolean
  tests: ValidationTest[]
  stats: {
    totalTests: number
    passedTests: number
    failedTests: number
  }
}

// ============================================================
// SCRAPING FUNCTIONS
// ============================================================

async function scrapeHeadlines(): Promise<Headline[]> {
  const wsEndpoint = process.env.PUPPETEER_WS_ENDPOINT
  
  if (!wsEndpoint) {
    throw new Error(
      'PUPPETEER_WS_ENDPOINT environment variable is required\\n' +
      'Start Chrome with: /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222\\n' +
      'Then: PUPPETEER_WS_ENDPOINT=ws://localhost:9222/devtools/browser/... npx tsx this-script.ts'
    )
  }

  const browser = await puppeteer.connect({ browserWSEndpoint: wsEndpoint })

  try {
    const page = await browser.newPage()
    
    // Set user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )
    
    // Navigate to target
    console.log('Navigating to ${url}...')
    await page.goto('${url}', {
      waitUntil: 'networkidle2',
      timeout: 30000
    })
    
    // Wait for content to load
    await page.waitForTimeout(3000)
    
    // Extract headlines
    const headlines = await page.evaluate(function() {
      const results = []
      const seenUrls = {}
      
      const selectors = [
        'h1 a',
        'h2 a',
        'h3 a',
        'h4 a',
        '[class*="headline"] a',
        '[class*="title"] a',
        'article a',
        '.news-title a',
        '[data-testid*="headline"] a',
        '.story-heading a',
        '.entry-title a',
        '.post-title a',
      ]
      
      for (let i = 0; i < selectors.length; i++) {
        const elements = document.querySelectorAll(selectors[i])
        
        for (let j = 0; j < elements.length; j++) {
          const el = elements[j]
          const title = (el.textContent || '').trim()
          const href = el.getAttribute('href') || ''
          
          // Filter criteria
          if (title.length < ${minTitleLength}) continue
          if (!href) continue
          if (seenUrls[href]) continue
          
          // Make URL absolute
          let absoluteUrl = href
          if (href.indexOf('http') !== 0) {
            absoluteUrl = '${baseUrl.replace(/\/$/, '')}' + (href.indexOf('/') === 0 ? '' : '/') + href
          }
          
          seenUrls[href] = true
          results.push({ title: title, url: absoluteUrl })
          
          if (results.length >= ${maxHeadlines}) break
        }
        
        if (results.length >= ${maxHeadlines}) break
      }
      
      return results
    })
    
    return headlines
    
  } finally {
    await browser.disconnect()
  }
}

// ============================================================
${includeSelectorTests ? `// SELECTOR TESTS
// ============================================================

async function testSelectors(page: import('puppeteer-core').Page) {
  return await page.evaluate(function() {
    const tests = []
    const selectors = [
      { name: 'h1 headlines', selector: 'h1 a' },
      { name: 'h2 headlines', selector: 'h2 a' },
      { name: 'h3 headlines', selector: 'h3 a' },
      { name: 'article links', selector: 'article a' },
      { name: 'class-based headlines', selector: '[class*="headline"] a' },
      { name: 'title classes', selector: '[class*="title"] a' },
    ]
    
    for (let i = 0; i < selectors.length; i++) {
      const item = selectors[i]
      const elements = document.querySelectorAll(item.selector)
      tests.push({
        name: item.name,
        selector: item.selector,
        found: elements.length,
        sample: elements.length > 0 ? (elements[0].textContent || '').substring(0, 50) : null
      })
    }
    
    return tests
  })
}

` : ''}// ============================================================
${includeSelfTest ? `// VALIDATION FUNCTIONS
// ============================================================

function validateHeadlines(headlines: Headline[]): ValidationTest[] {
  const results = []
  
  // Test 1: Check if any headlines were found
  results.push({
    name: 'Headlines Found',
    passed: headlines.length > 0,
    message: headlines.length > 0 
      ? 'Found ' + headlines.length + ' headlines' 
      : 'No headlines found - selectors may need updating',
    details: { count: headlines.length }
  })
  
  // Test 2: Check for duplicate URLs
  const urls = headlines.map(function(h) { return h.url })
  const uniqueUrls = {}
  let duplicates = 0
  for (let i = 0; i < urls.length; i++) {
    if (uniqueUrls[urls[i]]) duplicates++
    uniqueUrls[urls[i]] = true
  }
  
  results.push({
    name: 'No Duplicate URLs',
    passed: duplicates === 0,
    message: duplicates === 0
      ? 'All URLs are unique'
      : 'Found ' + duplicates + ' duplicate URLs',
    details: { total: urls.length, unique: Object.keys(uniqueUrls).length }
  })
  
  // Test 3: Check title quality
  let shortTitles = 0
  for (let i = 0; i < headlines.length; i++) {
    if (headlines[i].title.length < 20) shortTitles++
  }
  
  results.push({
    name: 'Title Quality',
    passed: shortTitles === 0,
    message: shortTitles === 0
      ? 'All titles have adequate length'
      : shortTitles + ' titles are suspiciously short',
    details: { shortTitleCount: shortTitles }
  })
  
  // Test 4: Check URL validity
  let invalidUrls = 0
  for (let i = 0; i < headlines.length; i++) {
    if (headlines[i].url.indexOf('http') !== 0) invalidUrls++
  }
  
  results.push({
    name: 'URL Validity',
    passed: invalidUrls === 0,
    message: invalidUrls === 0
      ? 'All URLs are valid'
      : invalidUrls + ' URLs are invalid',
    details: { invalidCount: invalidUrls }
  })
  
  // Test 5: Check for empty titles
  let emptyTitles = 0
  for (let i = 0; i < headlines.length; i++) {
    if (!headlines[i].title || headlines[i].title.trim() === '') emptyTitles++
  }
  
  results.push({
    name: 'No Empty Titles',
    passed: emptyTitles === 0,
    message: emptyTitles === 0
      ? 'All headlines have titles'
      : emptyTitles + ' headlines have empty titles',
    details: { emptyCount: emptyTitles }
  })
  
  return results
}

function printValidationResults(result: ValidationResult, verbose = false) {
  console.log('\\n--- VALIDATION RESULTS ---\\n')
  
  let passed = 0
  let failed = 0
  
  for (let i = 0; i < result.tests.length; i++) {
    const test = result.tests[i]
    const icon = test.passed ? '✓' : '✗'
    console.log(icon + ' ' + test.name)
    console.log('   ' + test.message)
    
    if (verbose && test.details) {
      console.log('   Details: ' + JSON.stringify(test.details))
    }
    console.log('')
    
    if (test.passed) passed++
    else failed++
  }
  
  console.log('Test Summary: ' + passed + ' passed, ' + failed + ' failed')
  console.log('Overall: ' + (result.success ? '✓ PASSED' : '✗ FAILED'))
}

` : ''}// ============================================================
// MAIN ENTRY POINT
// ============================================================

async function main() {
  const args = process.argv.slice(2)
  const testMode = args.indexOf('--test') !== -1 || args.indexOf('-t') !== -1
  const verbose = args.indexOf('--verbose') !== -1 || args.indexOf('-v') !== -1
  
  console.log('=======================================')
  console.log('Headline Scraper')
  console.log('Source: ${url}')
  console.log(testMode ? 'MODE: Self-Test' : 'MODE: Scraping')
  console.log('=======================================\\n')
  
  try {
    const headlines = await scrapeHeadlines()
    
    ${includeSelfTest ? `// Run validation
    const tests = validateHeadlines(headlines)
    const validation = {
      success: tests.every(function(t) { return t.passed }),
      tests: tests,
      stats: {
        totalTests: tests.length,
        passedTests: tests.filter(function(t) { return t.passed }).length,
        failedTests: tests.filter(function(t) { return !t.passed }).length
      }
    }
    
    if (testMode || verbose) {
      printValidationResults(validation, verbose)
      console.log('')
    }
    ` : ''}
    // Print headlines
    console.log('--- HEADLINES ---\\n')
    
    const limit = Math.min(headlines.length, 20)
    for (let i = 0; i < limit; i++) {
      console.log((i + 1) + '. ' + headlines[i].title)
      console.log('   ' + headlines[i].url + '\\n')
    }
    
    if (headlines.length > 20) {
      console.log('... and ' + (headlines.length - 20) + ' more headlines')
    }
    
    console.log('\\nTotal: ' + headlines.length + ' headlines scraped')
    
    ${includeSelfTest ? `// Exit with appropriate code
    process.exit(validation.success ? 0 : 1)` : 'process.exit(0)'}
    
  } catch (error) {
    console.error('\\nError:', (error as Error).message)
    process.exit(1)
  }
}

main()
`
}

/**
 * Generates a headline scraper for prothomalo.com
 */
export function generateProthomaloScraper(options: Partial<HeadlineScraperOptions> = {}): string {
  return generateHeadlineScraper({
    url: 'https://www.prothomalo.com',
    baseUrl: 'https://www.prothomalo.com',
    minTitleLength: 10,
    maxHeadlines: 50,
    includeSelectorTests: true,
    includeSelfTest: true,
    ...options,
  })
}

/**
 * Generates a headline scraper for any news site
 */
export function generateNewsScraper(
  siteName: string,
  url: string,
  options: Partial<HeadlineScraperOptions> = {}
): string {
  return generateHeadlineScraper({
    url,
    baseUrl: url.replace(/\/$/, ''),
    minTitleLength: 10,
    maxHeadlines: 50,
    includeSelectorTests: true,
    includeSelfTest: true,
    ...options,
  })
}
