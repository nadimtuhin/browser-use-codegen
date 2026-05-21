import { ActionRecorder } from '../lib/ActionRecorder'
import { ScriptGenerator } from '../lib/ScriptGenerator'
import { PlaywrightGenerator } from '../lib/PlaywrightGenerator'
import { RecordedAction } from '../types'

describe('Screenshot Capture Integration Tests', () => {
  let mockPage: any
  let screenshotBuffer: Buffer
  let exposedFunctions: Map<string, Function>

  beforeEach(() => {
    screenshotBuffer = Buffer.from('fake-png-data')
    exposedFunctions = new Map()

    mockPage = {
      url: jest.fn().mockReturnValue('https://example.com'),
      title: jest.fn().mockResolvedValue('Example'),
      exposeFunction: jest.fn().mockImplementation((name: string, fn: Function) => {
        exposedFunctions.set(name, fn)
        return Promise.resolve()
      }),
      evaluateOnNewDocument: jest.fn().mockResolvedValue(undefined),
      evaluate: jest.fn().mockResolvedValue(undefined),
      // When called with encoding: 'base64', Puppeteer returns a string
      screenshot: jest.fn().mockImplementation(async (opts?: any) => {
        if (opts?.encoding === 'base64') {
          return screenshotBuffer.toString('base64')
        }
        return screenshotBuffer
      }),
    }
  })

  describe('ActionRecorder with captureScreenshots=true', () => {
    it('should capture screenshot on click action', async () => {
      const recorder = new ActionRecorder(mockPage, { captureScreenshots: true })
      await recorder.start()

      const bridge = exposedFunctions.get('__recordActionBridge')!
      await bridge(JSON.stringify({
        type: 'click',
        selector: { primary: 'button', fallbacks: [] },
        page: { url: 'https://example.com', title: 'Example' },
      }))

      const actions = await recorder.stop()
      const clickAction = actions.find(a => a.type === 'click')
      expect(clickAction?.screenshot).toBeDefined()
      expect(typeof clickAction?.screenshot).toBe('string')
    })

    it('should store screenshot as base64 string', async () => {
      const recorder = new ActionRecorder(mockPage, { captureScreenshots: true })
      await recorder.start()

      const bridge = exposedFunctions.get('__recordActionBridge')!
      await bridge(JSON.stringify({
        type: 'click',
        selector: { primary: 'button', fallbacks: [] },
        page: { url: 'https://example.com', title: 'Example' },
      }))

      const actions = await recorder.stop()
      const clickAction = actions.find(a => a.type === 'click')

      expect(clickAction?.screenshot).toMatch(/^[A-Za-z0-9+/]+=*$/) // valid base64
    })

    it('should capture screenshot on input action', async () => {
      const recorder = new ActionRecorder(mockPage, { captureScreenshots: true })
      await recorder.start()

      const bridge = exposedFunctions.get('__recordActionBridge')!
      await bridge(JSON.stringify({
        type: 'input',
        selector: { primary: 'input', fallbacks: [] },
        value: 'hello',
        page: { url: 'https://example.com', title: 'Example' },
      }))

      const actions = await recorder.stop()
      const inputAction = actions.find(a => a.type === 'input')
      expect(inputAction?.screenshot).toBeDefined()
    })

    it('should NOT capture screenshot for wait actions (no visual change)', async () => {
      const recorder = new ActionRecorder(mockPage, { captureScreenshots: true })
      await recorder.start()

      await recorder.addWaitAction(1000)

      const actions = await recorder.stop()
      const waitAction = actions.find(a => a.type === 'wait')
      expect(waitAction?.screenshot).toBeUndefined()
    })

    it('should call page.screenshot for each captured action', async () => {
      const recorder = new ActionRecorder(mockPage, { captureScreenshots: true })
      await recorder.start()

      const bridge = exposedFunctions.get('__recordActionBridge')!

      await bridge(JSON.stringify({
        type: 'click',
        selector: { primary: 'button', fallbacks: [] },
        page: { url: 'https://example.com', title: 'Example' },
      }))

      await bridge(JSON.stringify({
        type: 'input',
        selector: { primary: 'input', fallbacks: [] },
        value: 'hello',
        page: { url: 'https://example.com', title: 'Example' },
      }))

      await recorder.stop()

      // Should have called screenshot for each user-triggered action
      expect(mockPage.screenshot).toHaveBeenCalled()
    })
  })

  describe('ActionRecorder with captureScreenshots=false (default)', () => {
    it('should NOT capture screenshots when disabled', async () => {
      const recorder = new ActionRecorder(mockPage, { captureScreenshots: false })
      await recorder.start()

      const bridge = exposedFunctions.get('__recordActionBridge')!
      await bridge(JSON.stringify({
        type: 'click',
        selector: { primary: 'button', fallbacks: [] },
        page: { url: 'https://example.com', title: 'Example' },
      }))

      const actions = await recorder.stop()
      const clickAction = actions.find(a => a.type === 'click')
      expect(clickAction?.screenshot).toBeUndefined()
      expect(mockPage.screenshot).not.toHaveBeenCalled()
    })

    it('should NOT capture screenshots by default', async () => {
      const recorder = new ActionRecorder(mockPage)
      await recorder.start()

      const bridge = exposedFunctions.get('__recordActionBridge')!
      await bridge(JSON.stringify({
        type: 'click',
        selector: { primary: 'button', fallbacks: [] },
        page: { url: 'https://example.com', title: 'Example' },
      }))

      await recorder.stop()
      expect(mockPage.screenshot).not.toHaveBeenCalled()
    })
  })

  describe('RecordedAction screenshot field', () => {
    it('should have screenshot field in RecordedAction type', () => {
      const action: RecordedAction = {
        type: 'click',
        timestamp: Date.now(),
        selector: { primary: 'button', fallbacks: [] },
        page: { url: 'https://example.com', title: 'Example' },
        screenshot: 'base64data==',
      }
      expect(action.screenshot).toBe('base64data==')
    })

    it('should allow screenshot to be undefined', () => {
      const action: RecordedAction = {
        type: 'click',
        timestamp: Date.now(),
        selector: { primary: 'button', fallbacks: [] },
        page: { url: 'https://example.com', title: 'Example' },
      }
      expect(action.screenshot).toBeUndefined()
    })
  })

  describe('ScriptGenerator with screenshots', () => {
    it('should embed screenshot metadata in generated Puppeteer script', () => {
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
          selector: { primary: 'button', fallbacks: [] },
          page: { url: 'https://example.com', title: 'Example' },
          screenshot: 'abc123base64==',
        },
      ]

      const gen = new ScriptGenerator({ includeComments: true })
      const script = gen.generate('test', 'Task', actions)

      // Screenshot data should be accessible in the comment
      expect(script).toContain('abc123base64==')
    })
  })

  describe('PlaywrightGenerator with screenshots', () => {
    it('should embed screenshot metadata in generated Playwright script', () => {
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
          selector: { primary: 'button', fallbacks: [] },
          page: { url: 'https://example.com', title: 'Example' },
          screenshot: 'xyz456base64==',
        },
      ]

      const gen = new PlaywrightGenerator({ includeComments: true })
      const script = gen.generate('test', 'Task', actions)

      expect(script).toContain('xyz456base64==')
    })
  })

  describe('Screenshot quality options', () => {
    it('should pass encoding option to puppeteer screenshot', async () => {
      const recorder = new ActionRecorder(mockPage, { captureScreenshots: true })
      await recorder.start()

      const bridge = exposedFunctions.get('__recordActionBridge')!
      await bridge(JSON.stringify({
        type: 'click',
        selector: { primary: 'button', fallbacks: [] },
        page: { url: 'https://example.com', title: 'Example' },
      }))

      await recorder.stop()

      // Should call screenshot with base64 encoding
      expect(mockPage.screenshot).toHaveBeenCalledWith(
        expect.objectContaining({ encoding: 'base64' })
      )
    })
  })
})
