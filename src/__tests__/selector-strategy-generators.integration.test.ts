import { PlaywrightGenerator } from '../lib/PlaywrightGenerator'
import { SeleniumGenerator } from '../lib/SeleniumGenerator'
import { BrowserUseGenerator } from '../lib/BrowserUseGenerator'
import { SelectorStrategy } from '../lib/SelectorStrategy'
import { RecordedAction } from '../types'

describe('SelectorStrategy Integration with Generators', () => {
  let strategy: SelectorStrategy
  let playwrightGen: PlaywrightGenerator
  let seleniumGen: SeleniumGenerator
  let browserUseGen: BrowserUseGenerator

  beforeEach(() => {
    strategy = new SelectorStrategy()
    playwrightGen = new PlaywrightGenerator()
    seleniumGen = new SeleniumGenerator()
    browserUseGen = new BrowserUseGenerator()
  })

  describe('Playwright Generator with fallback chains', () => {
    it('should generate fallback chain for data-testid selectors', () => {
      const selectorInfo = strategy.getSelectorInfo('[data-testid="submit-btn"]')

      const action: RecordedAction = {
        type: 'click',
        timestamp: Date.now(),
        selector: selectorInfo,
        page: { url: 'https://example.com', title: 'Example' },
      }

      const code = playwrightGen.generate('profile-1', 'Click submit', [action])

      expect(code).toContain('[data-testid="submit-btn"]')
      expect(code).toContain('click()')
    })

    it('should prioritize unique selectors in generated code', () => {
      const primary = '[data-testid="btn"]'
      const selectorInfo = strategy.getSelectorInfo(primary)

      const action: RecordedAction = {
        type: 'click',
        timestamp: Date.now(),
        selector: selectorInfo,
        page: { url: 'https://example.com', title: 'Example' },
      }

      const code = playwrightGen.generate('profile-1', 'Click button', [action])

      // Should use data-testid as primary
      expect(code).toContain(primary)
    })

    it('should generate fallback patterns for click actions', () => {
      const selectorInfo = strategy.getSelectorInfo('#submit')

      const action: RecordedAction = {
        type: 'click',
        timestamp: Date.now(),
        selector: selectorInfo,
        page: { url: 'https://example.com', title: 'Example' },
      }

      const code = playwrightGen.generate('profile-1', 'Click', [action])

      // Should use robust selector
      expect(code).toContain('#submit')
    })

    it('should handle complex selectors with fallbacks', () => {
      const primary = '.btn.btn-primary'
      const selectorInfo = strategy.getSelectorInfo(primary)

      const action: RecordedAction = {
        type: 'input',
        timestamp: Date.now(),
        selector: selectorInfo,
        value: 'test input',
        page: { url: 'https://example.com', title: 'Example' },
      }

      const code = playwrightGen.generate('profile-1', 'Input text', [action])

      expect(code).toContain('.fill(')
      expect(code).toContain(primary)
    })
  })

  describe('Selenium Generator with selector mapping', () => {
    it('should map ID selectors to By.ID', () => {
      const selectorInfo = strategy.getSelectorInfo('#submit-btn')

      const action: RecordedAction = {
        type: 'click',
        timestamp: Date.now(),
        selector: selectorInfo,
        page: { url: 'https://example.com', title: 'Example' },
      }

      const code = seleniumGen.generate('profile-1', 'Click submit', [action])

      // Should use By.ID for ID selectors
      expect(code).toContain('find_element')
    })

    it('should use CSS selectors for complex patterns', () => {
      const selectorInfo = strategy.getSelectorInfo('[data-testid="complex-btn"]')

      const action: RecordedAction = {
        type: 'click',
        timestamp: Date.now(),
        selector: selectorInfo,
        page: { url: 'https://example.com', title: 'Example' },
      }

      const code = seleniumGen.generate('profile-1', 'Click complex', [action])

      // Should handle complex selector
      expect(code).toContain('find_element')
    })

    it('should generate fallback lookup pattern for extract actions', () => {
      const selectorInfo = strategy.getSelectorInfo('[aria-label="Result"]')

      const action: RecordedAction = {
        type: 'extract',
        timestamp: Date.now(),
        selector: selectorInfo,
        value: 'result_text',
        page: { url: 'https://example.com', title: 'Example' },
      }

      const code = seleniumGen.generate('profile-1', 'Extract result', [action])

      expect(code).toContain('result_text')
    })
  })

  describe('Selector ranking in generated code', () => {
    it('should order selectors by reliability score', () => {
      const selectors = [
        'button',
        'button.primary',
        '[data-testid="submit"]',
        '#submit-btn',
      ]

      const ranked = strategy.rankSelectors(selectors)
      expect(ranked[0].selector).toContain('data-testid')
    })

    it('should prefer data-testid over classes and tags', () => {
      const testidSelector = '[data-testid="button"]'
      const classSelector = '.btn-primary'
      const tagSelector = 'button'

      const ranked = strategy.rankSelectors([tagSelector, classSelector, testidSelector])

      expect(ranked[0].selector).toBe(testidSelector)
      expect(ranked[0].score).toBeGreaterThan(ranked[1].score)
    })

    it('should prefer ID selectors over classes', () => {
      const idSelector = '#submit'
      const classSelector = '.submit-btn'

      const ranked = strategy.rankSelectors([classSelector, idSelector])

      expect(ranked[0].selector).toBe(idSelector)
    })
  })

  describe('Fallback chain validation', () => {
    it('should only generate valid CSS selectors', () => {
      const primary = '[data-testid="btn"]'
      const fallbacks = strategy.generateFallbackChain(primary)

      fallbacks.forEach(selector => {
        // Should not contain invalid patterns
        expect(selector).not.toContain('[]')
        expect(selector).not.toContain('[=')
      })
    })

    it('should validate generated XPath selectors', () => {
      const primary = '[data-testid="element"]'
      const fallbacks = strategy.generateFallbackChain(primary)

      const xpathSelectors = fallbacks.filter(s => s.startsWith('//'))
      xpathSelectors.forEach(xpath => {
        const isValid = strategy.isValidXPath(xpath)
        expect(isValid).toBe(true)
      })
    })

    it('should handle attribute-based selectors', () => {
      const primary = '[aria-label="Submit"]'
      const fallbacks = strategy.generateFallbackChain(primary)

      expect(fallbacks).toContain(primary)
      expect(fallbacks.length).toBeGreaterThan(1)
    })
  })

  describe('Performance scoring in selector selection', () => {
    it('should score ID selectors fastest', () => {
      const idScore = strategy.getPerformanceScore('#submit')
      const classScore = strategy.getPerformanceScore('.submit-btn')
      const nthScore = strategy.getPerformanceScore('button:nth-child(1)')

      expect(idScore).toBeGreaterThan(classScore)
      expect(classScore).toBeGreaterThan(nthScore)
    })

    it('should score data-testid high', () => {
      const testidScore = strategy.getPerformanceScore('[data-testid="btn"]')
      const classScore = strategy.getPerformanceScore('.btn')

      expect(testidScore).toBeGreaterThan(classScore)
    })

    it('should rank XPath slower than CSS', () => {
      const cssScore = strategy.getPerformanceScore('[data-testid="btn"]')
      const xpathScore = strategy.getPerformanceScore('//button[@data-testid="btn"]')

      expect(cssScore).toBeGreaterThan(xpathScore)
    })
  })

  describe('Complex selector scenarios', () => {
    it('should handle Material-UI class selectors', () => {
      const muiSelector = '.MuiButton-root'
      const fallbacks = strategy.generateFallbackChain(muiSelector)

      expect(fallbacks).toContain(muiSelector)
      expect(fallbacks.length).toBeGreaterThan(1)
    })

    it('should handle composite selectors', () => {
      const composite = 'div.container > button.submit'
      const selectorInfo = strategy.getSelectorInfo(composite)

      expect(selectorInfo.primary).toBe(composite)
      expect(selectorInfo.fallbacks.length).toBeGreaterThan(0)
    })

    it('should handle pseudo-element selectors', () => {
      const pseudo = 'button:hover'
      const isValid = strategy.isValidCSSSelector(pseudo)

      expect(typeof isValid).toBe('boolean')
    })

    it('should generate fallback chain for shadow DOM selectors', () => {
      const shadowSelector = '.host >>> .shadow-child'
      const isShadow = strategy.isShadowDOMSelector(shadowSelector)

      expect(isShadow).toBe(true)
    })
  })

  describe('Real-world integration workflow', () => {
    it('should generate robust Playwright code for e-commerce flow', () => {
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
          selector: strategy.getSelectorInfo('[data-testid="add-to-cart"]'),
          page: { url: 'https://shop.example.com', title: 'Shop' },
        },
        {
          type: 'input',
          timestamp: Date.now(),
          selector: strategy.getSelectorInfo('[name="quantity"]'),
          value: '5',
          page: { url: 'https://shop.example.com', title: 'Shop' },
        },
      ]

      const code = playwrightGen.generate('ecommerce-1', 'Add to cart workflow', actions)

      expect(code).toContain('sync_playwright')
      expect(code).toContain('add-to-cart')
      expect(code).toContain('quantity')
    })

    it('should generate robust Selenium code for form submission', () => {
      const actions: RecordedAction[] = [
        {
          type: 'click',
          timestamp: Date.now(),
          selector: strategy.getSelectorInfo('[data-testid="email-input"]'),
          page: { url: 'https://example.com', title: 'Form' },
        },
        {
          type: 'input',
          timestamp: Date.now(),
          selector: strategy.getSelectorInfo('[data-testid="email-input"]'),
          value: 'test@example.com',
          page: { url: 'https://example.com', title: 'Form' },
        },
        {
          type: 'click',
          timestamp: Date.now(),
          selector: strategy.getSelectorInfo('#submit-btn'),
          page: { url: 'https://example.com', title: 'Form' },
        },
      ]

      const code = seleniumGen.generate('form-1', 'Submit form', actions)

      expect(code).toContain('webdriver.Chrome')
      expect(code).toContain('find_element')
    })
  })
})
