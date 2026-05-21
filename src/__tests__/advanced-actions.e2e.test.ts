import { ActionRecorder } from '../lib/ActionRecorder'
import { ScriptGenerator } from '../lib/ScriptGenerator'
import { PlaywrightGenerator } from '../lib/PlaywrightGenerator'
import { SeleniumGenerator } from '../lib/SeleniumGenerator'
import { RecordedAction } from '../types'

describe('Advanced Action Types Integration Tests', () => {
  describe('Drag and Drop action', () => {
    it('should generate drag action in Puppeteer', () => {
      const actions: RecordedAction[] = [
        {
          type: 'navigate',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          page: { url: 'https://example.com', title: 'Example' },
        },
        {
          type: 'drag',
          timestamp: Date.now(),
          selector: { primary: '[data-draggable]', fallbacks: [] },
          value: '[data-droppable]', // target selector
          page: { url: 'https://example.com', title: 'Example' },
        },
      ]

      const gen = new ScriptGenerator({ includeComments: true })
      const script = gen.generate('test', 'Drag and drop test', actions)

      expect(script).toContain('drag')
      expect(script).toContain('[data-draggable]')
      expect(script).toContain('[data-droppable]')
    })

    it('should generate drag action in Playwright', () => {
      const actions: RecordedAction[] = [
        {
          type: 'navigate',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          page: { url: 'https://example.com', title: 'Example' },
        },
        {
          type: 'drag',
          timestamp: Date.now(),
          selector: { primary: '.draggable', fallbacks: [] },
          value: '.droppable',
          page: { url: 'https://example.com', title: 'Example' },
        },
      ]

      const gen = new PlaywrightGenerator()
      const script = gen.generate('test', 'Drag task', actions)

      expect(script).toContain('drag_to')
    })

    it('should generate drag action in Selenium', () => {
      const actions: RecordedAction[] = [
        {
          type: 'navigate',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          page: { url: 'https://example.com', title: 'Example' },
        },
        {
          type: 'drag',
          timestamp: Date.now(),
          selector: { primary: '#item1', fallbacks: [] },
          value: '#item2',
          page: { url: 'https://example.com', title: 'Example' },
        },
      ]

      const gen = new SeleniumGenerator()
      const script = gen.generate('test', 'Drag task', actions)

      expect(script).toContain('drag_and_drop')
    })
  })

  describe('File Upload action', () => {
    it('should generate file upload in Puppeteer', () => {
      const actions: RecordedAction[] = [
        {
          type: 'navigate',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          page: { url: 'https://example.com', title: 'Example' },
        },
        {
          type: 'upload',
          timestamp: Date.now(),
          selector: { primary: 'input[type="file"]', fallbacks: [] },
          value: '/path/to/file.txt',
          page: { url: 'https://example.com', title: 'Example' },
        },
      ]

      const gen = new ScriptGenerator()
      const script = gen.generate('test', 'Upload file', actions)

      expect(script).toContain('upload')
      expect(script).toContain('/path/to/file.txt')
    })

    it('should generate file upload in Playwright', () => {
      const actions: RecordedAction[] = [
        {
          type: 'navigate',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          page: { url: 'https://example.com', title: 'Example' },
        },
        {
          type: 'upload',
          timestamp: Date.now(),
          selector: { primary: '#file-input', fallbacks: [] },
          value: '/path/to/document.pdf',
          page: { url: 'https://example.com', title: 'Example' },
        },
      ]

      const gen = new PlaywrightGenerator()
      const script = gen.generate('test', 'Upload task', actions)

      expect(script).toContain('set_input_files')
    })

    it('should generate file upload in Selenium', () => {
      const actions: RecordedAction[] = [
        {
          type: 'navigate',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          page: { url: 'https://example.com', title: 'Example' },
        },
        {
          type: 'upload',
          timestamp: Date.now(),
          selector: { primary: '[name="attachment"]', fallbacks: [] },
          value: '/path/to/file.xlsx',
          page: { url: 'https://example.com', title: 'Example' },
        },
      ]

      const gen = new SeleniumGenerator()
      const script = gen.generate('test', 'Upload task', actions)

      expect(script).toContain('send_keys')
      expect(script).toContain('file.xlsx')
    })
  })

  describe('Keyboard shortcut action', () => {
    it('should generate keyboard action in Puppeteer', () => {
      const actions: RecordedAction[] = [
        {
          type: 'navigate',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          page: { url: 'https://example.com', title: 'Example' },
        },
        {
          type: 'keyboard',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          value: 'ctrl+a',
          page: { url: 'https://example.com', title: 'Example' },
        },
      ]

      const gen = new ScriptGenerator()
      const script = gen.generate('test', 'Keyboard shortcut', actions)

      expect(script).toContain('keyboard')
      expect(script).toMatch(/ctrl\+a|KeyboardEvent/)
    })

    it('should generate keyboard action with multiple keys in Puppeteer', () => {
      const actions: RecordedAction[] = [
        {
          type: 'navigate',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          page: { url: 'https://example.com', title: 'Example' },
        },
        {
          type: 'keyboard',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          value: 'cmd+z',
          page: { url: 'https://example.com', title: 'Example' },
        },
      ]

      const gen = new ScriptGenerator()
      const script = gen.generate('test', 'Undo action', actions)

      expect(script).toContain('cmd+z')
    })

    it('should generate keyboard action in Playwright', () => {
      const actions: RecordedAction[] = [
        {
          type: 'navigate',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          page: { url: 'https://example.com', title: 'Example' },
        },
        {
          type: 'keyboard',
          timestamp: Date.now(),
          selector: { primary: 'input', fallbacks: [] },
          value: 'shift+Home',
          page: { url: 'https://example.com', title: 'Example' },
        },
      ]

      const gen = new PlaywrightGenerator()
      const script = gen.generate('test', 'Select to home', actions)

      expect(script).toContain('press')
    })

    it('should generate keyboard action in Selenium', () => {
      const actions: RecordedAction[] = [
        {
          type: 'navigate',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          page: { url: 'https://example.com', title: 'Example' },
        },
        {
          type: 'keyboard',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          value: 'ctrl+shift+Delete',
          page: { url: 'https://example.com', title: 'Example' },
        },
      ]

      const gen = new SeleniumGenerator()
      const script = gen.generate('test', 'Clear cache', actions)

      expect(script).toContain('Keys')
    })
  })

  describe('Full workflow with advanced actions', () => {
    it('should generate complete workflow with drag, upload, and keyboard', () => {
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
          selector: { primary: 'input[type="file"]', fallbacks: [] },
          value: '/path/to/image.png',
          page: { url: 'https://example.com/upload', title: 'Upload' },
        },
        {
          type: 'click',
          timestamp: Date.now(),
          selector: { primary: '.crop-tool', fallbacks: [] },
          page: { url: 'https://example.com/upload', title: 'Upload' },
        },
        {
          type: 'drag',
          timestamp: Date.now(),
          selector: { primary: '.crop-handle', fallbacks: [] },
          value: '',
          page: { url: 'https://example.com/upload', title: 'Upload' },
        },
        {
          type: 'keyboard',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          value: 'ctrl+s',
          page: { url: 'https://example.com/upload', title: 'Upload' },
        },
      ]

      const gen = new ScriptGenerator()
      const script = gen.generate('upload-workflow', 'Upload and crop image', actions)

      expect(script).toContain('upload')
      expect(script).toContain('drag')
      expect(script).toContain('ctrl+s')
      expect(script).toContain('image.png')

      const stepMatches = (script.match(/\/\/ Step \d+:/g) || []).length
      expect(stepMatches).toBe(actions.length)
    })
  })

  describe('ScriptReplay with advanced actions', () => {
    it('should support replaying drag actions', async () => {
      const { ScriptReplay } = require('../lib/ScriptReplay')

      const mockElement = {
        boundingBox: jest.fn().mockResolvedValue({ x: 0, y: 0, width: 50, height: 50 }),
      }

      const mockPage = {
        goto: jest.fn().mockResolvedValue(undefined),
        $: jest.fn().mockResolvedValue(mockElement),
        mouse: {
          move: jest.fn().mockResolvedValue(undefined),
          down: jest.fn().mockResolvedValue(undefined),
          up: jest.fn().mockResolvedValue(undefined),
        },
        evaluate: jest.fn().mockResolvedValue(undefined),
      }

      const replay = new ScriptReplay(mockPage, { stopOnError: false })

      const actions: RecordedAction[] = [
        {
          type: 'navigate',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          page: { url: 'https://example.com', title: 'Example' },
        },
        {
          type: 'drag',
          timestamp: Date.now(),
          selector: { primary: '.draggable', fallbacks: [] },
          value: '.droppable',
          page: { url: 'https://example.com', title: 'Example' },
        },
      ]

      const result = await replay.run(actions)
      expect(result.success).toBe(true)
      expect(result.actionsExecuted).toBe(2)
    })

    it('should support replaying file uploads', async () => {
      const { ScriptReplay } = require('../lib/ScriptReplay')

      const mockPage = {
        goto: jest.fn().mockResolvedValue(undefined),
        $: jest.fn().mockResolvedValue({
          uploadFile: jest.fn().mockResolvedValue(undefined),
        }),
      }

      const replay = new ScriptReplay(mockPage, { stopOnError: false })

      const actions: RecordedAction[] = [
        {
          type: 'navigate',
          timestamp: Date.now(),
          selector: { primary: 'body', fallbacks: [] },
          page: { url: 'https://example.com', title: 'Example' },
        },
        {
          type: 'upload',
          timestamp: Date.now(),
          selector: { primary: 'input[type="file"]', fallbacks: [] },
          value: '/path/to/file.txt',
          page: { url: 'https://example.com', title: 'Example' },
        },
      ]

      const result = await replay.run(actions)
      expect(result.actionsExecuted).toBeGreaterThanOrEqual(1)
    })
  })
})
