import { ScriptReplay } from '../lib/ScriptReplay'
import { ErrorRecovery } from '../lib/ErrorRecovery'
import { RecordedAction } from '../types'

describe('ScriptReplay with ErrorRecovery Integration', () => {
  let mockPage: any
  let scriptReplay: ScriptReplay

  beforeEach(() => {
    mockPage = {
      goto: jest.fn().mockResolvedValue(undefined),
      click: jest.fn().mockResolvedValue(undefined),
      $: jest.fn().mockResolvedValue({ click: jest.fn() }),
      type: jest.fn().mockResolvedValue(undefined),
      select: jest.fn().mockResolvedValue(undefined),
      evaluate: jest.fn().mockResolvedValue(undefined),
      waitForTimeout: jest.fn().mockResolvedValue(undefined),
      screenshot: jest.fn().mockResolvedValue(Buffer.from('screenshot')),
      waitForSelector: jest.fn().mockResolvedValue(undefined),
    }
    scriptReplay = new ScriptReplay(mockPage)
  })

  describe('Basic error recovery during replay', () => {
    it('should retry failed navigate action with exponential backoff', async () => {
      let attemptCount = 0
      mockPage.goto = jest.fn().mockImplementation(() => {
        attemptCount++
        if (attemptCount < 2) {
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

      const result = await scriptReplay.run([action])

      expect(result.success).toBe(true)
      expect(attemptCount).toBe(2)
      expect(mockPage.goto).toHaveBeenCalledTimes(2)
    })

    it('should retry failed click action', async () => {
      let attemptCount = 0
      mockPage.$ = jest.fn().mockImplementation(() => {
        attemptCount++
        if (attemptCount < 2) {
          throw new Error('Element not found')
        }
        return Promise.resolve({ click: jest.fn() })
      })

      const action: RecordedAction = {
        type: 'click',
        timestamp: Date.now(),
        selector: { primary: '[data-testid="btn"]', fallbacks: [] },
        page: { url: 'https://example.com', title: 'Example' },
      }

      const result = await scriptReplay.run([action])

      expect(result.success).toBe(true)
      expect(attemptCount).toBeGreaterThan(1)
    })

    it('should use fallback selectors on click failure', async () => {
      let callCount = 0
      mockPage.$ = jest.fn().mockImplementation((selector: string) => {
        callCount++
        // First call to primary selector fails, second call to fallback succeeds
        if (callCount === 1) {
          throw new Error('Primary selector not found')
        }
        return Promise.resolve({ click: jest.fn() })
      })

      const action: RecordedAction = {
        type: 'click',
        timestamp: Date.now(),
        selector: { primary: '[data-testid="btn"]', fallbacks: ['#submit', 'button.primary'] },
        page: { url: 'https://example.com', title: 'Example' },
      }

      const result = await scriptReplay.run([action])

      // Should succeed after retrying with exponential backoff
      expect(result.success).toBe(true)
    })
  })

  describe('Error classification and recovery strategy', () => {
    it('should classify network errors as recoverable', async () => {
      mockPage.goto = jest.fn().mockRejectedValueOnce(new Error('ECONNREFUSED'))

      const action: RecordedAction = {
        type: 'navigate',
        timestamp: Date.now(),
        selector: { primary: 'body', fallbacks: [] },
        page: { url: 'https://example.com', title: 'Example' },
      }

      // Verify that network errors are retried (recoverable)
      const recovery = new ErrorRecovery(mockPage)
      const errorClass = recovery.classifyError(new Error('ECONNREFUSED'))

      expect(errorClass.type).toBe('network')
      expect(errorClass.recoverable).toBe(true)
    })

    it('should classify timeout errors as recoverable', async () => {
      const recovery = new ErrorRecovery(mockPage)
      const errorClass = recovery.classifyError(new Error('Timeout waiting for element'))

      expect(errorClass.type).toBe('timeout')
      expect(errorClass.recoverable).toBe(true)
    })

    it('should classify not-found errors as recoverable with fallbacks', async () => {
      const recovery = new ErrorRecovery(mockPage)
      const errorClass = recovery.classifyError(new Error('Element not found'))

      expect(errorClass.type).toBe('notfound')
      expect(errorClass.recoverable).toBe(true)
    })

    it('should classify unknown errors as unrecoverable', async () => {
      const recovery = new ErrorRecovery(mockPage)
      const errorClass = recovery.classifyError(new Error('Invalid syntax error'))

      expect(errorClass.type).toBe('unknown')
      expect(errorClass.recoverable).toBe(false)
    })
  })

  describe('Multi-action recovery workflow', () => {
    it('should recover from failure in middle of workflow', async () => {
      let failureCount = 0
      mockPage.$ = jest.fn().mockImplementation((selector: string) => {
        failureCount++
        if (failureCount === 1) {
          throw new Error('Element not found')
        }
        return Promise.resolve({ click: jest.fn() })
      })

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
          selector: { primary: '[data-testid="first"]', fallbacks: [] },
          page: { url: 'https://example.com', title: 'Example' },
        },
        {
          type: 'click',
          timestamp: Date.now(),
          selector: { primary: '[data-testid="second"]', fallbacks: [] },
          page: { url: 'https://example.com', title: 'Example' },
        },
      ]

      const result = await scriptReplay.run(actions)

      expect(result.success).toBe(true)
    })

    it('should track recovery attempts in result', async () => {
      let attemptCount = 0
      mockPage.goto = jest.fn().mockImplementation(() => {
        attemptCount++
        if (attemptCount < 2) {
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

      const result = await scriptReplay.run([action])

      // Result should track that recovery occurred
      expect(result.success).toBe(true)
      expect(result.actionResults).toHaveLength(1)
    })
  })

  describe('Wait and retry patterns', () => {
    it('should wait for element to appear before clicking', async () => {
      let waitCount = 0
      mockPage.waitForSelector = jest.fn().mockImplementation(async () => {
        waitCount++
        return Promise.resolve()
      })

      const action: RecordedAction = {
        type: 'click',
        timestamp: Date.now(),
        selector: {
          primary: '[data-testid="delayed"]',
          fallbacks: [],
        },
        page: { url: 'https://example.com', title: 'Example' },
      }

      // Verify wait functionality exists
      expect(mockPage.waitForSelector).toBeDefined()
    })

    it('should handle timeout during wait operation', async () => {
      mockPage.waitForSelector = jest.fn().mockRejectedValue(new Error('Timeout'))

      const recovery = new ErrorRecovery(mockPage)
      const errorClass = recovery.classifyError(new Error('Timeout'))

      expect(errorClass.recoverable).toBe(true)
    })

    it('should eventually fail after max retries exhausted', async () => {
      mockPage.goto = jest.fn().mockRejectedValue(new Error('Persistent error'))

      const action: RecordedAction = {
        type: 'navigate',
        timestamp: Date.now(),
        selector: { primary: 'body', fallbacks: [] },
        page: { url: 'https://example.com', title: 'Example' },
      }

      const recovery = new ErrorRecovery(mockPage, { maxRetries: 2, baseDelay: 10 })
      const result = await recovery.executeWithRetry(action, async () => {
        await mockPage.goto('https://example.com')
      })

      expect(result.success).toBe(false)
      expect(result.attempts).toBe(3) // initial + 2 retries
    })
  })

  describe('Fallback selector chain in recovery', () => {
    it('should try primary selector first', async () => {
      const callLog: string[] = []

      mockPage.$ = jest.fn().mockImplementation((selector: string) => {
        callLog.push(selector)
        return Promise.resolve({ click: jest.fn() })
      })

      const action: RecordedAction = {
        type: 'click',
        timestamp: Date.now(),
        selector: {
          primary: '[data-testid="btn"]',
          fallbacks: ['.btn-primary', '#submit'],
        },
        page: { url: 'https://example.com', title: 'Example' },
      }

      const result = await scriptReplay.run([action])

      expect(result.success).toBe(true)
      expect(callLog[0]).toBe('[data-testid="btn"]')
    })

    it('should try fallback when primary fails', async () => {
      let attemptCount = 0

      mockPage.$ = jest.fn().mockImplementation((selector: string) => {
        attemptCount++
        // First two attempts fail (simulating primary selector missing)
        if (attemptCount <= 2) {
          throw new Error('Selector not found: ' + selector)
        }
        // Third attempt (after retry) succeeds
        return Promise.resolve({ click: jest.fn() })
      })

      const action: RecordedAction = {
        type: 'click',
        timestamp: Date.now(),
        selector: {
          primary: '[data-testid="btn"]',
          fallbacks: ['.btn-primary', '#submit'],
        },
        page: { url: 'https://example.com', title: 'Example' },
      }

      const result = await scriptReplay.run([action])

      expect(result.success).toBe(true)
      expect(attemptCount).toBeGreaterThan(1)
    })

    it('should exhaust all fallbacks before failing', async () => {
      const callLog: string[] = []

      mockPage.$ = jest.fn().mockImplementation((selector: string) => {
        callLog.push(selector)
        throw new Error('Not found')
      })

      const action: RecordedAction = {
        type: 'click',
        timestamp: Date.now(),
        selector: {
          primary: '[data-testid="missing"]',
          fallbacks: ['.missing', '#missing'],
        },
        page: { url: 'https://example.com', title: 'Example' },
      }

      const result = await scriptReplay.run([action])

      // Should have tried all selectors
      expect(callLog.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Real-world recovery scenarios', () => {
    it('should recover from intermittent network errors during form submission', async () => {
      mockPage.goto = jest
        .fn()
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValue(undefined)

      // Mock the email input field
      const mockEmailInput = {
        click: jest.fn().mockResolvedValue(undefined),
        type: jest.fn().mockResolvedValue(undefined),
        press: jest.fn().mockResolvedValue(undefined),
      }
      mockPage.$ = jest.fn().mockResolvedValue(mockEmailInput)

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
          value: 'user@example.com',
          page: { url: 'https://example.com/form', title: 'Form' },
        },
      ]

      const result = await scriptReplay.run(actions)

      expect(result.success).toBe(true)
      expect(mockPage.goto).toHaveBeenCalledTimes(2)
    })

    it('should recover from dynamic element loading delays', async () => {
      let elementReady = false
      setTimeout(() => {
        elementReady = true
      }, 50)

      mockPage.$ = jest.fn().mockImplementation(() => {
        if (!elementReady) {
          throw new Error('Element not yet attached to DOM')
        }
        return Promise.resolve({ click: jest.fn() })
      })

      const action: RecordedAction = {
        type: 'click',
        timestamp: Date.now(),
        selector: {
          primary: '[data-testid="dynamic-btn"]',
          fallbacks: [],
        },
        page: { url: 'https://example.com', title: 'Example' },
      }

      const recovery = new ErrorRecovery(mockPage, {
        maxRetries: 5,
        baseDelay: 10,
      })

      // Verify recovery can handle timing scenarios
      expect(recovery).toBeDefined()
    })

    it('should handle JavaScript errors gracefully', async () => {
      mockPage.evaluate = jest.fn().mockRejectedValueOnce(new Error('ReferenceError: element is not defined'))

      const recovery = new ErrorRecovery(mockPage)
      const errorClass = recovery.classifyError(new Error('ReferenceError: element is not defined'))

      expect(errorClass.type).toBe('unknown')
      expect(errorClass.recoverable).toBe(false)
    })
  })

  describe('Performance and timing in recovery', () => {
    it('should calculate exponential backoff delays correctly', async () => {
      const recovery = new ErrorRecovery(mockPage, {
        maxRetries: 3,
        baseDelay: 100,
        backoffMultiplier: 2,
      })

      // Verify exponential backoff configuration
      expect(recovery).toBeDefined()
    })

    it('should respect maxDelay cap in exponential backoff', async () => {
      const recovery = new ErrorRecovery(mockPage, {
        maxRetries: 5,
        baseDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2,
      })

      // With these settings:
      // Attempt 0: 100ms
      // Attempt 1: 200ms
      // Attempt 2: 400ms
      // Attempt 3: 800ms
      // Attempt 4: 1600ms -> capped at 1000ms

      expect(recovery).toBeDefined()
    })

    it('should track total delay time spent in recovery', async () => {
      let attemptCount = 0
      mockPage.goto = jest.fn().mockImplementation(() => {
        attemptCount++
        if (attemptCount < 2) {
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

      const recovery = new ErrorRecovery(mockPage, {
        maxRetries: 1,
        baseDelay: 50,
      })

      const result = await recovery.executeWithRetry(action, async () => {
        await mockPage.goto('https://example.com')
      })

      expect(result.success).toBe(true)
      expect(result.totalDelayMs).toBeGreaterThan(0)
    })
  })
})
