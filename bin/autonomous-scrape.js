#!/usr/bin/env node

/**
 * Autonomous Scraper CLI
 * 
 * Scrapes headlines without requiring WebSocket or manual browser setup.
 * Fully self-contained - launches browser automatically.
 * 
 * Usage:
 *   npx autonomous-scrape prothomalo
 *   npx autonomous-scrape url=https://example.com/news
 *   npx autonomous-scrape prothomalo --headless=false --verbose
 *   npx autonomous-scrape prothomalo --max=100 --min-length=15
 *   npx autonomous-scrape prothomalo --test
 */

const {
  scrapeHeadlinesAutonomous,
  launchAutonomous,
  findChromeExecutable,
  isAutonomousAvailable,
  getChromeSetupInstructions,
} = require('../dist/lib/AutonomousBrowser')

const {
  testSelectors,
  runValidation,
  printValidationResults,
  DEFAULT_HEADLINE_SELECTORS,
} = require('../dist/lib/ScraperValidator')

const fs = require('fs')
const path = require('path')

function showHelp() {
  console.log(`
Autonomous Headline Scraper - No WebSocket Required!

Usage:
  npx autonomous-scrape <command> [options]

Commands:
  prothomalo                    Scrape prothomalo.com headlines
  url=<url>                     Scrape any URL (e.g., url=https://example.com)

Options:
  --headless=<true|false>       Run in headless mode (default: true)
  --max=<n>                     Maximum headlines to extract (default: 50)
  --min-length=<n>              Minimum title length (default: 10)
  --wait=<ms>                   Wait time after page load (default: 3000)
  --test                        Run validation tests
  --verbose                     Show detailed output
  --output=<path>               Save results to JSON file
  --screenshot=<path>           Save screenshot of page
  --help                        Show this help

Examples:
  # Scrape prothomalo (headless)
  npx autonomous-scrape prothomalo

  # Scrape with browser visible
  npx autonomous-scrape prothomalo --headless=false

  # Scrape any news site
  npx autonomous-scrape url=https://www.bbc.com/news

  # Run validation tests
  npx autonomous-scrape prothomalo --test --verbose

  # Save results to file
  npx autonomous-scrape prothomalo --output=headlines.json

  # Scrape more headlines with longer titles
  npx autonomous-scrape prothomalo --max=100 --min-length=20
`)
}

function parseArgs(args) {
  const options = {
    command: '',
    url: '',
    headless: true,
    maxHeadlines: 50,
    minTitleLength: 10,
    waitTime: 3000,
    test: false,
    verbose: false,
    output: '',
    screenshot: '',
  }

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      showHelp()
      process.exit(0)
    } else if (arg.startsWith('url=')) {
      options.command = 'url'
      options.url = arg.split('=')[1]
    } else if (arg === '--headless=false' || arg === '--headless=false') {
      options.headless = false
    } else if (arg === '--headless=true') {
      options.headless = true
    } else if (arg.startsWith('--max=')) {
      options.maxHeadlines = parseInt(arg.split('=')[1], 10)
    } else if (arg.startsWith('--min-length=')) {
      options.minTitleLength = parseInt(arg.split('=')[1], 10)
    } else if (arg.startsWith('--wait=')) {
      options.waitTime = parseInt(arg.split('=')[1], 10)
    } else if (arg === '--test' || arg === '-t') {
      options.test = true
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true
    } else if (arg.startsWith('--output=')) {
      options.output = arg.split('=')[1]
    } else if (arg.startsWith('--screenshot=')) {
      options.screenshot = arg.split('=')[1]
    } else if (!arg.startsWith('--')) {
      options.command = arg
    }
  }

  return options
}

