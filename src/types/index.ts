/**
 * Types for the browser-use-codegen package
 */

export type ActionType =
  | 'click'
  | 'input'
  | 'navigate'
  | 'scroll'
  | 'select'
  | 'wait'
  | 'extract'
  | 'drag'
  | 'upload'
  | 'keyboard'

export interface SelectorInfo {
  primary: string
  fallbacks: string[]
}

export interface TargetInfo {
  tagName: string
  id?: string
  className?: string
  ariaLabel?: string
  text?: string
  href?: string
}

export interface PageInfo {
  url: string
  title: string
}

export interface RecordedAction {
  type: ActionType
  timestamp: number
  selector: SelectorInfo
  value?: string
  target?: TargetInfo
  page: PageInfo
  screenshot?: string
}

export interface RecorderOptions {
  debug?: boolean
  captureScreenshots?: boolean
  scrollDebounceMs?: number
  suggestExtractions?: boolean
}

export interface ScriptGeneratorOptions {
  includeComments?: boolean
  useAsyncAwait?: boolean
  addDelays?: boolean
}

export interface BrowserSessionConfig {
  profileId?: string
  headless?: boolean
  slowMo?: number
  viewport?: {
    width: number
    height: number
  }
}

export interface GenerationResult {
  code: string
  actions: RecordedAction[]
  timestamp: string
  prompt: string
}
