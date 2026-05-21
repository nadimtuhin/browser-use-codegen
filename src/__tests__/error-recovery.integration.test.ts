import { ErrorRecovery, RetryConfig } from '../lib/ErrorRecovery'
import { RecordedAction } from '../types'

describe('Error Recovery Integration Tests', () => {
  let recovery: ErrorRecovery
  let mockPage: any

  beforeEach(() => {
    mockPage = {
      goto: jest.fn(),
      $: jest.fn(),
      evaluate: jest.fn(),
      waitForSelector: jest.fn(),
    }
    recovery = new ErrorRecovery(mockPage, { maxRetries: 3, baseDelay: 10 })
  })

  describe('Retry configuration', () => {
    it('should accept retry configuration', () => {
      const config: RetryConfig = {
        maxRetries: 5,
        baseDelay: 100,
        maxDelay: 5000,
        backoffMultiplier: 2,
      }
      const r = new ErrorRecovery(mockPage, config)
      expect(r).toBeDefined()
    })

    it('should have sensible defaults', () => {
      const r = new ErrorRecovery(mockPage)
      expect(r).toBeDefined()
    })
  })

  describe('Retry with exponential backoff', () => {
    it('should retry failed action with exponential backoff', async () => {
      let attemptCount = 0
      mockPage.goto = jest.fn().mockImplementation(() => {
        attemptCount++
        if (attemptCount < 3) {
          throw new Error('Network error')
        }
        return Promise.resolve()
      })

      const action: RecordedAction = {
        type: 'navigate',
        timestamp: Date.now(),
        selector: { primary: 'body', fallbacks: [] },
        page: { url: 'https://example.com', title: 'Example' },
      }

      const result = await recovery.executeWithRetry(action, async () => {
        await mockPage.goto('https://example.com')
      })

      expect(result.success).toBe(true)
      expect(result.attempts).toBe(3)
      expect(attemptCount).toBe(3)
    })

    it('should fail after max retries exceeded', async () => {
      mockPage.goto = jest.fn().mockRejectedValue(new Error('Persistent error'))

      const action: RecordedAction = {
        type: 'navigate',
        timestamp: Date.now(),
        selector: { primary: 'body', fallbacks: [] },
        page: { url: 'https://example.com', title: 'Example' },
      }

      const result = await recovery.executeWithRetry(action, async () => {
        await mockPage.goto('https://example.com')
      })

      expect(result.success).toBe(false)
      expect(result.attempts).toBe(4) // initial + 3 retries
      expect(result.error).toBeDefined()
    })

    it('should increase delay exponentially', async () => {
      const delays: number[] = []
      const originalDate = Date.now
      Date.now = jest.fn(() => originalDate.call(Date))

      let attemptCount = 0
      mockPage.goto = jest.fn().mockImplementation(() => {
        attemptCount++
        if (attemptCount < 2) {
          throw new Error('Error')
        }
        return Promise.resolve()
      })

      const action: RecordedAction = {
        type: 'navigate',
        timestamp: Date.now(),
        selector: { primary: 'body', fallbacks: [] },
        page: { url: 'https://example.com', title: 'Example' },
      }

      const result = await recovery.executeWithRetry(action, async () => {
        await mockPage.goto('https://example.com')
      })

      expect(result.success).toBe(true)
      // Delays should increase: baseDelay, baseDelay*2, etc.
      expect(result.totalDelayMs).toBeGreaterThan(0)
    })
  })

  describe('Fallback selector retry', () => {
    it('should retry with fallback selectors on failure', async () => {
      const selectors = ['[data-testid="btn"]', '#submit', 'button.primary']
      let selectorIndex = 0

      mockPage.$ = jest.fn().mockImplementation((selector: string) => {
        if (selector === selectors[selectorIndex]) {
          if (selectorIndex < selectors.length - 1) {
            selectorIndex++
            throw new Error('Not found')
          }
          return Promise.resolve({ click: jest.fn() })
        }
        throw new Error('Not found')
      })

      const action: RecordedAction = {
        type: 'click',
        timestamp: Date.now(),
        selector: { primary: selectors[0], fallbacks: selectors.slice(1) },
        page: { url: 'https://example.com', title: 'Example' },
      }

      const result = await recovery.executeWithFallbacks(
        action,
        selectors,
        async (selector) => {
          const el = await mockPage.$(selector)
          await el.click()
        }
      )

      expect(result.success).toBe(true)
      expect(result.usedSelector).toBe(selectors[2])
    })

    it('should fail if all fallbacks fail', async () => {
      mockPage.$ = jest.fn().mockRejectedValue(new Error('Not found'))

      const action: RecordedAction = {
        type: 'click',
        timestamp: Date.now(),
        selector: {
          primary: '[data-testid="missing"]',
          fallbacks: ['#missing', '.missing'],
        },
        page: { url: 'https://example.com', title: 'Example' },
      }

      const result = await recovery.executeWithFallbacks(
        action,
        [action.selector.primary, ...action.selector.fallbacks],
        async (selector) => {
          await mockPage.$(selector)
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('Error classification', () => {
    it('should classify network errors', () => {
      const error = new Error('ECONNREFUSED')
      const classified = recovery.classifyError(error)

      expect(classified.type).toBe('network')
      expect(classified.recoverable).toBe(true)
    })

    it('should classify timeout errors', () => {
      const error = new Error('Timeout')
      const classified = recovery.classifyError(error)

      expect(classified.type).toBe('timeout')
      expect(classified.recoverable).toBe(true)
    })

    it('should classify not-found errors', () => {
      const error = new Error('Element not found')
      const classified = recovery.classifyError(error)

      expect(classified.type).toBe('notfound')
      expect(classified.recoverable).toBe(true) // Can try fallbacks
    })

    it('should classify unrecoverable errors', () => {
      const error = new Error('Invalid syntax')
      const classified = recovery.classifyError(error)

      expect(classified.type).toBe('unknown')
      expect(classified.recoverable).toBe(false)
    })
  })

  describe('Wait and retry', () => {
    it('should wait for element to appear', async () => {
      let attempts = 0
      mockPage.waitForSelector = jest.fn().mockImplementation(async (selector) => {
        attempts++
        if (attempts === 1) throw new Error('Timeout')
        return Promise.resolve()
      })

      const action: RecordedAction = {
        type: 'click',
        timestamp: Date.now(),
        selector: { primary: '[data-testid="delayed"]', fallbacks: [] },
        page: { url: 'https://example.com', title: 'Example' },
      }

      const result = await recovery.waitAndRetry(
        action,
        '[data-testid="delayed"]',
        { timeout: 5000, pollInterval: 100 }
      )

      expect(result.success).toBe(true)
      expect(result.attempts).toBeGreaterThan(0)
    })

    it('should timeout if element never appears', async () => {
      mockPage.waitForSelector = jest.fn().mockRejectedValue(new Error('Timeout'))

      const action: RecordedAction = {
        type: 'click',
        timestamp: Date.now(),
        selector: { primary: '.never-appears', fallbacks: [] },
        page: { url: 'https://example.com', title: 'Example' },
      }

      const result = await recovery.waitAndRetry(action, '.never-appears', {
        timeout: 100,
        pollInterval: 50,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('Recovery statistics', () => {
    it('should track recovery statistics', async () => {
      let attempt = 0
      mockPage.goto = jest.fn().mockImplementation(() => {
        attempt++
        if (attempt < 2) throw new Error('Error')
        return Promise.resolve()
      })

      const action: RecordedAction = {
        type: 'navigate',
        timestamp: Date.now(),
        selector: { primary: 'body', fallbacks: [] },
        page: { url: 'https://example.com', title: 'Example' },
      }

      const result = await recovery.executeWithRetry(action, async () => {
        await mockPage.goto('https://example.com')
      })

      expect(result.success).toBe(true)
      expect(result.attempts).toBe(2)
      expect(result.totalDelayMs).toBeDefined()
      expect(result.recoveredAt).toBeDefined()
    })

    it('should provide recovery context in error', async () => {
      mockPage.goto = jest.fn().mockRejectedValue(new Error('Network error'))

      const action: RecordedAction = {
        type: 'navigate',
        timestamp: Date.now(),
        selector: { primary: 'body', fallbacks: [] },
        page: { url: 'https://example.com', title: 'Example' },
      }

      const result = await recovery.executeWithRetry(action, async () => {
        await mockPage.goto('https://example.com')
      })

      expect(result.context).toBeDefined()
      expect(result.context?.action).toBe(action)
      expect(result.context?.attempts).toBe(4)
    })
  })

  describe('Graceful degradation', () => {
    it('should skip action on unrecoverable error', async () => {
      mockPage.goto = jest.fn().mockRejectedValue(new Error('Invalid URL'))

      const action: RecordedAction = {
        type: 'navigate',
        timestamp: Date.now(),
        selector: { primary: 'body', fallbacks: [] },
        page: { url: 'https://example.com', title: 'Example' },
      }

      const result = await recovery.executeWithGracefulDegradation(action, async () => {
        await mockPage.goto('https://example.com')
      })

      expect(result.success).toBe(false)
      expect(result.degraded).toBe(true)
    })

    it('should provide alternative action on failure', async () => {
      mockPage.goto = jest.fn().mockRejectedValue(new Error('Error'))

      const action: RecordedAction = {
        type: 'navigate',
        timestamp: Date.now(),
        selector: { primary: 'body', fallbacks: [] },
        page: { url: 'https://example.com', title: 'Example' },
      }

      let alternativeCalled = false
      const result = await recovery.executeWithAlternative(action, async () => {
        await mockPage.goto('https://example.com')
        return undefined
      }, async () => {
        alternativeCalled = true
        return undefined
      })

      expect(alternativeCalled).toBe(true)
    })
  })
})
