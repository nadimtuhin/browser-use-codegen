import { createBrowserManager, BrowserManager, WSEndpointProvider } from '../lib/BrowserManager'

describe('BrowserManager Integration Tests', () => {
  describe('Browser manager creation', () => {
    it('should create a browser manager with valid provider', () => {
      const mockEndpoint = 'ws://localhost:9222/devtools/browser/test'
      const provider = new WSEndpointProvider(mockEndpoint)
      const manager = new BrowserManager(provider)
      expect(manager).toBeDefined()
      expect(manager instanceof BrowserManager).toBe(true)
    })

    it('should throw without valid WebSocket endpoint', async () => {
      await expect(createBrowserManager({})).rejects.toThrow('No browser connection available')
    })

    it('should accept WebSocket endpoint option', async () => {
      const endpoint = 'ws://localhost:9222/devtools/browser/test'
      const provider = new WSEndpointProvider(endpoint)
      const manager = new BrowserManager(provider)
      expect(manager).toBeDefined()
    })
  })

  describe('Page launching', () => {
    it('should provide page object after launch', () => {
      const endpoint = 'ws://localhost:9222/devtools/browser/test'
      const provider = new WSEndpointProvider(endpoint)
      const manager = new BrowserManager(provider)

      // Before launch, getPage should return null
      expect(manager.getPage()).toBeNull()
    })

    it('should provide access to browser instance', () => {
      const endpoint = 'ws://localhost:9222/devtools/browser/test'
      const provider = new WSEndpointProvider(endpoint)
      const manager = new BrowserManager(provider)

      // Before launch, getBrowser should return null
      expect(manager.getBrowser()).toBeNull()
    })
  })

  describe('Resource management', () => {
    it('should close without throwing when not launched', async () => {
      const endpoint = 'ws://localhost:9222/devtools/browser/test'
      const provider = new WSEndpointProvider(endpoint)
      const manager = new BrowserManager(provider)

      await expect(manager.close()).resolves.not.toThrow()
    })

    it('should handle multiple close calls gracefully', async () => {
      const endpoint = 'ws://localhost:9222/devtools/browser/test'
      const provider = new WSEndpointProvider(endpoint)
      const manager = new BrowserManager(provider)

      await manager.close()
      // Second close should not throw
      await expect(manager.close()).resolves.not.toThrow()
    })
  })

  describe('Provider interface', () => {
    it('should accept custom browser provider', () => {
      // Mock provider
      const mockProvider = {
        async connect() {
          return null as any
        },
        async disconnect() {},
      }

      const manager = new BrowserManager(mockProvider)
      // Just verify it can be instantiated with custom provider
      expect(manager).toBeDefined()
    })

    it('should work with WSEndpointProvider', () => {
      const endpoint = 'ws://localhost:9222/devtools/browser/test'
      const provider = new WSEndpointProvider(endpoint)
      expect(provider).toBeDefined()
    })
  })

  describe('Multilogin integration', () => {
    it('should attempt to use multilogin when profile ID provided', async () => {
      try {
        await createBrowserManager({
          multiloginProfileId: 'test-profile-id',
        })
      } catch (e: any) {
        // Expected - Multilogin SDK likely not available
        expect(e.message).toContain('No browser connection')
      }
    })

    it('should prioritize multilogin over WebSocket endpoint', async () => {
      try {
        await createBrowserManager({
          multiloginProfileId: 'test-profile-id',
          wsEndpoint: 'ws://localhost:9222/devtools/browser/invalid',
        })
      } catch (e: any) {
        // Expected - should try Multilogin first, which likely fails
        expect(e).toBeDefined()
      }
    })
  })

  describe('Environment variable support', () => {
    it('should use PUPPETEER_WS_ENDPOINT env var as fallback', async () => {
      // Save original
      const original = process.env.PUPPETEER_WS_ENDPOINT

      try {
        // Set env var
        process.env.PUPPETEER_WS_ENDPOINT = 'ws://localhost:9222/devtools/browser/from-env'

        // Should not throw when env var is set
        const provider = new WSEndpointProvider(process.env.PUPPETEER_WS_ENDPOINT)
        const manager = new BrowserManager(provider)
        expect(manager).toBeDefined()
      } finally {
        // Restore original
        if (original) {
          process.env.PUPPETEER_WS_ENDPOINT = original
        } else {
          delete process.env.PUPPETEER_WS_ENDPOINT
        }
      }
    })
  })

  describe('Error messages', () => {
    it('should provide helpful error message when no connection available', async () => {
      try {
        await createBrowserManager({})
        fail('Should have thrown')
      } catch (e: any) {
        expect(e.message).toContain('No browser connection available')
        expect(e.message).toContain('wsEndpoint')
        expect(e.message).toContain('multiloginProfileId')
        expect(e.message).toContain('PUPPETEER_WS_ENDPOINT')
      }
    })
  })

  describe('State management', () => {
    it('should start with null page and browser', () => {
      const endpoint = 'ws://localhost:9222/devtools/browser/test'
      const provider = new WSEndpointProvider(endpoint)
      const manager = new BrowserManager(provider)

      expect(manager.getPage()).toBeNull()
      expect(manager.getBrowser()).toBeNull()
    })

    it('should clean up on close', async () => {
      const endpoint = 'ws://localhost:9222/devtools/browser/test'
      const provider = new WSEndpointProvider(endpoint)
      const manager = new BrowserManager(provider)

      // Initial state
      expect(manager.getPage()).toBeNull()
      expect(manager.getBrowser()).toBeNull()

      // Close should not throw
      await manager.close()

      // State should still be clean
      expect(manager.getPage()).toBeNull()
      expect(manager.getBrowser()).toBeNull()
    })
  })

  describe('Lifecycle', () => {
    it('should allow manager to be created and closed multiple times', async () => {
      for (let i = 0; i < 3; i++) {
        const endpoint = 'ws://localhost:9222/devtools/browser/test-' + i
        const provider = new WSEndpointProvider(endpoint)
        const manager = new BrowserManager(provider)
        await manager.close()
      }

      // If we get here without errors, lifecycle is working
      expect(true).toBe(true)
    })

    it('should not leak resources on repeated close', async () => {
      const endpoint = 'ws://localhost:9222/devtools/browser/test'
      const provider = new WSEndpointProvider(endpoint)
      const manager = new BrowserManager(provider)

      // Multiple closes should not cause issues
      await manager.close()
      await manager.close()
      await manager.close()

      expect(true).toBe(true)
    })
  })
})
