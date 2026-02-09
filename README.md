# browser-use-codegen

Generate Puppeteer scripts by recording browser actions - inspired by browser-use but focused on code generation.

## Overview

This tool records your browser interactions and generates automation scripts in multiple formats:

- **Puppeteer** (TypeScript/JavaScript) - Direct browser control
- **Browser-Use** (Python) - AI-powered automation

```
┌─────────────────────────────────────────────────────────┐
│  1. Connect to browser (Chrome remote or Multilogin)   │
│  2. Perform actions in browser                          │
│  3. (Optional) Use AI mode for smart suggestions        │
│  4. Type "done"                                         │
│  5. Get generated script (Puppeteer or Browser-Use)     │
└─────────────────────────────────────────────────────────┘
```

## Installation

### Global (CLI usage)
```bash
npm install -g @fb-mkt/browser-use-codegen
```

### Local (programmatic usage)
```bash
npm install @fb-mkt/browser-use-codegen
```

## Quick Start

### Option 1: Autonomous Mode (No Setup Required!) ⭐

The easiest way - no Chrome setup, no WebSocket, fully automatic:

```bash
# Scrape headlines autonomously (auto-finds and launches Chrome)
npx autonomous-scrape prothomalo

# Scrape any URL
npx autonomous-scrape url=https://example.com/news

# With validation tests
npx autonomous-scrape prothomalo --test --verbose

# Save to JSON file
npx autonomous-scrape prothomalo --output=headlines.json

# Visible browser (for debugging)
npx autonomous-scrape prothomalo --headless=false
```

### Option 2: Chrome Remote Debugging

For recording custom interactions:

```bash
# 1. Start Chrome with Remote Debugging
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chrome-debug

# 2. Get WebSocket endpoint
curl http://localhost:9222/json/version

# 3. Record and Generate
browser-use-codegen \
  --wsEndpoint=ws://localhost:9222/devtools/browser/... \
  "Scrape product listings"
```

## CLI Usage

```bash
browser-use-codegen [options] [prompt]

Options:
  -w, --wsEndpoint <url>          WebSocket endpoint for browser
  -m, --multiloginProfileId <id>  Multilogin profile ID
  -o, --output <path>             Output file path
  -f, --format <format>           Output format: puppeteer | browser-use (default: puppeteer)
  --ai                            Enable AI-assisted recording
  --no-delays                     Skip delays between actions
  --no-comments                   Skip comments in generated code
  --screenshots                   Capture screenshots during recording
  --debug                         Enable debug logging
  -h, --help                      Display help

Commands:
  info                            Show setup information
```

## Output Formats

### Puppeteer (Default)

Generates TypeScript/JavaScript code using Puppeteer:

```typescript
export async function execute(page: Page): Promise<ScrapeResult> {
  const result: ScrapeResult = {}
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  // Step 1: navigate
  await page.goto('https://example.com', { waitUntil: 'networkidle2' })

  // Step 2: click
  {
    const selectors = ['[data-testid="submit"]', '#submit-btn']
    let element: ElementHandle<Element> | null = null
    for (const selector of selectors) {
      element = await page.$(selector)
      if (element) break
    }
    if (element) await element.click()
  }

  return result
}
```

### Browser-Use

