/** Fix CLI command handler — provides automated fixes or guided steps for known error codes. */

import { success, error, keyValue, header, info } from '../utils'
import { ERROR_CODES } from '../../utils/errors'

/**
 * Known error code type
 */
type ErrorCode = keyof typeof ERROR_CODES

/**
 * Fix entry describing the automated or guided resolution for an error code
 */
interface FixEntry {
  description: string
  steps: string[]
  autoFix?: () => Promise<void>
}

/**
 * Registry of fixes for known error codes
 */
const FIX_REGISTRY: Record<ErrorCode, FixEntry> = {
  INSUFFICIENT_BALANCE: {
    description: 'Your wallet does not have enough SOL or tokens for this operation.',
    steps: [
      'Check your current balance: tokens wallet balance',
      'On devnet/testnet, request an airdrop: solana airdrop 2',
      'On mainnet, transfer SOL from another wallet or purchase from an exchange.',
      'Ensure you have enough SOL for both the operation and the transaction fee.',
    ],
    autoFix: async () => {
      info('Attempting devnet airdrop of 2 SOL...')
      try {
        const { execSync } = await import('node:child_process')
        const output = execSync('solana airdrop 2 --url devnet', {
          encoding: 'utf-8',
          timeout: 30_000,
        })
        success(`Airdrop result: ${output.trim()}`)
      } catch {
        error('Airdrop failed. You may not be on devnet, or the faucet is rate-limited.')
        info('Try again later or fund your wallet manually.')
      }
    },
  },

  INVALID_ADDRESS: {
    description: 'The address you provided is not a valid Solana public key.',
    steps: [
      'Solana addresses are base58-encoded, 32-44 characters long.',
      'Check for typos or extra whitespace.',
      'Verify the address on a block explorer: https://explorer.solana.com',
      'If pasting, ensure no invisible characters were included.',
    ],
  },

  AUTHORITY_ERROR: {
    description: 'You do not have the required authority (mint, freeze, or update) for this operation.',
    steps: [
      'Check the current authorities: tokens token info <mint>',
      'Ensure your wallet keypair matches the required authority.',
      'If authority was transferred, contact the new authority holder.',
      'If authority was revoked, this operation can no longer be performed.',
    ],
  },

  TRANSACTION_ERROR: {
    description: 'The transaction failed to execute on-chain.',
    steps: [
      'Check the transaction logs for detailed error output.',
      'Verify the transaction signature on a block explorer.',
      'Ensure all accounts are correctly initialized.',
      'If the blockhash expired, retry the transaction.',
      'Use "tokens debug tx <signature>" to analyze the failure.',
    ],
  },

  RPC_ERROR: {
    description: 'Failed to communicate with the Solana RPC endpoint.',
    steps: [
      'Check your internet connection.',
      'Verify your RPC endpoint URL in tokens.config.ts.',
      'Try a different RPC provider (e.g., Helius, QuickNode, Alchemy).',
      'If using a free tier, you may be rate-limited. Wait and retry.',
      'Test the endpoint: curl <your-rpc-url> -X POST -H "Content-Type: application/json" -d \'{"jsonrpc":"2.0","id":1,"method":"getHealth"}\'',
    ],
  },

  VALIDATION_ERROR: {
    description: 'The input you provided failed validation.',
    steps: [
      'Review the error message for the specific field that failed.',
      'Check the documentation for the expected format.',
      'For numeric values, ensure they are within the valid range.',
      'For addresses, ensure they are valid base58 public keys.',
    ],
  },

  CONFIG_ERROR: {
    description: 'Your configuration file is invalid or missing required fields.',
    steps: [
      'Check that tokens.config.ts exists in your project root.',
      'Verify the file exports a valid configuration object.',
      'Required fields: chain, network.',
      'Run "tokens config show" to display the current configuration.',
      'Regenerate defaults with "tokens config init".',
    ],
  },

  NETWORK_ERROR: {
    description: 'A network-level error occurred.',
    steps: [
      'Check your internet connection.',
      'Verify you are targeting the correct network (mainnet/devnet/testnet).',
      'Check the Solana network status at https://status.solana.com',
      'Try switching to a different RPC endpoint.',
    ],
  },
}

/**
 * Handle the `tokens fix <errorCode>` command.
 *
 * Displays guided resolution steps for a known error code and, where available,
 * offers an automated fix.
 *
 * @param errorCode - The error code to look up (e.g., "INSUFFICIENT_BALANCE")
 */
export async function fixError(errorCode: string): Promise<void> {
  const code = errorCode.toUpperCase() as ErrorCode
  const entry = FIX_REGISTRY[code]

  if (!entry) {
    const validCodes = Object.keys(FIX_REGISTRY)
    error(`Unknown error code: "${errorCode}"`)
    info('Known error codes:')
    for (const vc of validCodes) {
      info(`  ${vc} - ${ERROR_CODES[vc as ErrorCode].description}`)
    }
    return
  }

  header(`Fix: ${code}`)
  info(entry.description)
  info('')

  info('Recommended steps:')
  for (let i = 0; i < entry.steps.length; i++) {
    info(`  ${i + 1}. ${entry.steps[i]}`)
  }

  if (entry.autoFix) {
    info('')
    info('An automated fix is available for this error.')
    await entry.autoFix()
  }
}

/**
 * List all fixable error codes.
 */
export async function fixList(): Promise<void> {
  header('Fixable Error Codes')

  for (const [code, entry] of Object.entries(FIX_REGISTRY)) {
    keyValue(code, entry.description)
  }
}
