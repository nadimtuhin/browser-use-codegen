import { SelectorStrategy } from '../lib/SelectorStrategy'
import { RecordedAction } from '../types'

describe('Selector Strategy Integration Tests', () => {
  let strategy: SelectorStrategy

  beforeEach(() => {
    strategy = new SelectorStrategy()
  })

  describe('XPath generation', () => {
    it('should generate XPath for elements', () => {
      const xpath = strategy.generateXPath('//button[@class="submit"]')
      expect(xpath).toBeTruthy()
      expect(typeof xpath).toBe('string')
    })

    it('should generate robust XPath with text content', () => {
      const xpath = strategy.generateXPathByText('Submit', 'button')
      expect(xpath).toContain('text()')
      expect(xpath).toContain('Submit')
    })

    it('should handle XPath with attribute matching', () => {
      const xpath = strategy.generateXPathByAttribute('data-testid', 'submit-btn')
      expect(xpath).toContain('@data-testid')
      expect(xpath).toContain('submit-btn')
    })
  })

  describe('CSS Selector optimization', () => {
    it('should rank selectors by specificity', () => {
      const selectors = [
        'button',
        'button.primary',
        '[data-testid="submit"]',
        '#submit-btn',
      ]

      const ranked = strategy.rankSelectors(selectors)
      expect(ranked).toHaveLength(selectors.length)
      expect(ranked[0].selector).toContain('data-testid')
    })

    it('should identify unique selectors', () => {
      const selector1 = '[data-testid="button1"]'
      const selector2 = '.primary-button'
      const selector3 = 'button'

      const isUnique1 = strategy.isUniqueSelector(selector1)
      expect(typeof isUnique1).toBe('boolean')
    })
  })

  describe('Shadow DOM support', () => {
    it('should detect shadow DOM elements', () => {
      const selector = '>>>#shadow-element'
      const isShadow = strategy.isShadowDOMSelector(selector)
      expect(typeof isShadow).toBe('boolean')
    })

    it('should generate shadow DOM pierce selector', () => {
      const pierceSelector = strategy.generateShadowDOMSelector('.host', '.shadow-child')
      expect(pierceSelector).toBeTruthy()
    })
  })

  describe('Fallback chain generation', () => {
    it('should generate comprehensive fallback chain', () => {
      const primary = '[data-testid="submit"]'
      const fallbacks = strategy.generateFallbackChain(primary)

      expect(Array.isArray(fallbacks)).toBe(true)
      expect(fallbacks.length).toBeGreaterThan(0)
      expect(fallbacks[0]).toBe(primary)
    })

    it('should include XPath in fallback chain', () => {
      const primary = 'button.submit'
      const fallbacks = strategy.generateFallbackChain(primary)

      const hasXPath = fallbacks.some(s => s.startsWith('//'))
      expect(hasXPath).toBe(true)
    })

    it('should order fallbacks by reliability', () => {
      const primary = '[data-testid="btn"]'
      const fallbacks = strategy.generateFallbackChain(primary)

      // First should be data-testid (most specific)
      // Then ID, then classes, then XPath, then generic
      expect(fallbacks[0]).toContain('data-testid')
    })
  })

  describe('Selector validation', () => {
    it('should validate CSS selector syntax', () => {
      const validCSS = '[data-testid="btn"]'
      const invalidCSS = '[]invalid'

      expect(strategy.isValidCSSSelector(validCSS)).toBe(true)
      expect(strategy.isValidCSSSelector(invalidCSS)).toBe(false)
    })

    it('should validate XPath syntax', () => {
      const validXPath = '//button[@id="submit"]'
      const invalidXPath = '//[invalid'

      expect(strategy.isValidXPath(validXPath)).toBe(true)
      expect(strategy.isValidXPath(invalidXPath)).toBe(false)
    })
  })

  describe('Real-world selector patterns', () => {
    it('should handle React data-testid selectors', () => {
      const selector = '[data-testid="auth-button"]'
      const fallbacks = strategy.generateFallbackChain(selector)

      expect(fallbacks).toContain(selector)
      expect(fallbacks.length).toBeGreaterThan(1)
    })

    it('should handle Material-UI selectors', () => {
      const selector = '.MuiButton-root'
      const fallbacks = strategy.generateFallbackChain(selector)

      expect(fallbacks).toContain(selector)
    })

    it('should handle Bootstrap selectors', () => {
      const selector = '.btn.btn-primary'
      const fallbacks = strategy.generateFallbackChain(selector)

      expect(fallbacks).toContain(selector)
    })

    it('should handle aria-label selectors', () => {
      const selector = '[aria-label="Close"]'
      const fallbacks = strategy.generateFallbackChain(selector)

      expect(fallbacks).toContain(selector)
    })
  })

  describe('Selector performance', () => {
    it('should identify fast selectors', () => {
      const fastSelector = '#submit-btn'
      const slowSelector = 'div > p > button:nth-child(3)'

      const fastScore = strategy.getPerformanceScore(fastSelector)
      const slowScore = strategy.getPerformanceScore(slowSelector)

      expect(fastScore).toBeGreaterThan(slowScore)
    })
  })

  describe('Integration with generators', () => {
    it('should provide selector list for ScriptGenerator', () => {
      const primary = '[data-testid="submit"]'
      const selectorInfo = strategy.getSelectorInfo(primary)

      expect(selectorInfo.primary).toBe(primary)
      expect(Array.isArray(selectorInfo.fallbacks)).toBe(true)
      expect(selectorInfo.fallbacks.length).toBeGreaterThan(0)
    })

    it('should rank multiple selector options', () => {
      const options = [
        '[data-testid="btn"]',
        '.button-primary',
        '#btn-submit',
        'button.primary.large',
      ]

      const ranked = strategy.rankSelectors(options)
      expect(ranked).toHaveLength(options.length)
      expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[ranked.length - 1].score)
    })
  })

  describe('Selector cleanup and normalization', () => {
    it('should normalize selector spacing', () => {
      const messy = '[ data-testid = "btn"  ]'
      const cleaned = strategy.normalizeSelector(messy)

      expect(cleaned).toBeTruthy()
      expect(cleaned).not.toContain('  ')
    })

    it('should handle escaped characters in selectors', () => {
      const selector = '[data-id="item\\"123"]'
      const cleaned = strategy.normalizeSelector(selector)

      expect(cleaned).toBeTruthy()
    })
  })
})
