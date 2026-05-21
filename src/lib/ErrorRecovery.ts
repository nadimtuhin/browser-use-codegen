import { Page } from 'puppeteer-core'
import { RecordedAction } from '../types'

export interface RetryConfig {
  maxRetries?: number
  baseDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
}

export type ErrorType = 'network' | 'timeout' | 'notfound' | 'unknown'

export interface ErrorClassification {
  type: ErrorType
  recoverable: boolean
  message: string
}

export interface RetryResult {
  success: boolean
  attempts: number
  totalDelayMs: number
  error?: Error
  recoveredAt?: number
  context?: {
    action: RecordedAction
    attempts: number
    lastError?: Error
  }
}

export interface FallbackResult {
  success: boolean
  usedSelector?: string
  attempts: number
  error?: Error
}

export interface WaitResult {
  success: boolean
  attempts: number
  error?: Error
}

export interface DegradedResult {
  success: boolean
  degraded: boolean
  error?: Error
}

export class ErrorRecovery {
  private config: Required<RetryConfig>
  private page: Page

  constructor(page: Page, config: RetryConfig = {}) {
    this.page = page
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      baseDelay: config.baseDelay ?? 100,
      maxDelay: config.maxDelay ?? 10000,
      backoffMultiplier: config.backoffMultiplier ?? 2,
    }
  }

  /**
   * Execute action with exponential backoff retry
   */
  async executeWithRetry(
    action: RecordedAction,
    fn: () => Promise<void>
  ): Promise<RetryResult> {
    let lastError: Error | undefined
    let totalDelay = 0
    const startTime = Date.now()

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        await fn()
        return {
          success: true,
          attempts: attempt + 1,
          totalDelayMs: totalDelay,
          recoveredAt: attempt > 0 ? Date.now() : undefined,
          context: { action, attempts: attempt + 1 },
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        if (attempt < this.config.maxRetries) {
          const delay = this.calculateDelay(attempt)
          totalDelay += delay
          await this.sleep(delay)
        }
      }
    }

    return {
      success: false,
      attempts: this.config.maxRetries + 1,
      totalDelayMs: totalDelay,
      error: lastError,
      context: { action, attempts: this.config.maxRetries + 1, lastError },
    }
  }

  /**
   * Execute with fallback selectors
   */
  async executeWithFallbacks(
    action: RecordedAction,
    selectors: string[],
    fn: (selector: string) => Promise<void>
  ): Promise<FallbackResult> {
    let lastError: Error | undefined

    for (let i = 0; i < selectors.length; i++) {
      try {
        const selector = selectors[i]
        await fn(selector)
        return {
          success: true,
          usedSelector: selector,
          attempts: i + 1,
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
      }
    }

    return {
      success: false,
      attempts: selectors.length,
      error: lastError,
    }
  }

  /**
   * Wait for element with retry
   */
  async waitAndRetry(
    action: RecordedAction,
    selector: string,
    options: { timeout: number; pollInterval: number }
  ): Promise<WaitResult> {
    const startTime = Date.now()
    let attempts = 0

    while (Date.now() - startTime < options.timeout) {
      attempts++
      try {
        await this.page.waitForSelector(selector, { timeout: options.pollInterval })
        return { success: true, attempts }
      } catch {
        // Retry
      }
    }

    return {
      success: false,
      attempts,
      error: new Error(`Timeout waiting for selector: ${selector}`),
    }
  }

  /**
   * Execute with graceful degradation
   */
  async executeWithGracefulDegradation(
    action: RecordedAction,
    fn: () => Promise<void>
  ): Promise<DegradedResult> {
    try {
      await fn()
      return { success: true, degraded: false }
    } catch (error) {
      const classified = this.classifyError(error instanceof Error ? error : new Error(String(error)))

      return {
        success: false,
        degraded: !classified.recoverable,
        error: error instanceof Error ? error : new Error(String(error)),
      }
    }
  }

  /**
   * Execute with alternative action on failure
   */
  async executeWithAlternative<T>(
    action: RecordedAction,
    primary: () => Promise<T>,
    alternative: () => Promise<T>
  ): Promise<T> {
    try {
      return await primary()
    } catch {
      return await alternative()
    }
  }

  /**
   * Classify error type
   */
  classifyError(error: Error): ErrorClassification {
    const message = error.message.toLowerCase()

    if (
      message.includes('econnrefused') ||
      message.includes('enotfound') ||
      message.includes('network') ||
      message.includes('offline')
    ) {
      return { type: 'network', recoverable: true, message: error.message }
    }

    if (message.includes('timeout') || message.includes('time out')) {
      return { type: 'timeout', recoverable: true, message: error.message }
    }

    if (
      message.includes('not found') ||
      message.includes('cannot find') ||
      message.includes('element not found')
    ) {
      return { type: 'notfound', recoverable: true, message: error.message }
    }

    return { type: 'unknown', recoverable: false, message: error.message }
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateDelay(attempt: number): number {
    const exponentialDelay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt)
    return Math.min(exponentialDelay, this.config.maxDelay)
  }

  /**
   * Sleep for given milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
