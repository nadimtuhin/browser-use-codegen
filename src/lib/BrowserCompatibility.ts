import { ScriptReplay } from '../lib/ScriptReplay'
import { ScriptGenerator } from '../lib/ScriptGenerator'
import { PlaywrightGenerator } from '../lib/PlaywrightGenerator'
import { RecordedAction } from '../types'

export enum BrowserType {
  CHROME = 'chrome',
  FIREFOX = 'firefox',
  SAFARI = 'safari',
  EDGE = 'edge',
}

export interface BrowserConfig {
  type: BrowserType
  headless?: boolean
  slowMo?: number
  viewport?: { width: number; height: number }
}

export class BrowserCompatibility {
  static getSupportedBrowsers(): BrowserType[] {
    return [BrowserType.CHROME, BrowserType.FIREFOX, BrowserType.SAFARI, BrowserType.EDGE]
  }

  static getBrowserLabel(browserType: BrowserType): string {
    const labels: Record<BrowserType, string> = {
      [BrowserType.CHROME]: 'Google Chrome',
      [BrowserType.FIREFOX]: 'Mozilla Firefox',
      [BrowserType.SAFARI]: 'Safari',
      [BrowserType.EDGE]: 'Microsoft Edge',
    }
    return labels[browserType]
  }

  static getPuppeteerBrowser(browserType: BrowserType): string {
    const mapping: Record<BrowserType, string> = {
      [BrowserType.CHROME]: 'chromium',
      [BrowserType.FIREFOX]: 'firefox',
      [BrowserType.SAFARI]: 'webkit', // Safari uses WebKit
      [BrowserType.EDGE]: 'chromium', // Edge uses Chromium
    }
    return mapping[browserType]
  }

  static getPlaywrightBrowser(browserType: BrowserType): string {
    const mapping: Record<BrowserType, string> = {
      [BrowserType.CHROME]: 'chromium',
      [BrowserType.FIREFOX]: 'firefox',
      [BrowserType.SAFARI]: 'webkit',
      [BrowserType.EDGE]: 'chromium',
    }
    return mapping[browserType]
  }

  static getSeleniumBrowser(browserType: BrowserType): string {
    const mapping: Record<BrowserType, string> = {
      [BrowserType.CHROME]: 'Chrome',
      [BrowserType.FIREFOX]: 'Firefox',
      [BrowserType.SAFARI]: 'Safari',
      [BrowserType.EDGE]: 'Edge',
    }
    return mapping[browserType]
  }

  static isHeadlessSupported(browserType: BrowserType): boolean {
    // Safari doesn't support headless mode in Selenium
    return browserType !== BrowserType.SAFARI
  }

  static getDefaultViewport(browserType: BrowserType): { width: number; height: number } {
    // Some browsers have different default viewports
    return { width: 1920, height: 1080 }
  }
}
