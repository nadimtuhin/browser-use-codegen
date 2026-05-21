import { ActionEnhancer } from '../lib/ActionEnhancer'
import { RecordedAction } from '../types'

describe('ActionEnhancer Integration Tests', () => {
  let enhancer: ActionEnhancer

  beforeEach(() => {
    enhancer = new ActionEnhancer()
  })

  describe('Single action enhancement', () => {
    it('should enhance click action with fallback chain', () => {
      const action: RecordedAction = {
        type: 'click',
        timestamp: Date.now(),
        selector: { primary: '[data-testid="submit"]', fallbacks: [] },
        page: { url: 'https://example.com', title: 'Example' },
      }

      const enhanced = enhancer.enhanceAction(action)

      expect(enhanced.selector.primary).toBe('[data-testid="submit"]')
      expect(enhanced.selector.fallbacks.length).toBeGreaterThan(0)
    })

    it('should add XPath alternatives', () => {
      const action: RecordedAction = {
        type: 'click',
        timestamp: Date.now(),
        selector: { primary: '[data-testid="button"]', fallbacks: [] },
        page: { url: 'https://example.com', title: 'Example' },
      }

      const enhanced = enhancer.enhanceAction(action)

      expect(enhanced.selector.xpaths).toBeDefined()
      expect(enhanced.selector.xpaths?.length ?? 0).toBeGreaterThan(0)
    })

    it('should preserve original selector as primary', () => {
      const action: RecordedAction = {
        type: 'input',
        timestamp: Date.now(),
        selector: { primary: '#email-input', fallbacks: [] },
        value: 'test@example.com',
        page: { url: 'https://example.com', title: 'Example' },
      }

      const enhanced = enhancer.enhanceAction(action)

      expect(enhanced.selector.primary).toBe('#email-input')
    })

    it('should enhance click on button selector', () => {
      const action: RecordedAction = {
        type: 'click',
        timestamp: Date.now(),
        selector: { primary: 'button.submit', fallbacks: [] },
        page: { url: 'https://example.com', title: 'Example' },
      }

      const enhanced = enhancer.enhanceAction(action)

      expect(enhanced.selector.primary).toBe('button.submit')
      expect(enhanced.selector.fallbacks.length).toBeGreaterThan(0)
    })
  })

  describe('Multiple action enhancement', () => {
    it('should enhance array of actions', () => {
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
          selector: { primary: '[data-testid="login"]', fallbacks: [] },
          page: { url: 'https://example.com', title: 'Example' },
        },
        {
          type: 'input',
          timestamp: Date.now(),
          selector: { primary: '[name="email"]', fallbacks: [] },
          value: 'test@example.com',
          page: { url: 'https://example.com', title: 'Example' },
        },
      ]

      const enhanced = enhancer.enhanceActions(actions)

      expect(enhanced).toHaveLength(actions.length)
      expect(enhanced[0].selector.fallbacks).toHaveLength(0) // navigate unchanged
      expect(enhanced[1].selector.fallbacks.length).toBeGreaterThan(0) // click enhanced
      expect(enhanced[2].selector.fallbacks.length).toBeGreaterThan(0) // input enhanced
    })

    it('should skip enhancement for navigate actions', () => {
      const actions: RecordedAction[] = [
        {
          type: 'navigate',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          page: { url: 'https://example.com', title: 'Example' },
        },
      ]

      const enhanced = enhancer.enhanceActions(actions)

      expect(enhanced[0].selector.fallbacks).toHaveLength(0)
    })

    it('should skip enhancement for wait actions', () => {
      const actions: RecordedAction[] = [
        {
          type: 'wait',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          value: '1000',
          page: { url: 'https://example.com', title: 'Example' },
        },
      ]

      const enhanced = enhancer.enhanceActions(actions)

      expect(enhanced[0].selector.fallbacks).toHaveLength(0)
    })
  })

  describe('Best selector selection', () => {
    it('should return primary selector when no fallbacks exist', () => {
      const action: RecordedAction = {
        type: 'click',
        timestamp: Date.now(),
        selector: { primary: '[data-testid="btn"]', fallbacks: [] },
        page: { url: 'https://example.com', title: 'Example' },
      }

      const best = enhancer.getBestSelector(action)

      expect(best).toBe('[data-testid="btn"]')
    })

    it('should prefer data-testid over classes', () => {
      const action: RecordedAction = {
        type: 'click',
        timestamp: Date.now(),
        selector: {
          primary: '[data-testid="submit"]',
          fallbacks: ['.btn', '.btn-primary'],
        },
        page: { url: 'https://example.com', title: 'Example' },
      }

      const best = enhancer.getBestSelector(action)

      expect(best).toContain('data-testid')
    })

    it('should prefer ID over other selectors', () => {
      const action: RecordedAction = {
        type: 'click',
        timestamp: Date.now(),
        selector: {
          primary: 'button',
          fallbacks: ['#submit', '.submit-btn'],
        },
        page: { url: 'https://example.com', title: 'Example' },
      }

      const best = enhancer.getBestSelector(action)

      expect(best).toBe('#submit')
    })
  })

  describe('Ranked selector retrieval', () => {
    it('should return selectors ranked by performance', () => {
      const action: RecordedAction = {
        type: 'click',
        timestamp: Date.now(),
        selector: {
          primary: 'button',
          fallbacks: ['.btn', '#submit', '[data-testid="btn"]'],
        },
        page: { url: 'https://example.com', title: 'Example' },
      }

      const ranked = enhancer.getRankedSelectors(action)

      expect(ranked.length).toBeGreaterThan(0)
      expect(ranked[0]).toBe('[data-testid="btn"]')
    })

    it('should order ranked selectors from best to worst', () => {
      const action: RecordedAction = {
        type: 'click',
        timestamp: Date.now(),
        selector: {
          primary: 'div > button:nth-child(3)',
          fallbacks: ['.btn', '#submit'],
        },
        page: { url: 'https://example.com', title: 'Example' },
      }

      const ranked = enhancer.getRankedSelectors(action)

      // ID should come before class
      const idIndex = ranked.findIndex(s => s.startsWith('#'))
      const classIndex = ranked.findIndex(s => s.startsWith('.'))

      expect(idIndex).toBeLessThan(classIndex)
    })
  })

  describe('Selector validation', () => {
    it('should validate valid CSS selectors', () => {
      const action: RecordedAction = {
        type: 'click',
        timestamp: Date.now(),
        selector: {
          primary: '[data-testid="button"]',
          fallbacks: ['.btn', '#submit'],
        },
        page: { url: 'https://example.com', title: 'Example' },
      }

      const result = enhancer.validateSelectors(action)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect invalid CSS selectors', () => {
      const action: RecordedAction = {
        type: 'click',
        timestamp: Date.now(),
        selector: {
          primary: '[]invalid',
          fallbacks: [],
        },
        page: { url: 'https://example.com', title: 'Example' },
      }

      const result = enhancer.validateSelectors(action)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should validate XPath selectors', () => {
      const action: RecordedAction = {
        type: 'click',
        timestamp: Date.now(),
        selector: {
          primary: '//button[@id="submit"]',
          fallbacks: [],
        },
        page: { url: 'https://example.com', title: 'Example' },
      }

      const result = enhancer.validateSelectors(action)

      expect(result.valid).toBe(true)
    })

    it('should detect invalid XPath selectors', () => {
      const action: RecordedAction = {
        type: 'click',
        timestamp: Date.now(),
        selector: {
          primary: '//[invalid',
          fallbacks: [],
        },
        page: { url: 'https://example.com', title: 'Example' },
      }

      const result = enhancer.validateSelectors(action)

      expect(result.valid).toBe(false)
    })
  })

  describe('Selector normalization', () => {
    it('should normalize selector spacing', () => {
      const action: RecordedAction = {
        type: 'click',
        timestamp: Date.now(),
        selector: {
          primary: '[ data-testid  =  "btn"  ]',
          fallbacks: [],
        },
        page: { url: 'https://example.com', title: 'Example' },
      }

      const normalized = enhancer.normalizeSelectors(action)

      expect(normalized.selector.primary).not.toContain('  ')
    })

    it('should normalize all fallback selectors', () => {
      const action: RecordedAction = {
        type: 'click',
        timestamp: Date.now(),
        selector: {
          primary: '[data-testid="btn"]',
          fallbacks: ['.btn   .primary', '  #submit  '],
        },
        page: { url: 'https://example.com', title: 'Example' },
      }

      const normalized = enhancer.normalizeSelectors(action)

      normalized.selector.fallbacks.forEach(fb => {
        expect(fb).not.toContain('  ')
      })
    })

    it('should normalize XPath selectors', () => {
      const action: RecordedAction = {
        type: 'click',
        timestamp: Date.now(),
        selector: {
          primary: '[data-testid="btn"]',
          fallbacks: [],
          xpaths: ['//button[  @id="submit"  ]'],
        },
        page: { url: 'https://example.com', title: 'Example' },
      }

      const normalized = enhancer.normalizeSelectors(action)

      normalized.selector.xpaths?.forEach(xpath => {
        expect(xpath).not.toContain('  ')
      })
    })
  })

  describe('Integration with generators', () => {
    it('should enhance actions before passing to PlaywrightGenerator', () => {
      const action: RecordedAction = {
        type: 'click',
        timestamp: Date.now(),
        selector: { primary: '[data-testid="btn"]', fallbacks: [] },
        page: { url: 'https://example.com', title: 'Example' },
      }

      const enhanced = enhancer.enhanceAction(action)

      expect(enhanced.selector.fallbacks.length).toBeGreaterThan(0)
      // Generator would then have more fallback options available
    })

    it('should work with complex multi-action workflows', () => {
      const actions: RecordedAction[] = [
        {
          type: 'navigate',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          page: { url: 'https://form.example.com', title: 'Form' },
        },
        {
          type: 'click',
          timestamp: Date.now(),
          selector: { primary: '[data-testid="email-field"]', fallbacks: [] },
          page: { url: 'https://form.example.com', title: 'Form' },
        },
        {
          type: 'input',
          timestamp: Date.now(),
          selector: { primary: '[name="email"]', fallbacks: [] },
          value: 'user@example.com',
          page: { url: 'https://form.example.com', title: 'Form' },
        },
        {
          type: 'click',
          timestamp: Date.now(),
          selector: { primary: '#submit-btn', fallbacks: [] },
          page: { url: 'https://form.example.com', title: 'Form' },
        },
      ]

      const enhanced = enhancer.enhanceActions(actions)

      // Navigate action unchanged
      expect(enhanced[0].selector.fallbacks).toHaveLength(0)

      // Other actions enhanced with fallbacks
      expect(enhanced[1].selector.fallbacks.length).toBeGreaterThan(0)
      expect(enhanced[2].selector.fallbacks.length).toBeGreaterThan(0)
      expect(enhanced[3].selector.fallbacks.length).toBeGreaterThan(0)
    })
  })

  describe('Real-world scenarios', () => {
    it('should enhance e-commerce checkout flow', () => {
      const actions: RecordedAction[] = [
        {
          type: 'click',
          timestamp: Date.now(),
          selector: { primary: '[data-testid="add-to-cart"]', fallbacks: [] },
          page: { url: 'https://shop.example.com/product', title: 'Product' },
        },
        {
          type: 'click',
          timestamp: Date.now(),
          selector: { primary: '[aria-label="Checkout"]', fallbacks: [] },
          page: { url: 'https://shop.example.com/cart', title: 'Cart' },
        },
        {
          type: 'input',
          timestamp: Date.now(),
          selector: { primary: '[name="credit-card"]', fallbacks: [] },
          value: '4111111111111111',
          page: { url: 'https://shop.example.com/checkout', title: 'Checkout' },
        },
      ]

      const enhanced = enhancer.enhanceActions(actions)

      enhanced.forEach(action => {
        if (action.type !== 'navigate' && action.type !== 'wait') {
          expect(action.selector.fallbacks.length).toBeGreaterThan(0)
        }
      })
    })

    it('should enhance accessibility-first selectors', () => {
      const action: RecordedAction = {
        type: 'click',
        timestamp: Date.now(),
        selector: {
          primary: '[aria-label="Close dialog"]',
          fallbacks: [],
        },
        page: { url: 'https://example.com', title: 'Example' },
      }

      const enhanced = enhancer.enhanceAction(action)

      expect(enhanced.selector.fallbacks.length).toBeGreaterThan(0)
    })
  })
})
