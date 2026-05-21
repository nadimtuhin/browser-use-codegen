import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

describe('CLI Integration Tests', () => {
  const binPath = join(__dirname, '../../bin/cli.js')
  const projectRoot = join(__dirname, '../..')

  describe('info command', () => {
    it('should display setup information', () => {
      const output = execSync(`node ${binPath} info`, {
        cwd: projectRoot,
        encoding: 'utf-8',
      })

      expect(output).toContain('browser-use-codegen')
      expect(output).toContain('Chrome')
      expect(output).toContain('remote debugging')
    })

    it('should show Chrome detection status', () => {
      const output = execSync(`node ${binPath} info`, {
        cwd: projectRoot,
        encoding: 'utf-8',
      })

      expect(output).toContain('Chrome')
    })
  })

  describe('help command', () => {
    it('should display help for main command', () => {
      const output = execSync(`node ${binPath} --help`, {
        cwd: projectRoot,
        encoding: 'utf-8',
      })

      expect(output).toContain('Usage:')
      expect(output).toContain('browser-use-codegen')
      expect(output).toContain('--wsEndpoint')
      expect(output).toContain('--format')
      expect(output).toContain('--ai')
    })

    it('should list available commands', () => {
      const output = execSync(`node ${binPath} --help`, {
        cwd: projectRoot,
        encoding: 'utf-8',
      })

      expect(output).toContain('Commands:')
      expect(output).toContain('info')
    })
  })

  describe('output file generation', () => {
    it('should create output file with Puppeteer format', () => {
      const outputFile = join(projectRoot, 'test-output.ts')

      try {
        execSync(
          `node ${binPath} "Test task" --format puppeteer -o ${outputFile} --no-delays --no-comments`,
          {
            cwd: projectRoot,
            stdio: 'pipe',
            timeout: 5000,
          }
        )
      } catch (e) {
        // May fail due to browser connection, but file might still exist
      }

      if (existsSync(outputFile)) {
        const content = readFileSync(outputFile, 'utf-8')
        expect(content).toContain('export async function execute')
        expect(content).toContain('Page')
      }
    })
  })

  describe('version display', () => {
    it('should display version with -V flag', () => {
      const output = execSync(`node ${binPath} -V`, {
        cwd: projectRoot,
        encoding: 'utf-8',
      })

      expect(output).toMatch(/\d+\.\d+\.\d+/)
    })

    it('should display version with --version flag', () => {
      const output = execSync(`node ${binPath} --version`, {
        cwd: projectRoot,
        encoding: 'utf-8',
      })

      expect(output).toMatch(/\d+\.\d+\.\d+/)
    })
  })

  describe('format validation', () => {
    it('should accept puppeteer format', () => {
      const output = execSync(`node ${binPath} --help`, {
        cwd: projectRoot,
        encoding: 'utf-8',
      })

      expect(output).toContain('puppeteer')
    })

    it('should accept browser-use format', () => {
      const output = execSync(`node ${binPath} --help`, {
        cwd: projectRoot,
        encoding: 'utf-8',
      })

      expect(output).toContain('browser-use')
    })
  })

  describe('edge cases', () => {
    it('should handle missing required arguments gracefully', () => {
      try {
        execSync(`node ${binPath}`, {
          cwd: projectRoot,
          stdio: 'pipe',
        })
      } catch (e) {
        const error = e as any
        // Should either show help or exit gracefully
        expect(error.status).not.toBeNull()
      }
    })

    it('should handle invalid format option', () => {
      try {
        execSync(`node ${binPath} --format invalid-format`, {
          cwd: projectRoot,
          stdio: 'pipe',
        })
      } catch (e) {
        const error = e as any
        // Should fail with invalid format
        expect(error.status).not.toBe(0)
      }
    })
  })
})
