#!/usr/bin/env node

/**
 * CLI for generating headline scrapers
 * 
 * Usage:
 *   npx generate-scraper prothomalo --output=prothomalo-scraper.ts
 *   npx generate-scraper news --url=https://example.com/news --output=news-scraper.ts
 */

const { generateProthomaloScraper, generateNewsScraper } = require('../dist/lib/HeadlineScraperGenerator')
const fs = require('fs')
const path = require('path')

function showHelp() {
  console.log(`
Generate headline scraper scripts

Usage:
  npx generate-scraper <command> [options]

Commands:
  prothomalo              Generate scraper for prothomalo.com
  news --url=<url>        Generate scraper for custom news site

Options:
  --output=<path>         Output file path (default: generated/scraper-<site>.ts)
  --format=<fmt>          Output format: puppeteer | playwright | selenium (default: puppeteer)
  --no-tests              Skip self-test functionality
  --no-selector-tests     Skip selector tests
  --max-headlines=<n>     Maximum headlines to extract (default: 50)
  --min-title-length=<n>  Minimum title length (default: 10)
  --help                  Show this help

Examples:
  npx generate-scraper prothomalo
  npx generate-scraper prothomalo --output=scripts/prothomalo.ts
  npx generate-scraper news --url=https://example.com --output=example-scraper.ts
`)
}

function parseArgs(args) {
  const options = {
    command: '',
    url: '',
    output: '',
    format: 'puppeteer',
    includeTests: true,
    includeSelectorTests: true,
    maxHeadlines: 50,
    minTitleLength: 10,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    
    if (arg === '--help' || arg === '-h') {
      showHelp()
      process.exit(0)
    } else if (arg === '--no-tests') {
      options.includeTests = false
    } else if (arg === '--no-selector-tests') {
      options.includeSelectorTests = false
    } else if (arg.startsWith('--format=')) {
      options.format = arg.split('=')[1]
    } else if (arg.startsWith('--url=')) {
      options.url = arg.split('=')[1]
    } else if (arg.startsWith('--output=')) {
      options.output = arg.split('=')[1]
    } else if (arg.startsWith('--max-headlines=')) {
      options.maxHeadlines = parseInt(arg.split('=')[1], 10)
    } else if (arg.startsWith('--min-title-length=')) {
      options.minTitleLength = parseInt(arg.split('=')[1], 10)
    } else if (!arg.startsWith('--')) {
      options.command = arg
    }
  }

  return options
}

function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    showHelp()
    process.exit(1)
  }

  const options = parseArgs(args)

  if (!options.command) {
    console.error('Error: No command specified')
    showHelp()
    process.exit(1)
  }

  let code = ''
  let defaultOutput = ''

  switch (options.command) {
    case 'prothomalo':
      code = generateProthomaloScraper({
        includeSelfTest: options.includeTests,
        includeSelectorTests: options.includeSelectorTests,
        maxHeadlines: options.maxHeadlines,
        minTitleLength: options.minTitleLength,
      })
      defaultOutput = 'generated/prothomalo-scraper.ts'
      break

    case 'news':
      if (!options.url) {
        console.error('Error: --url is required for news command')
        console.error('Example: npx generate-scraper news --url=https://example.com')
        process.exit(1)
      }
      code = generateNewsScraper('Custom News Site', options.url, {
        includeSelfTest: options.includeTests,
        includeSelectorTests: options.includeSelectorTests,
        maxHeadlines: options.maxHeadlines,
        minTitleLength: options.minTitleLength,
      })
      defaultOutput = 'generated/news-scraper.ts'
      break

    default:
      console.error(`Error: Unknown command "${options.command}"`)
      showHelp()
      process.exit(1)
  }

  const outputPath = options.output || defaultOutput
  const fullPath = path.resolve(outputPath)

  // Ensure directory exists
  const dir = path.dirname(fullPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  // Write file
  fs.writeFileSync(fullPath, code)
  console.log(`✓ Generated scraper: ${fullPath}`)
  console.log(`\nUsage:`)
  console.log(`  PUPPETEER_WS_ENDPOINT=ws://localhost:9222/devtools/browser/... npx tsx ${outputPath}`)
  console.log(`  npx tsx ${outputPath} --test`)
}

main()
