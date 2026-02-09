import { Page } from 'puppeteer-core'
import { RecordedAction, RecorderOptions } from '../types'

export class ActionRecorder {
  protected page: Page
  private actions: RecordedAction[] = []
  private isRecording: boolean = false
  protected options: RecorderOptions

  constructor(page: Page, options: RecorderOptions = {}) {
    this.page = page
    this.options = {
      debug: false,
      captureScreenshots: false,
      scrollDebounceMs: 500,
      ...options,
    }
  }

  async start(): Promise<void> {
    if (this.isRecording) return
    this.isRecording = true
    this.actions = []

    // Setup bridge to receive actions from browser
    await this.page.exposeFunction(
      '__recordActionBridge',
      (actionJson: string) => {
        if (!this.isRecording) return
        try {
          const action = JSON.parse(actionJson)
          if (!action.timestamp) action.timestamp = Date.now()
          this.actions.push(action)
          if (this.options.debug) {
            console.log('[Recorder]', action.type, action.selector?.primary || '')
          }
        } catch (e) {
          console.error('Failed to parse recorded action', e)
        }
      }
    )

    // Inject the recording script
    const script = this.getInjectedScript()

    // Inject on every new document (navigation)
    await this.page.evaluateOnNewDocument(script)

    // Inject immediately into current page
    await this.page.evaluate(script)

    // Capture initial navigation
    if (this.actions.length === 0) {
      this.actions.push({
        type: 'navigate',
        timestamp: Date.now(),
        selector: { primary: 'body', fallbacks: [] },
        page: {
          url: this.page.url(),
          title: await this.page.title(),
        },
      })
    }
  }

  async stop(): Promise<RecordedAction[]> {
    this.isRecording = false
    return this.actions
  }

  getActions(): RecordedAction[] {
    return this.actions
  }

  clear(): void {
    this.actions = []
  }

  private getInjectedScript(): string {
    const scrollDebounce = this.options.scrollDebounceMs || 500
    
    return `
      (function() {
        if (window.__ACTION_RECORDER_ACTIVE) return;
        window.__ACTION_RECORDER_ACTIVE = true;

        // --- Helper: Trim String ---
        function trim(str) {
          return (str || '').replace(/^\\s+|\\s+$/g, '');
        }

        // --- Helper: Generate Selectors ---
        function getSelectors(el) {
          var primary = null;
          var fallbacks = [];

          // 1. data-testid (Best)
          var testId = el.getAttribute('data-testid');
          if (testId) {
            primary = '[data-testid="' + testId + '"]';
          }

          // 2. aria-label
          var ariaLabel = el.getAttribute('aria-label');
          if (ariaLabel) {
            var selector = '[aria-label="' + ariaLabel + '"]';
            if (!primary) primary = selector;
            else fallbacks.push(selector);
          }

          // 3. ID (validate unique)
          if (el.id) {
            var selector = '#' + el.id;
            if (!primary) primary = selector;
            else fallbacks.push(selector);
          }

          // 4. Role + Name
          var role = el.getAttribute('role');
          if (role) {
            var selector = '[role="' + role + '"]';
            if (ariaLabel) {
              selector += '[aria-label="' + ariaLabel + '"]';
            }
            if (!primary) primary = selector;
            else fallbacks.push(selector);
          }

          // 5. Class Path
          if (el.className && typeof el.className === 'string') {
            var classes = el.className.split(' ');
            var validClasses = [];
            for (var c = 0; c < classes.length; c++) {
              var cls = trim(classes[c]);
              if (cls && cls.indexOf(':') === -1) {
                validClasses.push('.' + cls);
              }
            }
            if (validClasses.length > 0) {
              fallbacks.push(validClasses.join(''));
            }
          }

          // 6. Tag Name (Last resort)
          fallbacks.push(el.tagName.toLowerCase());

          // Ensure primary exists
          if (!primary) {
            primary = fallbacks[0] || 'unknown';
          }

          return {
            primary: primary,
            fallbacks: fallbacks.slice(0, 3) // Limit fallbacks
          };
        }

        // --- Helper: Get Element Text ---
        function getElementText(el) {
          if (!el) return '';
          return (el.innerText || el.textContent || '').substring(0, 200);
        }

        // --- Helper: Send Action ---
        function sendAction(type, el, value) {
          if (!window.__recordActionBridge) return;

          try {
            var selectors = getSelectors(el);
            var action = {
              type: type,
              timestamp: Date.now(),
              selector: selectors,
              value: value,
              target: {
                tagName: el.tagName ? el.tagName.toLowerCase() : 'unknown',
                id: el.id || undefined,
                className: el.className || undefined,
                ariaLabel: el.getAttribute('aria-label') || undefined,
                text: getElementText(el),
                href: el.getAttribute('href') || undefined
              },
              page: {
                url: window.location.href,
                title: document.title
              }
            };

            window.__recordActionBridge(JSON.stringify(action));
          } catch (err) {
            console.error('ActionRecorder Error:', err);
          }
        }

        // --- Event Listeners ---

        // CLICK
        document.addEventListener('click', function(e) {
          if (!e.isTrusted) return;
          sendAction('click', e.target);
        }, true);

        // INPUT / CHANGE (for text inputs)
        var inputTimeout;
        document.addEventListener('input', function(e) {
          if (!e.isTrusted) return;
          var target = e.target;
          var tag = target.tagName.toLowerCase();
          if (tag === 'input' || tag === 'textarea') {
            // Debounce rapid input events
            if (inputTimeout) clearTimeout(inputTimeout);
            inputTimeout = setTimeout(function() {
              sendAction('input', target, target.value);
            }, 300);
          }
        }, true);

        // SELECT (for dropdowns)
        document.addEventListener('change', function(e) {
          if (!e.isTrusted) return;
          var target = e.target;
          var tag = target.tagName.toLowerCase();
          if (tag === 'select') {
            sendAction('select', target, target.value);
          }
        }, true);

        // SCROLL (Debounced)
        var scrollTimeout;
        document.addEventListener('scroll', function(e) {
          if (scrollTimeout) clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(function() {
             var target = e.target;
             if (target === document) {
               sendAction('scroll', document.body || document.documentElement, 
                 (window.scrollY || window.pageYOffset).toString());
             } else if (target && target.tagName) {
               sendAction('scroll', target, target.scrollTop.toString());
             }
          }, ${scrollDebounce});
        }, true);

        // KEYBOARD (for special keys like Enter)
        document.addEventListener('keydown', function(e) {
          if (!e.isTrusted) return;
          if (e.key === 'Enter' && e.target) {
            sendAction('input', e.target, e.target.value + '[Enter]');
          }
        }, true);

        console.log('🔴 Action Recorder Active');

      })();
    `
  }

  async addExtractAction(fieldName: string, selector: string): Promise<void> {
    const action: RecordedAction = {
      type: 'extract',
      timestamp: Date.now(),
      selector: { primary: selector, fallbacks: [] },
      value: fieldName,
      page: {
        url: this.page.url(),
        title: await this.page.title(),
      },
    }
    this.actions.push(action)
  }

  async addWaitAction(ms: number): Promise<void> {
    const action: RecordedAction = {
      type: 'wait',
      timestamp: Date.now(),
      selector: { primary: 'body', fallbacks: [] },
      value: ms.toString(),
      page: {
        url: this.page.url(),
        title: await this.page.title(),
      },
    }
    this.actions.push(action)
  }
}
