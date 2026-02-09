import { ActionRecorder } from '../lib/ActionRecorder'
import { RecordedAction } from '../types'

describe('ActionRecorder E2E', () => {
  let mockPage: any
  let recorder: ActionRecorder
  let exposedFunctions: Map<string, Function>

  beforeEach(() => {
    exposedFunctions = new Map()

    mockPage = {
      url: jest.fn().mockReturnValue('https://example.com'),
      title: jest.fn().mockResolvedValue('Example Page'),
      exposeFunction: jest.fn().mockImplementation((name: string, fn: Function) => {
        exposedFunctions.set(name, fn)
        return Promise.resolve()
      }),
      evaluateOnNewDocument: jest.fn().mockResolvedValue(undefined),
      evaluate: jest.fn().mockResolvedValue(undefined),
    }

    recorder = new ActionRecorder(mockPage, { debug: false })
  })

  describe('start()', () => {
    it('should initialize recording with initial navigate action', async () => {
      await recorder.start()

      const actions = recorder.getActions()

      expect(actions).toHaveLength(1)
      expect(actions[0].type).toBe('navigate')
      expect(actions[0].page.url).toBe('https://example.com')
      expect(actions[0].page.title).toBe('Example Page')
      expect(mockPage.exposeFunction).toHaveBeenCalledWith(
        '__recordActionBridge',
        expect.any(Function)
      )
      expect(mockPage.evaluateOnNewDocument).toHaveBeenCalled()
      expect(mockPage.evaluate).toHaveBeenCalled()
    })

    it('should not restart if already recording', async () => {
      await recorder.start()
      const firstCallCount = mockPage.exposeFunction.mock.calls.length

      await recorder.start()
      const secondCallCount = mockPage.exposeFunction.mock.calls.length

      expect(secondCallCount).toBe(firstCallCount)
    })

    it('should expose __recordActionBridge function to page', async () => {
      await recorder.start()

      expect(exposedFunctions.has('__recordActionBridge')).toBe(true)
    })
  })

  describe('stop()', () => {
    it('should stop recording and return actions', async () => {
      await recorder.start()

      const actions = await recorder.stop()

      expect(Array.isArray(actions)).toBe(true)
      expect(actions.length).toBeGreaterThanOrEqual(1)
    })

    it('should stop recording flag', async () => {
      await recorder.start()
      await recorder.stop()

      // After stopping, new actions should not be added
      const bridge = exposedFunctions.get('__recordActionBridge')!
      const actionJson = JSON.stringify({
        type: 'click',
        selector: { primary: 'button', fallbacks: [] },
      })

      const actionsBefore = recorder.getActions().length
      await bridge(actionJson)
      const actionsAfter = recorder.getActions().length

      expect(actionsAfter).toBe(actionsBefore)
    })
  })

  describe('recording click actions', () => {
    it('should record click action with selector', async () => {
      await recorder.start()

      const bridge = exposedFunctions.get('__recordActionBridge')!
      const clickAction = {
        type: 'click',
        selector: {
          primary: '[data-testid="submit-btn"]',
          fallbacks: ['#submit', 'button.primary'],
        },
        target: {
          tagName: 'button',
          id: 'submit',
          text: 'Submit',
        },
        page: {
          url: 'https://example.com/form',
          title: 'Form Page',
        },
      }

      await bridge(JSON.stringify(clickAction))

      const actions = recorder.getActions()
      const clickActions = actions.filter((a) => a.type === 'click')

      expect(clickActions).toHaveLength(1)
      expect(clickActions[0].selector.primary).toBe('[data-testid="submit-btn"]')
      expect(clickActions[0].selector.fallbacks).toEqual(['#submit', 'button.primary'])
      expect(clickActions[0].target?.tagName).toBe('button')
    })

    it('should add timestamp if missing', async () => {
      await recorder.start()

      const bridge = exposedFunctions.get('__recordActionBridge')!
      const actionWithoutTimestamp = {
        type: 'click',
        selector: { primary: 'button', fallbacks: [] },
      }

      await bridge(JSON.stringify(actionWithoutTimestamp))

      const actions = recorder.getActions()
      const lastAction = actions[actions.length - 1]

      expect(lastAction.timestamp).toBeDefined()
      expect(typeof lastAction.timestamp).toBe('number')
    })
  })

  describe('recording input actions', () => {
    it('should record input action with value', async () => {
      await recorder.start()

      const bridge = exposedFunctions.get('__recordActionBridge')!
      const inputAction = {
        type: 'input',
        selector: {
          primary: '[data-testid="email-input"]',
          fallbacks: ['#email'],
        },
        value: 'test@example.com',
        target: {
          tagName: 'input',
          id: 'email',
        },
        page: {
          url: 'https://example.com/form',
          title: 'Form',
        },
      }

      await bridge(JSON.stringify(inputAction))

      const actions = recorder.getActions()
      const inputActions = actions.filter((a) => a.type === 'input')

      expect(inputActions).toHaveLength(1)
      expect(inputActions[0].value).toBe('test@example.com')
      expect(inputActions[0].selector.primary).toBe('[data-testid="email-input"]')
    })
  })

  describe('recording navigation events', () => {
    it('should record initial navigation', async () => {
      await recorder.start()

      const actions = recorder.getActions()
      const navActions = actions.filter((a) => a.type === 'navigate')

      expect(navActions).toHaveLength(1)
      expect(navActions[0].page.url).toBe('https://example.com')
    })
  })

  describe('recording scroll actions', () => {
    it('should record scroll action with scroll value', async () => {
      await recorder.start()

      const bridge = exposedFunctions.get('__recordActionBridge')!
      const scrollAction = {
        type: 'scroll',
        selector: {
          primary: 'body',
          fallbacks: ['html'],
        },
        value: '500',
        page: {
          url: 'https://example.com',
          title: 'Example',
        },
      }

      await bridge(JSON.stringify(scrollAction))

      const actions = recorder.getActions()
      const scrollActions = actions.filter((a) => a.type === 'scroll')

      expect(scrollActions).toHaveLength(1)
      expect(scrollActions[0].value).toBe('500')
    })
  })

  describe('recording multiple actions in sequence', () => {
    it('should record multiple actions in order', async () => {
      await recorder.start()

      const bridge = exposedFunctions.get('__recordActionBridge')!

      const actions = [
        { type: 'click', selector: { primary: 'button', fallbacks: [] } },
        { type: 'input', selector: { primary: 'input', fallbacks: [] }, value: 'test' },
        { type: 'scroll', selector: { primary: 'body', fallbacks: [] }, value: '100' },
      ]

      for (const action of actions) {
        await bridge(JSON.stringify(action))
      }

      const recordedActions = recorder.getActions()

      // +1 for initial navigate action
      expect(recordedActions.length).toBe(actions.length + 1)
      expect(recordedActions[1].type).toBe('click')
      expect(recordedActions[2].type).toBe('input')
      expect(recordedActions[3].type).toBe('scroll')
    })
  })

  describe('error handling', () => {
    it('should handle invalid JSON gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      await recorder.start()

      const bridge = exposedFunctions.get('__recordActionBridge')!
      await bridge('invalid json {')

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to parse recorded action',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })

    it('should continue recording after error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      await recorder.start()

      const bridge = exposedFunctions.get('__recordActionBridge')!

      // Invalid JSON
      await bridge('invalid')

      // Valid action
      await bridge(JSON.stringify({
        type: 'click',
        selector: { primary: 'button', fallbacks: [] },
      }))

      const actions = recorder.getActions()
      expect(actions.length).toBeGreaterThan(1)

      consoleErrorSpy.mockRestore()
    })
  })

  describe('addExtractAction()', () => {
    it('should add extract action programmatically', async () => {
      await recorder.start()

      await recorder.addExtractAction('productPrice', '.price')

      const actions = recorder.getActions()
      const extractActions = actions.filter((a) => a.type === 'extract')

      expect(extractActions).toHaveLength(1)
      expect(extractActions[0].value).toBe('productPrice')
      expect(extractActions[0].selector.primary).toBe('.price')
    })
  })

  describe('addWaitAction()', () => {
    it('should add wait action programmatically', async () => {
      await recorder.start()

      await recorder.addWaitAction(2000)

      const actions = recorder.getActions()
      const waitActions = actions.filter((a) => a.type === 'wait')

      expect(waitActions).toHaveLength(1)
      expect(waitActions[0].value).toBe('2000')
    })
  })

  describe('clear()', () => {
    it('should clear all recorded actions', async () => {
      await recorder.start()

      const bridge = exposedFunctions.get('__recordActionBridge')!
      await bridge(JSON.stringify({
        type: 'click',
        selector: { primary: 'button', fallbacks: [] },
      }))

      expect(recorder.getActions().length).toBeGreaterThan(1)

      recorder.clear()

      expect(recorder.getActions()).toEqual([])
    })
  })

  describe('options', () => {
    it('should respect debug option', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()

      const debugRecorder = new ActionRecorder(mockPage, { debug: true })
      await debugRecorder.start()

      const bridge = exposedFunctions.get('__recordActionBridge')!
      await bridge(JSON.stringify({
        type: 'click',
        selector: { primary: 'button', fallbacks: [] },
      }))

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Recorder]',
        'click',
        'button'
      )

      consoleLogSpy.mockRestore()
    })
  })
})
