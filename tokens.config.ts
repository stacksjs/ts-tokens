import type { TokenConfig } from './src/types'

/**
 * ts-tokens Configuration
 *
 * This file configures the ts-tokens library and CLI.
 * See https://ts-tokens.dev/config for all options.
 */
const config: TokenConfig = {
  // Blockchain settings
  chain: 'solana',
  network: 'devnet', // 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet'

  // Wallet configuration
  wallet: {
    // Path to keypair file (default: ~/.config/solana/id.json)
    keypairPath: '~/.config/solana/devnet.json',

    // Or use environment variable
    // keypairEnv: 'TOKENS_KEYPAIR',
  },

  // Transaction settings
  commitment: 'confirmed',
  autoCreateAccounts: true,

  // Storage provider for metadata
  storageProvider: 'arweave', // 'arweave' | 'ipfs' | 'shadow-drive' | 'local'

  // Gateways
  ipfsGateway: 'https://ipfs.io',
  arweaveGateway: 'https://arweave.net',

  // Security
  securityChecks: true,
  dryRun: false,

  // Logging
  verbose: false,
}

export default config
