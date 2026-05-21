/**
 * browser-use-codegen
 * 
 * Generate Puppeteer scripts by recording browser actions.
 * 
 * @example
 * ```typescript
 * import { ActionRecorder, ScriptGenerator, createBrowserManager } from '@fb-mkt/browser-use-codegen'
 * 
 * const manager = await createBrowserManager({ wsEndpoint: 'ws://...' })
 * const page = await manager.launch()
 * 
 * const recorder = new ActionRecorder(page)
 * await recorder.start()
 * 
 * // User performs actions...
 * 
 * const actions = await recorder.stop()
 * const generator = new ScriptGenerator()
 * const code = generator.generate('profile-1', 'My task', actions)
 * ```
 */

export { ActionRecorder } from './lib/ActionRecorder'
export { AIAssistedRecorder } from './lib/AIAssistedRecorder'
export { ScriptGenerator } from './lib/ScriptGenerator'
export { BrowserUseGenerator } from './lib/BrowserUseGenerator'
export { PlaywrightGenerator, type PlaywrightGeneratorOptions } from './lib/PlaywrightGenerator'
export { SeleniumGenerator, type SeleniumGeneratorOptions } from './lib/SeleniumGenerator'
export {
  ScriptReplay,
  type ScriptReplayOptions,
  type ReplayResult,
  type ActionResult,
} from './lib/ScriptReplay'

export {
  ErrorRecovery,
  type RetryConfig,
  type RetryResult,
  type FallbackResult,
  type WaitResult,
  type DegradedResult,
  type ErrorClassification,
} from './lib/ErrorRecovery'
export { ActionEnhancer } from './lib/ActionEnhancer'
export {
  BrowserCompatibility,
  BrowserType,
  type BrowserConfig,
} from './lib/BrowserCompatibility'
export {
  ApiInteraction,
  type ApiRequest,
  type ApiResponse,
  type ApiAssertion,
  type ApiValidation,
} from './lib/ApiInteraction'
export { 
  BrowserManager, 
  createBrowserManager,
  WSEndpointProvider,
  type BrowserProvider 
} from './lib/BrowserManager'
export {
  validateHeadlines,
  testSelectors,
  runValidation,
  printValidationResults,
  extractHeadlines,
  DEFAULT_HEADLINE_SELECTORS,
  type ValidationTest,
  type ValidationResult,
  type HeadlineData,
  type SelectorTest,
} from './lib/ScraperValidator'

export {
  generateHeadlineScraper,
  generateProthomaloScraper,
  generateNewsScraper,
  type HeadlineScraperOptions,
} from './lib/HeadlineScraperGenerator'

// Autonomous browser (no WebSocket required)
export {
  launchAutonomous,
  scrapeHeadlinesAutonomous,
  findChromeExecutable,
  isAutonomousAvailable,
  getChromeSetupInstructions,
  type AutonomousOptions,
  type AutonomousSession,
} from './lib/AutonomousBrowser'

// Types
export type {
  ActionType,
  SelectorInfo,
  TargetInfo,
  PageInfo,
  RecordedAction,
  RecorderOptions,
  ScriptGeneratorOptions,
  BrowserSessionConfig,
  GenerationResult,
} from './types'

// Re-export AI types from the AI recorder
export type { AIAssistedOptions } from './lib/AIAssistedRecorder'

// Re-export for convenience
export { MultiloginProvider, createMultiloginProvider } from './lib/MultiloginProvider'
