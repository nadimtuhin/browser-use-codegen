# Examples

This directory contains usage examples for `browser-use-codegen`.

## Autonomous Mode (No WebSocket Required!) ⭐

These examples work WITHOUT any browser setup - Chrome is launched automatically!

### Autonomous CLI

```bash
# Scrape prothomalo headlines (fully autonomous)
npx autonomous-scrape prothomalo

# Scrape with validation tests
npx autonomous-scrape prothomalo --test --verbose

# Scrape any URL
npx autonomous-scrape url=https://example.com/news

# Save to JSON
npx autonomous-scrape prothomalo --output=headlines.json --max=100

# Visible browser (for debugging)
npx autonomous-scrape prothomalo --headless=false
```

### Autonomous Examples

```bash
# Basic autonomous scraping
npx tsx examples/autonomous-usage.ts basic

# One-liner scraping
npx tsx examples/autonomous-usage.ts oneliner

# Scraping with validation
npx tsx examples/autonomous-usage.ts validation

# Visible browser (see the browser window)
npx tsx examples/autonomous-usage.ts visible

# Custom site
npx tsx examples/autonomous-usage.ts custom https://news.ycombinator.com
```

### Prothomalo Headlines with Self-Test

```bash
# Requires WebSocket endpoint (see setup below)
export PUPPETEER_WS_ENDPOINT=ws://localhost:9222/devtools/browser/...
npx tsx examples/prothomalo-headlines.ts --test --verbose
```

## WebSocket Mode (Remote Debugging)

For recording custom interactions, you need Chrome running with remote debugging:

### Setup

```bash
# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chrome-debug

# Get WebSocket URL
curl http://localhost:9222/json/version
```

### Basic Usage Example

```bash
export PUPPETEER_WS_ENDPOINT=ws://localhost:9222/devtools/browser/...
npx tsx examples/basic-usage.ts
```

### Multilogin Integration

```bash
export PUPPETEER_WS_ENDPOINT=ws://localhost:9222/devtools/browser/...
export MULTILOGIN_PROFILE_ID=your-profile-id
export MULTILOGIN_API_KEY=your-api-key
npx tsx examples/multilogin-integration.ts
```

## Generating Standalone Scrapers

Use the CLI to generate standalone headline scraper scripts:

```bash
# Generate prothomalo scraper
npx generate-scraper prothomalo --output=generated/prothomalo.ts

# Generate custom news site scraper
npx generate-scraper news --url=https://example.com/news --output=generated/news.ts

# Options
npx generate-scraper prothomalo --no-tests --output=scraper.ts
npx generate-scraper prothomalo --max-headlines=100 --min-title-length=15
```

## Using Self-Test Utilities

Import validation utilities in your own scrapers:

```typescript
import { 
  testSelectors,
  extractHeadlines,
  runValidation,
  printValidationResults,
  DEFAULT_HEADLINE_SELECTORS,
  // Autonomous mode (no WebSocket!)
  launchAutonomous,
  scrapeHeadlinesAutonomous,
  isAutonomousAvailable,
} from '@fb-mkt/browser-use-codegen'

// Autonomous scraping - no WebSocket needed!
if (isAutonomousAvailable()) {
  const result = await scrapeHeadlinesAutonomous('https://example.com')
  console.log(`Found ${result.headlines.length} headlines`)
}

// Or with manual control
const session = await launchAutonomous({ headless: true })
const headlines = await extractHeadlines(session.page, 'https://example.com')
await session.close()

// Test selectors
const selectorTests = await testSelectors(page, DEFAULT_HEADLINE_SELECTORS)

// Validate results
const validation = runValidation(headlines, selectorTests)
printValidationResults(validation)
```

## Creating Your Own Integration

See `multilogin-integration.ts` for an example of implementing a custom `BrowserProvider`.

## Comparison: Autonomous vs WebSocket Mode

| Feature | Autonomous Mode | WebSocket Mode |
|---------|----------------|----------------|
| Chrome Setup | None needed | Must start with --remote-debugging-port |
| WebSocket URL | Not needed | Required |
| Use Case | Quick scraping, headlines | Recording interactions, complex automation |
| Speed | Fast (direct launch) | Fast (connect to existing) |
| Headless | Yes (configurable) | Depends on connected browser |
| Best For | Automated scraping, CI/CD | Interactive recording, debugging |

## Troubleshooting

### Chrome Not Found (Autonomous Mode)

If you get "Chrome not found" error:

```bash
# macOS
brew install --cask google-chrome

# Ubuntu/Debian
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'
sudo apt-get update
sudo apt-get install google-chrome-stable

# Or set environment variable
export PUPPETEER_EXECUTABLE_PATH=/path/to/chrome
```

### WebSocket Connection Issues

```bash
# Verify Chrome is running with debugging
curl http://localhost:9222/json/version

# Should return webSocketDebuggerUrl
```
