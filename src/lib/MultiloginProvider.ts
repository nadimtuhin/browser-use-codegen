/**
 * Multilogin browser provider (optional integration)
 * 
 * To use Multilogin, you need to implement this interface with your own
 * SDK integration or HTTP API calls to Multilogin.
 */
import { Browser } from 'puppeteer-core'
import { BrowserProvider } from './BrowserManager'

export interface MultiloginAccount {
  id: number
  multiloginFolderId?: string | null
  multiloginProfileId: string
}

export class MultiloginProvider implements BrowserProvider {
  private profileId: string
  private customProvider?: BrowserProvider

  constructor(profileId: string, customProvider?: BrowserProvider) {
    this.profileId = profileId
    this.customProvider = customProvider
  }

  async connect(): Promise<Browser> {
    // If a custom provider was passed, use it
    if (this.customProvider) {
      return this.customProvider.connect()
    }

    // Otherwise, throw with helpful message
    throw new Error(
      'MultiloginProvider requires a custom BrowserProvider implementation.\n\n' +
      'Example:\n' +
      '  class MyMultiloginProvider implements BrowserProvider {\n' +
      '    async connect() {\n' +
      '      // Your Multilogin SDK integration here\n' +
      '      const wsEndpoint = await startMultiloginBrowser(profileId)\n' +
      '      return puppeteer.connect({ browserWSEndpoint: wsEndpoint })\n' +
      '    }\n' +
      '    async disconnect(browser) {\n' +
      '      await browser.disconnect()\n' +
      '    }\n' +
      '  }\n\n' +
      '  const provider = new MultiloginProvider(profileId, new MyMultiloginProvider())\n' +
      '  const manager = new BrowserManager(provider)'
    )
  }

  async disconnect(browser: Browser): Promise<void> {
    if (this.customProvider) {
      await this.customProvider.disconnect(browser)
    } else {
      await browser.disconnect()
    }
  }
}

/**
 * Helper to create a Multilogin provider with a custom connector function
 */
export function createMultiloginProvider(
  profileId: string,
  connector: (profileId: string) => Promise<string> // Returns WS endpoint
): BrowserProvider {
  return {
    async connect(): Promise<Browser> {
      const puppeteer = await import('puppeteer-core')
      const wsEndpoint = await connector(profileId)
      return await puppeteer.connect({ browserWSEndpoint: wsEndpoint })
    },
    async disconnect(browser: Browser): Promise<void> {
      await browser.disconnect()
    }
  }
}
