/**
 * AutonomousBrowser - Self-contained browser automation
 * 
 * Launches and manages browser automatically without requiring:
 * - External WebSocket endpoint
 * - Manual browser setup
 * - Pre-running Chrome instance
 */

import puppeteer, { type Browser, type Page, type PuppeteerLaunchOptions } from 'puppeteer-core'
import * as fs from 'fs'

export interface AutonomousOptions {
  /** Run in headless mode (default: true) */
  headless?: boolean
  /** Chrome/Chromium executable path */
  executablePath?: string
  /** Additional launch arguments */
  args?: string[]
  /** Slow down operations by ms (for debugging) */
  slowMo?: number
  /** Viewport dimensions */
  viewport?: { width: number; height: number }
  /** User agent string */
  userAgent?: string
  /** Timeout for navigation */
  timeout?: number
}

export interface AutonomousSession {
  browser: Browser
  page: Page
  close: () => Promise<void>
}

/**
 * Default Chrome/Chromium paths by platform
 */
const DEFAULT_EXECUTABLE_PATHS = {
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
  ],
  linux: [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
  ],
  win32: [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ],
}

/**
 * Find Chrome/Chromium executable automatically
 */
export function findChromeExecutable(): string | null {
  // Env overrides take priority
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH
  }
  if (process.env.CHROME_PATH) {
    return process.env.CHROME_PATH
  }

  const platform = process.platform as keyof typeof DEFAULT_EXECUTABLE_PATHS
  const paths = DEFAULT_EXECUTABLE_PATHS[platform] || []

  for (const path of paths) {
    if (fs.existsSync(path)) {
      return path
    }
  }

  return null
}

/**
 * Launch browser autonomously (no WebSocket needed)
 */
export async function launchAutonomous(
  options: AutonomousOptions = {}
): Promise<AutonomousSession> {
  const {
    headless = true,
    executablePath = findChromeExecutable() || undefined,
    args = [],
    slowMo,
    viewport = { width: 1280, height: 720 },
    userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    timeout = 30000,
  } = options

  if (!executablePath) {
    throw new Error(
      'Could not find Chrome/Chromium executable.\n' +
      'Please install Chrome or set PUPPETEER_EXECUTABLE_PATH environment variable.\n' +
      'Download: https://www.google.com/chrome/'
    )
  }

  const launchOptions: PuppeteerLaunchOptions = {
    headless,
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1280,720',
      ...args,
    ],
    slowMo,
  }

  const browser = await puppeteer.launch(launchOptions)
  const page = await browser.newPage()

  // Set viewport
  await page.setViewport(viewport)

  // Set user agent
  await page.setUserAgent(userAgent)

  // Set default timeout
  page.setDefaultTimeout(timeout)
  page.setDefaultNavigationTimeout(timeout)

  return {
    browser,
    page,
    close: async () => {
      await browser.close()
    },
  }
}

/**
 * Autonomous headline scraper - fully self-contained
 */
export async function scrapeHeadlinesAutonomous(
  url: string,
  options: AutonomousOptions & {
    maxHeadlines?: number
    minTitleLength?: number
    waitForSelector?: string
    waitTime?: number
  } = {}
): Promise<{
  headlines: Array<{ title: string; url: string }>
  stats: {
    totalFound: number
    scrapeTime: number
    success: boolean
  }
}> {
  const startTime = Date.now()
  const {
    maxHeadlines = 50,
    minTitleLength = 10,
    waitForSelector,
    waitTime = 3000,
  } = options

  const session = await launchAutonomous(options)

  try {
    // Navigate
    await session.page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: options.timeout || 30000,
    })

    // Wait for specific selector if provided
    if (waitForSelector) {
      try {
        await session.page.waitForSelector(waitForSelector, { timeout: 5000 })
      } catch {
        // Continue anyway
      }
    }

    // Generic wait for content
    await new Promise((r) => setTimeout(r, waitTime))

    // Extract headlines
    const headlines = await session.page.evaluate(
      (config) => {
        const results: Array<{ title: string; url: string }> = []
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
      { baseUrl: url, minTitleLength, maxHeadlines }
    )

    return {
      headlines,
      stats: {
        totalFound: headlines.length,
        scrapeTime: Date.now() - startTime,
        success: headlines.length > 0,
      },
    }
  } finally {
    await session.close()
  }
}

/**
 * Check if autonomous mode is available (Chrome installed)
 */
export function isAutonomousAvailable(): boolean {
  return findChromeExecutable() !== null
}

/**
 * Get setup instructions for installing Chrome
 */
export function getChromeSetupInstructions(): string {
  const platform = process.platform

  const instructions: Record<string, string> = {
    darwin: `
macOS Chrome Setup:
  1. Download Chrome: https://www.google.com/chrome/
  2. Install by dragging to Applications folder
  3. Or use Homebrew: brew install --cask google-chrome
`,
    linux: `
Linux Chrome Setup:
  # Ubuntu/Debian
  wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
  sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'
  sudo apt-get update
  sudo apt-get install google-chrome-stable

  # Or use Chromium (open source)
  sudo apt-get install chromium-browser
`,
    win32: `
Windows Chrome Setup:
  1. Download Chrome: https://www.google.com/chrome/
  2. Run the installer
  3. Or use Chocolatey: choco install googlechrome
`,
  }

  return (
    instructions[platform] ||
    `
Chrome Setup:
  1. Download Chrome: https://www.google.com/chrome/
  2. Install for your platform
  3. Set PUPPETEER_EXECUTABLE_PATH environment variable if needed
`
  )
}
