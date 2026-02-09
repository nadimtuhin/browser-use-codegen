/**
 * AI-Assisted Action Recorder
 * 
 * Enhances recording with AI suggestions:
 * - Auto-detect form fields for extraction
 * - Suggest data extraction points
 * - Validate selectors
 * - Detect patterns (login forms, search, etc.)
 */
import { Page } from 'puppeteer-core'
import { ActionRecorder } from './ActionRecorder'
import { RecordedAction, RecorderOptions } from '../types'

export interface AIAssistedOptions extends RecorderOptions {
  openAIApiKey?: string
  suggestExtractions?: boolean
  detectPatterns?: boolean
  validateSelectors?: boolean
}

export class AIAssistedRecorder extends ActionRecorder {
  private aiOptions: AIAssistedOptions
  private suggestions: string[] = []

  constructor(page: Page, options: AIAssistedOptions = {}) {
    super(page, options)
    this.aiOptions = {
      suggestExtractions: true,
      detectPatterns: true,
      validateSelectors: true,
      ...options,
    }
  }

  async start(): Promise<void> {
    await super.start()
    
    if (this.aiOptions.suggestExtractions) {
      await this.injectExtractionUI()
    }
    
    if (this.aiOptions.detectPatterns) {
      await this.detectPagePattern()
    }
  }

  async stop(): Promise<RecordedAction[]> {
    const actions = await super.stop()
    
    if (this.aiOptions.suggestExtractions) {
      await this.suggestMissingExtractions(actions)
    }
    
    return actions
  }

  getSuggestions(): string[] {
    return this.suggestions
  }

  /**
   * Inject UI overlay for manual extraction marking
   */
  private async injectExtractionUI(): Promise<void> {
    const script = `
      (function() {
        if (window.__EXTRACTION_UI_ACTIVE) return;
        window.__EXTRACTION_UI_ACTIVE = true;
        
        // Create extraction button
        var btn = document.createElement('button');
        btn.id = '__extract-btn';
        btn.innerHTML = '📋 Mark for Extraction';
        btn.style.cssText = 
          'position:fixed;top:10px;right:10px;z-index:99999;' +
          'background:#4CAF50;color:white;border:none;' +
          'padding:10px 20px;border-radius:5px;cursor:pointer;' +
          'font-family:sans-serif;font-size:14px;box-shadow:0 2px 5px rgba(0,0,0,0.3);';
        
        var isSelecting = false;
        
        btn.onclick = function() {
          isSelecting = !isSelecting;
          btn.style.background = isSelecting ? '#f44336' : '#4CAF50';
          btn.innerHTML = isSelecting ? '❌ Click element to extract' : '📋 Mark for Extraction';
          document.body.style.cursor = isSelecting ? 'crosshair' : 'default';
        };
        
        document.body.appendChild(btn);
        
        // Handle element selection
        document.addEventListener('click', function(e) {
          if (!isSelecting) return;
          if (e.target.id === '__extract-btn') return;
          
          e.preventDefault();
          e.stopPropagation();
          
          isSelecting = false;
          btn.style.background = '#4CAF50';
          btn.innerHTML = '📋 Mark for Extraction';
          document.body.style.cursor = 'default';
          
          // Prompt for field name
          var fieldName = prompt('Enter field name for extraction:', 'field_' + Date.now());
          if (fieldName && window.__recordActionBridge) {
            var action = {
              type: 'extract',
              timestamp: Date.now(),
              selector: { primary: '', fallbacks: [] },
              value: fieldName,
              target: {
                tagName: e.target.tagName.toLowerCase(),
                text: (e.target.innerText || '').substring(0, 100)
              },
              page: {
                url: window.location.href,
                title: document.title
              }
            };
            window.__recordActionBridge(JSON.stringify(action));
            
            // Visual feedback
            var originalBorder = e.target.style.border;
            e.target.style.border = '3px solid #4CAF50';
            setTimeout(function() {
              e.target.style.border = originalBorder;
            }, 1000);
          }
        }, true);
        
        console.log('🔍 Extraction UI injected. Click "Mark for Extraction" to select fields.');
      })();
    `
    
    await this.page.evaluate(script)
  }

