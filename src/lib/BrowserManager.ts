/**
 * Browser connection manager for different providers
 */
import { Browser, Page } from 'puppeteer-core'

export interface BrowserProvider {
  connect(): Promise<Browser>
  disconnect(browser: Browser): Promise<void>
}

export class WSEndpointProvider implements BrowserProvider {
  private wsEndpoint: string

  constructor(wsEndpoint: string) {
    this.wsEndpoint = wsEndpoint
  }

  async connect(): Promise<Browser> {
    const puppeteer = await import('puppeteer-core')
    return await puppeteer.connect({
      browserWSEndpoint: this.wsEndpoint,
    })
  }

  async disconnect(browser: Browser): Promise<void> {
    await browser.disconnect()
  }
}

export class BrowserManager {
  private browser: Browser | null = null
  private page: Page | null = null
  private provider: BrowserProvider

  constructor(provider: BrowserProvider) {
    this.provider = provider
  }

  async launch(): Promise<Page> {
    this.browser = await this.provider.connect()
    this.page = await this.browser.newPage()
    
    // Set default viewport
    await this.page.setViewport({
      width: 1920,
      height: 1080,
    })

    return this.page
  }

  async close(): Promise<void> {
    if (this.page) {
      await this.page.close()
      this.page = null
    }
    if (this.browser) {
      await this.provider.disconnect(this.browser)
      this.browser = null
    }
  }

  getPage(): Page | null {
    return this.page
  }

  getBrowser(): Browser | null {
    return this.browser
  }
}

/**
 * Create a browser manager from environment or options
 */
export async function createBrowserManager(
  options: { wsEndpoint?: string; multiloginProfileId?: string } = {}
): Promise<BrowserManager> {
  // Check for Multilogin integration
  if (options.multiloginProfileId) {
    try {
      const { MultiloginProvider } = await import('./MultiloginProvider')
      return new BrowserManager(new MultiloginProvider(options.multiloginProfileId))
    } catch (e) {
      console.warn('Multilogin SDK not available, falling back to WS endpoint')
    }
  }

  // Use WS endpoint
  const wsEndpoint = options.wsEndpoint || process.env.PUPPETEER_WS_ENDPOINT
  
  if (!wsEndpoint) {
    throw new Error(
      'No browser connection available.\n' +
      'Please provide one of:\n' +
      '  --wsEndpoint flag\n' +
      '  --multiloginProfileId flag\n' +
      '  PUPPETEER_WS_ENDPOINT env var\n' +
      '\nExample with Chrome:\n' +
      '  chrome --remote-debugging-port=9222\n' +
      '  browser-use-codegen --wsEndpoint=ws://localhost:9222/devtools/browser/...'
    )
  }

  return new BrowserManager(new WSEndpointProvider(wsEndpoint))
}
