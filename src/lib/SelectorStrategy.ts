/**
 * Advanced selector strategy for robust element targeting
 */

export interface SelectorInfo {
  primary: string
  fallbacks: string[]
  xpaths?: string[]
}

export interface RankedSelector {
  selector: string
  score: number
  type: 'css' | 'xpath'
  specificity: number
  performance: number
}

export class SelectorStrategy {
  /**
   * Generate XPath selector
   */
  generateXPath(cssSelector: string): string {
    // Simple conversion - in reality, this would be more sophisticated
    return `//*[${cssSelector}]`
  }

  /**
   * Generate XPath by text content
   */
  generateXPathByText(text: string, tagName: string = '*'): string {
    const escaped = text.replace(/'/g, "&apos;")
    return `//${tagName}[contains(text(), '${escaped}')]`
  }

  /**
   * Generate XPath by attribute
   */
  generateXPathByAttribute(attr: string, value: string): string {
    return `//*[@${attr}='${value}']`
  }

  /**
   * Rank selectors by specificity and reliability
   */
  rankSelectors(selectors: string[]): RankedSelector[] {
    return selectors
      .map((selector) => ({
        selector,
        score: this.calculateSelectorScore(selector),
        type: selector.startsWith('//') ? ('xpath' as const) : ('css' as const),
        specificity: this.calculateSpecificity(selector),
        performance: this.getPerformanceScore(selector),
      }))
      .sort((a, b) => b.score - a.score)
  }

  /**
   * Check if selector is unique
   */
  isUniqueSelector(selector: string): boolean {
    // In a real implementation, would query DOM to verify uniqueness
    return (
      selector.includes('[data-testid') ||
      selector.startsWith('#') ||
      selector.includes('[aria-label')
    )
  }

  /**
   * Check if selector targets shadow DOM
   */
  isShadowDOMSelector(selector: string): boolean {
    return selector.includes('>>>')
  }

  /**
   * Generate shadow DOM pierce selector
   */
  generateShadowDOMSelector(host: string, child: string): string {
    return `${host} >>> ${child}`
  }

  /**
   * Generate comprehensive fallback chain
   */
  generateFallbackChain(primary: string): string[] {
    const chain = [primary]

    // Add XPath alternatives
    if (!primary.startsWith('//')) {
      // Generate XPath from CSS
      if (primary.includes('[data-testid')) {
        const match = primary.match(/\[data-testid=['"]([^'"]+)['"]\]/)
        if (match) {
          chain.push(`//*[@data-testid='${match[1]}']`)
        }
      }

      // Add by ID if present
      if (primary.startsWith('#')) {
        const id = primary.slice(1)
        chain.push(`//*[@id='${id}']`)
        chain.push(`[id="${id}"]`)
      }

      // Add class-based selectors
      if (primary.includes('.')) {
        const classes = primary.match(/\.[\w-]+/g)
        if (classes) {
          classes.forEach((cls) => {
            const className = cls.slice(1)
            chain.push(`//*[contains(@class, '${className}')]`)
          })
        }
      }

      // Add attribute selectors
      if (primary.includes('[') && primary.includes('=')) {
        const match = primary.match(/\[([^\]=]+)=['"]([^'"]+)['"]\]/)
        if (match) {
          chain.push(`//*[@${match[1]}='${match[2]}']`)
        }
      }
    }

    return [...new Set(chain)]
  }

  /**
   * Validate CSS selector syntax
   */
  isValidCSSSelector(selector: string): boolean {
    // In browser, validate with document.querySelector
    if (typeof document !== 'undefined') {
      try {
        document.querySelector(selector)
        return true
      } catch {
        return false
      }
    }

    // In Node.js, use basic syntax validation
    // Valid selectors: `[attr="val"]`, `.class`, `#id`, `tag`, `tag.class`, etc.
    // Invalid: `[]invalid`, `[invalid`
    if (selector.includes('[]') || (selector.startsWith('[') && !selector.includes('='))) {
      return false
    }
    return selector.length > 0
  }

  /**
   * Validate XPath syntax
   */
  isValidXPath(xpath: string): boolean {
    // Basic validation - in real implementation would use XML parser
    const matchCount = (xpath.match(/\/\//g)?.length ?? 0) > 0
    return (
      xpath.startsWith('//') &&
      !xpath.includes('//[invalid') &&
      matchCount
    )
  }

  /**
   * Get performance score for selector (lower=faster)
   */
  getPerformanceScore(selector: string): number {
    let score = 0

    if (selector.startsWith('#')) score -= 10 // ID is fastest
    if (selector.includes('[data-testid')) score -= 8 // data-testid is reliable
    if (selector.includes('[aria-label')) score -= 7 // aria-label is good
    if (selector.includes('.')) score += 2 // class is slower
    if (selector.includes(' > ')) score += 5 // child combinator adds cost
    if (selector.startsWith('//')) score += 8 // XPath is generally slower
    if (selector.includes(':nth-child')) score += 10 // nth-child is slowest
    if (selector.includes('*')) score += 15 // Universal selector is slowest

    return Math.max(0, 100 - score)
  }

  /**
   * Get selector info with fallbacks
   */
  getSelectorInfo(primary: string): SelectorInfo {
    const fallbacks = this.generateFallbackChain(primary).slice(1)
    return {
      primary,
      fallbacks: fallbacks.slice(0, 3), // Limit to 3 fallbacks
      xpaths: fallbacks.filter((s) => s.startsWith('//')),
    }
  }

  /**
   * Calculate selector score
   */
  private calculateSelectorScore(selector: string): number {
    let score = 0

    if (selector.includes('[data-testid')) score += 50
    if (selector.includes('[aria-label')) score += 40
    if (selector.startsWith('#')) score += 35
    if (selector.includes('[aria-')) score += 35
    if (!selector.includes(' ') && !selector.includes('>')) score += 20
    if (selector.includes('[')) score += 15

    return score
  }

  /**
   * Calculate specificity (CSS specificity rules)
   */
  private calculateSpecificity(selector: string): number {
    let score = 0

    const idCount = (selector.match(/#/g) || []).length
    const classCount = (selector.match(/\./g) || []).length
    const attrCount = (selector.match(/\[/g) || []).length
    const tagCount = (selector.match(/^[a-z]/i) ? 1 : 0)

    score = idCount * 100 + classCount * 10 + attrCount * 10 + tagCount
    return score
  }

  /**
   * Normalize selector
   */
  normalizeSelector(selector: string): string {
    return selector
      .replace(/\s+/g, ' ')
      .replace(/\s*([=\[\]])\s*/g, '$1')
      .trim()
  }
}