  /**
   * Detect page pattern and suggest actions
   */
  private async detectPagePattern(): Promise<void> {
    const pattern = await this.page.evaluate(() => {
      // Detect login form
      const hasPassword = document.querySelector('input[type="password"]') !== null
      const hasEmail = document.querySelector('input[type="email"], input[name*="email"], input[name*="username"]') !== null
      
      if (hasPassword && hasEmail) {
        return 'login_form'
      }
      
      // Detect search
      const hasSearch = document.querySelector('input[type="search"], input[name*="search"], input[placeholder*="search" i]') !== null
      if (hasSearch) {
        return 'search_page'
      }
      
      // Detect product/listing page
      const hasPrice = document.querySelector('[class*="price"], [data-testid*="price"]') !== null
      const hasProductTitle = document.querySelector('h1, [class*="title"], [data-testid*="title"]') !== null
      if (hasPrice && hasProductTitle) {
        return 'product_page'
      }
      
      return 'generic'
    })
    
    switch (pattern) {
      case 'login_form':
        this.suggestions.push('🔑 Login form detected - consider extracting success/error messages')
        break
      case 'search_page':
        this.suggestions.push('🔍 Search page detected - consider extracting results count')
        break
      case 'product_page':
        this.suggestions.push('🛍️ Product page detected - consider extracting price, title, description')
        break
    }
  }

  /**
   * Suggest missing extractions based on recorded actions
   */
  private async suggestMissingExtractions(actions: RecordedAction[]): Promise<void> {
    // Check if user clicked on elements that might contain data
    const clickedTexts = actions
      .filter(a => a.type === 'click')
      .map(a => a.target?.text)
      .filter(Boolean)
    
    const hasListings = clickedTexts.some(t => 
      t && (t.includes('$') || /\d+\.\d{2}/.test(t))
    )
    
    if (hasListings && !actions.some(a => a.type === 'extract')) {
      this.suggestions.push('💡 Tip: You clicked on elements with prices. Consider extracting listing data.')
    }
  }

  /**
   * AI-powered selector validation
   */
  async validateSelectors(): Promise<{ selector: string; valid: boolean; suggestion?: string }[]> {
    if (!this.aiOptions.validateSelectors) {
      return []
    }

    const actions = this.getActions()
    const results = []

    for (const action of actions) {
      if (!action.selector?.primary) continue

      try {
        const element = await this.page.$(action.selector.primary)
        if (!element) {
          results.push({
            selector: action.selector.primary,
            valid: false,
            suggestion: 'Element not found - DOM may have changed'
          })
        } else {
          results.push({
            selector: action.selector.primary,
            valid: true
          })
        }
      } catch (e) {
        results.push({
          selector: action.selector.primary,
          valid: false,
          suggestion: 'Invalid selector syntax'
        })
      }
    }

    return results
  }

  /**
   * Auto-detect extractable fields on current page
   */
  async autoDetectFields(): Promise<{ name: string; selector: string; sample: string }[]> {
    return await this.page.evaluate(() => {
      const fields: { name: string; selector: string; sample: string }[] = []
      
      // Price detection
      document.querySelectorAll('*').forEach((el: any) => {
        const text = el.innerText || el.textContent || ''
        
        // Price pattern
        if (/\$[\d,]+\.?\d{0,2}/.test(text) && el.children.length === 0) {
          fields.push({
            name: 'price',
            selector: el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ')[0] : ''),
            sample: text.trim().substring(0, 50)
          })
        }
        
        // Title pattern
        if (el.tagName === 'H1' || el.getAttribute('data-testid')?.includes('title')) {
          fields.push({
            name: 'title',
            selector: el.tagName.toLowerCase() + (el.id ? '#' + el.id : ''),
            sample: text.trim().substring(0, 50)
          })
        }
      })
      
      return fields.slice(0, 10) // Limit results
    })
  }
}
