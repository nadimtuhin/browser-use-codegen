/**
 * Test: Generate Newspaper Scraper Script
 *
 * This script demonstrates browser-use-codegen by:
 * 1. Creating simulated actions on test-newspaper.html
 * 2. Generating Puppeteer script
 * 3. Generating Browser-Use script
 * 4. Saving generated scripts
 */

import * as fs from 'fs'
import * as path from 'path'
import {
  ScriptGenerator,
  BrowserUseGenerator,
  RecordedAction
} from '../src/index'

// Simulate recorded actions from interacting with the newspaper
const pageUrl = 'file://' + path.join(__dirname, 'test-newspaper.html')
const pageTitle = 'The Daily Chronicle - Breaking News'

const simulatedActions: RecordedAction[] = [
  {
    type: 'navigate',
    timestamp: Date.now(),
    selector: {
      primary: 'body',
      fallbacks: []
    },
    page: {
      url: pageUrl,
      title: pageTitle
    }
  },
  {
    type: 'wait',
    timestamp: Date.now() + 1000,
    selector: {
      primary: 'body',
      fallbacks: []
    },
    value: '2000',
    page: {
      url: pageUrl,
      title: pageTitle
    }
  },
  {
    type: 'extract',
    timestamp: Date.now() + 3000,
    selector: {
      primary: '.main-story h2',
      fallbacks: ['h2']
    },
    target: {
      tagName: 'H2',
      text: 'Quantum Computing Breakthrough: Scientists Achieve 99.9% Error Correction'
    },
    value: 'mainHeadline',
    page: {
      url: pageUrl,
      title: pageTitle
    }
  },
  {
    type: 'extract',
    timestamp: Date.now() + 4000,
    selector: {
      primary: '.main-story .meta',
      fallbacks: ['.meta']
    },
    target: {
      tagName: 'DIV',
      className: 'meta',
      text: 'By Sarah Johnson | February 10, 2026 | 5 min read'
    },
    value: 'mainStoryMeta',
    page: {
      url: pageUrl,
      title: pageTitle
    }
  },
  {
    type: 'extract',
    timestamp: Date.now() + 5000,
    selector: {
      primary: '.article',
      fallbacks: ['article']
    },
    target: {
      tagName: 'ARTICLE',
      className: 'article'
    },
    value: 'articles',
    page: {
      url: pageUrl,
      title: pageTitle
    }
  },
  {
    type: 'click',
    timestamp: Date.now() + 6000,
    selector: {
      primary: '.article[data-article-id="1"]',
      fallbacks: ['.article:first-child']
    },
    target: {
      tagName: 'ARTICLE',
      className: 'article',
      text: 'Global Climate Summit Reaches Historic Agreement'
    },
    page: {
      url: pageUrl,
      title: pageTitle
    }
  },
  {
    type: 'extract',
    timestamp: Date.now() + 7000,
    selector: {
      primary: '.article h3',
      fallbacks: ['h3']
    },
    target: {
      tagName: 'H3'
    },
    value: 'headlines',
    page: {
      url: pageUrl,
      title: pageTitle
    }
  },
  {
    type: 'input',
    timestamp: Date.now() + 8000,
    selector: {
      primary: '#email-input',
      fallbacks: ['input[type="email"]']
    },
    target: {
      tagName: 'INPUT',
      id: 'email-input',
      ariaLabel: 'Email address'
    },
    value: 'test@example.com',
    page: {
      url: pageUrl,
      title: pageTitle
    }
  },
  {
    type: 'click',
    timestamp: Date.now() + 9000,
    selector: {
      primary: '.newsletter button[type="submit"]',
      fallbacks: ['button[type="submit"]', '.newsletter button']
    },
    target: {
      tagName: 'BUTTON',
      text: 'Subscribe'
    },
    page: {
      url: pageUrl,
      title: pageTitle
    }
  },
  {
    type: 'scroll',
    timestamp: Date.now() + 10000,
    selector: {
      primary: 'body',
      fallbacks: ['html']
    },
    value: '500',
    page: {
      url: pageUrl,
      title: pageTitle
    }
  }
]

async function main() {
  console.log('🎬 Generating Newspaper Scraper Scripts\n')
  console.log('Simulated Actions:', simulatedActions.length)
  console.log('')

  // Generate Puppeteer Script
  console.log('📝 Generating Puppeteer Script...')
  const puppeteerGenerator = new ScriptGenerator({
    includeComments: true,
    addDelays: true
  })

  const puppeteerScript = puppeteerGenerator.generate(
    'newspaper-scraper',
    'Scrape headlines and articles from The Daily Chronicle',
    simulatedActions
  )

  const puppeteerPath = path.join(__dirname, 'generated', 'newspaper-scraper.ts')
  fs.mkdirSync(path.dirname(puppeteerPath), { recursive: true })
  fs.writeFileSync(puppeteerPath, puppeteerScript)
  console.log('✅ Puppeteer script saved to:', puppeteerPath)
  console.log('')

  // Generate Browser-Use Script
  console.log('🐍 Generating Browser-Use Python Script...')
  const browserUseGenerator = new BrowserUseGenerator({
    includeComments: true
  })

  const browserUseScript = browserUseGenerator.generate(
    'newspaper-scraper',
    'Scrape headlines and articles from The Daily Chronicle',
    simulatedActions
  )

  const browserUsePath = path.join(__dirname, 'generated', 'newspaper-scraper.py')
  fs.writeFileSync(browserUsePath, browserUseScript)
  console.log('✅ Browser-Use script saved to:', browserUsePath)
  console.log('')

  // Display generated scripts
  console.log('=' .repeat(80))
  console.log('GENERATED PUPPETEER SCRIPT')
  console.log('=' .repeat(80))
  console.log(puppeteerScript)
  console.log('')

  console.log('=' .repeat(80))
  console.log('GENERATED BROWSER-USE SCRIPT')
  console.log('=' .repeat(80))
  console.log(browserUseScript)
  console.log('')

  console.log('✨ Generation complete!')
  console.log('')
  console.log('To test the Puppeteer script:')
  console.log(`  npx tsx ${puppeteerPath}`)
  console.log('')
  console.log('To test the Browser-Use script:')
  console.log(`  python ${browserUsePath}`)
}

main().catch(console.error)
