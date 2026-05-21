import { launchAutonomous, isAutonomousAvailable } from '../lib/AutonomousBrowser'

describe('Autonomous Scraper Integration Tests', () => {
  describe('Chrome availability detection', () => {
    it('should detect if Chrome is available on the system', () => {
      const available = isAutonomousAvailable()
      expect(typeof available).toBe('boolean')
    })

    it('should return false or true, not throw', () => {
      expect(() => {
        isAutonomousAvailable()
      }).not.toThrow()
    })
  })

  describe('Browser launch', () => {
    it('should launch browser session when Chrome is available', async () => {
      if (!isAutonomousAvailable()) {
        console.log('Chrome not available on this system, skipping test')
        return
      }

      const session = await launchAutonomous({ headless: true })
      expect(session).toBeDefined()
      expect(session.page).toBeDefined()
      expect(session.browser).toBeDefined()
      expect(typeof session.close).toBe('function')

      await session.close()
    })

    it('should provide a working page object', async () => {
      if (!isAutonomousAvailable()) {
        return
      }

      const session = await launchAutonomous({ headless: true })

      try {
        expect(typeof session.page.goto).toBe('function')
        expect(typeof session.page.evaluate).toBe('function')
        expect(typeof session.page.$).toBe('function')
        expect(typeof session.page.$$).toBe('function')
      } finally {
        await session.close()
      }
    })

    it('should navigate to URLs', async () => {
      if (!isAutonomousAvailable()) {
        return
      }

      const session = await launchAutonomous({ headless: true })

      try {
        // Try to navigate to a data URL to avoid network calls
        const dataUrl = 'data:text/html,<h1>Test Page</h1>'
        await session.page.goto(dataUrl)

        const title = await session.page.title()
        expect(title).toBeTruthy()
      } finally {
        await session.close()
      }
    })

    it('should close browser gracefully', async () => {
      if (!isAutonomousAvailable()) {
        return
      }

      const session = await launchAutonomous({ headless: true })
      await expect(session.close()).resolves.not.toThrow()
    })
  })

  describe('Browser configuration', () => {
    it('should respect headless option', async () => {
      if (!isAutonomousAvailable()) {
        return
      }

      // Just verify it doesn't throw with headless option
      const sessionHeadless = await launchAutonomous({ headless: true })
      expect(sessionHeadless).toBeDefined()
      await sessionHeadless.close()

      // Headless false might not work in CI, so just ensure option is accepted
      const sessionVisible = await launchAutonomous({ headless: false })
      expect(sessionVisible).toBeDefined()
      await sessionVisible.close()
    })

    it('should allow custom launch options', async () => {
      if (!isAutonomousAvailable()) {
        return
      }

      const session = await launchAutonomous({
        headless: true,
        args: ['--disable-extensions'],
      })

      expect(session).toBeDefined()
      await session.close()
    })
  })

  describe('Page interaction', () => {
    it('should execute JavaScript in page context', async () => {
      if (!isAutonomousAvailable()) {
        return
      }

      const session = await launchAutonomous({ headless: true })

      try {
        const dataUrl = 'data:text/html,<h1>Test</h1>'
        await session.page.goto(dataUrl)

        const result = await session.page.evaluate(() => {
          return document.title
        })

        expect(result).toBeTruthy()
      } finally {
        await session.close()
      }
    })

    it('should extract DOM content', async () => {
      if (!isAutonomousAvailable()) {
        return
      }

      const session = await launchAutonomous({ headless: true })

      try {
        const html = `
          <html>
            <body>
              <h1 id="title">Test Title</h1>
              <p class="description">Test description</p>
            </body>
          </html>
        `
        const dataUrl = `data:text/html,${encodeURIComponent(html)}`
        await session.page.goto(dataUrl)

        const title = await session.page.$eval('#title', (el: any) => el.textContent)
        expect(title).toBe('Test Title')

        const description = await session.page.$eval('.description', (el: any) => el.textContent)
        expect(description).toBe('Test description')
      } finally {
        await session.close()
      }
    })

    it('should find multiple elements', async () => {
      if (!isAutonomousAvailable()) {
        return
      }

      const session = await launchAutonomous({ headless: true })

      try {
        const html = `
          <html>
            <body>
              <div class="item">Item 1</div>
              <div class="item">Item 2</div>
              <div class="item">Item 3</div>
            </body>
          </html>
        `
        const dataUrl = `data:text/html,${encodeURIComponent(html)}`
        await session.page.goto(dataUrl)

        const items = await session.page.$$('.item')
        expect(items.length).toBe(3)
      } finally {
        await session.close()
      }
    })
  })

  describe('Error handling', () => {
    it('should handle navigation errors gracefully', async () => {
      if (!isAutonomousAvailable()) {
        return
      }

      const session = await launchAutonomous({ headless: true })

      try {
        // Navigate to an invalid URL - might timeout but should not crash
        try {
          await session.page.goto('http://invalid.example.local', {
            timeout: 2000,
            waitUntil: 'networkidle2',
          })
        } catch (e) {
          // Expected to fail, but browser should still be responsive
          expect(e).toBeDefined()
        }

        // Browser should still be usable
        const dataUrl = 'data:text/html,<h1>Still Works</h1>'
        await session.page.goto(dataUrl)
        const title = await session.page.title()
        expect(title).toBeTruthy()
      } finally {
        await session.close()
      }
    })

    it('should handle missing elements gracefully', async () => {
      if (!isAutonomousAvailable()) {
        return
      }

      const session = await launchAutonomous({ headless: true })

      try {
        const dataUrl = 'data:text/html,<h1>Empty</h1>'
        await session.page.goto(dataUrl)

        const element = await session.page.$('.nonexistent')
        expect(element).toBeNull()

        const elements = await session.page.$$('.nonexistent')
        expect(elements).toEqual([])
      } finally {
        await session.close()
      }
    })
  })

  describe('Session cleanup', () => {
    it('should clean up browser resources on close', async () => {
      if (!isAutonomousAvailable()) {
        return
      }

      const session = await launchAutonomous({ headless: true })
      await session.close()

      // Verify session is closed - further operations should fail
      try {
        // This should fail since browser is closed
        await session.page.goto('data:text/html,<h1>Test</h1>')
      } catch (e) {
        // Expected - browser is closed
        expect(e).toBeDefined()
      }
    })

    it('should allow multiple sessions sequentially', async () => {
      if (!isAutonomousAvailable()) {
        return
      }

      // First session
      const session1 = await launchAutonomous({ headless: true })
      const dataUrl1 = 'data:text/html,<h1>Session 1</h1>'
      await session1.page.goto(dataUrl1)
      const title1 = await session1.page.title()
      expect(title1).toBeTruthy()
      await session1.close()

      // Second session - should work independently
      const session2 = await launchAutonomous({ headless: true })
      const dataUrl2 = 'data:text/html,<h1>Session 2</h1>'
      await session2.page.goto(dataUrl2)
      const title2 = await session2.page.title()
      expect(title2).toBeTruthy()
      await session2.close()
    })
  })
})
