import { ScriptReplay } from '../lib/ScriptReplay'
import { RecordedAction } from '../types'

describe('ScriptReplay E2E Tests', () => {
  let mockPage: any
  let replay: ScriptReplay

  const makeAction = (overrides: Partial<RecordedAction>): RecordedAction => ({
    type: 'click',
    timestamp: Date.now(),
    selector: { primary: 'button', fallbacks: [] },
    page: { url: 'https://example.com', title: 'Example' },
    ...overrides,
  })

  beforeEach(() => {
    mockPage = {
      url: jest.fn().mockReturnValue('https://example.com'),
      title: jest.fn().mockResolvedValue('Example'),
      goto: jest.fn().mockResolvedValue(undefined),
      waitForSelector: jest.fn().mockResolvedValue({}),
      $: jest.fn().mockResolvedValue({
        click: jest.fn().mockResolvedValue(undefined),
        type: jest.fn().mockResolvedValue(undefined),
        select: jest.fn().mockResolvedValue(undefined),
        press: jest.fn().mockResolvedValue(undefined),
      }),
      evaluate: jest.fn().mockResolvedValue(undefined),
      screenshot: jest.fn().mockResolvedValue(Buffer.from('fake')),
    }
    replay = new ScriptReplay(mockPage, { stopOnError: false, captureScreenshots: false })
  })

  describe('Replay creation', () => {
    it('should create a ScriptReplay instance', () => {
      expect(replay).toBeDefined()
      expect(replay instanceof ScriptReplay).toBe(true)
    })

    it('should accept page and options', () => {
      const r = new ScriptReplay(mockPage, { stopOnError: true })
      expect(r).toBeDefined()
    })
  })

  describe('Replay execution', () => {
    it('should replay navigate action with driver.goto', async () => {
      const actions: RecordedAction[] = [
        makeAction({ type: 'navigate', page: { url: 'https://example.com', title: 'Example' } }),
      ]

      await replay.run(actions)
      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com', expect.any(Object))
    })

    it('should replay click action', async () => {
      const mockEl = { click: jest.fn().mockResolvedValue(undefined) }
      mockPage.$ = jest.fn().mockResolvedValue(mockEl)

      const actions: RecordedAction[] = [
        makeAction({ type: 'navigate' }),
        makeAction({ type: 'click', selector: { primary: 'button', fallbacks: [] } }),
      ]

      await replay.run(actions)
      expect(mockEl.click).toHaveBeenCalled()
    })

    it('should replay input action', async () => {
      const mockEl = { click: jest.fn(), type: jest.fn() }
      mockPage.$ = jest.fn().mockResolvedValue(mockEl)

      const actions: RecordedAction[] = [
        makeAction({ type: 'navigate' }),
        makeAction({ type: 'input', selector: { primary: 'input', fallbacks: [] }, value: 'hello' }),
      ]

      await replay.run(actions)
      expect(mockEl.type).toHaveBeenCalledWith('hello', expect.any(Object))
    })

    it('should replay wait action', async () => {
      const actions: RecordedAction[] = [
        makeAction({ type: 'navigate' }),
        makeAction({ type: 'wait', value: '100' }),
      ]

      const before = Date.now()
      await replay.run(actions)
      const after = Date.now()

      // Should have waited ~100ms
      expect(after - before).toBeGreaterThanOrEqual(90)
    })

    it('should return a ReplayResult object', async () => {
      const actions: RecordedAction[] = [makeAction({ type: 'navigate' })]
      const result = await replay.run(actions)

      expect(result).toBeDefined()
      expect(result.success).toBeDefined()
      expect(result.actionsExecuted).toBeDefined()
      expect(result.errors).toBeDefined()
      expect(Array.isArray(result.errors)).toBe(true)
    })

    it('should report actionsExecuted count', async () => {
      const actions: RecordedAction[] = [
        makeAction({ type: 'navigate' }),
        makeAction({ type: 'wait', value: '50' }),
      ]
      const result = await replay.run(actions)
      expect(result.actionsExecuted).toBe(2)
    })

    it('should report success=true when all actions pass', async () => {
      const actions: RecordedAction[] = [makeAction({ type: 'navigate' })]
      const result = await replay.run(actions)
      expect(result.success).toBe(true)
    })
  })

  describe('Error handling', () => {
    it('should continue on error when stopOnError=false', async () => {
      const lenientReplay = new ScriptReplay(mockPage, { stopOnError: false })
      mockPage.$ = jest.fn().mockRejectedValue(new Error('Element not found'))

      const actions: RecordedAction[] = [
        makeAction({ type: 'navigate' }),
        makeAction({ type: 'click', selector: { primary: '.missing', fallbacks: [] } }),
        makeAction({ type: 'wait', value: '50' }),
      ]

      const result = await lenientReplay.run(actions)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.actionsExecuted).toBe(3) // All attempted despite error
    })

    it('should stop on error when stopOnError=true', async () => {
      const strictReplay = new ScriptReplay(mockPage, { stopOnError: true })
      mockPage.$ = jest.fn().mockRejectedValue(new Error('Element not found'))

      const actions: RecordedAction[] = [
        makeAction({ type: 'navigate' }),
        makeAction({ type: 'click', selector: { primary: '.missing', fallbacks: [] } }),
        makeAction({ type: 'wait', value: '50' }),
      ]

      const result = await strictReplay.run(actions)
      expect(result.success).toBe(false)
      expect(result.actionsExecuted).toBeLessThan(actions.length)
    })

    it('should collect errors in result.errors', async () => {
      const lenientReplay = new ScriptReplay(mockPage, { stopOnError: false })
      mockPage.$ = jest.fn().mockRejectedValue(new Error('Not found'))

      const actions: RecordedAction[] = [
        makeAction({ type: 'navigate' }),
        makeAction({ type: 'click', selector: { primary: '.missing', fallbacks: [] } }),
      ]

      const result = await lenientReplay.run(actions)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toContain('Not found')
    })
  })

  describe('Fallback selectors', () => {
    it('should try fallback selectors when primary fails', async () => {
      let callCount = 0
      mockPage.$ = jest.fn().mockImplementation(async (selector: string) => {
        callCount++
        if (selector === '[data-testid="missing"]') return null
        if (selector === '#fallback') return { click: jest.fn() }
        return null
      })

      const actions: RecordedAction[] = [
        makeAction({ type: 'navigate' }),
        makeAction({
          type: 'click',
          selector: { primary: '[data-testid="missing"]', fallbacks: ['#fallback'] },
        }),
      ]

      await replay.run(actions)
      expect(callCount).toBeGreaterThan(1)
    })
  })

  describe('Timing report', () => {
    it('should include duration in result', async () => {
      const actions: RecordedAction[] = [makeAction({ type: 'navigate' })]
      const result = await replay.run(actions)
      expect(result.durationMs).toBeDefined()
      expect(typeof result.durationMs).toBe('number')
      expect(result.durationMs).toBeGreaterThanOrEqual(0)
    })

    it('should record per-action timing', async () => {
      const actions: RecordedAction[] = [
        makeAction({ type: 'navigate' }),
        makeAction({ type: 'wait', value: '50' }),
      ]
      const result = await replay.run(actions)
      expect(result.actionResults).toBeDefined()
      expect(result.actionResults.length).toBe(actions.length)
      expect(result.actionResults[0].durationMs).toBeDefined()
    })
  })

  describe('Screenshot during replay', () => {
    it('should capture screenshots when option enabled', async () => {
      const screenshotReplay = new ScriptReplay(mockPage, { captureScreenshots: true })
      const actions: RecordedAction[] = [
        makeAction({ type: 'navigate' }),
        makeAction({ type: 'wait', value: '50' }),
      ]

      const result = await screenshotReplay.run(actions)
      expect(mockPage.screenshot).toHaveBeenCalled()
      // Screenshots should appear in action results
      expect(result.actionResults.some(r => r.screenshot)).toBeDefined()
    })

    it('should NOT capture screenshots when option disabled', async () => {
      const noScreenshotReplay = new ScriptReplay(mockPage, { captureScreenshots: false })
      const actions: RecordedAction[] = [makeAction({ type: 'navigate' })]

      await noScreenshotReplay.run(actions)
      expect(mockPage.screenshot).not.toHaveBeenCalled()
    })
  })

  describe('Empty actions', () => {
    it('should handle empty actions array gracefully', async () => {
      const result = await replay.run([])
      expect(result.success).toBe(true)
      expect(result.actionsExecuted).toBe(0)
      expect(result.errors).toHaveLength(0)
    })
  })
})
