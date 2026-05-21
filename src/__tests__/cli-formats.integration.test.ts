import { execSync } from 'child_process'
import { join } from 'path'

describe('CLI Format Support Integration Tests', () => {
  const binPath = join(__dirname, '../../bin/cli.js')
  const projectRoot = join(__dirname, '../..')

  describe('--format option', () => {
    it('should accept playwright as a format', () => {
      const output = execSync(`node ${binPath} --help`, {
        cwd: projectRoot,
        encoding: 'utf-8',
      })
      expect(output).toContain('playwright')
    })

    it('should accept selenium as a format', () => {
      const output = execSync(`node ${binPath} --help`, {
        cwd: projectRoot,
        encoding: 'utf-8',
      })
      expect(output).toContain('selenium')
    })

    it('should list all supported formats in help', () => {
      const output = execSync(`node ${binPath} --help`, {
        cwd: projectRoot,
        encoding: 'utf-8',
      })
      expect(output).toContain('puppeteer')
      expect(output).toContain('browser-use')
      expect(output).toContain('playwright')
      expect(output).toContain('selenium')
    })
  })

  describe('generate-scraper format support', () => {
    const generateBin = join(__dirname, '../../bin/generate-scraper.js')

    it('should accept playwright format', () => {
      const output = execSync(`node ${generateBin} --help`, {
        cwd: projectRoot,
        encoding: 'utf-8',
      })
      expect(output).toContain('playwright')
    })

    it('should accept selenium format', () => {
      const output = execSync(`node ${generateBin} --help`, {
        cwd: projectRoot,
        encoding: 'utf-8',
      })
      expect(output).toContain('selenium')
    })
  })
})
