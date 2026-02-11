/** Local development CLI command handlers. */

import { success, error, keyValue, header, info } from '../utils'
import { withSpinner } from '../utils/spinner'

/**
 * Start a local Solana test validator with a pre-funded wallet.
 *
 * Shells out to `solana-test-validator` and configures the local RPC endpoint.
 */
export async function dev(): Promise<void> {
  header('Local Development Environment')

  try {
    const { execSync, spawn } = await import('node:child_process')

    // Check if solana-test-validator is available
    try {
      execSync('solana-test-validator --version', { stdio: 'pipe', encoding: 'utf-8' })
    } catch {
      error('solana-test-validator not found. Install the Solana CLI tools:')
      info('  sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"')
      process.exit(1)
    }

    info('Starting solana-test-validator...')
    info('RPC endpoint: http://localhost:8899')
    info('WebSocket:    ws://localhost:8900')

    const validator = spawn('solana-test-validator', ['--reset', '--quiet'], {
      stdio: 'inherit',
      detached: false,
    })

    // Give the validator a moment to start
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Configure local RPC
    try {
      execSync('solana config set --url http://localhost:8899', { stdio: 'pipe' })
      info('Solana CLI configured for localhost')
    } catch {
      info('Note: Could not set Solana CLI config. Set it manually:')
      info('  solana config set --url http://localhost:8899')
    }

    // Fund the default wallet
    try {
      const keypathOutput = execSync('solana config get keypair', { encoding: 'utf-8' })
      info(`Keypair: ${keypathOutput.trim()}`)

      execSync('solana airdrop 100 --url http://localhost:8899', {
        stdio: 'pipe',
        timeout: 15_000,
      })
      success('Airdropped 100 SOL to default wallet')
    } catch {
      info('Note: Could not airdrop to default wallet. Use "tokens dev fund" manually.')
    }

    keyValue('Status', 'Validator running')
    info('Press Ctrl+C to stop the validator.')

    // Keep the process alive until interrupted
    await new Promise<void>((resolve) => {
      validator.on('close', () => resolve())
      process.on('SIGINT', () => {
        validator.kill()
        resolve()
      })
    })
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

/**
 * Reset the local development environment.
 *
 * Kills any running test validator and cleans the ledger directory.
 */
export async function devReset(): Promise<void> {
  header('Reset Development Environment')

  try {
    const { execSync } = await import('node:child_process')
    const fs = await import('node:fs')
    const path = await import('node:path')

    // Kill any running test validator
    try {
      execSync('pkill -f solana-test-validator', { stdio: 'pipe' })
      success('Stopped running test validator')
    } catch {
      info('No running test validator found')
    }

    // Clean ledger directory
    const ledgerDir = path.join(process.cwd(), 'test-ledger')
    if (fs.existsSync(ledgerDir)) {
      await withSpinner('Cleaning ledger directory', async () => {
        fs.rmSync(ledgerDir, { recursive: true, force: true })
      }, 'Ledger directory cleaned')
    } else {
      info('No ledger directory found to clean')
    }

    success('Development environment reset')
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

/**
 * Airdrop SOL to an address on the local validator.
 *
 * @param address - The public key to fund
 * @param amount - Amount of SOL to airdrop
 */
export async function devFund(address: string, amount: number): Promise<void> {
  header('Fund Account')

  try {
    const { execSync } = await import('node:child_process')

    keyValue('Address', address)
    keyValue('Amount', `${amount} SOL`)

    await withSpinner(`Airdropping ${amount} SOL`, async () => {
      execSync(
        `solana airdrop ${amount} ${address} --url http://localhost:8899`,
        { stdio: 'pipe', timeout: 15_000, encoding: 'utf-8' },
      )
    }, `Airdropped ${amount} SOL to ${address}`)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    info('Ensure the local test validator is running: tokens dev')
    process.exit(1)
  }
}

/**
 * Warp the local validator to a specific slot or advance by N slots.
 *
 * Uses `solana warp-slot` concept via the Solana CLI.
 *
 * @param timestamp - The slot number to warp to
 */
export async function devTime(timestamp: number): Promise<void> {
  header('Warp Slot')

  try {
    const { execSync } = await import('node:child_process')

    keyValue('Target Slot', String(timestamp))

    // Get current slot for reference
    try {
      const currentSlot = execSync(
        'solana slot --url http://localhost:8899',
        { encoding: 'utf-8', stdio: 'pipe' },
      ).trim()
      keyValue('Current Slot', currentSlot)
    } catch {
      info('Could not read current slot')
    }

    info('Slot warping is only available on local test validators.')
    info(`To advance time, restart the validator with custom slot duration.`)
    info(`Alternatively, use: solana-test-validator --warp-slot ${timestamp}`)

    // Attempt the actual warp if the validator supports it
    try {
      execSync(
        `solana warp-slot ${timestamp} --url http://localhost:8899`,
        { stdio: 'pipe', timeout: 10_000, encoding: 'utf-8' },
      )
      success(`Warped to slot ${timestamp}`)
    } catch {
      info('Direct slot warp not supported by this validator version.')
      info('Consider stopping and restarting with --warp-slot flag.')
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}
