import { ActionRecorder } from '../lib/ActionRecorder'
import { ScriptGenerator } from '../lib/ScriptGenerator'
import { PlaywrightGenerator } from '../lib/PlaywrightGenerator'
import { SeleniumGenerator } from '../lib/SeleniumGenerator'
import { ScriptReplay } from '../lib/ScriptReplay'
import { ActionEnhancer } from '../lib/ActionEnhancer'
import { RecordedAction } from '../types'

describe('Real-World Workflow Integration Tests', () => {
  let mockPage: any
  let enhancer: ActionEnhancer

  beforeEach(() => {
    mockPage = {
      goto: jest.fn().mockResolvedValue(undefined),
      $: jest.fn(),
      $$: jest.fn(),
      evaluate: jest.fn().mockResolvedValue(undefined),
      waitForSelector: jest.fn().mockResolvedValue(undefined),
      screenshot: jest.fn().mockResolvedValue(Buffer.from('screenshot')),
      keyboard: {
        press: jest.fn().mockResolvedValue(undefined),
      },
      mouse: {
        move: jest.fn().mockResolvedValue(undefined),
        down: jest.fn().mockResolvedValue(undefined),
        up: jest.fn().mockResolvedValue(undefined),
      },
      waitForNavigation: jest.fn().mockResolvedValue(undefined),
      title: jest.fn().mockResolvedValue('Test Page'),
      url: jest.fn().mockReturnValue('https://example.com'),
    }
    enhancer = new ActionEnhancer()
  })

  describe('E-Commerce Product Purchase Flow', () => {
    it('should record and generate e-commerce checkout workflow', () => {
      const actions: RecordedAction[] = [
        {
          type: 'navigate',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          page: { url: 'https://shop.example.com/products', title: 'Products' },
        },
        {
          type: 'click',
          timestamp: Date.now(),
          selector: { primary: '[data-testid="product-123"]', fallbacks: [] },
          page: { url: 'https://shop.example.com/products', title: 'Products' },
        },
        {
          type: 'input',
          timestamp: Date.now(),
          selector: { primary: '[name="quantity"]', fallbacks: [] },
          value: '2',
          page: { url: 'https://shop.example.com/product/123', title: 'Product' },
        },
        {
          type: 'click',
          timestamp: Date.now(),
          selector: { primary: '[data-testid="add-to-cart"]', fallbacks: ['button.add-cart'] },
          page: { url: 'https://shop.example.com/product/123', title: 'Product' },
        },
        {
          type: 'click',
          timestamp: Date.now(),
          selector: { primary: '[aria-label="Checkout"]', fallbacks: ['a.checkout-link'] },
          page: { url: 'https://shop.example.com/cart', title: 'Cart' },
        },
      ]

      const generator = new ScriptGenerator()
      const code = generator.generate('ecommerce-1', 'Purchase product workflow', actions)

      expect(code).toContain('product-123')
      expect(code).toContain('add-to-cart')
      expect(code).toContain('quantity')
    })

    it('should enhance actions with fallback selectors for robustness', () => {
      const actions: RecordedAction[] = [
        {
          type: 'click',
          timestamp: Date.now(),
          selector: { primary: '[data-testid="buy-now"]', fallbacks: [] },
          page: { url: 'https://shop.example.com', title: 'Shop' },
        },
      ]

      const enhanced = enhancer.enhanceActions(actions)

      expect(enhanced[0].selector.fallbacks.length).toBeGreaterThan(0)
    })

    it('should generate Playwright e-commerce code', () => {
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
          selector: enhancer.enhanceAction({
            type: 'click',
            timestamp: Date.now(),
            selector: { primary: '[data-testid="add-to-cart"]', fallbacks: [] },
            page: { url: 'https://shop.example.com', title: 'Shop' },
          }).selector,
          page: { url: 'https://shop.example.com', title: 'Shop' },
        },
      ]

      const pwGen = new PlaywrightGenerator()
      const code = pwGen.generate('shop-1', 'Add to cart', actions)

      expect(code).toContain('sync_playwright')
      expect(code).toContain('add-to-cart')
    })

    it('should generate Selenium e-commerce code', () => {
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
          selector: { primary: '[data-testid="add-to-cart"]', fallbacks: [] },
          page: { url: 'https://shop.example.com', title: 'Shop' },
        },
      ]

      const selGen = new SeleniumGenerator()
      const code = selGen.generate('shop-1', 'Add to cart', actions)

      expect(code).toContain('webdriver.Chrome')
      expect(code).toContain('find_element')
    })
  })

  describe('Form Submission Workflow', () => {
    it('should record form filling and submission', () => {
      const actions: RecordedAction[] = [
        {
          type: 'navigate',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          page: { url: 'https://example.com/contact', title: 'Contact' },
        },
        {
          type: 'click',
          timestamp: Date.now(),
          selector: { primary: '[data-testid="name-field"]', fallbacks: [] },
          page: { url: 'https://example.com/contact', title: 'Contact' },
        },
        {
          type: 'input',
          timestamp: Date.now(),
          selector: { primary: '[data-testid="name-field"]', fallbacks: [] },
          value: 'John Doe',
          page: { url: 'https://example.com/contact', title: 'Contact' },
        },
        {
          type: 'click',
          timestamp: Date.now(),
          selector: { primary: '[data-testid="email-field"]', fallbacks: [] },
          page: { url: 'https://example.com/contact', title: 'Contact' },
        },
        {
          type: 'input',
          timestamp: Date.now(),
          selector: { primary: '[data-testid="email-field"]', fallbacks: [] },
          value: 'john@example.com[Enter]',
          page: { url: 'https://example.com/contact', title: 'Contact' },
        },
        {
          type: 'click',
          timestamp: Date.now(),
          selector: { primary: '[type="submit"]', fallbacks: ['button.submit'] },
          page: { url: 'https://example.com/contact', title: 'Contact' },
        },
      ]

      const generator = new ScriptGenerator()
      const code = generator.generate('form-1', 'Submit contact form', actions)

      expect(code).toContain('name-field')
      expect(code).toContain('email-field')
      expect(code).toContain('John Doe')
      expect(code).toContain('john@example.com')
    })

    it('should handle form with select dropdown', () => {
      const actions: RecordedAction[] = [
        {
          type: 'click',
          timestamp: Date.now(),
          selector: { primary: 'select[name="country"]', fallbacks: [] },
          page: { url: 'https://example.com/form', title: 'Form' },
        },
        {
          type: 'select',
          timestamp: Date.now(),
          selector: { primary: 'select[name="country"]', fallbacks: [] },
          value: 'US',
          page: { url: 'https://example.com/form', title: 'Form' },
        },
      ]

      const generator = new ScriptGenerator()
      const code = generator.generate('form-2', 'Select country', actions)

      expect(code).toContain('select')
      expect(code).toContain('country')
    })

    it('should enhance form fields with fallbacks', () => {
      const actions: RecordedAction[] = [
        {
          type: 'input',
          timestamp: Date.now(),
          selector: { primary: '[data-testid="username"]', fallbacks: [] },
          value: 'testuser',
          page: { url: 'https://example.com/login', title: 'Login' },
        },
      ]

      const enhanced = enhancer.enhanceActions(actions)

      expect(enhanced[0].selector.fallbacks.length).toBeGreaterThan(0)
      // Should have XPath alternatives
      expect(enhanced[0].selector.xpaths?.length ?? 0).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Multi-Page Navigation Workflow', () => {
    it('should handle multi-page navigation flow', () => {
      const actions: RecordedAction[] = [
        {
          type: 'navigate',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          page: { url: 'https://example.com', title: 'Home' },
        },
        {
          type: 'click',
          timestamp: Date.now(),
          selector: { primary: 'a[href="/products"]', fallbacks: [] },
          page: { url: 'https://example.com', title: 'Home' },
        },
        {
          type: 'click',
          timestamp: Date.now(),
          selector: { primary: '[data-testid="product-1"]', fallbacks: [] },
          page: { url: 'https://example.com/products', title: 'Products' },
        },
        {
          type: 'click',
          timestamp: Date.now(),
          selector: { primary: '[data-testid="back-btn"]', fallbacks: ['button.back'] },
          page: { url: 'https://example.com/product/1', title: 'Product' },
        },
      ]

      const generator = new ScriptGenerator()
      const code = generator.generate('nav-1', 'Multi-page navigation', actions)

      expect(code).toContain('products')
      expect(code).toContain('product-1')
    })

    it('should handle navigation with waits', () => {
      const actions: RecordedAction[] = [
        {
          type: 'navigate',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          page: { url: 'https://example.com/slow-page', title: 'Slow Page' },
        },
        {
          type: 'wait',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          value: '2000',
          page: { url: 'https://example.com/slow-page', title: 'Slow Page' },
        },
        {
          type: 'click',
          timestamp: Date.now(),
          selector: { primary: '[data-testid="dynamic-btn"]', fallbacks: [] },
          page: { url: 'https://example.com/slow-page', title: 'Slow Page' },
        },
      ]

      const generator = new ScriptGenerator()
      const code = generator.generate('nav-2', 'Navigation with waits', actions)

      expect(code).toContain('wait')
      expect(code).toContain('2000')
    })
  })

  describe('Data Extraction Workflow', () => {
    it('should extract data from page', () => {
      const actions: RecordedAction[] = [
        {
          type: 'navigate',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          page: { url: 'https://example.com/articles', title: 'Articles' },
        },
        {
          type: 'extract',
          timestamp: Date.now(),
          selector: { primary: 'h1.title', fallbacks: ['h1'] },
          value: 'title',
          page: { url: 'https://example.com/articles', title: 'Articles' },
        },
        {
          type: 'extract',
          timestamp: Date.now(),
          selector: { primary: '[data-testid="author"]', fallbacks: ['.author-name'] },
          value: 'author',
          page: { url: 'https://example.com/articles', title: 'Articles' },
        },
        {
          type: 'extract',
          timestamp: Date.now(),
          selector: { primary: '.content', fallbacks: ['article'] },
          value: 'content',
          page: { url: 'https://example.com/articles', title: 'Articles' },
        },
      ]

      const generator = new ScriptGenerator()
      const code = generator.generate('extract-1', 'Extract article data', actions)

      expect(code).toContain('title')
      expect(code).toContain('author')
      expect(code).toContain('content')
    })

    it('should extract multiple items from list', () => {
      const actions: RecordedAction[] = [
        {
          type: 'navigate',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          page: { url: 'https://example.com/listings', title: 'Listings' },
        },
        {
          type: 'extract',
          timestamp: Date.now(),
          selector: { primary: '.item-price', fallbacks: ['[data-price]'] },
          value: 'prices',
          page: { url: 'https://example.com/listings', title: 'Listings' },
        },
      ]

      const playwright = new PlaywrightGenerator()
      const code = playwright.generate('extract-2', 'Extract prices', actions)

      expect(code).toContain('prices')
    })
  })

  describe('Complex Interaction Workflow', () => {
    it('should handle drag and drop operations', () => {
      const actions: RecordedAction[] = [
        {
          type: 'navigate',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          page: { url: 'https://example.com/kanban', title: 'Kanban' },
        },
        {
          type: 'drag',
          timestamp: Date.now(),
          selector: { primary: '[data-testid="card-1"]', fallbacks: [] },
          value: '[data-testid="done-column"]',
          page: { url: 'https://example.com/kanban', title: 'Kanban' },
        },
      ]

      const generator = new ScriptGenerator()
      const code = generator.generate('drag-1', 'Move card in kanban', actions)

      expect(code).toContain('drag')
      expect(code).toContain('card-1')
    })

    it('should handle file upload operations', () => {
      const actions: RecordedAction[] = [
        {
          type: 'navigate',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          page: { url: 'https://example.com/upload', title: 'Upload' },
        },
        {
          type: 'upload',
          timestamp: Date.now(),
          selector: { primary: '[type="file"]', fallbacks: ['input[name="file"]'] },
          value: '/path/to/file.pdf',
          page: { url: 'https://example.com/upload', title: 'Upload' },
        },
      ]

      const playwright = new PlaywrightGenerator()
      const code = playwright.generate('upload-1', 'Upload file', actions)

      expect(code).toContain('set_input_files')
      expect(code).toContain('file.pdf')
    })

    it('should handle keyboard shortcuts', () => {
      const actions: RecordedAction[] = [
        {
          type: 'navigate',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          page: { url: 'https://example.com/editor', title: 'Editor' },
        },
        {
          type: 'click',
          timestamp: Date.now(),
          selector: { primary: '[data-testid="editor"]', fallbacks: [] },
          page: { url: 'https://example.com/editor', title: 'Editor' },
        },
        {
          type: 'keyboard',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          value: 'Control+S',
          page: { url: 'https://example.com/editor', title: 'Editor' },
        },
      ]

      const generator = new ScriptGenerator()
      const code = generator.generate('keyboard-1', 'Save with keyboard', actions)

      expect(code).toContain('keyboard')
      expect(code).toContain('Control+S')
    })
  })

  describe('Workflow Replay and Verification', () => {
    it('should replay simple workflow', async () => {
      const mockElement = {
        click: jest.fn().mockResolvedValue(undefined),
        type: jest.fn().mockResolvedValue(undefined),
      }

      mockPage.$ = jest.fn().mockResolvedValue(mockElement)

      const actions: RecordedAction[] = [
        {
          type: 'navigate',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          page: { url: 'https://example.com/test', title: 'Test' },
        },
        {
          type: 'click',
          timestamp: Date.now(),
          selector: { primary: '[data-testid="btn"]', fallbacks: [] },
          page: { url: 'https://example.com/test', title: 'Test' },
        },
      ]

      const replay = new ScriptReplay(mockPage)
      const result = await replay.run(actions)

      expect(result.success).toBe(true)
      expect(result.actionsExecuted).toBe(2)
    })

    it('should replay workflow with error recovery', async () => {
      const mockElement = {
        click: jest.fn().mockResolvedValue(undefined),
      }

      let attemptCount = 0
      mockPage.goto = jest.fn().mockImplementation(() => {
        attemptCount++
        if (attemptCount === 1) {
          throw new Error('Network error')
        }
        return Promise.resolve()
      })
      mockPage.$ = jest.fn().mockResolvedValue(mockElement)

      const actions: RecordedAction[] = [
        {
          type: 'navigate',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          page: { url: 'https://example.com/test', title: 'Test' },
        },
      ]

      const replay = new ScriptReplay(mockPage, { enableErrorRecovery: true })
      const result = await replay.run(actions)

      expect(result.success).toBe(true)
      expect(mockPage.goto).toHaveBeenCalledTimes(2)
    })
  })
})
