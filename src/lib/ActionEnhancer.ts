import { RecordedAction } from '../types'
import { SelectorStrategy } from './SelectorStrategy'

/**
 * Enhances recorded actions with improved selectors using SelectorStrategy
 */
export class ActionEnhancer {
  private strategy: SelectorStrategy

  constructor() {
    this.strategy = new SelectorStrategy()
  }

  /**
   * Enhance action with better fallback chain and selector info
   */
  enhanceAction(action: RecordedAction): RecordedAction {
    const primary = action.selector.primary
    const selectorInfo = this.strategy.getSelectorInfo(primary)

    return {
      ...action,
      selector: {
        ...action.selector,
        primary: selectorInfo.primary,
        fallbacks: selectorInfo.fallbacks,
        xpaths: selectorInfo.xpaths,
      },
    }
  }

  /**
   * Enhance multiple actions
   */
  enhanceActions(actions: RecordedAction[]): RecordedAction[] {
    return actions.map(action => {
      if (action.type === 'navigate' || action.type === 'wait') {
        return action
      }
      return this.enhanceAction(action)
    })
  }

  /**
   * Get best selector for action based on performance
   */
  getBestSelector(action: RecordedAction): string {
    const selectors = [
      action.selector.primary,
      ...action.selector.fallbacks,
    ]
    const ranked = this.strategy.rankSelectors(selectors)
    return ranked[0]?.selector || action.selector.primary
  }

  /**
   * Get all viable selectors ranked by performance
   */
  getRankedSelectors(action: RecordedAction): string[] {
    const selectors = [
      action.selector.primary,
      ...action.selector.fallbacks,
    ]
    const ranked = this.strategy.rankSelectors(selectors)
    return ranked.map(r => r.selector)
  }

  /**
   * Validate all selectors in action
   */
  validateSelectors(action: RecordedAction): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    const selectors = [
      action.selector.primary,
      ...action.selector.fallbacks,
    ]

    selectors.forEach(selector => {
      if (selector.startsWith('//')) {
        if (!this.strategy.isValidXPath(selector)) {
          errors.push(`Invalid XPath: ${selector}`)
        }
      } else {
        if (!this.strategy.isValidCSSSelector(selector)) {
          errors.push(`Invalid CSS selector: ${selector}`)
        }
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Normalize selectors in action
   */
  normalizeSelectors(action: RecordedAction): RecordedAction {
    return {
      ...action,
      selector: {
        ...action.selector,
        primary: this.strategy.normalizeSelector(action.selector.primary),
        fallbacks: action.selector.fallbacks.map(s =>
          this.strategy.normalizeSelector(s)
        ),
        xpaths: action.selector.xpaths?.map(x =>
          this.strategy.normalizeSelector(x)
        ),
      },
    }
  }
}
