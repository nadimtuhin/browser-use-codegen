import { ScriptGenerator } from '../lib/ScriptGenerator'
import { PlaywrightGenerator } from '../lib/PlaywrightGenerator'
import { SeleniumGenerator } from '../lib/SeleniumGenerator'
import { ScriptReplay } from '../lib/ScriptReplay'
import { ActionEnhancer } from '../lib/ActionEnhancer'
import { SelectorStrategy } from '../lib/SelectorStrategy'
import { RecordedAction } from '../types'

interface BenchmarkResult {
  name: string
  durationMs: number
  iterations: number
  averageMs: number
  minMs: number
  maxMs: number
}

describe('Performance Benchmarks', () => {
  let mockPage: any
  let enhancer: ActionEnhancer
  let strategy: SelectorStrategy

  beforeEach(() => {
    mockPage = {
      goto: jest.fn().mockResolvedValue(undefined),
      $: jest.fn().mockResolvedValue({ click: jest.fn(), type: jest.fn() }),
      evaluate: jest.fn().mockResolvedValue(undefined),
      keyboard: { press: jest.fn().mockResolvedValue(undefined) },
      mouse: {
        move: jest.fn().mockResolvedValue(undefined),
        down: jest.fn().mockResolvedValue(undefined),
        up: jest.fn().mockResolvedValue(undefined),
      },
      screenshot: jest.fn().mockResolvedValue(Buffer.from('screenshot')),
      waitForSelector: jest.fn().mockResolvedValue(undefined),
    }
    enhancer = new ActionEnhancer()
    strategy = new SelectorStrategy()
  })

  describe('Code Generation Performance', () => {
    it('should benchmark Puppeteer code generation speed', () => {
      const actions: RecordedAction[] = Array.from({ length: 50 }, (_, i) => ({
        type: 'click' as const,
        timestamp: Date.now(),
        selector: { primary: `[data-testid="btn-${i}"]`, fallbacks: [] },
        page: { url: 'https://example.com', title: 'Test' },
      }))

      const generator = new ScriptGenerator()
      const iterations = 100

      const times: number[] = []
      for (let i = 0; i < iterations; i++) {
        const start = performance.now()
        generator.generate('profile-1', 'Test workflow', actions)
        times.push(performance.now() - start)
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length
      expect(avgTime).toBeLessThan(50) // Should be fast
      expect(times.every(t => t > 0)).toBe(true)
    })

    it('should benchmark Playwright code generation speed', () => {
      const actions: RecordedAction[] = Array.from({ length: 50 }, (_, i) => ({
        type: 'click' as const,
        timestamp: Date.now(),
        selector: { primary: `[data-testid="btn-${i}"]`, fallbacks: [] },
        page: { url: 'https://example.com', title: 'Test' },
      }))

      const generator = new PlaywrightGenerator()
      const iterations = 100

      const times: number[] = []
      for (let i = 0; i < iterations; i++) {
        const start = performance.now()
        generator.generate('profile-1', 'Test workflow', actions)
        times.push(performance.now() - start)
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length
      expect(avgTime).toBeLessThan(50)
    })

    it('should benchmark Selenium code generation speed', () => {
      const actions: RecordedAction[] = Array.from({ length: 50 }, (_, i) => ({
        type: 'click' as const,
        timestamp: Date.now(),
        selector: { primary: `[data-testid="btn-${i}"]`, fallbacks: [] },
        page: { url: 'https://example.com', title: 'Test' },
      }))

      const generator = new SeleniumGenerator()
      const iterations = 100

      const times: number[] = []
      for (let i = 0; i < iterations; i++) {
        const start = performance.now()
        generator.generate('profile-1', 'Test workflow', actions)
        times.push(performance.now() - start)
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length
      expect(avgTime).toBeLessThan(50)
    })

    it('should compare generator performance', () => {
      const actions: RecordedAction[] = Array.from({ length: 30 }, (_, i) => ({
        type: i % 3 === 0 ? 'click' : i % 3 === 1 ? 'input' : 'wait',
        timestamp: Date.now(),
        selector: { primary: `[data-testid="elem-${i}"]`, fallbacks: [] },
        value: i % 3 === 1 ? 'test value' : i % 3 === 2 ? '1000' : undefined,
        page: { url: 'https://example.com', title: 'Test' },
      })) as RecordedAction[]

      const puppeteerGen = new ScriptGenerator()
      const playwrightGen = new PlaywrightGenerator()
      const seleniumGen = new SeleniumGenerator()

      const iterations = 50

      const puppeteerTimes: number[] = []
      for (let i = 0; i < iterations; i++) {
        const start = performance.now()
        puppeteerGen.generate('p-1', 'Test', actions)
        puppeteerTimes.push(performance.now() - start)
      }

      const playwrightTimes: number[] = []
      for (let i = 0; i < iterations; i++) {
        const start = performance.now()
        playwrightGen.generate('pw-1', 'Test', actions)
        playwrightTimes.push(performance.now() - start)
      }

      const seleniumTimes: number[] = []
      for (let i = 0; i < iterations; i++) {
        const start = performance.now()
        seleniumGen.generate('sel-1', 'Test', actions)
        seleniumTimes.push(performance.now() - start)
      }

      const puppeteerAvg = puppeteerTimes.reduce((a, b) => a + b) / iterations
      const playwrightAvg = playwrightTimes.reduce((a, b) => a + b) / iterations
      const seleniumAvg = seleniumTimes.reduce((a, b) => a + b) / iterations

      expect(puppeteerAvg).toBeLessThan(100)
      expect(playwrightAvg).toBeLessThan(100)
      expect(seleniumAvg).toBeLessThan(100)
    })
  })

  describe('Selector Processing Performance', () => {
    it('should benchmark selector enhancement speed', () => {
      const actions: RecordedAction[] = Array.from({ length: 100 }, (_, i) => ({
        type: 'click' as const,
        timestamp: Date.now(),
        selector: { primary: `[data-testid="item-${i}"]`, fallbacks: [] },
        page: { url: 'https://example.com', title: 'Test' },
      }))

      const iterations = 50

      const times: number[] = []
      for (let i = 0; i < iterations; i++) {
        const start = performance.now()
        enhancer.enhanceActions(actions)
        times.push(performance.now() - start)
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length
      expect(avgTime).toBeLessThan(200) // Enhancement should be relatively fast
    })

    it('should benchmark selector ranking speed', () => {
      const selectors = Array.from({ length: 100 }, (_, i) => `selector-${i}`)
      const iterations = 100

      const times: number[] = []
      for (let i = 0; i < iterations; i++) {
        const start = performance.now()
        strategy.rankSelectors(selectors)
        times.push(performance.now() - start)
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length
      expect(avgTime).toBeLessThan(50)
    })

    it('should benchmark fallback chain generation', () => {
      const iterations = 100

      const times: number[] = []
      for (let i = 0; i < iterations; i++) {
        const start = performance.now()
        strategy.generateFallbackChain('[data-testid="complex-selector"]')
        times.push(performance.now() - start)
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length
      expect(avgTime).toBeLessThan(10)
    })

    it('should scale with increasing selector complexity', () => {
      const complexSelectors = [
        'button',
        'button.primary',
        'div.container > button.primary',
        'div.container > button.primary:nth-child(2)',
        'div[data-parent="main"] > section > button.primary:nth-child(2)',
      ]

      const times: number[] = []
      for (const selector of complexSelectors) {
        const start = performance.now()
        for (let i = 0; i < 100; i++) {
          strategy.rankSelectors([selector])
        }
        times.push(performance.now() - start)
      }

      // All should complete reasonably fast
      expect(times.every(t => t < 50)).toBe(true)
    })
  })

  describe('Script Replay Performance', () => {
    it('should benchmark replay execution speed', async () => {
      const actions: RecordedAction[] = Array.from({ length: 20 }, (_, i) => ({
        type: i % 2 === 0 ? 'click' : 'input',
        timestamp: Date.now(),
        selector: { primary: `[data-testid="elem-${i}"]`, fallbacks: [] },
        value: i % 2 === 1 ? 'test' : undefined,
        page: { url: 'https://example.com', title: 'Test' },
      })) as RecordedAction[]

      const replay = new ScriptReplay(mockPage)
      const iterations = 10

      const times: number[] = []
      for (let i = 0; i < iterations; i++) {
        const start = performance.now()
        await replay.run(actions)
        times.push(performance.now() - start)
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length
      expect(avgTime).toBeGreaterThan(0)
      expect(times.every(t => t >= 0)).toBe(true)
    })

    it('should benchmark replay with error recovery', async () => {
      const actions: RecordedAction[] = Array.from({ length: 10 }, (_, i) => ({
        type: 'click' as const,
        timestamp: Date.now(),
        selector: { primary: `[data-testid="btn-${i}"]`, fallbacks: [] },
        page: { url: 'https://example.com', title: 'Test' },
      }))

      const replay = new ScriptReplay(mockPage, { enableErrorRecovery: true })
      const iterations = 10

      const times: number[] = []
      for (let i = 0; i < iterations; i++) {
        const start = performance.now()
        await replay.run(actions)
        times.push(performance.now() - start)
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length
      expect(avgTime).toBeGreaterThan(0)
    })

    it('should measure impact of error recovery on performance', async () => {
      const actions: RecordedAction[] = Array.from({ length: 15 }, (_, i) => ({
        type: 'click' as const,
        timestamp: Date.now(),
        selector: { primary: `[data-testid="btn-${i}"]`, fallbacks: [] },
        page: { url: 'https://example.com', title: 'Test' },
      }))

      const replayWithoutRecovery = new ScriptReplay(mockPage, { enableErrorRecovery: false })
      const replayWithRecovery = new ScriptReplay(mockPage, { enableErrorRecovery: true })

      const iterations = 5

      let withoutRecoveryTime = 0
      for (let i = 0; i < iterations; i++) {
        const start = performance.now()
        await replayWithoutRecovery.run(actions)
        withoutRecoveryTime += performance.now() - start
      }

      let withRecoveryTime = 0
      for (let i = 0; i < iterations; i++) {
        const start = performance.now()
        await replayWithRecovery.run(actions)
        withRecoveryTime += performance.now() - start
      }

      const overheadPercent = ((withRecoveryTime - withoutRecoveryTime) / withoutRecoveryTime) * 100

      // Error recovery adds minimal overhead when no errors occur
      expect(overheadPercent).toBeLessThan(50)
    })
  })

  describe('Memory and Scalability', () => {
    it('should handle large action sequences', () => {
      const largeActionSet = Array.from({ length: 1000 }, (_, i) => ({
        type: 'click' as const,
        timestamp: Date.now(),
        selector: { primary: `[data-testid="btn-${i}"]`, fallbacks: [] },
        page: { url: 'https://example.com', title: 'Test' },
      }))

      const generator = new ScriptGenerator()

      const start = performance.now()
      const code = generator.generate('large-1', 'Large workflow', largeActionSet)
      const duration = performance.now() - start

      expect(code.length).toBeGreaterThan(0)
      expect(duration).toBeLessThan(500) // Should handle 1000 actions quickly
    })

    it('should handle deep action enhancement', () => {
      const largeActionSet = Array.from({ length: 500 }, (_, i) => ({
        type: 'click' as const,
        timestamp: Date.now(),
        selector: { primary: `[data-testid="elem-${i}"]`, fallbacks: [] },
        page: { url: 'https://example.com', title: 'Test' },
      }))

      const start = performance.now()
      const enhanced = enhancer.enhanceActions(largeActionSet)
      const duration = performance.now() - start

      expect(enhanced.length).toBe(largeActionSet.length)
      expect(duration).toBeLessThan(300)
    })
  })

  describe('Consistency Benchmarks', () => {
    it('should produce consistent generation times', () => {
      const actions: RecordedAction[] = Array.from({ length: 30 }, (_, i) => ({
        type: 'click' as const,
        timestamp: Date.now(),
        selector: { primary: `[data-testid="btn-${i}"]`, fallbacks: [] },
        page: { url: 'https://example.com', title: 'Test' },
      }))

      const generator = new ScriptGenerator()
      const times: number[] = []

      for (let i = 0; i < 50; i++) {
        const start = performance.now()
        generator.generate(`profile-${i}`, 'Test workflow', actions)
        times.push(performance.now() - start)
      }

      const mean = times.reduce((a, b) => a + b, 0) / times.length
      const variance = times.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / times.length
      const stdDev = Math.sqrt(variance)

      // Standard deviation should be reasonable (acceptable variance in test env)
      expect(stdDev / mean).toBeLessThan(1)
    })

    it('should produce consistent selector enhancement times', () => {
      const actions: RecordedAction[] = Array.from({ length: 50 }, (_, i) => ({
        type: 'click' as const,
        timestamp: Date.now(),
        selector: { primary: `[data-testid="elem-${i}"]`, fallbacks: [] },
        page: { url: 'https://example.com', title: 'Test' },
      }))

      const times: number[] = []

      for (let i = 0; i < 30; i++) {
        const start = performance.now()
        enhancer.enhanceActions(actions)
        times.push(performance.now() - start)
      }

      const mean = times.reduce((a, b) => a + b, 0) / times.length
      const variance = times.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / times.length
      const stdDev = Math.sqrt(variance)

      // Timing variance is acceptable in test environment
      expect(stdDev / mean).toBeLessThan(2)
    })
  })
})
