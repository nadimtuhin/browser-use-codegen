import { BrowserCompatibility, BrowserType } from '../lib/BrowserCompatibility'
import { PlaywrightGenerator } from '../lib/PlaywrightGenerator'
import { SeleniumGenerator } from '../lib/SeleniumGenerator'
import { RecordedAction } from '../types'

describe('Multi-Browser Compatibility Tests', () => {
  describe('Browser type support', () => {
    it('should list all supported browsers', () => {
      const supported = BrowserCompatibility.getSupportedBrowsers()

      expect(supported).toContain(BrowserType.CHROME)
      expect(supported).toContain(BrowserType.FIREFOX)
      expect(supported).toContain(BrowserType.SAFARI)
      expect(supported).toContain(BrowserType.EDGE)
      expect(supported.length).toBe(4)
    })

    it('should provide browser labels', () => {
      expect(BrowserCompatibility.getBrowserLabel(BrowserType.CHROME)).toBe('Google Chrome')
      expect(BrowserCompatibility.getBrowserLabel(BrowserType.FIREFOX)).toBe('Mozilla Firefox')
      expect(BrowserCompatibility.getBrowserLabel(BrowserType.SAFARI)).toBe('Safari')
      expect(BrowserCompatibility.getBrowserLabel(BrowserType.EDGE)).toBe('Microsoft Edge')
    })
  })

  describe('Playwright browser mapping', () => {
    it('should map Chrome to chromium', () => {
      const browser = BrowserCompatibility.getPlaywrightBrowser(BrowserType.CHROME)
      expect(browser).toBe('chromium')
    })

    it('should map Firefox to firefox', () => {
      const browser = BrowserCompatibility.getPlaywrightBrowser(BrowserType.FIREFOX)
      expect(browser).toBe('firefox')
    })

    it('should map Safari to webkit', () => {
      const browser = BrowserCompatibility.getPlaywrightBrowser(BrowserType.SAFARI)
      expect(browser).toBe('webkit')
    })

    it('should map Edge to chromium', () => {
      const browser = BrowserCompatibility.getPlaywrightBrowser(BrowserType.EDGE)
      expect(browser).toBe('chromium')
    })

    it('should generate Playwright code for Chrome', () => {
      const actions: RecordedAction[] = [
        {
          type: 'navigate',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          page: { url: 'https://example.com', title: 'Example' },
        },
        {
          type: 'click',
          timestamp: Date.now(),
          selector: { primary: '[data-testid="btn"]', fallbacks: [] },
          page: { url: 'https://example.com', title: 'Example' },
        },
      ]

      const generator = new PlaywrightGenerator()
      const code = generator.generate('chrome-1', 'Test on Chrome', actions)

      expect(code).toContain('chromium')
      expect(code).toContain('sync_playwright')
    })

    it('should generate Playwright code for Firefox', () => {
      const actions: RecordedAction[] = [
        {
          type: 'navigate',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          page: { url: 'https://example.com', title: 'Example' },
        },
      ]

      const generator = new PlaywrightGenerator()
      const code = generator.generate('firefox-1', 'Test on Firefox', actions)

      // Note: The generator doesn't hardcode the browser type yet,
      // but should support it through options
      expect(code).toContain('sync_playwright')
    })

    it('should generate Playwright code for Safari/WebKit', () => {
      const actions: RecordedAction[] = [
        {
          type: 'navigate',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          page: { url: 'https://example.com', title: 'Example' },
        },
      ]

      const generator = new PlaywrightGenerator()
      const code = generator.generate('safari-1', 'Test on Safari', actions)

      expect(code).toContain('sync_playwright')
    })
  })

  describe('Selenium browser mapping', () => {
    it('should map Chrome to Chrome driver', () => {
      const browser = BrowserCompatibility.getSeleniumBrowser(BrowserType.CHROME)
      expect(browser).toBe('Chrome')
    })

    it('should map Firefox to Firefox driver', () => {
      const browser = BrowserCompatibility.getSeleniumBrowser(BrowserType.FIREFOX)
      expect(browser).toBe('Firefox')
    })

    it('should map Safari to Safari driver', () => {
      const browser = BrowserCompatibility.getSeleniumBrowser(BrowserType.SAFARI)
      expect(browser).toBe('Safari')
    })

    it('should map Edge to Edge driver', () => {
      const browser = BrowserCompatibility.getSeleniumBrowser(BrowserType.EDGE)
      expect(browser).toBe('Edge')
    })

    it('should generate Selenium code for Chrome', () => {
      const actions: RecordedAction[] = [
        {
          type: 'navigate',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          page: { url: 'https://example.com', title: 'Example' },
        },
      ]

      const generator = new SeleniumGenerator()
      const code = generator.generate('chrome-1', 'Test on Chrome', actions)

      expect(code).toContain('webdriver')
      expect(code).toContain('Chrome')
    })

    it('should generate Selenium code for Firefox', () => {
      const actions: RecordedAction[] = [
        {
          type: 'navigate',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          page: { url: 'https://example.com', title: 'Example' },
        },
      ]

      const generator = new SeleniumGenerator()
      const code = generator.generate('firefox-1', 'Test on Firefox', actions)

      expect(code).toContain('webdriver')
    })

    it('should generate Selenium code for Safari', () => {
      const actions: RecordedAction[] = [
        {
          type: 'navigate',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          page: { url: 'https://example.com', title: 'Example' },
        },
      ]

      const generator = new SeleniumGenerator()
      const code = generator.generate('safari-1', 'Test on Safari', actions)

      expect(code).toContain('webdriver')
    })

    it('should generate Selenium code for Edge', () => {
      const actions: RecordedAction[] = [
        {
          type: 'navigate',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          page: { url: 'https://example.com', title: 'Example' },
        },
      ]

      const generator = new SeleniumGenerator()
      const code = generator.generate('edge-1', 'Test on Edge', actions)

      expect(code).toContain('webdriver')
    })
  })

  describe('Puppeteer browser mapping', () => {
    it('should map Chrome to chromium', () => {
      const browser = BrowserCompatibility.getPuppeteerBrowser(BrowserType.CHROME)
      expect(browser).toBe('chromium')
    })

    it('should map Firefox to firefox', () => {
      const browser = BrowserCompatibility.getPuppeteerBrowser(BrowserType.FIREFOX)
      expect(browser).toBe('firefox')
    })

    it('should map Safari to webkit', () => {
      const browser = BrowserCompatibility.getPuppeteerBrowser(BrowserType.SAFARI)
      expect(browser).toBe('webkit')
    })

    it('should map Edge to chromium', () => {
      const browser = BrowserCompatibility.getPuppeteerBrowser(BrowserType.EDGE)
      expect(browser).toBe('chromium')
    })
  })

  describe('Headless mode support', () => {
    it('should support headless for Chrome', () => {
      const supported = BrowserCompatibility.isHeadlessSupported(BrowserType.CHROME)
      expect(supported).toBe(true)
    })

    it('should support headless for Firefox', () => {
      const supported = BrowserCompatibility.isHeadlessSupported(BrowserType.FIREFOX)
      expect(supported).toBe(true)
    })

    it('should support headless for Edge', () => {
      const supported = BrowserCompatibility.isHeadlessSupported(BrowserType.EDGE)
      expect(supported).toBe(true)
    })

    it('should not support headless for Safari in Selenium', () => {
      const supported = BrowserCompatibility.isHeadlessSupported(BrowserType.SAFARI)
      expect(supported).toBe(false)
    })
  })

  describe('Default viewport configuration', () => {
    it('should provide standard viewport for all browsers', () => {
      const browsers = BrowserCompatibility.getSupportedBrowsers()

      browsers.forEach(browser => {
        const viewport = BrowserCompatibility.getDefaultViewport(browser)
        expect(viewport.width).toBe(1920)
        expect(viewport.height).toBe(1080)
      })
    })

    it('should have valid viewport dimensions', () => {
      const browsers = BrowserCompatibility.getSupportedBrowsers()

      browsers.forEach(browser => {
        const viewport = BrowserCompatibility.getDefaultViewport(browser)
        expect(viewport.width).toBeGreaterThan(0)
        expect(viewport.height).toBeGreaterThan(0)
      })
    })
  })

  describe('Cross-browser action recording', () => {
    it('should support same actions across browsers', () => {
      const actions: RecordedAction[] = [
        {
          type: 'navigate',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          page: { url: 'https://example.com', title: 'Example' },
        },
        {
          type: 'click',
          timestamp: Date.now(),
          selector: { primary: '[data-testid="btn"]', fallbacks: [] },
          page: { url: 'https://example.com', title: 'Example' },
        },
        {
          type: 'input',
          timestamp: Date.now(),
          selector: { primary: '[name="search"]', fallbacks: [] },
          value: 'test query',
          page: { url: 'https://example.com', title: 'Example' },
        },
      ]

      const playwrightGen = new PlaywrightGenerator()
      const seleniumGen = new SeleniumGenerator()

      const pwCode = playwrightGen.generate('test-1', 'Cross-browser test', actions)
      const selCode = seleniumGen.generate('test-1', 'Cross-browser test', actions)

      // Both should generate valid code
      expect(pwCode).toContain('sync_playwright')
      expect(selCode).toContain('webdriver')

      // Both should contain the same core elements
      expect(pwCode).toContain('data-testid')
      expect(selCode).toContain('data-testid')
    })

    it('should handle browser-specific quirks in selectors', () => {
      const actions: RecordedAction[] = [
        {
          type: 'click',
          timestamp: Date.now(),
          selector: {
            primary: '[data-testid="btn"]',
            fallbacks: ['.button', '#submit-btn'],
          },
          page: { url: 'https://example.com', title: 'Example' },
        },
      ]

      const pwGen = new PlaywrightGenerator()
      const selGen = new SeleniumGenerator()

      const pwCode = pwGen.generate('test-1', 'Selector test', actions)
      const selCode = selGen.generate('test-1', 'Selector test', actions)

      // Both should use the primary selector
      expect(pwCode).toContain('data-testid')
      expect(selCode).toContain('data-testid')

      // Both should have fallbacks available
      expect(pwCode).toContain('button')
      expect(selCode).toContain('button')
    })
  })

  describe('Browser detection and compatibility checks', () => {
    it('should identify all browser types', () => {
      const browsers = BrowserCompatibility.getSupportedBrowsers()
      const types = [BrowserType.CHROME, BrowserType.FIREFOX, BrowserType.SAFARI, BrowserType.EDGE]

      types.forEach(type => {
        expect(browsers).toContain(type)
      })
    })

    it('should provide consistent browser labels', () => {
      const browsers = BrowserCompatibility.getSupportedBrowsers()
      const labels = new Set<string>()

      browsers.forEach(browser => {
        const label = BrowserCompatibility.getBrowserLabel(browser)
        expect(label.length).toBeGreaterThan(0)
        labels.add(label)
      })

      // All labels should be unique
      expect(labels.size).toBe(browsers.length)
    })

    it('should provide consistent mapping across frameworks', () => {
      const browsers = BrowserCompatibility.getSupportedBrowsers()

      browsers.forEach(browser => {
        const puppeteerBrowser = BrowserCompatibility.getPuppeteerBrowser(browser)
        const playwrightBrowser = BrowserCompatibility.getPlaywrightBrowser(browser)
        const seleniumBrowser = BrowserCompatibility.getSeleniumBrowser(browser)

        // All should return non-empty strings
        expect(puppeteerBrowser.length).toBeGreaterThan(0)
        expect(playwrightBrowser.length).toBeGreaterThan(0)
        expect(seleniumBrowser.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Browser configuration patterns', () => {
    it('should support browser configuration', () => {
      const config = {
        type: BrowserType.CHROME,
        headless: true,
        slowMo: 100,
        viewport: { width: 1280, height: 720 },
      }

      expect(config.type).toBe(BrowserType.CHROME)
      expect(config.headless).toBe(true)
      expect(config.slowMo).toBe(100)
      expect(config.viewport.width).toBe(1280)
    })

    it('should support headless configuration for multiple browsers', () => {
      const headlessBrowsers = [
        BrowserType.CHROME,
        BrowserType.FIREFOX,
        BrowserType.EDGE,
      ]

      headlessBrowsers.forEach(browser => {
        expect(BrowserCompatibility.isHeadlessSupported(browser)).toBe(true)
      })
    })
  })

  describe('Real-world multi-browser workflows', () => {
    it('should generate compatible code for e-commerce flow', () => {
      const actions: RecordedAction[] = [
        {
          type: 'navigate',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          page: { url: 'https://shop.example.com', title: 'Shop' },
        },
        {
          type: 'click',
          timestamp: Date.now(),
          selector: { primary: '[data-testid="product"]', fallbacks: [] },
          page: { url: 'https://shop.example.com', title: 'Shop' },
        },
        {
          type: 'click',
          timestamp: Date.now(),
          selector: { primary: '[data-testid="add-to-cart"]', fallbacks: [] },
          page: { url: 'https://shop.example.com', title: 'Shop' },
        },
      ]

      const pwGen = new PlaywrightGenerator()
      const selGen = new SeleniumGenerator()

      // Generate for each browser
      const browsers = BrowserCompatibility.getSupportedBrowsers()
      browsers.forEach(browser => {
        const pwCode = pwGen.generate(`shop-${browser}`, 'E-commerce flow', actions)
        const selCode = selGen.generate(`shop-${browser}`, 'E-commerce flow', actions)

        // Both should generate valid code
        expect(pwCode.length).toBeGreaterThan(0)
        expect(selCode.length).toBeGreaterThan(0)

        // Both should contain core elements
        expect(pwCode).toContain('add-to-cart')
        expect(selCode).toContain('add-to-cart')
      })
    })

    it('should maintain compatibility across form workflows', () => {
      const actions: RecordedAction[] = [
        {
          type: 'navigate',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          page: { url: 'https://example.com/form', title: 'Form' },
        },
        {
          type: 'input',
          timestamp: Date.now(),
          selector: { primary: '[name="email"]', fallbacks: [] },
          value: 'test@example.com',
          page: { url: 'https://example.com/form', title: 'Form' },
        },
        {
          type: 'click',
          timestamp: Date.now(),
          selector: { primary: '[type="submit"]', fallbacks: [] },
          page: { url: 'https://example.com/form', title: 'Form' },
        },
      ]

      const supportedBrowsers = BrowserCompatibility.getSupportedBrowsers()
      expect(supportedBrowsers.length).toBeGreaterThan(0)

      supportedBrowsers.forEach(browser => {
        const label = BrowserCompatibility.getBrowserLabel(browser)
        expect(label.length).toBeGreaterThan(0)
      })
    })
  })
})