async function runScraper(options) {
  const startTime = Date.now()

  console.log('=======================================')
  console.log('Autonomous Headline Scraper')
  console.log('=======================================')

  if (!isAutonomousAvailable()) {
    console.error('\n❌ Chrome/Chromium not found!\n')
    console.log(getChromeSetupInstructions())
    process.exit(1)
  }

  // Determine URL
  let url = options.url
  if (options.command === 'prothomalo') {
    url = 'https://www.prothomalo.com'
  }

  if (!url) {
    console.error('Error: No URL specified')
    console.log('Use: npx autonomous-scrape prothomalo')
    console.log('Or:  npx autonomous-scrape url=https://example.com')
    process.exit(1)
  }

  console.log(`Target: ${url}`)
  console.log(`Mode: ${options.headless ? 'Headless' : 'Visible Browser'}`)
  console.log(`Max Headlines: ${options.maxHeadlines}`)
  console.log('---------------------------------------\n')

  // Launch browser
  console.log('🚀 Launching browser...')
  const session = await launchAutonomous({
    headless: options.headless,
  })

  try {
    // Navigate
    console.log('📄 Navigating to page...')
    await session.page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    })

    // Wait for content
    console.log(`⏳ Waiting ${options.waitTime}ms for content...`)
    await session.page.waitForTimeout(options.waitTime)

    // Take screenshot if requested
    if (options.screenshot) {
      await session.page.screenshot({
        path: options.screenshot,
        fullPage: true,
      })
      console.log(`📸 Screenshot saved: ${options.screenshot}`)
    }

    // Run selector tests if in test mode
    let selectorTests
    if (options.test || options.verbose) {
      console.log('\n🔍 Testing selectors...')
      selectorTests = await testSelectors(session.page, DEFAULT_HEADLINE_SELECTORS)

      for (const test of selectorTests) {
        const icon = test.found > 0 ? '✓' : '✗'
        console.log(`  ${icon} ${test.name}: ${test.found} elements`)
        if (options.verbose && test.sample) {
          console.log(`    Sample: "${test.sample.substring(0, 60)}"`)
        }
      }
      console.log('')
    }

    // Extract headlines
    console.log('📰 Extracting headlines...')
    const headlines = await session.page.evaluate(
      (config) => {
        const results = []
        const seenUrls = new Set()

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
          '.card-title a',
          '[class*="story"] a',
        ]

        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector)

          for (const el of Array.from(elements)) {
            const title = (el.textContent || '').trim()
            const href = el.getAttribute('href') || ''

            if (title.length < config.minTitleLength) continue
            if (!href) continue
            if (seenUrls.has(href)) continue

            let absoluteUrl = href
            if (!href.startsWith('http')) {
              const base = config.baseUrl.replace(/\/$/, '')
              const path = href.startsWith('/') ? href : '/' + href
              absoluteUrl = base + path
            }

            seenUrls.add(href)
            results.push({ title, url: absoluteUrl })

            if (results.length >= config.maxHeadlines) break
          }

          if (results.length >= config.maxHeadlines) break
        }

        return results
      },
      {
        baseUrl: url,
        minTitleLength: options.minTitleLength,
        maxHeadlines: options.maxHeadlines,
      }
    )

    const scrapeTime = Date.now() - startTime

    console.log(`✓ Found ${headlines.length} headlines in ${scrapeTime}ms\n`)

    // Run validation
    let validation
    if (options.test || options.verbose) {
      validation = runValidation(headlines, selectorTests)
      printValidationResults(validation, options.verbose)
      console.log('')
    }

    // Display results
    console.log('--- HEADLINES ---\n')
    const displayLimit = Math.min(headlines.length, 20)
    for (let i = 0; i < displayLimit; i++) {
      console.log(`${i + 1}. ${headlines[i].title}`)
      console.log(`   ${headlines[i].url}\n`)
    }

    if (headlines.length > 20) {
      console.log(`... and ${headlines.length - 20} more headlines`)
    }

    console.log(`\nTotal: ${headlines.length} headlines`)

    // Save to file if requested
    if (options.output) {
      const output = {
        url,
        scrapedAt: new Date().toISOString(),
        stats: {
          total: headlines.length,
          scrapeTime: `${scrapeTime}ms`,
        },
        validation: validation
          ? {
              success: validation.success,
              passed: validation.stats.passedTests,
              total: validation.stats.totalTests,
            }
          : null,
        headlines,
      }

      fs.writeFileSync(options.output, JSON.stringify(output, null, 2))
      console.log(`\n💾 Results saved to: ${options.output}`)
    }

    return { headlines, validation }
  } finally {
    await session.close()
    console.log('\n🔒 Browser closed')
  }
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    showHelp()
    process.exit(1)
  }

  const options = parseArgs(args)

  try {
    const result = await runScraper(options)

    // Exit with appropriate code
    if (options.test && result.validation) {
      process.exit(result.validation.success ? 0 : 1)
    }
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error:', error.message)

    if (error.message.includes('Could not find Chrome')) {
      console.log('\n' + getChromeSetupInstructions())
    }

    process.exit(1)
  }
}

main()
