import { Page } from 'puppeteer-core'
import { RecordedAction } from '../types'

export interface ScriptReplayOptions {
  stopOnError?: boolean
  captureScreenshots?: boolean
  delayMultiplier?: number
}

export interface ActionResult {
  action: RecordedAction
  success: boolean
  durationMs: number
  error?: Error
  screenshot?: string
}

export interface ReplayResult {
  success: boolean
  actionsExecuted: number
  durationMs: number
  errors: Error[]
  actionResults: ActionResult[]
}

export class ScriptReplay {
  private page: Page
  private options: Required<ScriptReplayOptions>

  constructor(page: Page, options: ScriptReplayOptions = {}) {
    this.page = page
    this.options = {
      stopOnError: false,
      captureScreenshots: false,
      delayMultiplier: 1,
      ...options,
    }
  }

  async run(actions: RecordedAction[]): Promise<ReplayResult> {
    const startTime = Date.now()
    const actionResults: ActionResult[] = []
    const errors: Error[] = []
    let actionsExecuted = 0

    for (const action of actions) {
      const actionStart = Date.now()
      let success = true
      let error: Error | undefined
      let screenshot: string | undefined

      try {
        await this.executeAction(action)
        actionsExecuted++

        if (this.options.captureScreenshots && action.type !== 'wait') {
          try {
            const buf = await this.page.screenshot({ encoding: 'base64' })
            screenshot = buf as string
          } catch {
            // Non-fatal
          }
        } else {
          actionsExecuted = actionsExecuted // already incremented above
        }
      } catch (e) {
        success = false
        error = e instanceof Error ? e : new Error(String(e))
        errors.push(error)
        actionsExecuted++ // Count as executed (attempted)

        if (this.options.stopOnError) {
          actionResults.push({
            action,
            success,
            durationMs: Date.now() - actionStart,
            error,
            screenshot,
          })
          break
        }
      }

      actionResults.push({
        action,
        success,
        durationMs: Date.now() - actionStart,
        error,
        screenshot,
      })
    }

    return {
      success: errors.length === 0,
      actionsExecuted,
      durationMs: Date.now() - startTime,
      errors,
      actionResults,
    }
  }

  private async executeAction(action: RecordedAction): Promise<void> {
    switch (action.type) {
      case 'navigate':
        await this.page.goto(action.page.url, { waitUntil: 'networkidle2' })
        break

      case 'click':
        await this.executeClick(action)
        break

      case 'input':
        await this.executeInput(action)
        break

      case 'select':
        await this.executeSelect(action)
        break

      case 'scroll':
        await this.executeScroll(action)
        break

      case 'wait': {
        const ms = action.value ? parseInt(action.value) : 1000
        await new Promise(resolve => setTimeout(resolve, ms * this.options.delayMultiplier))
        break
      }

      case 'extract':
        // Extract is read-only, just verify selector exists
        await this.findElement(action)
        break

      default:
        // Unknown action type — skip
        break
    }
  }

  private async findElement(action: RecordedAction) {
    const { primary, fallbacks = [] } = action.selector
    const selectors = [primary, ...fallbacks]

    for (const selector of selectors) {
      const el = await this.page.$(selector)
      if (el) return el
    }
    return null
  }

  private async executeClick(action: RecordedAction): Promise<void> {
    const el = await this.findElement(action)
    if (el) {
      await el.click()
    }
  }

  private async executeInput(action: RecordedAction): Promise<void> {
    const el = await this.findElement(action)
    if (!el) return

    const value = action.value || ''
    const hasEnter = value.endsWith('[Enter]')
    const cleanValue = hasEnter ? value.slice(0, -7) : value

    await el.click({ clickCount: 3 })
    await el.type(cleanValue, { delay: 30 })

    if (hasEnter) {
      await el.press('Enter')
    }
  }

  private async executeSelect(action: RecordedAction): Promise<void> {
    const el = await this.findElement(action)
    if (el && action.value) {
      await (el as any).select(action.value)
    }
  }

  private async executeScroll(action: RecordedAction): Promise<void> {
    const scrollValue = parseInt(action.value || '0')
    const isWindowScroll =
      action.selector.primary === 'body' || action.selector.primary === 'html'

    if (isWindowScroll) {
      await this.page.evaluate((y: number) => window.scrollTo(0, y), scrollValue)
    } else {
      const sel = action.selector.primary
      await this.page.evaluate(
        (selector: string, y: number) => {
          const el = document.querySelector(selector)
          if (el) (el as HTMLElement).scrollTop = y
        },
        sel,
        scrollValue
      )
    }
  }
}
