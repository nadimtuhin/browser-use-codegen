#!/usr/bin/env node
/**
 * browser-use-codegen CLI
 * 
 * Generate Puppeteer scripts by recording browser actions
 * 
 * Usage:
 *   browser-use-codegen --wsEndpoint=ws://localhost:9222 "Scrape product prices"
 *   browser-use-codegen --multiloginProfileId=abc123 "Login and export data"
 */

import { Command } from 'commander'
import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'
import chalk from 'chalk'
import ora from 'ora'
import { ActionRecorder } from './lib/ActionRecorder'
import { AIAssistedRecorder } from './lib/AIAssistedRecorder'
import { ScriptGenerator } from './lib/ScriptGenerator'
import { BrowserUseGenerator } from './lib/BrowserUseGenerator'
import { createBrowserManager } from './lib/BrowserManager'

const program = new Command()

program
  .name('browser-use-codegen')
  .description('Generate Puppeteer scripts by recording browser actions')
  .version('1.0.0')
  .argument('[prompt]', 'Description of the task to automate', 'Automated Task')
  .option('-w, --wsEndpoint <url>', 'WebSocket endpoint for browser connection')
  .option('-m, --multiloginProfileId <id>', 'Multilogin profile ID')
  .option('-o, --output <path>', 'Output file path')
  .option('--no-delays', 'Skip adding delays between actions')
  .option('--no-comments', 'Skip adding comments to generated code')
  .option('--screenshots', 'Capture screenshots during recording')
  .option('--ai', 'Enable AI-assisted recording (extraction suggestions)')
  .option('-f, --format <format>', 'Output format: puppeteer | browser-use', 'puppeteer')
  .option('--debug', 'Enable debug logging')
  .action(async (prompt: string, options) => {
    const output = options.output || generateDefaultOutputPath()
    
    console.log(chalk.cyan.bold('\n🎬 Browser Use Codegen\n'))
    console.log(chalk.gray('Recording browser actions and generating Puppeteer scripts\n'))
    console.log(`${chalk.bold('Task:')} ${prompt}`)
    console.log(`${chalk.bold('Output:')} ${output}\n`)

    let browserManager: Awaited<ReturnType<typeof createBrowserManager>> | null = null
    let spinner: ora.Ora | null = null

    try {
      // Connect to browser
      spinner = ora('Connecting to browser...').start()
      browserManager = await createBrowserManager({
        wsEndpoint: options.wsEndpoint,
        multiloginProfileId: options.multiloginProfileId,
      })
      
      const page = await browserManager.launch()
      spinner.succeed('Browser connected')

      // Start recording
      const RecorderClass = options.ai ? AIAssistedRecorder : ActionRecorder
      const recorder = new RecorderClass(page, {
        debug: options.debug,
        captureScreenshots: options.screenshots,
        suggestExtractions: options.ai,
      })
      
      await recorder.start()

      console.log(chalk.green('\n🔴 Recording started!'))
      console.log(chalk.gray('Perform your actions in the browser window.'))
      console.log(chalk.gray('When done, return here and type "done" or press Ctrl+C\n'))

      // Wait for user to finish
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      })

      await new Promise<void>((resolve) => {
        rl.question(chalk.yellow('Type "done" when finished: '), (answer) => {
          rl.close()
          resolve()
        })

        // Also resolve on Ctrl+C
        rl.on('SIGINT', () => {
          rl.close()
          resolve()
        })
      })

      // Stop recording
      spinner = ora('Stopping recorder...').start()
      const actions = await recorder.stop()
      spinner.succeed(`Recorded ${actions.length} actions`)

      if (actions.length === 0) {
        console.log(chalk.yellow('\n⚠️  No actions recorded. Nothing to generate.'))
        return
      }

      // Generate script
      spinner = ora(`Generating ${options.format} script...`).start()
      
      const profileId = options.multiloginProfileId || options.wsEndpoint || 'unknown'
      let code: string
      
      if (options.format === 'browser-use') {
        const generator = new BrowserUseGenerator({
          includeComments: options.comments,
          addDelays: options.delays,
        })
        code = generator.generate(profileId, prompt, actions)
      } else {
        const generator = new ScriptGenerator({
          includeComments: options.comments,
          addDelays: options.delays,
        })
        code = generator.generate(profileId, prompt, actions)
      }
      
      // Ensure output directory exists
      const outputDir = path.dirname(output)
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
      }

      // Write output
      fs.writeFileSync(output, code)
      spinner.succeed('Script generated')

      console.log(chalk.green.bold(`\n✅ Script saved to: ${output}`))
      console.log(chalk.gray(`\n${actions.length} actions recorded`))
      console.log(chalk.gray('\nTo run the script:'))
      console.log(chalk.cyan(`  PUPPETEER_WS_ENDPOINT=<ws-url> npx tsx ${output}`))

    } catch (error: any) {
      if (spinner) spinner.fail()
      console.error(chalk.red('\n❌ Error:'), error.message)
      
      if (options.debug) {
        console.error(error.stack)
      }
      
      process.exit(1)
    } finally {
      if (browserManager) {
        const closeSpinner = ora('Closing browser...').start()
        try {
          await browserManager.close()
          closeSpinner.succeed('Browser closed')
        } catch (e) {
          closeSpinner.warn('Error closing browser')
        }
      }
    }
  })

// Info command
program
  .command('info')
  .description('Show setup information')
  .action(() => {
    console.log(chalk.cyan.bold('\n🎬 Browser Use Codegen\n'))
    console.log('Generate Puppeteer scripts by recording browser actions.\n')
    
    console.log(chalk.bold('Prerequisites:'))
    console.log('  1. Chrome/Edge with remote debugging, OR')
    console.log('  2. Multilogin account with profile ID\n')
    
    console.log(chalk.bold('Setup with Chrome:'))
    console.log(chalk.gray('  # Start Chrome with remote debugging'))
    console.log('  chrome --remote-debugging-port=9222\n')
    console.log(chalk.gray('  # Get WebSocket endpoint'))
    console.log('  curl http://localhost:9222/json/version\n')
    
    console.log(chalk.bold('Example usage:'))
    console.log('  browser-use-codegen --wsEndpoint=ws://localhost:9222/devtools/browser/...')
    console.log('    "Scrape product listings"\n')
    
    console.log(chalk.bold('With Multilogin:'))
    console.log('  browser-use-codegen --multiloginProfileId=abc123')
    console.log('    "Login and download report"\n')
  })

function generateDefaultOutputPath(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  return path.join(process.cwd(), 'generated', `${timestamp}-script.ts`)
}

// Run CLI
program.parse()
