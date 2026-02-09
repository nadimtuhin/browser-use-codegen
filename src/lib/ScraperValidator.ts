/**
 * ScraperValidator - Self-testing utilities for generated scrapers
 * 
 * Validates scraped data quality and selector effectiveness.
 */

import type { Page } from 'puppeteer-core'

export interface ValidationTest {
  name: string
  passed: boolean
  message: string
  details?: Record<string, unknown>
}

export interface ValidationResult {
  success: boolean
  tests: ValidationTest[]
  stats: {
    totalTests: number
    passedTests: number
    failedTests: number
  }
}

export interface HeadlineData {
  title: string
  url: string
  [key: string]: string | undefined
}

export interface SelectorTest {
  selector: string
  name: string
  found: number
  sample?: string
  [key: string]: string | number | undefined
}

/**
 * Validates scraped headlines for quality and completeness
 */
export function validateHeadlines(headlines: HeadlineData[]): ValidationTest[] {
  const results: ValidationTest[] = []
  
  // Test 1: Check if any headlines were found
  results.push({
    name: 'Headlines Found',
    passed: headlines.length > 0,
    message: headlines.length > 0 
      ? `Found ${headlines.length} headlines` 
      : 'No headlines found - selectors may need updating',
    details: { count: headlines.length }
  })
  
  // Test 2: Check for duplicate URLs
  const urls = headlines.map(h => h.url)
  const uniqueUrls = new Set(urls)
  results.push({
    name: 'No Duplicate URLs',
    passed: urls.length === uniqueUrls.size,
    message: urls.length === uniqueUrls.size
      ? 'All URLs are unique'
      : `Found ${urls.length - uniqueUrls.size} duplicate URLs`,
    details: { total: urls.length, unique: uniqueUrls.size }
  })
  
  // Test 3: Check title quality (minimum length)
  const shortTitles = headlines.filter(h => h.title.length < 20)
  results.push({
    name: 'Title Quality',
    passed: shortTitles.length === 0,
    message: shortTitles.length === 0
      ? 'All titles have adequate length'
      : `${shortTitles.length} titles are suspiciously short`,
    details: { shortTitles: shortTitles.map(h => h.title) }
  })
  
  // Test 4: Check URL validity
  const invalidUrls = headlines.filter(h => 
    !h.url.startsWith('http') || !h.url.includes('://')
  )
  results.push({
    name: 'URL Validity',
    passed: invalidUrls.length === 0,
    message: invalidUrls.length === 0
      ? 'All URLs are valid'
      : `${invalidUrls.length} URLs are invalid`,
    details: { invalidUrls }
  })
  
  // Test 5: Check for empty titles
  const emptyTitles = headlines.filter(h => !h.title || h.title.trim() === '')
  results.push({
    name: 'No Empty Titles',
    passed: emptyTitles.length === 0,
    message: emptyTitles.length === 0
      ? 'All headlines have titles'
      : `${emptyTitles.length} headlines have empty titles`,
    details: { emptyCount: emptyTitles.length }
  })
  
  return results
}

/**
 * Test if selectors are finding elements on the page
 */
export async function testSelectors(
  page: Page, 
  selectorConfigs: Array<{ name: string; selector: string }>
): Promise<SelectorTest[]> {
  return await page.evaluate((selectors) => {
    const results: SelectorTest[] = []
    
    for (const item of selectors) {
      const elements = document.querySelectorAll(item.selector)
      const sample = elements.length > 0 
        ? (elements[0].textContent || '').substring(0, 50) 
        : undefined
        
      results.push({
        selector: item.selector,
        name: item.name,
        found: elements.length,
        sample
      })
    }
    
    return results
  }, selectorConfigs)
}

/**
 * Default headline selectors to test
 */
export const DEFAULT_HEADLINE_SELECTORS = [
  { name: 'h1 headlines', selector: 'h1 a' },
  { name: 'h2 headlines', selector: 'h2 a' },
  { name: 'h3 headlines', selector: 'h3 a' },
  { name: 'article links', selector: 'article a' },
  { name: 'class-based headlines', selector: '[class*="headline"] a' },
  { name: 'title classes', selector: '[class*="title"] a' },
  { name: 'news links', selector: '[class*="news"] a' },
  { name: 'data-testid headlines', selector: '[data-testid*="headline"] a' },
]

/**
 * Run full validation on scraped data
 */
export function runValidation(
  headlines: HeadlineData[],
  selectorTests?: SelectorTest[]
): ValidationResult {
  const tests = validateHeadlines(headlines)
  
  // Add selector test results if provided
  if (selectorTests) {
    for (const test of selectorTests) {
      tests.push({
        name: `Selector: ${test.name}`,
        passed: test.found > 0,
        message: test.found > 0
          ? `Found ${test.found} elements`
          : 'No elements found',
        details: test
      })
    }
  }
  
  const passedTests = tests.filter(t => t.passed).length
  
  return {
    success: tests.every(t => t.passed),
    tests,
    stats: {
      totalTests: tests.length,
      passedTests,
      failedTests: tests.length - passedTests
    }
  }
}

/**
 * Print validation results to console
 */
export function printValidationResults(result: ValidationResult, verbose = false): void {
  console.log('\n--- VALIDATION RESULTS ---\n')
  
  for (const test of result.tests) {
    const icon = test.passed ? '✓' : '✗'
    console.log(`${icon} ${test.name}`)
    console.log(`   ${test.message}`)
    
    if (verbose && test.details) {
      console.log(`   Details: ${JSON.stringify(test.details, null, 2).replace(/\n/g, '\n   ')}`)
    }
    console.log('')
  }
  
  console.log(`Test Summary: ${result.stats.passedTests}/${result.stats.totalTests} passed`)
  console.log(`Overall: ${result.success ? '✓ PASSED' : '✗ FAILED'}`)
}

/**
 * Extract headlines from a news page using multiple selector strategies
 */
export async function extractHeadlines(
  page: Page,
  baseUrl: string,
  options: {
    minTitleLength?: number
    maxHeadlines?: number
  } = {}
): Promise<HeadlineData[]> {
  const { minTitleLength = 10, maxHeadlines = 50 } = options
  
  return await page.evaluate((config) => {
    const results: HeadlineData[] = []
    const seenUrls = new Set<string>()
    
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
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector)
      
      for (const el of Array.from(elements)) {
        const title = (el.textContent || '').trim()
        const href = el.getAttribute('href') || ''
        
        // Filter criteria
        if (title.length < config.minTitleLength) continue
        if (!href) continue
        if (seenUrls.has(href)) continue
        
        // Make URL absolute
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
  }, { baseUrl, minTitleLength, maxHeadlines })
}