Generates Python code using the [browser-use](https://github.com/browser-use/browser-use) library:

```python
import asyncio
from browser_use import Agent, Browser, BrowserConfig
from langchain_openai import ChatOpenAI

async def run_task():
    browser = Browser(config=BrowserConfig(headless=False))
    llm = ChatOpenAI(model="gpt-4o", temperature=0.0)
    
    agent = Agent(
        task="Scrape product listings",
        llm=llm,
        browser=browser,
        use_vision=True,
    )
    
    result = await agent.run()
    await browser.close()
    return result

asyncio.run(run_task())
```

To run browser-use scripts:
```bash
pip install browser-use langchain-openai
export OPENAI_API_KEY=your_key_here
python generated_script.py
```

## AI-Assisted Recording

Enable smart features with the `--ai` flag:

```bash
browser-use-codegen --wsEndpoint=ws://... --ai "My task"
```

Features:
- **Page Pattern Detection**: Auto-detects login forms, search pages, product pages
- **Extraction UI**: Click "📋 Mark for Extraction" button to select fields
- **Smart Suggestions**: Tips based on your actions ("You clicked on prices, extract listing data?")
- **Selector Validation**: Checks if selectors work on current page
- **Field Auto-Detection**: Finds prices, titles, descriptions automatically

## Programmatic Usage

### Autonomous Scraping (No WebSocket!)

```typescript
import { 
  scrapeHeadlinesAutonomous,
  launchAutonomous,
  isAutonomousAvailable 
} from '@fb-mkt/browser-use-codegen'

// Check if Chrome is available
if (!isAutonomousAvailable()) {
  console.log('Please install Chrome')
  process.exit(1)
}

// One-liner scraping - fully autonomous!
const result = await scrapeHeadlinesAutonomous(
  'https://www.prothomalo.com',
  {
    headless: true,
    maxHeadlines: 20,
    minTitleLength: 10,
  }
)

console.log(`Found ${result.headlines.length} headlines`)
console.log(`Scrape time: ${result.stats.scrapeTime}ms`)

// Or manually control the browser
const session = await launchAutonomous({ headless: true })

try {
  const page = session.page
  await page.goto('https://example.com')
  // ... perform actions ...
} finally {
  await session.close()
}
```

### Basic Recording (WebSocket Required)

```typescript
import { 
  ActionRecorder, 
  ScriptGenerator, 
  createBrowserManager 
} from '@fb-mkt/browser-use-codegen'

const manager = await createBrowserManager({ 
  wsEndpoint: 'ws://localhost:9222/devtools/browser/...' 
})

const page = await manager.launch()
const recorder = new ActionRecorder(page)

await recorder.start()
// ... user performs actions ...
const actions = await recorder.stop()

const generator = new ScriptGenerator()
const code = generator.generate('profile', 'Task', actions)
```

### AI-Assisted Recording

```typescript
import { AIAssistedRecorder } from '@fb-mkt/browser-use-codegen'

const recorder = new AIAssistedRecorder(page, {
  suggestExtractions: true,
  detectPatterns: true,
  validateSelectors: true,
})

await recorder.start()

// Access suggestions
const suggestions = recorder.getSuggestions()

// Auto-detect fields
const fields = await recorder.autoDetectFields()

// Validate selectors
const validation = await recorder.validateSelectors()
```

### Browser-Use Generation

```typescript
import { BrowserUseGenerator } from '@fb-mkt/browser-use-codegen'

const generator = new BrowserUseGenerator()
const pythonCode = generator.generate(profileId, prompt, actions)
```

### Headline Scraper Generation

Generate standalone scrapers for news sites with built-in self-testing:

```bash
# Generate prothomalo scraper
npx generate-scraper prothomalo --output=scraper.ts

# Generate custom news site scraper  
npx generate-scraper news --url=https://example.com --output=scraper.ts
```

Programmatic usage:

```typescript
import { 
  generateProthomaloScraper,
  generateNewsScraper,
  generateHeadlineScraper 
} from '@fb-mkt/browser-use-codegen'

// Generate prothomalo scraper
const code = generateProthomaloScraper()

// Generate custom scraper
const code = generateNewsScraper('My News Site', 'https://example.com/news')

// Full customization
const code = generateHeadlineScraper({
  url: 'https://example.com',
  baseUrl: 'https://example.com',
  minTitleLength: 10,
  maxHeadlines: 50,
  includeSelfTest: true,
  includeSelectorTests: true,
})
```

Use validation utilities in your own scrapers:

```typescript
import { 
  testSelectors,
  extractHeadlines,
  runValidation,
  printValidationResults 
} from '@fb-mkt/browser-use-codegen'

// Run tests on a page
const selectorTests = await testSelectors(page, [
  { name: 'h1 headlines', selector: 'h1 a' },
  { name: 'h2 headlines', selector: 'h2 a' },
])

// Extract and validate
const headlines = await extractHeadlines(page, 'https://example.com')
const validation = runValidation(headlines, selectorTests)
printValidationResults(validation)
```

## Examples

See the `examples/` directory:

```bash
# Basic Puppeteer generation
npx tsx examples/basic-usage.ts

# Browser-Use Python generation
npx tsx examples/browser-use-format.ts

# AI-assisted with suggestions
npx tsx examples/ai-assisted.ts

# Multilogin integration
npx tsx examples/multilogin-integration.ts

# Prothomalo headlines scraper with self-test
npx tsx examples/prothomalo-headlines.ts --test
```

## Multilogin Integration

For teams using Multilogin, implement a custom provider:

```typescript
import { BrowserManager, type BrowserProvider } from '@fb-mkt/browser-use-codegen'

class MyMultiloginProvider implements BrowserProvider {
  async connect() {
    const puppeteer = await import('puppeteer-core')
    // Your Multilogin API integration
    const wsEndpoint = await startMultiloginBrowser(profileId)
    return await puppeteer.connect({ browserWSEndpoint: wsEndpoint })
  }
  
  async disconnect(browser) {
    await browser.disconnect()
  }
}

const manager = new BrowserManager(new MyMultiloginProvider())
```

## How It Works

### Action Recording
Injects JavaScript into the browser to capture:
- Clicks (with robust selectors)
- Input/typing
- Select dropdowns
- Scroll events
- Navigation
- Custom extractions (via UI overlay)

### Selector Generation
Creates multiple fallback selectors:
1. `data-testid` (best)
2. `aria-label`
3. ID
4. CSS classes
5. Tag name (fallback)

### Code Generation
- **Puppeteer**: ES5-compatible code for `page.evaluate()`
- **Browser-Use**: Python with both AI agent and step-by-step modes

## Browser-Use vs Puppeteer

| Feature | Puppeteer | Browser-Use |
|---------|-----------|-------------|
| Language | TypeScript/JavaScript | Python |
| AI-powered | No | Yes (optional) |
| Control | Deterministic | AI + Deterministic |
| Visual understanding | No | Yes (with vision) |
| Best for | Reliable automation | Complex/variable tasks |

## Troubleshooting

### Connection Issues
```bash
# Verify Chrome is running with debugging
curl http://localhost:9222/json/version

# Should return webSocketDebuggerUrl
```

### Selectors Not Working
Use `--ai` mode for validation and auto-detection.

### Browser-Use Not Working
```bash
# Install dependencies
pip install browser-use langchain-openai playwright
playwright install chromium

# Set API key
export OPENAI_API_KEY=sk-...
```

## Roadmap

- [x] Browser-use Python output
- [x] AI-assisted recording
- [ ] Screenshot capture during recording
- [ ] Script replay/verification mode
- [ ] Export to Playwright
- [ ] Export to Selenium

## License

MIT
